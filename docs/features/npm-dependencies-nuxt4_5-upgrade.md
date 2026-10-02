# Technology refresh: Nuxt 4.5 and dependencies

**Status:** In progress | **Date:** 2026-09-19 | **Updated:** 2026-10-02 | **Branch:** `chore/npm-dependencies`

The branch runs Nuxt 4.5.2 and Nuxt UI 4.11.1. The goal is code that works with the framework: where Nuxt or Nuxt UI provides a
thing, the app uses it and the hand-written version leaves. The user runs installs and upgrades; each package lists the commands.

## Package inventory

| Package | What | Status |
|---|---|---|
| Node and npm versions | Node 24.21.0 with npm 11.19.0, pinned in `engines`, read by CI | ✅ done |
| Test tooling | vitest 5.0.3 and `@nuxt/test-utils` 4.3.2; 111 spec files, 2625 tests pass | ✅ done |
| Vite 8 build | the app, dev server and sender build on Vite 8 | ✅ done |
| Nuxt UI 4.11 | the 4.4–4.11 changes checked against our components | ⏳ awaiting signoff |
| Danish locale | `UApp` locale `da`; the hand-translated week days left | ✅ done — visual check with the Nuxt UI pass |
| Date pickers | `UInputDate` with the calendar in its trailing popover | ⏳ mockup awaiting signoff |
| Fetch gating | the `enabled` option of `useAsyncData` replaces fetchers that return empty values | ⏳ awaiting signoff |
| Page composition | master/detail and tab pages, the `md` breakpoint | OPEN |
| Store fetcher factory | `createUseAsyncData` bakes `useRequestFetch` + schema transform into one store fetcher | ⏳ API sketch awaiting signoff |
| Tailwind | `tailwindcss` 4.3.3; declared floors follow installed versions | ⏳ awaiting signoff |
| Dependency clusters | majors outside Nuxt and Nuxt UI | OPEN — survey in progress |

Nuxt UI 4.11 is next: the e2e pair and the visual check run on the built branch.

## Decisions (2026-09-19)

- The test tooling runs the newest releases inside `@nuxt/test-utils` 4.3.2's peer ranges: vitest 5.0.3 (carries the
  `@vitest/mocker` fix, GHSA-82fw-gwwq-j7x9), `@vue/test-utils` 2.5.1, happy-dom 20.14.5.
- A package installs the newest release the project accepts: the newest version on the major line Nuxt 4.5.2 builds with, inside
  the peer ranges of the packages that depend on it.
- Install commands name `@latest` when the newest release is accepted, and the major (`vitest@4`) when the accepted line is older
  than the newest; npm saves the resolved version as a `^` range.
- The user runs installs and upgrades; packages list the commands.
- Packages are signed off one at a time in chat.
- Local and CI run the same Node and npm versions, pinned in one place.
- Nuxt brings `@nuxt/vite-builder`; `package.json` lists `nuxt` only.

## Done on the branch

