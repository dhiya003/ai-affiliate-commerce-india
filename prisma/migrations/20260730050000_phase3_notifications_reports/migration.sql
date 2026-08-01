CREATE TYPE "NotificationType" AS ENUM (
  'DAILY_OPPORTUNITY_SUMMARY', 'WEEKLY_PERFORMANCE_SUMMARY',
  'MONTHLY_EARNINGS_SUMMARY', 'NEW_TRENDING_PRODUCT', 'PRICE_DROP',
  'STOCK_RETURN', 'AFFILIATE_RULE_CHANGE', 'CAMPAIGN_PERFORMANCE',
  'LOW_CONVERSION', 'HIGH_RETURN_RISK', 'FAILED_IMPORT', 'STALE_PRICE',
  'BROKEN_AFFILIATE_LINK', 'COMPLIANCE_FAILURE', 'HIGH_OPPORTUNITY_PRODUCT'
);

CREATE TYPE "NotificationSeverity" AS ENUM (
  'INFO', 'SUCCESS', 'WARNING', 'CRITICAL'
);

CREATE TYPE "DigestFrequency" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
  'PENDING', 'SENT', 'FAILED', 'SKIPPED'
);
CREATE TYPE "ReportType" AS ENUM (
  'DAILY_OPPORTUNITY', 'WEEKLY_PERFORMANCE', 'MONTHLY_EARNINGS'
);
CREATE TYPE "ReportStatus" AS ENUM ('READY', 'EXPIRED');
CREATE TYPE "ReportFormat" AS ENUM ('CSV', 'JSON');

ALTER TYPE "AutomationJobType" ADD VALUE 'NOTIFICATION_SCAN';
ALTER TYPE "AutomationJobType" ADD VALUE 'NOTIFICATION_DELIVERY_RETRY';
ALTER TYPE "AutomationJobType" ADD VALUE 'SUMMARY_REPORT_GENERATION';

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "ownerEmail" TEXT NOT NULL,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "digestFrequency" "DigestFrequency" NOT NULL DEFAULT 'DAILY',
  "enabledTypes" JSONB NOT NULL DEFAULT '[]',
  "quietHoursStart" TEXT,
  "quietHoursEnd" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "ownerEmail" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "severity" "NotificationSeverity" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actionUrl" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "externalMessageIdHash" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GeneratedReport" (
  "id" TEXT NOT NULL,
  "ownerEmail" TEXT NOT NULL,
  "type" "ReportType" NOT NULL,
  "title" TEXT NOT NULL,
  "periodFrom" TIMESTAMP(3) NOT NULL,
  "periodTo" TIMESTAMP(3) NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'READY',
  "format" "ReportFormat" NOT NULL DEFAULT 'CSV',
  "content" JSONB NOT NULL,
  "rowCount" INTEGER NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_ownerEmail_key"
  ON "NotificationPreference"("ownerEmail");
CREATE UNIQUE INDEX "Notification_ownerEmail_dedupeKey_key"
  ON "Notification"("ownerEmail", "dedupeKey");
CREATE INDEX "Notification_ownerEmail_readAt_createdAt_idx"
  ON "Notification"("ownerEmail", "readAt", "createdAt" DESC);
CREATE INDEX "Notification_ownerEmail_type_createdAt_idx"
  ON "Notification"("ownerEmail", "type", "createdAt" DESC);
CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key"
  ON "NotificationDelivery"("notificationId", "channel");
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx"
  ON "NotificationDelivery"("status", "nextAttemptAt");
CREATE UNIQUE INDEX "GeneratedReport_ownerEmail_type_periodFrom_periodTo_key"
  ON "GeneratedReport"("ownerEmail", "type", "periodFrom", "periodTo");
CREATE INDEX "GeneratedReport_ownerEmail_generatedAt_idx"
  ON "GeneratedReport"("ownerEmail", "generatedAt" DESC);
CREATE INDEX "GeneratedReport_expiresAt_idx"
  ON "GeneratedReport"("expiresAt");

ALTER TABLE "NotificationDelivery"
  ADD CONSTRAINT "NotificationDelivery_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AutomationJob" (
  "id", "jobKey", "jobType", "name", "description", "cronExpression",
  "timezone", "enabled", "status", "timeoutSeconds", "maxAttempts",
  "retryBaseSeconds", "dependsOnJobId", "createdByEmail", "createdAt",
  "updatedAt"
) VALUES
  ('automation-notification-scan', 'daily-notification-scan', 'NOTIFICATION_SCAN', 'Daily notification scan', 'Evaluate product, policy, compliance, campaign, and operational alerts.', '0 6 * * *', 'Asia/Kolkata', false, 'PAUSED', 600, 3, 120, 'automation-compliance-check', 'system@affinity.local', '2026-07-30T05:00:00.000Z', '2026-07-30T05:00:00.000Z'),
  ('automation-notification-retry', 'notification-delivery-retry', 'NOTIFICATION_DELIVERY_RETRY', 'Notification delivery retry', 'Retry due email notification handoffs with bounded exponential backoff.', '* * * * *', 'Asia/Kolkata', false, 'PAUSED', 300, 3, 60, NULL, 'system@affinity.local', '2026-07-30T05:00:00.000Z', '2026-07-30T05:00:00.000Z'),
  ('automation-summary-reports', 'daily-summary-report-generation', 'SUMMARY_REPORT_GENERATION', 'Scheduled summary reports', 'Generate daily, weekly, or monthly reports from each owner preference.', '30 6 * * *', 'Asia/Kolkata', false, 'PAUSED', 900, 3, 120, 'automation-notification-scan', 'system@affinity.local', '2026-07-30T05:00:00.000Z', '2026-07-30T05:00:00.000Z');
