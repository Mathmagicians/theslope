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
| Booking emails flag removed | `SHOULD_SEND_BOOKING_EMAILS_FLAG` leaves `wrangler.toml`, and its reader `shouldSendBookingEmails` and the gate `notifyBooking` leave the code. | – | specified |
| The dinner page keeps its form while the season refreshes | § The dinner page keeps its form while the season refreshes | – | discovery |
| Raw utility classes | § Raw utility classes | – | specified |
| Unit formatting | § Unit formatting | – | specified |
| Spread row primitive | § Spread row primitive | – | specified |
| Chef card atoms | § Chef card atoms | – | specified |
| Server payload of the shared stores | § Server payload of the shared stores | – | specified |
| Dates | § Dates | – | specified |
| Hand-written types in the design system | § Hand-written types in the design system | – | specified |
| AdminTeams loading row | § AdminTeams loading row | – | discovery |
| Dinner page remounts on claim | § Dinner page remounts on claim | – | specified |
| DRY improvements | § DRY improvements | – | specified |

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

## The dinner page keeps its form while the season refreshes

### Problem

On /dinner past the deadline, saving a guest that queues refreshes the season. While it refreshes, the season's
dataset reads not initialized (`useApiHandler.ts:273`), the page shows its loader (`pages/dinner/index.vue:142`) and the
booking form mounts again.

### Solution

OPEN: a) the store stays ready while it refreshes, `isInitialized` reading loaded data without an error (ADR-007
compliance 3); b) the page shows its loader until the first load only.

### Browser check

`/dinner?date=<past deadline>`: open Tilføj gæst, save a guest that queues. The add-guest row stays open, the queued
guest's card stays closed, and the form stays in place.

### Affected areas

`app/composables/useApiHandler.ts`, `app/pages/dinner/index.vue`, `app/components/dinner/DinnerBookingForm.vue`.

## Raw utility classes

### Problem

The architecture rule fails a raw palette shade only, so about 560 raw utilities sit in the static `class`
attributes of sixty-three `.vue` files (`AdminEconomy.vue` 68, `UserProfileCard.vue` 52, `UserPreferencesCard.vue` 50,
`HouseholdSettings.vue` 46, `AllergyTypeCard.vue` 43, the public billing page 34, `HelpButton.vue` 32,
`HouseholdEconomy.vue` 30, `AllergyDetailPanel.vue` 30, …). Per-site `:ui` patches and literal props sit beside them:
`TicketPriceListEditor.vue` (three), `HelpButton.vue` (`variant="outline"` on a `UCard`), the page tabs of
`pages/admin/[tab].vue`, `pages/household/[shortname]/[tab].vue` and `PageHeader.vue` (`label: 'hidden md:inline'`),
`HouseholdListItem.vue:19` (a raw row), and the avatar groups of `UserListItem.vue:152`, `CookingTeamCard.vue:339` and
`HouseholdListItem.vue:20` (`:ui="{base: avatar.compact.fit}"`).

Motion utilities are the same class, 14 hits in 8 files: `animate-spin` beside `MOTION_SPIN` in `OrderHistoryDisplay.vue:59` and
`AdminEconomy.vue:541`; hover interactions in `UserListItem.vue:158,199` (`hover:scale-110 hover:rotate-3 transition-transform duration-200`),
`CountdownTimer.vue:122` (`hover:ring-2 … transition-all`), `ChefDinnerCard.vue:96` (`transition-shadow duration-200 hover:shadow-lg`),
`UserProfileCard.vue:253` (`transition-colors` with a hover colour inside); the six `rotate-*` tilts by error code in
`ViewError.vue:20-35`; `Ticker.vue:19` returning `animate-marquee` from a function. Inside the design system, `pulse`, `dot`
and the power-mode fireworks carry `animate-pulse` without `motion-reduce`.

### Solution

A `COMPONENTS.<surface>` token per file, swept file by file, the touched files first (the `ds-deviations-fixed-on-sight`
rule); `COMPONENTS.pageTabs` and `COMPONENTS.pageCard` for the pages; `COMPONENTS.avatar.regular/compact` carry their
`ui` so a group spreads the token. A `MOTION` group holds the primitives (spin, the two hover kinds, the colour fade,
the marquee) and `COMPONENTS.viewError.tilt` maps the error code to its turn; one token per distinct original value,
named by its site, proof a before/after class-set comparison per template; a raw class met in a touched file is fixed
on sight.

**OPEN** — `motion-reduce:animate-none` on the infinite animations the design system still runs without it (pulse,
marquee, fireworks): a rendered-class change, decided with the sweep.

### Affected

The sixty-one components, `app/composables/useTheSlopeDesignSystem.ts`.

## Unit formatting

### Problem

