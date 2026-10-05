# Feature Proposal: Framework adoption — stores, pages and dependency majors

**Status:** Proposal | **Date:** 2026-10-04

The Nuxt 4.5 toolchain upgrade ships on `chore/npm-dependencies` (`npm-dependencies-nuxt4_5-upgrade.md`). This proposal
holds the adoption work that builds on it: the store fetcher factory, fetch gating, page composition and the dependency
majors. Packages are signed off one at a time in chat; the user runs installs and database commands.

## Package inventory

| Package | What | Status |
|---|---|---|
| Store fetcher factory | `useStoreAsyncData` wraps `useAsyncData`: schema-driven types, `useRequestFetch` baked in | ⏳ API refined, awaiting signoff |
| Fetch gating | the `enabled` option carries the fetch condition; a gated slice reads as idle | ⏳ awaiting signoff |
| Page composition | master/detail and tab pages, the `md` breakpoint | OPEN |
| Dependency clusters | majors beyond the Nuxt 4.5 branch | OPEN — survey in progress |

The factory lands first; Fetch gating converts the gated slices onto it, so each slice is touched once.

## Store fetcher factory

**Problem.** Thirty keyed `useAsyncData` calls across the five stores (`plan` 12, `bookings` 7, `allergies` 5, `households` 5,
`users` 1) each hand-repeat the same three options: a `useRequestFetch` fetcher, a Zod-parse `transform` and a `default`.
The slice's declared type (`useAsyncData<Season[]>`) and its transform are two hand-kept claims.
**Solution.** `useStoreAsyncData` in `app/composables/useStoreAsyncData.ts`: a typed wrapper over `useAsyncData` that
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
const {data: seasons, status, error, refresh} = useStoreAsyncData(
    'plan-store-seasons', '/api/admin/season',
    {schema: SeasonSchema.array(), default: () => []}
)
// detail slice: reactive key and url, null default
const {data: selected} = useStoreAsyncData(
    () => `season-${selectedId.value}`, () => `/api/admin/season/${selectedId.value}`,
    {schema: SeasonSchema, default: () => null})
```

**Scope.** This package converts the ungated slices (~17); the 13 gated fetchers convert in Fetch gating, on top of the
factory.
**TDD.** A unit spec for the composable; the store specs stay the specification; `allergies.ts` converts first (full
specs), then `plan`, `bookings`, `households`, `users`, each with a green spec run between.
**Affected.** `app/stores/*`, one new composable with its unit spec, `docs/adr.md` (ADR-007 amendment),
`docs/adr-compliance-frontend.md` store rows.

## Fetch gating

**Problem.** Thirteen `useAsyncData` fetchers skip their request by returning an empty value:
`plan.ts:62`; `bookings.ts:52`, `:402`, `:584`, `:625`; `households.ts:49`, `:81`; `allergies.ts:68`, `:123`;
`OrderHistoryDisplay.vue:27`, `AdminEconomy.vue:83`, `HouseholdEconomy.vue:61`, `pages/dinner/index.vue:150`. A skipped fetch resolves:
the slice reports `success` with `null` or `[]`.
**Framework.** Nuxt 4.5 `enabled`: while it is `false`, `execute` returns the current data and the status stays
(`node_modules/nuxt/dist/app/composables/asyncData.js:326`); switching it to `false` mid-flight aborts the request and sets the status
to `idle` (`asyncData.js:153-160`). The data stays.
**Solution.** The fetcher fetches; `enabled` carries the condition through `useStoreAsyncData`. The status computeds read
`idle` with `enabled` `false` as "idle"; the store's ready flag counts the slices it requests. Logout clears the gated
household list (`clearNuxtData`). `allergies.ts` goes first (two gated slices, full specs); the other eleven follow.
**TDD.** Store specs per converted store: the slice fetches when its condition holds, reports "idle" while the condition is false, and the
store reports ready.
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
- `useBreakpoints(breakpointsTailwind)` from `@vueuse/core` (installed, `^14.1.0`).

**Options.**

| Topic | A | B | C |
|---|---|---|---|
| Master/detail (`/chef`, `/dinner`) | `layouts/master-detail.vue` with a named `master` slot (experimental named layout slots) | a `MasterDetailPage` component holding the `UPage` frame | the pages keep the frame |
| Tab pages (`/admin`, `/household`) | a `TabbedPage` component taking the tab list and a header slot | a layout with typed props for the tab list and named slots for the header | the pages keep their tabs |
| `md` breakpoint | `useBreakpoints(breakpointsTailwind).greaterOrEqual('md')` in the design system, `ssrWidth` for SSR | the layout keeps the element and `provide` | — |

The rendered pages stay the same in A and B; the visual check covers `/chef`, `/dinner`, `/admin/*` and `/household/*`.

## Dependency clusters — OPEN

The survey of every direct dependency (installed, latest, breaking changes against our code, upgrade clusters and their order) is in
progress. Majors listed by `npm outdated` on 2026-10-02: `prisma` / `@prisma/client` / `@prisma/adapter-d1` 7.10 (8.0 in release
candidate), `pinia` 4 with `@pinia/nuxt` 1, `@vueuse/core` 15, `typescript` 7, `zod` 4, `@types/node` 26, `ical-generator` 11.
`@types/node` tracks the runtime: the Node 24 line is `npm install -D @types/node@24`.
`npm audit` on 2026-10-02 reports 11 advisories (1 low, 10 high): the Prisma CLI chain (`deepmerge-ts` below 8; Prisma 6.13 to
8.1.0-dev depend on it), `esbuild` 0.27 (Windows dev server) and `node-forge`.

## Coverage

| Package | Tests |
|---|---|
| Store fetcher factory | the composable's unit spec; the store specs per converted store |
| Fetch gating | store specs per converted store |
| Page composition | `Chef.e2e.spec.ts`, `household.e2e.spec.ts`, `admin.e2e.spec.ts`, visual check |
| Dependency clusters | `npm run pre:all`, `make unit-test`, `npm run test:e2e:api` per cluster |

## ADR notes

- SSR-friendly store pattern (ADR-007), amendments: `useStoreAsyncData` is the blessed store fetcher; a fetch is gated
  with `enabled`, and a disabled slice reads as idle.
