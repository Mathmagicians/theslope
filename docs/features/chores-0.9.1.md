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

## Ticket allergies on the order

### Note - provenance allergies was removed, and live allergies are shown, should be verified and discussed
### Problem

A guest's allergy type ids are chosen in `GuestBookingForm` and leave the client as `allergyTypeIds` on the desired
order (ADR-016), and every creation path drops them before `createOrders`: the scaffold's create transform
(`scaffoldPrebookings.ts`), the waitlist assignment (`waitlistAssignment.ts`), `PUT /api/order` and the billing
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

## Waitlist: no-seat notice at dinner start

### Problem

A member still in a dinner's queue when the dinner starts hears nothing; the entry is deleted by daily maintenance when
the dinner reaches CONSUMED (`deleteWaitlistForConsumedDinners`).

### Solution

A kind `WAITLIST_NO_SEAT` beside the four waitlist kinds in `server/utils/sender/events/waitlist.ts`, emitted by a
Nitro task `waitlist-close` on an hourly cron for each dinner whose start time has passed and that is not CONSUMED, to
each remaining entry's user; idempotent through the delivery reference (the `Delivery` table has no unique key, so the
service skips an entry whose reference exists). Deletion stays in daily maintenance.

### TDD

- Unit: the sweep's selection (started and not consumed with entries; a consumed dinner skipped; a second run emits nothing).
- Serial API: a dinner past its start with two entries, the task run twice, two deliveries.

### Affected

`server/utils/sender/events/waitlist.ts`, `server/tasks/waitlist-close.ts`, `nuxt.config.ts` (scheduled tasks),
`feature-proposal-notification-triggers.md` (catalog row), `docs/adr-compliance-backend.md`.

## Map.groupBy in the Workers runtime

### Problem

`Map.groupBy` failed in the Workers runtime on 2026-01-20 (cc05ea9, the commit that added `groupBy` to
`app/utils/batchUtils.ts`) although the Workers docs (Runtime APIs, Web standards) state the runtime tracks the V8 of
the current Chrome stable, where the method has shipped since Chrome 117. ADR-013 rule 7 records the finding; the
cause, a compatibility flag or date gating the method, is not named anywhere in our docs.

### Solution

The Cloudflare compatibility-flags page and the workerd changelog name the flag or date that enables the ES2024
grouping methods. With that reference the rule names the flag, the compatibility date moves past it, the helper leaves
with its unit cases, and the call sites in `server/` and the stores use the method. Without it the rule and the helper
stay.

### Affected

`docs/adr.md` ADR-013 rule 7, `app/utils/batchUtils.ts` (`groupBy`), its call sites in `server/` and `app/stores/`.

## Stored dinner dates

### Problem

A dinner date is a `Date` at the midnight of the clock that wrote it: rows written on the workers and by the season
import carry UTC midnight; a row written on a Copenhagen machine carries 22:00Z of the day before. The repository
serializes season ranges (ADR-010) and leaves dinner dates as they arrive; fixtures build dates from local components,
so the specs never hold the stored shape. `app/utils/season.ts` matches a cooking day to a dinner by calendar day
(`isSameDay`), guarded by a unit case with UTC-midnight events in both timezones.

### Solution

The repository writes a dinner date as the UTC midnight of its calendar day, in one serializer next to the season one.
Callers compare dinner dates by calendar day. Fixtures for stored dates use ISO strings; the temporal rule in
`docs/testing.md` names the stored shape. A read of dev and prod confirms the rows carry UTC midnight before the change
ships; no migration.

### TDD

`date.unit`: local midnight in → UTC midnight out, UTC midnight unchanged, the day survives the DST switch.
`useSeason.nuxt`: assignment and reconciliation with events in the stored shape. `season.e2e`: a generated dinner reads
back at UTC midnight.

### Affected

`server/data/prismaRepository.ts`, `server/utils/reconcileDinnerEvents.ts`, `app/utils/date.ts`,
`tests/e2e/testDataFactories/dinnerEventFactory.ts`, `docs/testing.md`.

