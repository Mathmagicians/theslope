# Bug Fix: Admin UX — allergy catalog, alerts, poster, planning, preferences

**Status:** In progress | **Date:** 2026-09-01 | **Updated:** 2026-09-16
**Branch:** `bugfix/admin-ux` (allergy catalog fixes below shipped in #165 from `fix/allergy-ages-categories-and-display-logic`)

## Fix Inventory

| id | Fix | Status |
|----|-----|--------|
| D1 | Master/detail display logic — mobile detail off-screen | ✅ IMPLEMENTED (2026-09-01) |
| D2 | Compare mode — mobile summary bar | ✅ IMPLEMENTED (2026-09-01) |
| A1 | Wrong age categories in allergy surfaces (children as adults) | **Implemented** (2026-09-01) |
| C1 | CI break — server-reachable composable relied on app auto-imports; per-context typecheck gate + pure UI composables | ✅ IMPLEMENTED (2026-09-02) |
| C2 | E2E stability — season list polled past a half-created season; UI specs wait for hydration before interacting | ✅ IMPLEMENTED (2026-09-02) |
| Alerts on mobile | UAlert ignores screen size → design-system `ALERTS` pattern, every instance migrated, architecture test | ✅ IMPLEMENTED (2026-09-16) |
| Poster notes | "Vigtige bemærkninger" shared with `/admin/allergies`, editable by ADMIN/ALLERGYMANAGER → `Setting` table + `AllergyNotes` | 🟡 Shared box ✅ (2026-09-16); editing ⏳ migration |
| QR code | `uqr` + `QrCode.vue` atom instead of `api.qrserver.com`; prints | ⏳ Mockup signoff |
| My preferences | notification channels (EMAIL/SMS) + appearance (colors, text scale) → `UserPreference` table, endpoints, dashboard card | ⏳ Mockup signoff + color decision + migration |
| Planning form | edit/create the allergies way (labelled Rediger + Opret), holiday rows editable, live-season save re-scaffolds, Heynabo cleanup on removed dates | ✅ IMPLEMENTED (2026-09-16) |
| Sorted holidays | holiday list chronological everywhere | ✅ IMPLEMENTED (2026-09-16) |
| Calendar grid | pickers show adjacent-month days twice → one shared `UCalendar` root token | ✅ IMPLEMENTED (2026-09-16) |
| Planning buttons | every planning button from the design system | ✅ IMPLEMENTED (2026-09-16) |
| Colour drift sweep | 178 raw Tailwind colour classes (34 files) and 52 literal Nuxt UI colour props (20 files) outside the design system → `TEXT`/`BORDER`/`TYPOGRAPHY`/`BG`/`COLOR` tokens; architecture test forbids raw colour outside `useTheSlopeDesignSystem.ts` | Approved 2026-09-16; runs before the colour presets |

---

## D1 — Master/Detail Display Logic

### Problem

On `/admin/allergies` mobile, every interaction response renders **below the entire
master table**, off-screen from the tap that triggered it:

1. Tap a row → the only visible feedback is a highlight; the detail renders below the
   fold (`AdminAllergies.vue` stacks master over detail on `<md`). Nothing appears to happen.
2. ✏️ Rediger lives in the **detail header** — already below the fold; the form then
   replaces the detail, even further from the row being edited.
3. "Opret allergi" sits in the top toolbar, but the create form renders at the bottom —
   no scroll-to, no spatial link.
4. The delete cascade warning renders where the user isn't looking.

### Root Cause

Stacked master/detail breaks the layout's **"both panes visible" contract** — vertical
stacking silently converts it into "list, then a mystery zone below".

Compounding debt:
- Two near-identical copy-pasted catalog tables: `AdminAllergies.vue` (single-select)
  and `AllergenMultiSelector.vue` edit mode (checkboxes) — same icon/name/count/new cells.
- Stale header comment in `AdminAllergies.vue` claims `LAYOUTS.masterDetailPage` (the
  template hand-rolls a 1/3–2/3 flex) and a `FormModeSelector` that no longer exists.

### Solution

**Master/detail stays THE layout at every breakpoint. The detail's mount point is the
only responsive decision:**

- **Desktop:** right pane, upgraded with `md:sticky md:top-4 self-start` (replaces the
  `md:pt-10` alignment hack); adopts `LAYOUTS.masterDetailPage` for real.
- **Mobile:** the same panel docks in the `UTable` `#expanded` slot directly under the
  selected row; CREATE docks under the toolbar (adjacent to the button that opened it).
- Selection is the single state. Expansion is **derived** (writable computed) — mobile
  only, explicit selection only (no auto-expand); the first-item fallback feeds only the
  desktop pane. Single-open is inherent (one selected id) — no watcher needed.
- The panel appears at two template mount points guarded by `v-if` so exactly **one
  mounts** (stateful form — no CSS dual-mount).
- Known trade-off: `isMd` is provided in `layouts/default.vue` as `ref(false)` and
  resolved `onMounted` → SSR + first client tick render the mobile mount; brief desktop
  first-paint flash, house-accepted (cf. `DinnerBookingForm` isMd-derived columns).

**New components** (`app/components/allergy/`):

| Component | Role |
|-----------|------|
| `AllergyCatalogTable.vue` | ONE master list, `mode: 'single' \| 'multi'`; forwards `#expanded`; consumers: AdminAllergies, AllergenMultiSelector (→ ChefMenuCard edit mode transitively) |
| `AllergyDetailPanel.vue` | Detail region extracted verbatim: "Detaljer" header + ✏️🗑 / AllergyTypeCard view / edit / create / delete-confirm / empty. `AllergyTypeCard` untouched; all testids preserved |

### Layouts

```
DESKTOP single mode — unchanged 3/9 + sticky detail
┌──────────────────────────┬─────────────────────────────────────┐
│ MASTER (CatalogTable)    │ DETAIL (AllergyDetailPanel)         │
│ 🥛 Mælk        2  🆕     │ ┌─ sticky top-4 ─────────────────┐  │
│ 🥜 Jordnødder  2  ◀ sel  │ │ Detaljer            [✏️]  [🗑] │  │
│ 🌾 Gluten      1         │ │ 🥜 Jordnødder                  │  │
│ ...long list scrolls...  │ │ Berørte beboere (2)            │  │
│                          │ └── follows you as list scrolls ─┘  │
└──────────────────────────┴─────────────────────────────────────┘

MOBILE single mode — same panel, docked under the tapped row
│ [👁] 🥛 Mælk          2  🆕 │
│ [▼] 🥜 Jordnødder     2     │  ← tap = select = expand
│ ┌─────────────────────────┐ │
│ │ Detaljer      [✏️] [🗑] │ │  ← AllergyDetailPanel, verbatim
│ │ 🥜 Jordnødder           │ │     ✏️ → edit form IN PLACE
│ │ Berørte beboere (2)     │ │     🗑 → cascade confirm IN PLACE
│ └─────────────────────────┘ │
│ [👁] 🌾 Gluten        1     │

MOBILE create — panel docks under the toolbar
│ [⧉ Sammenlign] [↓ Antal]    │
│ [＋ Opret allergi]          │
│ ┌─────────────────────────┐ │
│ │ Opret allergi           │ │
│ │ Navn [    ] Ikon [ ]    │ │
│ └─────────────────────────┘ │
│ [👁] 🥛 Mælk          2     │

ARCHITECTURE
                 ┌───────────────────────────────┐
                 │  AllergyCatalogTable.vue  NEW │
                 │  mode: 'single' | 'multi'     │
                 └──────┬──────────┬─────────┬───┘
        ┌───────────────┴──┐  ┌────┴──────────────┐  ┌──────────────┐
        │ AdminAllergies   │  │ AllergenMulti-    │  │ ChefMenuCard │
        │ (single-select)  │  │ Selector (multi)  │  │ (via multi)  │
        └───────┬──────────┘  └───────────────────┘  └──────────────┘
        ┌───────┴───────────────────┐
        │ AllergyDetailPanel.vue NEW│ ← mounts in pane (md+) OR #expanded (<md)
        └───────────────────────────┘
```

### TDD

| Test | Change |
|------|--------|
| `AllergyCatalogTable.nuxt.spec.ts` (new) | 🟢 parametrized single/multi × showNewBadge × readonly; selection emits; `#expanded` forwarding |
| `AllergyDetailPanel.nuxt.spec.ts` (new) | 🟢 view actions / edit / create / delete-confirm cascade text / `canEdit:false` |
| `AdminAllergies.nuxt.spec.ts` | 🟢 parametrize over `isMd` true/false; mobile path selects a row first; `toHaveLength(1)` guards now pin the single-mount invariant |
| `AllergyTypeCard.nuxt.spec.ts` | untouched (layout-agnostic, mounts card in isolation) |
| `AllergenMultiSelector.nuxt.spec.ts` | stays green through the table extraction |
| `AdminAllergies.e2e.spec.ts` (new) | 🟢 CRUD flow, desktop viewport; the navigation helper waits for the client-only detail pane — the container testid is SSR-visible before hydration attaches listeners |

### Affected Areas

- New: `app/components/allergy/AllergyCatalogTable.vue`, `app/components/allergy/AllergyDetailPanel.vue` + 2 specs, `tests/e2e/ui/AdminAllergies.e2e.spec.ts`
- Modified: `app/components/admin/AdminAllergies.vue`, `app/components/allergy/AllergenMultiSelector.vue`, their specs, `docs/adr-compliance-frontend.md`
- Untouched by design: `AllergyTypeCard.vue` (+ its tests), `HouseholdAllergies.vue` (inhabitant-row table, different data shape), stores, server

---

## D2 — Compare Mode: Sticky Mobile Summary

### Problem

Compare mode (Sammenlign) is **also** master/detail (`AllergenMultiSelector.vue` edit
mode: table left, 📊 Statistik right) — on mobile the statistics land below the list.
Milder than D1 (read-only aggregate), but the same disease; fixed here so the area is done.

### Solution

Fixed bottom bar inside `AllergenMultiSelector`, `<md` only (`md:hidden` — display-only,
so CSS hiding is fine), visible when selections > 0; tap scrolls to the statistics panel
(`scrollIntoView` on an anchor ref). `position: fixed`, not `sticky` — an
overflow-clipping card ancestor keeps sticky from ever pinning to the viewport.
`ChefMenuCard` edit mode gets it for free.

```
MOBILE — Sammenlign (compare) mode
┌────────────────────────────┐
│ ☑ 🥛 Mælk         2        │
│ ☐ 🥜 Jordnødder   2        │
│ ☑ 🌾 Gluten       1        │
│  ...list scrolls...        │
│ 📊 Statistik (below list)  │
├────────────────────────────┤ ← fixed bottom bar, <md only,
│ 🧮 2 valgte · 3 beboere  ▼ │   hidden when nothing selected;
└────────────────────────────┘   tap scrolls to 📊 Statistik
```

### TDD

Extend `AllergenMultiSelector.nuxt.spec.ts`: bar renders only with selections; headline
matches `allergyStatistics` counts; absent when empty.

---

## A1 — Wrong Age Categories (children as adults)

### Problem

Prod bug (user-reported, confirmed): children figure as adults on the allergy poster
(`/admin/allergies/pdf` — every person marked `(v)`, counts read `0 børn`). Same defect
family on three surfaces, while the correct pattern already ships in the preferences view:

| Surface | Today | Defect |
|---|---|---|
| `pages/admin/allergies/pdf.vue` (poster) | `resolveTicketPrice(birthDate, undefined, undefined)?.ticketType ?? ADULT` inline | No prices passed → resolver returns `undefined` → **everyone ADULT**. Invented `(v)/(b)/(ba)` markers, hand-rolled count line, name-substring hex colors |
| `HouseholdAllergies.vue` | `getTicketTypeConfig(birthDate ?? null)` — no prices | Same silent-ADULT bug: every child badges `[Voksen]` |
| `AllergyTypeCard.vue` (admin) | No age marker at all | Information absent |
| **`HouseholdCard.vue` (preferences)** | `getTicketTypeConfig(birthDate ?? null, activeSeason.value?.ticketPrices)` + `UBadge` | ✅ the pattern to replicate |

### Root Cause

`getTicketTypeConfig` classifies via `resolveTicketPrice`, which returns `undefined`
without a price list; callers' hardcoded `?? TicketType.ADULT` fallback then ADULT-ed
everyone. `determineTicketType` (with app-config default age limits) sat unused for this
path.

### Fix — reuse existing utilities, no hardcoded ages or spellings

1. **One classification path, resolve function untouched:** `getTicketTypeConfig`'s
   fallback becomes `?? determineTicketType(birthDate, ticketPrices, referenceDate)` —
   with prices present nothing changes (BookingGridView, DinnerBookingForm, CostLine
   unaffected); without prices the app-config default age limits classify.
2. **New aggregator `groupInhabitantsByTicketCategory(inhabitants, ticketPrices?, referenceDate?)`
   in `useTicket`** — inhabitant counterpart to `useOrder.groupByTicketType` (which
   buckets orders by their *frozen* `ticketType`, ADR-011; inhabitants are classified
   *live* from `birthDate`). Fixed `ADULT, CHILD, BABY` order, empty categories included,
   each group carries `config = ticketTypeConfig[type]`; inhabitants come out stamped
   with `ticketType` so they feed `formatTicketCounts` directly.
3. **Formatters — shared with the orders path:** compact `V`/`B`/`b` letters move from
   `useBilling.formatTicketCounts`'s body into `ticketTypeConfig.compactLabel` (output
   unchanged: "2V 1B"). Poster: per-person marker = `compactLabel`, count line =
   `formatTicketCounts` (replaces `(v)/(b)/(ba)` + `[N voksne, M børn & K babyer]`).
   Screen badges (AllergyTypeCard, HouseholdAllergies): full `config.label` in `UBadge`
   — the HouseholdCard pattern; prices from the plan store's `activeSeason`.