- `nuxt` 4.5.2, `@nuxt/ui` 4.11.1.
- Node 24.21.0 with npm 11.19.0: `engines` pins `node ^24.21.0` and `npm ^11.19.0`, CI reads it via `setup-node`'s
  `node-version-file`; `.node-version` removed. npm 10.9.x crashes on the Nuxt 4.5 graph (npm/cli#9787).
- CI actions on `cicd.yml`: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`.
- `h3` pinned `^1.15.11` as a devDependency: the root `node_modules/h3` slot carries the 1.15 line that `@nuxt/nitro-server`
  runs and the generated tsconfigs alias; `@eslint/config-inspector`'s h3 2.x RC nests under its own dependents. Dependabot's
  `nuxt-ecosystem` group carries the pin forward with Nuxt.
- `eslint` 10.11.0 (the `@nuxt/eslint-config` peer line).
- Test tooling: vitest 5.0.3, `@nuxt/test-utils` 4.3.2, `@vue/test-utils` 2.5.1, happy-dom 20.14.5 — the newest releases
  inside test-utils' peer ranges; vitest 5 runs on the rolldown Vite, vitest 3's transforms fail on it. `make unit-test`
  runs 111 files with 2625 tests. Spec conventions for the test-utils 4 runtime live in `docs/testing.md`.
- Vite 8 build: `npx nuxt upgrade --dedupe` (`h3` stays 1.15.11 at root); `npm run build`, `npm run dev`,
  `make run-sender-local` and `npm run pre:all` pass.
- `ICONS.github` is `i-hugeicons-github-01` (`useTheSlopeDesignSystem.ts`): the glyph ships from an installed collection.
- `icon.clientBundle` keeps `scan: true` only (`nuxt.config.ts`): Nuxt UI 4.10 pre-bundles its own internal icons.
- `experimental.watcher: 'builder'` (`nuxt.config.ts`): the shared Vite watcher, the default from `compatibilityVersion: 5`.
- `ChefMenuFormSchema.menuDescription` is a string (`useBookingValidation.ts`); `UTextarea` 4.11 types `v-model` as `string | undefined`.
- `RoleOwnerSchema` lives in `useCoreValidation`; `useUserRoles` derives `RoleOwner` and `RoleOwnerValue` from it.
- `JobRun.triggeredBy` is documented as `"CRON" | "ADMIN" | "ADMIN:<email>"` (`prisma/schema.prisma`, the three job endpoints).

---

## Nuxt UI 4.11

**Problem.** From 4.4.0 to 4.11.1, 129 changelog entries name components we use (41 components; `UButton` 141 sites, `UIcon` 123,
`UBadge` 78, `UAlert` 61). Two are marked breaking: 4.6.0 manages `@nuxt/icon`, `@nuxt/fonts` and `@nuxtjs/color-mode` through
`moduleDependencies` (Nuxt ≥ 4.1), and 4.8.0 renames the `UInputMenu` prop `autocomplete` to `mode`.
**Checked against the code.**

| Change | Our code |
|---|---|
| Module overrides the `primary` colour and `md` size defaults only (4.4.0) | `app/app.config.ts` `ui` sets colours |
| `moduleDependencies` (4.6.0) | `modules` lists `@nuxt/ui`; `colorMode` and `icon` options apply (`nuxt prepare` reports the icon collections) |
| `UInputMenu` `mode` (4.8.0) | the app uses `USelect` and `USelectMenu` |
| `v-model` types without `null` (4.5.0) | fixed in `ChefMenuFormSchema` |
| HTML5 validation on programmatic submit (4.5.0) | `UFormField required` stays in the field context (`FormField.vue:34`); `HouseholdCreateForm`, the one `formRef.submit()`, sets `required` on its `UFormField`s, so `reportValidity()` passes |
| Public composables auto-import (4.6.0) | the app uses `useToast` |
| `data-slot` forwarded to the component root (4.10.0) | selectors in `MobileViewport.e2e.spec.ts:50-53` and `AdminPlanningSeason.e2e.spec.ts:209-212` |
| Logical properties in the theme (4.10.0) | physical classes sit on our own elements (`KITCHEN_PANEL_BOX`, the ribbon, icon margins) |
| `UTable` excludes hidden columns from `colspan` (4.11.1) | expanded rows in the users and job-history tables |
| Calendar size scale, focus styles, radio-group borders, motion (4.9.0–4.11.1) | the contrast and colour-vision architecture specs pass on the 4.11 theme |
| Uniform `focus-visible` halo on every component (4.9.0) | the visual check's focus-ring row verifies the restyle |
| Duplicate toasts pulse the existing toast (4.5.0) | our `dedupeKey` is domain data in the description; specs that read `useToast().toasts` (`AdminTeams.nuxt.spec.ts`) see fewer entries when identical toasts repeat |

**Solution.** The e2e run on 4.11 and the visual check.
**Commands.**
```bash
npx playwright test tests/e2e/ui/MobileViewport.e2e.spec.ts tests/e2e/ui/AdminPlanningSeason.e2e.spec.ts --workers=2 --reporter=line
```
**Visual check.**

| Route (state) | Viewport | Element | Expect |
|---|---|---|---|
| `/admin/planning?mode=edit`, open a date picker | phone, desktop | `UCalendar` (`COMPONENTS.calendarGrid`) | day cells sized to the grid, selected days in `CALENDAR.picker` |
| `/chef`, `/household/<shortName>/bookings` | phone, desktop | `UCalendar` | month grid and day circles |
| `/admin/system` | phone | `UTree` | settings tree indentation |
| `/login`, ⚙ | phone | `URadioGroup` (`COMPONENTS.choiceGroup`) | palette and text-size cards with borders |
| any form, tab through fields | desktop | focus ring | one focus style across inputs and buttons |

**Affected.** The e2e selectors above, where the run reports a changed slot.

## Danish locale — done

`<UApp :locale="da">` (`app/app.vue`) renders Nuxt UI's built-in texts in Danish: calendar month headings, table empty text,
pagination and select labels. `COMPONENTS.calendarGrid` carries `weekdayFormat: 'narrow'`, so the week-day headers render the
single letters M T O T F L S from the locale, and `ui.headCell` carries the head-cell type (`TEXT.toned`: body-size text
measures at the 4.5:1 rung). The three `#week-day` slots and `translateToDanish` left (`BaseCalendar.vue`,
`CalendarDatePicker.vue`, `CalendarDateRangePicker.vue`, `app/utils/date.ts`). `CalendarDisplay.nuxt.spec.ts` asserts the
rendered letters and the Danish month heading under the UApp frame.
**Visual check** (with the Nuxt UI 4.11 pass).

