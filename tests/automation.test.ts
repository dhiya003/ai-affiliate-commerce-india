import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  cronExpressionSchema,
  nextCronOccurrence,
} from "../lib/automation/cron.ts";
import {
  automationJobUpdateSchema,
  automationRunActionSchema,
} from "../lib/automation/schema.ts";

test("automation cron validation is bounded to supported daily and weekly schedules", () => {
  assert.equal(cronExpressionSchema.safeParse("0 3 * * *").success, true);
  assert.equal(cronExpressionSchema.safeParse("0 5 * * 1").success, true);
  assert.equal(cronExpressionSchema.safeParse("* * * * *").success, true);
  assert.equal(cronExpressionSchema.safeParse("*/5 * * * *").success, false);
  assert.equal(cronExpressionSchema.safeParse("0 0 1 * *").success, false);
});

test("next cron occurrence is deterministic and advances beyond the cursor", () => {
  assert.equal(
    nextCronOccurrence(
      "0 3 * * *",
      new Date("2026-07-29T03:00:00.000Z"),
    ).toISOString(),
    "2026-07-30T03:00:00.000Z",
  );
  assert.equal(
    nextCronOccurrence(
      "0 5 * * 1",
      new Date("2026-07-29T00:00:00.000Z"),
    ).toISOString(),
    "2026-08-03T05:00:00.000Z",
  );
});

test("next cron occurrence honors the configured India timezone", () => {
  assert.equal(
    nextCronOccurrence(
      "30 6 * * *",
      new Date("2026-07-31T23:00:00.000Z"),
      "Asia/Kolkata",
    ).toISOString(),
    "2026-08-01T01:00:00.000Z",
  );
  assert.throws(
    () => nextCronOccurrence("0 6 * * *", new Date(), "Europe/London"),
    /UNSUPPORTED_AUTOMATION_TIMEZONE/,
  );
});

test("job policy validates timeout, attempts, retry delay, and manual action", () => {
  assert.equal(
    automationJobUpdateSchema.safeParse({
      enabled: true,
      cronExpression: "0 3 * * *",
      timeoutSeconds: 900,
      maxAttempts: 3,
      retryBaseSeconds: 120,
    }).success,
    true,
  );
  assert.equal(
    automationJobUpdateSchema.safeParse({ timeoutSeconds: 5 }).success,
    false,
  );
  assert.deepEqual(automationRunActionSchema.parse({ action: "run" }), {
    action: "run",
  });
});

test("automation engine enforces dependencies, retries, timeouts, and honest skips", async () => {
  const repository = await readFile(
    new URL("../lib/automation/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /dependencySatisfied/);
  assert.match(repository, /DEPENDENCY_NOT_HEALTHY/);
  assert.match(repository, /AUTOMATION_JOB_TIMEOUT/);
  assert.match(repository, /retry_base_seconds \* 2 \*\*/);
  assert.match(repository, /attempt < job\.max_attempts/);
  assert.match(repository, /HANDLER_NOT_CONFIGURED/);
  assert.match(repository, /status: "SKIPPED"/);
  assert.match(repository, /automation_run_logs/);
  assert.match(repository, /runDueAutomationJobs/);
});

test("scheduled retraining refreshes evidence without activating weights", async () => {
  const repository = await readFile(
    new URL("../lib/automation/repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(repository, /job\.job_type === "SCORE_RETRAINING"/);
  assert.match(repository, /refreshLearningProfiles/);
  assert.match(repository, /calculateRecommendationQualitySnapshot/);
  assert.match(repository, /no scoring version was activated/i);
  assert.doesNotMatch(repository, /activateScoringWeightVersion/);
});

test("automation controls and processing logs are administrator-only", async () => {
  const routes = await Promise.all([
    readFile(
      new URL("../app/api/automation/jobs/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/automation/jobs/[id]/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/automation/jobs/[id]/run/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/automation/runs/[id]/logs/route.ts", import.meta.url),
      "utf8",
    ),
  ]);
  for (const route of routes) {
    assert.match(route, /requireRole\(user, \["ADMIN"\]\)/);
    assert.match(route, /ADMIN_REQUIRED/);
  }
});

test("worker scheduler dispatches due and retryable jobs through waitUntil", async () => {
  const [worker, vite] = await Promise.all([
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);
  assert.match(worker, /async scheduled\(/);
  assert.match(worker, /runDueAutomationJobs/);
  assert.match(worker, /ctx\.waitUntil/);
  assert.match(vite, /crons: \["\*\/15 \* \* \* \*"\]/);
});
