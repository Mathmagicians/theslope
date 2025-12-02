/*
  Warnings:

  - A unique constraint covering the columns `[shortName]` on the table `Season` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Season_shortName_key" ON "Season"("shortName");
