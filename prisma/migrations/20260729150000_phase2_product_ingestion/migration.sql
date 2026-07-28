CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'API', 'FEED');
CREATE TYPE "SourceStatus" AS ENUM ('READY', 'RUNNING', 'DEGRADED', 'RATE_LIMITED', 'DISABLED');
CREATE TYPE "IngestionTriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'RETRY');
CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'RETRY_SCHEDULED');
CREATE TYPE "MatchStatus" AS ENUM ('EXACT', 'PROBABLE', 'REVIEW');
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN');

CREATE TABLE "ProductSource" (
  "id" TEXT NOT NULL,
  "marketplaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceType" "SourceType" NOT NULL,
  "status" "SourceStatus" NOT NULL DEFAULT 'READY',
  "freshnessWindowMinutes" INTEGER NOT NULL DEFAULT 1440,
  "lastAttemptAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastErrorAt" TIMESTAMP(3),
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "rateLimitedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionRun" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "parentRunId" TEXT,
  "triggerType" "IngestionTriggerType" NOT NULL,
  "status" "IngestionRunStatus" NOT NULL,
  "initiatedById" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "attemptedCount" INTEGER NOT NULL DEFAULT 0,
  "importedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "matchedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "errorSummary" TEXT,
  CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanonicalProductGroup" (
  "id" TEXT NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "brand" TEXT,
  "category" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CanonicalProductGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RawSourceData" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "canonicalGroupId" TEXT,
  "productId" TEXT,
  "externalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "normalizedProduct" JSONB,
  "sourceTimestamp" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confidence" DECIMAL(5,4) NOT NULL,
  "matchStatus" "MatchStatus" NOT NULL,
  "availabilityStatus" "AvailabilityStatus" NOT NULL,
  "isStale" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "RawSourceData_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductSourceMatch" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "canonicalGroupId" TEXT NOT NULL,
  "productId" TEXT,
  "externalId" TEXT NOT NULL,
  "confidence" DECIMAL(5,4) NOT NULL,
  "status" "MatchStatus" NOT NULL,
  "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductSourceMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionError" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "externalId" TEXT,
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "retryable" BOOLEAN NOT NULL DEFAULT false,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "IngestionError_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionSchedule" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "cadenceMinutes" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "nextRunAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IngestionSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductSource_marketplaceId_name_key" ON "ProductSource"("marketplaceId", "name");
CREATE INDEX "ProductSource_status_lastSuccessAt_idx" ON "ProductSource"("status", "lastSuccessAt" DESC);
CREATE INDEX "IngestionRun_sourceId_startedAt_idx" ON "IngestionRun"("sourceId", "startedAt" DESC);
CREATE INDEX "IngestionRun_status_nextRetryAt_idx" ON "IngestionRun"("status", "nextRetryAt");
CREATE UNIQUE INDEX "CanonicalProductGroup_canonicalKey_key" ON "CanonicalProductGroup"("canonicalKey");
CREATE INDEX "CanonicalProductGroup_category_idx" ON "CanonicalProductGroup"("category");
CREATE UNIQUE INDEX "RawSourceData_sourceId_externalId_payloadHash_key" ON "RawSourceData"("sourceId", "externalId", "payloadHash");
CREATE INDEX "RawSourceData_runId_receivedAt_idx" ON "RawSourceData"("runId", "receivedAt" DESC);
CREATE INDEX "RawSourceData_productId_sourceTimestamp_idx" ON "RawSourceData"("productId", "sourceTimestamp" DESC);
CREATE INDEX "RawSourceData_isStale_availabilityStatus_idx" ON "RawSourceData"("isStale", "availabilityStatus");
CREATE UNIQUE INDEX "ProductSourceMatch_sourceId_externalId_key" ON "ProductSourceMatch"("sourceId", "externalId");
CREATE INDEX "ProductSourceMatch_canonicalGroupId_status_idx" ON "ProductSourceMatch"("canonicalGroupId", "status");
CREATE INDEX "IngestionError_runId_occurredAt_idx" ON "IngestionError"("runId", "occurredAt" DESC);
CREATE INDEX "IngestionError_sourceId_resolvedAt_idx" ON "IngestionError"("sourceId", "resolvedAt");
CREATE UNIQUE INDEX "IngestionSchedule_sourceId_key" ON "IngestionSchedule"("sourceId");
CREATE INDEX "IngestionSchedule_enabled_nextRunAt_idx" ON "IngestionSchedule"("enabled", "nextRunAt");

ALTER TABLE "ProductSource" ADD CONSTRAINT "ProductSource_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProductSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RawSourceData" ADD CONSTRAINT "RawSourceData_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProductSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RawSourceData" ADD CONSTRAINT "RawSourceData_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RawSourceData" ADD CONSTRAINT "RawSourceData_canonicalGroupId_fkey" FOREIGN KEY ("canonicalGroupId") REFERENCES "CanonicalProductGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RawSourceData" ADD CONSTRAINT "RawSourceData_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductSourceMatch" ADD CONSTRAINT "ProductSourceMatch_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProductSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSourceMatch" ADD CONSTRAINT "ProductSourceMatch_canonicalGroupId_fkey" FOREIGN KEY ("canonicalGroupId") REFERENCES "CanonicalProductGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSourceMatch" ADD CONSTRAINT "ProductSourceMatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IngestionError" ADD CONSTRAINT "IngestionError_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngestionError" ADD CONSTRAINT "IngestionError_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProductSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngestionSchedule" ADD CONSTRAINT "IngestionSchedule_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProductSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