4. **DS cleanup on the poster:** drop the name-substring color classes
   (`allergy-gluten`/`dairy`/`nuts` hex + Danish `includes()` matching); DS typography +
   the allergy's own `icon`. Print CSS stays. Full visual redesign = separate UX pass.

### TDD

| Test | Change |
|------|--------|
| `useTicket.nuxt.spec.ts` | ✅ done (red → green): `compactLabel` in config table; `getTicketTypeConfig` without prices (1yo→Baby, 8yo→Barn, 25yo/null→Voksen); aggregator bucketing/order/counts/config. Reuses `TicketFactory.defaultTicketPrices()`, existing `referenceDate` + birthdates, `HouseholdFactory.defaultInhabitantData` — no new age-limit variants (classifier variance already covered) |
| `useBilling.nuxt.spec.ts` | ✅ existing `formatTicketCounts` tests stay green unchanged through the `compactLabel` refactor |
| `AllergyTypeCard.nuxt.spec.ts` | ✅ done (red → green): badge shows `Barn` for a child birthDate (factory canon: Anna adult, Bob child, Clara baby) |
| pdf page spec (new: `tests/component/pages/admin-allergies-pdf.nuxt.spec.ts`) | ✅ done (red → green): child+baby not rendered as Voksen; counts via `formatTicketCounts` |
| `AllergyPoster.e2e.spec.ts` (new) | ✅ done: render smoke only — logged-in, header + table visible |

**Extra finding fixed en route:** the allergies store's catalog fetch had no ADR-007
`transform` — dates arrived as JSON strings (masked before because the broken classifier
never read `birthDate`). Catalog now parses with `AllergyTypeDetailSchema` (ADR-010 domain
types); the store spec's catalog mocks corrected to the Detail shape the endpoint actually
returns.

**Verified 2026-09-01:** `pre:all` ✅ · full vitest 2140/2140 ✅ · e2e smoke 1/1 ✅

### Affected Areas

- Modified: `app/composables/useTicket.ts`, `app/composables/useBilling.ts`,
  `app/pages/admin/allergies/pdf.vue`, `app/components/allergy/AllergyTypeCard.vue`,
  `app/components/admin/AdminAllergies.vue` (passes prices prop),
  `app/components/household/HouseholdAllergies.vue` (one-line price pass)
- Side-findings recorded: admin pages are readable by any logged-in user
  (`GET /api/admin/* → isAuthenticated`) so the poster QR flow works for members; the
  external QR service (`api.qrserver.com`) is noted, not part of this fix.

---

## C1 — Server-reachable composables & the missing typecheck gate

### Problem

