# Bug Fix Plan: v0.9 Bug Sprint — shipped

**Status:** Shipped, archived 2026-10-06
**Date:** 2026-08-19
**Branches:** B0–B4 on the fix/bug-sprint branches (git history); B5 with PR #166/#167; the booking one-path batch on `feature/work-roster` (approved 2026-10-06)
**Parents:** [release-plan-v0.9.md](../proposals/release-plan-v0.9.md) · [release-0.9.0.md](../this-pr/release-0.9.0.md)

Moved out on archival: B6 → [chores-0.9.1.md](../chores-0.9.1.md) (the Order
snapshot package, schema in the Prisma bundle); billing delivery report + interrupted job runs →
[bug-fix-billing-delivery-report.md](../this-pr/bug-fix-billing-delivery-report.md).

## Fixes

- **B0 — Chef refresh**: `plan.ts` chef-refresh fix, shipped with release-plan M0 (0.8.3).
- **B2 — Heynabo inhabitant lifecycle** (2026-08-19): inhabitants reconcile globally by `heynaboId @unique` —
  `resolveInhabitantImportPlan` in `useHeynabo.ts` decides, `heynaboImportService.ts` executes; chef-loss lives
  once in `server/utils/removeChefRole.ts` (remove-role endpoint, admin inhabitant delete, import delete path);
  rules in ADR-013 § Household & Inhabitant Lifecycle. Specs: `useHeynabo.unit.spec.ts`,
  `removeChefRole.unit.spec.ts`, `inhabitant.e2e.spec.ts`, serial `heynabo.e2e.spec.ts`.
- **B3 — Allergies catalog empty**: catalog on `useAsyncData` + `useRequestFetch`, `isInitialized` checks data
  presence (`app/stores/allergies.ts`); the shared status-computed helper continues as the Store fetcher factory
  package ([feature-proposal-framework-adoption.md](../this-pr/feature-proposal-framework-adoption.md)).
- **B4 — Allergy edit errors**: closed with B3 and the AdminAllergies rework (PR #166); reopens on a repro.
- **B5 — Holidays on new season**: shipped with the #166/#167 holiday rework — `commitHolidays` validates against
  `holidaysSchema`, holidays chronological via `sortDateRanges` (`useSeasonValidation.ts`); create-mode
  auto-recalc of defaults is intended. Thin spot: no BDD e2e for create → add holiday → save.
- **B1 — Grid booking save** (2026-10-05): one `buildDesiredOrder`/`buildDesiredOrders` in `useBooking.ts` feeds
  grid save, grid preview and day form; toasts share `toastScaffoldResult` (`COLOR.error` when `errored > 0`).
  The e2e red run showed the true severity: a power save over a guest-only dinner returned 200 and silently
  changed the guest ticket's mode.
- **Grid cell guest display** (2026-10-05): `findRegularOrder` in `useBooking.ts` is the read path's matching
  rule — grid cells, power consensus and the per-inhabitant count badges exclude guest tickets.
- **B1 (continued) — guest orders on the one path** (2026-10-06): `buildGuestDesiredOrder(s)` +
  `buildBookingChanges` in `useBooking.ts`; grid guest cells editable with drafts keyed by guest group (a guest
  ticket carries the booker's `inhabitantId`, so the inhabitant key collides); the day form's guest branch builds
  through the shared builder.
- **Power mode includes guests** (2026-10-06): power changes everyone in one go, guest bookings included; a
  differing guest shows as no consensus and the power toggle resolves it. `getPowerChanges` + `getPowerConsensus`
  in `useBooking.ts` (composing `computeConsensus` from `useHousehold`) are the sole power scope and consensus
  for both views; both hand-written versions deleted. Known wrinkle: a guest group with no resolvable price is
  skipped silently on a power save (`buildGuestDesiredOrder` returns `[]`).
- Booking batch gates: serial booking e2e 7/7 (power test asserts the guest ticket carries the family's mode),
  254 component tests across the touched specs, `pre:all` clean; compliance rows updated per fix. Rule 6 debt
  (pre-existing): `DinnerBookingForm.nuxt.spec.ts` still mocks the households/allergies/auth stores.

## Dropped

- **Order uniqueness** (release-plan I3, 2026-10-05): zero duplicate regular orders in all envs, B1 unifies the
  builders; an index adds write cost and a new runtime failure mode.

## Decisions

**2026-10-06**
- Power mode changes everyone in one go, guest bookings included; consensus counts guests.
- Day view is a one-column grid: both views carry the SAME functionality — shared functions, never two parallel
  implementations.
- Guest orders on the one path is part of B1's consolidation, not a separate package.

**2026-10-05**
- Shipped fixes compacted to pointers; B1 folded in from its own doc (file removed); B4 closed with B3.
- B5 closed — shipped with the #166/#167 holiday rework; create-mode auto-recalc is intended behaviour.
- No sprint ordering: each fix its own package behind its own brief, parallel where files are disjoint (one e2e
  runner at a time); dependencies only.
- Order uniqueness dropped (above).

**2026-08-19** (B2)
- No mass-delete guard: an empty Heynabo member list deletes every inhabitant (explicit scenario covers it).
- Synthetic `heynaboId`s resolve by design: any inhabitant Heynabo doesn't know is deleted on the next import.
- Chef attribution on past dinners dropped (`chefId → null`); duty roster (`DutyHistory`) owns attribution history.
- Delete-consistency verdicts closed: stale `DinnerEventAllergen` (chef-owned curation), `Order.bookedByUserId →
  null` (schema `.nullable()`, payer in `userSnapshot`), `OrderHistory.performedByUserId → null` (renders
  'System'), emptied roster roles (fold into `removeChefRole`).

## Proposals sweep (2026-10-05)

- chef-swap's known issue (`/dinner` chef portrait not updating) — fixed by Phase 2.5 (`bookings.ts` reactive-key
  `loadDinnerEventDetail`; code-verified).
- Motion tokens and dinner-page follow-ups — parked rows in release-0.9.0 § Package inventory.
- "Job schedule labels" (dinner-page follow-ups) joins the Notifications package when the reminder crons land.
- duty-roster, waitlist, adhoc-admin-billing, mobile-native-feel, framework-adoption — no open defects.
