# Feature Proposal: Framework adoption — stores, pages and dependency majors

**Status:** Proposal | **Date:** 2026-10-04

The Nuxt 4.5 toolchain upgrade ships on `chore/npm-dependencies` (`npm-dependencies-nuxt4_5-upgrade.md`). This proposal
holds the adoption work that builds on it: the store fetcher factory, fetch gating, page composition and the dependency
majors. Packages are signed off one at a time in chat; the user runs installs and database commands.

## Package inventory

| Package | What | Status |
|---|---|---|
| Store fetcher factory | `useApiHandler().storeAsyncData` wraps `useAsyncData`: schema-driven types, `useRequestFetch` baked in; `apiRequest` for writes and one-shot reads | ✅ implemented 2026-10-07 — fine-tuning with the user |
| Fetch gating | the `enabled` option carries the fetch condition; a gated dataset reads as idle | ✅ approved 2026-10-07 — after the factory |
| Page composition | master/detail and tab pages, the `md` breakpoint | OPEN |
| Dependency clusters | majors beyond the Nuxt 4.5 branch | Framework pair approved 2026-10-05 (runs first); Prisma + zod ride the Prisma bundle; TS 7 / @types/node 26 / h3 2 wait |

The factory lands first; Fetch gating converts the gated datasets onto it, so each dataset is touched once.

## Store fetcher factory

**Problem.** Thirty keyed `useAsyncData` calls across the five stores (`plan` 12, `bookings` 7, `allergies` 5, `households` 5,
`users` 1) each hand-repeat the same three options: a `useRequestFetch` fetcher, a Zod-parse `transform` and a `default`.
The dataset's declared type (`useAsyncData<Season[]>`) and its transform are two hand-kept claims.
**Solution.** `storeAsyncData` in the existing `app/composables/useApiHandler.ts` (zero new composables, decision 2026-10-07): a typed wrapper over `useAsyncData` that
captures `useRequestFetch` in the store's setup and takes `(key, url, {schema, default, ...options})`. The data type is
inferred from the schema (`schema: ZodType<T>`), so the compile-time type and the runtime parse share one source — the
validation composable's schema (ADR-001). Remaining `AsyncDataOptions` (`watch`, `immediate`, `lazy`, `enabled`) pass
through. The factory is the blessed shape of the SSR-friendly store pattern (ADR-007); the ADR gains the amendment.
`createUseAsyncData` (Nuxt 4.4) bakes static defaults only, so the wrapper owns the per-call schema coupling.

The package also closes the error-handling seams the error floor (`plugins/apiErrors.client.ts` +
`resolveUncaughtApiError`) leaves open: the factory surfaces read-path 401s to the floor, the per-store
try/catch + `handleApiError` blocks collapse into one mutation wrapper, the caller-less `apiCall` and its
spec cases are deleted, and an architecture rule fails any bare `$fetch(` under `app/` so the sanctioned
fetch path is mechanical, not remembered.

**API** ⏳ awaiting signoff

```ts
const {data: seasons, status, error, refresh} = storeAsyncData(
    'plan-store-seasons', '/api/admin/season',
    {schema: SeasonSchema.array(), default: () => []}
)
// detail dataset: reactive key and url, null default
const {data: selected} = storeAsyncData(
    () => `season-${selectedId.value}`, () => `/api/admin/season/${selectedId.value}`,
    {schema: SeasonSchema, default: () => null})
```

**Scope.** This package converts the ungated datasets (~17); the 13 gated fetchers convert in Fetch gating, on top of the
factory.
**TDD.** A unit spec for the composable; the store specs stay the specification; `allergies.ts` converts first (full
specs), then `plan`, `bookings`, `households`, `users`, each with a green spec run between.
**Affected.** `app/stores/*`, one new composable with its unit spec, `docs/adr.md` (ADR-007 amendment),
`docs/adr-compliance-frontend.md` store rows.

## Fetch gating

