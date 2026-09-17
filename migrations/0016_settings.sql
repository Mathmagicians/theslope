-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedByUserId" INTEGER,
    CONSTRAINT "Setting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable (written by hand: Prisma emits a table rebuild for a required column, and on D1 DROP TABLE fires the children's ON DELETE actions)
ALTER TABLE "User" ADD COLUMN "appearance" TEXT NOT NULL DEFAULT '{"palette":"default","textScale":"normal"}';
