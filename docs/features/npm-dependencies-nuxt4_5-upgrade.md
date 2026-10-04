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
| Nuxt UI 4.11 | the 4.4–4.11 changes checked against the components | ✅ done |
| Danish locale | `UApp` locale `da`; the hand-translated week days left | ✅ done |
| Date pickers | one `UInputDate range` box per period, `COMPONENTS.dateField` mask | ✅ done |
| Tailwind | `tailwindcss` 4.3.3; declared floors follow installed versions | ⏳ awaiting signoff |
| Native-feel fruits | login returns to the original URL; the PWA manifest installs the app; the session outlives the app process | ⏳ awaiting signoff |

The store, page and dependency work lives in feature-proposal-framework-adoption.md; the native-feel investigation in feature-proposal-mobile-native-feel.md.

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
- Danish locale: `<UApp :locale="da">` (`app/app.vue`); `COMPONENTS.calendarGrid` carries `weekdayFormat: 'narrow'` (the
  M T O T F L S headers) and `ui.headCell` (`TEXT.toned`: body-size text measures at the 4.5:1 rung); the three `#week-day`
  slots and `translateToDanish` left; `CalendarDisplay.nuxt.spec.ts` asserts the rendered letters and the Danish month
  heading under the UApp frame.
- The vitest projects resolve `@playwright/test` to a stub (`tests/component/playwrightStub.ts`): specs import the e2e
  factories for their data builders only. The nuxt project runs with `hookTimeout: 60_000` and `testTimeout: 20_000`.
- `SeasonFactory.createActiveSeason` retries once (`CREATE_ACTIVE_SEASON_RETRIES`): the list→activate window races with
  workers recreating or cleaning the singleton.
- Date pickers: one `UInputDate range` box per period (`CalendarDateRangePicker`, `CalendarDatePicker`); segments render
  the house mask dd/MM/yyyy via `COMPONENTS.dateField`; the shared popover calendar lives in `CalendarPickerPopover.vue`;
  a disabled range reads as one compact field; the season label is `Fællesspisning sæsonens start - slut datoer`, the
  holiday rows carry the holiday icon as the field's leading icon. `stringDateRangeSchema`, the free-text `inputState`
  and `translateToDanish`-era sync watchers left. E2e fills go through `testHelpers.fillDateField`/`readDateField` on the
  picker's `[name]` scope (self-verifying via `pollUntil`).
- Cooking-day counter: `COMPONENTS.statBox` (framed at the 3:1 edge rung) in the season card header shows the dinners the
  season scaffolds, computed with `computeCookingDates`; the palette presets regenerated (`make palettes`).
- Nuxt UI 4.11: the 129 changelog entries from 4.4.0–4.11.1 checked against the 41 components in use (the two breaking
  changes, `moduleDependencies` and the `UInputMenu` rename, touch nothing here); the e2e pair, the contrast and
  colour-vision specs and the visual pass are clean, including the 4.9 focus-visible halo and the 4.5 duplicate-toast
  suppression.
- Visual pass (2026-10-04): calendars, pickers, counter, pagination and focus ring verified on phone and desktop.
- `ICONS.github` is `i-hugeicons-github-01` (`useTheSlopeDesignSystem.ts`): the glyph ships from an installed collection.
- `icon.clientBundle` keeps `scan: true` only (`nuxt.config.ts`): Nuxt UI 4.10 pre-bundles its own internal icons.
- `experimental.watcher: 'builder'` (`nuxt.config.ts`): the shared Vite watcher, the default from `compatibilityVersion: 5`.
- `ChefMenuFormSchema.menuDescription` is a string (`useBookingValidation.ts`); `UTextarea` 4.11 types `v-model` as `string | undefined`.
- `RoleOwnerSchema` lives in `useCoreValidation`; `useUserRoles` derives `RoleOwner` and `RoleOwnerValue` from it.
- `JobRun.triggeredBy` is documented as `"CRON" | "ADMIN" | "ADMIN:<email>"` (`prisma/schema.prisma`, the three job endpoints).

---

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

## Coverage

| Package | Tests |
|---|---|
| Test tooling | the full unit and component suite loads and passes |
| Vite 8 build | `npm run build`, `npm run pre:all`, `npm run test:e2e` |
| Nuxt UI 4.11 | `MobileViewport.e2e.spec.ts`, `AdminPlanningSeason.e2e.spec.ts`, visual check |
| Danish locale | component spec for the calendar names, visual check |
| Date pickers | component specs for both pickers, the two e2e specs, test-id table |
| Native-feel fruits | e2e: a deep link survives login; the session cookie carries an expiry; the manifest serves |
| Tailwind | `npm run pre:all` |

## ADR notes

- ADR-007 [SSR-Friendly Store Pattern with useAsyncData], amendment "fetch gating": a fetch is gated with `enabled`; a disabled slice
  reads as idle.
- Isomorphic composables and per-context type checking (ADR-017): the root `references` layout was tried on 2026-10-02 and
  reverted. On the legacy union, `nuxt typecheck` passes a bare `useToast()` in `server/utils/` that `ts:server` flags TS2304;
  on the references layout, the solution build drops the ambient h3 augmentation of `shared/types/cloudflare.d.ts` for the
  server routes `.nuxt/types/nitro-routes.d.ts` imports into the app project (158× TS2345, with and without a
  `typescript.tsConfig` override — nuxt/nuxt#34385, open). The four-script gate stays; the ADR carries the follow-up.
