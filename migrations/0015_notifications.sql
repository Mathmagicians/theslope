-- CreateTable
CREATE TABLE "Delivery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subjectType" TEXT NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "jobRunId" INTEGER,
    "deliveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_jobRunId_fkey" FOREIGN KEY ("jobRunId") REFERENCES "JobRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable (written by hand: Prisma emits a table rebuild for a required column, and on D1 DROP TABLE fires the children's ON DELETE actions)
ALTER TABLE "BillingPeriodSummary" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "notificationChannels" TEXT NOT NULL DEFAULT '["EMAIL"]';

-- CreateIndex
CREATE INDEX "Delivery_subjectType_subjectId_kind_idx" ON "Delivery"("subjectType", "subjectId", "kind");

-- Periods closed before the accountant mail existed count as mailed at v1: the first run archives their CSVs, mail starts with the next closed period (convergent: one row per period)
INSERT INTO "Delivery" ("subjectType", "subjectId", "version", "kind", "reference")
SELECT 'BILLING_PERIOD', p."id", 1, 'EMAIL', 'migration-0015'
FROM "BillingPeriodSummary" p
WHERE p."cutoffDate" < '2026-09-17'
  AND NOT EXISTS (SELECT 1 FROM "Delivery" d WHERE d."subjectType" = 'BILLING_PERIOD' AND d."subjectId" = p."id" AND d."kind" = 'EMAIL');
