# Bug fix: dinner dates and the dinner page

**Status:** Proposed | **Date:** 2026-09-18 | **Branch:** bugfix/admin-ux

Four defects found on 2026-09-18 while chasing a team-assignment failure and a "become chef" error on `/dinner`. All four
exist on `main`. The first has a one-line fix in place; the rest are proposals.

## Fix inventory

| Fix | What | State |
|---|---|---|
| Stored dinner dates | one convention for the midnight a dinner date carries | matcher fixed; storage convention proposed |
| Query params synced in one flush | the second auto-sync overwrites the first param | proposed |
| Dinner page remounts on claim | the whole page swaps to the loader while the season refreshes | proposed |
| Composables after an await | the plan store injects outside setup on every claim and resign | proposed |

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
