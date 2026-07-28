CREATE TYPE "TrendSignalType" AS ENUM (
  'GOOGLE_TRENDS',
  'SOCIAL_MENTIONS',
  'MARKETPLACE_BESTSELLER',
  'REVIEW_GROWTH',
  'PRICE_DROP',
  'DISCOUNT_GROWTH',
  'AVAILABILITY',
  'CATEGORY_MOMENTUM',
  'SEASONAL_DEMAND',
  'FESTIVAL_DEMAND',
  'NEW_PRODUCT_VELOCITY'
);
CREATE TYPE "TrendDirection" AS ENUM ('SPIKING', 'RISING', 'STABLE', 'DECAYING');

CREATE TABLE "TrendSignal" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sourceId" TEXT,
  "signalType" "TrendSignalType" NOT NULL,
  "value" DECIMAL(18,4) NOT NULL,
  "normalizedScore" DECIMAL(5,2) NOT NULL,
  "confidence" DECIMAL(5,4) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrendSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceTrendScore" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "windowDays" INTEGER NOT NULL,
  "score" DECIMAL(5,2) NOT NULL,
  "confidence" DECIMAL(5,4) NOT NULL,
  "signalCount" INTEGER NOT NULL,
  "direction" "TrendDirection" NOT NULL,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provenance" JSONB NOT NULL,
  CONSTRAINT "SourceTrendScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpportunityScoreEvidence" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "marketplace" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "opportunityScore" DECIMAL(5,2) NOT NULL,
  "input" JSONB NOT NULL,
  "weights" JSONB NOT NULL,
  "breakdown" JSONB NOT NULL,
  "penalties" JSONB NOT NULL,
  "explanation" JSONB NOT NULL,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityScoreEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrendSignal_productId_observedAt_idx" ON "TrendSignal"("productId", "observedAt" DESC);
CREATE INDEX "TrendSignal_signalType_observedAt_idx" ON "TrendSignal"("signalType", "observedAt" DESC);
CREATE INDEX "TrendSignal_sourceId_observedAt_idx" ON "TrendSignal"("sourceId", "observedAt" DESC);
CREATE UNIQUE INDEX "SourceTrendScore_productId_sourceName_windowDays_calculatedAt_key" ON "SourceTrendScore"("productId", "sourceName", "windowDays", "calculatedAt");
CREATE INDEX "SourceTrendScore_score_calculatedAt_idx" ON "SourceTrendScore"("score" DESC, "calculatedAt" DESC);
CREATE INDEX "OpportunityScoreEvidence_productId_calculatedAt_idx" ON "OpportunityScoreEvidence"("productId", "calculatedAt" DESC);
CREATE INDEX "OpportunityScoreEvidence_version_opportunityScore_idx" ON "OpportunityScoreEvidence"("version", "opportunityScore" DESC);

ALTER TABLE "TrendSignal" ADD CONSTRAINT "TrendSignal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrendSignal" ADD CONSTRAINT "TrendSignal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProductSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceTrendScore" ADD CONSTRAINT "SourceTrendScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityScoreEvidence" ADD CONSTRAINT "OpportunityScoreEvidence_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