Six sites append `kuv.` or `kuverter` to `formatPortions(x)` by hand (`KitchenPreparation.vue` two,
`AllergenMultiSelector.vue`, `AllergyOverviewLine.vue`, `DinnerBudget.vue`, `TicketChanges.vue`); thirty-six sites in
twelve files append ` kr` to `formatPrice(x)`, `VatAmount.vue` among them.

### Solution

`formatKuverter(portions, long?)` in `app/utils/utils.ts` and `formatKr(ore)` in `useTicket`, swept at every site in one
change.

### Affected

The twelve files with a ` kr` site (`AdminEconomy.vue` 14, `DinnerBudget.vue` 5, `HouseholdEconomy.vue` 5, the
public billing page 3, `ControlBadge.vue` 2, `CostLine.vue`, `DinnerBookingForm.vue`, `DinnerTicket.vue`, `ChefMenuCard.vue`,
`TicketChanges.vue`, `BookingGridView.vue`, `VatAmount.vue`), the five with a portions site, `app/utils/utils.ts`, `app/composables/useTicket.ts`, the utils unit spec.

## Spread row primitive

### Problem

Fourteen design-system tokens spell a "something left, something right" row (`flex items-center justify-between …`). Six of
them are the same base with nothing or a trifle added: `collapsible.headerRow` and `chefCalendar.header` (one constant,
`COLLAPSIBLE_HEADER_ROW`), `adminTeams.detailHeaderRow`, `chefCalendar.agendaHeader`, `householdBookings.panelHeader`,
`teamCard.jokerAddRow` and `dinnerBudget.boxLine`. The spending tables (`CookingRoundSpending.vue`) head themselves with a
row bound to the budget box's `boxLine` and the amount's `vatAmount.unitHeader`, an alias of `TYPOGRAPHY.finePrintMuted`;
the editor's folded row (`ExpenseLines.vue`) binds the same alias. The design system holds one-off variants where it
holds a layout.

### Solution

A spread row is a layout, so `LAYOUTS` gets the primitive beside its responsive cousin:

```ts
cardHeaderRow: 'flex flex-col md:flex-row md:items-center md:justify-between gap-2',   // as today
spreadRow: 'flex items-center justify-between gap-2'
```

Tokens that add a value compose it and keep their names: `boxLine` (nowrap, small text), `jokerAddRow` (gap, padding),
`panelHeader` (margin). Tokens that add nothing go, and their sites bind `LAYOUTS.spreadRow`: `collapsible.headerRow`
(the Budget pane, Se billetændringer), `chefCalendar.header` and `agendaHeader` (the chef calendar), `adminTeams.detailHeaderRow`.

A spending table's heading is the table's caption: the `UTable` `#caption` slot holds the spread row with the heading
and the unit words, `table.ui` gains `caption: 'text-left pb-2'` so the caption shows (Nuxt UI hides it by default), and
every table on `table.ui` can carry one. The unit words bind `TYPOGRAPHY.finePrintMuted`; `vatAmount.unitHeader` goes.

Value-preserving: every site renders the classes it rendered before; the spending tables' heading sits in a `<caption>`
element, read with its table by a screen reader.

### TDD

The architecture suite (`designSystemUsage`, contrast) stays green; the component specs of the chef tables, the editor,
the chef calendar and the admin teams assert the heading test ids and behaviour as today. No e2e slot: a rendering-only
package.

### Affected

`app/composables/useTheSlopeDesignSystem.ts` (`LAYOUTS.spreadRow`, `table.ui.caption`, the composed and deleted tokens),
`app/components/chef/DinnerBudget.vue`, `TicketChanges.vue`, `CookingRoundSpending.vue`, `app/components/shared/ExpenseLines.vue`,
`app/components/calendar/ChefCalendarDisplay.vue`, `app/components/admin/AdminTeams.vue`, `docs/ui.md` (the spread row
under Component layouts, the caption under Tables).

## Chef card atoms

### Problem

`ChefMenuCard.vue` and `ExpenseLines.vue` each render the card section shell (`cardSection.row/label/glyph/line`, the
secondary edit action, `cardSection.editor/editorHead/editorTitle`, `LAYOUTS.formButtonRow`). The total rows of
`ExpenseLines.vue`, `CookingRoundSpending.vue` and `DinnerBudget.vue` spell the same `<tr>` with a label cell and a
`VatAmount` cell twelve times. The unit words "ex / inkl. moms" are a literal at five template sites (`DinnerBudget.vue` two,
`CookingRoundSpending.vue`, `ExpenseLines.vue` two, one a column header) on three tokens of one value
(`dinnerBudget.boxUnit`, `vatAmount.unitHeader`, `expenseLines.alternative`). `TicketChanges.vue` repeats its chip loop twice, and the
design system spells `ticket.face.normal/released/claimed` and `stateIcon` as triplets that differ in one accent.

