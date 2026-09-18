# Bug fix: follow-ups found on `bugfix/admin-ux`

**Status:** Parked until the `bugfix/admin-ux` release | **Date:** 2026-09-18 | **Updated:** 2026-09-18 | **Found on:** `bugfix/admin-ux` (PR #166)

Defects and findings from `bugfix/admin-ux`; they exist on `main`. The first four came up on 2026-09-18 while chasing a
team-assignment failure and a "become chef" error on `/dinner`; the dinner-date matcher is fixed on the branch, the rest are
proposals. The last four came up while building the notification pipe (`archived/feature-notifications.md`).

## Fix inventory

| Fix | What | State |
|---|---|---|
| Stored dinner dates | one convention for the midnight a dinner date carries | matcher fixed; storage convention proposed |
| Query params synced in one flush | the second auto-sync overwrites the first param | proposed |
| Dinner page remounts on claim | the whole page swaps to the loader while the season refreshes | proposed |
| Composables after an await | the plan store injects outside setup on every claim and resign | proposed |
| Catch-up amounts | invoice amounts and period totals follow the transactions a catch-up run links | proposed |
| Job schedule labels | `/admin/system` labels the monthly billing job "D. 17." and it runs on the 18th | proposed |
| Mobile overflow left by the alert token | tables and a settings-tree URL wider than a phone; layouts inside alert descriptions | findings, measured 2026-09-16 |
| Configuration duplication | values stated in several config files | findings, report only |

## Stored dinner dates

**Problem.** A dinner date is a `Date` at the midnight of the clock that wrote it. Rows written on the workers and by the season
import carry UTC midnight; a row written on a Copenhagen machine carries 22:00Z of the day before. The team-assignment matcher
compared the two as instants and assigned nothing on a Danish machine against a copy of the dev database.

**Root cause.** The repository serializes season ranges (ADR-010) and leaves dinner dates as they arrive. Fixtures build dates
from local components, so the specs never hold the stored shape and pass in Copenhagen and in UTC alike.

**Done.** `app/utils/season.ts` matches a cooking day to a dinner by calendar day (`isSameDay`); a unit case with UTC-midnight
events guards it in both timezones.

**Solution.**
- The repository writes a dinner date as the UTC midnight of its calendar day, in one serializer next to the season one.
- Callers compare dinner dates by calendar day, never by instant.
- Fixtures for stored dates use ISO strings; the temporal rule in `docs/testing.md` names the stored shape.
- Rows on dev and prod already carry UTC midnight; a read confirms it before the change ships. No migration.

**TDD.** `date.unit`: local midnight in → UTC midnight out, UTC midnight unchanged, the day survives the DST switch.
`useSeason.nuxt`: assignment and reconciliation with events in the stored shape. `season.e2e`: a generated dinner reads back at
UTC midnight.

**Affected.** `server/data/prismaRepository.ts`, `server/utils/reconcileDinnerEvents.ts`, `app/utils/date.ts`,
`tests/e2e/testDataFactories/dinnerEventFactory.ts`, `docs/testing.md`.

## Query params synced in one flush

**Problem.** Landing on a bare `/dinner` yields `/dinner?date=…` with `cal` missing. The calendar then opens from the breakpoint
default after hydration and again on every remount.

**Root cause.** `app/pages/dinner/index.vue` declares `cal` (line 77) and `date` (line 112); both need syncing in the same flush.
`app/composables/useQueryParam.ts` runs each sync in its own `watchPostEffect` (164–170) and `updateURL` (117–141) builds the new
query from a snapshot of `route.query` before an async `navigateTo`, so the second navigation overwrites the first param.
`hasSyncedSinceReady` (72, set at 166) blocks any retry.

**Solution.** One pending write per route: `useQueryParam` merges concurrent syncs into a single `navigateTo` per flush, so every
synced param lands. The accumulator is request-scoped so SSR stays safe.

**TDD.** `useQueryParam.nuxt`: two instances synced in one flush → the last navigation carries both params (red today: the query
holds `date` alone). `pages.e2e`: `/dinner` lands with both `cal` and `date`.

**Affected.** `app/composables/useQueryParam.ts`.

## Dinner page remounts on claim

**Problem.** Claiming or resigning a role on `/dinner` swaps the whole page for the loader and mounts it again.

**Root cause.** `app/stores/plan.ts` `assignRoleToDinner` (495–497) awaits `refreshSelectedSeason()`, the season status turns
`pending`, `isPlanStoreReady` (194–198) turns false, and `app/pages/dinner/index.vue` (206, 238) replaces `<UPage>` with
`<Loader>` until the refresh resolves.

**Solution.** The page shows the loader on first load only; a refresh keeps the mounted tree and the store exposes a separate
`isRefreshing` flag for inline feedback (ADR-007 status computeds).

**TDD.** `plan.nuxt`: a refresh after initialization keeps `isPlanStoreReady` true. `Chef.e2e` or `dinner.e2e`: claiming a role
keeps the page mounted (the calendar accordion keeps its open state, no loader).

**Affected.** `app/stores/plan.ts`, `app/pages/dinner/index.vue`.

## Composables after an await

**Problem.** Every claim and resign logs `inject() can only be used inside setup()`.

**Root cause.** `app/stores/plan.ts` `claimRoleForMe` and `resignRoleForMe` (511–519) call `useCookingTeam()` and `useToast()`
after `await assignRoleToDinner(...)`. Outside setup, `inject` returns the fallback, so the design system's `isMd` becomes a
throwaway `ref(false)` for that call.

**Solution.** Resolve composables at the top of the store function and use the captured references inside the actions, the way
the other stores do.

**TDD.** `plan.nuxt`: claim and resign emit no Vue warning (spy on `console.warn`).

**Affected.** `app/stores/plan.ts`.

## Catch-up amounts

**Problem.** A transaction billed into an already-closed period (ADR-015 catch-up: a straggler order transacted after the period's first run) is linked to the household's existing invoice, but the invoice `amount` stays at its creation value and the period's stored aggregates stay at the first run's values. The accountant CSV is built from `invoice.amount` (`useBillingValidation.ts` `generateCsvRow`), so the straggler reaches the CSV as a version bump with unchanged figures; the public page shows the mismatch as `invoiceSum` ≠ `transactionSum`.

**Root cause.** `server/utils/generateBilling.ts` `processBillingPeriod`: `totalAmount`, `householdCount`, `ticketCount` are written only by `createBillingPeriodSummary` (`:144-151`); an existing summary is reused as is (`:139-142`); households with an existing invoice skip `createInvoices` (`:164-183`) and only get transactions linked (`:195`). No write touches `Invoice.amount` or the summary after creation.

**Solution.** After linking, in the same `processBillingPeriod` call:
- `addToInvoiceAmount(d1, invoiceId, delta)` for each household that already had an invoice (delta = Σ of the transactions linked now).
- `addToBillingPeriodTotals(d1, summaryId, {totalAmount, householdCount: newInvoices.length, ticketCount})` for an existing summary.
Both are increments of exactly the transactions linked in this run; a transaction is linked once (unbilled → invoiced), so a re-run adds nothing (ADR-015). `bumpBillingPeriodVersion` stays as it is; the v2 CSV and the `BILLING_PERIOD_UPDATED` mail then carry the corrected figures. Two repository functions in `financesRepository.ts` (`prisma.invoice.update` / `prisma.billingPeriodSummary.update` with `increment`).

**TDD.**
- `tests/e2e/api/serial/admin/maintenance.e2e.spec.ts`: after the first billing, transact one more order in the same period (order → consume → daily maintenance), run billing again → the household's invoice `amount` and the period's `totalAmount` / `ticketCount` include it, `version` is 2, `invoiceSum` = `transactionSum` on the period detail.
- Unit: none new — the arithmetic is the repository increment; the control sums (`useBilling` `controlInvoices` / `controlTransactions`) already assert equality.

**Affected.** `server/utils/generateBilling.ts`, `server/data/financesRepository.ts`, the serial maintenance spec, `docs/adr-compliance-backend.md` (Admin – Billing row).

## Job schedule labels

**Problem.** `/admin/system` labels the monthly billing job "D. 17. hver måned kl. 04:00" (`app/composables/useMaintenance.ts:45`), `app/app.config.ts:43` describes it as "D. 18. hver måned kl. 04:00 (dagen efter cutoff)", and the job runs `0 3 18 * *`: the 18th at 03:00 UTC, 05:00 in summer time and 04:00 in winter time. The daily jobs carry the same winter-only clock times ("kl. 02:00", "kl. 03:00" for 01:00 / 02:00 UTC).

**Root cause.** One schedule, written in five places — `wrangler.toml` `[triggers] crons` in the three environment blocks, `nuxt.config.ts` `nitro.scheduledTasks`, `app.config.ts` `theslope.systemJobs` — and labelled in two: `useMaintenance` `jobScheduleLabels` and `systemJobs[].description`.

**Solution.** `app/config/systemJobs.ts`, a plain module (the `notificationTemplates.ts` pattern): per job its cron and its Danish label with the UTC time and the Copenhagen summer/winter times. `nuxt.config.ts` builds `scheduledTasks` from it, `app.config.ts` spreads it into `theslope.systemJobs`, `useMaintenance` labels read it. The three `wrangler.toml` `crons` lists stay per environment block (TOML).

**Mockup.** Text only, on the job cards and the job-run table of `/admin/system` — ⏳ awaiting signoff:

```
Månedlig fakturering    D. 18. hver måned kl. 05:00 (sommertid) / 04:00 (vintertid)
```

**TDD.** Unit: every `systemJobs` cron is a key of `scheduledTasks` and appears in each `wrangler.toml` `crons` list (parsed with wrangler's own config reader); `useMaintenance` labels equal the module's labels.

**Affected.** `app/config/systemJobs.ts` (new), `nuxt.config.ts`, `app/app.config.ts`, `app/composables/useMaintenance.ts`, `docs/adr-compliance-frontend.md` (`useMaintenance` row).

## Mobile overflow left by the alert token

Measured 2026-09-16 at 375×812 with `tests/e2e/ui/MobileViewport.e2e.spec.ts` and a per-element probe, after every `<UAlert>` moved
onto `ALERTS` (ADR-018).

| Finding | Where | Note |
|---|---|---|
| `UTable` wrapper scrolls wider than the phone | `/admin/users` (576px), `/admin/system` job history (1596px) | mail and result columns cut off |
| `span.truncate` clips a long URL by 273px | `/admin/system` settings tree (`holidayUrl`) | a tree cell |
| 3px document overflow while the skeleton renders | `/dinner`, `UPageCard` inner `p-4 sm:p-6` | the repro's `scrollWidth <= innerWidth` sits on the edge on `/dinner` |
| Layout inside an alert's `#description` (flex rows, `<ul>`, badges, selectors) | `AllergyManagersList`, `AllergyDetailPanel`, `ActionPreview`, `HouseholdCard`, `UserProfileCard`, `pages/admin/allergies/pdf.vue` | `wrap-anywhere` wraps text; each row needs its own responsive classes or an extraction like `DinnerModeLegend.vue` |

## Configuration duplication

Observed 2026-09-16, re-checked 2026-09-18. Report only.

| Where | Duplication |
|---|---|
| `wrangler.toml` | the D1 block and `[triggers] crons` in each environment block (wrangler environments inherit no bindings) |
| `wrangler.toml`, `workers/sender/wrangler.toml`, `Makefile`, worker secrets | queue names, the compatibility date, host names (routes, `DEPLOY_URL`), and the dev test mailbox (`allowed_destination_addresses` and the two mailbox secrets); consistent on 2026-09-18 |
| `Makefile` | the Heynabo login body inlined in eight targets (`theslope-login-*`, `heynabo-login-*`, the event targets) beside the `theslope_call` / `heynabo_call` macros |
| `package.json` | every `db:seed:*` / `db:migrate:*` script names its D1 database |
| `.github/workflows/cicd.yml` | `HEY_NABO_*` mapped in the job env (line 35) and again in the smoke step (line 231) |
| `server/integration/heynabo/heynaboClient.ts`, `server/integration/github/githubClient.ts` | two config mechanisms: `process.env` (lines 23–24) and `useRuntimeConfig()` (line 95) |
