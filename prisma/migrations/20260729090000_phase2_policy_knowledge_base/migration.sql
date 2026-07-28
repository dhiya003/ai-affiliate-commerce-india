CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'NEEDS_REVIEW', 'RETIRED');
CREATE TYPE "PolicySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'BLOCKING');

CREATE TABLE "MarketplaceRule" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rateMin" DECIMAL(6,2),
    "rateMax" DECIMAL(6,2),
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentPolicy" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateDisclosure" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "disclosureText" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffiliateDisclosure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProhibitedPractice" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" "PolicySeverity" NOT NULL DEFAULT 'HIGH',
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProhibitedPractice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformUpdateHistory" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "policyKind" TEXT NOT NULL,
    "policyId" TEXT,
    "changeType" TEXT NOT NULL,
    "previousStatus" "PolicyStatus",
    "nextStatus" "PolicyStatus",
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformUpdateHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketplaceRule_marketplaceId_title_key" ON "MarketplaceRule"("marketplaceId", "title");
CREATE INDEX "MarketplaceRule_status_effectiveAt_idx" ON "MarketplaceRule"("status", "effectiveAt" DESC);
CREATE UNIQUE INDEX "CommissionRule_marketplaceId_category_effectiveAt_key" ON "CommissionRule"("marketplaceId", "category", "effectiveAt");
CREATE INDEX "CommissionRule_status_effectiveAt_idx" ON "CommissionRule"("status", "effectiveAt" DESC);
CREATE UNIQUE INDEX "ContentPolicy_marketplaceId_title_key" ON "ContentPolicy"("marketplaceId", "title");
CREATE INDEX "ContentPolicy_status_effectiveAt_idx" ON "ContentPolicy"("status", "effectiveAt" DESC);
CREATE UNIQUE INDEX "AffiliateDisclosure_marketplaceId_title_key" ON "AffiliateDisclosure"("marketplaceId", "title");
CREATE INDEX "AffiliateDisclosure_status_effectiveAt_idx" ON "AffiliateDisclosure"("status", "effectiveAt" DESC);
CREATE UNIQUE INDEX "ProhibitedPractice_marketplaceId_title_key" ON "ProhibitedPractice"("marketplaceId", "title");
CREATE INDEX "ProhibitedPractice_status_effectiveAt_idx" ON "ProhibitedPractice"("status", "effectiveAt" DESC);
CREATE INDEX "PlatformUpdateHistory_marketplaceId_detectedAt_idx" ON "PlatformUpdateHistory"("marketplaceId", "detectedAt" DESC);
CREATE INDEX "PlatformUpdateHistory_policyKind_policyId_idx" ON "PlatformUpdateHistory"("policyKind", "policyId");

ALTER TABLE "MarketplaceRule" ADD CONSTRAINT "MarketplaceRule_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentPolicy" ADD CONSTRAINT "ContentPolicy_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateDisclosure" ADD CONSTRAINT "AffiliateDisclosure_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProhibitedPractice" ADD CONSTRAINT "ProhibitedPractice_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformUpdateHistory" ADD CONSTRAINT "PlatformUpdateHistory_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
