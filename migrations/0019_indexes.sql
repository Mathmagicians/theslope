-- CreateIndex
CREATE INDEX "CookingTeam_seasonId_idx" ON "CookingTeam"("seasonId");

-- CreateIndex
CREATE INDEX "DinnerEvent_cookingTeamId_idx" ON "DinnerEvent"("cookingTeamId");

-- CreateIndex
CREATE INDEX "OrderHistory_dinnerEventId_idx" ON "OrderHistory"("dinnerEventId");

-- CreateIndex
CREATE INDEX "TicketPrice_seasonId_idx" ON "TicketPrice"("seasonId");