### Solution

A `CardSection` atom (props: glyph, title, edit label, editing; slots: line, editor, actions) renders the shell for both
cards. An `AmountTotalRow` atom (label, gross, balance, pending, colspan) renders every total row; `ExpenseLines`
iterates `[{label, figures}]`. One constant holds the unit words and one `TYPOGRAPHY` token styles them; the other two tokens go. One `#chips` fragment in
`TicketChanges`. The ticket face is a base plus an accent map keyed by ticket state.

### Affected

`app/components/chef/ChefMenuCard.vue`, `DinnerBudget.vue`, `TicketChanges.vue`, `CookingRoundSpending.vue`,
`app/components/shared/ExpenseLines.vue`, `app/composables/useTheSlopeDesignSystem.ts`, their component specs.

## Server payload of the shared stores

### Problem

Nuxt reports the server payload per page (`NUXT_E8006`, above 100 kB). A store that several pages share requests
every ungated dataset it holds on init, and every page that opens the store pays for all of them. The member pages
(`/dinner`, `/chef`, `/household/[shortname]/*`) carry datasets one admin tab reads: `users`, `allergyManagers` and
`my-teams` in the users store (`app/stores/users.ts`), opened by the dinner page and the profile card for a write
only; the households list with every inhabitant's preferences; the dinner Detail's tickets, each carrying the parent
dinner again. The economy datasets are gated in release 0.9 (`loadBillingOverview`, ADR-007 rule 9).

### Solution

1. A dataset one tab or page reads is gated on the setter that page flips at setup (ADR-007 rule 9,
   `loadHouseholdBilling`): `users` and `allergyManagers` behind `loadUsers()` and `loadAllergyManagers()`, flipped by
   `AdminUsers` and `AllergyManagersList`; `my-teams` behind the existing `loadMyTeams()`, flipped by the chef page.
2. The tickets on a dinner Detail take the shape their readers render (the grid, the kitchen box, the allergen
   overview): the order's scalars, the inhabitant with allergies, the ticket price. The parent dinner is the Detail
   itself.
3. `HouseholdDisplay` carries what its readers render (`households.ts`, the household pickers, `CookingTeamCard`);
   the fields only the household card edits ride on the household Detail.
4. The payload line for `/chef`, `/household/[shortname]/bookings` and `/dinner` stays under 100 kB on a copy of dev.

### TDD

- Store specs: a gated row per dataset in `users.nuxt.spec.ts` (idle until the setter, fetched after), as
  `bookings.nuxt.spec.ts` § gated reads.
- Dinner Detail: the API spec asserts the ticket shape; the component specs of the grid, the kitchen box and the
  allergen overview pass on it.
- E2E: the dev log shows no `NUXT_E8006` for the three pages above.

### Affected

`app/stores/users.ts`, `app/stores/households.ts`, `app/components/admin/AdminUsers.vue`,
`app/components/allergy/AllergyManagersList.vue`, `app/pages/chef/index.vue`,
`app/composables/useBookingValidation.ts` (`DinnerEventDetailSchema.tickets`), `app/composables/useHouseholdValidation.ts`
(`HouseholdDisplaySchema`), `server/data/prismaRepository.ts` (the dinner Detail and household index includes),
`tests/component/stores/*.nuxt.spec.ts`, `docs/adr-compliance-frontend.md` (store rows).

## Dates

Moved from release 0.9.1 on 2026-10-28, where 542b274 holds the first part (ADR-017 compliance 8).

### Problem

- `CountdownTimer.vue:142` writes the hour by hand (`padStart`); `useBilling.ts:169` reads the day of the month.
- 19 files in `app/` and `server/` import `date-fns` directly.
- The specs build their dates by hand: 64 calls to `getDate`, `setDate` or `setHours`.
- `formatDate` takes a pattern string (`app/utils/date.ts:50`); the masks stand in `DATE_SETTINGS`
  (`date.ts:15-22`), and 10 calls pass a pattern of their own (`date.ts:244`, `:253`, `:262`, `:271`,
  `useBookingUi.ts:586`, `BookingGridView.vue:782`, `:783`, `AdminEconomy.vue:717`, `pages/admin/allergies/pdf.vue:22`,
  `pages/public/billing/[token].vue:88`).
- A dinner date is stored at the midnight of the clock that wrote it: the workers and the season import write UTC
  midnight, a Copenhagen machine 22:00Z of the day before.
- `dinnerEventFactory.ts:21` and `seasonFactory.ts:49` compute their dates when the file loads.

### Solution

