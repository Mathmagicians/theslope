# Feature Proposal: Framework adoption — stores, pages and dependency majors

**Status:** stores shipped; Page composition OPEN; majors split | **Date:** 2026-10-04 | **Updated:** 2026-10-07 | **Branch:** `feature/work-roster`

Adoption work on top of the Nuxt 4.5 upgrade (`../archived/npm-dependencies-nuxt4_5-upgrade.md`). Packages are signed
off one at a time in chat; the user runs installs and database commands.

## Package inventory

| Package | What | Status |
|---|---|---|
| Store fetcher factory + alignment | every fetch in a store through `useApiHandler().storeAsyncData` / `apiRequest` | ✅ shipped `33a3567` |
| Fetch gating, selection-driven datasets, stale-selection recovery | `enabled`, `dependsOn`, `notFound` on the factory; no copy refs, no page-level store init | ✅ shipped `d6fe721` |
| Hydration structure fixes | same structure on server and client; one toaster | ✅ implemented 2026-10-07, user commit pending |
| Page composition | master/detail and tab frames, the `isMd` source | **OPEN** |
| Dependency clusters | framework pair ✅ shipped 2026-10-05; Prisma 7.10 + zod 4.6 in the Prisma bundle (`release-0.9.0.md` § Signed model set); TS 7 / @types/node 26 / h3 2 wait | split |

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

## Page composition — OPEN

**Findings.** `/chef` and `/dinner` build the same master/detail frame in the page (`UPage :ui="LAYOUTS.masterDetailPage"`
+ `#left`, four lines each); `/admin/[tab]` and `/household/[shortname]/[tab]` repeat the chain tabs array →
`defineAsyncComponent` map → `useTabNavigation` → `UTabs`; `layouts/default.vue` measures `md` with a hidden element
and provides `isMd` (`default.vue:26-47`), injected by 12 components and the design system — `false` on the server
until `onMounted`.

Stable surfaces only (decision 2026-10-05): typed layout props (4.4), `useLayout()` (4.5), `useBreakpoints` +
`ssrWidth` (`@vueuse/core`, re-added by the package that first imports it).

| Topic | Recommendation | Alternative |
|---|---|---|
| Two-pane frame | leave — the token owns the shape, the pages' differences dominate the four shared lines; a `MasterDetailPage` component when a third two-pane page lands | a `MasterDetailPage` component now |
| Tab scaffolding | a `TabbedPage` component owning the chain (props `tabs`, `basePath`, `additionalParams`, the component map; the page keeps `#content`) | leave — two hand-kept copies |
| `isMd` source | `useBreakpoints(breakpointsTailwind).greaterOrEqual('md')` in the layout, keeping the `provide('isMd')` seam so the 12 components and `mountWithTooltipProvider` stay untouched; deletes the hidden element and listener | keep the element — reads the real CSS breakpoint |

`provideSSRWidth` is a separate decision: a guessed desktop first paint versus today's phone-first paint; wrong-guess
clients flip after hydration either way.

**Coverage.** `Chef.e2e.spec.ts`, `household.e2e.spec.ts`, `admin.e2e.spec.ts`; visual check: `/chef`, `/dinner`,
`/admin/*`, `/household/*` render identically.

## Dependency clusters

Spike 2026-10-05. Framework pair shipped (pinia 4.0.3 + @pinia/nuxt 1.0.2, ical-generator 11.1.2, zero source
changes; `@vueuse/core` removed as unused). Prisma 7.10 pinned (npm `latest` is an 8-RC, out of scope) + zod 4.6.5 +
`zod-prisma-types` 3.3.11 are the Prisma bundle's majors — contract and work list in `release-0.9.0.md` § Signed model
set; fallback for the maintenance-mode generator: a hand-rolled enum layer (13 enum schemas consumed, no model
schemas). Deferred: `typescript` 7 (waits for `vue-tsc` on TS 7.1), `@types/node` 26 (waits for Node 26), `h3` 2
(with Nuxt 5). One verification left: nuxt/nuxt#34385 (gates the ADR-017 `nuxt typecheck` follow-up) — its fix author
reports it gone on current Nuxt 4; one `nuxt typecheck` run on this branch settles it.

## ADR notes

- ADR-007 amended 2026-10-07: `storeAsyncData` / `apiRequest` are the store's read and write paths; `enabled` gates
  and reads idle; datasets read selections through getters and declare `dependsOn`; `notFound` recovers once and
  renders the error page; `fetchUsage.unit.spec.ts` enforces the path.
