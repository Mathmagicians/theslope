# 0.9.3 features

**Status:** Proposed | **Date:** 2026-10-16 | **Updated:** 2026-10-25 | **Builds on:** release 0.9 (`../archived/release-0.9.0.md` § One booking path, end to end), release 0.9.2 (`../release-0.9.2/chores-0.9.2.md`)

## Delivered

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|

## In flight

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Ticket price portions | § Ticket price portions | – | specified |
| Billing import in the export format | § Billing import in the export format | – | specified |
| Write-failure dashboard | § Write-failure dashboard | – | discovery |
| Drop `DinnerEvent.totalCost` | § Drop `DinnerEvent.totalCost` | – | specified |
| Order snapshot (B6) | § Order snapshot (B6) | – | specified |
| Ticket allergies on the order | § Ticket allergies on the order | – | discovery |
| Creation audit rows name the household | § Creation audit rows name the household | – | discovery |
| Chef allergen selector | The selector counts a population through the ticket allergies map of § Ticket allergies on the order. | – | discovery |
| Re-login with Face ID (S5) | `../feature-proposal-relogin-faceid.md` | – | discovery |
| Deliveries in the System tab | § Deliveries in the System tab | – | discovery |
| Breakdown alerts | `feature-proposal-breakdown-alerts.md` | – | discovery |
| Duty roster (F5a) | `feature-proposal-duty-roster.md` Phases 1–4 | – | specified |
| Joker and vacancy overviews | `feature-proposal-duty-roster.md` § Joker, § Roster UX | – | specified |
| Roster sign-off and cross-team swap (F5b) | `feature-proposal-duty-roster.md` Phases 4–5 | – | specified |
| Season spending | `feature-proposal-season-spending.md` | – | specified |
| Ad-hoc charges and the spending views | `feature-proposal-adhoc-admin-billing.md` phases 2 to 5 | – | specified |
| Team assignment notifications | `feature-proposal-notification-triggers.md` § Team assignments | – | discovery |
| SMS channel | `feature-proposal-notification-triggers.md` § SMS delivery | – | specified |
| Household and member notifications | `feature-proposal-notification-triggers.md` § Household and member events | – | discovery |
| Zero-portion tickets get a place | § Zero-portion tickets get a place | – | discovery |
| Booking emails flag removed | `SHOULD_SEND_BOOKING_EMAILS_FLAG` leaves `wrangler.toml`, and its reader `shouldSendBookingEmails` and the gate `notifyBooking` leave the code. | – | specified |

§ Drop `DinnerEvent.totalCost`, § Order snapshot (B6) and § Ticket allergies on the order share one migration:
`make d1-create-migration name=release-0-9-3`, the rewrites below in the Prisma source, then
`rm migrations/NNNN_*.sql && make d1-flatten-migrations`. `make d1-verify-<env>` runs before and after the apply on
local (a copy of dev), dev and prod; `tests/component/architecture/migrations.unit.spec.ts` keeps the file free of
`DROP TABLE`.

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

## Zero-portion tickets get a place

### Problem

After the booking deadline a booking buys a released ticket of its ticket type, else joins that type's line on the
waiting list (ADR-016). A ticket of 0 portions, the baby who eats tastes from the parents (`app.config.ts` default
ticket prices), joins the line too, though it takes no portion from the kitchen.

### Solution

A waiting entry of 0 portions gets its place without waiting: the run that ends with the sale of the tickets for sale
to the waiting list also runs the extra-portion assignment (`assignWaitlistPortions`) for the entries of 0 portions, as
when the chef cooks more portions. Each gets a regular order and the waitlist extra portion notification. The portions
are the price row's, stored by § Ticket price portions.

ADR-016 [Unified Booking Through Scaffold], the waiting-list paragraph, gains on implementation:

> A waiting entry of 0 portions takes no portion from the kitchen: every run places it through the extra-portion
> assignment, as when the chef cooks more portions.

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

## Write-failure dashboard

### Problem

