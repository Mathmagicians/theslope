# 0.9.2 features

**Status:** Proposed | **Date:** 2026-10-16 | **Builds on:** release 0.9 (`this-pr/release-0.9.0.md` § One booking path, end to end)

| Feature | What | Status |
|---|---|---|
| Ticket price portions | A season's ticket price carries the portions its tickets weigh | proposed |
| Billing import in the export format | The billing import reads the CSV the billing export writes | proposed |

## Ticket price portions

### Problem

Release 0.9 fills `TicketPrice.portions` on read (ADR-010 rule 7): `useTicket().withPortions` gives a price row the
portions of the config's default price with its type and price, else of its type's first default price. A season price
an admin sets away from the defaults weighs as its type's first default price, so a hungry baby at another price weighs
0 instead of a quarter.

### Solution

`TicketPrice` stores `portions`. A new season takes each price's portions from the config's default ticket prices, the
migration fills the existing rows from the same defaults, and the reads return the stored value in place of
`withPortions`. The config's default prices keep their portions as the seed for a new season.

### TDD

- `useTicket` spec: `withPortions` gives way to the stored value.
- `PUT /api/admin/season` API spec: the created prices carry the default portions.
- The migration's backfill: each existing price gets the portions of the default price with its type and price, else
  the first default price of its type.

### Affected areas

`prisma/schema.prisma` (`TicketPrice.portions`), `useTicketPriceValidation`, `useSeason` (default season prices),
`useTicket.portionsOf` and `withPortions`, the reads that fill a price row (`prismaRepository` season reads,
`financesRepository` order detail and dinner tickets), the season form's price rows, one migration through
`.claude/skills/prisma/SKILL.md` with the model signed off first.

## Billing import in the export format

### Problem

`POST /api/admin/billing/import` reads the framelding pivot table and books every ticket of a household on its first
inhabitant as a regular order. A household with two tickets on one dinner gives two regular orders for one inhabitant,
which the Order unique index refuses. The e2e case "GIVEN valid CSV WHEN importing THEN creates orders" is skipped; the
endpoint stays until this feature lands.

### Solution

1. The import reads a CSV as `generateBillingCsv` writes it (`useBillingValidation.ts`), from an upload or from the R2
   billing archive for a period (`server/utils/billingArchive.ts`), so the archive round-trips.
2. One regular order per inhabitant per dinner; tickets beyond the household's inhabitants are guest tickets.
3. Idempotent on re-import: an existing order for the key is left as is (ADR-015).
4. The framelding endpoint, its schemas (`ImportedOrderSchema`, `BillingImportRequestSchema`,
   `BillingImportResponseSchema`), the `generateCSV` / `importOrders` factory helpers and the skipped e2e case leave
   with it; ADR-009 names another operation result type in its example.

### TDD

- Unit: the CSV parser accepts the export's own output; the order mapping yields one regular order per inhabitant and
  guest tickets for the rest.
- E2E: a period's archived CSV imports into a fresh season and a second import creates nothing.

### Affected areas

`server/routes/api/admin/billing/import.post.ts`, `app/composables/useBillingValidation.ts`,
`tests/e2e/testDataFactories/billingFactory.ts`, `tests/e2e/api/serial/local-theslope/billingImport.e2e.spec.ts`,
`docs/adr-compliance-backend.md` (billing rows), `docs/adr.md` (ADR-009 example).
