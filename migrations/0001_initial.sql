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
    "allergyTypeId" INTEGER NOT NULL,
    CONSTRAINT "Allergy_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Allergy_allergyTypeId_fkey" FOREIGN KEY ("allergyTypeId") REFERENCES "AllergyType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "systemRole" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DinnerPreference" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inhabitantId" INTEGER NOT NULL,
    "weekday" TEXT NOT NULL,
    "dinnerMode" TEXT NOT NULL,
    CONSTRAINT "DinnerPreference_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    CONSTRAINT "Inhabitant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inhabitant_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "dinnerMode" TEXT NOT NULL,
    "chefId" INTEGER,
    "cookingTeamId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "seasonId" INTEGER,
    CONSTRAINT "DinnerEvent_chefId_fkey" FOREIGN KEY ("chefId") REFERENCES "Inhabitant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DinnerEvent_cookingTeamId_fkey" FOREIGN KEY ("cookingTeamId") REFERENCES "CookingTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DinnerEvent_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dinnerEventId" INTEGER NOT NULL,
    "inhabitantId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ticketType" TEXT NOT NULL,
    CONSTRAINT "Order_dinnerEventId_fkey" FOREIGN KEY ("dinnerEventId") REFERENCES "DinnerEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" INTEGER,
    CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
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
    CONSTRAINT "CookingTeam_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CookingTeamAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chefForcookingTeamId" INTEGER,
    "cookForcookingTeamId" INTEGER,
    "juniorForcookingTeamId" INTEGER,
    "inhabitantId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    CONSTRAINT "CookingTeamAssignment_chefForcookingTeamId_fkey" FOREIGN KEY ("chefForcookingTeamId") REFERENCES "CookingTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CookingTeamAssignment_cookForcookingTeamId_fkey" FOREIGN KEY ("cookForcookingTeamId") REFERENCES "CookingTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CookingTeamAssignment_juniorForcookingTeamId_fkey" FOREIGN KEY ("juniorForcookingTeamId") REFERENCES "CookingTeam" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CookingTeamAssignment_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shortName" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "cookingDays" TEXT NOT NULL,
    "holidays" TEXT NOT NULL,
    "ticketIsCancellableDaysBefore" INTEGER NOT NULL,
    "diningModeIsEditableMinutesBefore" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "TicketPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seasonId" INTEGER NOT NULL,
    "ticketType" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    CONSTRAINT "TicketPrice_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
CREATE UNIQUE INDEX "Transaction_orderId_key" ON "Transaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_invoiceId_key" ON "Transaction"("invoiceId");