## Dinner page remounts on claim

### Problem

Claiming or resigning a role on `/dinner` swaps the whole page for the loader and mounts it again: `assignRoleToDinner`
in `app/stores/plan.ts` awaits `refreshSelectedSeason()`, the dataset turns `pending`, `isPlanStoreReady` turns false,
and `app/pages/dinner/index.vue` replaces `<UPage>` with `<Loader>` until the refresh resolves.

### Solution

The page shows the loader on first load only; a refresh keeps the mounted tree and the store exposes a separate
`isRefreshing` flag for inline feedback (ADR-007 status computeds).

### TDD

`plan.nuxt`: a refresh after initialization keeps `isPlanStoreReady` true. `Chef.e2e` or `Dinner.e2e`: claiming a role
keeps the page mounted (the calendar keeps its open state, no loader).

### Affected

`app/stores/plan.ts`, `app/pages/dinner/index.vue`.

## Catch-up amounts

### Problem

A transaction billed into an already-closed period (ADR-015 catch-up: a straggler order transacted after the period's
first run) is linked to the household's existing invoice, but the invoice `amount` stays at its creation value and the
period's stored aggregates stay at the first run's values. The accountant CSV is built from `invoice.amount`
(`useBillingValidation.ts` `generateCsvRow`), so the straggler reaches the CSV as a version bump with unchanged figures;
the public page shows the mismatch as `invoiceSum` ≠ `transactionSum`. In `server/utils/generateBilling.ts`
`processBillingPeriod`, `totalAmount`, `householdCount` and `ticketCount` are written by `createBillingPeriodSummary`
only, an existing summary is reused as is, and households with an existing invoice only get transactions linked.

### Solution

After linking, in the same `processBillingPeriod` call: `addToInvoiceAmount(d1, invoiceId, delta)` for each household
that already had an invoice (delta = the sum of the transactions linked now) and
`addToBillingPeriodTotals(d1, summaryId, {totalAmount, householdCount: newInvoices.length, ticketCount})` for an
existing summary. Both are increments of exactly the transactions linked in this run; a transaction is linked once
(unbilled → invoiced), so a re-run adds nothing (ADR-015). `bumpBillingPeriodVersion` stays; the v2 CSV and the
`BILLING_PERIOD_UPDATED` mail carry the corrected figures. Two repository functions in `financesRepository.ts`
(`prisma.invoice.update` / `prisma.billingPeriodSummary.update` with `increment`).

### TDD

`tests/e2e/api/serial/admin/maintenance.e2e.spec.ts`: after the first billing, transact one more order in the same
period (order → consume → daily maintenance), run billing again → the household's invoice `amount` and the period's
`totalAmount` / `ticketCount` include it, `version` is 2, `invoiceSum` = `transactionSum` on the period detail. The
control sums (`useBilling` `controlInvoices` / `controlTransactions`) already assert equality.

### Affected

`server/utils/generateBilling.ts`, `server/data/financesRepository.ts`, the serial maintenance spec,
`docs/adr-compliance-backend.md` (Admin – Billing row).

## Job schedule module

### Problem

One schedule is written in five places — `wrangler.toml` `[triggers] crons` in the three environment blocks,
`nuxt.config.ts` `nitro.scheduledTasks`, `app.config.ts` `theslope.systemJobs` — and labelled in two:
`useMaintenance` `jobScheduleLabels` and `systemJobs[].description`. The monthly job runs `0 3 18 * *`: the 18th at
03:00 UTC, 05:00 in summer time and 04:00 in winter time; the labels carry the winter clock only ("kl. 02:00",
"kl. 03:00", "kl. 04:00").

### Solution

`app/config/systemJobs.ts`, a plain module (the `notificationTemplates.ts` pattern): per job its cron and its Danish
label with the UTC time and the Copenhagen summer and winter times. `nuxt.config.ts` builds `scheduledTasks` from it,
`app.config.ts` spreads it into `theslope.systemJobs`, `useMaintenance` labels read it. The three `wrangler.toml`
`crons` lists stay per environment block (TOML).

