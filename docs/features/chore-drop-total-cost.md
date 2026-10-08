# Chore: drop `DinnerEvent.totalCost`

**Status:** Next release | **Date:** 2026-10-08 | **Builds on:** release 0.9 (`this-pr/release-0.9.0.md` § Prisma bundle)

## Problem

Release 0.9 moves a dinner's grocery cost into `Expense` rows and computes `totalCost` from them. The column stays
in the schema, marked `/// @deprecated`, so the 0.9 migration is additive and the code running during the migration
keeps working.

## Solution

One migration, `make d1-create-migration name=drop-total-cost`. Prisma emits a table rebuild for the drop and
`DinnerEvent` has children (`Order`, `DinnerDuty`, `TicketWaitlist`, `DinnerEventAllergen`, `Expense`) whose cascades
a rebuild's `DROP TABLE` fires on D1; the block is rewritten in the Prisma source to
`ALTER TABLE "DinnerEvent" DROP COLUMN "totalCost"` (SQLite ≥ 3.35; plain, unindexed column), then
`rm migrations/NNNN_*.sql && make d1-flatten-migrations`. The field and its `@deprecated` tag leave the schema; the
generated client no longer carries it.

## Preconditions

- Every environment runs the release in which `totalCost` is computed from `Expense` rows and no code writes the
  column (`npm run ts` fails on any remaining writer once the field is gone).
- The 0.9 migration's mapping of existing `totalCost` values to `Expense` rows has run on local, dev and prod.

## TDD

- `tests/component/architecture/migrations.unit.spec.ts`: no `DROP TABLE` in the migration.
- `make d1-verify-<env>`: child-without-parent counts unchanged after the apply, on local (a copy of dev), dev, prod.
- Existing suites green with the field removed from the dinner schemas and fixtures.

## Affected

`prisma/schema.prisma`, `prisma/generated/*`, `migrations/`, the dinner schemas and fixtures that still name
`totalCost`, `docs/adr-compliance-backend.md` (dinner-event rows).
