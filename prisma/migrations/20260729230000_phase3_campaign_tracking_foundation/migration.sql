-- Phase 3 campaign, content experiment, and affiliate tracking foundation.
-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignPromotionStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentVariationStatus" AS ENUM ('ACTIVE', 'WINNER', 'LOSER', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrackingDeviceType" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AffiliateOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('ESTIMATED', 'PENDING', 'APPROVED', 'PAID', 'REVERSED');

-- CreateTable
CREATE TABLE "CreatorAccount" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT,
    "externalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "creatorAccountId" TEXT,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "budget" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "templateName" TEXT,
    "duplicatedFromId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVariation" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "generatedContentId" TEXT,
    "label" TEXT NOT NULL,
    "hook" TEXT,
    "caption" TEXT,
    "cta" TEXT,
    "hashtags" JSONB NOT NULL DEFAULT '[]',
    "audienceAngle" TEXT,
    "contentLength" TEXT,
    "tone" TEXT,
    "platform" TEXT NOT NULL,
    "status" "ContentVariationStatus" NOT NULL DEFAULT 'ACTIVE',
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPromotion" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "generatedContentId" TEXT,
    "contentVariationId" TEXT,
    "status" "CampaignPromotionStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedLink" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "contentVariationId" TEXT,
    "marketplace" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "shortPath" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL,
    "trackedLinkId" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trafficSource" TEXT,
    "deviceType" "TrackingDeviceType" NOT NULL DEFAULT 'UNKNOWN',
    "region" TEXT,
    "fingerprintHash" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionEvent" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "trackedLinkId" TEXT NOT NULL,
    "clickEventId" TEXT,
    "marketplace" TEXT NOT NULL,
    "externalOrderIdHash" TEXT NOT NULL,
    "orderStatus" "AffiliateOrderStatus" NOT NULL,
    "orderValue" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "convertedAt" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEvent" (
    "id" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "conversionEventId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "AffiliateCommissionStatus" NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreatorAccount_ownerEmail_isActive_idx" ON "CreatorAccount"("ownerEmail", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorAccount_ownerEmail_platform_handle_key" ON "CreatorAccount"("ownerEmail", "platform", "handle");

-- CreateIndex
CREATE INDEX "Campaign_ownerEmail_status_updatedAt_idx" ON "Campaign"("ownerEmail", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Campaign_ownerEmail_channel_startsAt_idx" ON "Campaign"("ownerEmail", "channel", "startsAt" DESC);

-- CreateIndex
CREATE INDEX "Campaign_ownerEmail_name_idx" ON "Campaign"("ownerEmail", "name");

-- CreateIndex
CREATE INDEX "Campaign_creatorAccountId_idx" ON "Campaign"("creatorAccountId");

-- CreateIndex
CREATE INDEX "ContentVariation_productId_status_idx" ON "ContentVariation"("productId", "status");

-- CreateIndex
CREATE INDEX "ContentVariation_generatedContentId_idx" ON "ContentVariation"("generatedContentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVariation_ownerEmail_productId_label_key" ON "ContentVariation"("ownerEmail", "productId", "label");

-- CreateIndex
CREATE INDEX "CampaignPromotion_ownerEmail_status_updatedAt_idx" ON "CampaignPromotion"("ownerEmail", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "CampaignPromotion_campaignId_publishedAt_idx" ON "CampaignPromotion"("campaignId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "CampaignPromotion_productId_publishedAt_idx" ON "CampaignPromotion"("productId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "CampaignPromotion_contentVariationId_idx" ON "CampaignPromotion"("contentVariationId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedLink_trackingId_key" ON "TrackedLink"("trackingId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedLink_shortPath_key" ON "TrackedLink"("shortPath");

-- CreateIndex
CREATE INDEX "TrackedLink_ownerEmail_isActive_idx" ON "TrackedLink"("ownerEmail", "isActive");

-- CreateIndex
CREATE INDEX "TrackedLink_campaignId_idx" ON "TrackedLink"("campaignId");

-- CreateIndex
CREATE INDEX "TrackedLink_productId_idx" ON "TrackedLink"("productId");

-- CreateIndex
CREATE INDEX "ClickEvent_trackedLinkId_clickedAt_idx" ON "ClickEvent"("trackedLinkId", "clickedAt" DESC);

-- CreateIndex
CREATE INDEX "ClickEvent_isBot_isDuplicate_clickedAt_idx" ON "ClickEvent"("isBot", "isDuplicate", "clickedAt" DESC);

-- CreateIndex
CREATE INDEX "ClickEvent_fingerprintHash_clickedAt_idx" ON "ClickEvent"("fingerprintHash", "clickedAt" DESC);

-- CreateIndex
CREATE INDEX "ConversionEvent_ownerEmail_convertedAt_idx" ON "ConversionEvent"("ownerEmail", "convertedAt" DESC);

-- CreateIndex
CREATE INDEX "ConversionEvent_trackedLinkId_orderStatus_idx" ON "ConversionEvent"("trackedLinkId", "orderStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ConversionEvent_marketplace_externalOrderIdHash_key" ON "ConversionEvent"("marketplace", "externalOrderIdHash");

-- CreateIndex
CREATE INDEX "CommissionEvent_ownerEmail_status_observedAt_idx" ON "CommissionEvent"("ownerEmail", "status", "observedAt" DESC);

-- CreateIndex
CREATE INDEX "CommissionEvent_marketplace_observedAt_idx" ON "CommissionEvent"("marketplace", "observedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionEvent_conversionEventId_status_observedAt_key" ON "CommissionEvent"("conversionEventId", "status", "observedAt");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_creatorAccountId_fkey" FOREIGN KEY ("creatorAccountId") REFERENCES "CreatorAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_duplicatedFromId_fkey" FOREIGN KEY ("duplicatedFromId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVariation" ADD CONSTRAINT "ContentVariation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVariation" ADD CONSTRAINT "ContentVariation_generatedContentId_fkey" FOREIGN KEY ("generatedContentId") REFERENCES "GeneratedContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPromotion" ADD CONSTRAINT "CampaignPromotion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPromotion" ADD CONSTRAINT "CampaignPromotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPromotion" ADD CONSTRAINT "CampaignPromotion_generatedContentId_fkey" FOREIGN KEY ("generatedContentId") REFERENCES "GeneratedContent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPromotion" ADD CONSTRAINT "CampaignPromotion_contentVariationId_fkey" FOREIGN KEY ("contentVariationId") REFERENCES "ContentVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedLink" ADD CONSTRAINT "TrackedLink_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "CampaignPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedLink" ADD CONSTRAINT "TrackedLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedLink" ADD CONSTRAINT "TrackedLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedLink" ADD CONSTRAINT "TrackedLink_contentVariationId_fkey" FOREIGN KEY ("contentVariationId") REFERENCES "ContentVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickEvent" ADD CONSTRAINT "ClickEvent_trackedLinkId_fkey" FOREIGN KEY ("trackedLinkId") REFERENCES "TrackedLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_trackedLinkId_fkey" FOREIGN KEY ("trackedLinkId") REFERENCES "TrackedLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_clickEventId_fkey" FOREIGN KEY ("clickEventId") REFERENCES "ClickEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEvent" ADD CONSTRAINT "CommissionEvent_conversionEventId_fkey" FOREIGN KEY ("conversionEventId") REFERENCES "ConversionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "SourceTrendScore_productId_sourceName_windowDays_calculatedAt_k" RENAME TO "SourceTrendScore_productId_sourceName_windowDays_calculated_key";
