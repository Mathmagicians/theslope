-- Service Accounts Maintenance
-- Ensures service account inhabitants don't get scaffolded dinners
-- Usage: make d1-reset-service-accounts-prod (or -dev, -local)
--
-- Service account inhabitants (by heynaboId - stable identifier):
--   - heynaboId 1   → Support (Heynabo! household)
--   - heynaboId 212 → Skraaningen (API'er household)
--
-- Setting dinnerPreferences to all NONE prevents scaffolding from creating orders

UPDATE Inhabitant
SET dinnerPreferences = '{"mandag":"NONE","tirsdag":"NONE","onsdag":"NONE","torsdag":"NONE","fredag":"NONE","lørdag":"NONE","søndag":"NONE"}'
WHERE heynaboId IN (1, 212);