### Mockup

Text only, on the job cards and the job-run table of `/admin/system` — ⏳ awaiting signoff:

```
Månedlig fakturering    D. 18. hver måned kl. 05:00 (sommertid) / 04:00 (vintertid)
```

### TDD

Unit: every `systemJobs` cron is a key of `scheduledTasks` and appears in each `wrangler.toml` `crons` list (parsed with
wrangler's own config reader); `useMaintenance` labels equal the module's labels.

### Affected

`app/config/systemJobs.ts` (new), `nuxt.config.ts`, `app/app.config.ts`, `app/composables/useMaintenance.ts`,
`docs/adr-compliance-frontend.md` (`useMaintenance` row).

## DRY improvements

### Spread row primitive

#### Problem

Fourteen design-system tokens spell a "something left, something right" row (`flex items-center justify-between …`). Six of
them are the same base with nothing or a trifle added: `collapsible.headerRow` and `chefCalendar.header` (one constant,
`COLLAPSIBLE_HEADER_ROW`), `adminTeams.detailHeaderRow`, `chefCalendar.agendaHeader`, `householdBookings.panelHeader`,
`teamCard.jokerAddRow` and `dinnerBudget.boxLine`. The spending tables (`CookingRoundSpending.vue`) head themselves with a
row bound to the budget box's `boxLine` and the amount's `vatAmount.unitHeader`, an alias of `TYPOGRAPHY.finePrintMuted`;
the editor's folded row (`ExpenseLines.vue`) binds the same alias. The design system holds one-off variants where it
holds a layout.

#### Solution

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

#### TDD

The architecture suite (`designSystemUsage`, contrast) stays green; the component specs of the chef tables, the editor,
the chef calendar and the admin teams assert the heading test ids and behaviour as today. No e2e slot: a rendering-only
package.

#### Affected

`app/composables/useTheSlopeDesignSystem.ts` (`LAYOUTS.spreadRow`, `table.ui.caption`, the composed and deleted tokens),
`app/components/chef/DinnerBudget.vue`, `TicketChanges.vue`, `CookingRoundSpending.vue`, `app/components/shared/ExpenseLines.vue`,
`app/components/calendar/ChefCalendarDisplay.vue`, `app/components/admin/AdminTeams.vue`, `docs/ui.md` (the spread row
under Component layouts, the caption under Tables).

### Chef card atoms

#### Problem

`ChefMenuCard.vue` and `ExpenseLines.vue` each render the card section shell (`cardSection.row/label/glyph/line`, the
secondary edit action, `cardSection.editor/editorHead/editorTitle`, `LAYOUTS.formButtonRow`). The total rows of
`ExpenseLines.vue`, `CookingRoundSpending.vue` and `DinnerBudget.vue` spell the same `<tr>` with a label cell and a
`VatAmount` cell twelve times. The unit words "ex / inkl. moms" sit on four tokens of one value (`dinnerBudget.unit`,
`boxUnit`, `vatAmount.unitHeader`, `expenseLines.alternative`). `TicketChanges.vue` repeats its chip loop twice, and the
design system spells `ticket.face.normal/released/claimed` and `stateIcon` as triplets that differ in one accent.

#### Solution

A `CardSection` atom (props: glyph, title, edit label, editing; slots: line, editor, actions) renders the shell for both
cards. An `AmountTotalRow` atom (label, gross, balance, pending, colspan) renders every total row; `ExpenseLines`
iterates `[{label, figures}]`. One unit-word token under `TYPOGRAPHY`, the other three go. One `#chips` fragment in
`TicketChanges`. The ticket face is a base plus an accent map keyed by ticket state.

#### Affected

`app/components/chef/ChefMenuCard.vue`, `DinnerBudget.vue`, `TicketChanges.vue`, `CookingRoundSpending.vue`,
`app/components/shared/ExpenseLines.vue`, `app/composables/useTheSlopeDesignSystem.ts`, their component specs.

### Unit formatting

#### Problem

Seven sites append `kuv.` or `kuverter` to `formatPortions(x)` by hand (`KitchenPreparation.vue`, `AllergenMultiSelector.vue`,
`AllergyOverviewLine.vue`, `DinnerBudget.vue`, `TicketChanges.vue`); thirty sites in ten files append ` kr` to
`formatPrice(x)`, and `VatAmount.vue` spells its own.

#### Solution

`formatKuverter(portions, long?)` in `app/utils/utils.ts` and `formatKr(ore)` in `useTicket`, swept at every site in one
change.

#### Affected

The ten components with a ` kr` site (`AdminEconomy.vue` 11, `DinnerBudget.vue` 5, `HouseholdEconomy.vue` 4, the public
billing page 3, `ControlBadge.vue` 2, `CostLine.vue`, `DinnerBookingForm.vue`, `TicketChanges.vue`, `BookingGridView.vue`,
`VatAmount.vue`), the five with a portions site, `app/utils/utils.ts`, `app/composables/useTicket.ts`, the utils unit spec.

### Raw utility classes

#### Problem

The architecture rule fails a raw palette shade only, so about four hundred raw layout and typography utilities sit in
sixty-one `.vue` files (`AdminEconomy.vue` 35, `AllergyTypeCard.vue` 27, `HouseholdSettings.vue` 25,
`UserProfileCard.vue` 22, `UserPreferencesCard.vue` 20, `TicketPriceListEditor.vue` 14, `AllergyDetailPanel.vue` 13,
`HouseholdEditPanel.vue` 11, `HelpButton.vue` 10, …). Per-site `:ui` patches and literal props sit beside them:
`TicketPriceListEditor.vue` (three), `HelpButton.vue` (`variant="outline"` on a `UCard`), the page tabs of
`pages/admin/[tab].vue`, `pages/household/[shortname]/[tab].vue` and `PageHeader.vue` (`label: 'hidden md:inline'`),
`HouseholdListItem.vue:19`, `UserListItem.vue:152`, `CookingTeamCard.vue:339` (`:ui="{base: avatar.compact.fit}"`).

Motion utilities are the same class, 21 hits in 8 files: `animate-spin` beside `MOTION_SPIN` in `OrderHistoryDisplay.vue:59` and
`AdminEconomy.vue:541`; hover interactions in `UserListItem.vue:158,199` (`hover:scale-110 hover:rotate-3 transition-transform duration-200`),
`CountdownTimer.vue:122` (`hover:ring-2 … transition-all`), `ChefDinnerCard.vue:96` (`transition-shadow duration-200 hover:shadow-lg`),
`UserProfileCard.vue:253` (`transition-colors` with a hover colour inside); the six `rotate-*` tilts by error code in
`ViewError.vue:20-35`; `Ticker.vue:19` returning `animate-marquee` from a function. Inside the design system, `pulse`, `dot`
and the power-mode fireworks carry `animate-pulse` without `motion-reduce`.

#### Solution

A `COMPONENTS.<surface>` token per file, swept file by file, the touched files first (the `ds-deviations-fixed-on-sight`
rule); `COMPONENTS.pageTabs` and `COMPONENTS.pageCard` for the pages; `COMPONENTS.avatar.regular/compact` carry their
`ui` so a group spreads the token. A `MOTION` group holds the primitives (spin, the two hover kinds, the colour fade,
the marquee) and `COMPONENTS.viewError.tilt` maps the error code to its turn; one token per distinct original value,
named by its site, proof a before/after class-set comparison per template. The architecture spec gains a rule that
fails any raw utility class in a `.vue` template, motion utilities included, with the print CSS of
`pages/admin/allergies/pdf.vue` exempt, so the sweep cannot regress.

**OPEN** — `motion-reduce:animate-none` on the infinite animations the design system still runs without it (pulse,
marquee, fireworks): a rendered-class change, decided with the sweep.

#### Affected

The sixty-one components, `app/composables/useTheSlopeDesignSystem.ts`,
`tests/component/architecture/designSystemUsage.unit.spec.ts`, `docs/ui.md` (one line under Rules).

### Route and composable leftovers

#### Problem

Six routes still spell a coerced id in a query schema (`order/index.get.ts`, `admin/dinner-event/index.get.ts`,
`admin/team/index.get.ts`, `household/allergy/index.get.ts`, `billing/index.get.ts`, `admin/household/inhabitants/[id].post.ts`
`seasonId`) beside `RouteIdSchema`. Three routes build the sender's queue and config pair as positional arguments
(`admin/sender/event/test.post.ts`, `admin/sender/event/monthly-billing.post.ts`, `user/notifications/test.post.ts`) beside
`senderFromEvent`. `useQueryParam.ts` repeats the normalize-or-default block three times. The order-history route
reads the households its creation rows name because the creation audit row carries no `householdShortname`.
`useOrder.ts` holds `orderStateConfig` (labels, colours, icons on a design-system call) where ADR-017 r2 places presentation
in `useBookingUi`; `app/stores/users.ts` exposes no `isEmpty` and `isStoreReady` (ADR-007 r2); `usePermissions.ts` and
`useUserRoles.ts` import `SystemRoleSchema` from the generated layer where ADR-001 routes it through `useCoreValidation`.

#### Solution

`RouteIdSchema` / `RouteIdSchema.optional()` in the six query schemas; `senderFromEvent(event)` destructured in the three
routes; one `fallback(invalid)` in `useQueryParam`; `createOrders` writes `householdShortname` into the creation audit
row, `readAuditTicket` reads it from both shapes, and a convergent backfill fills the existing rows, after which the
households read in `chef/dinner/[id]/order-history.get.ts` goes. `orderStateConfig` moves to `useBookingUi` on tokens;
the users store gains the two flags with a case each; the two composables import the enum from `useCoreValidation`.

#### Affected

The nine routes, `app/composables/useQueryParam.ts`, `server/data/financesRepository.ts`,
`app/composables/useBookingValidation.ts`, a D1 migration for the backfill, `docs/adr-compliance-backend.md` rows.

## Dependency clusters

### Problem

Three majors wait on upstream: `typescript` 7 (`vue-tsc` on TypeScript 7.1), `@types/node` 26 (Node 26) and `h3` 2
(Nuxt 5). The ADR-017 follow-up, Nuxt's root `references` layout with `nuxt typecheck` as the gate, waited on
nuxt/nuxt#34385; `nuxt typecheck` runs clean on `feature/work-roster` (2026-10-13).

### Solution

Each major moves through an explicit install the day its gate opens, one package each with `npm run pre:all`,
`make unit-test` and the api suite. `nuxt typecheck` replaces the three `vue-tsc` projects in `pre:all` and the CI
step once its run time on CI is known; `server/tsconfig.json` stays until then.

### Affected

`package.json`, `package-lock.json`, `.github/workflows/cicd.yml`, `docs/adr.md` ADR-017 (the gate), `CLAUDE.md` (the commands).

## Deferred from release 0.9

| Work | Where it lives | State |
|---|---|---|
| Duty roster: audit instrumentation, read endpoints and timeline, template CRUD and duty scaffolding, the single-dinner roster with sign-off, the duty swap, the data separation | `feature-proposal-duty-roster.md` | signed off; the joker slot shipped (`archived/feature-joker-slot.md`) |
| Season spending: Sæsontrend, admin Forbrug, basisvarer entry | `feature-proposal-season-spending.md` | mockups signed |
| Ad-hoc charges and the spending views | `feature-proposal-adhoc-admin-billing.md` phases 2 to 5 | signed off; the ledger, the expense table and the chef endpoints shipped |
| Notification triggers beyond the waitlist kinds | `feature-proposal-notification-triggers.md` | proposal, two open questions |
| Billing delivery report and interrupted runs | `bug-fix-billing-delivery-report.md` | three open decisions |
