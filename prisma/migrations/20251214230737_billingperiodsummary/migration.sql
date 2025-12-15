-- CreateTable
CREATE TABLE "BillingPeriodSummary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "billingPeriod" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "householdCount" INTEGER NOT NULL,
    "ticketCount" INTEGER NOT NULL,
    "cutoffDate" DATETIME NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cutoffDate" DATETIME NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" INTEGER,
    "billingPeriodSummaryId" INTEGER,
    CONSTRAINT "Invoice_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_billingPeriodSummaryId_fkey" FOREIGN KEY ("billingPeriodSummaryId") REFERENCES "BillingPeriodSummary" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "billingPeriod", "createdAt", "cutoffDate", "householdId", "id", "paymentDate") SELECT "amount", "billingPeriod", "createdAt", "cutoffDate", "householdId", "id", "paymentDate" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE INDEX "Invoice_householdId_idx" ON "Invoice"("householdId");
CREATE INDEX "Invoice_billingPeriod_idx" ON "Invoice"("billingPeriod");
CREATE INDEX "Invoice_billingPeriodSummaryId_idx" ON "Invoice"("billingPeriodSummaryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BillingPeriodSummary_billingPeriod_key" ON "BillingPeriodSummary"("billingPeriod");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPeriodSummary_shareToken_key" ON "BillingPeriodSummary"("shareToken");
