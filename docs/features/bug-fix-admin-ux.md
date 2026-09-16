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
| Alerts on mobile | UAlert ignores screen size → design-system `ALERTS` pattern, every instance migrated, architecture test | ⏳ Mockup signoff |
| Poster notes | "Vigtige bemærkninger" shared with `/admin/allergies`, editable by ADMIN/ALLERGYMANAGER → `Setting` table + `AllergyNotes` | ⏳ Mockup signoff + migration |
| QR code | `uqr` + `QrCode.vue` atom instead of `api.qrserver.com`; prints | ⏳ Mockup signoff |
| My preferences | notification channels (EMAIL/SMS) + appearance (colors, text scale) → `UserPreference` table, endpoints, dashboard card | ⏳ Mockup signoff + color decision + migration |
| Planning form | edit/create the allergies way (pencil + Opret), holiday rows editable, live-season save re-scaffolds, Heynabo cleanup on removed dates | ⏳ Mockup signoff |
| Sorted holidays | holiday list chronological everywhere | ✅ IMPLEMENTED (2026-09-16) |
| Calendar grid | pickers show adjacent-month days twice → one shared `UCalendar` root token | ✅ IMPLEMENTED (2026-09-16) |
| Planning buttons | every planning button from the design system | ⏳ Mockup signoff |

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

### Mockup — ⏳ awaiting signoff (mobile padding `p-3`, kind table)

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

### Classification (⏳ awaiting signoff)

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

#### (b) Classification — 56 sites / 34 files (theme defaults: `color=primary`, `variant=solid`)

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

**Kind gap — `callToAction` cannot carry a colour (5 sites, 3 colours).** `SeasonStatusDisplay:156` (success/warning/info by season status),
`[tab].vue:203` (warning), `AdminTeams:460`, `AdminToCreateSeason:6`, `dinner/index.vue:212` (centered empty state + actions) all need
"this kind **plus** actions". Proposal: make orientation a *modifier* rather than a colour-bearing kind — `ALERTS.withActions` spread over any
kind (`v-bind="{...ALERTS.warning, ...ALERTS.withActions}"`) or `ALERTS.callToAction(color)` — and keep `emptyState` vertical/centered even when
it has actions. Not proposed as new kinds: no site needs a colour outside the existing table.

#### (c) Not fixed by the alert token

| Finding | Where | Note |
|---|---|---|
| `UTable` wrapper scrolls far wider than the phone | `/admin/users` (576px), `/admin/system` job history (1596px) | mail/result columns cut off in the screenshots — table/responsive-column concern |
| `span.truncate` clips a long URL by 273px | `/admin/system` settings tree (`holidayUrl`) | tree cell, not an alert |
| Poster table + QR flex row clipped 27px | `/admin/allergies/pdf` `div.flex.gap-6.mb-6` | poster layout; print-first page |
| 3px document overflow while the skeleton renders | `/dinner` `UPageCard` inner `p-4 sm:p-6` | makes the repro's `<= 0` borderline on `/dinner` |
| Layout inside `#description` (flex rows, `<ul>`, badges, selectors) | `AllergyManagersList:36`, `AllergyDetailPanel:60`, `ActionPreview:37`, `BookingGridView:843`, `DinnerBookingForm:884`, `HouseholdCard:406`, `UserProfileCard:341`, `pdf:154` | `wrap-anywhere` cannot wrap a flex row of badges — each needs its own responsive classes or extraction (`DinnerModeLegend.vue`) |
| `actions: 'flex-wrap'` in the planned shared `ui` | theme already ships `actions: "flex flex-wrap gap-1.5 shrink-0"` | no-op — drop it from the plan |

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

### Mockup — ⏳ awaiting signoff

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

---

## QR code

### Problem

The poster builds `https://api.qrserver.com/v1/create-qr-code/?…` into an `<img>` (`pdf.vue:27-35,145-149`): an external dependency at
render time, and the block is `no-print`, so the QR never reaches paper. No QR package is installed; `uqr` is only a transitive dev-tool dependency.

### Solution

