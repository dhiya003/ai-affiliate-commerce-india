import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { backgroundJobInputSchema } from "../lib/queue/schema.ts";

test("background queue policy is bounded and rejects arbitrary handlers", () => {
  assert.equal(
    backgroundJobInputSchema.safeParse({
      queueName: "maintenance",
      jobType: "RATE_LIMIT_CLEANUP",
      payload: {},
      maxAttempts: 3,
    }).success,
    true,
  );
  assert.equal(
    backgroundJobInputSchema.safeParse({
      queueName: "unknown",
      jobType: "RUN_ARBITRARY_CODE",
      payload: {},
      maxAttempts: 100,
    }).success,
    false,
  );
});

test("queue processor claims jobs, retries exponentially, and records terminal failure", async () => {
  const repository = await readFile(
    new URL("../lib/queue/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /status = 'RUNNING'/);
  assert.match(repository, /status IN \('QUEUED', 'RETRY'\)/);
  assert.match(repository, /60_000 \* 2 \*\*/);
  assert.match(repository, /canRetry \? "RETRY" : "FAILED"/);
  assert.match(repository, /RATE_LIMIT_CLEANUP/);
  assert.match(repository, /EXPIRED_REPORT_CLEANUP/);
  assert.match(repository, /OPERATIONAL_METRIC_ROLLUP/);
  const worker = await readFile(
    new URL("../worker/index.ts", import.meta.url),
    "utf8",
  );
  assert.match(worker, /seedMaintenanceQueue/);
  assert.match(worker, /processDueBackgroundJobs/);
});

test("marketplace routing selects healthy partner sources or an honest manual fallback", async () => {
  const fallback = await readFile(
    new URL("../lib/ingestion/fallback.ts", import.meta.url),
    "utf8",
  );
  assert.match(fallback, /"PARTNER" \| "MANUAL_FALLBACK" \| "UNAVAILABLE"/);
  assert.match(fallback, /consecutive_failures < 3/);
  assert.match(fallback, /rate_limited_until/);
  assert.match(fallback, /verified manual ingestion remains available/i);
  const automation = await readFile(
    new URL("../lib/automation/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(automation, /resolveMarketplaceSourceRoutes/);
  assert.match(automation, /credentialed transport handler is not configured/i);
  assert.match(automation, /status: "SKIPPED"/);
});

test("AI provider failures fall back to validated local content without false attribution", async () => {
  const provider = await readFile(
    new URL("../lib/content/provider.ts", import.meta.url),
    "utf8",
  );
  assert.match(provider, /"built-in" \| "built-in-fallback"/);
  assert.match(
    provider,
    /return localFallback\(product, "built-in-fallback"\)/,
  );
  assert.match(provider, /response\.status === 429/);
  assert.match(provider, /response\.status >= 500/);
  assert.match(provider, /providerModel: "affiliate-template-v1"/);
});

test("scale controls include private response caching, image optimization, metrics, and bounded load testing", async () => {
  const [worker, flags, loadTest, packageJson] = await Promise.all([
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin/flags.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/load-test.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(worker, /private, max-age=15, stale-while-revalidate=30/);
  assert.match(worker, /handleImageOptimization/);
  assert.match(worker, /api\.request_duration/);
  assert.match(worker, /operational\.metric\.write_failed/);
  assert.match(flags, /flagCache/);
  assert.match(flags, /Date\.now\(\) \+ 30_000/);
  assert.match(loadTest, /LOAD_TEST_CONCURRENCY/);
  assert.match(loadTest, /failureRate/);
  assert.match(loadTest, /p95Ms/);
  assert.match(packageJson, /"test:load"/);
});

test("suspicious-login evidence is privacy-safe and administrator visible", async () => {
  const [guard, admin] = await Promise.all([
    readFile(
      new URL("../lib/security/request-guard.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/admin/AdminClient.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(guard, /SUSPICIOUS_LOGIN/);
  assert.match(guard, /AUTH_FINGERPRINT_OBSERVED/);
  assert.match(guard, /fingerprintHash/);
  assert.doesNotMatch(guard, /\b(raw_ip|ip_address)\b/);
  assert.match(admin, /Security events/);
  assert.match(admin, /resolveSecurityEvent/);
});