Every date operation goes through the season helpers and `app/utils/date.ts`; `formatDate` takes a named format; the
repository writes a dinner date as the UTC midnight of its calendar day, in one serializer next to the season one;
a factory computes its dates per call.

## Hand-written types in the design system

### Problem

`useTheSlopeDesignSystem.ts` still spells types by hand: `ResidencyAlertKind` extracts a hand-written union of alert
kinds, `RESIDENCY_CONFIG` declares an inline shape naming the domain fields `'movedInDate' | 'moveOutDate'`, and
`AlertUi` / `AlertKindConfig` restate Nuxt UI's alert props. The sentences of a closed dinner's supply live in two
homes: `DEADLINE_LABELS.BOOKING_CLOSED.availableText` in `useBooking.ts` and `SUPPLY_WORDS` in `useBookingUi.ts`; the
"ledig / ledige" plural rule is written in `createBookingBadge` and in `GuestBookingForm.vue`.

### Solution

A key type derives from its token (`keyof typeof`), a domain field name from the validation composable's schema
(`HouseholdSchema.keyof()`), a Nuxt UI shape from the library's prop types (`AlertProps`). The supply sentences and
the plural rule live once, in `useBookingUi`, and both badges and the guest form read them.

### Affected

`app/composables/useTheSlopeDesignSystem.ts`, `app/composables/useBookingUi.ts`, `app/composables/useBooking.ts`
(`DEADLINE_LABELS`), `app/components/booking/GuestBookingForm.vue`, their specs.

## AdminTeams loading row

Moved from release 0.9.1 on 2026-10-28; not designed. After a season switch the table shows the previous season's teams under the
loading bar; with the loading row, a team save's re-read closes the team detail docked under its row on a phone.
Where: `app/components/admin/AdminTeams.vue:396`, ADR-018 § Table loading. **OPEN:** the loading row with the docked
detail closing, or a docked detail that survives the re-read.

## Dinner page remounts on claim

Moved from release 0.9.1 on 2026-10-28; not built.

### Problem

A refresh of a dataset sets it pending, so its store reads not ready and the page swaps to the loader. Claiming a role
on the dinner page (`assignRoleToDinner` in `app/stores/plan.ts` awaits `refreshSelectedSeason()`) and saving a
preference on the household page both remount the page.

### Solution

The API handler keeps a dataset initialized while it refreshes the url it answered, through a new `isRefreshing` flag.
The loader shows on the first load and on a new selection; a refresh keeps the mounted page.

**OPEN:** ADR-007 compliance 3, proposed: "`isInitialized` MUST check data exists (not just status='success'); a refresh
of the url the dataset answered keeps it true and sets `isRefreshing`, so a store's loader shows on the first load and
on a new selection, never on a refresh".

### TDD

`plan.nuxt`: a refresh after initialization keeps `isPlanStoreReady` true. `Chef.e2e` or `Dinner.e2e`: claiming a role
keeps the page mounted (the calendar keeps its open state, no loader).

### Affected

`app/composables/useApiHandler.ts`, `app/stores/plan.ts`, `app/pages/dinner/index.vue`, the household page.

Related: § AdminTeams loading row, the season-loading spinners on admin planning, household bookings and admin teams on
a refresh; § The dinner page keeps its form while the season refreshes, the same cause.

## DRY improvements

Moved from release 0.9.1 on 2026-10-28; not built.

### Route and composable leftovers

#### Problem

Six routes still spell a coerced id in a query schema (`order/index.get.ts`, `admin/dinner-event/index.get.ts`,
`admin/team/index.get.ts`, `household/allergy/index.get.ts`, `billing/index.get.ts`, `admin/household/inhabitants/[id].post.ts`
`seasonId`) beside `RouteIdSchema`. `useQueryParam.ts` repeats the normalize-or-default block three times. 
`app/stores/users.ts` exposes no `isEmpty` and `isStoreReady` (ADR-007 r2); `usePermissions.ts` and
`useUserRoles.ts` import `SystemRoleSchema` from the generated layer where ADR-001 routes it through `useCoreValidation`.
`chef/dinner/[id]/order-history.get.ts`, `expenses/index.get.ts` and `expenses/[expenseId].delete.ts` log no success line
(ADR-004).

#### Solution

`RouteIdSchema` / `RouteIdSchema.optional()` in the six query schemas; one `fallback(invalid)` in `useQueryParam`.
The users store gains the two flags with a case each; the two composables import the enum from `useCoreValidation`;
the three chef routes log one `console.info` on success.

#### Affected

The six query routes, the three chef routes, `app/composables/useQueryParam.ts`, `usePermissions.ts`, `useUserRoles.ts`,
`app/stores/users.ts` and its spec, `docs/adr-compliance-backend.md` rows.

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