`npm i uqr` (0.1.2, zero deps, runs in Workers and browsers). `app/utils/qr.ts` (`encode(value, {ecc: 'M', border: 1})` → one SVG `<path d>`)
and `app/components/shared/QrCode.vue` (`value`, `size`, `label`; inline `<svg role="img">`, black/white for `print-color-adjust: exact`,
`data-testid="qr-code"`, no `v-html` — none exists in `app/`). Poster buttons move to `BUTTONS.secondaryAction`/`primaryAction` + `ICONS.arrowLeft`/`printer`.

### Mockup — ⏳ awaiting signoff (print the QR?)

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

### Mockup — ⏳ awaiting signoff

```
┌ Hej Anna! 👋 ───────────────────────────────────────────────┐
│ UserProfileCard (as today)                                  │
│ ┌ Mine indstillinger ───────────────────────────────────┐   │  new UserPreferencesCard.vue
│ │ 🔔 Notifikationer                                     │   │
│ │   Vi må kontakte dig via   [✓] E-mail  anna@…         │   │  USwitch per channel; address from User
│ │                            [ ] SMS     +45 …          │   │  SMS disabled + hint when no phone
│ │ 🎨 Udseende                                           │   │
│ │   Farver   ── OPEN: variant A, B or C ──              │   │
│ │   Tekst    (•) Normal   ( ) Stor         ( ) Større   │   │  URadioGroup → html[data-text-scale]
│ │   ✓ Gemt                                              │   │  autosave on change, inline state
│ └───────────────────────────────────────────────────────┘   │
│ Hvad vil du lave i dag? … ActionCards …                     │
└─────────────────────────────────────────────────────────────┘
Farver, variant A (presets):   (•) Standard ( ) Høj kontrast ( ) Farveblind-venlig        → html[data-palette]
Farver, variant B (pick):      Primær [● mocha ▾]  Sekundær [● pink ▾]  (swatches of the named scales) → updateAppConfig(ui.colors)
Farver, variant C (hybrid):    A's presets + one "Accentfarve" swatch row from a curated accessible list
mobile: radios/swatches stack (ORIENTATIONS.responsive).
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
  - `AdminPlanningSeason` header: title + pencil (`BUTTONS.edit`, `edit-season`, view mode + `canEdit`). Titles: Sæson / Rediger sæson / Opret sæson.
  - Footer: `LAYOUTS.formButtonRow`, `BUTTONS.cancel` "Annuller", `BUTTONS.save` "Gem" (`type="submit"`, `:loading`). `id="seasonForm"` untouched.
  - Activation controls stay in edit mode as today. No delete for seasons.
- **Editable holiday rows**: in edit/create mode each row is a `CalendarDateRangePicker` (`name="holidayRangeList-${i}"`); a change is validated
  against `holidaysSchema` on the replaced list (overlap / inside season) before it is emitted; view mode keeps the read-only rows.
- **Live season save**: the endpoint ignores `isActive` (activation only via `/active`); after reconciliation, when the season is active and the
  schedule changed, it runs `clipPreferences` + `scaffoldPrebookings` — the same idempotent pair activation runs. Response becomes a
  `SeasonUpdateResponse {season, reconciliation: {created, deleted}, scaffold}` operation envelope (ADR-009 [API Index Endpoint Data Inclusion
  Strategy]) so the toast can report: "Sæson opdateret — N datoer tilføjet, M fjernet. Forudbestillinger er opdateret. Husk at tildele madhold til nye datoer."
- **Heynabo cleanup**: `reconcileDinnerEventsForSeason` passes `deleteHeynaboEventsAsSystem` (best-effort, ADR-013) — one argument.
- `FormModeSelector` stays for Teams (stray `w` removed); `AdminSeason.vue` deleted.

### Mockup — ⏳ awaiting signoff

```
VIEW (canEdit)                                      EDIT / CREATE
┌ [Sæson ▾ Forår 2026]        [＋ Opret sæson] ┐    ┌ [Sæson ▾ Forår 2026]     [＋ Opret sæson] ┐ (disabled)
│ 🟢 Aktiv sæson … (SeasonStatusDisplay)       │    │ 🟢 Aktiv sæson …  [✕ Deaktiver Sæson]     │ (as today: edit mode)
│ ┌ Sæson                               [✏️] ┐ │    │ ┌ Rediger sæson | Opret sæson ─────────┐ │
│ │ Vi følger folkeskolernes feriekalender…   │ │    │ │ Hvornår holder fællesspisning fri?    │ │
│ │ fields disabled … calendar (right/top) …  │ │    │ │ [Start dato ▾][Slut dato ▾] [☀ Tilføj ferie] │  add row (as today)
│ └───────────────────────────────────────────┘ │    │ │ Valgte ferieperioder                  │ │
└───────────────────────────────────────────────┘    │ │ ☀ [13/10/2026][17/10/2026] 🗑          │ │  EACH ROW editable
                                                     │ │ ☀ [21/12/2026][03/01/2027] 🗑          │ │  (CalendarDateRangePicker);
