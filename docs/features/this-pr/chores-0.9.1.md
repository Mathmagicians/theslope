# 0.9.1 chores

**Status:** Next release | **Date:** 2026-10-08 | **Builds on:** release 0.9 (`archived/release-0.9.0.md` § Prisma bundle)

The release carries no migration; the schema work is in `../release-0.9.3/feature-0.9.3.md`.

## Delivered

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Workflow checks | The workflows' `run:` scripts read `${{ }}` values through `env` (code scanning alert #10), and `npm run lint:gh-actions` runs CodeQL's Actions queries in `pre:all`, locally through `gh codeql`, in CI on the runner image's bundle. | – | done 93834f4 |
| Household data access and GET previews | Every member reads, a household changes its own data, an admin or the allergy manager (allergies) another household's through a logged override (ADR-004 § Access), and previews are GETs. | – | done 52c5d68 |
| Three faces on a phone (#171) | An avatar group shows three faces below md, five from md. | – | done 0b6d7d0 |
| One master-detail layout (#169) | `LAYOUTS.masterDetailPage` on /dinner, /chef, /admin/allergies, /admin/teams and the household bookings tab, with the calendar circle a step up at lg. | – | done 0b6d7d0 |
| Tests at the lowest level | The access cases consolidated per `docs/testing.md` Rule 0. | – | done ef54aa6 |
| Ticket counts per person | `personTicketCounts` in `useBooking` counts a person's tickets, the released among them and the places on the waiting list for the booking grid's name cell, with the day-view component spec at the lowest level. | – | done 4349c92, 8401b44 |

## In flight

Updated 2026-10-25. Release 0.9 shipped in f5b5205 (#168).

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Notification delivery | [feature-notification-delivery.md](feature-notification-delivery.md) | `booking-notifications.feature`, `billing-notifications.feature`, `chef-deadline-notifications.feature`, `delivery-records.feature`, `test-message.feature` (16586f1) | in your test: desired deliveries, diagnostics, booking emails flag (39e14a6, 16586f1) |
| UI cases fail on an unexpected API error | § UI cases fail on an unexpected API error | – | implemented |
| Dev-server flakes in CI | § Dev-server flakes in CI | – | implemented |
| UI suites fail the build | § UI suites fail the build | – | specified |
| Slow client after a save | § Slow client after a save | – | discovery |
| Scaffold: a save naming an order bought by another household | § Scaffold: a save naming an order bought by another household | – | specified |
| Minimal test seasons | § Minimal test seasons | – | specified |
| Preferences at an inhabitant's creation | § Preferences at an inhabitant's creation | – | specified |
| Server payload of the shared stores | § Server payload of the shared stores | – | specified |
| Waitlist: no-seat notice at dinner start | § Waitlist: no-seat notice at dinner start | – | specified |
| Map.groupBy in the Workers runtime | § Map.groupBy in the Workers runtime | – | specified |
| Stored dinner dates | § Stored dinner dates | – | specified |
| Dinner page remounts on claim | § Dinner page remounts on claim | – | specified |
| Catch-up amounts | § Catch-up amounts | – | specified |
| Job schedule module | § Job schedule module | – | specified |
| Delete responses | § Delete responses | – | specified |
| DRY improvements | § DRY improvements | – | specified |
| Dependency clusters | § Dependency clusters | – | specified |
| Test factory dates at call time | § Test factory dates at call time | – | specified |
| AdminTeams loading row | § AdminTeams loading row | – | discovery |
| Avatar ring colours | § Avatar ring colours | – | specified |
| User saves and deserializers | § User saves and deserializers | – | approved 2026-10-26 |

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
`feature-notification-delivery.md` (topics row), `docs/adr-compliance-backend.md`.

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

## Preferences at an inhabitant's creation

### Problem

`InhabitantCreateSchema` (`useCoreValidation.ts:207`) accepts `dinnerPreferences`, and the create
(`saveInhabitant`, `prismaRepository.ts:339-354`; the import's `createInhabitants`, `:415-424`) writes the row without
it. The season initialises a person's preferences: `clipPreferences` (`server/utils/initializePreferences.ts`) runs on
activation, on a season update and nightly, writes Spisesal on the cooking days and Ingen on the rest into a `null`
map, and sets a stored map's non-cooking days to Ingen. A map sent with a create is dropped silently; a spec that
creates a person with Ingen and then activates a season finds the person booked (`AdminEconomy.e2e.spec.ts`, 2026-10-19).
The specs set preferences through the preference write after the create.

### Decision (2026-10-24)

The create schema takes no map: `InhabitantCreateSchema` omits `dinnerPreferences`. Preferences are the season's to
initialise and the person's to change through the preference write.

### Affected

`app/composables/useCoreValidation.ts`, `server/data/prismaRepository.ts`, `tests/e2e/testDataFactories/householdFactory.ts`,
`tests/e2e/api/parallel/admin/household.e2e.spec.ts`, the specs that pass a map at creation
(`HouseholdBookings.e2e.spec.ts`).

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
`nuxt.config.ts` `nitro.scheduledTasks`, `app.config.ts` `theslope.systemJobs` — and labelled in
`systemJobs[].description`, which `AdminSystem.vue` shows. The monthly job runs `0 3 18 * *`: the 18th at
03:00 UTC, 05:00 in summer time and 04:00 in winter time; the labels carry the winter clock only ("kl. 02:00",
"kl. 03:00", "kl. 04:00").

### Solution

`app/config/systemJobs.ts`, a plain module (the `notificationTemplates.ts` pattern): per job its cron and its Danish
label with the UTC time and the Copenhagen summer and winter times. `nuxt.config.ts` builds `scheduledTasks` from it,
`app.config.ts` spreads it into `theslope.systemJobs`, whose labels `AdminSystem.vue` shows. The three `wrangler.toml`
`crons` lists stay per environment block (TOML).

### Mockup

Text only, on the job cards and the job-run table of `/admin/system` — ⏳ awaiting signoff:

```
Månedlig fakturering    D. 18. hver måned kl. 05:00 (sommertid) / 04:00 (vintertid)
```

### TDD

Unit: every `systemJobs` cron is a key of `scheduledTasks` and appears in each `wrangler.toml` `crons` list (parsed with
wrangler's own config reader); the `theslope.systemJobs` labels equal the module's labels.

### Affected

`app/config/systemJobs.ts` (new), `nuxt.config.ts`, `app/app.config.ts`.

## Delete responses

### Problem

`deleteMany` on D1 reports the statement's change counter: the adapter returns `meta.changes` (`@prisma/adapter-d1`),
which the runtime computes from SQLite's `total_changes()`, and that total includes the rows a foreign key action
changes. The Heynabo import adds up the counts of `deleteInhabitantsByHeynaboId` and `deleteHouseholdsByHeynaboId`
(`server/utils/heynaboImportService.ts`), whose rows have cascading children, so its report counts the children too.
`DELETE /api/admin/team/assignment/[id]` is a single delete that answers a count; ADR-009 rule 7 gives a single delete
the deleted id.

### Solution

The bulk deletes read the ids they delete before the delete and report that length, as `deleteDinnerEvent` does
(`server/data/financesRepository.ts`). The assignment delete answers the deleted id through `IdSchema`, as the team and joker slot
deletes do.

### TDD

- Serial API: an import that removes an inhabitant with an allergy reports one deleted inhabitant.
- API: the assignment delete case asserts the deleted id; its 404 case stays.

### Affected

`server/data/prismaRepository.ts`, `server/utils/heynaboImportService.ts`, the assignment delete route,
`app/stores/plan.ts`, `tests/e2e/testDataFactories/seasonFactory.ts`, `team.e2e.spec.ts`,
`docs/adr-compliance-backend.md`.

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
`VatAmount` cell twelve times. The unit words "ex / inkl. moms" are a literal at five template sites (`DinnerBudget.vue` two,
`CookingRoundSpending.vue`, `ExpenseLines.vue` two, one a column header) on three tokens of one value
(`dinnerBudget.boxUnit`, `vatAmount.unitHeader`, `expenseLines.alternative`). `TicketChanges.vue` repeats its chip loop twice, and the
design system spells `ticket.face.normal/released/claimed` and `stateIcon` as triplets that differ in one accent.

#### Solution

A `CardSection` atom (props: glyph, title, edit label, editing; slots: line, editor, actions) renders the shell for both
cards. An `AmountTotalRow` atom (label, gross, balance, pending, colspan) renders every total row; `ExpenseLines`
iterates `[{label, figures}]`. One constant holds the unit words and one `TYPOGRAPHY` token styles them; the other two tokens go. One `#chips` fragment in
`TicketChanges`. The ticket face is a base plus an accent map keyed by ticket state.

#### Affected

`app/components/chef/ChefMenuCard.vue`, `DinnerBudget.vue`, `TicketChanges.vue`, `CookingRoundSpending.vue`,
`app/components/shared/ExpenseLines.vue`, `app/composables/useTheSlopeDesignSystem.ts`, their component specs.

### Unit formatting

#### Problem

Six sites append `kuv.` or `kuverter` to `formatPortions(x)` by hand (`KitchenPreparation.vue` two,
`AllergenMultiSelector.vue`, `AllergyOverviewLine.vue`, `DinnerBudget.vue`, `TicketChanges.vue`); thirty-six sites in
twelve files append ` kr` to `formatPrice(x)`, `VatAmount.vue` among them.

#### Solution

`formatKuverter(portions, long?)` in `app/utils/utils.ts` and `formatKr(ore)` in `useTicket`, swept at every site in one
change.

#### Affected

The twelve files with a ` kr` site (`AdminEconomy.vue` 14, `DinnerBudget.vue` 5, `HouseholdEconomy.vue` 5, the
public billing page 3, `ControlBadge.vue` 2, `CostLine.vue`, `DinnerBookingForm.vue`, `DinnerTicket.vue`, `ChefMenuCard.vue`,
`TicketChanges.vue`, `BookingGridView.vue`, `VatAmount.vue`), the five with a portions site, `app/utils/utils.ts`, `app/composables/useTicket.ts`, the utils unit spec.

### Date formats

#### Problem

`formatDate` takes any mask, and the masks live at their call sites: `'EEE dd/MM'`, `'EEEE dd/MM'`, `'EEEEE d'`,
`'EEEEE'`, `'d/M'`, `'dd/MM'`, `'MMMM yyyy'`, and `'dd/MM/yyyy HH:mm'` twice beside `formatMoment`'s
`${DATE_SETTINGS.DATE_MASK} HH:mm`. `OrderHistoryDisplay.vue` formats with `toLocaleString` ("20.10. 14.30"). The
weekday and month helpers' comments name capitalised output ("Man 15/11", "Januar 2026"); the `da` locale renders
lowercase ("tir. 20/10", "januar 2026").

#### Solution

`DATE_FORMATS` in `app/utils/date.ts` names the formats; `formatDate` and `formatDateRange` take a format name
(`keyof typeof DATE_FORMATS`), so a call site passes no mask.

The package slims the variations: a site takes `date` or `weekdayDate`, and another format stays only where its
surface cannot hold those two. The package's first round settles the list below.

| Format | Renders | Sites |
|---|---|---|
| `date` | 20/10/2026 | the default: dates, ranges, the mails |
| `weekdayDate` | tir. 20/10/2026 | `CountdownTimer.vue`, `ChefDinnerCard.vue`, the grid's day navigation |
| `dateTime` | 20/10/2026 14:30 | `AdminSystem.vue`, `formatMoment`, `OrderHistoryDisplay.vue` |
| `dayMonth` | 20/10 | the grid's week range, the maintenance log |
| `month` | oktober 2026 | the grid's month navigation, the billing headings |
| `seasonName` | 08/25 | season names |

`formatDanishWeekdayDate`, `formatFullWeekdayDate` and `formatMonthYear` leave `date.ts`; `DATE_MASK` and
`SEASON_NAME_MASK` leave `DATE_SETTINGS`.

**OPEN — the grid's column headers.** View mode reads "T 20" (`formatCompactWeekdayDate`, `BookingGridView.vue:345`),
edit mode "T" over "20/10" (`BookingGridView.vue:616-617`).
- A: both modes show the weekday letter (`formatWeekdayCompact`) over `dayMonth`; six formats.
- B: a seventh format `gridDay` ("T 20") for view mode; the two modes keep their headers.

#### TDD

`date.unit`: one case per format name.

#### Affected

`app/utils/date.ts`, the call sites in the table, `BookingGridView.vue`, `useSeason.ts`, `useMaintenance.ts`,
`tests/component/utils/date.unit.spec.ts`.

### Raw utility classes

#### Problem

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

### Waitlist chip

#### Problem

`BookingGridView.vue` and `DinnerModeLegend.vue` each spell the same template: a `UChip` on `COMPONENTS.waitlist.chip`
with the hourglass (`COMPONENTS.waitlist.chipIcon`) over the ghosted wish.

#### Solution

One component renders the chip with a slot for the ghosted wish; the grid cell and the legend use it.

#### Affected

`app/components/booking/BookingGridView.vue`, `app/components/dinner/DinnerModeLegend.vue`, their component specs.

### Hand-written types in the design system

#### Problem

`useTheSlopeDesignSystem.ts` still spells types by hand: `ResidencyAlertKind` extracts a hand-written union of alert
kinds, `RESIDENCY_CONFIG` declares an inline shape naming the domain fields `'movedInDate' | 'moveOutDate'`, and
`AlertUi` / `AlertKindConfig` restate Nuxt UI's alert props. The sentences of a closed dinner's supply live in two
homes: `DEADLINE_LABELS.BOOKING_CLOSED.availableText` in `useBooking.ts` and `SUPPLY_WORDS` in `useBookingUi.ts`; the
"ledig / ledige" plural rule is written in `createBookingBadge` and in `GuestBookingForm.vue`.

#### Solution

A key type derives from its token (`keyof typeof`), a domain field name from the validation composable's schema
(`HouseholdSchema.keyof()`), a Nuxt UI shape from the library's prop types (`AlertProps`). The supply sentences and
the plural rule live once, in `useBookingUi`, and both badges and the guest form read them.

#### Affected

`app/composables/useTheSlopeDesignSystem.ts`, `app/composables/useBookingUi.ts`, `app/composables/useBooking.ts`
(`DEADLINE_LABELS`), `app/components/booking/GuestBookingForm.vue`, their specs.

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

## Test factory dates at call time

### Problem

`SeasonFactory.tomorrow` and `oneWeekFromTomorrow` and `DinnerEventFactory.today` and `tomorrow` are computed when the
factory module loads; `DinnerEventFactory.tomorrow` is the load time plus 24 hours. The defaults that read them
(`SeasonFactory.defaultSeason`, `defaultSeasonData`, `defaultJokerSlot`, `DinnerEventFactory.defaultDinnerEvent`,
`createDinnerEvent`, `createDinnerEventOnFreeDay`) and the singleton active season carry the load day. A run that
crosses midnight creates seasons and dinners from the day before.

### Solution

The factories compute today and tomorrow on each call, at midnight, through `date-fns` (`startOfDay`, `addDays`); the
spec call sites stay as they are.

### TDD

- A local run of the api and ui suites that crosses midnight passes.

### Affected

`tests/e2e/testDataFactories/seasonFactory.ts`, `tests/e2e/testDataFactories/dinnerEventFactory.ts`.

## Slow client after a save

Priority: low. Added 2026-10-19 from the e2e work on `HouseholdBookings.e2e` (release 0.9, One booking path point 5).

### Problem

After a grid save the server answers in under 400 ms, and the client takes about 3 s from that answer until its
re-reads land (the household's orders, the upcoming orders, the tickets for sale, the waiting list, the dinner on
view: the chain of `bookingsStore.writeBookings`).

### Solution

Investigate where the 3 s go (the re-read chain, its sequencing, the store's refreshes) and propose the fix in a round.

## UI suites fail the build

Priority: medium. Added 2026-10-19 from the e2e work on the UI suites (release 0.9, CI test reporting). Runs once the
suites have stayed stable over a few pull requests.

### Problem

`.github/workflows/cicd.yml` runs the ui step (`npm run test:e2e:ui`) and the ui serial step with
`continue-on-error: true` and prints their reports to the run summary with a "do not fail the pipeline" note: a red
UI case leaves the build green.

### Solution

Both steps gate the build: `continue-on-error` goes from each step, and the note goes from its summary line. The api
step is the model.

## UI cases fail on an unexpected API error

Priority: high.

### Problem

A UI case passes while the page it drives gets a 4xx or 5xx from `/api/`: the admin cases on another household's
bookings ran green through the 403 of the expected-bookings read, and the toast it raised was asserted nowhere.

### Solution

Every page a UI case opens reports its `/api/` responses; the case fails at its end on a 4xx or 5xx it did not
declare, naming the method, the url and the status. A case that drives an error on purpose (a member's 403 on another
household's change) declares that status and url.

### TDD

The guard's own case: a page that gets an undeclared 403 fails the case, a declared one passes. Then the UI suites
run one spec at a time in the e2e slot; each red names its response, and the cause is fixed in the app or declared in
the case.

## Dev-server flakes in CI

Priority: high.

### Problem

The CI suites run against `npm run dev`. Three cases fail on a first attempt and pass on the retry:

| Case | Cause |
|---|---|
| `ui/AllergyPoster.e2e` | `handleBatchCreateTeams` (`AdminTeams.vue`) rethrows a failed create the store has toasted; the dev overlay holds the unhandled error of AdminTeams' declared 401 and mounts it on every page loaded after, so the poster renders two `h1` |
| `ui/MobileViewport.e2e`, reveal screens | the overflow sampler runs through the full-page screenshot's resize and reads `innerWidth` in that frame; the culprit list names the first five elements, the header |
| `api/serial/scaffold-prebookings.e2e` | a dropped connection to the local D1 (`fetch failed`) answers 500 "Prisma Client Validation Error" (`eventHandlerHelper.ts`) |

### Solution

- `handleBatchCreateTeams` logs a failed create and keeps the form in create mode.
- The sampler stops before the screenshot, measures `document.documentElement.clientWidth` and names the outermost
  element that overflows.
- `nuxtErrorFromPrismaError` answers a dropped database connection with 503 "Service Unavailable".

### TDD

Unit: the error mapper's connection row. Component: a failed team create stays in create mode and raises no unhandled
error. E2E: `ui/MobileViewport`, `ui/AllergyPoster`, `ui/AdminTeams`, `api/serial/scaffold-prebookings`.

## Notification delivery

Priority: high, issue #170. Status: design awaiting approval (2026-10-25). Spec:
[feature-notification-delivery.md](feature-notification-delivery.md).

## Scaffold: a save naming an order bought by another household

Priority: low. Moved from release 0.9 on 2026-10-19. `POST /api/household/order/scaffold` lists an order that another
household has since bought in `failed`; the case has no e2e (`../adr-compliance-backend.md`, the scaffold row). The
API e2e: a draft naming the order after its sale; the reply lists it in `failed`, and the buying household keeps the
ticket.

## Minimal test seasons

Priority: low. Added 2026-10-19 from the e2e work on `scaffold-prebookings.e2e` (release 0.9, the rule in
`../testing.md` § Strategy: Control the Season, Control the Deadline).

### Problem

These fixtures span more dinners than their cases prove:

| Fixture | Season | The cases prove |
|---|---|---|
| `tests/e2e/ui/serial/DinnerBookingForm.e2e.spec.ts:280`, the past-window season | 14 days of weekdays | the second dinner (two dinners) |
| `tests/e2e/ui/serial/AdminEconomy.e2e.spec.ts:53` | 14 days | a correction of an upcoming order |
| `tests/e2e/ui/serial/DinnerBookingForm.e2e.spec.ts:61` | 14 days | up to the fifth future dinner |
| `tests/e2e/ui/serial/HouseholdBookings.e2e.spec.ts:62` | 14 days of weekdays | the phone month grid's columns |
| `tests/e2e/api/serial/admin/waitlistAssignment.e2e.spec.ts:68` | 10 days | the spec's own dinners; the generated ones go unused |
| `tests/e2e/ui/serial/HouseholdScaffolding.e2e.spec.ts:82`, `HouseholdBookingsCrossHousehold.e2e.spec.ts:54`, `tests/e2e/api/serial/admin/seasonLiveEdit.e2e.spec.ts:46` | 10 days each | a dinner before and one after the deadline |
| `tests/e2e/api/serial/admin/scaffold-prebookings.e2e.spec.ts:624`, the released ticket on a cancelled dinner | the default week | one dinner |

### Solution

Each fixture's season shrinks to the dinners its cases prove; each case is checked green when its season shrinks.

## AdminTeams loading row

Moved from release 0.9 on 2026-10-18. After a season switch the table shows the previous season's teams under the
loading bar; with the loading row, a team save's re-read closes the team detail docked under its row on a phone.
Where: `app/components/admin/AdminTeams.vue:396`, ADR-018 § Table loading. **OPEN:** the loading row with the docked
detail closing, or a docked detail that survives the re-read.

## Avatar ring colours

Moved from release 0.9; brief presented 2026-10-20. `UserListItem` builds `md:ring-${color}` at runtime, which Tailwind
leaves out of the CSS, so from md up the faces on Præferencer and in the allergy alert ring in the text colour. The
token holds one class string per use (`household` warning, `inhabitant` primary, `allergyManager` ocean-500), the prop
takes its key, the raw `"ocean-500"` in `AllergyManagersList.vue:48` goes, and the `UserListItem` spec checks each
key's token. Where: `useTheSlopeDesignSystem.ts` `userListItem.ring`, `UserListItem.vue:143`, `HouseholdCard.vue:308`.

## User saves and deserializers

### Problem

`saveUser` (`server/data/prismaRepository.ts`) runs `serializeUserInput` before it branches on the id, and its schema
requires an email. A save by id carries only the fields it changes, so a member's save of channels and appearance and
an admin's edit of a user answer 400. The user has four deserializers for its two types (ADR-009), two of them in the
repository (ADR-010 rule 3), and the `saveUser` and `deleteUser` results carry `passwordHash`.

### Solution

- `saveUser`: the update by id writes through `serializeUserPartial`, the fields the caller set. The email-keyed upsert
  writes `serializeUserInput`, without channels and appearance for an existing user.
- One deserializer per type in `useCoreValidation`: `deserializeUserDisplay` and `deserializeUserDetail`. `saveUser`
  and `deleteUser` return a `UserDetail`, which has no `passwordHash`.

### TDD

- Unit `prismaRepository.unit.spec.ts`: a partial save by id writes the fields it carries; `saveUser` and `deleteUser`
  return a detail without `passwordHash`.
- Unit `useCoreValidation.unit.spec.ts`: the Display and the Detail of a row, neither with `passwordHash`.
- API: `users.e2e.spec.ts`, `preferences.e2e.spec.ts`.

### Affected

`server/data/prismaRepository.ts`, `app/composables/useCoreValidation.ts`, `docs/adr-compliance-backend.md`.

## Decisions carried from release 0.9

**2026-10-13**
- The billing delivery report moves from release 0.9 to this release; the duty roster, the season spending views and
  the ad-hoc charges are in `../release-0.9.3/feature-0.9.3.md`, the remaining notification kinds in § Notification delivery.
- The users store, the dinner Detail's tickets and `HouseholdDisplay`: § Server payload of the shared stores.

**2026-10-17**
- The named date formats and their sweep move from release 0.9 to this release (§ Date formats); release 0.9 formats
  with the default `formatDate`.

**2026-10-18**
- The AdminTeams loading row moves from release 0.9 to this release.
