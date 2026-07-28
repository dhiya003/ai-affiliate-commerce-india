import assert from "node:assert/strict";
import test from "node:test";
import { validateEnvironment } from "../lib/env.ts";

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
  LOG_LEVEL: "info",
} as NodeJS.ProcessEnv;

test("production environment supports the built-in content fallback", () => {
  const environment = validateEnvironment(validEnvironment);

  assert.equal(environment.OPENAI_API_KEY, undefined);
  assert.equal(environment.OPENAI_MODEL, "gpt-5.6-sol");
  assert.equal(environment.ERROR_MONITORING_WEBHOOK_URL, undefined);
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
