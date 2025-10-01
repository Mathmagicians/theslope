/*
  Warnings:

  - Added the required column `updatedAt` to the `CookingTeamAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CookingTeamAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cookingTeamId" INTEGER NOT NULL,
    "inhabitantId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CookingTeamAssignment_cookingTeamId_fkey" FOREIGN KEY ("cookingTeamId") REFERENCES "CookingTeam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CookingTeamAssignment_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CookingTeamAssignment" ("cookingTeamId", "id", "inhabitantId", "role") SELECT "cookingTeamId", "id", "inhabitantId", "role" FROM "CookingTeamAssignment";
DROP TABLE "CookingTeamAssignment";
ALTER TABLE "new_CookingTeamAssignment" RENAME TO "CookingTeamAssignment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
