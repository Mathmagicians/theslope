/*
  Warnings:

  - Added the required column `billingPeriod` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderSnapshot` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userEmailHandle` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userSnapshot` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "DinnerEventAllergen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dinnerEventId" INTEGER NOT NULL,
    "allergyTypeId" INTEGER NOT NULL,
    CONSTRAINT "DinnerEventAllergen_dinnerEventId_fkey" FOREIGN KEY ("dinnerEventId") REFERENCES "DinnerEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DinnerEventAllergen_allergyTypeId_fkey" FOREIGN KEY ("allergyTypeId") REFERENCES "AllergyType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "householdId" INTEGER NOT NULL,
    CONSTRAINT "Invoice_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "createdAt", "cutoffDate", "householdId", "id", "paymentDate") SELECT "amount", "createdAt", "cutoffDate", "householdId", "id", "paymentDate" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE INDEX "Invoice_householdId_idx" ON "Invoice"("householdId");
CREATE INDEX "Invoice_billingPeriod_idx" ON "Invoice"("billingPeriod");
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER,
    "orderSnapshot" TEXT NOT NULL,
    "userSnapshot" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "userEmailHandle" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" INTEGER,
    CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "createdAt", "id", "invoiceId", "orderId") SELECT "amount", "createdAt", "id", "invoiceId", "orderId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_orderId_key" ON "Transaction"("orderId");
CREATE UNIQUE INDEX "Transaction_invoiceId_key" ON "Transaction"("invoiceId");
CREATE INDEX "Transaction_orderId_idx" ON "Transaction"("orderId");
CREATE INDEX "Transaction_invoiceId_idx" ON "Transaction"("invoiceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DinnerEventAllergen_allergyTypeId_idx" ON "DinnerEventAllergen"("allergyTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "DinnerEventAllergen_dinnerEventId_allergyTypeId_key" ON "DinnerEventAllergen"("dinnerEventId", "allergyTypeId");

-- CreateIndex
CREATE INDEX "Allergy_inhabitantId_idx" ON "Allergy"("inhabitantId");

-- CreateIndex
CREATE INDEX "CookingTeamAssignment_cookingTeamId_idx" ON "CookingTeamAssignment"("cookingTeamId");

-- CreateIndex
CREATE INDEX "CookingTeamAssignment_inhabitantId_idx" ON "CookingTeamAssignment"("inhabitantId");

-- CreateIndex
CREATE INDEX "DinnerEvent_seasonId_idx" ON "DinnerEvent"("seasonId");

-- CreateIndex
CREATE INDEX "DinnerEvent_chefId_idx" ON "DinnerEvent"("chefId");

-- CreateIndex
CREATE INDEX "DinnerEvent_date_idx" ON "DinnerEvent"("date");

-- CreateIndex
CREATE INDEX "DinnerEvent_state_idx" ON "DinnerEvent"("state");

-- CreateIndex
CREATE INDEX "Inhabitant_householdId_idx" ON "Inhabitant"("householdId");

-- CreateIndex
CREATE INDEX "Inhabitant_userId_idx" ON "Inhabitant"("userId");

-- CreateIndex
CREATE INDEX "Order_bookedByUserId_idx" ON "Order"("bookedByUserId");

-- CreateIndex
CREATE INDEX "Order_inhabitantId_idx" ON "Order"("inhabitantId");

-- CreateIndex
CREATE INDEX "Order_dinnerEventId_state_idx" ON "Order"("dinnerEventId", "state");