CI run 33564747955 (PR #165) failed in the e2e API step: `GET /api/admin/billing/current-period`
answered 500 `useTicket is not defined`. `pre:all` (lint + `vue-tsc --noEmit`) was green, the full
Vitest suite was green, and the defect surfaced only once a Playwright test hit the endpoint —
37 API tests and the whole UI project never ran.

### Root Cause

Three layers, each necessary:

1. **A bare auto-import in a composable the server imports.** A1 moved the V/B/b letters into
   `ticketTypeConfig`, and `useBilling.ts` picked them up with a bare call:
   ```ts
   // app/composables/useBilling.ts:20 (fe7e40e)
   const {ticketTypeConfig} = useTicket()
   ```
   `useBilling` is imported by `financesRepository.ts`, `generateBilling.ts` and the billing
   endpoints. Nitro auto-imports only `server/utils` and h3 — never `app/composables` — so the
   call is a `ReferenceError` on every server use.
2. **The root typecheck runs in the app flavour.** `tsconfig.json` extends the legacy
   `.nuxt/tsconfig.json` and includes `.nuxt/**`; `.nuxt/types/imports.d.ts` therefore declares
   every app auto-import as a global for server files too. Nuxt 4 generates a separate
   `.nuxt/tsconfig.server.json` (server sources + Nitro auto-imports only) that flags the line as
   `TS2304` — nothing ran it.
3. **The same class of latent bug existed 43 more times**, e.g.
   ```ts
   // app/composables/useBooking.ts:1297-1299 — the author knew
   // Lazy import: useOrder relies on Nuxt auto-imports, only available client-side
   const {orderStateConfig, formatGuestLabel} = useOrder()

   // app/composables/useUserRoles.ts:70-73 — Pinia + design system in a server-imported file
   const authStore = useAuthStore()
   const {systemRoles, isAdmin, isAllergyManager} = storeToRefs(authStore)
   const {ICONS} = useTheSlopeDesignSystem()
   ```
   plus bare `formatDate`/`toDate`/`copyPartialDateRange`… calls in `useSeason` and
   `useCookingTeam`, and three server-side typing gaps the server project could not see:
   `types/cloudflare.d.ts` (Nitro `TaskContext` augmentation) sat outside the Nuxt 4 context
   directories, `teamService.ts` used the `D1Database` global, `eventHandlerHelper.ts` imported
   `#app`.

### Fix — ADR-017 [Isomorphic Composables, Pure UI Composables and Per-Context Type Checking]

**Gate.** `pre:all` now runs every generated project explicitly:

```
"ts":        "npx vue-tsc --noEmit",                              // root: app + tests
"ts:server": "npx vue-tsc --noEmit -p server/tsconfig.json",      // Nitro project
"ts:node":   "npx vue-tsc --noEmit -p .nuxt/tsconfig.node.json",  // nuxt.config / app.config / vitest.config
"pre:all":   "npm run lint && npm run ts && npm run ts:server && npm run ts:node"
```

CI already calls `pre:all` before unit tests, so the workflow is unchanged. Nuxt's own
`nuxt typecheck` (`vue-tsc -b` over root `references`) is the target layout but is broken on
Nuxt 4.3.1 / @nuxt/cli 3.33.1 (nuxt/nuxt#34385, fix PR #35195 unmerged); recorded as follow-up.

**Cleanup (44 server-project errors → 0, 1 node-project error → 0):**

| Errors | Where | Fix |
|---|---|---|
| 3 | `server/tasks/*` `TaskContext.cloudflare` | `types/*.d.ts` → `shared/types/` (Nuxt 4: augmentations must live in `app/`, `server/` or `shared/`); root include `shared/**/*` |
| 3 | `server/utils/teamService.ts` `D1Database` | Explicit `import type` from `@cloudflare/workers-types` (house pattern) |
| 1 | `server/utils/eventHandlerHelper.ts` `#app` | `import type {NuxtError} from 'nuxt/app'` |
| 1 (node) | `app/app.config.ts` `~~/prisma/generated/zod` | Relative path (node project has no `~~` alias) |
| 11 | `useSeason.ts`, `useCookingTeam.ts` | Explicit `~/utils/date` / `useCookingTeamValidation` imports; typed app-config ticket-price callback |
| 2 | `useBooking.ts` `useBilling`, `ScaffoldResult` | Explicit imports; `TransactionCreateData` now a schema in `useBillingValidation` (app no longer imports from `~~/server`) |
| 19 | `useBooking.ts` → `useTheSlopeDesignSystem.ts` | Presentation → new pure UI composable **`useBookingUi`**: `createBookingBadge(s)`, `createDiningModeBadge`, `createChefBadges`, `STEP_ICONS`, `formatActionPreview`, `ACTION_PREVIEW`, `DeadlineBadgeData`, `ActionPreviewItem`. `DINNER_STEP_MAP` is icon-free; `useBooking` no longer imports the design system |
| 4 | `useUserRoles.ts` composable | `useUserRoles()` → **`useUserRolesUi`** (auth store + design system); `useUserRoles.ts` keeps `reconcileUserRoles` / `ROLE_OWNERSHIP` |
| 1 | `usePermissions.ts` `isHouseholdMember` | Session predicate moved to `auth.ts` (`isMemberOfHousehold` = `isInHousehold(user, id)`) |

Convention introduced: `use<Domain>Ui.ts` = client-only presentation, never imported by
`server/`; the design system stays page layout + tokens.

**Nuxt 4 references:** upgrade guide "TypeScript Configuration Splitting" (per-context configs,
`references` root, "Augmenting types from outside the app/, server/, or shared/ directories will
not work"); `guide/concepts/typescript` (type augmentation per context); `directory-structure/server`
("Do not import Vue app code … in your server routes or utilities"; `server/types` auto-imported
server-side only); `directory-structure/shared` (`shared/types` for both contexts);
`directory-structure/tsconfig` (default `references` root).

### TDD

| Test | Change |
|------|--------|
| `npm run ts:server` | red 44 → green 0; negative check: a bare `useTicket()` in `useBilling.ts` fails with `TS2304` |
| `npm run ts:node` | red 1 → green 0 |
| `useBookingUi.nuxt.spec.ts` (new) | `STEP_ICONS` covers every `DinnerStepState` and `DINNER_STEP_MAP` is icon-free; parametrized `createBookingBadge` (open / closed / 1 and n released), `createDiningModeBadge` (open, <24h, <1h, closed), `createBookingBadges`, `createChefBadges` (steps 1-4, done/pending per state, released counts on a closed booking) |
| `useBooking.nuxt.spec.ts` | Action-preview describe now takes `formatActionPreview`/`ACTION_PREVIEW` from `useBookingUi()`; everything else unchanged |
| `useUserRoles.nuxt.spec.ts` → `useUserRolesUi.nuxt.spec.ts` + `useUserRoles.unit.spec.ts` | Display tests follow the composable (auth-store mock kept); reconciliation tests run against the module in the plain unit environment |
| `DinnerBookingForm.nuxt.spec.ts` | Mocks `useAuthStore().isMemberOfHousehold` instead of `usePermissions().isHouseholdMember` |
| `ActionPreview.nuxt.spec.ts` | Type import path |

### Affected Areas

- New: `app/composables/useBookingUi.ts`, `app/composables/useUserRolesUi.ts`, `shared/types/{cloudflare,auth}.d.ts` (moved from `types/`), `tests/component/composables/{useBookingUi.nuxt,useUserRolesUi.nuxt,useUserRoles.unit}.spec.ts`
- Modified: `package.json`, `tsconfig.json`, `app/app.config.ts`, `app/composables/{useBooking,useSeason,useCookingTeam,useUserRoles,usePermissions,useBillingValidation}.ts`, `app/stores/auth.ts`, `server/utils/{teamService,eventHandlerHelper}.ts`, `server/data/financesRepository.ts`, components `BookingGridView`, `GuestBookingForm`, `DinnerBookingForm`, `ActionPreview`, `DinnerStatusStepper`, `ChefDinnerCard`, `DeadlineBadge`, `AdminUsers`, `UserProfileCard`, docs (`adr.md`, `adr-compliance-frontend.md`, `CLAUDE.md`, prepare-to-ship skill)
- Removed: `types/`, `tests/component/composables/useUserRoles.nuxt.spec.ts`

---

## C2 — E2E stability (tests only)

### Problem

Running the full suites locally (never done for this branch in CI, because C1 stopped the
pipeline at the API step) surfaced two deterministic-under-load failures that CI on main had
not shown:

1. Parallel API project: 1-2 tests per run failed on `GET /api/admin/season` → 400, mostly
   in `SeasonFactory.cleanupSeasons`. Body: `ticketPrices: Udfyld mindst en billettype`.
2. `AdminHouseholds.e2e.spec.ts`: 3 of 5 tests failed, and 4 of 5 when run alone — the inline
   create form never opened, search/delete/move interactions had no effect.

### Root Cause

1. A season another worker is creating is briefly visible without its ticket prices
   (`createSeason` is a nested Prisma create; D1 has no transactions), and the list endpoint
   rejects the whole list while that row exists. Exposure grew with #164, which makes the
   factory re-verify its cached singleton and fall back to the list endpoint far more often.
2. Hydration race: the spec's navigation helper waits for server-rendered rows, which are
   visible seconds before Vue attaches listeners in dev mode (trace: click at +1.8 s, last of
   822 module requests at +6.6 s), so the first click/fill is lost.

### Fix — polling for a signal, no application code

| Change | Where |
|--------|-------|
| `getAllSeasons` polls the list endpoint until it answers with the expected status, then asserts every season has ticket prices before continuing | `tests/e2e/testDataFactories/seasonFactory.ts` |
| `waitForHydration(page)` — `pollUntil` on `useNuxtApp().isHydrating === false` (exposed as `window.useNuxtApp` in every client build) | `tests/e2e/testHelpers.ts`, called at the end of `navigateToHouseholds` |
| Documented under "Waiting Patterns" | `docs/testing.md` |

### TDD

| Test | Result |
|------|--------|
| `npx playwright test --project=chromium-api` | 223 passed with the polling helper (previously 1-2 failures per run) |
| `AdminHouseholds.e2e.spec.ts` alone, then `--project=chromium-ui --project=chromium-ui-serial` | see Verified line below |

---

## Decisions (2026-09-16)

- **Editable content lives in the database.** Nuxt `app.config` and `runtimeConfig` are build/deploy-time: `nuxt/dist/app/config.js` hands
  each request a `klona` copy and Nitro deep-freezes its copy; nothing persists. `updateAppConfig()` is in-memory reactivity only.
- **Two tables, one pattern.** `Setting` (global, key `@id`) and `UserPreference` (`@@id [userId, key]`, CASCADE with the user) share the
  same key + JSON-value shape and a code registry per table (keys, value schema, default, writer). One migration bundles both. Not one table:
  SQLite treats NULLs as distinct in UNIQUE (global rows with `userId NULL` would duplicate), the cascade differs, the authorization differs,
  and no query spans both scopes.
- **Shared design lives in `useTheSlopeDesignSystem`.** Alerts get a responsive `ALERTS` pattern, every `UAlert` migrates to it, and an
  architecture test forbids raw `UAlert` props. No Nuxt UI theme override in `app.config`.
- **Planning only.** `/admin/teams` keeps `FormModeSelector`; conversion is a follow-up.
- **Mockups** are ASCII in this doc and repeated in the component header comment (`AdminPlanning.vue`, `SeasonSelector.vue`, `UserProfileCard.vue` style).
- **Notes box: same look on the admin page and the poster** (2026-09-16): neutral outline with dark text as before, plus the ⚠ icon — `v-bind="ALERTS.legend" :icon="ICONS.warning"`. `AllergyNotes` binds exactly that on both mounts.
- **Teams page, edit mode with zero teams** (2026-09-16): renders the teams table branch, so its `#empty` slot shows the one empty state + "Opret madhold" CTA; no new component, no second copy of the block. Ships with the QR package.
- **Booking grid, week or month without dinners** (2026-09-16): `tableData` is empty when there are no events, so the `UTable` `#empty` slot renders the grid’s empty state; no standalone alert. Ships with the QR package.
- **Edit affordances** (2026-09-16): table rows keep the ghost pencil `BUTTONS.edit`; a form or card’s edit entry is the labelled button `BUTTONS.secondaryAction` + `COLOR.primary` + `ICONS.edit` + "Rediger <navn>" — e.g. "Rediger Forår 2026" (the chef menu card pattern, label names the record like the household "Slet …" button). Applies to the season card (Planning form) and the allergy detail header (QR batch). Rule goes into `docs/ui.md`.
- **Season card title names the season** (2026-09-16): "Fællesspisning sæson 08/26-07/27" (view), "Rediger fællesspisning sæson …" (edit), "Opret fællesspisning sæson …" (create, name appears once the dates are set); the read-only "Sæson" input is removed — dates are never shown as a form element.
- **Date picker selection style** (2026-09-16): pickers render selected days through the same `#day` slot and the one DS helper `dayCircleClasses(variant)` the display calendars use; `CALENDAR.picker = {cookingDay: PLANNING_CALENDAR.day.generated, holiday: CALENDAR.holiday}` (references, no new class strings), chosen by a `selection` prop; Nuxt UI’s own selection fill is neutralised; no `:color` prop on pickers. Green stays reserved for holidays.
- **Colors in "My preferences": OPEN** — curated presets vs user-picked colors vs hybrid, compared under "My preferences"; decided at that
  package's approval gate. Schema, endpoints and store do not depend on it (JSON value typed in the registry).
- **Editing the live season needs no deactivation.** Saving already reconciles dinner events (ADR-015 [Idempotent Automated Jobs with Rolling
  Window] `pruneAndCreate`); orders on removed dates cascade by schema design (ADR-013 [External System Integration Pattern]: billing survives via
  `Transaction.orderSnapshot`, audit via `OrderHistory`). The only gap is that preference clipping and pre-booking scaffolding wait for the nightly
  job, so the save endpoint runs the same two idempotent jobs activation runs. Reconciliation also gets the Heynabo delete callback it never passed.
- **Approval gate per package.** Before any programming agent starts, the package brief (scope, files, red tests, test-ids, open decisions, agent)
  is posted for approval or fine-tuning. Agents never commit; the user commits per package.

---

## Alerts on mobile

### Problem

`UAlert` renders wider than the phone viewport or clips its content: long Danish sentences, e-mails and URLs in `title`/`description`
never wrap, action buttons don't wrap, padding is fixed. 56 instances in 34 files, none pass `orientation`; five sites patch the symptom
locally (`HouseholdCard.vue:330-331` `min-w-0` + `break-words`, `TeamRoleStatus.vue:79`, `ChefMenuCard.vue:605`, `UserProfileCard.vue:339`,
`AllergyManagersList.vue:34`); three pass an invalid `type="info"`; three carry a no-op `class="space-y-4"`.

### Root Cause

Nuxt UI 4.3.0 alert theme: `root "relative overflow-hidden w-full rounded-lg p-4 flex gap-2.5"`, `title`/`description` without any wrap
class, `actions "… shrink-0"`. The design system has no alert token beyond `COMPONENTS.emptyStateAlert(Compact)`, so every site hand-picks props.

### Solution

1. **Repro first**: `tests/e2e/ui/MobileViewport.e2e.spec.ts` (375×812, admin) over `/admin/allergies`, `/admin/system`, `/admin/users`,
   `/dinner`, `/admin/allergies/pdf`, `/household/<own>/settings`, `/login`: screenshot + `scrollWidth <= innerWidth`. Screenshots land here.
2. **Classify** all 56 sites into kinds (table added here before the sweep). Factory `createResponsiveAlerts(isMd)` next to
   `createResponsiveButtons`, exported as `ALERTS`:

   | `ALERTS.` | color / variant / default icon | orientation | used for |
   |---|---|---|---|
   | `info` | info / subtle / `ICONS.info` | vertical | prose, visitor banner |
   | `neutral` | neutral / subtle / `ICONS.robotHappy` | vertical | economy hints, read-only banner |
   | `success` · `warning` · `error` | semantic / soft / `checkCircle` · `warning` · `exclamationCircle` | vertical | status, residency, poster notes, job errors |
   | `legend` | neutral / outline / none | vertical | "Forklaring", ActionPreview, delete-cascade |
   | `callToAction` | info / soft, avatar allowed | `isMd ? 'horizontal' : 'vertical'` | `:actions`, banners with `#actions` |
   | `emptyState` · `emptyStateCompact` | migrated from `COMPONENTS` | vertical | empty states |

   Shared `ui` on every kind: `root 'min-w-0 p-3 md:p-4'`, `title`/`description 'wrap-anywhere'` (Tailwind 4.1.18; `overflow-wrap:anywhere`
   counts in min-content sizing, `break-words` does not), `actions 'flex-wrap'`. `md:` classes over `isMd` (SSR-safe); `isMd` only for prop values.
   Sites keep only `:title` `:description` `:icon` `:avatar` `data-testid` `class`; dynamic color = `v-bind="ok ? ALERTS.success : ALERTS.error"`.
3. **Sweep** all 56 sites; delete `COMPONENTS.emptyStateAlert*`, the local patches, `type=`, `space-y-4`; `docs/ui.md` example → `v-bind="ALERTS.warning"`.
   The duplicated "Forklaring" legends (`BookingGridView.vue:835`, `DinnerBookingForm.vue:876`) → `DinnerModeLegend.vue` if the repro shows overflow.
4. **ADR-019 [Design system owns shared UI patterns — components bind tokens, never raw Nuxt UI props]**, enforced by an architecture test.

### Mockup — ✅ signed off, applied 2026-09-16 (padding kept at the theme `p-4`; `callToAction` became the `withActions` modifier)

```
BEFORE (<md)                                AFTER (<md)  v-bind="ALERTS.info"
┌──────────────────────────────┐            ┌──────────────────────────────┐
│ ⓘ Brugere                    │            │ ⓘ Brugere                    │
│   Her kan du se de brugere, s│om vi ha…   │   Her kan du se de brugere,  │
│   Heynabo-import@…            (clipped)   │   som vi har importeret fra  │
│  [Handling][Handling 2]      │            │   Heynabo. Brug System-fanen │
└──────────────────────────────┘            │   [Handling]  [Handling 2]   │ actions wrap
p-4 fixed · overflow-hidden clips ·         └──────────────────────────────┘
long words/emails/URLs never break          p-3 md:p-4 · wrap-anywhere · actions flex-wrap
                                            callToAction: vertical <md, horizontal md+
```

### TDD

| Test | Change |
|------|--------|
| `MobileViewport.e2e.spec.ts` (new) | red on the overflowing pages, green after the sweep; the regression guard |
| `tests/component/architecture/designSystemAlerts.unit.spec.ts` (new) | walks `app/**/*.vue`: every `<UAlert` has `v-bind="ALERTS.` and no literal `color=`/`variant=`/`type=` — red on 56 sites today |
| design-system spec | every `ALERTS` kind carries the wrap classes; `callToAction.orientation` flips with `isMd`; per-call `:ui` still merges |
| existing component specs | stay green (they assert text, not classes); e2e locators `admin-readonly-banner`, `visitor-banner` unchanged |

### Affected Areas

`app/composables/useTheSlopeDesignSystem.ts`, 34 component/page files, `docs/ui.md`, `docs/adr.md` (ADR-019), compliance checklist.

### Classification — ✅ applied (2026-09-16)

#### (a) Repro — `tests/e2e/ui/MobileViewport.e2e.spec.ts`, 375×812, admin UI session, 7/7 GREEN

`scrollWidth - innerWidth` is **0 on every page**: the alert theme's `root` carries `overflow-hidden` and its `wrapper` carries
`min-w-0 flex-1`, so an over-wide alert clips instead of scrolling the document. Second measurement (temporary probe, deleted):
per-element `scrollWidth - clientWidth` + box-wider-than-viewport.

| Page | overflow px | Alerts rendered (root/child clip) | Other clipping measured | Screenshot |
|---|---|---|---|---|
| `/admin/allergies` | 0 ✅ | 1 — `AllergyManagersList` w=343, clip 0/0 | none | `test-results/mobile/alerts-admin-allergies-*.png` |
| `/admin/allergies/pdf` | 0 ✅ | 2 — poster notes + managers, w=311, clip 0/0 | `div.flex.gap-6` (table+QR column) clipped 27px | `…alerts-admin-allergies-pdf-*.png` |
| `/admin/system` | 0 ✅ | 0 (error alert only on job error) | job-history `UTable` wrapper scrolls 1596px; settings-tree `span.truncate` clips `holidayUrl: https://www.lejre.dk/…` by 273px | `…alerts-admin-system-*.png` |
| `/admin/users` | 0 ✅ | 1 — `AdminUsers:151` w=295, clip 0/0, description wraps over 5 lines | `UTable` wrapper scrolls 576px (mail column cut in the screenshot) | `…alerts-admin-users-*.png` |
| `/dinner` | 0 ✅ (3px in the probe) | screenshot: `DinnerBookingForm:876` legend (mode row wraps to 2 lines) + `AllergenMultiSelector:162` compact empty state, both fit | while `DinnerDetailPanel` shows its skeleton, `UPageCard` inner `p-4 sm:p-6` is 3px wider → doc overflow 3px | `…alerts-dinner-*.png` |
| `/household/<own>/settings` | 0 ✅ | 0 (edit + last-result alerts are state-gated) | none | `…alerts-household-settings-*.png` |
| `/login` | 0 ✅ | 0 (error alert only on failed login) | none | `…alerts-login-*.png` |

**Consequences for the sweep:** (1) the guard is green today, so it guards *against regression*, it does not prove the bug;
(2) the mockup's "actions don't wrap" premise does not hold — the generated theme already ships `actions: "flex flex-wrap gap-1.5 shrink-0"`
and `wrapper: "min-w-0 flex-1"` (`.nuxt/ui/alert.ts:29-39`); only `title`/`description` lack a wrap class, so the residual defect is a long
unbroken token (mail/URL) *clipped* inside an alert — no page renders one today; (3) at most 6 of the 56 sites render in the repro
(the rest are state-gated), so the token change must be covered by component specs, not by this guard; (4) `/dinner`'s 3px makes `<= 0` borderline.

#### (b) Classification — 56 sites / 34 files, all migrated (theme defaults were `color=primary`, `variant=solid`)

| Site | Props today | Kind | Visual change / note |
|---|---|---|---|
| `AdminAllergies.vue:360` | soft, `COLOR.success`, avatar, `:ui=emptyStateAlert`, `#actions` | `emptyState` | empty state **with** a CTA button — see kind gap below |
| `AdminEconomy.vue:609` | neutral/subtle/`robotHappy`, title+desc | `neutral` | none |
| `AdminEconomy.vue:741` | neutral/subtle/`robotHappy` | `neutral` | none |
| `AdminEconomy.vue:876` | neutral/subtle/`robotHappy` | `neutral` | none |
| `AdminPlanning.vue:238` | `color=info`, **no variant → solid**, avatar 💤, `class="space-y-4"` | `emptyState` | solid info → soft/centered; drop no-op `space-y-4` |
| `AdminSystem.vue:377` | `COLOR.error`/subtle/`exclamationCircle` | `error` | subtle → soft |
| `AdminTeams.vue:460` | `color=info`, no variant → solid, avatar 💤, `:actions`, `space-y-4` | `emptyState` | solid → soft; empty state **with** `:actions`; drop `space-y-4` |
| `AdminToCreateSeason.vue:6` | `color=info`, no variant → solid, avatar 🧘, `:actions`, `space-y-4` | `emptyState` | as above |
| `AdminUsers.vue:151` | outline, icon `authorized`, title+desc | `info` | outline → subtle; keep domain icon |
| `HouseholdCreateForm.vue:135` | neutral/soft/avatar 🏠/`:ui=emptyStateAlert` | `emptyState` | none |
| `AllergenMultiSelector.vue:162` | no color/variant → **primary/solid**, `:ui=emptyStateAlertCompact` | `emptyStateCompact` | none (compact `ui` already overrides bg) |
| `AllergenMultiSelector.vue:206` | `COLOR.primary`, no variant → solid, numeric avatar | `info` | **primary/solid → info/subtle** (amber → violet); avatar stays |
| `AllergenMultiSelector.vue:251` | no color/variant, `:ui=emptyStateAlertCompact` | `emptyStateCompact` | none |
| `AllergyDetailPanel.vue:54` | neutral/outline/`ICONS.warning`, `#description` = `<ul>`+badges | `legend` | none; **layout in `#description`** |
| `AllergyManagersList.vue:28` | `props.color=info`/`props.variant=subtle`, `:ui={description: flex flex-col md:flex-row}` | `info` | drop the `color`/`variant` props from the component API; the `:ui` flex row must survive the merge; **layout in `#description`** |
| `AllergyTypeCard.vue:227` | soft/success/avatar/`:ui=emptyStateAlert` | `emptyState` | none |
| `ActionPreview.vue:30` | neutral/outline/`ICONS.ticket`, `#description` = `<ul>`+badges | `legend` | none; **layout in `#description`** |
| `BookingGridView.vue:577` | `residencyAlert.color` (success\|error\|neutral)/soft, `class="mx-2 mt-2"` | `success`·`error`·`neutral` (dynamic) | `v-bind="ALERTS[residencyKind]"` keyed off `RESIDENCY_CONFIG`; keep testid `outside-residency-alert` |
| `BookingGridView.vue:612` | soft/neutral/avatar/`:ui=emptyStateAlert` | `emptyState` | none |
| `BookingGridView.vue:835` | neutral/subtle/`ICONS.info`, "Forklaring", `#description` = flex row of `DinnerModeSelector` | `legend` | subtle → outline; **duplicate of `DinnerBookingForm:876` → `DinnerModeLegend.vue`** |
| `GuestBookingForm.vue:190` | neutral/soft/avatar/`:ui=emptyStateAlert` | `emptyState` | none |
| `ChefMenuCard.vue:600` | warning/soft/`ICONS.info`, `:ui={root:'p-2 mt-2', description:'text-xs'}` | `warning` | local `:ui` fights the kind's `p-3 md:p-4` — keep compact override or accept p-3 (decide) |
| `DinnerStatusStepper.vue:97` | error/soft/`x-circle` | `error` | none |
| `TeamRoleStatus.vue:74` | `isChef ? warning : info`/soft, `:ui={root:'w-full'}` | `warning`\|`info` (ternary) | `w-full` is already in the theme root → delete |
| `CookingTeamCard.vue:225` | soft/neutral/avatar/`:ui=emptyStateAlert` | `emptyState` | none |
| `CookingTeamCard.vue:302` | soft/neutral/avatar/`:ui=emptyStateAlert` | `emptyState` | none |
| `MyTeamSelector.vue:81` | **`type="info"` (invalid)**, soft, `COLOR.info`, `user-group` | `info` | drop `type`; soft → subtle |
| `DinnerBookingForm.vue:538` | `residencyAlert.color`/soft, testid `outside-residency-alert` | `success`·`error`·`neutral` (dynamic) | same map as `BookingGridView:577` |
| `DinnerBookingForm.vue:548` | neutral/soft/avatar/`:ui=emptyStateAlert` | `emptyState` | none |
| `DinnerBookingForm.vue:575` | warning/soft/`ICONS.released` | `warning` | none |
| `DinnerBookingForm.vue:586` | info/soft/`ICONS.claim` (one-liner) | `info` | soft → subtle |
| `DinnerBookingForm.vue:794` | `COMPONENTS.powerMode.alert` (warning/soft/superhero) | `warning` | `powerMode.alert` should shrink to the icon once `ALERTS.warning` exists (token overlap) |
| `DinnerBookingForm.vue:876` | neutral/subtle/`ICONS.info`, "Forklaring" + flex row | `legend` | subtle → outline; **duplicate of `BookingGridView:835`** |
| `HouseholdBookings.vue:273` | `ICONS.calendar`/neutral/soft | `neutral` | soft → subtle |
| `HouseholdBookings.vue:286` | `ICONS.calendar`/**primary**/subtle, testid `household-bookings-empty` | `info` | **primary → info** (amber → violet) |
| `HouseholdCard.vue:324` | `powerMode.alert`, `class="min-w-0"`, `:ui={title/description:'break-words'}` | `warning` | local patches deleted (kind ships `min-w-0` + `wrap-anywhere`) |
| `HouseholdCard.vue:389` | `errored>0 ? error : neutral`/subtle, testid `last-result-alert` | `error`\|`neutral` (ternary) | error branch subtle → soft |
| `HouseholdCard.vue:400` | **primary**/soft/`information-circle`, `#description` = icon rows | `info` | **primary → info**; **layout in `#description`** |
| `HouseholdEconomy.vue:288` | neutral/subtle/`robotHappy` | `neutral` | none |
| `HouseholdEconomy.vue:401` | neutral/subtle/`robotHappy` | `neutral` | none |
| `HouseholdEconomy.vue:413` | warning/subtle/`exclamationCircle` | `warning` | subtle → soft |
| `HouseholdSettings.vue:202` | warning/soft, `editAlert.icon/title/description/testid` | `warning` | none; testids `move-out-warning`/`move-out-change-warning` unchanged |
| `HouseholdSettings.vue:271` | `errored>0 ? error : neutral`/subtle, testid `last-move-out-result-alert` | `error`\|`neutral` (ternary) | error branch subtle → soft |
| `Login.vue:50` | error/soft/`mage-robot-dead`, `class="mb-4"` | `error` | none (keep spacing class) |
| `OrderHistoryDisplay.vue:77` | warning/soft/`exclamationCircle`, title only | `warning` | none |
| `OrderHistoryDisplay.vue:80` | error/soft/`exclamationCircle`, title only | `error` | none |
| `SeasonStatusDisplay.vue:156` | `alertConfig.color/variant/icon` (success+subtle\|outline…), `#actions` = `UFormField`+`DangerButton` | `success`·`warning`·`info` + actions | **kind gap** (below); `#actions` holds a form field, not a button row |
| `UserProfileCard.vue:334` | info/soft/`shield-check`, `:ui={description:'text-sm'}`, `#description` = `<ul>` | `info` | soft → subtle; `text-sm` already the theme default → drop; **layout in `#description`** |
| `pages/admin/[tab].vue:154` | neutral/soft/`eye`, testid `admin-readonly-banner` | `neutral` | soft → subtle; keep `eye` icon + testid |
| `pages/admin/allergies/pdf.vue:153` | warning/outline, `#description` = heading + `<ul>` | `warning` | outline → soft — **check print**: the poster is print-first and has no `UApp`; **layout in `#description`** |
| `pages/chef/index.vue:320` | **`type="info"` (invalid)**, soft, `COLOR.info`, `calendarDays` | `info` | drop `type`; soft → subtle |
| `pages/chef/index.vue:397` | soft/neutral/`userGroup`, title only | `neutral` | soft → subtle |
| `pages/dinner/index.vue:212` | **`type="info"` (invalid)**, soft, `COLOR.info`, `robotDead`, `#actions` = `UButton size=lg` | `emptyState` + actions | drop `type`; empty state **with** `#actions` — kind gap |
| `pages/dinner/index.vue:308` | soft/`COLOR.info`, `#title` only (emoji + fun text) | `info` | soft → subtle |
| `pages/household/[shortname]/[tab].vue:180` | info/subtle/`eye`, testid `visitor-banner`, `#actions` = `DangerButton` | `callToAction` | subtle → soft; vertical <md, horizontal md+ |
| `pages/household/[shortname]/[tab].vue:203` | **warning**/subtle/`authorize`, testid `admin-override-active`, `#actions` = `UButton` | `callToAction` + warning | **kind gap** (below) |

**Counts:** `emptyState` 12 · `info` 10 · `neutral` 8 · `warning` 8 · `legend` 4 · `error` 4 · `emptyStateCompact` 2 ·
`callToAction` 1 · dynamic two-kind ternaries 6 · needs the kind gap resolved 1. `success` has **no** static site (only the residency ternary).

**Kind gap — resolved as a modifier.** `callToAction` was dropped as a kind: orientation is `ALERTS.withActions`, spread over any kind
(`v-bind="{...ALERTS.warning, ...ALERTS.withActions}"`), and `emptyState` stays vertical/centred even with a CTA. The five sites that
needed "this kind **plus** actions" landed as: `SeasonStatusDisplay` (kind by season status + `withActions`), `[tab].vue:180/:203`
(`info`/`warning` + `withActions`), `AdminTeams` (moved into the table's `#empty` slot), `AdminToCreateSeason` and `dinner/index.vue:212`
(`emptyState`, CTA centred). No site needed a colour outside the kind table.

**Applied 2026-09-16.** Final kinds: `info` · `neutral` · `success` · `warning` · `error` · `legend` · `emptyState` · `emptyStateCompact`,
plus the `withActions` modifier. Padding stayed the theme's `p-4` (the mockup's `p-3 md:p-4` was dropped — no visual change);
`actions: 'flex-wrap'` dropped as a no-op (already in the theme). Shared `ui` per kind: `root 'min-w-0'`, `title`/`description 'wrap-anywhere'`.

**Applied tally, 55 `<UAlert>` sites** (56 − 2 duplicated legends + 1 inside `DinnerModeLegend.vue`):
`emptyState` 12 · `info` 10 · `warning` 9 · `neutral` 8 · `error` 4 · `legend` 3 · `emptyStateCompact` 2 ·
dynamic 7 (`ALERTS[residency.color]` ×2, `error|neutral` ternary ×2, `warning|info` ternary, `ALERTS[props.kind]`, `ALERTS[alertConfig.kind]`).
`withActions` on 3 sites.

**Deltas beyond the table above** (the kind's default won over the site's local pick — on the user's visual-check list):
`AdminAllergies:360` and `AllergyTypeCard:227` empty states go success → neutral (one `emptyState` kind);
`dinner/index.vue:212` becomes a centred `emptyState` rather than a left-aligned info alert;
`ChefMenuCard:600` loses its `p-2`/`text-xs` compact override (decided: dropped);
and three sites now show the kind's default icon where they had none or another one —
`pdf.vue:153` (poster notes gain the warning triangle — **check the print**), `dinner/index.vue:308` (info circle beside the emoji title),
`HouseholdEconomy:413` (`exclamationCircle` → triangle). `OrderHistoryDisplay:77` keeps its `exclamationCircle` via an explicit `:icon`.

#### (c) Not fixed by the alert token

| Finding | Where | Note |
|---|---|---|
| `UTable` wrapper scrolls far wider than the phone | `/admin/users` (576px), `/admin/system` job history (1596px) | mail/result columns cut off in the screenshots — table/responsive-column concern |
| `span.truncate` clips a long URL by 273px | `/admin/system` settings tree (`holidayUrl`) | tree cell, not an alert |
| Poster table + QR flex row clipped 27px | `/admin/allergies/pdf` `div.flex.gap-6.mb-6` | poster layout; print-first page |
| 3px document overflow while the skeleton renders | `/dinner` `UPageCard` inner `p-4 sm:p-6` | makes the repro's `<= 0` borderline on `/dinner` |
| Layout inside `#description` (flex rows, `<ul>`, badges, selectors) | `AllergyManagersList:36`, `AllergyDetailPanel:60`, `ActionPreview:37`, `BookingGridView:843`, `DinnerBookingForm:884`, `HouseholdCard:406`, `UserProfileCard:341`, `pdf:154` | `wrap-anywhere` cannot wrap a flex row of badges — each needs its own responsive classes or extraction (`DinnerModeLegend.vue`) |
| `actions: 'flex-wrap'` in the planned shared `ui` | theme already ships `actions: "flex flex-wrap gap-1.5 shrink-0"` | no-op — drop it from the plan |

#### (d) Verified — 2026-09-16

- **Red first:** `designSystemUsage.unit.spec.ts` failed on 56 sites (no `ALERTS` token) and 53 sites (raw `color`/`variant`/`type`),
  reported as `file:line`; the two other rules (`UCalendar` → `COMPONENTS.calendarGrid`, no `#empty-state`) were already green.
  `AdminTeams.e2e.spec.ts`'s new empty-state case failed with `locator('table')` not found — the standalone alert rendered *instead of* the table.
- **Green:** all 4 architecture rules pass; `npm run test:unit` 2261 passed / 84 files; `npm run lint` clean;
  `ts:server` and `ts:node` clean; e2e `MobileViewport` + `admin` + `household` + `AdminTeams` + `AdminAllergies` + `AllergyPoster`
  = **69 passed** (`--workers=4`).
- **Reuse:** the standalone "Her ser lidt tomt ud!" teams alert moved into the teams table's `#empty` slot (`showAdminTeams` no longer
  hides the table for a season with no teams), and the two identical "Forklaring" legends became `app/components/dinner/DinnerModeLegend.vue`.
- **Tests assert usage and behaviour, never token values** (`docs/testing.md` → *Architecture tests*): the architecture rules,
  `DinnerModeLegend.nuxt.spec.ts` (rendered modes / CTA / hint), `ChefCalendarDisplay.nuxt.spec.ts` (agenda `#empty` text),
  the `AdminTeams` e2e case, and `MobileViewport.e2e.spec.ts`. The `withActions` `isMd` branch is the one factory case kept in the
  design-system spec; the class-string assertions written first were removed.
- **Known-broken gate, not caused by this package:** `npm run ts` fails with `TS2688 Cannot find type definition file for
  '@cloudflare/workers-types/2023-07-01'` — `@cloudflare/workers-types` is now `^5.20260916.1` and v5 dropped the dated entry points.
  Fix is one line in `tsconfig.json`: `"@cloudflare/workers-types/2023-07-01"` → `"@cloudflare/workers-types"`. With that entry
  substituted, a full `vue-tsc` over `app/ server/ tests/ shared/` is clean.

### Empty states render again — ✅ IMPLEMENTED (2026-09-16)

- **Root cause:** six `UTable`s used the Nuxt UI **v2** slot name `#empty-state`. Nuxt UI 4.3 has exactly one empty slot, `#empty`
  (`Table.vue:426-430`, typed `Table.vue.d.ts:173`; the string `empty-state` exists nowhere in the package), so every one of those
  templates was dead and the tables fell back to the built-in "No data" text.
- **Sites renamed** `#empty-state` → `#empty`: `BookingGridView.vue:611`, `AllergyCatalogTable.vue:181-182` (forward
  `v-if="$slots.empty" #empty`), `AdminAllergies.vue:359`, `AdminHouseholds.vue:235`, `AdminTeams.vue:631`,
  `ChefCalendarDisplay.vue:345`, `InhabitantSelector.vue:141`. The `teams-empty-state` **testid** is unchanged.
- **Tests:** `AdminAllergies.nuxt.spec.ts` (empty catalog message + `create-first-allergy-type` gated on `canEdit`),
  `AllergyCatalogTable.nuxt.spec.ts` (`#empty` forwarded only with zero rows), `InhabitantSelector.nuxt.spec.ts` (empty text for
  "no inhabitants" and "search without matches"), `AdminHouseholds.e2e.spec.ts` (search with no matches). Red 5/74 → green 116/116;
  e2e 19 passed (`MobileViewport` + `AdminAllergies` + `AdminHouseholds`, `--workers=4`).
- **Two of the six remain unreachable** — the rename is correct but nothing renders them, because `UTable` only shows `#empty` when
  `data.length === 0`: `AdminTeams.vue:631` sits behind `v-else-if isNoTeams` (`:460`), which shows the "Her ser lidt tomt ud!" alert
  *instead of* the table; `BookingGridView.vue:611`'s `data` is `tableData` (power row + inhabitants + guests), which is never empty —
  probed with zero dinner events: `{"hasEmptySlot":false,"bodyRows":2}`. Making the grid's empty state reachable needs
  `tableData` to return `[]` when `flatEvents` is empty — a UX change (an event-less week would show the alert instead of a blank grid),
  parked for signoff.
- **Overflow measurement (empty bookings week, 375×812, temporary probe, deleted):** the state cannot be reached from the URL either —
  `useDinnerDateParam` (`useBookingView.ts:19-38`) validates `?date` against the season's dinner dates, so `date=01/01/2020` was rewritten
  to `date=18/09/2026` on hydration. Measured on that page: `documentOverflow: 0` at `innerWidth: 375`, no element extending past the
  viewport and no element with `scrollWidth > clientWidth`. The reported "empty state gives horizontal scroll" is therefore **not**
  reproducible on the bookings grid today.

---

### Visual check — Alert tokens and sweep (walk before the package is approved; copied into the PR description)

| Route + state | Viewport | DS element to expect | Expect |
|---|---|---|---|
| `/admin/planning`, no season selected | 375px + desktop | `ALERTS.emptyState` | soft neutral, centred, large title, 💤 avatar (was a solid violet block) |
| `/admin/planning`, season selected, each status | both | `ALERTS[success\|info\|warning\|neutral]` + `ALERTS.withActions` (`SeasonStatusDisplay`) | ACTIVE success/soft; FUTURE info/subtle; CURRENT warning/soft; PAST neutral/subtle. Activate/Deactivate beside the text on desktop, below it on the phone |
| `/admin/planning` or `/admin/teams` with no seasons | both | `ALERTS.emptyState` + `BUTTONS.primaryAction` CTA (`AdminToCreateSeason`) | soft neutral centred; "Opret ny sæson" centred under the text |
| `/admin/teams?season=<season without teams>` | both | `UTable #empty` slot → `ALERTS.emptyState` + `create-new-team` CTA | the table renders (header + empty row) with the 💤 empty state and "Opret madhold" inside it |
| `/admin/teams?mode=edit&season=<season without teams>` | both | master-detail placeholder (no alert) | "Vælg et madhold for at redigere" (URL-only edge case) |
| `/admin/allergies`, empty catalog | 375px + desktop | `UTable #empty` → `ALERTS.emptyState` + `create-first-allergy-type` | neutral (was green); "Tilføj allergi" unchanged |
| `/admin/allergies` footer | both | `AllergyManagersList kind="info"` → `ALERTS.info` + its description flex row | unchanged look; managers beside the message on desktop, under it on the phone |
| `/admin/allergies/pdf` + print preview | desktop + print | `ALERTS.legend` + `:icon="ICONS.warning"` (notes — decided 2026-09-16: unchanged neutral outline, dark text, ⚠ added; same on page and poster), `AllergyManagersList kind="neutral"` → `ALERTS.neutral` | "Vigtige bemærkninger" as before, with a ⚠ next to the heading; managers box subtle |
| `/admin/users` | both | `ALERTS.info` | violet subtle (was amber outline); `authorized` icon kept |
| `/admin/system`, a job with an error | both | `ALERTS.error` | soft (stronger red) |
| `/admin/economy` (3 empty states) | both | `ALERTS.neutral` | unchanged |
| `/admin/households` create form, Heynabo without addresses | both | `ALERTS.emptyState` | unchanged |
| `/household/<own>/members`, ⚡ power row expanded | 375px | `ALERTS.warning` (power mode), local wrap patches removed | warning still fits; long sentence wraps, no clipping |
| `/household/<own>/members`, bottom info alert | both | `ALERTS.info` | violet subtle (was amber soft); icon rows unchanged |
| `/household/<own>/members`, after saving preferences | both | `errored ? ALERTS.error : ALERTS.neutral` | success path unchanged; error branch soft |
| `/household/<own>/settings`, pencil → edit move-out | both | `ALERTS.warning` | unchanged; testids intact |
| `/household/<own>/settings`, after saving a move-out date | both | `errored ? ALERTS.error : ALERTS.neutral` | error branch soft |
| `/household/<own>/bookings?view=day` | 375px + desktop | `DinnerModeLegend` → `ALERTS.legend` | "Forklaring" outline box; 4 modes + "Blandet"; no "Ændret", no hint |
| `/household/<own>/bookings?view=week` / `month` | 375px + desktop | `DinnerModeLegend` (grid options) → `ALERTS.legend` | outline "Forklaring" with the "Ændret" marker and the click-a-cell hint |
| `/household/<other>` as visitor | 375px + desktop | `{...ALERTS.info, ...ALERTS.withActions}` | banner soft; "Admin røre alligevel" beside the text on desktop, below on the phone |
| `/household/<other>` after admin override | 375px + desktop | `{...ALERTS.warning, ...ALERTS.withActions}` | same orientation behaviour; soft |
| `/household/<own>/economy` | both | 2 × `ALERTS.neutral`; "Ingen data" `ALERTS.warning` | "Ingen data" soft with the warning triangle |
| `/dinner` with no active season | both | `ALERTS.emptyState` + `BUTTONS.primaryAction` CTA | centred neutral, large title, "Værsgo, opret en ny sæson" centred below (was a left-aligned info alert) |
| `/dinner`, dinner without a team | both | `ALERTS.info` | subtle with ⓘ next to the emoji title |
| `/dinner` day view | 375px | `DinnerModeLegend` → `ALERTS.legend`; released `ALERTS.warning`; claim `ALERTS.info` | legend outline; "Har du brug for flere billetter?" subtle |
| `/chef`, team without dinners | both | `ALERTS.info` | subtle |
| `/chef`, dinner without a team | both | `ALERTS.neutral` | subtle |
| `/chef`, editing a dinner without a menu title | both | `ALERTS.warning` (compact `p-2 text-xs` override removed) | standard alert padding and body text |
| `/chef`, role banner (chef vs cook) | both | `isChef ? ALERTS.warning : ALERTS.info` | chef unchanged; cook branch subtle; still full width |
| `/chef/dinner/<cancelled>`, `/login` wrong password, `/admin/economy` order-history errors | both | `ALERTS.error` / `ALERTS.warning` | unchanged |

---

## Poster notes

### Problem

The poster's "Vigtige bemærkninger" (three bullets, `pdf.vue:157-161`) exist nowhere else: not on `/admin/allergies`, not editable. The
only text mechanisms are `HELP_TEXTS` and `app.config` (build-time). No settings table exists in the schema.

### Solution

- **Schema** (bundled with "My preferences" in one migration):

  ```prisma
  model Setting {            // global, role-editable; value = JSON typed per key in SETTING_REGISTRY
    key             String   @id
    value           String
    updatedAt       DateTime @updatedAt
    updatedByUserId Int?
    updatedBy       User?    @relation("SettingUpdatedBy", fields: [updatedByUserId], references: [id], onDelete: SetNull)
  }
  ```
- **Registry** (isomorphic, ADR-017 [Isomorphic Composables…]): `useSettingValidation.ts` (`SETTING_KEYS = ['allergy-poster-notes']`, key/detail
  schemas — one entity type, Display ≡ Detail) and `useSetting.ts` (`SETTING_REGISTRY[key] = {valueSchema, defaultValue, canWrite}`; default = today's
  three bullets; writer = `canMutateAllergies`; `splitNotes`). Values are JSON strings; the repository parses with the registry schema (ADR-010).
- **Server**: `server/data/settingsRepository.ts` (`fetchSetting`, `upsertSetting`), `GET /api/admin/setting/[key]` (row or registry default with
  `updatedAt: null`, never 404 for a registered key; all authenticated — the poster is member-readable), `POST /api/admin/setting/[key]`
  (`requireSettingWriteAccess(event, key)` in `authorizationHelper.ts`, 403). Route table: `{prefix: '/api/admin/setting/', methods: ['POST'],
  check: isAuthenticated}` before the generic admin rule — coarse gate, per-key check in the endpoint; prefix matching is substring-based, so key
  names never go into the route table.
- **Store**: `allergies.ts` += `posterNotes` (`useAsyncData`, transform parse, own status computeds, `loadPosterNotes`, `savePosterNotes`).
- **UI**: `app/components/allergy/AllergyNotes.vue` — prop-driven (`notes`, `canEdit`, `isSaving`; emits `save`); view face `ALERTS.warning`
  with one bullet per line, pencil `BUTTONS.edit` in `#actions` when `canEdit`; edit face `UTextarea` + `LAYOUTS.formButtonRow`; no `UTooltip`
  (the poster has no `UApp`). Mounted in the `AdminAllergies` card footer and on the poster (view only). The poster keeps its print table.
- **ADR-018 [Editable settings and user preferences as key-value stores with code registries]**.

### Mockup — ✅ applied 2026-09-16 (notes box in the card footer; edit face pending)

```
DESKTOP                                             MOBILE
┌ Allergi Katalog        [📄 Plakat] [Spørgsmål?] ┐  ┌ Allergi Katalog      [📄 Plakat] ┐
│ [⧉ Sammenlign] [↓ Antal] [＋ Opret allergi]      │  │ [⧉ Sammenlign] [↓ Antal]          │
│ ┌ master ──────┬ detail (sticky) ─────────────┐ │  │ [＋ Opret allergi]                 │
│ │ 🥛 Mælk  2   │ Detaljer          [✏️] [🗑]  │ │  │ [▼] 🥜 Jordnødder 2                │
│ │ 🥜 Jordn. 2 ◀│ …                             │ │  │  ┌ Detaljer  [✏️][🗑] ┐             │
│ └──────────────┴───────────────────────────────┘ │  │  └────────────────────┘             │
├─ footer ─────────────────────────────────────────┤  ├─ footer ───────────────────────────┤
│ ⚠ Vigtige bemærkninger                    [✏️]   │  │ ⚠ Vigtige bemærkninger       [✏️]  │
│  • Glutenfri boller findes i fryseren …          │  │  • Glutenfri boller …              │
│  • Ved mælkeprodukter i brød …                   │  │  • Husk at give besked …           │
└──────────────────────────────────────────────────┘  └────────────────────────────────────┘
EDIT FACE (in place; pencil only for ADMIN | ALLERGYMANAGER)
│ Én bemærkning per linje                           │
│ ┌ UTextarea rows=5 ────────────────────────────┐  │
│ └──────────────────────────────────────────────┘  │
│                              [✕ Annuller] [✓ Gem] │  LAYOUTS.formButtonRow · BUTTONS.cancel/save
```
Rejected: under the toolbar (competes with the mobile CREATE dock from D1).

### TDD

| Test | Change |
|------|--------|
| `useSettingValidation.unit`, `useSetting.unit` (new) | keys, value schema, default, `canWrite` for ADMIN / ALLERGYMANAGER / member |
| `usePermissions.unit` | route resolution for `/api/admin/setting/` POST and GET |
| `tests/e2e/api/parallel/admin/setting.e2e.spec.ts` + `settingFactory.ts` (new) | GET default 200, admin POST round-trip, member POST 403, unknown key 400, empty 400; restore in `afterAll` |
| `allergies.nuxt.spec.ts` | `posterNotes` load + save |
| `AllergyNotes.nuxt.spec.ts` (new) | bullets per line, pencil gating, edit/save/cancel emits |
| `AdminAllergies.nuxt.spec.ts` | setting endpoint registered (same change as the store), footer notes, save |
| `AdminAllergies.e2e.spec.ts` | allergy manager edits → saves → bullets; restore |
| `admin-allergies-pdf.nuxt.spec.ts`, `AllergyPoster.e2e.spec.ts` | notes rendered; member sees no pencil; existing `(V)`/`[1V 1B]` assertions kept |

### Affected Areas

`prisma/schema.prisma`, `app/composables/useSetting*.ts`, `server/data/settingsRepository.ts`, `server/routes/api/admin/setting/`,
`server/utils/authorizationHelper.ts`, `app/composables/usePermissions.ts`, `app/stores/allergies.ts`, `app/components/allergy/AllergyNotes.vue`,
`AdminAllergies.vue`, `pages/admin/allergies/pdf.vue`, `allergyTestIds.ts`, compliance docs.

### Notes on the page — ✅ IMPLEMENTED (2026-09-16)

- **Shipped:** the notes box is one component, `app/components/allergy/AllergyNotes.vue` (prop `notes`, one note per line, `ALERTS.legend`
  + `:icon="ICONS.warning"` — the look decided 2026-09-16), mounted in the `AdminAllergies` card `#footer` and on the poster; the poster's
  inline `UAlert` (`pdf.vue:154-165`) is gone, so both surfaces render the same markup from the same text.
- **Text source:** `app/composables/useSetting.ts` — isomorphic (ADR-017 [Isomorphic Composables…]), `DEFAULT_ALLERGY_POSTER_NOTES`
  (the three bullets) and `splitNotes` (one note per line, blank lines and whitespace dropped). This is the registry default the coming
  `Setting` store falls back to.
- **Tests:** `AllergyNotes.nuxt.spec.ts` (bullets per line, empty text renders nothing), `admin-allergies-pdf.nuxt.spec.ts` and
  `AdminAllergies.nuxt.spec.ts` (three items, both `isMd` branches) with the existing `(V)`/`[1V 1B]` assertions kept, plus one e2e
  assertion each in `AllergyPoster.e2e.spec.ts` and `AdminAllergies.e2e.spec.ts`. Test-ids `allergy-notes` / `allergy-notes-item`.
- **Pending:** editing (pencil + `UTextarea` edit face, `canEdit`/`isSaving`/`save`), the `Setting` table and its repository, endpoints,
  authorization and the `allergies` store slice — everything in Solution above except the shared view face. When it lands, only the text
  source changes: `AllergyNotes` keeps its `notes` prop.

### Visual check — Notes on the page

| Route + state | Viewport | DS element to expect | Expect |
|---|---|---|---|
| `/admin/allergies`, catalog loaded | 375px | `AllergyNotes` → `ALERTS.legend` + `:icon="ICONS.warning"` in the card `#footer` | neutral outline box below the catalog, ⚠ beside "Vigtige bemærkninger:", three bullets; text wraps, no horizontal scroll |
| `/admin/allergies`, catalog loaded | desktop | same, card `#footer` | box spans the full card under both master and detail panes; sticky detail still scrolls above it |
| `/admin/allergies`, empty catalog | both | `AllergyNotes` + `UTable #empty` → `ALERTS.emptyState` | notes still render under the empty-state table |
| `/admin/allergies/pdf` | desktop | `AllergyNotes` (`class="mt-4"`) | identical box to the catalog footer, between the allergy table and the `AllergyManagersList` box; same spacing as before |
| `/admin/allergies/pdf`, print preview | print | same | notes print (no `no-print`); ⚠ icon and bullets legible in black on white |

---

## QR code

### Problem

The poster builds `https://api.qrserver.com/v1/create-qr-code/?…` into an `<img>` (`pdf.vue:27-35,145-149`): an external dependency at
render time, and the block is `no-print`, so the QR never reaches paper. No QR package is installed; `uqr` is only a transitive dev-tool dependency.

### Solution

`npm i uqr` (0.1.2, zero deps, runs in Workers and browsers). `app/utils/qr.ts` (`encode(value, {ecc: 'M', border: 1})` → one SVG `<path d>`)
and `app/components/shared/QrCode.vue` (`value`, `size`, `label`; inline `<svg role="img">`, black/white for `print-color-adjust: exact`,
`data-testid="qr-code"`, no `v-html` — none exists in `app/`). Poster buttons move to `BUTTONS.secondaryAction`/`primaryAction` + `ICONS.arrowLeft`/`printer`.

### Mockup — ✅ signed off 2026-09-16 (QR prints)

```
┌ [← Tilbage]                                   [🖨 Print] ┐  no-print, DS buttons
│ ALLERGI-LISTE for skrånere · pr. 16. september 2026      │
│ ┌ ALLERGEN / INTOLERANCE ┬ PERSON ────────────┐ ┌──────┐ │
│ │ 🥜 JORDNØDDER          │ Anna (V), Bob (B)  │ │ ▩▩▩▩ │ │  QrCode.vue inline SVG,
│ │ beskrivelse…           │ [1V 1B]            │ │ ▩▩▩▩ │ │  PRINTS (no-print removed)
│ └────────────────────────┴────────────────────┘ │Scan…│ │
│ ⚠ Vigtige bemærkninger  (AllergyNotes, view only)        │  same component as the catalog footer
│ ⓘ Spørgsmål om allergier?  (AllergyManagersList)         │
└──────────────────────────────────────────────────────────┘   mobile: table + QR stack (flex-col md:flex-row)
```

### TDD

| Test | Change |
|------|--------|
| `tests/component/utils/qr.unit.spec.ts` (new) | `{size, d}`; `size` equals the library's; `d` differs per value |
| `QrCode.nuxt.spec.ts` (new) | `svg[role="img"]`, `aria-label`, `viewBox`, `path[d]` changes on `setProps` |
| `admin-allergies-pdf.nuxt.spec.ts`, `AllergyPoster.e2e.spec.ts` | `qr-code` rendered for a member |

---

## My preferences

### Problem

Members have no per-login preferences: the notifications proposal needs channel opt-ins (EMAIL/SMS), and colorblind and elderly members
have asked for readable colors and larger text. Nothing in the schema holds per-user settings.

### Solution

- **Schema** (same migration as `Setting`):

  ```prisma
  model UserPreference {     // per login; value = JSON typed per key in USER_PREFERENCE_REGISTRY
    userId    Int
    key       String
    value     String
    updatedAt DateTime @updatedAt
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)   // user-owned (ADR-005 strong; HN deletes users, ADR-013)
    @@id([userId, key])
  }
  enum NotificationChannel { EMAIL SMS }   // declared for the notifications worker's wire-parity test; no column uses it
  ```
  Amends `feature-proposal-notifications.md` (lines 23, 110-144): `User.notificationChannels` column → preference key `notification-channels`;
  the producer resolves channels via `fetchUserPreferences`.
- **Registry**: `useUserPreferenceValidation.ts` (`USER_PREFERENCE_KEYS = ['notification-channels', 'appearance']`, value schemas,
  `UserPreferencesSchema` = complete map with defaults) and `useUserPreference.ts` (`USER_PREFERENCE_REGISTRY`, `withDefaults(rows)`).
  Defaults: channels `['EMAIL']`; appearance per the color decision below + `textScale: 'normal'`.
- **Server**: `settingsRepository.ts` += `fetchUserPreferences(d1, userId)`, `upsertUserPreference(d1, userId, key, value)`;
  `GET /api/user/preference` (session user, all keys with defaults), `POST /api/user/preference/[key]` (owner = session user, no id param);
  route rule `{prefix: '/api/user/', methods: null, check: isAuthenticated}`.
- **Store**: `app/stores/preferences.ts` (`useUserPreferencesStore`: fetch when logged in, `appearance`, `notificationChannels`, status computeds,
  `savePreference(key, value)` optimistic → POST → refresh).
- **UI**: `app/components/user/UserPreferencesCard.vue` on the dashboard (`Login.vue`, under `UserProfileCard`): `USwitch` per channel (SMS
  disabled with a hint when `user.phone` is empty), color control per the decision below, `URadioGroup` text scale, autosave with inline state.
  Applied on every page from `layouts/default.vue` via `useHead({htmlAttrs})` (SSR renders the attribute, no flash):
  `html[data-text-scale="large"] {font-size: 112.5%}`, `larger` 125%.

### Colors — OPEN decision (taken at this package's approval gate)

How color reaches the screen today: `main.css` `@theme static` declares the Pantone scales as `--color-<name>-<n>`; `app.config.ts ui.colors`
maps Nuxt UI semantics onto them (`primary: amber`, `secondary: pink`, `success: green`, …); the design system also uses scales directly
(`BG.peach[50]`, `bg-pink-800`, ocean chef calendar, mocha past days, ticket-type and order-state colors, the green holiday ring).

| | A — curated presets | B — user picks colors | C — hybrid |
|---|---|---|---|
| UI | radio: Standard / Høj kontrast / Farveblind-venlig | swatch pickers for `primary`/`secondary` from the named scales (Nuxt UI needs 50–950 scales, so no free hex wheel) | A's radio + one curated accent swatch row |
| Mechanism | `html[data-palette]` overrides `--color-*` in `main.css` → reaches Nuxt UI semantics AND design-system utilities; SSR attribute, no flash | `updateAppConfig({ui: {colors: {primary}}})` from a plugin after the preference loads (per-request copy on SSR, reactive on the client; Nuxt UI regenerates `--ui-color-*`) | both |
| Reach | whole app, consistently | only components using semantic `color=` props; design-system palette utilities keep their hue → mixed look | presets whole app; accent semantic only |
| Accessibility | contrast and red/green safety designed once (Okabe-Ito basis for colorblind; darker text and borders for high contrast) | none guaranteed; low-contrast picks possible; success/error stay green/red unless pickable, and picking them breaks meaning | presets carry it; accent list pre-vetted |
| Cost | design two presets across the scales the DS uses; three visual states to sign off | small code; N×M states, hard to screenshot-verify | A plus a vetted list |
| Value schema | `{palette, textScale}` | `{primary, secondary, textScale}` | `{palette, accent?, textScale}` |

The stated need (colorblind, elderly) is accessibility; personalization is a different need. The JSON value is typed in the registry, so the
choice needs no schema change. Hues are signed off from screenshots after implementation.

### Mockup — ✅ signed off 2026-09-16 (behind an "Indstillinger" button; colors variant still open)

```
DASHBOARD /login (logged in)
┌ Hej Anna! 👋 ───────────────────────────────────────────────┐
│ ┌ UserProfileCard ──────────────────────────────────────┐   │
│ │ [👤] Anna Hansen      [⚙ Indstillinger] [Heynabo →] [👋 Log ud →] │  new button, BUTTONS.secondaryAction + ICONS.preferences
│ │      [🛡️ Admin] [💚 Allergichef]                       │   │  (mobile: the three buttons wrap under the name)
│ │ 📧 anna@…  📱 +45 …  🏠 Lejlighed 42                   │   │
│ └───────────────────────────────────────────────────────┘   │
│ Hvad vil du lave i dag? … ActionCards …                     │
└─────────────────────────────────────────────────────────────┘

AFTER [⚙ Indstillinger] — the card reveals directly under the profile (button shows active; click again = hide)
┌ Hej Anna! 👋 ───────────────────────────────────────────────┐
│ ┌ UserProfileCard ─ [⚙ Indstillinger ●] [Heynabo →] [Log ud →] ┐ │
│ └───────────────────────────────────────────────────────┘   │
│ ┌ Mine indstillinger ───────────────────────────────────┐   │  UserPreferencesCard.vue, v-if on the toggle
│ │ 🔔 Notifikationer                                     │   │
│ │   Vi må kontakte dig via   [✓] E-mail  anna@…         │   │  USwitch per channel; address from User
│ │                            [ ] SMS     +45 …          │   │  SMS disabled + hint when no phone
│ │ 🎨 Udseende                                           │   │
│ │   Farver   ── decision 4: variant A, B or C ──         │   │
│ │   Tekst    (•) Normal   ( ) Stor         ( ) Større   │   │  URadioGroup → html[data-text-scale]
│ │   ✓ Gemt                                              │   │  autosave on change, inline state
│ └───────────────────────────────────────────────────────┘   │
│ Hvad vil du lave i dag? … ActionCards …                     │
└─────────────────────────────────────────────────────────────┘
Farver, variant A (presets):   (•) Standard ( ) Høj kontrast ( ) Farveblind-venlig        → html[data-palette]
Farver, variant B (pick):      Primær [● mocha ▾]  Sekundær [● pink ▾]  (swatches of the named scales) → updateAppConfig(ui.colors)
Farver, variant C (hybrid):    A's presets + one "Accentfarve" swatch row from a curated accessible list
mobile: radios/swatches stack (ORIENTATIONS.responsive). The toggle state is component-local (ADR-006: no persistence).
```

### TDD

| Test | Change |
|------|--------|
| `useUserPreferenceValidation.unit`, `useUserPreference.unit` (new) | keys, value schemas, defaults, `withDefaults` |
| `tests/e2e/api/parallel/user/userPreference.e2e.spec.ts` + `userPreferenceFactory.ts` (new) | member GET defaults; POST channels round-trip; invalid value 400; admin GET returns the admin's own row |
| `preferences.nuxt.spec.ts` (new) | store load/save with `registerEndpoint` |
| `UserPreferencesCard.nuxt.spec.ts` (new) | switches, color control, text scale, saved state; real store |
| `UserPreferences.e2e.spec.ts` (new) | GIVEN a member WHEN toggling SMS and changing colors THEN `html` attributes change and persist across reload; restore in `afterAll` |

### Affected Areas

`prisma/schema.prisma`, `app/composables/useUserPreference*.ts`, `server/data/settingsRepository.ts`, `server/routes/api/user/preference/`,
`app/composables/usePermissions.ts`, `app/stores/preferences.ts`, `app/components/user/UserPreferencesCard.vue`, `Login.vue`,
`layouts/default.vue`, `app/assets/css/main.css`, `docs/ui.md`, `feature-proposal-notifications.md`, compliance docs.

---

## Planning form

### Problem

`/admin/planning` switches modes with a three-button `FormModeSelector` (Vis / Rediger / Opret) while `/admin/allergies` uses a pencil in the
detail header plus an "Opret" primary action with the form in place. Holiday rows can only be deleted, not edited. Whether an admin may edit
the live season was unclear. `AdminSeason.vue` is a dead Nuxt UI v2 duplicate; `AdminToCreateSeason.vue` and `FormModeSelector.vue` start
with stray characters (`BY`, `w`).

### Root Cause

Two generations of admin UX. The live-season question turned out to be a gap, not a design flaw: `POST /api/admin/season/[id]` reconciles
dinner events on schedule change (`reconcileDinnerEventsForSeason`, ADR-015), but preference clipping and scaffolding only run on activation
(`active.post.ts:40-45`) and in the nightly job (`dailyMaintenanceService.ts:53-56`). Reconciliation calls `deleteDinnerEvent` without the
Heynabo callback the admin delete endpoint passes (`reconcileDinnerEvents.ts:39` vs `dinner-event/[id].delete.ts:44`), so announced dinners
on removed dates stay published in Heynabo. The endpoint also writes `isActive` from the body, bypassing `/active`.

### Solution

- Keep `useEntityFormManager` and `?mode=` sync (ADR-008 [useEntityFormManager Composable Pattern], ADR-006 [URL-Based Navigation and
  Client-Side State]) — deep links `?mode=create|edit` stay valid. Only the controls change:
  - Card header: `SeasonSelector` + `[＋ Opret sæson]` (`BUTTONS.primaryAction`, `create-season`, disabled when CREATE is in `disabledModes`).
  - `AdminPlanningSeason` header: the title carries the season name (Fællesspisning sæson {navn} / Rediger fællesspisning sæson {navn} / Opret fællesspisning sæson {navn}), so the read-only "Sæson" field goes away; beside it a labelled `Rediger {navn}` (`BUTTONS.secondaryAction` + `COLOR.primary` + `ICONS.edit`, `edit-season`, view mode + `canEdit`).
  - Footer: `LAYOUTS.formButtonRow`, `BUTTONS.cancel` "Annuller", `BUTTONS.save` "Gem" (`type="submit"`, `:loading`). `id="seasonForm"` untouched.
  - Activation controls stay in edit mode as today. No delete for seasons.
  - Picker selection follows what is picked (`CALENDAR.picker`): season dates in the cooking-day pink `COLOR.secondary`, holiday rows in the green `CALENDAR.holiday` ring, since green marks a holiday in every calendar.
- **Editable holiday rows**: in edit/create mode each row is a `CalendarDateRangePicker` (`name="holidayRangeList-${i}"`); a change is validated
  against `holidaysSchema` on the replaced list (overlap / inside season) before it is emitted; view mode keeps the read-only rows.
- **Live season save**: the endpoint ignores `isActive` (activation only via `/active`); after reconciliation, when the season is active and the
  schedule changed, it runs `clipPreferences` + `scaffoldPrebookings` — the same idempotent pair activation runs. Response becomes a
  `SeasonUpdateResponse {season, reconciliation: {created, deleted}, scaffold}` operation envelope (ADR-009 [API Index Endpoint Data Inclusion
  Strategy]) so the toast can report: "Sæson opdateret — N datoer tilføjet, M fjernet. Forudbestillinger er opdateret. Husk at tildele madhold til nye datoer."
- **Heynabo cleanup**: `reconcileDinnerEventsForSeason` passes `deleteHeynaboEventAsSystem` (best-effort, ADR-013 [External System Integration Pattern]) — the one-argument callback `deleteDinnerEvent` takes.
- `FormModeSelector` stays for Teams (stray `w` removed); `AdminSeason.vue` deleted.

### Mockup — ✅ signed off 2026-09-16

```
VIEW (canEdit)                                              EDIT / CREATE
┌ [Sæson ▾ 08/26-07/27]              [＋ Opret sæson] ┐     ┌ [Sæson ▾ 08/26-07/27]      [＋ Opret sæson] ┐ (disabled)
│ 🟢 Aktiv sæson … (SeasonStatusDisplay)              │     │ 🟢 Aktiv sæson … [✕ Deaktiver Sæson]        │ (as today: edit mode)
│ ┌ Fællesspisning sæson 08/26-07/27                ┐ │     │ ┌ Rediger fællesspisning sæson 08/26-07/27 ┐ │  create: "Opret fællesspisning
│ │                    [✏ Rediger 08/26-07/27]      │ │     │ │ Vi følger folkeskolernes feriekalender…  │ │  sæson <navn>", navn once the
│ │ Vi følger folkeskolernes feriekalender…         │ │     │ │ Hvornår holder fællesspisning fri?       │ │  dates are valid
│ │ fields disabled … calendar (right/top) …        │ │     │ │ [Start dato ▾][Slut dato ▾] [☀ Tilføj ferie] │  add row (as today)
│ └─────────────────────────────────────────────────┘ │     │ │ Valgte ferieperioder                     │ │
└─────────────────────────────────────────────────────┘     │ │ ☀ [13/10/2026][17/10/2026] 🗑            │ │  EACH ROW editable
                                                            │ │ ☀ [21/12/2026][03/01/2027] 🗑            │ │  (CalendarDateRangePicker);
LIVE SEASON, after Gem:                                     │ │ … Billetpriser [🎟 Tilføj billet] … 🗑    │ │  list validated on change
  toast "Sæson opdateret — 3 datoer tilføjet,               │ ├──────────────────────────────────────────┤ │
  1 fjernet. Forudbestillinger er opdateret.                │ │ fejlliste (if any)                       │ │
  Husk at tildele madhold til nye datoer."                  │ │              [✕ Annuller]  [✓ Gem]       │ │
                                                            │ └──────────────────────────────────────────┘ │
MOBILE: selector + [＋ Opret sæson] stacked full-width     └──────────────────────────────────────────────┘
(LAYOUTS.cardActionRow/Button); [✏ Rediger <navn>] stays in the card header. View mode: rows read-only as today.
Removed on planning: FormModeSelector [👁][✏️][＋] and the disabled "Sæson" input (the name is in the title).
Kept on Teams. No 🗑 for seasons. Members: no ＋ / ✏.
```

### TDD

| Test | Change |
|------|--------|
| `AdminPlanningSeason.nuxt.spec.ts` (new) | `it.each` mode × canEdit: `edit-season` only in view + canEdit, footer only in edit/create; the control is labelled `Rediger {navn}` and emits `edit`; title carries the season name, no `input[name="shortName"]`; 'Annuller'/'Gem'; `form#seasonForm` |
| `AdminPlanning.nuxt.spec.ts` (new) | pattern `AdminAllergies.nuxt.spec.ts`; `create-season` present and `form-mode-edit` absent; member sees neither; edit/cancel/create drive `?mode=`; toast from the envelope |
| `CalendarDateRangeListPicker.nuxt.spec.ts` | edit mode row is a picker (`selection="holiday"`); change emits the updated list; overlap shows `'Ferieperioder må ikke overlappe hinanden'` and does not emit |
| `season.e2e.spec.ts:122` | envelope counts; `isActive` in the body ignored |
| `tests/e2e/api/serial/admin/seasonLiveEdit.e2e.spec.ts` (new) | own active season inside the 60-day window; add a holiday + a cooking date → orders on the holiday date gone (cascade), the new date scaffolded in the same request, preferences clipped |
| `tests/e2e/ui/serial/AdminPlanningLiveSeason.e2e.spec.ts` (new) | GIVEN the active season WHEN adding a holiday in the UI THEN the toast reports counts and bookings exist on the new date |
| `AdminPlanning.e2e`, `AdminPlanningSeason.e2e`, `admin.e2e` | `form-mode-*` → `create-season` / `edit-season`; ring-class assertions dropped; per-tab `editControl` (planning `edit-season`, teams `form-mode-edit`); `holidayRowStartDates` reads the row pickers' `start` inputs |
| `AdminPlanningSeason.e2e` | edit a holiday row's dates → saved season has the new range |
| `CalendarDateRangePicker.nuxt.spec.ts` | `selection=cookingDay\|holiday` binds the matching `CALENDAR.picker` preset to the inner `UCalendar` |
| `designSystemUsage.unit.spec.ts` | every `<UCalendar>` binds the grid directly or through a `calendarPickerProps` preset |

### Affected Areas

`AdminPlanning.vue`, `admin/planning/AdminPlanningSeason.vue`, `calendar/CalendarDateRangeListPicker.vue`, `calendar/CalendarDateRangePicker.vue`,
`calendar/CalendarDatePicker.vue`, `form/FormModeSelector.vue`, `useTheSlopeDesignSystem.ts` (`CALENDAR.picker`, `calendarPickerProps`),
`server/routes/api/admin/season/[id].post.ts`, `server/utils/reconcileDinnerEvents.ts`, `useSeasonValidation.ts` (`SeasonUpdateResponse`),
`app/stores/plan.ts` (`updateSeason` returns the envelope), delete `admin/AdminSeason.vue`, compliance docs.

### Visual check — Planning form (walk before the package is approved; copied into the PR description)

| Route + state | Viewport | DS element to expect | Expect |
|---|---|---|---|
| `/admin/planning` as ADMIN, a season selected | 375px + desktop | `LAYOUTS.cardActionRow` + `BUTTONS.primaryAction` + `COLOR.primary` + `ICONS.plusCircle` | "⊕ Opret sæson" solid beside the season selector, full width on the phone and inline on desktop; the old [👁][✏️][＋] trio is gone |
| same | 375px + desktop | `BUTTONS.secondaryAction` + `COLOR.primary` + `ICONS.edit` | the card header reads "Fællesspisning sæson 08/26-07/27" with "✏ Rediger 08/26-07/27" beside it; the form has no read-only "Sæson" field any more |
| `/admin/planning?mode=edit` | 375px + desktop | `LAYOUTS.formButtonRow` + `BUTTONS.cancel` + `BUTTONS.save` | title "Rediger fællesspisning sæson 08/26-07/27"; "✕ Annuller" and "✓ Gem" right-aligned on desktop and stacked with Gem on top on the phone; the error list sits above them |
| `/admin/planning?mode=create` | 375px + desktop | same footer | title "Opret fællesspisning sæson", and the computed name appears as soon as start and slut are valid |
| `/admin/planning?mode=edit`, season with holidays | 375px + desktop | row `CalendarDateRangePicker` + `BUTTONS.edit` + `ICONS.trash` | each holiday row is ☀ + [Start dato][Slut dato] + 🗑; a date change lands on that row alone; an overlapping change shows "Ferieperioder må ikke overlappe hinanden" by the add row and the row keeps its old dates |
| same, a holiday row picker open | 375px + desktop | `CALENDAR.picker.holiday` | selected holiday days are an empty circle with a green ring; adjacent-month days stay hidden |
| `/admin/planning?mode=edit`, season date picker open | 375px + desktop | `CALENDAR.picker.cookingDay` | the selected season range is filled pink (secondary) |
| `/household/<own>/settings`, pencil → move-out date | 375px + desktop | `CALENDAR.picker.cookingDay` | the selected date is filled pink; picking a date still works |
| `/admin/planning?mode=view` | 375px + desktop | read-only rows | holiday rows are disabled inputs "13/10/2026-17/10/2026" with the ☀ leading icon, no 🗑 and no footer buttons |
| `/admin/planning?mode=edit` on the ACTIVE season: add a holiday over a booked date, then Gem | desktop | toast `ICONS.checkCircle` + `COLOR.success` | "Sæson opdateret — 0 datoer tilføjet, 1 fjernet. Forudbestillinger er opdateret."; adding dates appends "Husk at tildele madhold til nye datoer." |
| `/admin/planning` as a member | 375px + desktop | — | no "Opret sæson" and no "Rediger …"; the read-only banner shows |
| `/admin/planning` with no seasons, as ADMIN | 375px + desktop | `ALERTS.emptyState` + `create-first-season` | the empty state with "⊕ Opret ny sæson"; the header keeps "Opret sæson" and shows no "Rediger …" |
| `/admin/planning?mode=edit`, ACTIVE / FUTURE / PAST season | desktop | `SeasonStatusDisplay` + `ICONS` | the status alert icons are the outline check-circle, calendar and archive-box from `ICONS` |
| `/admin/teams` | 375px + desktop | `FormModeSelector` | the [👁][✏️][＋] trio is unchanged on Teams |

---

## Sorted holidays

### Problem

Holidays display and persist in insertion order. `compareDateRanges` exists (`app/utils/date.ts:91-93`) but only `areRangesOverlapping` uses it, on a copy.

### Solution

One util `sortDateRanges = (r) => r.toSorted(compareDateRanges)` in `app/utils/date.ts`, reused by `areRangesOverlapping`; applied on add in
`CalendarDateRangeListPicker.vue:39` (the model stays sorted, so index-based removal stays correct) and in `serializeSeason`/`deserializeSeason`
(canonical storage; CSV import inherits; legacy rows display sorted). Row edits update in place; canonical order is restored on save.

### TDD

| Test | Change |
|------|--------|
| `date.unit.spec.ts` | `sortDateRanges`: ascending, non-mutating, empty/single pass-through, stable |
| `useSeasonValidation.unit.spec.ts` | serialize/deserialize emit chronological holidays |
| `CalendarDateRangeListPicker.nuxt.spec.ts` | adding an earlier range after a later one → `[A, B]`; row 0 shows `formatDateRange(A)` |
| `AdminPlanningSeason.e2e.spec.ts` | add later then earlier → chronological in the list |

**Verified (2026-09-16):** 8 new assertions red first — 5 `sortDateRanges` cases, 2 serialize/deserialize cases, 1 picker case; green with 131 vitest tests in the three specs plus `useSeason.nuxt.spec.ts` (78) and `AdminPlanningSeason.e2e.spec.ts` (9 e2e).

---

## Calendar grid

### Problem

The season and holiday pickers render the trailing days of month N and the leading days of month N+1 in both grids: the same dates appear twice.

### Root Cause

`reka-ui` marks other-month cells `data-outside-view` (`CalendarCellTrigger.js:49-53,126`). `BaseCalendar.vue:85-86` disables and hides them
(`COMPONENTS.calendar.cellTrigger 'data-[outside-view]:hidden'`); `CalendarDateRangePicker.vue:143-152` and `CalendarDatePicker.vue:119-126`
call `UCalendar` directly and never received either. `CalendarDisplay.vue:80-94` also hand-rolls its day classes (`w-8 h-8`, literal pink).

### Solution

One design-system token `COMPONENTS.calendarGrid = {weekStartsOn: 1, fixedWeeks: false, weekdayFormat: 'short', disableDaysOutsideCurrentView: true,
ui: {cellTrigger: 'data-[outside-view]:hidden'}}` spread with `v-bind` in all three `UCalendar` call sites; `PLANNING_CALENDAR` palette
(pink `day.generated`, `day.potential`) beside `CHEF_CALENDAR`/`DINNER_CALENDAR`; `CalendarDisplay` uses `SIZES.calendarCircle` + `CALENDAR.day.shape`.
Rejected: a `CalendarGrid.vue` atom (generic v-model passthrough for zero behaviour); pickers on `BaseCalendar` (readonly, event-list driven).

### Mockup — ✅ applied 2026-09-16

```
BEFORE (season/holiday pickers)                 AFTER (all calendars share COMPONENTS.calendarGrid)
  SEP 2026          OKT 2026                      SEP 2026          OKT 2026
  … 28 29 30  1  2  3  4  |  28 29 30  1  2  3      … 28 29 30        |           1  2  3
  ↑ Oct 1-4 and Sep 28-30 rendered twice           adjacent-month days disabled + hidden
```

### TDD

| Test | Change |
|------|--------|
| `CalendarDateRangePicker.nuxt.spec.ts`, `CalendarDatePicker.nuxt.spec.ts` | inner `UCalendar` receives `COMPONENTS.calendarGrid` (shared helper `expectSharedCalendarGrid`) |
| `CalendarDisplay.nuxt.spec.ts` (new) | generated / potential / holiday cells carry the palette + circle classes |
| `AdminPlanningSeason.e2e.spec.ts` | open the season picker → zero visible `[data-outside-view]` cells |

**Verified (2026-09-16):** red 13-14 duplicate cells in the season picker → 0 after the token; 34 calendar component tests, 9 `AdminPlanningSeason` e2e tests and `npm run pre:all` all green.

---

## Planning buttons

### Problem

No planning component uses `BUTTONS.*`: footer buttons, "Tilføj ferie", "Tilføj billet", trash buttons, the activate button, the
`AdminToCreateSeason` CTA and the pickers' trailing calendar button are all ad hoc; `TicketPriceListEditor` uses `name=` for test hooks.

### Solution

`ICONS.holiday` (`i-heroicons-sun`) and `ICONS.printer` added. Add buttons = `BUTTONS.secondaryAction` + `ICONS.holiday|ticket`; row trash =
`BUTTONS.edit` + `ICONS.trash` + `aria-label`; activate = `BUTTONS.primaryAction` + `COLOR.success` + `ICONS.playCircle` (label 'Aktiver Sæson'
kept); date inputs use `:trailing-icon="ICONS.calendar"`; `AdminToCreateSeason` gets a `canEdit` prop and a `BUTTONS.primaryAction` CTA
(`create-first-season`, deep link `/admin/planning?mode=create` unchanged); `name="addTicketPrice|removeTicketPrice-*"` → `data-testid`.
Mockup: see "Planning form".

### TDD

| Test | Change |
|------|--------|
| `tests/component/components/admin/planningTestIds.ts` (new) | shared test-id contract |
| `TicketPriceListEditor.nuxt.spec.ts`, `AdminToCreateSeason.nuxt.spec.ts` (new) | add/remove emit; CTA only with `canEdit` |
| `SeasonStatusDisplay.nuxt.spec.ts` | DS props; migrated to the real store + `registerEndpoint` (testing.md Rule 6) |
| `CalendarDateRangeListPicker.nuxt.spec.ts` | DS props on add/remove |

**Verified (2026-09-16):** 5 new assertions red first (`ticket-price-add`, `ticket-price-remove-${i}`, the disabled gate, `create-first-season` + its `to`); green with 177 vitest tests across `tests/component/components/admin`, `…/calendar`, `…/shared` and `tests/component/architecture`. `SeasonStatusDisplay.nuxt.spec.ts` now drives the real `usePlanStore` (8 tests). `npm run lint`, `npm run ts:server`, `npm run ts:node` clean; `npm run ts` fails only on the pre-existing `TS2688 @cloudflare/workers-types/2023-07-01` from the in-flight Wrangler upgrade. E2E `AdminPlanning`, `AdminPlanningSeason`, `SeasonSelector`, `AdminTeams`, `AllergyPoster` at `--workers=4`: 26-27 of 28 pass; the two `AdminPlanning` stragglers time out on the page loader ("Vi venter på data") under parallel load and pass when that spec runs alone (9 passed).

Behaviour note: `TicketPriceListEditor`'s add card switched from `v-show` to `v-if`, so view mode drops the draft controls out of the DOM and the tab order — same contract as the row trash and as `CalendarDateRangeListPicker`.

### Visual check — Planning buttons (walk before the package is approved; copied into the PR description)

| Route + state | Viewport | DS element to expect | Expect |
|---|---|---|---|
| `/admin/planning?mode=edit`, season with holidays | 375px + desktop | `BUTTONS.secondaryAction` + `COLOR.info` + `ICONS.holiday` | "☀ Tilføj ferie" outline, standard size (was `size="lg"`); the margin nudge beside the picker is unchanged, error state still pushes it down |
| same | 375px + desktop | `BUTTONS.edit` + `ICONS.trash` | each holiday row's 🗑 is a square neutral ghost button (was small red ghost), with an `aria-label` naming the period; the row's leading ☀ icon is unchanged |
| `/admin/planning?mode=edit`, ticket prices | 375px + desktop | `BUTTONS.secondaryAction` + `COLOR.info` + `ICONS.ticket` | "🎟 Tilføj billet" outline, standard size |
| same | 375px + desktop | `BUTTONS.edit` + `ICONS.trash` | each billet row's 🗑 is square neutral ghost (was small red ghost); `aria-label` names the ticket type |
| `/admin/planning?mode=view` (or any view-mode season) | both | — | no "Tilføj billettyper" card at all (it is now removed from the DOM, not just hidden) and no row 🗑; the price list itself is unchanged |
| `/admin/planning?mode=create` and `?mode=edit`, season start/end + holiday pickers | 375px + desktop | `UInput :trailing-icon="ICONS.calendar"` | a plain calendar glyph inside the field instead of a nested blue button; tapping anywhere on the field still opens the popover, the grid still hides adjacent-month days |
| `/household/<own>/settings`, pencil → edit move-out date | 375px + desktop | same `:trailing-icon` on `CalendarDatePicker` | same glyph change on the single-date field; picking a date still works |
| `/admin/planning?mode=edit`, FUTURE or CURRENT season | 375px + desktop | `BUTTONS.primaryAction` + `COLOR.success` + `ICONS.playCircle` + `ICONS.arrowRight` | "▶ Aktiver Sæson →" solid green inside the status alert, small size, beside the text on desktop and under it on the phone; while activating it shows the spinner instead of the old "Arbejder..." label |
| same, ACTIVE season | both | `DangerButton` (unchanged) | "Deaktiver Sæson" two-click confirm unchanged |
| `/admin/planning` and `/admin/teams` with no seasons at all, as ADMIN | 375px + desktop | `ALERTS.emptyState` + `BUTTONS.primaryAction` + `COLOR.primary` + `ICONS.plusCircle` | 🧘 empty state with "⊕ Opret ny sæson" solid primary, full width on the phone and inline on desktop; it links to `/admin/planning?mode=create` |
| same, as a member (no admin role) | both | `ALERTS.emptyState`, no CTA | the empty state text only — the create button is gone |
| `/admin/allergies/pdf` | desktop | `BUTTONS.secondaryAction` + `COLOR.secondary` + `ICONS.arrowLeft`, `BUTTONS.primaryAction` + `COLOR.primary` + `ICONS.printer` | "← Tilbage" outline and "🖨 Print" solid, both standard size; print preview unchanged (both controls stay `no-print`) |

---

## Test coverage matrix

Every endpoint gets an API spec; every UX component gets a BDD e2e (GIVEN/WHEN/THEN) and a component spec.

| Endpoint (new / changed) | API spec |
|---|---|
| `GET`/`POST /api/admin/setting/[key]` | `tests/e2e/api/parallel/admin/setting.e2e.spec.ts` (new) |
| `GET /api/user/preference`, `POST /api/user/preference/[key]` | `tests/e2e/api/parallel/user/userPreference.e2e.spec.ts` (new) |
| `POST /api/admin/season/[id]` (envelope, `isActive` ignored, Heynabo cleanup) | `tests/e2e/api/parallel/admin/season.e2e.spec.ts` extended |
| `POST /api/admin/season/[id]` on the ACTIVE season (clip + scaffold) | `tests/e2e/api/serial/admin/seasonLiveEdit.e2e.spec.ts` (new) |
| `POST /api/admin/season/import`, `…/generate-dinner-events` (shared reconcile) | existing specs; Heynabo delete is external → code review of the callback argument |

| UX component / behaviour | BDD e2e | Component spec |
|---|---|---|
| `ALERTS` sweep | `MobileViewport.e2e.spec.ts` (new) | DS spec + `designSystemAlerts` architecture test |
| `AllergyNotes` on `/admin/allergies` | `AdminAllergies.e2e.spec.ts` | `AllergyNotes.nuxt.spec.ts` (new), `AdminAllergies.nuxt.spec.ts` |
| `AllergyNotes` + `QrCode` on the poster | `AllergyPoster.e2e.spec.ts` | `admin-allergies-pdf.nuxt.spec.ts`, `QrCode.nuxt.spec.ts` (new), `qr.unit.spec.ts` (new) |
| `UserPreferencesCard` | `UserPreferences.e2e.spec.ts` (new) | `UserPreferencesCard.nuxt.spec.ts`, `preferences.nuxt.spec.ts` (new) |
| Planning form controls, member gating | `AdminPlanning.e2e`, `AdminPlanningSeason.e2e`, `admin.e2e` | `AdminPlanning.nuxt.spec.ts`, `AdminPlanningSeason.nuxt.spec.ts` (new) |
| Editable holiday rows | `AdminPlanningSeason.e2e` | `CalendarDateRangeListPicker.nuxt.spec.ts` |
| Sorted holidays | `AdminPlanningSeason.e2e` | `date.unit`, `useSeasonValidation.unit`, list-picker spec |
| Calendar grid | `AdminPlanningSeason.e2e` | picker specs, `CalendarDisplay.nuxt.spec.ts` (new) |
| Planning buttons | planning e2e via test-ids | `TicketPriceListEditor`, `AdminToCreateSeason` (new), `SeasonStatusDisplay` |
| Live-season save toast | `tests/e2e/ui/serial/AdminPlanningLiveSeason.e2e.spec.ts` (new) | `AdminPlanning.nuxt.spec.ts` |

### Test-id contract (old → new)

| Surface | Old | New |
|---|---|---|
| Planning header | `form-mode-create` | `create-season` |
| Season card header | `form-mode-edit` | `edit-season` (view + canEdit) |
| Planning | `form-mode-view` | none (URL `mode=view`, `edit-season` visible) |
| Season footer / form | `cancel-season`, `submit-season`, `form#seasonForm` | unchanged ('Annuller' / 'Gem') |
| Status alert | `activate-season`, `deactivate-season` | unchanged |
| Empty state CTA | UAlert `:actions` | `create-first-season` |
| Holidays | `holiday-range-add`, `holiday-range-remove-${i}`, `holidayRangeList-${i}` | unchanged; edit-mode row = picker (`[name="holidayRangeList-i"] input[name="start|end"]`) |
| Ticket prices | `name="addTicketPrice|removeTicketPrice-${i}"` | `ticket-price-add`, `ticket-price-remove-${i}` |
| Notes / QR / preferences | — | `allergy-notes*`, `qr-code`, `pref-channel-*`, `pref-palette`, `pref-text-scale` |
| Teams | `form-mode-*` | unchanged |

---

## Work order, approval gates & supervision

| Order | Package | Gate before an agent starts |
|---|---|---|
| 1 | This doc (done) | — |
| 2 | Sorted holidays | package brief approved |
| 3 | Calendar grid | package brief approved; mockup ✅ |
| 4 | Alerts on mobile | repro screenshots + classification table in this doc; mockup ✅; brief approved |
| 5 | Planning buttons | mockup "Planning form" ✅; brief approved |
| 6 | Planning form | mockup ✅; brief approved |
| 7 | QR code | mockup "Poster" ✅; brief approved; `npm i uqr` |
| 8 | Colour drift sweep | brief approved; runs before the presets so they land on a clean base |
| 9 | Poster notes editing + My preferences (one migration) | mockups ✅; color decision taken; brief approved; migration created and applied by the user |
| 10 | Ship: ADR-018, ADR-019, compliance docs, `docs/ui.md`, `docs/testing.md`, `pre:all`, full suites, `/dry` | — |

Per package: red output shown → green output shown → `npm run pre:all` → architect diff review against the package, the coverage matrix
and the design-system rule → compliance rows in the same change. Agents (`tdd-pair-programmer`, `nuxt-typescript-developer`,
`test-automation-engineer`) never commit; the user commits per package.

**Commands the user runs**

```
npm i uqr                                                  # QR code
make d1-prisma                                             # after the schema edit (commit generated zod)
make prisma-create-migration name=settings_preferences     # → migrations/0015_settings_preferences.sql
npm run db:migrate:local                                   # dev/prod at deploy
```

---

## ADR Notes

- **ADR-001 [Core Framework and Technology Stack]** — new components import types from
  `useAllergyValidation` only; no imports from the generated layer.
- **ADR-007 [SSR-Friendly Store Pattern with useAsyncData]** — no new server data; the
  panel is prop-driven; store access + the `householdShortNames` map stay in
  `AdminAllergies` (container).
- **ADR-006 [URL-Based Navigation and Client-Side State]** — catalog selection stays
  client-side (unchanged).

- **ADR-017 [Isomorphic Composables, Pure UI Composables and Per-Context Type Checking]** — new:
  composables the server imports use explicit imports and carry no UI; presentation lives in
  `use<Domain>Ui`; `pre:all` typechecks the server and node projects. Introduced by C1.

**Out of scope (noted):** mobile Playwright viewport projects (commented out in
`playwright.config.ts`); `HouseholdAllergies.vue`.

- **ADR-018 [Editable settings and user preferences as key-value stores with code registries]** — proposed by "Poster notes" / "My preferences":
  two tables, one pattern; keys, value schemas, defaults and writers declared in code registries; GET returns defaults, never 404; per-key
  write check in the endpoint, never in the route table; the domain store owns the fetch; a new preference is a registry entry, not a migration.
- **ADR-019 [Design system owns shared UI patterns — components bind tokens, never raw Nuxt UI props]** — proposed by "Alerts on mobile":
  `BUTTONS`, `ALERTS`, `COMPONENTS.calendarGrid` live in `useTheSlopeDesignSystem`; architecture tests enforce; a new Nuxt UI component
  family gets a token before its first use.
