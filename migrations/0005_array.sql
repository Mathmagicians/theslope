
/*
  Warnings:

  - You are about to drop the column `systemRole` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "systemRoles" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Copy data and convert systemRole to systemRoles JSON array
INSERT INTO "new_User" ("createdAt", "email", "id", "passwordHash", "phone", "updatedAt", "systemRoles")
SELECT
  "createdAt",
  "email",
  "id",
  "passwordHash",
  "phone",
  "updatedAt",
  CASE
    WHEN "systemRole" = 'ADMIN' THEN '["ADMIN"]'
    WHEN "systemRole" = 'ALLERGYMANAGER' THEN '["ALLERGYMANAGER"]'
    ELSE '[]'  -- USER or any other value becomes empty array
  END as "systemRoles"
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
