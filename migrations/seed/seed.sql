PRAGMA defer_foreign_keys=TRUE;
INSERT OR IGNORE INTO User (id, email, phone, passwordHash, systemRole, createdAt, updatedAt)
VALUES(1, 'agata@mathmagicians.dk', '12345678', 'removeme', 'ADMIN', datetime('now'), datetime('now'));
