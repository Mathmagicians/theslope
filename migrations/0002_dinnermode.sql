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
    "dinnerMode" TEXT NOT NULL DEFAULT 'DINEIN',
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
INSERT INTO "new_Order" ("bookedByUserId", "closedAt", "createdAt", "dinnerEventId", "id", "inhabitantId", "priceAtBooking", "releasedAt", "state", "ticketPriceId", "updatedAt") SELECT "bookedByUserId", "closedAt", "createdAt", "dinnerEventId", "id", "inhabitantId", "priceAtBooking", "releasedAt", "state", "ticketPriceId", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
