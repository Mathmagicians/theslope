-- AlterTable
ALTER TABLE "OrderHistory" ADD COLUMN "dinnerEventId" INTEGER;
ALTER TABLE "OrderHistory" ADD COLUMN "inhabitantId" INTEGER;
ALTER TABLE "OrderHistory" ADD COLUMN "seasonId" INTEGER;

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
    CONSTRAINT "Invoice_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "billingPeriod", "createdAt", "cutoffDate", "householdId", "id", "paymentDate") SELECT "amount", "billingPeriod", "createdAt", "cutoffDate", "householdId", "id", "paymentDate" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE INDEX "Invoice_householdId_idx" ON "Invoice"("householdId");
CREATE INDEX "Invoice_billingPeriod_idx" ON "Invoice"("billingPeriod");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrderHistory_seasonId_inhabitantId_dinnerEventId_action_idx" ON "OrderHistory"("seasonId", "inhabitantId", "dinnerEventId", "action");