**Problem.** Thirteen `useAsyncData` fetchers skip their request by returning an empty value:
`plan.ts:62`; `bookings.ts:52`, `:402`, `:584`, `:625`; `households.ts:49`, `:81`; `allergies.ts:68`, `:123`;
`OrderHistoryDisplay.vue:27`, `AdminEconomy.vue:83`, `HouseholdEconomy.vue:61`, `pages/dinner/index.vue:150`. A skipped fetch resolves:
the dataset reports `success` with `null` or `[]`.
**Framework.** Nuxt 4.5 `enabled`: while it is `false`, `execute` returns the current data and the status stays
(`node_modules/nuxt/dist/app/composables/asyncData.js:326`); switching it to `false` mid-flight aborts the request and sets the status
to `idle` (`asyncData.js:153-160`). The data stays.
**Solution.** The fetcher fetches; `enabled` carries the condition through `storeAsyncData`. The status computeds read
`idle` with `enabled` `false` as "idle"; the store's ready flag counts the datasets it requests. Logout clears the gated
household list (`clearNuxtData`). `allergies.ts` goes first (two gated datasets, full specs); the other eleven follow.
**Decided 2026-10-07 (approved).** The 13 gates are two shapes with fixed rules: **id in the key** (selected
season/household/allergy type, dinner and order detail) — the key swap lands on the `default` when the id goes
null, empty like today, nothing extra; **login gate with a constant key** (the households list shape) — `enabled`
alone would keep the previous user's data in memory, so logout clears every login-gated dataset (`clearNuxtData`),
mandatory and spec-asserted. The ready flag counts only the datasets the store requests; no new public status
flags unless a consumer needs one. Starts after the Store fetcher factory lands (every conversion is two lines on
`storeAsyncData`).
**TDD.** Store specs per converted store: the dataset fetches when its condition holds, reports idle while it does
not, shape-2 datasets empty on logout, and the store reports ready correctly in both states.
**Affected.** The files above, `docs/adr.md` (ADR-007 amendment), `docs/adr-compliance-frontend.md` store rows.

## Page composition — OPEN

**Findings.**
- `/chef` and `/dinner` build the same master/detail frame in the page: `UPage :ui="LAYOUTS.masterDetailPage"`, `CalendarMasterPanel`
  in `#left`, `DinnerDetailPanel` with `#hero`, `#team`, `#stats` (`pages/chef/index.vue:2-5`, `pages/dinner/index.vue:34-37`).
- `/admin/[tab]` (7 tabs) and `/household/[shortname]/[tab]` (5 tabs) each hold a tab list, an async-component map,
  `useTabNavigation` and a `UTabs`.
- `layouts/default.vue` measures the `md` breakpoint with a hidden `#breakpoint-md` element and provides `isMd` (`default.vue:47`);
  12 components and `useTheSlopeDesignSystem` inject it.

**Framework features.**
- Typed layout props (Nuxt 4.4): `definePageMeta({layout: {name, props}})`, typed from the layout's `defineProps`.
- Named layout slots (Nuxt 4.5, experimental runtime opt-in `experimental.typescriptPlugin: true` with
  `dxup: {features: {namedLayoutSlots: true}}`): a page's top-level `<template #name>` fills the layout's named slot.
- `useLayout()` (Nuxt 4.5): the resolved layout of the current route.
- `useBreakpoints(breakpointsTailwind)` from `@vueuse/core` (not installed — the package that first imports it
  adds the dependency; decision 2026-10-05).

**Options.**

| Topic | A | B | C |
|---|---|---|---|
| Master/detail (`/chef`, `/dinner`) | `layouts/master-detail.vue` with a named `master` slot (experimental named layout slots) | a `MasterDetailPage` component holding the `UPage` frame | the pages keep the frame |
| Tab pages (`/admin`, `/household`) | a `TabbedPage` component taking the tab list and a header slot | a layout with typed props for the tab list and named slots for the header | the pages keep their tabs |
| `md` breakpoint | `useBreakpoints(breakpointsTailwind).greaterOrEqual('md')` in the design system, `ssrWidth` for SSR | the layout keeps the element and `provide` | — |

The rendered pages stay the same in A and B; the visual check covers `/chef`, `/dinner`, `/admin/*` and `/household/*`.

### Research (spike, 2026-10-05)

Framework feature status (nuxt.com/blog/v4-4, v4-5; npm registry dates):

