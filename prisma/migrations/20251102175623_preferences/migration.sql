/*
  Warnings:

  - You are about to drop the `DinnerPreference` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Allergy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Inhabitant" ADD COLUMN "dinnerPreferences" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DinnerPreference";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Allergy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inhabitantId" INTEGER NOT NULL,
    "inhabitantComment" TEXT,
    "allergyTypeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Allergy_inhabitantId_fkey" FOREIGN KEY ("inhabitantId") REFERENCES "Inhabitant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Allergy_allergyTypeId_fkey" FOREIGN KEY ("allergyTypeId") REFERENCES "AllergyType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Allergy" ("allergyTypeId", "id", "inhabitantId") SELECT "allergyTypeId", "id", "inhabitantId" FROM "Allergy";
DROP TABLE "Allergy";
ALTER TABLE "new_Allergy" RENAME TO "Allergy";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
