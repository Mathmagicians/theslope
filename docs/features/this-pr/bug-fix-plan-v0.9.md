# Bug Fix Plan: v0.9 Bug Sprint

**Status:** Accepted
**Date:** 2026-08-19
**Updated:** 2026-10-05 — shipped fixes compacted to pointers; B1 folded in from `bug-fix-booking-desired-order-builder.md`; B5 closed; remaining fixes run as parallel packages
**Branch:** remaining fixes ship on `feature/work-roster` (shipped fixes: branches in git history)
**Parents:** [release-plan-v0.9.md](../proposals/release-plan-v0.9.md) · [release-0.9.0.md](release-0.9.0.md)

## Fix inventory

| Fix | What | Status |
|---|---|---|
| B0 — Chef refresh | `plan.ts` chef-refresh on claim/resign | ✅ shipped (release-plan M0, 0.8.3) |
| B2 — Heynabo inhabitant lifecycle | member deleted in Heynabo survives in TheSlope (allergy views) | ✅ shipped 2026-08-19 |
| B3 — Allergies catalog empty | `/admin/allergies` intermittently shows no data | ✅ shipped |
| B4 — Allergy edit errors | errors editing in `/admin/allergies` | ✅ closed with B3 (2026-10-05) |
| B1 — Grid booking save | "fejlede" toast despite 200s; day view works | ✅ implemented 2026-10-05 — user commit pending |
| Grid cell guest display | a cell and the power consensus show a guest ticket's mode | ✅ implemented 2026-10-05 — e2e guard closed 2026-10-06, user commit pending |
| B1 (continued) — guest orders on the one path | guest mode editable in day view only; grid hardcodes guest cells to view | ✅ implemented 2026-10-06 — user commit pending |
| Power mode includes guests | power changes everyone in one go, guest bookings included; consensus counts guests | ✅ implemented 2026-10-06 — user commit pending |
| B5 — Holidays on new season | errors adding holidays in create mode | ✅ closed 2026-10-05 — shipped with the #166/#167 holiday rework |
| B6 — Kitchen portions | 0 portions when `ticketPriceId` is null | ⏳ this PR — "Order snapshot" package in [release-0.9.0.md](release-0.9.0.md); detail in [bug-fix-order-snapshot.md](../bug-fix-order-snapshot.md) |
| Order uniqueness | duplicate regular orders per inhabitant + dinner (release-plan I3) | dropped 2026-10-05 — zero duplicates in all envs, B1 unifies the builders, an index adds write cost + a failure mode |
| Billing delivery report | run reports count only what the displayed run did | **OPEN** decisions — section below |
| Interrupted job runs | a run whose request dies stays RUNNING | **OPEN** — section below |

## Shipped (pointers)

- **B0** — `plan.ts` chef-refresh fix, shipped with release-plan M0.
- **B2** — Inhabitants reconcile globally by `heynaboId @unique`: `resolveInhabitantImportPlan` in `useHeynabo.ts` decides
  the four buckets, `heynaboImportService.ts` executes them; the per-household reconciliation is deleted. Chef-loss handling
  lives once in `server/utils/removeChefRole.ts` (callers: `remove-role.post.ts`, admin inhabitant delete, import delete path).
  Lifecycle rules are canonical in ADR-013 § Household & Inhabitant Lifecycle. Specs: `useHeynabo.unit.spec.ts` (10 plan
  scenarios), `removeChefRole.unit.spec.ts`, `inhabitant.e2e.spec.ts`, serial `heynabo.e2e.spec.ts`. Signoff 2026-08-19.
- **B3** — Catalog fetch converted to `useAsyncData` + `useRequestFetch`, `isInitialized` checks data presence
  (`app/stores/allergies.ts`; compliance row ✅). The SSR-fragile pattern is documented in
  [archived/bare-fetch-fix.md](../archived/bare-fetch-fix.md); the shared status-computed helper continues as the Store
  fetcher factory package ([feature-proposal-framework-adoption.md](feature-proposal-framework-adoption.md), release-0.9.0).
