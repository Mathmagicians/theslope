import {describe, expect, it} from 'vitest'
import {readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

/**
 * D1 runs a migration inside a transaction where `PRAGMA foreign_keys=OFF` is a no-op, so a table rebuild
 * (Prisma's "RedefineTables": copy, DROP TABLE, rename) fires every child's ON DELETE action — 0015 as generated
 * nulled every Inhabitant.userId, Order.bookedByUserId, OrderHistory.performedByUserId and Invoice.billingPeriodSummaryId
 * on local and dev (2026-09-17). A required column is added with ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT instead.
 * Migrations up to 0014 predate the rule and stay as applied.
 */
const MIGRATIONS_DIR = join(process.cwd(), 'migrations')
const FIRST_GUARDED = 15

const guardedMigrations = readdirSync(MIGRATIONS_DIR)
    .filter(name => /^\d{4}_.*\.sql$/.test(name) && Number(name.slice(0, 4)) >= FIRST_GUARDED)
    .sort()

describe('D1 migrations', () => {
    it('has at least one guarded migration to check', () => {
        expect(guardedMigrations.length).toBeGreaterThan(0)
    })

    it.each(guardedMigrations)('%s adds columns with ALTER TABLE and drops no table (D1 fires ON DELETE actions on DROP TABLE)', (name) => {
        const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
        const offending = sql.split('\n').map((line, index) => ({line, number: index + 1}))
            .filter(({line}) => /^\s*(DROP TABLE|PRAGMA foreign_keys\s*=\s*OFF|-- RedefineTables)/i.test(line))
        expect(offending.map(({number, line}) => `${name}:${number}: ${line}`)).toEqual([])
    })
})
