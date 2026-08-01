import assert from "node:assert/strict";
import test from "node:test";
import { validateEnvironment, validateWorkerEnvironment } from "../lib/env.ts";

const validEnvironment = {
  NODE_ENV: "production",
  APP_URL: "https://affinity.example.com",
  DATABASE_URL: "postgresql://example.invalid/affinity",
  AUTH_SECRET: "a-secure-test-secret-with-32-characters",
  ADMIN_EMAILS: "admin@example.com",
  AI_PROVIDER: "openai",
  OPENAI_API_KEY: "",
  ERROR_MONITORING_WEBHOOK_URL: "",
  ERROR_MONITORING_TOKEN: "",
  NOTIFICATION_EMAIL_WEBHOOK_URL: "",
  NOTIFICATION_EMAIL_TOKEN: "",
  LOG_LEVEL: "info",
} as NodeJS.ProcessEnv;

test("production environment supports the built-in content fallback", () => {
  const environment = validateEnvironment(validEnvironment);

  assert.equal(environment.OPENAI_API_KEY, undefined);
  assert.equal(environment.OPENAI_MODEL, "gpt-5.6-sol");
  assert.equal(environment.ERROR_MONITORING_WEBHOOK_URL, undefined);
});

test("strict Worker validation requires runtime bindings", () => {
  assert.throws(
    () => validateWorkerEnvironment({ ENVIRONMENT_VALIDATION_MODE: "strict" }),
    /DB Worker binding is required.*ASSETS Worker binding is required.*IMAGES Worker binding is required/,
  );
  const environment = validateWorkerEnvironment({
    ENVIRONMENT_VALIDATION_MODE: "strict",
    DB: {},
    ASSETS: {},
    IMAGES: {},
    NOTIFICATION_EMAIL_WEBHOOK_URL: "https://mail.example.com/notify",
    NOTIFICATION_EMAIL_TOKEN: "notification-test-token",
  });
  assert.equal(environment.ENVIRONMENT_VALIDATION_MODE, "strict");
  assert.equal(
    environment.NOTIFICATION_EMAIL_WEBHOOK_URL,
    "https://mail.example.com/notify",
  );
});

test("Worker validates optional service endpoints before handling traffic", async () => {
  assert.throws(
    () =>
      validateWorkerEnvironment({
        ENVIRONMENT_VALIDATION_MODE: "test",
        NOTIFICATION_EMAIL_WEBHOOK_URL: "http://mail.example.com/notify",
      }),
    /Notification webhook endpoint must use HTTPS/,
  );
  const [worker, example] = await Promise.all([
    import("node:fs/promises").then(({ readFile }) =>
      readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    ),
    import("node:fs/promises").then(({ readFile }) =>
      readFile(new URL("../.env.example", import.meta.url), "utf8"),
    ),
  ]);
  assert.match(worker, /assertRuntimeEnvironment\(env\)/);
  assert.match(example, /NOTIFICATION_EMAIL_WEBHOOK_URL=/);
  assert.match(example, /NOTIFICATION_EMAIL_TOKEN=/);
});

test("monitoring environment requires HTTPS and a nontrivial token", () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...validEnvironment,
        ERROR_MONITORING_WEBHOOK_URL: "http://monitor.example.com/events",
      }),
    /Monitoring endpoint must use HTTPS/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...validEnvironment,
        ERROR_MONITORING_WEBHOOK_URL: "https://monitor.example.com/events",
        ERROR_MONITORING_TOKEN: "short",
      }),
    /Too small/,
  );

  const environment = validateEnvironment({
    ...validEnvironment,
    ERROR_MONITORING_WEBHOOK_URL: "https://monitor.example.com/events",
    ERROR_MONITORING_TOKEN: "test-monitoring-token",
  });
  assert.equal(
    environment.ERROR_MONITORING_WEBHOOK_URL,
    "https://monitor.example.com/events",
  );
});
