# Bug Fix: Allergy Catalog — Ages, Categories & Display Logic

**Status:** Implemented | **Date:** 2026-09-01 | **Updated:** 2026-09-02
**Branch:** `fix/allergy-ages-categories-and-display-logic`

## Fix Inventory

| id | Fix | Status |
|----|-----|--------|
| D1 | Master/detail display logic — mobile detail off-screen | ✅ IMPLEMENTED (2026-09-01) |
| D2 | Compare mode — mobile summary bar | ✅ IMPLEMENTED (2026-09-01) |
| A1 | Wrong age categories in allergy surfaces (children as adults) | **Implemented** (2026-09-01) |
| C1 | CI break — server-reachable composable relied on app auto-imports; per-context typecheck gate + pure UI composables | ✅ IMPLEMENTED (2026-09-02) |
| C2 | E2E stability — season list polled past a half-created season; UI specs wait for hydration before interacting | ✅ IMPLEMENTED (2026-09-02) |

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
