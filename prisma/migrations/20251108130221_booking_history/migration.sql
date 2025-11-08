/*
  Warnings:

  - You are about to drop the column `ticketType` on the `Order` table. All the data in the column will be lost.
  - Added the required column `priceAtBooking` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketPriceId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "OrderHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER,
    "action" TEXT NOT NULL,
    "performedByUserId" INTEGER,
    "auditData" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderHistory_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dinnerEventId" INTEGER NOT NULL,
    "inhabitantId" INTEGER NOT NULL,
    "bookedByUserId" INTEGER,
    "ticketPriceId" INTEGER NOT NULL,
    "priceAtBooking" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'BOOKED',
    "releasedAt" DATETIME,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_dinnerEventId_fkey" FOREIGN KEY ("dinnerEventId") REFERENCES "DinnerEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_bookedByUserId_fkey" FOREIGN KEY ("bookedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_ticketPriceId_fkey" FOREIGN KEY ("ticketPriceId") REFERENCES "TicketPrice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "dinnerEventId", "id", "inhabitantId", "updatedAt") SELECT "createdAt", "dinnerEventId", "id", "inhabitantId", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrderHistory_orderId_idx" ON "OrderHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderHistory_performedByUserId_idx" ON "OrderHistory"("performedByUserId");

-- CreateIndex
CREATE INDEX "OrderHistory_timestamp_idx" ON "OrderHistory"("timestamp");