D1 runs the chunks of a batch without a transaction (ADR-005). A later chunk that fails leaves the earlier rows without
their companion row: waiting-list entries without their QUEUE history row, orders without their audit row, deliveries
without their Delivery row. The retry one by one counts them unchanged, and the admin learns of them from the logs only.
Writes carry no retries (decided 2026-10-18, `../archived/release-0.9.0.md` § One intent path).

### Solution

A view for the admin that surfaces the partial batches: entries without their history row, orders without their audit
row, deliveries without their row. **OPEN:** the design.

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

1. `ticketType` and `allergyTypeIds` (§ Ticket allergies on the order) join `OrderSnapshotSchema`; the first round of the package settles the backfill shape — the schema
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

## Ticket allergies on the order

### Note - provenance allergies was removed, and live allergies are shown, should be verified and discussed
### Problem

to check: hmmm - not sure it is good to drop the allergyprovenance idea, we do use household provenance

A guest's allergy type ids are chosen in `GuestBookingForm` and leave the client as `allergyTypeIds` on the desired
order (ADR-016), and every creation path drops them before `createOrders`: the scaffold's create transform
(`scaffoldPrebookings.ts`), the waitlist assignment (`waitlistAssignment.ts`) and the billing
import. The orders list reads `provenanceAllergies` from the latest `USER_CLAIMED` audit row (`fetchOrders`), and the
claim snapshot carries no allergies, so the field is empty on every order. The dinner detail resolves a ticket's
allergies from its current inhabitant's profile, so a swapped ticket counts the claimer's allergies; the groceries
were bought for the releasing owner's.

### Solution

Rule signed 2026-10-11. A ticket carries a stored list or follows its holder's live profile:

| Ticket | Allergies | Frozen when |
|---|---|---|
| Own | holder's live profile | never |
| Guest | ids chosen in the form | at booking |
| Swapped | releasing owner's profile ids | at the claim, after the booking deadline; a second swap keeps the first list |

1. The stored list is `allergyTypeIds` in `OrderSnapshotSchema`, kept in the `Order.orderSnapshot` column of § Order
   snapshot (B6): one column, one migration for both (signed 2026-10-11). The names field goes.
2. Creation (`createOrders`) stores a guest ticket's ids; the create schemas and the four callers carry
   `allergyTypeIds` through. The claim (`claimOrder`) selects the releasing inhabitant's allergy rows and stores their
   type ids when the ticket holds none; the claim snapshot records the same ids.
3. The ticket mapper shared by the orders list and the dinner detail emits `allergyTypeIds` on every ticket: the stored
   list when present, the holder's `Allergy` rows otherwise (a subselect in the orders list's raw SQL, the included
   relation on the dinner detail). `provenanceAllergies` goes.
4. `getTicketAllergens` (`useAllergy.ts`) resolves ids in the catalogue; `DinnerTicket` and `DinnerBookingForm` read
   `allergyTypeIds` from the ticket in place of the household profile (release 0.9 § Ticket allergies).

### TDD

- API: `household/scaffold` — a guest order with ids comes back with them, an own ticket with the holder's live ids, a
  profile edit shows on the next read; `admin/order` — a claimed ticket carries the releasing owner's ids, a second
  claim keeps them, the claim snapshot holds them; the scaffold's queue path — an assigned entry keeps its ids;
  `chef/dinner` — the dinner detail's tickets carry `allergyTypeIds`.
- Unit: `getTicketAllergens` by id; `computeAffectedDiners` counts a guest and a swapped ticket; the stored list's
  round trip.
- E2E ui: a guest booked with an allergy on the menu shows the glyph and the type on reopening the form; the chef
  page's allergen line and kitchen stats count one more kuvert.

### Affected

`useBookingValidation.ts`, `useBooking.ts` (snapshot builder, guest grouping), `useAllergy.ts`,
`financesRepository.ts` (create, claim, orders list, dinner detail), `scaffoldPrebookings.ts`,
`waitlistAssignment.ts`, `scaffold.post.ts`, `DinnerTicket.vue`, `DinnerBookingForm.vue`,
`prisma/schema.prisma`, `migrations/`, `docs/adr-compliance-backend.md` (order rows).

