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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BillingPeriodSummary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "billingPeriod" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "householdCount" INTEGER NOT NULL,
    "ticketCount" INTEGER NOT NULL,
    "cutoffDate" DATETIME NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_BillingPeriodSummary" ("billingPeriod", "createdAt", "cutoffDate", "householdCount", "id", "paymentDate", "shareToken", "ticketCount", "totalAmount") SELECT "billingPeriod", "createdAt", "cutoffDate", "householdCount", "id", "paymentDate", "shareToken", "ticketCount", "totalAmount" FROM "BillingPeriodSummary";
DROP TABLE "BillingPeriodSummary";
ALTER TABLE "new_BillingPeriodSummary" RENAME TO "BillingPeriodSummary";
CREATE UNIQUE INDEX "BillingPeriodSummary_billingPeriod_key" ON "BillingPeriodSummary"("billingPeriod");
CREATE UNIQUE INDEX "BillingPeriodSummary_shareToken_key" ON "BillingPeriodSummary"("shareToken");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "systemRoles" TEXT NOT NULL DEFAULT '[]',
    "notificationChannels" TEXT NOT NULL DEFAULT '["EMAIL"]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "passwordHash", "phone", "systemRoles", "updatedAt") SELECT "createdAt", "email", "id", "passwordHash", "phone", "systemRoles", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Delivery_subjectType_subjectId_kind_idx" ON "Delivery"("subjectType", "subjectId", "kind");

-- Periods closed before the accountant mail existed count as mailed at v1: the first run archives their CSVs, mail starts with the next closed period (convergent: one row per period)
INSERT INTO "Delivery" ("subjectType", "subjectId", "version", "kind", "reference")
SELECT 'BILLING_PERIOD', p."id", 1, 'EMAIL', 'migration-0015'
FROM "BillingPeriodSummary" p
WHERE p."cutoffDate" < '2026-09-17'
  AND NOT EXISTS (SELECT 1 FROM "Delivery" d WHERE d."subjectType" = 'BILLING_PERIOD' AND d."subjectId" = p."id" AND d."kind" = 'EMAIL');
