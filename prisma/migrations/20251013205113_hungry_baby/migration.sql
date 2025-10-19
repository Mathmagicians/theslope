-- AlterTable
ALTER TABLE "CookingTeam" ADD COLUMN "affinity" TEXT;

-- AlterTable
ALTER TABLE "TicketPrice" ADD COLUMN "maximumAgeLimit" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CookingTeamAssignment" (
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
INSERT INTO "new_CookingTeamAssignment" ("cookingTeamId", "createdAt", "id", "inhabitantId", "role", "updatedAt") SELECT "cookingTeamId", "createdAt", "id", "inhabitantId", "role", "updatedAt" FROM "CookingTeamAssignment";
DROP TABLE "CookingTeamAssignment";
ALTER TABLE "new_CookingTeamAssignment" RENAME TO "CookingTeamAssignment";
CREATE TABLE "new_Season" (
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
INSERT INTO "new_Season" ("cookingDays", "diningModeIsEditableMinutesBefore", "holidays", "id", "isActive", "seasonDates", "shortName", "ticketIsCancellableDaysBefore") SELECT "cookingDays", "diningModeIsEditableMinutesBefore", "holidays", "id", "isActive", "seasonDates", "shortName", "ticketIsCancellableDaysBefore" FROM "Season";
DROP TABLE "Season";
ALTER TABLE "new_Season" RENAME TO "Season";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
