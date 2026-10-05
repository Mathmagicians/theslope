PRAGMA defer_foreign_keys=TRUE;

-- Seed Admin User with ADMIN and ALLERGYMANAGER roles (idempotent - skips if exists)
INSERT OR IGNORE INTO User (id, email, phone, passwordHash, systemRoles, createdAt, updatedAt)
VALUES(1, 'agata@mathmagicians.dk', '12345678', 'removeme', json('["ADMIN","ALLERGYMANAGER"]'), datetime('now'), datetime('now'));

-- Seed Admin Household (idempotent - converges the TheSlope-owned fields on the existing row)
-- Uses REAL heynaboId=2 (Heynabo! location); the Heynabo import maintains name and address
INSERT INTO Household (id, heynaboId, pbsId, movedInDate, name, address)
VALUES(1, 2, 2, datetime('2020-01-01'), 'Heynabo!', 'Heynabo! ')
ON CONFLICT(id) DO UPDATE SET
    heynaboId = excluded.heynaboId,
    pbsId = excluded.pbsId,
    movedInDate = excluded.movedInDate;

-- Seed Admin Inhabitant linking User to Household (idempotent - skips if exists)
-- Uses REAL heynaboId=153 so Heynabo import can upsert (update) this record with real data
INSERT OR IGNORE INTO Inhabitant (id, heynaboId, userId, householdId, name, lastName)
VALUES(1, 153, 1, 1, 'Skraaningen', 'API');

-- Seed Member User without system roles (idempotent - skips if exists)
-- Email MUST match HEY_NABO_EJ_ADMIN_USERNAME environment variable
INSERT OR IGNORE INTO User (id, email, phone, passwordHash, systemRoles, createdAt, updatedAt)
VALUES(2, 'test@mathmagicians.dk', NULL, 'removeme', json('[]'), datetime('now'), datetime('now'));

-- Seed Member Inhabitant in Admin Household (idempotent - skips if exists)
-- Uses REAL heynaboId=231 so Heynabo import can upsert this record
INSERT OR IGNORE INTO Inhabitant (id, heynaboId, userId, householdId, name, lastName)
VALUES(2, 231, 2, 1, 'Test', 'Member');

-- Seed Allergy Types (from allergiliste_062025.pdf)
INSERT OR IGNORE INTO AllergyType (id, name, description, icon)
VALUES
(1, 'Gluten', 'Findes i pasta, pizza, tortilla, pitabrød, rugbrød, tærter, burgerboller og lign. OBS! Almindelig soyasauce indeholder hvede – brug i stedet tamari.', '🌾'),
(2, 'Mælk & Smør', 'Alt med mælk, pga. mælkeproteinet, også smør! Dvs. "laktosefrit" dur ikke – alternativer skal være veganske/plantebaseret.', '🥛'),
(3, 'Nødder (generelt)', 'Allergisk over for nødder generelt. Se specifikke nøddeallergi typer for detaljer.', '🌰'),
(4, 'Jordnødder', 'Allergi mod jordnødder. Kan være alvorlig reaktion.', '🥜'),
(5, 'Cashewnødder', 'Allergi mod cashewnødder, inkl. spor af.', '🌰'),
(6, 'Pistacienødder', 'Allergi mod pistacienødder, inkl. spor af.', '🌰'),
(7, 'Mandler', 'Allergi mod mandler. Ofte ikke et problem hvis de kan fiskes ud af retten.', '🌰'),
(8, 'Hasselnødder', 'Allergi mod hasselnødder.', '🌰'),
(9, 'Æg', 'Allergi mod æg og produkter indeholdende æg.', '🥚'),
(10, 'Soja', 'Allergi mod soja og sojaprodukter.', '🫘'),
(11, 'Æbler', 'Allergi mod æbler. Ofte ikke et problem hvis de kan fiskes ud af retten.', '🍎'),
(12, 'Rå Løg', 'Intolerance over for rå løg. Ofte ikke et problem hvis de kan fiskes ud af retten.', '🧅');
