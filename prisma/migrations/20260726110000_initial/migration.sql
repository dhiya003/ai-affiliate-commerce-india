-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ProductWorkflowStatus" AS ENUM ('NEW', 'REVIEWED', 'APPROVED', 'REJECTED', 'PROMOTED');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReturnRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('PRODUCT_SUMMARY', 'PROMOTION_RATIONALE', 'TARGET_AUDIENCE', 'REEL_HOOKS', 'REEL_SCRIPT_30', 'REEL_SCRIPT_60', 'CAPTION', 'HASHTAGS', 'CTA_OPTIONS', 'THUMBNAIL_TEXT', 'PROS', 'CAUTIONS', 'BUNDLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Marketplace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "rating" DECIMAL(3,2),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "marketplaceProductId" TEXT NOT NULL,
    "sellerId" TEXT,
    "categoryId" TEXT,
    "createdById" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "currentPrice" DECIMAL(12,2) NOT NULL,
    "originalPrice" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "commissionRate" DECIMAL(5,2),
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'UNKNOWN',
    "returnRisk" "ReturnRisk" NOT NULL DEFAULT 'UNKNOWN',
    "status" "ProductWorkflowStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "originalPrice" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "inStock" BOOLEAN NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductScore" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "opportunityScore" DECIMAL(5,2) NOT NULL,
    "ratingScore" DECIMAL(5,2) NOT NULL,
    "reviewVolumeScore" DECIMAL(5,2) NOT NULL,
    "discountScore" DECIMAL(5,2) NOT NULL,
    "commissionScore" DECIMAL(5,2) NOT NULL,
    "priceAttractivenessScore" DECIMAL(5,2) NOT NULL,
    "sellerQualityScore" DECIMAL(5,2) NOT NULL,
    "competitionScore" DECIMAL(5,2) NOT NULL,
    "trendScore" DECIMAL(5,2) NOT NULL,
    "demandScore" DECIMAL(5,2) NOT NULL,
    "returnRiskPenalty" DECIMAL(5,2) NOT NULL,
    "commissionEstimate" DECIMAL(12,2),
    "explanation" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "content" JSONB NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerModel" TEXT NOT NULL,
    "requestId" TEXT,
    "generationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionStatus" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "from" "ProductWorkflowStatus",
    "to" "ProductWorkflowStatus" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTagAssignment" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTagAssignment_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "AffiliateLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Marketplace_name_key" ON "Marketplace"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Marketplace_slug_key" ON "Marketplace"("slug");

-- CreateIndex
CREATE INDEX "Marketplace_isActive_idx" ON "Marketplace"("isActive");

-- CreateIndex
CREATE INDEX "Seller_marketplaceId_name_idx" ON "Seller"("marketplaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_marketplaceId_externalId_key" ON "Seller"("marketplaceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE INDEX "ProductCategory_parentId_idx" ON "ProductCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_parentId_name_key" ON "ProductCategory"("parentId", "name");

-- CreateIndex
CREATE INDEX "Product_status_isActive_idx" ON "Product"("status", "isActive");

-- CreateIndex
CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Product_marketplaceId_status_idx" ON "Product"("marketplaceId", "status");

-- CreateIndex
CREATE INDEX "Product_currentPrice_idx" ON "Product"("currentPrice");

-- CreateIndex
CREATE INDEX "Product_rating_idx" ON "Product"("rating");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_marketplaceId_marketplaceProductId_key" ON "Product"("marketplaceId", "marketplaceProductId");

-- CreateIndex
CREATE INDEX "ProductPriceHistory_productId_capturedAt_idx" ON "ProductPriceHistory"("productId", "capturedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPriceHistory_productId_capturedAt_key" ON "ProductPriceHistory"("productId", "capturedAt");

-- CreateIndex
CREATE INDEX "ProductScore_opportunityScore_idx" ON "ProductScore"("opportunityScore" DESC);

-- CreateIndex
CREATE INDEX "ProductScore_productId_calculatedAt_idx" ON "ProductScore"("productId", "calculatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductScore_productId_version_calculatedAt_key" ON "ProductScore"("productId", "version", "calculatedAt");

-- CreateIndex
CREATE INDEX "GeneratedContent_productId_createdAt_idx" ON "GeneratedContent"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedContent_createdById_createdAt_idx" ON "GeneratedContent"("createdById", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedContent_kind_idx" ON "GeneratedContent"("kind");

-- CreateIndex
CREATE INDEX "PromotionStatus_productId_changedAt_idx" ON "PromotionStatus"("productId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "PromotionStatus_changedBy_changedAt_idx" ON "PromotionStatus"("changedBy", "changedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ProductTag_slug_key" ON "ProductTag"("slug");

-- CreateIndex
CREATE INDEX "ProductTagAssignment_tagId_idx" ON "ProductTagAssignment"("tagId");

-- CreateIndex
CREATE INDEX "AffiliateLink_productId_isPrimary_idx" ON "AffiliateLink"("productId", "isPrimary");

-- CreateIndex
CREATE INDEX "AffiliateLink_marketplaceId_isActive_idx" ON "AffiliateLink"("marketplaceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateLink_productId_url_key" ON "AffiliateLink"("productId", "url");

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductScore" ADD CONSTRAINT "ProductScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedContent" ADD CONSTRAINT "GeneratedContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionStatus" ADD CONSTRAINT "PromotionStatus_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionStatus" ADD CONSTRAINT "PromotionStatus_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTagAssignment" ADD CONSTRAINT "ProductTagAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTagAssignment" ADD CONSTRAINT "ProductTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ProductTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "Marketplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
