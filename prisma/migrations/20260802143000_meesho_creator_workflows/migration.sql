CREATE TYPE "MeeshoCreatorWorkflowStatus" AS ENUM (
  'IMPORTED', 'LINK_READY', 'CREATIVE_READY', 'APPROVED', 'PUBLISHING',
  'PUBLISHED', 'AUTODM_ENROLLED', 'RETRY_SCHEDULED', 'FAILED'
);

ALTER TYPE "NotificationType" ADD VALUE 'CREATOR_WORKFLOW_FAILURE';

CREATE TABLE "MeeshoCreatorWorkflow" (
  "id" TEXT NOT NULL,
  "ownerEmail" TEXT NOT NULL,
  "productId" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MEESHO_WISHLIST',
  "status" "MeeshoCreatorWorkflowStatus" NOT NULL DEFAULT 'IMPORTED',
  "productUrl" TEXT NOT NULL,
  "affiliateUrl" TEXT,
  "title" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "originalPrice" DECIMAL(12,2),
  "supplierName" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "factsVerifiedAt" TIMESTAMP(3),
  "generatedContentId" TEXT,
  "caption" TEXT,
  "hashtags" JSONB NOT NULL DEFAULT '[]',
  "creativePublicToken" TEXT,
  "creativeRenderedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "instagramCreationId" TEXT,
  "instagramMediaId" TEXT,
  "instagramPermalink" TEXT,
  "publishedAt" TIMESTAMP(3),
  "autoDmEnrolledAt" TIMESTAMP(3),
  "autoDmTriggerWords" JSONB NOT NULL DEFAULT '["LINK","PRICE","DETAILS","DM"]',
  "publishAttemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MeeshoCreatorWorkflow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MeeshoCreatorWorkflow_ownerEmail_productUrl_key" ON "MeeshoCreatorWorkflow"("ownerEmail", "productUrl");
CREATE UNIQUE INDEX "MeeshoCreatorWorkflow_creativePublicToken_key" ON "MeeshoCreatorWorkflow"("creativePublicToken");
CREATE INDEX "MeeshoCreatorWorkflow_ownerEmail_status_updatedAt_idx" ON "MeeshoCreatorWorkflow"("ownerEmail", "status", "updatedAt" DESC);
CREATE INDEX "MeeshoCreatorWorkflow_status_nextRetryAt_idx" ON "MeeshoCreatorWorkflow"("status", "nextRetryAt");