| Feature | Since | Status |
|---|---|---|
| `useAsyncData`/`useFetch` `enabled` | Nuxt 4.5.0 (2026-07-18) | Stable |
| `createUseAsyncData` / `createUseFetch` | Nuxt 4.4 (4.4.2, 2026-03-12) | Stable |
| Typed layout props | Nuxt 4.4 | Stable |
| `useLayout()` | Nuxt 4.5.0 | Stable |
| Named layout slots | Nuxt 4.5.0 | Experimental — double opt-in `experimental.typescriptPlugin: true` + `dxup: {features: {namedLayoutSlots: true}}`; the runtime behaviour rides on the TS plugin |
| `useBreakpoints` (`@vueuse/core`) | versioned docs back to v8 (2022) | Stable |
| `ssrWidth` / `provideSSRWidth` | `@vueuse/core` 12.1.0 (2024-12-22, PR #4317) | Stable |

Nuxt 5 (opt-in `future.compatibilityVersion: 5`; Nitro 3 + H3 v2; community estimate Q4 2026) reorganises the
data-fetching internals and adds experimental handler-chunk extraction; the 4.4/4.5 release posts carry no deprecation
of the `useAsyncData` option surface, and `enabled` is the surface's newest stable addition. **Conclusion:** `enabled`
and `createUseAsyncData` are safe to build on; named layout slots are premature (experimental, two flags, shipped
2026-07).

#### Two-pane frame

The shared frame is `UPage :ui="LAYOUTS.masterDetailPage"` + `<template #left>` — four template lines per page
(`chef/index.vue:269-271`, `dinner/index.vue:234-236`); the design-system token already owns the shape. `/dinner`
renders three `UPage` states (no season / season / loading), `/chef` one; the pages' differences dominate the shared
lines.

**Recommendation:** C (leave); revisit as a `MasterDetailPage` component when a third two-pane page lands.

| Option | Pros | Cons |
|---|---|---|
| A — layout + named `master` slot | one frame definition; page templates shrink | experimental double-flag feature; `/dinner`'s three-state frame fights one layout; layout swap re-mounts between framed and plain pages |
| B — `MasterDetailPage` component | stable Vue; one frame definition | a component layer over ~4 lines wrapping one `UPage` and one slot |
| C — leave | zero change; the token carries the shape | the frame stays written twice |

#### Tab scaffolding

Both pages repeat the mechanical chain — tabs array → `defineAsyncComponent` map → `tabItems` → `useTabNavigation` →
`UTabs` with the sticky-list `:ui`. They diverge inside `#content`: `/admin` gates on the plan store, renders the
readonly banner and binds `?season=`; `/household` resolves `?pbs=`, computes `canEdit`/admin override and passes
per-component props.

**Recommendation:** A (a `TabbedPage` component owning the chain; props `tabs`, `basePath`, `additionalParams`, the
component map — dynamic `import()` globs stay per page — and the page keeps the `#content` scoped slot). The layout
route needs a named slot for the per-tab content, which drags the experimental feature in.

| Option | Pros | Cons |
|---|---|---|
| A — `TabbedPage` component | stable; deletes the chain's second copy; page logic stays in the page via `#content` | the component map passes as a prop (bundler-visible `import()` globs live per page) |
| B — layout with typed props | typed layout props stable since 4.4 | the content slot needs named layout slots — experimental; a layout adds a second indirection over `[tab].vue` |
| C — leave | zero change | two hand-kept copies of the chain |

#### `isMd` source

| Approach | Mechanics | SSR + first paint | Breakpoint source |
|---|---|---|---|
| Layout element (today) | hidden `#breakpoint-md`, `offsetParent` check, resize listener, `provide('isMd')` (`layouts/default.vue:26-47`) | `false` on the server and until `onMounted`; the first client paint renders the phone branch, desktop flips after mount | the live stylesheet — a `--breakpoint-md` override in `main.css` is picked up |
| `useBreakpoints(breakpointsTailwind).greaterOrEqual('md')` | `matchMedia`; without a DOM element or listener bookkeeping | without `ssrWidth`: `false` on the server, updates after hydration — the first paint of today. With `provideSSRWidth(n)`: server and first paint render as an `n`-px viewport; clients on the other side flip after hydration | `breakpointsTailwind` constants (md = 768 px) — a theme override diverges silently |

In both approaches the server guesses; only the CSS `md:` classes are correct at first paint — `isMd` drives prop
switches. `useBreakpoints` is years-mature (versioned docs from v8, 2022); `ssrWidth` landed in 12.1.0 (2024-12-22);
installed 14.4.0 carries both. The repo holds zero `@vueuse` imports today; this would be the first.

**Recommendation:** A — `useBreakpoints` in the layout, keeping the `provide('isMd')` seam, so the 12 injecting
components and `mountWithTooltipProvider`'s `isMd` parameter stay untouched. `provideSSRWidth` is a separate decision:
it trades the universal phone-first paint for a guessed width.

| Option | Pros | Cons |
|---|---|---|
| A — `useBreakpoints` in the layout, same `provide` | deletes the hidden element, resize listener and measurement code; `matchMedia` fires exactly on the boundary; components and specs untouched | md = 768 px constant beside the CSS theme; first `@vueuse` usage |
| A + `provideSSRWidth` | a desktop-guess first paint is possible | wrong-guess clients flip after hydration — a guess either way |
| B — keep the element | reads the real CSS breakpoint; zero change | hidden DOM element, manual listener, measurement lands after mount |

## Dependency clusters — OPEN

Spike of 2026-10-05 on this branch: `npm view` dist-tags, `npm audit`, vendor changelogs (prisma.io/changelog,
zod.dev/v4, nuxt.com/blog, github release pages), generator source reads under `node_modules/zod-prisma-types`.
Nuxt roadmap evidence lives under Page composition → Research and under Nuxt option surface below.

### Majors

| Package | Installed | Latest (date) | Against this repo |
|---|---|---|---|
| `prisma` / `@prisma/client` / `@prisma/adapter-d1` | 6.19.3 | 7.10.0 (2026-08-25); the `latest` npm tag of `prisma` points at 8.0.0-rc.20 (2026-10-05), so installs pin `7.10` explicitly | generator rewrite, `prisma.config.ts`, ESM — details below |
| `zod` | 3.25.76 | 4.6.5 (2026-09-13) | 8 code sites — details below |
| `zod-prisma-types` | 3.3.11 | 3.3.11 (2026-01-24) | the gate — details below |
| `pinia` + `@pinia/nuxt` | 3.0.4 / 0.11.3 | 4.0.3 / 1.0.2 (2026-08-12) | ESM-only; `@vue/devtools-api` becomes a peer; the store API is unchanged and public migration reports show zero source change (github.com/vuejs/pinia/releases); the pair upgrades together (`@pinia/nuxt` 1.0.2 requires `pinia ^4.0.3`) |
| `@vueuse/core` | 14.4.0 | 15.0.0 (2026-09-16) | v15 drops `templateRef` (Vue 3.5 `useTemplateRef`), Node 20 and the deprecated timer options (github.com/vueuse/vueuse/releases/tag/v15.0.0) — the repo holds zero `@vueuse` imports, so the bump is version-only; engines `^24.21.0` holds |
| `typescript` | 5.9.3 | 7.0.2 (2026-07-08) | TS 7 is the Go-native compiler; the JS compiler API is gone and `vue-tsc` 3.3.x loads it, so `npm run ts*` crashes (github.com/vuejs/language-tools/discussions/6121); TS 7.1 (`next` is 7.1.0-dev) carries the programmatic API Vue tooling waits for |
| `@types/node` | 24.19.1 | 26.6.4 (2026-10-01) | tracks Node 26 (26.0.0, 2026-06-19); engines pin `node ^24.21.0` — the types follow the runtime |
| `ical-generator` | 10.2.0 | 11.1.2 (11.0.0, 2026-06-02) | v11's breaking change is dropping Node 20/23 (sebbo2002/ical-generator CHANGELOG); one call site, `server/routes/api/calendar/feed.ts` |
| `h3` (dev) | 1.15.11 | 2.0.1 | h3 v2 arrives with Nuxt 5 / Nitro 3; pinned until then |

### Prisma 7

Released 2025-11-19 (prisma.io/blog/announcing-prisma-orm-7-0-0); the line sits at 7.10.0 (2026-08-25).

- The Rust-free TypeScript client is the default: `provider = "prisma-client"`, required `output`, ESM; Prisma claims
  90% smaller bundles and 3× query execution and names Cloudflare Workers as a target (`prisma-client-js` still runs
  on 7, flagged for removal).
- Met already: `"type": "module"` in package.json, Node ≥20.19 (engines `^24.21.0`), TS ≥5.4 (5.9.3), a driver adapter
  at each of the three `new PrismaClient` sites (`server/utils/database.ts`, `settingsRepository.ts`,
  `allergyRepository.ts`).
- `strictUndefinedChecks` graduates to the default: the `previewFeatures` flag goes, and ADR-012's `Prisma.skip`
  data-object pattern is v7's native behaviour; the ADR-012 WHERE-clause rule stays.
- `@prisma/adapter-d1` carries the npm `latest` tag at 7.10.0; since 7.10.0 parameter-chunked statements run in a
  transaction and roll back when a later chunk fails (github.com/prisma/prisma/releases/tag/7.10.0; adapter chunking
  for D1's 100-bind-value limit exists since 5.15.0).
- Partial indexes: the `partialIndexes` preview lands in 7.4.0 (prisma.io/changelog/2026-02-11) — `where` on
  `@unique`/`@@unique`/`@@index`, SQLite among the supported databases — and stays a preview flag in the v7 docs
  (prisma.io/docs/orm/v7/prisma-schema/data-model/indexes). This repo's migrations hold plain indexes only; nothing
  here waits on it.
- Upgrade work: `prisma.config.ts` at the root (the CLI's config home), the generator block, re-checking the Make
  targets (`--schema`/`--url` CLI flags are removed, the post-install generate is gone — `make d1-prisma` already calls
  `prisma generate` explicitly), client middleware and metrics are removed (unused here).

Workarounds per version (sites in this repo):

| Workaround (ADR) | Sites | On Prisma 7 |
|---|---|---|
| `previewFeatures = ["strictUndefinedChecks"]` (ADR-012) | `prisma/schema.prisma:9` | deleted — default behaviour; the 27 `Prisma.skip` sites (`server/data/prismaRepository.ts`, `financesRepository.ts`, `maintenanceRepository.ts`) stay as written |
| Manual ID chunking for `updateMany`/`deleteMany` WHERE IN (ADR-014) | `server/utils/heynaboImportService.ts:51`, `:155`, `:238`; `server/data/financesRepository.ts:838`, `:1471` | kept until an e2e run on the branch proves 7.10's chunk handling covers it |
| Raw SQL JOINs for unbounded nested includes (ADR-014) | `server/data/financesRepository.ts:941` (`$queryRawUnsafe`) | kept — `relationJoins` stays unavailable on SQLite/D1 and the query splitter's `WHERE fk IN (…)` meets the same 100-bind limit (prisma/orm#23743 open) |
| `createManyAndReturn` bulk inserts (ADR-014) | `server/data/financesRepository.ts`, `prismaRepository.ts` | kept — supported on SQLite in 7 |

Prisma 8: 8.0.0-rc.20 (2026-10-05), accumulating breaking changes — collection `.take`/`.skip` become
`.limit`/`.offset`, Postgres date columns return Temporal values — and it runs on the Prisma 7 schema. The ecosystem's
production line is 7.10.

**Recommendation:** upgrade to 7.10 in one package with zod 4 (both rewrite the generated layer), pinned against the
8-RC `latest` tag.

| Option | Pros | Cons |
|---|---|---|
| 7.10 now, with zod 4 | smaller Worker bundle, `Prisma.skip` as default, transactional chunking, one regeneration | `prisma.config.ts` + generator rewrite; regeneration runs through a maintenance-mode generator |
| Stay on 6.19 | zero work | the 6 line ages under an 8-RC `latest` tag; the `deepmerge-ts` advisory stays either way |
| Wait for 8 | one migration | the RC accumulates breaking changes; `zod-prisma-types` has no 8 support |

### zod-prisma-types — the gate

- Latest 3.3.11 (2026-01-24, npm). Peer range `prisma ^4–^7`, `zod ^3.25 || ^4` (verified via `npm view
  zod-prisma-types@3.3.11 peerDependencies`); its dependencies are `@prisma/dmmf` / `@prisma/generator-helper` /
  `@prisma/client-runtime-utils` `^7.3.0` and `zod ^4.3.6`. The 3.3.6–3.3.10 run (2025-11-26, a week after Prisma 7)
  fixes Prisma 7 bugs; 3.3.0 (2025-09-30) adds zod 4 output.
- README (github.com/chrishoermann/zod-prisma-types): "Due to time constraints, this package will only receive
  critical bug fixes and essential updates" and points new projects at `prisma-zod-generator`.
- Open issue #363: generated `JsonValue` import from the moved `runtime/library` path. Verified at generator source:
  the import is written only when the DMMF carries `Json` fields
  (`node_modules/zod-prisma-types/dist/functions/writeSingleFileImportStatements.js:13-16`,
  `dmmf.schema.hasJsonTypes`); `prisma/schema.prisma` has no `Json` or `Decimal` field, so the break misses this
  schema. Issue #362 (Prisma 7 support) is closed.
- 3.3.11 branches on the new generator (`isPrismaClientGenerator`) and takes the library import path from the
  `prismaLibraryPath` config, so the `prisma-client` generator is a supported target; the generated file's `Prisma`
  type import follows the generator's `prismaClientPath` option.
- The app consumes 13 enum schemas from the generated layer (`SystemRoleSchema` … `OrderAuditActionSchema`) and zero
  model schemas; the file is 13.7k lines.

**Gate verdict: OPEN.** 3.3.11 declares and builds against Prisma 7 + zod 4, and the one known Prisma 7 break misses
this schema. The proof is mechanical: `make d1-prisma` + `npm run pre:all` green on the upgrade branch. Prisma 8 is
out of range.

**Recommendation:** run the one-go on a branch with `zod-prisma-types` 3.3.11; the hand-rolled enum layer is the
fallback and the standing simplification candidate (it removes the generator from `make d1-prisma`).

| Option | Pros | Cons |
|---|---|---|
| Keep `zod-prisma-types` 3.3.11 | declared Prisma 7 + zod 4 support; zero change in the validation composables | maintenance mode; last release 2026-01; no Prisma 8 path |
| `prisma-zod-generator` 3.3.1 (2026-08-21) | active; requires Prisma 7+, zod ≥3.25 <5, dual v3/v4 output | different generated API — the ADR-001 generated layer and its import sites rewrite |
| Hand-rolled enum layer | the consumed surface is 13 `z.enum` schemas; the 13.7k-line file and the generator go | the enums sync with `schema.prisma` by hand (an architecture test can diff them against the DMMF); amends ADR-001 |
| Stay on zod 3 + Prisma 6 | zero work | both lines age; the error-param style zod 4 removes keeps spreading |

### zod 4

Latest 4.6.5 (2026-09-13). Package layout: installed zod 3.25.76 ships the `zod/v4` subpath (since 3.25.0, 2025-05-19)
and `zod@4` keeps `./v3` and `./v4` subpaths — staged migration is available from both sides, and the composables and
generated layer import plain `zod`, so the direct jump converts one import universe.

Migration surface from the composable scan (`app/composables/*.ts`):

| Pattern | Count | zod 4 |
|---|---|---|
| `invalid_type_error` / `required_error` | 6 lines (`useBookingValidation.ts:718`, `:722`; `useDateRangeValidation.ts:15-16`; `useCoreValidation.ts:275`, `:278`) | the unified `error` param replaces them (zod.dev/v4/changelog) |
| `z.record(EnumSchema, V)` | 2 (`useNotificationValidation.ts:69`, `useBillingValidation.ts:40`) | enum-keyed records become exhaustive; sparse `TicketCountsByTypeSchema` moves to `z.partialRecord`, the exhaustive-by-design `templates` stays |
| `z.coerce.*` | 52 | kept — the input type widens to `unknown` |
| `.refine` / `.transform` / `z.union` / `z.preprocess` / `z.lazy` / `safeParse` | 15 / 16 / 9 / 1 / 1 / 7 | kept |
| `z.nativeEnum`, `.passthrough`, `errorMap`, `.deepPartial`, string-format method chains | 0 | the removals cost nothing here; the generated layer already emits `z.enum([...])` |

Performance (zod.dev/v4): 14.7× string / 7.4× array / 6.5× object parsing, 100× fewer `tsc` instantiations, core
5.36 kB — the parse-heavy store `transform`s and the `ts:*` gates both gain. Features that fit the remove-workarounds
philosophy: the unified `error` param, top-level formats (`z.email()`), `z.prettifyError`, recursive types with full
inference (the `z.lazy` site), and codecs (`z.codec`, zod 4.1, 2025-08) — bidirectional transforms with the exact
shape of ADR-010's serialize/deserialize pairs, an evaluation candidate after the upgrade. Nuxt UI validates through
Standard Schema, which zod 4 implements.

**Recommendation:** ship zod 4 inside the Prisma one-go — regenerate the layer, convert the 8 sites, run the suites.

### Nuxt option surface and nuxt/nuxt#34385

- `enabled` ships stable in 4.5.0 (nuxt.com/blog/v4-5); `createUseAsyncData` / `createUseFetch` gain an `addons`
  extension point in 4.6 (nuxt/nuxt#35797, merged 2026-09-26, milestone 4.6; the `nuxt-nightly` `latest` tag is a
  4.6.0 build) — the option surface is where the 4.x line invests, and the 4.4/4.5 posts carry no deprecation of it.
- The nightly channel publishes a `5x` tag (5.0.0 builds); Nuxt 5 rides the opt-in `future.compatibilityVersion: 5`
  path documented in the 4.x release posts.
- Named layout slots stay experimental in 4.5 behind `experimental.typescriptPlugin` +
  `dxup.features.namedLayoutSlots` (nuxt.com/blog/v4-5).
- nuxt/nuxt#34385 (`nuxi typecheck` misses `server/types/` ambient declarations; gates the ADR-017 `nuxt typecheck` /
  `vue-tsc -b` follow-up) is open; the fix PR nuxt/nuxt#35195 is open with label 5.x, and its author reports the bug
  gone on current main and Nuxt 4 (comment 2026-07-28, maintainer confirmation pending). Verification is one
  `nuxt typecheck` run on this branch; until it is green, `ts:server` targets `server/tsconfig.json`.

### Clusters and order

| Cluster | Contents | Verdict | Gate |
|---|---|---|---|
| Framework pair | `pinia` 4 + `@pinia/nuxt` 1, `@vueuse/core` 15, `ical-generator` 11 | adopt now — first, small, each verifiable alone | `npm run pre:all` + unit suite per bump |
| Prisma + zod one-go | `prisma` + `@prisma/client` + `@prisma/adapter-d1` 7.10.0 (pinned), `zod` 4.6, regeneration via `zod-prisma-types` 3.3.11, `prisma.config.ts`, generator block, the 8 composable sites | adopt now — second, owns the generated layer | `make d1-prisma` + `npm run pre:all` green; `npm run test:e2e:api` covers the ADR-014 chunking rows |
| Deferred | `typescript` 7 (waits for `vue-tsc` on TS 7.1), `@types/node` 26 (waits for the Node 26 runtime move), `h3` 2 (arrives with Nuxt 5) | wait | upstream releases |

The store factory and fetch gating packages build on Nuxt 4.5 surfaces and touch no package in these clusters; the
clusters and the adoption packages order freely around each other.

### npm audit

2026-10-05, this branch: 15 high, three roots, dev/build chains only — `braces` (via
`micromatch`/`fast-glob`/`globby`), `deepmerge-ts` <8 via `@prisma/config` (the dependency range spans `prisma`
6.13.0-dev through 8.1.0-dev, so the 7.10 upgrade keeps the advisory), and `node-forge` via `listhen` →
`@nuxt/cli`/`nitropack`. The Worker bundle carries none of them; resolution rides upstream releases.

## Coverage

| Package | Tests |
|---|---|
| Store fetcher factory | the composable's unit spec; the store specs per converted store |
| Fetch gating | store specs per converted store |
| Page composition | `Chef.e2e.spec.ts`, `household.e2e.spec.ts`, `admin.e2e.spec.ts`, visual check |
| Dependency clusters | `npm run pre:all`, `make unit-test`, `npm run test:e2e:api` per cluster |

## ADR notes

- SSR-friendly store pattern (ADR-007), amendments: `useApiHandler().storeAsyncData` is the blessed store fetcher; a fetch is gated
  with `enabled`, and a disabled dataset reads as idle.