- **B4** — Never reproduced as its own defect; the bare-`$fetch` mutation path it pointed at went with B3's conversion and
  the AdminAllergies master/detail rework (PR #166, 41 component tests). Closed; reopens on a fresh report with repro.

## This PR — parallelization

No sprint ordering. Each fix is its own package behind its own brief; packages with disjoint files run as
parallel agents, one e2e runner at a time sequences their suites. The only constraints are dependencies:

| Package | Blocked by |
|---|---|
| Grid cell guest display | nothing — unblocked (`BookingGridView.vue` only) |
| B6 schema | the Prisma bundle model sign-off |
| B6 resolver fallback | the bundle migration applied (`Order.orderSnapshot` + backfill) |
| Billing delivery report | its two OPEN decisions; lands before Adhoc + EXPENSE writes the ledger |
| Interrupted job runs | its OPEN option; shares surfaces with the billing report (`JobRun`, job history) — one package or sequenced |

## DRY principles (governing the remaining fixes)

Every bug in this sprint exists because the same logic was written more than once and the copies drifted.
**Each fix must delete the divergent copies — never add another variant.**

| Rule | One source of truth | Fixes |
|------|---------------------|-------|
| One snapshot pattern | ADR-011 live-first fallback (Transaction's pattern; Order gets frozen `ticketType`) | B6 |
| DRY tests | Factories + `describe.each` per [testing.md](../../testing.md); no copy-paste setup | all |

Shipped rules (global reconciliation, one chef-loss routine, one store fetch pattern) live in the pointers above.

---

## B1 — Grid booking save ✅ implemented 2026-10-05 (user commit pending)

One module-level pure `buildDesiredOrder` + list form `buildDesiredOrders` in `useBooking.ts` feed all three
intent→order sites: `HouseholdBookings.handleGridSave`, the `BookingGridView` preview (which now shares its draft
`BookingIntent[]` with the `save` emit) and `DinnerBookingForm`'s inhabitant/power rows; guest creation keeps its
own builder. The builder matches regular orders only (`!isGuestTicket`), prices by age on the dinner date and skips
with `null` when no price resolves. The grid, day and guest toasts share `toastScaffoldResult` (`COLOR.error` when
`scaffoldResult.errored > 0`). The e2e red run showed the true severity: a power save over a guest-only dinner
returned 200 / `errored: 0` and silently flipped the guest ticket's mode. Specs: `useBooking.nuxt.spec.ts` (6
builder cases), week-grid guest e2e in `tests/e2e/ui/serial/HouseholdBookings.e2e.spec.ts`, day-view guard green,
`pre:all` clean. Pricing note: preview/day-form new bookings price by age on the dinner date (was: today).
Compliance rows updated.

---

## Grid cell guest display

**Problem.** An inhabitant's grid cell and the power consensus show a guest ticket's mode when the inhabitant
holds no regular order (why B1's e2e power toggle started from DINEIN).
**Root cause.** Three read-path lookups in `BookingGridView.vue` match orders without filtering `isGuestTicket`:
`getServerMode` (`:179`, feeds every cell and the power consensus), `getOrderForCell` (`:398`) and
`getOrderCountsForInhabitant` (`:405`, guest tickets inflate the per-inhabitant counts) — the display-side twin
of the save bug B1 fixed. "The regular order for (inhabitant, event)" exists as a rule only inside
`buildDesiredOrder`; the read path re-derives it unfiltered. Day view is clean (`DinnerBookingForm.vue:275`
reads through `regularOrders`). Found during B1 (2026-10-05).
**Solution.** One exported regular-order lookup in `useBooking.ts`, used by `buildDesiredOrder` and the three
display helpers — read and write paths share the same matching rule; no local patches.
**TDD.** Red component cases: a guest-only cell renders NONE / neutral consensus; guest tickets excluded from the
inhabitant counts; B1's e2e stays green (it asserts orders, not cells).
**Affected.** `app/composables/useBooking.ts`, `app/components/booking/BookingGridView.vue`,
`BookingGridView.nuxt.spec.ts`, `useBooking.nuxt.spec.ts`.

---

## B1 (continued) — guest orders on the one path ✅ implemented 2026-10-06 (user commit pending)

Part of B1's one-builder consolidation (decision 2026-10-06). `buildGuestDesiredOrder` / `buildGuestDesiredOrders`
sit next to `buildDesiredOrder` in `useBooking.ts`; `buildBookingChanges` is the single regular+guest merge read by
the grid preview and `handleGridSave` (one scaffold call per save, scoped to the dinners the orders touch); grid
guest cells follow `effectiveFormMode` with the inhabitant cells' locking, drafts keyed by guest row (the
inhabitant key collides with the booker's own cell); the day form's guest branch builds through the shared
builder. Specs: 4 builder unit cases, 5 grid guest-cell cases, 3 day-view guest-save cases
(`DinnerBookingForm.nuxt.spec.ts`), week-grid guest-edit e2e in the serial booking spec (7/7); `pre:all` clean.
Rule 6 debt (pre-existing, untouched): the day-form spec still mocks the households/allergies/auth stores.

---

## Power mode includes guests

**Decision (2026-10-06).** Power mode changes everyone in one go — guest bookings included ("if you invited a
guest and everyone takes takeaway, you don't want extra clicks for the guest bookings"). A differing guest shows
as no consensus, and the power toggle resolves it. **Day view is a one-column grid: the two views carry the SAME
functionality, so power scope and consensus are one shared function consumed by both — never two parallel
implementations.**
**Implemented 2026-10-06.** `getPowerChanges` (power scope: one intent per inhabitant, one guest intent per
guest group on the dinner) and `getPowerConsensus` (consensus over the same targets, composing `computeConsensus`
from `useHousehold`) live in `useBooking.ts`; the grid (`handlePowerUpdate`, `getEventConsensus` with drafts as
overrides) and the day form (power branch of `buildDesiredOrdersForRow`, power-row consensus) are the only
consumers — both hand-written versions deleted, grep-verified. Guest drafts key by the group's first order id.
Specs: grid 34, day 14, `useBooking` power cases; serial e2e 7/7 with the power test renamed to assert the guest
ticket carries the family's mode; `pre:all` clean. Known wrinkle: a guest group with no resolvable price is
skipped silently on a power save (`buildGuestDesiredOrder` returns `[]`).

---

## B5 — Errors adding holidays to a new season ✅ closed 2026-10-05

Shipped with the #166/#167 holiday rework: `CalendarDateRangeListPicker` commits through `commitHolidays`
(validated against `holidaysSchema` before the model) and holidays stay chronological via `sortDateRanges` in the
picker and the serializer (`useSeasonValidation.ts:81,121`). Create-mode auto-recalc of defaults on a
`seasonDates` change (`AdminPlanning.vue` watch) is intended behaviour. Coverage:
`CalendarDateRangeListPicker.nuxt.spec.ts` (add, chronological insert, overlap reject, remove, row edit,
edit-overlap reject, disabled — 13 cases), `useSeasonValidation.unit.spec.ts` (refines, formats, serializer order).
Known thin spot: no BDD e2e for create → add holiday via UI → save → persisted; reopens on a fresh report with repro.

---

## B6 — Kitchen portions (pointer)

Detail in [bug-fix-order-snapshot.md](../bug-fix-order-snapshot.md); packaged as "Order snapshot" in
[release-0.9.0.md](release-0.9.0.md) § Package inventory. `Order.orderSnapshot` (frozen `ticketType`)
plus the backfill ride the single Prisma bundle migration; the `useOrder.ts` portion fallback follows
the bundle. High priority in this PR: the waitlist resolver fits queue entries by portion weight, so a
0-portion order mis-fits the sweep.

---

## Billing delivery report

**Problem.** The monthly billing card, the job history and the toast count what the displayed run did
(`formatMonthlyBillingStats` in `useMaintenance.ts`). On prod, the CI smoke run 697 (2026-09-18 23:39) archived seven periods and
queued the September mail, then its request ended at the test's 30 s timeout and its `JobRun` holds no `resultSummary`. Runs 698
and 699 report the two remaining archives and nothing; `Delivery` holds the September mail with `jobRunId` 697.
**Root cause.** A run's report is the job's in-memory result, stored by `completeJobRun` when the run completes
(`monthlyBillingService.ts`). `Delivery` is read by the job's own decision only (`fetchDeliveries` in `syncBillingPeriod`).
**Solution.** The repository fills the delivery state on every read:
- `BillingPeriodSummaryDisplay` / `Detail` carry `delivered: DeliveredVersions` (the highest version per kind,
  `useDeliveryValidation.ts`). `fetchBillingPeriodDeliveries(d1, subjectId?)` in `financesRepository.ts` feeds the list, id and
  token reads in `prismaRepository.ts`: one query for all `BILLING_PERIOD` rows, grouped with `groupBy` from `batchUtils.ts`.
- `JobRunDisplay` carries `delivered: {ARCHIVE, EMAIL, SMS}`, the run's deliveries through the `JobRun → Delivery` relation
  (`fetchJobRuns` in `maintenanceRepository.ts`).
- `syncBillingPeriod` decides from `summary.delivered`; `fetchDeliveries` goes.

**Stored run summary — OPEN.** In `periods[]`, the period fields, `csvUploaded` / `emailSent`, `archive.archived` / `key` and
`notification.queued` / `dedupeKey` repeat the period row and `Delivery`. `results` and the failures (`archive.degraded`,
`notification.degraded`, `archive.archived: false`) exist there only. Proposal: the job stores `{results, failures}`, and the
monthly endpoint returns the periods re-read through the repository.
**Card — OPEN.** The card, the job history's Resultat and the toast keep their text; a change starts as a mockup signed off on its
own, in a UX package.
**TDD.** API specs: `GET /api/admin/billing/periods` gives each period its delivered versions; `GET /api/admin/maintenance/job-run`
gives a monthly run its deliveries per kind; after a monthly run every closed period's delivered versions equal its version, and a
second run leaves the same state.
**Affected.** `useBillingValidation.ts`, `useMaintenanceValidation.ts`, `financesRepository.ts`, `prismaRepository.ts`,
`maintenanceRepository.ts`, `monthlyBillingService.ts`.

## Interrupted job runs — OPEN

**Problem.** A run whose request ends before `completeJobRun` stays `RUNNING`: prod run 697 (2026-09-18 23:39). The job history
lists it as running.
**Options.** The next run of the same job marks a `RUNNING` run older than a limit as `FAILED`; or the job history shows such a run
as "afbrudt".

---

## Proposals sweep (2026-10-05)

Every proposal in `this-pr/` checked for open defects:

- **chef-swap** known issue — `/dinner` chef portrait not updating after volunteering — is fixed by Phase 2.5
  (`bookings.ts` reactive-key `loadDinnerEventDetail`; code-verified).
- **Motion tokens** and **dinner-page follow-ups** are parked rows in release-0.9.0 § Package inventory
  ([bug-fix-motion-tokens.md](../bug-fix-motion-tokens.md), [bug-fix-dinner-page-and-dates.md](../bug-fix-dinner-page-and-dates.md)).
- "Job schedule labels" (dinner-page follow-ups) joins the Notifications package when the reminder crons land
  ([feature-proposal-notification-triggers.md](feature-proposal-notification-triggers.md) § Trigger catalog).
- duty-roster, waitlist, adhoc-admin-billing, mobile-native-feel, framework-adoption — no open defects;
  framework workarounds belong to the research spike.

## Decisions

**2026-10-05**
- Shipped fixes compacted to pointers; B1 folded in from its own doc (file removed); B6 stays in
  [bug-fix-order-snapshot.md](../bug-fix-order-snapshot.md) as the Order snapshot package's detail doc.
- B4 closed with B3 — reopens on a fresh report with repro.
- Order uniqueness dropped: zero duplicate regular orders in all envs, B1 unifies the client builders; an
  index adds write cost and a new runtime failure mode.
- B5 closed — shipped with the #166/#167 holiday rework; create-mode auto-recalc of default holidays is intended behaviour.
- No sprint ordering: each fix is its own package behind its own brief; packages with disjoint files run as parallel
  agents (one e2e runner at a time). Dependencies only — see This PR — parallelization.

**2026-08-19** (B2)
- No mass-delete guard: Heynabo is the backend; an empty member list deletes every inhabitant (explicit scenario covers it).
- Synthetic `heynaboId`s resolve by design: any inhabitant Heynabo doesn't know is deleted on the next import.
- Chef attribution on past dinners dropped (`chefId → null`); duty roster (`DutyHistory`) owns attribution history.
- Delete-consistency verdicts closed: stale `DinnerEventAllergen` (chef-owned curation), `Order.bookedByUserId → null`
  (schema `.nullable()`, payer in `userSnapshot`), `OrderHistory.performedByUserId → null` (renders 'System'),
  emptied roster roles (fold into `removeChefRole`).

## Exit criteria

All new E2E/unit tests green with `--workers=4`, `npm run pre:all` passes, compliance tables updated,
and each fix has *removed* the duplicated logic it replaced.
