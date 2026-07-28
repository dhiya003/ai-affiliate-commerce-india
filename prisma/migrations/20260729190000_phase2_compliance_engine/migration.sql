CREATE TYPE "ComplianceStatus" AS ENUM ('PASS', 'WARNING', 'FAIL', 'OVERRIDDEN');
CREATE TYPE "ComplianceSeverity" AS ENUM ('INFO', 'WARNING', 'HIGH', 'BLOCKING');

CREATE TABLE "ComplianceCheck" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "generatedContentId" TEXT,
  "marketplace" TEXT NOT NULL,
  "status" "ComplianceStatus" NOT NULL,
  "highestSeverity" "ComplianceSeverity" NOT NULL,
  "contentHash" TEXT NOT NULL,
  "checkedByEmail" TEXT NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "overriddenAt" TIMESTAMP(3),
  "overriddenByEmail" TEXT,
  "overrideReason" TEXT,
  CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceCheckResult" (
  "id" TEXT NOT NULL,
  "checkId" TEXT NOT NULL,
  "ruleCode" TEXT NOT NULL,
  "status" "ComplianceStatus" NOT NULL,
  "severity" "ComplianceSeverity" NOT NULL,
  "message" TEXT NOT NULL,
  "fixSuggestion" TEXT,
  "evidence" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceCheckResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceOverride" (
  "id" TEXT NOT NULL,
  "checkId" TEXT NOT NULL,
  "fromStatus" "ComplianceStatus" NOT NULL,
  "toStatus" "ComplianceStatus" NOT NULL,
  "reason" TEXT NOT NULL,
  "overriddenByEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceOverride_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplianceCheck_productId_checkedAt_idx" ON "ComplianceCheck"("productId", "checkedAt" DESC);
CREATE INDEX "ComplianceCheck_status_highestSeverity_idx" ON "ComplianceCheck"("status", "highestSeverity");
CREATE INDEX "ComplianceCheck_generatedContentId_idx" ON "ComplianceCheck"("generatedContentId");
CREATE UNIQUE INDEX "ComplianceCheckResult_checkId_ruleCode_key" ON "ComplianceCheckResult"("checkId", "ruleCode");
CREATE INDEX "ComplianceCheckResult_status_severity_idx" ON "ComplianceCheckResult"("status", "severity");
CREATE INDEX "ComplianceOverride_checkId_createdAt_idx" ON "ComplianceOverride"("checkId", "createdAt" DESC);
CREATE INDEX "ComplianceOverride_overriddenByEmail_createdAt_idx" ON "ComplianceOverride"("overriddenByEmail", "createdAt" DESC);

ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_generatedContentId_fkey" FOREIGN KEY ("generatedContentId") REFERENCES "GeneratedContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceCheckResult" ADD CONSTRAINT "ComplianceCheckResult_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ComplianceCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceOverride" ADD CONSTRAINT "ComplianceOverride_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ComplianceCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