| Route (state) | Viewport | Element | Expect |
|---|---|---|---|
| `/admin/planning?mode=edit`, open a date picker | phone | `UCalendar` | Danish month heading; M T O T F L S week letters in the head-cell type |
| `/admin/users` | desktop | `UPagination` | Danish labels |

## Date pickers

**Problem.** `CalendarDateRangePicker.vue` reads two free-text `UInput`s (`type="string"`) and parses them with `stringDateRangeSchema`;
the range lives as text (`inputState`), as `Date` (the model) and as `CalendarDate` (`pickerDateRange`), synchronised by a watcher.
The input row is the popover trigger. `CalendarDatePicker.vue` follows the same pattern for one date.
**Solution.** The Nuxt UI docs pattern "As a date range picker" (`UInputDate`, v4.11.1): `UInputDate range` bound to one
`{start, end}` `CalendarDate` model; its `#trailing` slot holds a `UPopover` anchored to the input with a calendar button and
`UCalendar range`. The model converts to `Date` at the component boundary; `dateRangeSchema` validates the model; `CALENDAR.picker`
draws the selected days in the `#day` slot. `CalendarDatePicker.vue` uses `UInputDate` with `UCalendar`.

**Mockup — date range picker** ⏳ awaiting signoff

```
TODAY                                     PROPOSED
Start dato          Slut dato             Periode
[10/08/2026  📅]    [23/06/2027  📅]      [10 / 08 / 2026 – 23 / 06 / 2027  📅]
 click in a field opens the calendar       day / month / year segments; 📅 opens the calendar
```

**TDD.** Component specs for both pickers: typing segments and picking in the calendar update one model; an invalid range shows the
schema message. E2e: the season dates in `AdminPlanningSeason.e2e.spec.ts`, the move-out date in `household.e2e.spec.ts`.
**Test-ids.** The e2e specs fill `input[name="start"]` / `input[name="end"]`; the old → new contract table comes with the mockup
signoff.
**Affected.** `CalendarDateRangePicker.vue`, `CalendarDatePicker.vue`, `CalendarDateRangeListPicker.vue`, `useDateRangeValidation.ts`
(`stringDateRangeSchema`), their component specs, the e2e specs above.

## Fetch gating

**Problem.** Thirteen `useAsyncData` fetchers skip their request by returning an empty value:
`plan.ts:62`; `bookings.ts:52`, `:402`, `:584`, `:625`; `households.ts:49`, `:81`; `allergies.ts:68`, `:123`;
`OrderHistoryDisplay.vue:27`, `AdminEconomy.vue:83`, `HouseholdEconomy.vue:61`, `pages/dinner/index.vue:150`. A skipped fetch resolves:
the slice reports `success` with `null` or `[]`.
**Framework.** Nuxt 4.5 `enabled`: while it is `false`, `execute` returns the current data and the status stays
(`node_modules/nuxt/dist/app/composables/asyncData.js:326`); switching it to `false` mid-flight aborts the request and sets the status
to `idle` (`asyncData.js:153-160`). The data stays.
**Solution.** The fetcher fetches; `enabled` carries the condition. The status computeds read `idle` with `enabled` `false` as
"idle"; the store's ready flag counts the slices it requests. Logout clears the gated household list (`clearNuxtData`).
`allergies.ts` goes first (two gated slices, full specs); the other eleven follow.
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

