-- Phase 3 content experiment and recommendation learning foundation.
-- CreateEnum
CREATE TYPE "ContentExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExperimentPrimaryMetric" AS ENUM ('CLICKS', 'CONVERSIONS', 'CONVERSION_RATE', 'COMMISSION', 'EARNINGS_PER_CLICK');

-- CreateEnum
CREATE TYPE "RecommendationFeedbackAction" AS ENUM ('APPROVED', 'REJECTED', 'PROMOTED', 'SKIPPED', 'SUCCESSFUL', 'UNSUCCESSFUL');

-- CreateEnum
CREATE TYPE "LearningDimension" AS ENUM ('CATEGORY', 'MARKETPLACE', 'PRICE_BAND', 'COMMISSION_BAND', 'CREATOR', 'AUDIENCE', 'HOOK', 'CTA', 'CAPTION_TONE', 'SEASON', 'FESTIVAL');

-- CreateEnum
CREATE TYPE "ScoringWeightStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "ContentExperiment" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "primaryMetric" "ExperimentPrimaryMetric" NOT NULL,
    "status" "ContentExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "confidenceThreshold" DECIMAL(5,4) NOT NULL DEFAULT 0.95,
    "winnerVariationId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentVariation" (
    "experimentId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "allocationPercent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentVariation_pkey" PRIMARY KEY ("experimentId","variationId")
);

-- CreateTable
CREATE TABLE "ExperimentResult" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "conversions" INTEGER NOT NULL,
    "commission" DECIMAL(14,2) NOT NULL,
    "conversionRate" DECIMAL(8,4) NOT NULL,
    "earningsPerClick" DECIMAL(14,4) NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationFeedback" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "scoreEvidenceId" TEXT,
    "action" "RecommendationFeedbackAction" NOT NULL,
    "reason" TEXT,
    "audience" TEXT,
    "season" TEXT,
    "festival" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningProfile" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "dimension" "LearningDimension" NOT NULL,
    "dimensionKey" TEXT NOT NULL,
    "observationCount" INTEGER NOT NULL,
    "promotionCount" INTEGER NOT NULL,
    "conversionCount" INTEGER NOT NULL,
    "conversionRate" DECIMAL(8,4) NOT NULL,
    "averageCommission" DECIMAL(14,4) NOT NULL,
    "earningsPerClick" DECIMAL(14,4) NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "evidenceFrom" TIMESTAMP(3) NOT NULL,
    "evidenceTo" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringWeightVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "ScoringWeightStatus" NOT NULL DEFAULT 'DRAFT',
    "weights" JSONB NOT NULL,
    "evidenceFrom" TIMESTAMP(3) NOT NULL,
    "evidenceTo" TIMESTAMP(3) NOT NULL,
    "observationCount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "previousVersionId" TEXT,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),

    CONSTRAINT "ScoringWeightVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationQualitySnapshot" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "recommendationCount" INTEGER NOT NULL,
    "approvalRate" DECIMAL(8,4) NOT NULL,
    "promotionRate" DECIMAL(8,4) NOT NULL,
    "conversionRate" DECIMAL(8,4) NOT NULL,
    "averageCommission" DECIMAL(14,4) NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "windowFrom" TIMESTAMP(3) NOT NULL,
    "windowTo" TIMESTAMP(3) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationQualitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentExperiment_ownerEmail_status_updatedAt_idx" ON "ContentExperiment"("ownerEmail", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ContentExperiment_productId_createdAt_idx" ON "ContentExperiment"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ContentExperiment_campaignId_idx" ON "ContentExperiment"("campaignId");

-- CreateIndex
CREATE INDEX "ContentExperiment_winnerVariationId_idx" ON "ContentExperiment"("winnerVariationId");

-- CreateIndex
CREATE INDEX "ExperimentVariation_variationId_idx" ON "ExperimentVariation"("variationId");

-- CreateIndex
CREATE INDEX "ExperimentResult_experimentId_confidence_idx" ON "ExperimentResult"("experimentId", "confidence" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentResult_experimentId_variationId_calculatedAt_key" ON "ExperimentResult"("experimentId", "variationId", "calculatedAt");

-- CreateIndex
CREATE INDEX "RecommendationFeedback_ownerEmail_action_recordedAt_idx" ON "RecommendationFeedback"("ownerEmail", "action", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "RecommendationFeedback_productId_recordedAt_idx" ON "RecommendationFeedback"("productId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "RecommendationFeedback_scoreEvidenceId_idx" ON "RecommendationFeedback"("scoreEvidenceId");

-- CreateIndex
CREATE INDEX "LearningProfile_ownerEmail_confidence_idx" ON "LearningProfile"("ownerEmail", "confidence" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LearningProfile_ownerEmail_dimension_dimensionKey_key" ON "LearningProfile"("ownerEmail", "dimension", "dimensionKey");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringWeightVersion_version_key" ON "ScoringWeightVersion"("version");

-- CreateIndex
CREATE INDEX "ScoringWeightVersion_status_createdAt_idx" ON "ScoringWeightVersion"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RecommendationQualitySnapshot_ownerEmail_calculatedAt_idx" ON "RecommendationQualitySnapshot"("ownerEmail", "calculatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationQualitySnapshot_ownerEmail_modelVersion_windo_key" ON "RecommendationQualitySnapshot"("ownerEmail", "modelVersion", "windowFrom", "windowTo");

-- AddForeignKey
ALTER TABLE "ContentExperiment" ADD CONSTRAINT "ContentExperiment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentExperiment" ADD CONSTRAINT "ContentExperiment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentExperiment" ADD CONSTRAINT "ContentExperiment_winnerVariationId_fkey" FOREIGN KEY ("winnerVariationId") REFERENCES "ContentVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentVariation" ADD CONSTRAINT "ExperimentVariation_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ContentExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentVariation" ADD CONSTRAINT "ExperimentVariation_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ContentVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentResult" ADD CONSTRAINT "ExperimentResult_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ContentExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentResult" ADD CONSTRAINT "ExperimentResult_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ContentVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_scoreEvidenceId_fkey" FOREIGN KEY ("scoreEvidenceId") REFERENCES "OpportunityScoreEvidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringWeightVersion" ADD CONSTRAINT "ScoringWeightVersion_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "ScoringWeightVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
