# Feature Proposal: Framework adoption — stores, pages and dependency majors

**Status:** ✅ shipped (stores, gating, hydration fixes, the breakpoint source, the framework pair); page composition decided 2026-10-13, the remaining majors in `../chores-0.9.1.md` | **Date:** 2026-10-04 | **Updated:** 2026-10-13 | **Branch:** `feature/work-roster`

Adoption work on top of the Nuxt 4.5 upgrade (`npm-dependencies-nuxt4_5-upgrade.md`). Packages are signed
off one at a time in chat; the user runs installs and database commands.

## Package inventory

| Package | What | Status |
|---|---|---|
| Store fetcher factory + alignment | every fetch in a store through `useApiHandler().storeAsyncData` / `apiRequest` | ✅ shipped `33a3567` |
| Fetch gating, selection-driven datasets, stale-selection recovery | `enabled`, `dependsOn`, `notFound` on the factory; no copy refs, no page-level store init | ✅ shipped `d6fe721` |
| Hydration structure fixes | same structure on server and client; one toaster | ✅ shipped 2026-10-07 |
| Page composition | master/detail and tab frames | decided 2026-10-13: the frames stay; the `isMd` source ✅ shipped `8d98269` |
| Dependency clusters | framework pair ✅ shipped 2026-10-05; Prisma 7.10 + zod 4.6 in the Prisma bundle (`../this-pr/release-0.9.0.md` § Signed model set); TS 7 / @types/node 26 / h3 2 in `../chores-0.9.1.md` | split |

## Shipped — pointers

**Store fetcher factory + alignment.** `app/composables/useApiHandler.ts`: `storeAsyncData(key, url, {schema,
default, errorMessage?, enabled?, dependsOn?, notFound?, ...options})` and `apiRequest(url, {action, errorMessage?,
schema?, ...fetchOptions})` — ADR-007 as amended holds the contract; `tests/component/architecture/fetchUsage.unit.spec.ts`
enforces it. Decisions: zero new composables; toasts live with the fetch they report; `HelpButton` posts through
`apiRequest` from the component; `OrderHistoryDisplay` keeps its per-row subscription over a store method. Specs:
`useApiHandler.nuxt.spec.ts`, the five store specs (`users.nuxt.spec.ts` new).

**Fetch gating, selection-driven datasets, stale-selection recovery.** Thirteen gated reads on `enabled`, idle while
unrequested; datasets key on the real selection with constant keys (`planStore.selectedSeasonId =
userChoice ?? getDefaultSeasonId()`, `householdsStore.selectedHouseholdId = choice ?? myHousehold.id`, the bookings
store's own ids); `initPlanStore` / `initHouseholdsStore`, the component copy watches and the bookings copy refs are
gone; `dependsOn` renders dependent chains on the server; a closing gate clears the dataset (also the logout clear);
`household/[shortname]/[tab].vue` prefetches the selected household. Recovery: `notFound: {recover?, retries? = 1,
toast?, message?}` — selected season and household `retries: 1`, dinner detail `retries: 0`; toasts "Kan ikke finde
<entity> <id>", error-page lines from `EMPTY_STATE_MESSAGES` (`seasonGone`, `dinnerGone`, the existing `household`);
the error page's one action is "starte forfra" to `/`. Specs: factory (incl. the request-count proof `retries + 1`),
the store specs, serial e2e `AdminEconomy` (SSR assertions), `HouseholdBookings`, `DinnerBookingForm`.

**Hydration structure fixes.** Principle: the server and the client render the same structure, viewport differences
live in CSS. `UserListItem` binds `COMPONENTS.avatar` instead of switching on `isMd`; the layout's second toaster is
gone (`UApp` keeps the one). Guards: `UserListItem.nuxt.spec.ts`, three hard-load cases in the serial
`HouseholdBookings` e2e asserting no "Hydration" console line at 1280 px. The `isMd` audit over 25 routes found no other
`isMd`-driven mismatch.

**Mismatches met, not `isMd`** (same count at both widths): `/chef` 19 lines (the `Toaster` provider and the `UTabs`
list — "fewer child nodes"), `/dinner` 2 (`DinnerDetailPanel`), `/admin/allergies` and the household allergies tab 1
each without detail. Next fix under the same principle, on the user's go.

## Page composition — decided 2026-10-13

The frames stay as they are: `/chef` and `/dinner` build the master/detail frame in the page on `LAYOUTS.masterDetailPage`, `/admin/[tab]` and `/household/[shortname]/[tab]` keep their tab chains, and `provideSSRWidth` stays off. A `MasterDetailPage` component is the move when a third two-pane page lands. The `isMd` source shipped (`8d98269`): the design system is the one reader of the breakpoint.

## Dependency clusters

Framework pair shipped 2026-10-05 (pinia 4 + @pinia/nuxt 1, ical-generator 11; `@vueuse/core` removed as unused); Prisma 7.10, zod 4.6 and `zod-prisma-types` 3.3 rode the Prisma bundle. The three remaining majors wait on upstream and sit in `../chores-0.9.1.md` § Dependency clusters, with the `nuxt typecheck` gate (clean on this branch 2026-10-13).

## ADR notes

- ADR-007 amended 2026-10-07: `storeAsyncData` / `apiRequest` are the store's read and write paths; `enabled` gates
  and reads idle; datasets read selections through getters and declare `dependsOn`; `notFound` recovers once and
  renders the error page; `fetchUsage.unit.spec.ts` enforces the path.
