# Feature Proposal: Framework adoption — stores, pages and dependency majors

**Status:** Store fetcher factory and Fetch gating shipped 2026-10-07; Page composition OPEN; dependency majors split (framework pair shipped, Prisma + zod in the Prisma bundle) | **Date:** 2026-10-04 | **Updated:** 2026-10-07 (compacted) | **Branch:** `feature/work-roster`

The Nuxt 4.5 toolchain upgrade shipped on `chore/npm-dependencies` (`../archived/npm-dependencies-nuxt4_5-upgrade.md`).
This proposal holds the adoption work on top of it. Packages are signed off one at a time in chat; the user runs
installs and database commands.

## Package inventory

| Package | What | Status |
|---|---|---|
| Store fetcher factory + alignment | every fetch in a store through `useApiHandler().storeAsyncData` / `apiRequest` | ✅ shipped 2026-10-07 (`33a3567`) |
| Fetch gating + selection-driven datasets + stale-selection recovery | `enabled`, `dependsOn`, `notFound` on the factory; no copy refs, no page-level store init | ✅ implemented 2026-10-07, user commit pending |
| Page composition | master/detail and tab frames, the `isMd` source | **OPEN** — the one package left here |
| Dependency clusters | majors beyond Nuxt 4.5 | framework pair ✅ shipped 2026-10-05; Prisma 7.10 + zod 4.6 in the Prisma bundle (`release-0.9.0.md` § Signed model set); TS 7 / @types/node 26 / h3 2 wait |

## Store fetcher factory + alignment — shipped

`useApiHandler()` owns the one request path (ADR-007 as amended): `storeAsyncData(key, url, {schema, default,
errorMessage?, ...options})` types a dataset by its Zod schema over the captured `useRequestFetch` and parses in
`transform`; `apiRequest(url, {action, errorMessage?, schema?, ...fetchOptions})` carries writes and one-shot reads;
both report through `handleApiError`. Zero new composables (decision 2026-10-07). Six component fetch sites moved
into stores (`AdminEconomy`, `HouseholdEconomy`, the dinner page, `HouseholdSettings`, `HelpButton` as a plain
`apiRequest` action, `OrderHistoryDisplay` keeping its per-row subscription over a store method); toasts live with
the fetch they report; `tests/component/architecture/fetchUsage.unit.spec.ts` fails any other `$fetch` under `app/`;
`users.ts` gained its first spec; the empty `tickets.ts` and the dead `apiCall` are gone. Operation calls
(save/activate season, create team, maintenance, billing, Heynabo import) are plain actions with running/result
refs — the keyed `useAsyncData`-around-a-POST shape shared the first store instance's closure.

## Fetch gating + selection-driven datasets + stale-selection recovery — implemented

