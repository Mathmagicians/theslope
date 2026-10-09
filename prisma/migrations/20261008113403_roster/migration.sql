/*
  Warnings:

  - A unique constraint covering the columns `[inhabitantId,dinnerEventId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "DinnerDutyTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cookingTeamId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'COOK',
    "minutesFromDinnerStart" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DinnerDutyTemplate_cookingTeamId_fkey" FOREIGN KEY ("cookingTeamId") REFERENCES "CookingTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JokerSlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cookingTeamId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'COOK',
    "allocationPercentage" INTEGER NOT NULL DEFAULT 100,
    "affinity" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JokerSlot_cookingTeamId_fkey" FOREIGN KEY ("cookingTeamId") REFERENCES "CookingTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DinnerDuty" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dinnerEventId" INTEGER NOT NULL,
    "inhabitantId" INTEGER,
    "origin" TEXT NOT NULL DEFAULT 'TEAM',
    "role" TEXT NOT NULL,
    "minutesFromDinnerStart" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DinnerDuty_dinnerEventId_fkey" FOREIGN KEY ("dinnerEventId") REFERENCES "DinnerEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DinnerDuty_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DutyHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dinnerDutyId" INTEGER,
    "action" TEXT NOT NULL,
    "performedByUserId" INTEGER,
    "auditData" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "swapGroupId" TEXT,
    "inhabitantId" INTEGER,
    "dinnerEventId" INTEGER,
    "seasonId" INTEGER,
    CONSTRAINT "DutyHistory_dinnerDutyId_fkey" FOREIGN KEY ("dinnerDutyId") REFERENCES "DinnerDuty" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DutyHistory_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketWaitlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dinnerEventId" INTEGER NOT NULL,
    "inhabitantId" INTEGER NOT NULL,
    "isGuestTicket" BOOLEAN NOT NULL DEFAULT false,
    "order" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketWaitlist_dinnerEventId_fkey" FOREIGN KEY ("dinnerEventId") REFERENCES "DinnerEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketWaitlist_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL DEFAULT 'REGULAR',
    "dinnerEventId" INTEGER,
    "paidByUserId" INTEGER,
    "userSnapshot" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_dinnerEventId_fkey" FOREIGN KEY ("dinnerEventId") REFERENCES "DinnerEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'REGULAR';
ALTER TABLE "Transaction" ADD COLUMN "description" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "DinnerDutyTemplate_cookingTeamId_idx" ON "DinnerDutyTemplate"("cookingTeamId");

-- CreateIndex
CREATE INDEX "JokerSlot_cookingTeamId_idx" ON "JokerSlot"("cookingTeamId");

-- CreateIndex
CREATE INDEX "DinnerDuty_dinnerEventId_idx" ON "DinnerDuty"("dinnerEventId");

-- CreateIndex
CREATE INDEX "DinnerDuty_inhabitantId_idx" ON "DinnerDuty"("inhabitantId");

-- CreateIndex
CREATE INDEX "DutyHistory_dinnerDutyId_idx" ON "DutyHistory"("dinnerDutyId");

-- CreateIndex
CREATE INDEX "DutyHistory_performedByUserId_idx" ON "DutyHistory"("performedByUserId");

-- CreateIndex
CREATE INDEX "DutyHistory_inhabitantId_idx" ON "DutyHistory"("inhabitantId");

-- CreateIndex
CREATE INDEX "DutyHistory_dinnerEventId_action_idx" ON "DutyHistory"("dinnerEventId", "action");

-- CreateIndex
CREATE INDEX "DutyHistory_seasonId_idx" ON "DutyHistory"("seasonId");

-- CreateIndex
CREATE INDEX "DutyHistory_timestamp_idx" ON "DutyHistory"("timestamp");

-- CreateIndex
CREATE INDEX "DutyHistory_swapGroupId_idx" ON "DutyHistory"("swapGroupId");

-- CreateIndex
CREATE INDEX "TicketWaitlist_dinnerEventId_createdAt_idx" ON "TicketWaitlist"("dinnerEventId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketWaitlist_inhabitantId_idx" ON "TicketWaitlist"("inhabitantId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketWaitlist_dinnerEventId_inhabitantId_key" ON "TicketWaitlist"("dinnerEventId", "inhabitantId") WHERE "isGuestTicket" = false;

-- CreateIndex
CREATE INDEX "Expense_dinnerEventId_idx" ON "Expense"("dinnerEventId");

-- CreateIndex
CREATE INDEX "Expense_paidByUserId_idx" ON "Expense"("paidByUserId");

-- CreateIndex
CREATE INDEX "Expense_type_idx" ON "Expense"("type");

-- CreateIndex
CREATE INDEX "Expense_createdAt_idx" ON "Expense"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_inhabitantId_dinnerEventId_key" ON "Order"("inhabitantId", "dinnerEventId") WHERE "isGuestTicket" = false;

-- A dinner's grocery total becomes its REGULAR expense, paid by the kitchen (SYSTEM snapshot); convergent: one row per dinner
INSERT INTO "Expense" ("type", "dinnerEventId", "paidByUserId", "userSnapshot", "amount", "description", "createdAt", "updatedAt")
SELECT 'REGULAR', d."id", NULL, '{"id":null,"email":"SYSTEM"}', d."totalCost", 'Indkøb', strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now'), strftime('%Y-%m-%dT%H:%M:%f+00:00', 'now')
FROM "DinnerEvent" d
WHERE d."totalCost" > 0
  AND NOT EXISTS (SELECT 1 FROM "Expense" e WHERE e."dinnerEventId" = d."id" AND e."type" = 'REGULAR');