## Creation audit rows name the household

### Problem

The order-history route reads the households its creation rows name because the creation audit row carries no
`householdShortname`.

### Solution

`createOrders` writes `householdShortname` into the creation audit row, `readOrderAudit` reads it from the new format
and the legacy shapes, and a convergent backfill fills the existing rows, after which the households read in
`chef/dinner/[id]/order-history.get.ts` goes.

### Affected areas

`server/data/financesRepository.ts`, `app/composables/useBookingValidation.ts`,
`server/routes/api/chef/dinner/[id]/order-history.get.ts`, a D1 migration for the backfill,
`docs/adr-compliance-backend.md` rows.

## Deliveries in the System tab

### Problem

The Delivery rows record every mail the system sends (the billing mails, the booking mails of release 0.9.1), and
`GET /api/admin/sender/delivery` reads them by subject. The admin has no view of them: a mail a member asks about is
traced in the logs.

### Solution

`/admin/system` (`AdminSystem.vue`) shows the deliveries beside the job runs: one row per mail with its time, kind,
subject, version and recipient, newest first. The read takes a period alongside the subjects. **OPEN:** the design.

### TDD

API: the period read. Component: the table on its dataset, its loading and empty states (ADR-018).

### Affected areas

`server/routes/api/admin/sender/delivery.get.ts`, `server/data/financesRepository.ts` (`fetchDeliveries`),
`app/components/admin/AdminSystem.vue`, a store dataset, `docs/adr-compliance-frontend.md` and
`docs/adr-compliance-backend.md` rows.

## Decisions

**2026-10-05** (joker, roster, spending)
- Joker: per-dinner volunteering by any inhabitant; a vacancy surfaces as a "missing" on the dinner; a team-card and a
  big overview (split on teams and on people) for the admin; per-member shift counts (chefkok, fast tjans, joker) in
  the team card; `/chef` is the member planning surface.
- Volunteering writes season membership (`CookingTeamAssignment`) today. The roster replaces it, and the shipped rows
  get a one-time data separation the user reviews and applies before ship.
- CTC drives the roster: the dinner face leads with who comes today (vacancies, swaps, joker status); the season face
  (admin teams) leads with the regular team, jokertjanser, shift counts and a view-only game-plan drill-down; which
  face leads follows the dinner context. The Flytter badge leaves `/chef`.
- A template row is one seat: capacity is modelled with rows and the counts in the UI are derived. Slot times and
  tasks are templates, edited in the team's template editor.
- Sign-off is derived: all seats filled → auto-signed (system actor); short → "MANGLER n" and the chef's
  [Godkend alligevel] (chef actor). Members self-serve their own rows; the duty-level admin bypass is parked.
- Basisvarer expenses are dinner-less and track against the køkkenbidrag pool. The Budget pane's [Se sæsontrend]
  button unfolds the season view.

**2026-10-06**
- Admin economy Forbrug: month rows with dinner drill-down and a scope switcher (alle chefkokke, én chefkok,
  Madbudget); the basisvarer entry is admin-only, in that section. `SeasonBudgetOverview` takes
  `grouping: day | month`.
- Vacancy big overview: per team, chronological, the origin on each hole (the joker note or who released). Calendar
  gap markers are DS tokens, ink-coloured: a chef hat for a missing chef, a joker hat for an unfilled joker seat, a dot
  for an unfilled regular seat.
- S5 re-login is parked: the comparison by platform, the hypotheses and the spike findings live in
  `../feature-proposal-relogin-faceid.md`.

**2026-10-08**
- The framelding billing import books every ticket on the first inhabitant and answers 409; its e2e test is skipped
  until § Billing import in the export format.

**2026-10-26**
- A waiting entry of 0 portions gets its place through the extra-portion assignment that ends every run (§ Zero-portion
  tickets get a place); the ADR-016 line lands with the implementation.
