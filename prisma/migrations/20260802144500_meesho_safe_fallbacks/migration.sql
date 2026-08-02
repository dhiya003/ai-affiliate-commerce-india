ALTER TABLE "MeeshoCreatorWorkflow" ADD COLUMN "autoDmDeliveredCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MeeshoCreatorWorkflow" ADD COLUMN "autoDmOpenCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MeeshoCreatorWorkflow" ADD COLUMN "autoDmClickCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MeeshoCreatorWorkflow" ADD COLUMN "autoDmConversionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MeeshoCreatorWorkflow" ADD COLUMN "autoDmRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "MeeshoCreatorWorkflow" ADD COLUMN "autoDmCommission" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "MeeshoCreatorWorkflow" ADD COLUMN "lastAutoDmReportAt" TIMESTAMP(3);

CREATE TABLE "MeeshoAutoDmReportImport" (
  "id" TEXT NOT NULL,
  "ownerEmail" TEXT NOT NULL,
  "workflowId" TEXT,
  "reportDate" TIMESTAMP(3) NOT NULL,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "conversionCount" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "sourceRow" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeeshoAutoDmReportImport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MeeshoAutoDmReportImport" ADD CONSTRAINT "MeeshoAutoDmReportImport_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "MeeshoCreatorWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MeeshoAutoDmReportImport_ownerEmail_reportDate_idx" ON "MeeshoAutoDmReportImport"("ownerEmail", "reportDate");
CREATE INDEX "MeeshoAutoDmReportImport_workflowId_idx" ON "MeeshoAutoDmReportImport"("workflowId");
