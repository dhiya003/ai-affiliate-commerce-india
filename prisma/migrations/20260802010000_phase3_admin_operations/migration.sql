CREATE TABLE "ApplicationUser" (
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastSeenAt" TIMESTAMP(3),
  "suspiciousLoginCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationUser_pkey" PRIMARY KEY ("email")
);

CREATE TABLE "FeatureFlag" (
  "key" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
  "updatedByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "ManagedTemplate" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagedTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataRetentionPolicy" (
  "key" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "retentionDays" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "outcome" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "actorEmail" TEXT,
  "fingerprintHash" TEXT,
  "region" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByEmail" TEXT,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageCostEvent" (
  "id" TEXT NOT NULL,
  "ownerEmail" TEXT,
  "provider" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "model" TEXT,
  "marketplace" TEXT,
  "units" INTEGER NOT NULL DEFAULT 0,
  "costInr" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageCostEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackupRun" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "storageReferenceHash" TEXT,
  "initiatedByEmail" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "restoreTestedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  CONSTRAINT "BackupRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalMetric" (
  "id" TEXT NOT NULL,
  "metricName" TEXT NOT NULL,
  "value" DECIMAL(18,6) NOT NULL,
  "unit" TEXT NOT NULL,
  "dimensions" JSONB NOT NULL DEFAULT '{}',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackgroundQueueJob" (
  "id" TEXT NOT NULL,
  "queueName" TEXT NOT NULL,
  "jobType" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundQueueJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
  "bucketKey" TEXT NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("bucketKey")
);

CREATE INDEX "ApplicationUser_status_role_idx" ON "ApplicationUser"("status", "role");
CREATE INDEX "ApplicationUser_lastSeenAt_idx" ON "ApplicationUser"("lastSeenAt" DESC);
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");
CREATE UNIQUE INDEX "ManagedTemplate_kind_name_version_key" ON "ManagedTemplate"("kind", "name", "version");
CREATE INDEX "ManagedTemplate_kind_status_idx" ON "ManagedTemplate"("kind", "status");
CREATE INDEX "DataRetentionPolicy_enabled_idx" ON "DataRetentionPolicy"("enabled");
CREATE INDEX "AuditEvent_actorEmail_occurredAt_idx" ON "AuditEvent"("actorEmail", "occurredAt" DESC);
CREATE INDEX "AuditEvent_entityType_entityId_occurredAt_idx" ON "AuditEvent"("entityType", "entityId", "occurredAt" DESC);
CREATE INDEX "SecurityEvent_severity_occurredAt_idx" ON "SecurityEvent"("severity", "occurredAt" DESC);
CREATE INDEX "SecurityEvent_eventType_occurredAt_idx" ON "SecurityEvent"("eventType", "occurredAt" DESC);
CREATE INDEX "UsageCostEvent_service_occurredAt_idx" ON "UsageCostEvent"("service", "occurredAt" DESC);
CREATE INDEX "UsageCostEvent_ownerEmail_occurredAt_idx" ON "UsageCostEvent"("ownerEmail", "occurredAt" DESC);
CREATE INDEX "UsageCostEvent_marketplace_occurredAt_idx" ON "UsageCostEvent"("marketplace", "occurredAt" DESC);
CREATE INDEX "BackupRun_status_startedAt_idx" ON "BackupRun"("status", "startedAt" DESC);
CREATE INDEX "BackupRun_restoreTestedAt_idx" ON "BackupRun"("restoreTestedAt" DESC);
CREATE INDEX "OperationalMetric_metricName_recordedAt_idx" ON "OperationalMetric"("metricName", "recordedAt" DESC);
CREATE INDEX "BackgroundQueueJob_queueName_status_nextAttemptAt_idx" ON "BackgroundQueueJob"("queueName", "status", "nextAttemptAt");
CREATE INDEX "BackgroundQueueJob_jobType_createdAt_idx" ON "BackgroundQueueJob"("jobType", "createdAt" DESC);
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

INSERT INTO "FeatureFlag" ("key", "description", "enabled", "rolloutPercent", "updatedByEmail", "createdAt", "updatedAt") VALUES
  ('ai-content-generation', 'Allow signed-in users to generate affiliate content.', true, 100, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('partner-marketplace-ingestion', 'Allow credentialed marketplace partner adapters to run.', false, 0, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('email-notifications', 'Allow outbound notification webhook handoff.', false, 0, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('automated-scoring-activation', 'Permit automated scoring-weight activation.', false, 0, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z');

INSERT INTO "DataRetentionPolicy" ("key", "description", "retentionDays", "enabled", "updatedByEmail", "createdAt", "updatedAt") VALUES
  ('click-fingerprints', 'Privacy-safe click fingerprint hashes.', 30, true, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('raw-source-payloads', 'Immutable marketplace source evidence.', 365, true, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('automation-logs', 'Scheduled automation processing logs.', 90, true, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('security-events', 'Security and suspicious-request evidence.', 365, true, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('generated-reports', 'Downloadable report content.', 30, true, 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z');

INSERT INTO "ManagedTemplate" ("id", "kind", "name", "version", "content", "status", "createdByEmail", "createdAt", "updatedAt") VALUES
  ('template-affiliate-reel-v1', 'AI_PROMPT', 'Affiliate reel', 1, 'Create factual affiliate content using only supplied product evidence. Include a clear affiliate disclosure and avoid unsupported claims.', 'ACTIVE', 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z'),
  ('template-compliance-disclosure-v1', 'CONTENT_TEMPLATE', 'Affiliate disclosure', 1, 'Affiliate disclosure: I may earn a commission when you purchase through this link.', 'ACTIVE', 'system@affinity.local', '2026-08-02T00:00:00.000Z', '2026-08-02T00:00:00.000Z');
