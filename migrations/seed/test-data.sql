PRAGMA defer_foreign_keys=TRUE;

-- Test Household
INSERT OR REPLACE INTO Household (id, heynaboId, pbsId, movedInDate, moveOutDate, name, address)
VALUES (999, 9999, 99999, datetime('now', '-1 year'), NULL, 'Test Household', 'Test Street 42');

-- Test Inhabitants
INSERT OR REPLACE INTO Inhabitant (id, heynaboId, userId, householdId, pictureUrl, name, lastName, birthDate)
VALUES
(9991, 99991, NULL, 999, NULL, 'Anna', 'Testsen', datetime('now', '-35 years')),
(9992, 99992, NULL, 999, NULL, 'Bob', 'Testsen', datetime('now', '-37 years')),
(9993, 99993, NULL, 999, NULL, 'Charlie', 'Testsen', datetime('now', '-10 years'));

-- Peanut Allergies for test inhabitants
-- Anna has peanut allergy with comment
INSERT OR REPLACE INTO Allergy (id, inhabitantId, allergyTypeId, inhabitantComment, createdAt, updatedAt)
VALUES
(9991, 9991, 4, 'Severe reaction - cannot be near peanuts', datetime('now', '-5 days'), datetime('now', '-2 hours')),
(9992, 9992, 4, NULL, datetime('now', '-10 days'), datetime('now', '-10 days')),
(9993, 9993, 1, 'Gluten intolerance', datetime('now', '-3 days'), datetime('now', '-3 days'));

-- Add some other allergies for testing statistics
INSERT OR REPLACE INTO Allergy (id, inhabitantId, allergyTypeId, inhabitantComment, createdAt, updatedAt)
VALUES
(9994, 9991, 2, 'Also lactose intolerant', datetime('now', '-5 days'), datetime('now', '-5 days')),
(9995, 9993, 2, 'No dairy', datetime('now', '-3 days'), datetime('now', '-3 days'));