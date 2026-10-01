# Technology refresh: Nuxt 4.5 and dependencies

**Status:** Proposal | **Date:** 2026-09-19 | **Updated:** 2026-09-19 | **Branch:** `chore/npm-dependencies`

The branch runs Nuxt 4.5.2 and Nuxt UI 4.11.1. The goal is code that works with the framework: where Nuxt or Nuxt UI provides a
thing, the app uses it and the hand-written version leaves. The user runs installs and upgrades; each package lists the commands.

## Package inventory

| Package | What | Status |
|---|---|---|
| Node and npm versions | one pinned Node and npm for local and CI (`devEngines`), Node 24.21.0 with npm 11.19.0 | ⏳ awaiting signoff |
| Test tooling | vitest 4.1 and `@nuxt/test-utils` 4, the versions Nuxt 4.5.2 builds with | ⏳ awaiting signoff |
| Vite 8 build | the app, dev server and sender build on Vite 8 | ⏳ awaiting signoff |
| Nuxt UI 4.11 | the 4.4–4.11 changes checked against our components | ⏳ awaiting signoff |
| Danish locale | `UApp` locale `da`; the hand-translated week days leave | ⏳ awaiting signoff |
| Date pickers | `UInputDate` with the calendar in its trailing popover | ⏳ mockup awaiting signoff |
| Fetch gating | the `enabled` option of `useAsyncData` replaces fetchers that return empty values | ⏳ awaiting signoff |
| Page composition | master/detail and tab pages, the `md` breakpoint | OPEN |
| Tailwind | `tailwindcss` 4.3.3 | ⏳ awaiting signoff |
| Dependency clusters | majors outside Nuxt and Nuxt UI | OPEN — survey in progress |

Node and npm versions comes first: npm 10 crashes on the Nuxt 4.5 graph. Test tooling follows: the Nuxt component specs that
verify the other packages run on it.

## Decisions (2026-09-19)

- The test tooling follows the Nuxt 4.5.2 catalog (`pnpm-workspace.yaml` at `v4.5.2`: vitest 4.1.10, `@nuxt/test-utils` 4.1.0,
  `@vue/test-utils` 2.4.11, happy-dom 20.11.1). vitest `^4.1.11` carries the `@vitest/mocker` fix (GHSA-82fw-gwwq-j7x9).
- A package installs the newest release the project accepts: the newest version on the major line Nuxt 4.5.2 builds with, inside
  the peer ranges of the packages that depend on it.
- Install commands name `@latest` when the newest release is accepted, and the major (`vitest@4`) when the accepted line is older
  than the newest; npm saves the resolved version as a `^` range.
- The user runs installs and upgrades; packages list the commands.
- Packages are signed off one at a time in chat.
- Local and CI run the same Node and npm versions, pinned in one place.
- Nuxt brings `@nuxt/vite-builder`; `package.json` lists `nuxt` only.

## Done on the branch

- `nuxt` 4.5.2, `@nuxt/ui` 4.11.1, `vitest` 3.2.7 (`npm audit fix`, `npm update --save`).
- `ChefMenuFormSchema.menuDescription` is a string (`useBookingValidation.ts`); `UTextarea` 4.11 types `v-model` as `string | undefined`.
- `RoleOwnerSchema` lives in `useCoreValidation`; `useUserRoles` derives `RoleOwner` and `RoleOwnerValue` from it.
- `JobRun.triggeredBy` is documented as `"CRON" | "ADMIN" | "ADMIN:<email>"` (`prisma/schema.prisma`, the three job endpoints).

---

## Node and npm versions

