CREATE TYPE "AutomationJobType" AS ENUM (
  'PRODUCT_INGESTION', 'PRICE_REFRESH', 'AVAILABILITY_REFRESH',
  'TREND_REFRESH', 'SCORE_RECALCULATION', 'TOP_10_GENERATION',
  'CONTENT_GENERATION', 'COMPLIANCE_CHECK', 'SCORE_RETRAINING'
);

CREATE TYPE "AutomationJobStatus" AS ENUM (
  'HEALTHY', 'PAUSED', 'RUNNING', 'DEGRADED', 'FAILING'
);

CREATE TYPE "AutomationRunTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'RETRY');

CREATE TYPE "AutomationRunStatus" AS ENUM (
  'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'SKIPPED', 'BLOCKED'
);

CREATE TYPE "AutomationLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TABLE "AutomationJob" (
  "id" TEXT NOT NULL,
  "jobKey" TEXT NOT NULL,
  "jobType" "AutomationJobType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "cronExpression" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "status" "AutomationJobStatus" NOT NULL DEFAULT 'PAUSED',
  "timeoutSeconds" INTEGER NOT NULL DEFAULT 300,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "retryBaseSeconds" INTEGER NOT NULL DEFAULT 60,
  "dependsOnJobId" TEXT,
  "nextRunAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "createdByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationRun" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "parentRunId" TEXT,
  "triggerType" "AutomationRunTrigger" NOT NULL,
  "status" "AutomationRunStatus" NOT NULL DEFAULT 'QUEUED',
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "scheduledFor" TIMESTAMP(3),
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "timeoutAt" TIMESTAMP(3),
  "initiatedByEmail" TEXT,
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "succeededCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "errorCode" TEXT,
  "errorSummary" TEXT,
  "nextRetryAt" TIMESTAMP(3),
  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationRunLog" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "level" "AutomationLogLevel" NOT NULL,
  "event" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationRunLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationJob_jobKey_key" ON "AutomationJob"("jobKey");
CREATE INDEX "AutomationJob_enabled_status_nextRunAt_idx" ON "AutomationJob"("enabled", "status", "nextRunAt");
CREATE INDEX "AutomationJob_status_consecutiveFailures_idx" ON "AutomationJob"("status", "consecutiveFailures");
CREATE INDEX "AutomationRun_jobId_queuedAt_idx" ON "AutomationRun"("jobId", "queuedAt" DESC);
CREATE INDEX "AutomationRun_status_nextRetryAt_idx" ON "AutomationRun"("status", "nextRetryAt");
CREATE INDEX "AutomationRun_parentRunId_idx" ON "AutomationRun"("parentRunId");
CREATE INDEX "AutomationRunLog_runId_occurredAt_idx" ON "AutomationRunLog"("runId", "occurredAt");
CREATE INDEX "AutomationRunLog_level_occurredAt_idx" ON "AutomationRunLog"("level", "occurredAt" DESC);

ALTER TABLE "AutomationJob"
  ADD CONSTRAINT "AutomationJob_dependsOnJobId_fkey"
  FOREIGN KEY ("dependsOnJobId") REFERENCES "AutomationJob"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AutomationRun"
  ADD CONSTRAINT "AutomationRun_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "AutomationJob"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRun"
  ADD CONSTRAINT "AutomationRun_parentRunId_fkey"
  FOREIGN KEY ("parentRunId") REFERENCES "AutomationRun"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AutomationRunLog"
  ADD CONSTRAINT "AutomationRunLog_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AutomationJob" (
  "id", "jobKey", "jobType", "name", "description", "cronExpression",
  "timezone", "enabled", "status", "timeoutSeconds", "maxAttempts",
  "retryBaseSeconds", "dependsOnJobId", "createdByEmail", "createdAt",
  "updatedAt"
) VALUES
  ('automation-product-ingestion', 'daily-product-ingestion', 'PRODUCT_INGESTION', 'Daily product ingestion', 'Ingest enabled marketplace sources.', '0 1 * * *', 'Asia/Kolkata', false, 'PAUSED', 900, 3, 120, NULL, 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-price-refresh', 'daily-price-refresh', 'PRICE_REFRESH', 'Daily price refresh', 'Refresh price evidence after product ingestion.', '30 1 * * *', 'Asia/Kolkata', false, 'PAUSED', 600, 3, 120, 'automation-product-ingestion', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-availability-refresh', 'daily-availability-refresh', 'AVAILABILITY_REFRESH', 'Daily availability refresh', 'Refresh stock and variation availability.', '0 2 * * *', 'Asia/Kolkata', false, 'PAUSED', 600, 3, 120, 'automation-product-ingestion', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-trend-refresh', 'daily-trend-refresh', 'TREND_REFRESH', 'Daily trend refresh', 'Rebuild fresh trend evidence.', '30 2 * * *', 'Asia/Kolkata', false, 'PAUSED', 900, 3, 180, 'automation-product-ingestion', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-score-recalculation', 'daily-score-recalculation', 'SCORE_RECALCULATION', 'Daily score recalculation', 'Recalculate opportunity scores from current evidence.', '0 3 * * *', 'Asia/Kolkata', false, 'PAUSED', 900, 3, 180, 'automation-trend-refresh', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-top-ten', 'daily-top-10-generation', 'TOP_10_GENERATION', 'Daily top 10 generation', 'Snapshot the ten highest verified opportunities.', '30 3 * * *', 'Asia/Kolkata', false, 'PAUSED', 300, 3, 60, 'automation-score-recalculation', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-content-generation', 'daily-content-generation', 'CONTENT_GENERATION', 'Daily content generation', 'Generate content for approved top opportunities.', '0 4 * * *', 'Asia/Kolkata', false, 'PAUSED', 1200, 2, 300, 'automation-top-ten', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-compliance-check', 'daily-compliance-check', 'COMPLIANCE_CHECK', 'Daily compliance checking', 'Recheck generated promotional content before use.', '30 4 * * *', 'Asia/Kolkata', false, 'PAUSED', 900, 3, 180, 'automation-content-generation', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z'),
  ('automation-score-retraining', 'weekly-score-retraining', 'SCORE_RETRAINING', 'Weekly score retraining', 'Prepare governed weight evidence without automatic activation.', '0 5 * * 1', 'Asia/Kolkata', false, 'PAUSED', 1200, 2, 300, 'automation-score-recalculation', 'system@affinity.local', '2026-07-30T00:00:00.000Z', '2026-07-30T00:00:00.000Z');
