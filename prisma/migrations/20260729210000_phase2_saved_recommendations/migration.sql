CREATE TABLE "SavedProduct" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedProduct_userEmail_productId_key" ON "SavedProduct"("userEmail", "productId");
CREATE INDEX "SavedProduct_userEmail_createdAt_idx" ON "SavedProduct"("userEmail", "createdAt" DESC);

ALTER TABLE "SavedProduct" ADD CONSTRAINT "SavedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