The thirteen gated reads put their condition on `enabled` and read `idle` while it is false; the store's ready flag
counts the datasets it requests. Datasets key on the real selection (`planStore.selectedSeasonId`,
`householdsStore.selectedHouseholdId`, the bookings store's own ids) with constant keys and refetch on a url watch;
the component watches that copied a selection into a store ref, the bookings copy refs and `load*` setters for
them, `initPlanStore` / `initHouseholdsStore` and every page-level call are deleted. `selectedSeasonId` is
`computed(() => userChoice ?? getDefaultSeasonId())` (`plan.ts:166` unchanged as the rule);
`selectedHouseholdId` is `computed(choice ?? myHousehold.id)`. `dependsOn: [datasets]` makes a fetcher await its
upstream datasets, so the server renders dependent chains and the default season's data is in the first paint;
`household/[shortname]/[tab].vue` prefetches the selected household so the page renders with its data.

**Nuxt facts the factory encodes** (`node_modules/nuxt/dist/app/composables/asyncData.js`, 4.5.2): a new key is
seeded with the previous key's data (`:131-140`), so the factory clears a dataset to its default and `idle` when its
gate closes — that is also the logout clear for the login-gated households list; a key changing mid-render reads
`undefined` on the server (`:170`), hence constant keys; `enabled` false→true does not fetch by itself (`:153-155`),
so the factory watches the gate and the url; a closed gate after `dependsOn` drops the pending promise and goes idle
before throwing, or the render waits on itself (`:371-373`); the server runs the fetcher and reads the gate after the
dependencies, since no watcher runs there.

**Stale-selection recovery** (principle: wrong data is never shown or guessed around). `notFound: {recover?,
retries? = 1, toast?, message?}` — texts are a string or a getter resolved at use time; `message` defaults to `toast`,
`toast` to 'Kan ikke finde det, du leder efter'. On a 404 the factory counts, shows the toast, awaits the store's
`recover` (drop the choice, refresh what it derives from) and ends the dead request idle so the re-derived url fetches
once; at `retries` it renders the error page (`ViewError.vue`, one action: "starte forfra" to `/` — a back button
would re-request the deleted entity); a success resets the count; a retry never re-requests the dead url.
Allocation: selected season `retries: 1` (`Kan ikke finde sæsonen <shortName>`, page `seasonGone`), selected
household `retries: 1` (`Kan ikke finde husstanden <shortName>`, the existing `household` set), dinner detail `retries: 0`
(`Kan ikke finde middagen`, `dinnerGone`); billing period, invoice and allergy type keep the plain
"Kan ikke finde …" toast. The page lines live in `EMPTY_STATE_MESSAGES`; `handleApiError`'s 404 default is the shared
text and its log prints the resolved message.

**Specs.** Factory: gate, `dependsOn`, clear-on-close, recovery with the request-count proof (`retries + 1`, never
the dead url twice); store specs per store (idle while unrequested, logout empties the households list, selection
defaults and choices, recovery per site); design-system contexts; serial e2e: `AdminEconomy` (SSR assertions),
`HouseholdBookings`, `DinnerBookingForm` (a deleted dinner → next dinner without reload; stepping back → the error
page; a deleted season → the toast and the active season).

**Hydration structure fixes (decided 2026-10-07: the server and the client render the same structure, viewport
differences live in CSS; every error met is fixed).** `UserListItem.vue:137` picks the avatar group's `max` from
`isMd` (3 phone / 5 desktop), so the server — `isMd` is `false` there, set in `onMounted` — renders a different DOM than
the desktop client: 7 mismatch lines at 1280 px, 0 at 375 px. Fix: one `max` on both sides, the phone fit through
CSS; the remaining `isMd` injectors are audited for prop switches in server-rendered content and reported. Every
toast renders twice because `app.vue`'s `UApp` mounts a toaster and `layouts/default.vue:57` mounts a second: the
layout's `<UToaster />` goes, and the e2e toast assertion returns from `.first()` to a count.

## Page composition — OPEN

**Findings.** `/chef` and `/dinner` build the same master/detail frame in the page (`UPage :ui="LAYOUTS.masterDetailPage"`
+ `#left`, four lines each, `chef/index.vue:269-271`, `dinner/index.vue:234-236`); `/admin/[tab]` (7 tabs) and
`/household/[shortname]/[tab]` (5 tabs) repeat the chain tabs array → `defineAsyncComponent` map → `useTabNavigation`
→ `UTabs`; `layouts/default.vue` measures `md` with a hidden element and provides `isMd` (`default.vue:26-47`),
injected by 12 components and the design system.

Stable surfaces only (decision 2026-10-05, no experimental features): typed layout props (4.4), `useLayout()` (4.5),
`useBreakpoints` + `ssrWidth` (`@vueuse/core`, re-added by the package that first imports it).

| Topic | Recommendation | Alternative |
|---|---|---|
| Two-pane frame | leave — the token owns the shape, the pages' differences dominate the four shared lines; a `MasterDetailPage` component when a third two-pane page lands | a `MasterDetailPage` component now |
| Tab scaffolding | a `TabbedPage` component owning the chain (props `tabs`, `basePath`, `additionalParams`, the component map; the page keeps `#content`) | leave — two hand-kept copies |
| `isMd` source | `useBreakpoints(breakpointsTailwind).greaterOrEqual('md')` in the layout, keeping the `provide('isMd')` seam so the 12 components and `mountWithTooltipProvider` stay untouched; deletes the hidden element and listener | keep the element — reads the real CSS breakpoint; the hydration mismatch stays |

`provideSSRWidth` is a separate decision: a guessed desktop first paint versus today's phone-first paint; wrong-guess
clients flip after hydration either way. Both `isMd` options leave the mismatch for server-rendered prop switches unless
the server and the first client paint agree on a width.

**Coverage.** `Chef.e2e.spec.ts`, `household.e2e.spec.ts`, `admin.e2e.spec.ts`; visual check: `/chef`, `/dinner`,
`/admin/*`, `/household/*` render identically.

## Dependency clusters

Spike 2026-10-05 (`npm view`, `npm audit`, vendor changelogs, generator source reads). Verdicts:

| Cluster | Contents | Status |
|---|---|---|
| Framework pair | `pinia` 4.0.3 + `@pinia/nuxt` 1.0.2, `ical-generator` 11.1.2; `@vueuse/core` removed (unused) | ✅ shipped 2026-10-05, zero source changes |
| Prisma + zod one-go | `prisma` + `@prisma/client` + `@prisma/adapter-d1` 7.10.0 pinned (npm `latest` is an 8-RC, out of scope), `zod` 4.6.5, `zod-prisma-types` 3.3.11 | the Prisma bundle — `release-0.9.0.md` § Signed model set is the contract |
| Deferred | `typescript` 7 (waits for `vue-tsc` on TS 7.1), `@types/node` 26 (waits for Node 26), `h3` 2 (with Nuxt 5) | wait |

**Prisma 7 reference for the bundle.** The TypeScript client is the default (`provider = "prisma-client"`, `output`,
ESM; Workers a named target); prerequisites met (ESM package, Node 24, TS 5.9, driver adapters at the three
`new PrismaClient` sites). Work: `prisma.config.ts`, the generator block, delete `previewFeatures =
["strictUndefinedChecks"]` (default in 7 — the 27 `Prisma.skip` sites stay, ADR-012), the removed `--schema`/`--url`
flags in the Make targets. Since 7.10.0 the D1 adapter runs parameter-chunked statements in one transaction with
rollback. Workarounds kept: manual ID chunking (`heynaboImportService.ts:51/155/238`, `financesRepository.ts:838/1471`)
until an e2e run proves 7.10 covers it; raw SQL joins (`financesRepository.ts:941` — `relationJoins` unavailable on
D1); `createManyAndReturn`.

**zod-prisma-types gate.** 3.3.11 declares `prisma ^4–^7` and `zod ^3.25 || ^4`; its one Prisma 7 break (issue #363,
`JsonValue` import) is emitted only for `Json` fields, which this schema has none of; the package is in maintenance
mode. Proof is mechanical: `make d1-prisma` + `npm run pre:all` green. Fallback and standing simplification
candidate: a hand-rolled enum layer — the app consumes 13 enum schemas and no model schemas from the 13.7k-line file.

**zod 4 migration surface.** 6 `invalid_type_error`/`required_error` lines (`useBookingValidation.ts:718/722`,
`useDateRangeValidation.ts:15-16`, `useCoreValidation.ts:275/278`) → the `error` param; 2 enum-keyed `z.record`
(`useNotificationValidation.ts:69`, `useBillingValidation.ts:40`) → `z.partialRecord` where sparse; `z.coerce`,
`.refine`, `.transform`, `z.union`, `z.lazy`, `safeParse` unchanged. Evaluation candidate after the upgrade:
`z.codec` for ADR-010's serialize/deserialize pairs.

**Nuxt.** `enabled` stable since 4.5.0, `createUseAsyncData` gains an `addons` extension point in 4.6 — the surface
the factory builds on is invested in, not deprecated. nuxt/nuxt#34385 (gates the ADR-017 `nuxt typecheck` follow-up)
is open with its fix author reporting the bug gone on current Nuxt 4; one `nuxt typecheck` run on this branch
verifies it, until then `ts:server` targets `server/tsconfig.json`. npm audit: 15 high, dev/build chains only, none in
the Worker bundle.

## ADR notes

- ADR-007 amended 2026-10-07: `useApiHandler().storeAsyncData` / `apiRequest` are the store's read and write paths;
  `enabled` gates and reads idle; datasets read selections through getters and declare `dependsOn`; `notFound`
  recovers once and renders the error page; `fetchUsage.unit.spec.ts` enforces the path.
