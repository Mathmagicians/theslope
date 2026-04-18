-- DropIndex
DROP INDEX "Household_heynaboId_key";

-- CreateIndex
CREATE INDEX "Household_heynaboId_idx" ON "Household"("heynaboId");
