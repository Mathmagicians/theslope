-- CreateTable
CREATE TABLE "AllergyType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT
);

-- CreateTable
CREATE TABLE "Allergy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inhabitantId" INTEGER NOT NULL,
    "inhabitantComment" TEXT,
    "allergyTypeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Allergy_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Allergy_allergyTypeId_fkey" FOREIGN KEY ("allergyTypeId") REFERENCES "AllergyType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "systemRoles" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Inhabitant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "heynaboId" INTEGER NOT NULL,
    "userId" INTEGER,
    "householdId" INTEGER NOT NULL,
    "pictureUrl" TEXT,
    "name" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATETIME,
    "dinnerPreferences" TEXT,
    CONSTRAINT "Inhabitant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inhabitant_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Household" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "heynaboId" INTEGER NOT NULL,
    "pbsId" INTEGER NOT NULL,
    "movedInDate" DATETIME NOT NULL,
    "moveOutDate" DATETIME,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DinnerEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "menuTitle" TEXT NOT NULL,
    "menuDescription" TEXT,
    "menuPictureUrl" TEXT,
    "state" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "heynaboEventId" INTEGER,
    "chefId" INTEGER,
    "cookingTeamId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "seasonId" INTEGER,
    CONSTRAINT "DinnerEvent_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "Inhabitant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DinnerEvent_cookingTeamId_fkey" FOREIGN KEY ("cookingTeamId") REFERENCES "CookingTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DinnerEvent_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
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

-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" INTEGER,
    CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cutoffDate" DATETIME NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" INTEGER NOT NULL,
    CONSTRAINT "Invoice_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CookingTeam" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seasonId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "affinity" TEXT,
    CONSTRAINT "CookingTeam_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CookingTeamAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cookingTeamId" INTEGER NOT NULL,
    "inhabitantId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "allocationPercentage" INTEGER NOT NULL DEFAULT 100,
    "affinity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CookingTeamAssignment_cookingTeamId_fkey" FOREIGN KEY ("cookingTeamId") REFERENCES "CookingTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CookingTeamAssignment_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shortName" TEXT,
    "seasonDates" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "cookingDays" TEXT NOT NULL,
    "holidays" TEXT NOT NULL,
    "ticketIsCancellableDaysBefore" INTEGER NOT NULL,
    "diningModeIsEditableMinutesBefore" INTEGER NOT NULL,
    "consecutiveCookingDays" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "TicketPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seasonId" INTEGER NOT NULL,
    "ticketType" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "maximumAgeLimit" INTEGER,
    CONSTRAINT "TicketPrice_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- CreateIndex
CREATE UNIQUE INDEX "Allergy_inhabitantId_allergyTypeId_key" ON "Allergy"("inhabitantId", "allergyTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Inhabitant_heynaboId_key" ON "Inhabitant"("heynaboId");

-- CreateIndex
CREATE UNIQUE INDEX "Inhabitant_userId_key" ON "Inhabitant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Household_heynaboId_key" ON "Household"("heynaboId");

-- CreateIndex
CREATE UNIQUE INDEX "Household_pbsId_key" ON "Household"("pbsId");

-- CreateIndex
CREATE UNIQUE INDEX "DinnerEvent_heynaboEventId_key" ON "DinnerEvent"("heynaboEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_orderId_key" ON "Transaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_invoiceId_key" ON "Transaction"("invoiceId");

-- CreateIndex
CREATE INDEX "OrderHistory_orderId_idx" ON "OrderHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderHistory_performedByUserId_idx" ON "OrderHistory"("performedByUserId");

-- CreateIndex
CREATE INDEX "OrderHistory_timestamp_idx" ON "OrderHistory"("timestamp");