## Store fetcher factory

**Problem.** Thirty keyed `useAsyncData` calls across the five stores (`plan` 12, `bookings` 7, `allergies` 5, `households` 5,
`users` 1) each hand-repeat the same three options: a `useRequestFetch` fetcher, a Zod-parse `transform` and a `default`.
**Solution.** `createUseAsyncData` (Nuxt 4.4) builds one project fetcher that bakes in `useRequestFetch`; a store slice
declares its key, endpoint, schema and default. The factory is the blessed shape of the SSR-friendly store pattern (ADR-007);
the ADR gains the amendment. The factory composes with the `enabled` option, so the Fetch gating package converts onto it.

**API sketch** ⏳ awaiting signoff

```ts
// app/composables/useStoreAsyncData.ts
const {data: seasons, status, error, refresh} = useStoreAsyncData(
    'plan-store-seasons', '/api/admin/season',
    {schema: SeasonSchema.array(), default: () => []}
)
// reactive keys/urls and enabled pass through: useStoreAsyncData(computed(() => `season-${id.value}`), url, {…, enabled})
```

**TDD.** The store specs stay the specification; `allergies.ts` converts first (full specs), the other stores follow.
**Affected.** `app/stores/*`, one new composable with its unit spec, `docs/adr.md` (ADR-007 amendment),
`docs/adr-compliance-frontend.md` store rows.

## Tailwind

**Problem.** `package.json` declares `tailwindcss` `^4.1.18`; the installed version is 4.3.3. The floors of `@nuxt/eslint`,
`zod`, `@vueuse/core`, `typescript`, `@prisma/*` and the `@iconify-json/*` packs sit behind their installed versions the same way.
**Facts (2026-09-19).** `tailwindcss` 4.3.3 is the latest release. Nuxt UI 4.11.1 depends on `tailwindcss` `^4.3.3` and
`@tailwindcss/vite` `^4.3.3`; `@tailwindcss/vite` 4.3.3 supports Vite `^5.2.0 || ^6 || ^7 || ^8`. Nuxt UI brings Tailwind to Nuxt.
**Solution.** Declared ranges follow the installed versions.
**Commands.**
```bash
npm update --save
git diff package.json        # expect: "tailwindcss": "^4.3.3" among the raised floors
```
**Affected.** `package.json`, `package-lock.json`.

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
| Test tooling | the full unit and component suite loads and passes |
| Vite 8 build | `npm run build`, `npm run pre:all`, `npm run test:e2e` |
| Nuxt UI 4.11 | `MobileViewport.e2e.spec.ts`, `AdminPlanningSeason.e2e.spec.ts`, visual check |
| Danish locale | component spec for the calendar names, visual check |
| Date pickers | component specs for both pickers, the two e2e specs, test-id table |
| Fetch gating | store specs per converted store |
| Page composition | `Chef.e2e.spec.ts`, `household.e2e.spec.ts`, `admin.e2e.spec.ts`, visual check |
| Tailwind | `npm run pre:all` |

## ADR notes

- ADR-007 [SSR-Friendly Store Pattern with useAsyncData], amendment "fetch gating": a fetch is gated with `enabled`; a disabled slice
  reads as idle.
- Isomorphic composables and per-context type checking (ADR-017): the root `references` layout was tried on 2026-10-02 and
  reverted. On the legacy union, `nuxt typecheck` passes a bare `useToast()` in `server/utils/` that `ts:server` flags TS2304;
  on the references layout, the solution build drops the ambient h3 augmentation of `shared/types/cloudflare.d.ts` for the
  server routes `.nuxt/types/nitro-routes.d.ts` imports into the app project (158× TS2345, with and without a
  `typescript.tsConfig` override — nuxt/nuxt#34385, open). The four-script gate stays; the ADR carries the follow-up.