**Problem.** Local and CI run different Node and npm versions. CI's `actions/setup-node@v5` (`cicd.yml:51-53`, `:222-224`) installs the
newest Node 22 that `engines.node` (`>=22.0.0 <23.0.0`) allows, with its bundled npm; the local machine runs Node 22.20.0 with npm
10.9.4. `.node-version` is empty. npm 10.9.x crashes on the Nuxt 4.5 dependency graph (`Cannot read properties of null (reading
'edgesOut')`, `#loadPeerSet`, npm/cli#9787, reproduced there with `{"nuxt": "4.5.0"}`); npm 11.18.0 resolves it.
**Solution.** `devEngines` in `package.json` is the one source: npm checks it before `install`, `ci` and `run` (`onFail: error`), and
`actions/setup-node` reads its Node version from `devEngines.runtime` from v6.5.0 (`src/util.ts:30-39`). Node 24.21.0 (LTS "Krypton",
2026-09-07) bundles npm 11.19.0, so pinning Node pins the pair. Node 24 satisfies the engines of `nuxt` 4.5.2 (`^24.11.0`),
`@nuxt/test-utils` 4.3.2, vitest 4, wrangler 4, Prisma 6, Playwright, Nuxt UI 4.11.1 and nitropack 2.13.4. `engines` and the empty
`.node-version` leave. CI moves to `actions/setup-node@v7` with `node-version-file: 'package.json'`.
**Commands.**
```bash
nvm install 24.21.0 && nvm alias default 24.21.0
npm pkg set devEngines.runtime.name=node devEngines.runtime.version=24.21.0 devEngines.runtime.onFail=error
npm pkg set devEngines.packageManager.name=npm devEngines.packageManager.version=11.19.0 devEngines.packageManager.onFail=error
npm pkg delete engines
rm .node-version
node -v && npm -v            # expect: v24.21.0 and 11.19.0
```
**TDD.** `npm ci` passes the `devEngines` check locally and in CI; the CI log's setup-node step reports Node 24.21.0.
**Affected.** `package.json`, `.node-version`, `.github/workflows/cicd.yml`.

## Test tooling

**Problem.** The 65 `*.nuxt.spec.ts` files stop before their first test with `Unknown Error: [object Object]`; the 46 unit spec
files pass (1,359 tests).
**Root cause.** The Nuxt test environment builds the app and reports `[nuxt] build:error`: Nuxt 4.5.2 builds with Vite 8 (8.3.0);
vitest 3.2.7 and `@nuxt/test-utils` 3.23.0 run on Vite 7 (7.3.6).
**Solution.** vitest 4.1.11, `@nuxt/test-utils` 4.3.2, `@vue/test-utils` 2.5.1, happy-dom 20.14.5: the newest releases on the
lines Nuxt 4.5.2 uses (`@nuxt/test-utils` 4.3.2 peers vitest `^4.0.2 || ^5.0.0`, `@vue/test-utils` `^2.4.2`, happy-dom `>=20.0.11`). `@nuxt/test-utils` 4
starts Nuxt in `beforeAll`: a composable called at the top level of a `describe` block throws `[nuxt] instance unavailable` and moves
into `beforeAll` or the test. `@nuxt/test-utils` 4 replaces `vite-node` with Vite's module runner (release notes `v4.0.0`).
**Spec work (dependency survey, 2026-09-19).** 36 call sites in 10 spec files call a Nuxt composable at module level or in a
`describe` body; each chain ends in `useAppConfig()` (`useSeason.ts:75`) or `useToast()`. `useBooking`, `useBookingUi`, `useBilling`
and `useMaintenance` call `useSeason()` eagerly. Files: `useSeason.nuxt.spec.ts` (14 sites), `useBooking.nuxt.spec.ts` (12),
`useBookingUi.nuxt.spec.ts` (3), one site each in `useBilling`, `useMaintenance`, `useApiHandler`, `DinnerBookingForm`,
`BookingGridView`, `ChefMenuCard`, `ChefDinnerCard` specs. Three mocks replace modules Nuxt reads at boot: `vue-router` with
`useRoute` only (`useEntityFormManager.nuxt.spec.ts:19`), `useRuntimeConfig` without `app` (`DinnerDetailHeader.nuxt.spec.ts:7`),
`#imports` with `useToast` only (`useApiHandler.nuxt.spec.ts:6`).
**Commands.**
```bash
npm install -D vitest@4 @nuxt/test-utils@latest @vue/test-utils@latest happy-dom@latest   # one resolution: test-utils peers the other three
npm ls vite                     # expect: vite 8.x at the root (vitest 3 holds 7.3.6 there today)
npx nuxt prepare
npx vitest run            # expect: Test Files 111
```
**TDD.** The existing suite is the specification: the 111 files load and pass.
**Affected.** `package.json`, `vitest.config.ts`, the `*.nuxt.spec.ts` files that call a composable at `describe` level.

## Vite 8 build

**Problem.** Nuxt 4.5 builds on Vite 8 (Rolldown). `nuxt.config.ts` takes Vite from Nuxt. The sender worker builds with
`nitro build` (nitropack 2.13.4).
**Solution.** Deduplicate the lockfile as the Nuxt 4.5 release notes advise, then build and run on Vite 8.
**Commands.**
```bash
npx nuxt upgrade --dedupe
npm run build
npm run dev                          # expect: pages render in one load
npx nitro build --dir workers/sender
npm run pre:all
```
**TDD.** `npm run build`, `npm run pre:all`, the unit suite and `npm run test:e2e`.
**Affected.** `package-lock.json`.

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

## Danish locale

**Problem.** `<UApp>` in `app/app.vue:2` runs on Nuxt UI's default locale, English, for the built-in texts: calendar month headings,
table empty text, pagination and select labels. Week-day names come from `translateToDanish` (`app/utils/date.ts:155`) in the
`#week-day` slots of `BaseCalendar.vue`, `CalendarDatePicker.vue` and `CalendarDateRangePicker.vue`.
**Solution.** `<UApp :locale="da">` with `import {da} from '@nuxt/ui/locale'`. The calendar renders Danish week days from the locale;
the three `#week-day` slots and `translateToDanish` leave.
**TDD.** Component spec: the calendar renders Danish month and week-day names.
**Visual check.**

| Route (state) | Viewport | Element | Expect |
|---|---|---|---|
| `/admin/planning?mode=edit`, open a date picker | phone | `UCalendar` | month heading and week days in Danish, from the locale |
| `/admin/users` | desktop | `UPagination` | Danish labels |

**Affected.** `app/app.vue`, `BaseCalendar.vue`, `CalendarDatePicker.vue`, `CalendarDateRangePicker.vue`, `app/utils/date.ts`.

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

## Tailwind

**Problem.** `package.json` declares `tailwindcss` `^4.1.18`; the installed version is 4.3.3.
**Facts (2026-09-19).** `tailwindcss` 4.3.3 is the latest release. Nuxt UI 4.11.1 depends on `tailwindcss` `^4.3.3` and
`@tailwindcss/vite` `^4.3.3`; `@tailwindcss/vite` 4.3.3 supports Vite `^5.2.0 || ^6 || ^7 || ^8`. Nuxt UI brings Tailwind to Nuxt.
**Solution.** The declared range follows the installed version.
**Commands.**
```bash
npm update --save tailwindcss
git diff package.json        # expect: "tailwindcss": "^4.3.3"
```
**Affected.** `package.json`.

## Dependency clusters — OPEN

The survey of every direct dependency (installed, latest, breaking changes against our code, upgrade clusters and their order) is in
progress. Majors listed by `npm outdated` on 2026-09-19: `prisma` / `@prisma/client` / `@prisma/adapter-d1` 7.x (8.0 in release
candidate), `pinia` 4 with `@pinia/nuxt` 1, `@vueuse/core` 15, `typescript` 7, `eslint` 10, `@types/node` 26, `ical-generator` 11.
`npm audit` on 2026-09-19 reports the Prisma CLI (`deepmerge-ts` below 8; Prisma 6.13 to 8.1.0-dev depend on it), `@vitest/mocker` (the Test tooling
package) and `esbuild` 0.27 (Windows dev server).

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
- ADR-017 [Isomorphic Composables, Pure UI Composables and Per-Context Type Checking]: the typecheck layout stays on
  `server/tsconfig.json` while nuxt/nuxt#34385 is open.