LIVE SEASON, after Gem:                              │ │ … Billetpriser [🎟 Tilføj billet] … 🗑  │ │  list validated on change
  toast "Sæson opdateret — 3 datoer tilføjet,        │ ├───────────────────────────────────────┤ │
  1 fjernet. Forudbestillinger er opdateret.         │ │ fejlliste (if any)                    │ │
  Husk at tildele madhold til nye datoer."           │ │              [✕ Annuller]  [✓ Gem]   │ │
                                                     │ └───────────────────────────────────────┘ │
MOBILE: selector + [＋ Opret sæson] stacked full-   └───────────────────────────────────────────┘
width (LAYOUTS.cardActionRow/Button); ✏️ stays in the card header. View mode: rows read-only as today.
Removed on planning: FormModeSelector [👁][✏️][＋]. Kept on Teams. No 🗑 for seasons. Members: no ＋/✏️.
```

### TDD

| Test | Change |
|------|--------|
| `AdminPlanningSeason.nuxt.spec.ts` (new) | `it.each` mode × canEdit: pencil only in view + canEdit, footer only in edit/create; pencil emits `edit`; 'Annuller'/'Gem'; `form#seasonForm` |
| `AdminPlanning.nuxt.spec.ts` (new) | pattern `AdminAllergies.nuxt.spec.ts`; `create-season` present and `form-mode-edit` absent; member sees neither; edit/cancel/create drive `?mode=`; toast from the envelope |
| `CalendarDateRangeListPicker.nuxt.spec.ts` | edit mode row is a picker; change emits the updated list; overlap shows `'Ferieperioder må ikke overlappe hinanden'` and does not emit |
| `season.e2e.spec.ts:122` | envelope counts; `isActive` in the body ignored |
| `tests/e2e/api/serial/admin/seasonLiveEdit.e2e.spec.ts` (new) | own active season inside the 60-day window; add a holiday + a cooking date → orders on the holiday date gone (cascade), the new date scaffolded in the same request, preferences clipped |
| `tests/e2e/ui/serial/AdminPlanningLiveSeason.e2e.spec.ts` (new) | GIVEN the active season WHEN adding a holiday in the UI THEN the toast reports counts and bookings exist on the new date |
| `AdminPlanning.e2e`, `AdminPlanningSeason.e2e`, `admin.e2e` | `form-mode-*` → `create-season` / `edit-season`; ring-class assertions dropped; per-tab `editControl` (planning `edit-season`, teams `form-mode-edit`) |
| `AdminPlanningSeason.e2e` | edit a holiday row's dates → saved season has the new range |

### Affected Areas

`AdminPlanning.vue`, `admin/planning/AdminPlanningSeason.vue`, `calendar/CalendarDateRangeListPicker.vue`, `form/FormModeSelector.vue`,
`server/routes/api/admin/season/[id].post.ts`, `server/utils/reconcileDinnerEvents.ts`, `useSeasonValidation.ts` (`SeasonUpdateResponse`),
`app/stores/plan.ts` (`updateSeason` returns the envelope), delete `admin/AdminSeason.vue`, compliance docs.

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

### Mockup — ⏳ awaiting signoff (light)

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
| 8 | Poster notes + My preferences (one migration) | mockups ✅; color decision taken; brief approved; migration created and applied by the user |
| 9 | Ship: ADR-018, ADR-019, compliance docs, `docs/ui.md`, `docs/testing.md`, `pre:all`, full suites, `/dry` | — |

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
