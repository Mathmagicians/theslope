/*
  Warnings:

  - Added the required column `address` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pbsId` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
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
    "pbsId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    CONSTRAINT "Invoice_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_billingPeriodSummaryId_fkey" FOREIGN KEY ("billingPeriodSummaryId") REFERENCES "BillingPeriodSummary" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "billingPeriod", "billingPeriodSummaryId", "createdAt", "cutoffDate", "householdId", "id", "paymentDate") SELECT "amount", "billingPeriod", "billingPeriodSummaryId", "createdAt", "cutoffDate", "householdId", "id", "paymentDate" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE INDEX "Invoice_householdId_idx" ON "Invoice"("householdId");
CREATE INDEX "Invoice_billingPeriod_idx" ON "Invoice"("billingPeriod");
CREATE INDEX "Invoice_billingPeriodSummaryId_idx" ON "Invoice"("billingPeriodSummaryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
