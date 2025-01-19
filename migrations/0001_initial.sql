-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "role" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "passwordHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Inhabitant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "heynaboId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "householdId" INTEGER NOT NULL,
    "pictureUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    CONSTRAINT "Inhabitant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inhabitant_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Household" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "heynaboId" INTEGER NOT NULL,
    "pbsId" INTEGER NOT NULL,
    "movedInDate" DATETIME NOT NULL,
    "moveOutDate" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Inhabitant_heynaboId_key" ON "Inhabitant"("heynaboId");

-- CreateIndex
CREATE UNIQUE INDEX "Inhabitant_userId_key" ON "Inhabitant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Inhabitant_householdId_key" ON "Inhabitant"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Household_heynaboId_key" ON "Household"("heynaboId");

-- CreateIndex
CREATE UNIQUE INDEX "Household_pbsId_key" ON "Household"("pbsId");
