# 0.9.1 chores

**Status:** Next release | **Date:** 2026-10-08 | **Builds on:** release 0.9 (`this-pr/release-0.9.0.md` § Prisma bundle)

The two schema chores share one migration: `make d1-create-migration name=chores-0-9-1`, the rewrites below in the Prisma
source, then `rm migrations/NNNN_*.sql && make d1-flatten-migrations`. `make d1-verify-<env>` runs before and after
the apply on local (a copy of dev), dev and prod; `tests/component/architecture/migrations.unit.spec.ts` keeps the
file free of `DROP TABLE`.

## Drop `DinnerEvent.totalCost`

### Problem

Release 0.9 moves a dinner's grocery cost into `Expense` rows and computes `totalCost` from them. The column stays
in the schema, marked `/// @deprecated`, so the 0.9 migration is additive and the code running during the migration
keeps working.

### Solution

Prisma emits a table rebuild for the drop and `DinnerEvent` has children (`Order`, `DinnerDuty`, `TicketWaitlist`,
`DinnerEventAllergen`, `Expense`) whose cascades a rebuild's `DROP TABLE` fires on D1; the block is rewritten in the
Prisma source to `ALTER TABLE "DinnerEvent" DROP COLUMN "totalCost"` (SQLite ≥ 3.35; plain, unindexed column). The
field and its `@deprecated` tag leave the schema; the generated client no longer carries it.

### Preconditions

- Every environment runs the release in which `totalCost` is computed from `Expense` rows and no code writes the
  column (`npm run ts` fails on any remaining writer once the field is gone).
- The 0.9 migration's mapping of existing `totalCost` values to `Expense` rows has run on local, dev and prod.

### TDD

- `make d1-verify-<env>`: child-without-parent counts unchanged after the apply.
- Existing suites green with the field removed from the dinner schemas and fixtures.

### Affected

`prisma/schema.prisma`, `prisma/generated/*`, `migrations/`, the dinner schemas and fixtures that still name
`totalCost`, `docs/adr-compliance-backend.md` (dinner-event rows).

## Order snapshot (B6)

### Problem

Kitchen statistics count 0 portions for an order whose `ticketPriceId` is null: `ticketType` is read through the
`ticketPrice` relation, and the relation is gone once a ticket price row is deleted (`onDelete: SetNull`). Every
affected order sits CLOSED on a past dinner and matches exactly one ticket price by season and `priceAtBooking`
(checked 2026-10-08).

### Solution

1. `ticketType` joins `OrderSnapshotSchema`; the first round of the package settles the backfill shape — the schema
   has ten required fields, two of them formatted in TypeScript (`inhabitantNameWithInitials`, `householdShortname`),
   so the backfill is either a slimmer snapshot with optional provenance fields or a TypeScript job.
2. `Order.orderSnapshot String?` — `ALTER TABLE "Order" ADD COLUMN "orderSnapshot" TEXT`, taken as Prisma emits it.
3. Order creation (`financesRepository.ts`, `scaffoldPrebookings.ts`) captures the snapshot with `ticketType` from
   the ticket price, as `Transaction.orderSnapshot` does.
4. Portion calculation (`useOrder.ts`) reads `ticketType` from the relation, then from the snapshot.
5. Backfill, convergent: orders with `ticketPriceId` null and no snapshot get the `ticketType` of the season's ticket
   price whose `price` equals `priceAtBooking`.

### TDD

- Unit: portion calculation with the relation null and a snapshot present; the snapshot captured on create carries
  `ticketType`.
- E2E: kitchen statistics on a dinner whose ticket price row is deleted after booking.

### Affected

`KitchenPreparation.vue`, `useOrder.ts`, `useBookingValidation.ts`, `financesRepository.ts`,
`scaffoldPrebookings.ts`, `prisma/schema.prisma`, `prisma/generated/*`, `migrations/`,
`docs/adr-compliance-backend.md` (order rows).

## Billing import in the export format

### Problem

`POST /api/admin/billing/import` reads the framelding pivot table and books every ticket of a household on its first
inhabitant as a regular order. A household with two tickets on one dinner gives two regular orders for one inhabitant,
which the Order unique index refuses. The e2e test is skipped; the endpoint stays until this chore lands.

### Solution

1. The import reads a CSV as `generateBillingCsv` writes it (`useBillingValidation.ts`), from an upload or from the R2
   billing archive for a period (`server/utils/billingArchive.ts`), so the archive round-trips.
2. One regular order per inhabitant per dinner; tickets beyond the household's inhabitants are guest tickets.
3. Idempotent on re-import: an existing order for the key is left as is (ADR-015).
4. The framelding endpoint, its schemas (`ImportedOrderSchema`, `BillingImportRequestSchema`,
   `BillingImportResponseSchema`) and the `generateCSV` / `importOrders` factory helpers leave with it; ADR-009 names
   another operation result type in its example.

### TDD

- Unit: the CSV parser accepts the export's own output; the order mapping yields one regular order per inhabitant and
  guest tickets for the rest.
- E2E: a period's archived CSV imports into a fresh season and a second import creates nothing.

### Affected

`server/routes/api/admin/billing/import.post.ts`, `app/composables/useBillingValidation.ts`,
`tests/e2e/testDataFactories/billingFactory.ts`, `tests/e2e/api/serial/local-theslope/billingImport.e2e.spec.ts`,
`docs/adr-compliance-backend.md` (billing rows), `docs/adr.md` (ADR-009 example).

## Server payload of the shared stores

### Problem

Nuxt 4.6 reports the server payload per page (`NUXT_E8006`, above 100 kB). On production-sized data `/chef` ships
about 870 kB: `bookings-store-current-period` alone is about 700 kB, read by one component (`AdminEconomy`), and
`households-store-households` and `users` add about 150 kB. A store that several pages share requests every dataset
it holds on init, and every page that opens the store pays for all of them. The existing `loadHouseholdBilling`,
`loadUpcomingOrders` and `loadOrdersForDinners` setters keep a "requested" flag in the store, which is page state.

### Solution

1. Data one component reads lives with that component: a component-local `useAsyncData` over a store method built on
   `apiRequest` (ADR-007, component-local data), as `CookingTeamCard` and `OrderHistoryDisplay` do. The current
   period moves to `AdminEconomy` this way.
2. Seldom-used datasets that stay in a store load lazily through the framework: `immediate: false` with `execute()`
   from the page, or `lazy` where the route must not wait. No requested flags in stores; the existing ones go the same
   way, and ADR-007 rule 9 is rewritten to the framework's trigger.
3. `/chef` reads from `households` and `users` only what the page shows; the heavy shapes stay on the admin pages.
4. The payload line for `/chef`, `/household/[shortname]/bookings` and `/dinner` stays under 100 kB on a copy of dev.

### TDD

- Store specs: the gated-dataset rows become store-method tests; a shared store's init requests no dataset a page
  did not ask for.
- E2E: the dev log shows no `NUXT_E8006` for the three pages above.

### Affected

`app/stores/bookings.ts`, `app/stores/households.ts`, `app/stores/users.ts`, `app/components/admin/AdminEconomy.vue`,
`app/pages/chef/index.vue`, `tests/component/stores/*.nuxt.spec.ts`, `docs/adr.md` (ADR-007 rule 9),
`docs/adr-compliance-frontend.md` (store rows).
