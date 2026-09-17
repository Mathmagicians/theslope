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
| QR code | `uqr` + `QrCode.vue` atom instead of `api.qrserver.com`; prints | ✅ IMPLEMENTED (2026-09-16) |
| My preferences | notification channels (EMAIL/SMS) + appearance (colors, text scale) → `UserPreference` table, endpoints, dashboard card | ⏳ Mockup signoff + color decision + migration |
| Planning form | edit/create the allergies way (labelled Rediger + Opret), holiday rows editable, live-season save re-scaffolds, Heynabo cleanup on removed dates | ✅ IMPLEMENTED (2026-09-16) |
| Sorted holidays | holiday list chronological everywhere | ✅ IMPLEMENTED (2026-09-16) |
| Calendar grid | pickers show adjacent-month days twice → one shared `UCalendar` root token | ✅ IMPLEMENTED (2026-09-16) |
| Planning buttons | every planning button from the design system | ✅ IMPLEMENTED (2026-09-16) |
| Colour drift sweep | 178 raw Tailwind colour classes (34 files) and 59 literal Nuxt UI colour props (31 files) outside the design system → `TEXT`/`BORDER`/`RING`/`TYPOGRAPHY`/`BG`/`COLOR` tokens; architecture test forbids raw colour outside `useTheSlopeDesignSystem.ts` | ✅ IMPLEMENTED (2026-09-16) |

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
│ [👁] 🥛 Mælk          2  🆕    │
│ [▼] 🥜 Jordnødder     2        │  ← tap = select = expand
│ ┌────────────────────────────┐ │
│ │ Detaljer      [✏️] [🗑] │ │  ← AllergyDetailPanel, verbatim
│ │ 🥜 Jordnødder           │ │     ✏️ → edit form IN PLACE
│ │ Berørte beboere (2)        │ │     🗑 → cascade confirm IN PLACE
│ └────────────────────────────┘ │
│ [👁] 🌾 Gluten        1        │

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
- **Teams page, edit mode with zero teams** (2026-09-16, applied): `AdminTeams.vue` gates the master-detail branch and the edit footer on `displayedTeams.length > 0`, so the table branch and its `#empty` slot carry the one empty state + "Opret madhold" CTA.
- **Booking grid, week or month without dinners** (2026-09-16, applied): `BookingGridView.vue` `tableData` returns `[]` when `flatEvents` is empty, so the `UTable` `#empty` slot renders the grid empty state.
- **Edit affordances** (2026-09-16): table rows and detail panels keep the ghost pencil `BUTTONS.edit` (the allergy detail header was briefly labelled and reverted the same day); a form card’s edit entry is the labelled button `BUTTONS.secondaryAction` + `COLOR.primary` + `ICONS.edit` + "Rediger <navn>" — e.g. "Rediger Forår 2026" (the chef menu card pattern, label names the record like the household "Slet …" button). Applies to the season card (Planning form) only. Rule lives in `docs/ui.md`.
- **Season card title names the season** (2026-09-16): "Fællesspisning sæson 08/26-07/27" (view), "Rediger fællesspisning sæson …" (edit), "Opret fællesspisning sæson …" (create, name appears once the dates are set); the read-only "Sæson" input is removed — dates are never shown as a form element.
- **Date picker selection style** (2026-09-16): pickers render selected days through the same `#day` slot and the one DS helper `dayCircleClasses(variant)` the display calendars use; `CALENDAR.picker = {cookingDay: PLANNING_CALENDAR.day.generated, holiday: CALENDAR.holiday}` (references, no new class strings), chosen by a `selection` prop; Nuxt UI’s own selection fill is neutralised; no `:color` prop on pickers. Green stays reserved for holidays.
- **Tydelig, the AA preset** (2026-09-16): a fourth palette option — TheSlope’s own hues with every failing step darkened by procedure until WCAG 2.1 AA holds, generated into `app/assets/css/palettes/tydelig.css` and applied as CSS variables under `html[data-palette="tydelig"]`; no token or component changes. The options read Standard / Tydelig / Høj kontrast / Farveblind-venlig; the AA badge sits on Tydelig. After the visual comparison the user decides whether Standard stays or Tydelig replaces it as the base.
- **Colors in "My preferences"** (decided 2026-09-16): the Farver control carries a small 🇪🇺 flag and a green check naming the verified level (`EN 301 549 · WCAG 2.1 AA`, `AAA` for Høj kontrast), sourced from the same registry the contrast test asserts. Presets, criteria from EN 301 549 / WCAG 2.1 (AA default, AAA for Høj kontrast), verified by a contrast-ratio unit test over the design-system token pairs. Høj kontrast keeps TheSlope’s hues and tunes lightness; Farveblind-venlig maps the Color Universal Design set onto the meaning-bearing tokens (green, red, orange, pink, yellow). A node generator under `scripts/` emits `app/assets/css/palettes/high-contrast.css` and `colorblind.css`; `main.css` only imports them — generated CSS never lives in a hand-written file.
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
4. **ADR-018 [Design system owns shared UI patterns — components bind tokens, never raw Nuxt UI props]**, enforced by an architecture test.

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

`app/composables/useTheSlopeDesignSystem.ts`, 34 component/page files, `docs/ui.md`, `docs/adr.md` (ADR-018), compliance checklist.

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
| Poster table + QR flex row clipped 27px | `/admin/allergies/pdf` `div.flex.gap-6.mb-6` | fixed with the QR package: the row is `flex flex-col md:flex-row gap-6 mb-6`, so the QR stacks under the table on a phone |
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

## Colour drift sweep

### Problem

Colour was decided per file. Outside `app/composables/useTheSlopeDesignSystem.ts`, `app/` held **178 raw Tailwind
colour utility classes in 34 files** (`gray` 75, `neutral` 50, `red` 13, `amber` 9, `peach`/`orange`/`ocean`/`blue` 5
each, `violet` 4, `pink` 3, `party` 3, `green` 1 — `view/Ticker.vue` 21, `cooking-team/CookingTeamCard.vue` 20,
`admin/AdminEconomy.vue` 17, `allergy/AllergyTypeCard.vue` 12, `pages/public/billing/[token].vue` 10,
`admin/HouseholdEditPanel.vue` 10, `pages/admin/allergies/pdf.vue` 9, `view/ViewError.vue` 8, `chef/ChefMenuCard.vue` 8,
then 1–5 in 25 more) and **59 literal Nuxt UI colour props in 31 files** (`AdminEconomy` 9, `AdminTeams` 5,
`HouseholdEconomy` 5, `CookingTeamCard` 3, `UserProfileCard` 3, then 1–2 in 26 more). The same grey appeared as
`gray` in one file and `neutral` in the next; `CookingTeamCard.vue:239` carried `bg-violet-850`, a shade the palette
does not define.

### Solution

Every colour value lives in the design system; a `.vue` file references a token. Two architecture rules keep it there.
Each token carries exactly one rendered value, light rung and dark rung together, so every template renders the class
set it rendered before the sweep; two surfaces that drew different values take two tokens, named by where they are used.

| Added token | Classes | Sites |
|---|---|---|
| `TEXT.ink` | `text-gray-900 dark:text-white` | `AdminPlanningSeason` sub-headings, `DinnerModeSelector` day glyph |
| `TEXT.strong` | `text-gray-700 dark:text-gray-300` | `AllergyTypeCard` comment line, plus `TYPOGRAPHY.sectionSubheading` |
| `TEXT.toned` | `text-gray-600 dark:text-gray-400` | `AllergyTypeCard`, `CookingTeamCard`, `KitchenPreparation`, plus `TYPOGRAPHY.bodyTextMuted` |
| `TEXT.muted` | `text-gray-500 dark:text-gray-400` | `CookingTeamCard`, `DeadlineBadge`, `UserListItem`, `HouseholdListItem` |
| `TEXT.dimmed` | `text-gray-400 dark:text-gray-500` | `DinnerTicket` watermark |
| `TEXT.timestamp` | `text-gray-500 dark:text-gray-500` | `AllergyTypeCard` "sidst ændret" line |
| `TEXT.menuBody` | `text-neutral-600 dark:text-neutral-400` | `ChefMenuCard` menu description |
| `TEXT.gray[400/500]`, `TEXT.neutral[400/500]` | `text-gray-400`, `text-gray-500`, `text-neutral-400`, `text-neutral-500` | the light-only greys: 13 files, from `AdminEconomy` to `ViewError` |
| `BG.panel` | `bg-neutral-50 dark:bg-neutral-900` | 6 files: expanded rows and the detail panel under them (`AdminEconomy`, `AdminTeams`, `AdminUsers`, `HouseholdEditPanel`, `CookingTeamCard`, `HouseholdEconomy`) |
| `BG.panelNested` | `bg-neutral-100 dark:bg-neutral-800` | `AdminEconomy` order lines |
| `BG.panelHover` | `hover:bg-gray-50 dark:hover:bg-gray-800` | `HouseholdListItem` — a variant prefix composes only inside the token |
| `BG.inset` | `bg-gray-50 dark:bg-gray-800` | `AllergenMultiSelector` selected row, `CookingTeamCard` member list, `HouseholdSettings` calendar-feed box |
| `BG.ticket` | `bg-gray-50 dark:bg-gray-800/50` | `DinnerTicket` body |
| `BG.budgetHead` | `bg-neutral-50 dark:bg-neutral-800` | `DinnerBudget` head row |
| `BG.invoiceGround` | `bg-neutral-50 dark:bg-neutral-950` | `public/billing/[token]` page ground |
| `BG.invoiceStat` | `bg-neutral-100 dark:bg-neutral-900` | `public/billing/[token]` 4 summary boxes |
| `LAYOUTS.panelDivider` | `border-t border-neutral-200 dark:border-neutral-700` | `HouseholdEditPanel` footer rule |
| `RING.{red,green,amber,orange}` | `ring-red-500/700`, `ring-green-500`, `ring-amber-500`, `ring-orange-200` | 6 files, plus `CALENDAR.deadline` and `CALENDAR.holiday` |
| `COMPONENTS.segmentedActive` | `ring-2 border-2 ring-orange-200 shadow-md` | `FormModeSelector`, `BookingViewSwitcher` — one string, two files |
| `COMPONENTS.economyTable.level{1,2}.tableHead` | `bg-ocean-100 dark:bg-ocean-900`, `bg-peach-100 dark:bg-peach-900` | `HouseholdEconomy`, `AdminEconomy` |
| `BACKGROUNDS.appShell` | `bg-amber-500 dark:bg-amber-800` | `layouts/default.vue` |
| `BACKGROUNDS.header` | `bg-blue-100 md:bg-blue-100/80 dark:bg-blue-900 md:dark:bg-blue-900/80` | `PageHeader` |
| `PANTONE_CHIPS` / `getPantoneChip(index)` | One tinted chip per brand family | `Ticker` |
| Scale shades | `TEXT.mocha[500]`, `TEXT.blue[500]`, `TEXT.red[500/700/900]`, `BG.red[100]`, `BORDER.gray[300]`, `BORDER.amber[600]` | `ChefMenuCard`, `AdminPlanningSeason`, `TicketPriceListEditor`, `ViewError`, `pdf.vue` |

`CookingTeamCard.vue:239` drops `bg-violet-850`; the poster keeps the light-only family scale (`BG.gray[100]`,
`BORDER.gray[700]`, `TEXT.gray[600]`) so print stays as it is. The rule and the token table live in
[docs/ui.md](../ui.md#colour-comes-from-the-design-system).

### TDD

| Red | Green |
|---|---|
| `no .vue names a Tailwind palette shade` — 178 `file:line` hits in 34 files | 0 |
| `no .vue passes a literal colour to a component` — 59 `file:line` hits in 31 files | 0 |

Both rules read the `.vue` sources in `tests/component/architecture/designSystemUsage.unit.spec.ts` and exempt
`app/components/icons/Logo.vue`. The shade rule covers `(bg|text|border|ring|outline|from|to|via|fill|stroke|divide|placeholder|decoration|accent)-<family>-<shade>`
including `dark:`, `hover:` and `md:` forms; the prop rule covers `color="…"` and `:color="'…'"` and the compound
props that end in `-color`.

### Affected Areas

55 files: `app/composables/useTheSlopeDesignSystem.ts`, `app/layouts/default.vue`, 4 pages
(`admin/[tab].vue`, `admin/allergies/pdf.vue`, `household/[shortname]/[tab].vue`, `public/billing/[token].vue`)
and 49 components across `admin/`, `allergy/`, `booking/`, `calendar/`, `chef/`, `common/`, `cooking-team/`,
`deadline/`, `dinner/`, `economy/`, `form/`, `household/`, `login/`, `shared/`, `user/`, `view/`.

Verified: value-preserving. A script resolves every design-system token reference in all 105 tracked `.vue` files under
`app/` against the matching version of `useTheSlopeDesignSystem.ts` and compares the multiset of colour utility classes
each template renders at `HEAD` with the multiset it renders now — `dark:`, `hover:`, `md:` and `/alpha` forms included.
Result: 0 differences, the one exception being `bg-violet-850` in `CookingTeamCard.vue:239`, a shade `main.css` leaves
undefined.

Verified: `npx vitest run tests/component/architecture` 6 passed; `npm run test:unit` 2337 passed in 93 files;
`npm run pre:all` green (lint, ts, ts:server, ts:node, ts:workers); the 8 UI e2e specs 74 passed with one flake on
`AdminTeams.e2e.spec.ts:57` at `--workers=4`, 13 passed on the rerun of that file alone.

### Visual check — Colour drift sweep

| Route + state | Viewport | DS element to expect | Expect |
|---|---|---|---|
| `/` landing ticker | 375px + desktop | `getPantoneChip(index)` | unchanged — the 7 chips keep border, fill and ink per family |
| Every page, outside the card | both | `BACKGROUNDS.appShell` | unchanged — mocha shell, amber-800 in dark |
| Every page, header bar | 375px + desktop | `BACKGROUNDS.header` | unchanged — blue-100 bar, translucent and rounded from md up |
| `/admin/planning`, season card | both | `TYPOGRAPHY.bodyTextMedium` + `TEXT.ink` on the holiday and ticket sub-headings, `TEXT.blue[500]` on the Lejre Kommune link, `TEXT.red[500]` on a validation error | unchanged (value-preserving) |
| `/admin/planning`, ticket price editor | both | `TEXT.gray[500]` on descriptions, `TEXT.red[500]` on the error line | unchanged (value-preserving) |
| `/admin/teams`, table + edit mode | both | `TEXT.gray[500]` on the placeholder, `BG.panel` on the expanded row, `COLOR.secondary`/`COLOR.neutral` on the footer buttons | unchanged (value-preserving) |
| `/admin/teams`, a team card | 375px + desktop | `TYPOGRAPHY.sectionSubheading`, `TYPOGRAPHY.caption` + `TEXT.toned`, `BG.inset` on the member list, `BG.panel` on the expanded row, `COLOR.winery` on remove | unchanged (value-preserving) |
| `/admin/teams`, kitchen monitor mode | desktop | no background class | unchanged — `bg-violet-850` named a shade the palette does not define |
| `/admin/households`, table + expanded row | both | `TEXT.gray[400]` on the home glyph, `TEXT.gray[500]` on the two empty lines, `BG.panel` + `TEXT.neutral[500]` + `LAYOUTS.panelDivider` in `HouseholdEditPanel` | unchanged (value-preserving) |
| `/admin/users`, table + expanded row | both | `BG.panel`, `TEXT.gray[500]`, `COLOR.secondary` on search and loading | unchanged (value-preserving) |
| `/admin/allergies`, catalog + detail | 375px + desktop | `RING.red[700]` on the allergen circle, `TEXT.gray[500]` on the empty detail, `TEXT.strong` on a beboer comment, `TEXT.timestamp` on the "sidst ændret" line, `COLOR.secondary` on the search | unchanged (value-preserving) |
| `/admin/allergies/pdf` + print preview | desktop + print | `BORDER.gray[700]`, `BG.gray[100]`, `TEXT.gray[600]`, `BORDER.gray[300]` on the QR frame | unchanged — the poster keeps its light-only scale |
| `/admin/economy`, three nesting levels | both | `BG.panel` (level 1 expand), `BG.panelNested` (order lines), `COMPONENTS.economyTable.level2.tableHead`, `TEXT.neutral[400]` on the em-dashes, `COLOR.neutral`/`COLOR.success` on badges | unchanged (value-preserving) |
| `/household/<own>/economy` | both | `COMPONENTS.economyTable.level1.tableHead`, `BG.panel`, `TEXT.gray[400]` on the `\|` separator | unchanged (value-preserving) |
| `/household/<own>/bookings`, view switcher | 375px + desktop | `COMPONENTS.segmentedActive` | unchanged — orange-200 ring on the selected view |
| `/household/<own>/bookings`, a ticket | 375px | `BG.ticket` on the ticket body, `TEXT.dimmed` on the watermark, `TEXT.gray[500]` on the provenance line | unchanged (value-preserving) — the body keeps its `/50` alpha in dark, the watermark its `opacity-[0.12]` |
| `/household/<own>/settings`, calendar feed box | both | `BG.inset`, `COLOR.error` on the move-out DangerButton | unchanged (value-preserving) |
| `/household/<own>/members`, household card | both | `COLOR.warning` / `COLOR.primary` as `ring-color` on the avatars | unchanged |
| `/household/<other>` as visitor | both | `COLOR.info` as `initial-color` on the admin-override DangerButton | unchanged |
| `/chef`, agenda + menu card | 375px + desktop | `RING.amber[500]` on the card and the chef portrait, `BORDER.amber[600]` on the WANTED frame, `TEXT.mocha[500]` on the hat, `TEXT.neutral[500]` on a missing menu title, `TEXT.menuBody` on the description | unchanged (value-preserving) |
| `/chef`, team without dinners | both | `TEXT.gray[400]` on the calendar glyph, `TEXT.gray[500]` on the line | unchanged (value-preserving) |
| `/chef/dinner/<id>`, budget table | both | `BG.budgetHead` on the head row | unchanged (value-preserving) |
| `/dinner`, kitchen preparation | 375px + desktop | `TEXT.toned` on the two stat lines | unchanged |
| `/dinner`, mode selector | 375px | `TYPOGRAPHY.caption` + `TEXT.ink` on the day glyph | unchanged (value-preserving) |
| `/login`, wrong password | both | `COLOR.secondary` on the buttons | unchanged |
| Public billing `/public/billing/<token>` | 375px + desktop | `BG.invoiceGround` on the page ground, `BG.invoiceStat` on the 4 summary boxes | unchanged (value-preserving) |
| Any error page | both | `TEXT.red[500/700/900]`, `BG.red[100]`, `TEXT.gray[400]` on the stack trace, `COLOR.error` on the trace button | unchanged (value-preserving) |
| Any form with a mode selector | both | `COMPONENTS.segmentedActive`, `COLOR.info` on the buttons | unchanged |
| Any table with search + pagination | both | `COLOR.neutral` | unchanged |

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
  (the poster has no `UApp`). Mounted in the `AdminAllergies` card header above the managers list (the poster’s order) and on the poster (view only). The poster keeps its print table.
- **ADR-0xx (next free number when it ships) [Editable settings and user preferences as key-value stores with code registries]**.

### Mockup — ✅ applied 2026-09-16 (notes box in the card header, poster order; edit face pending)

```
DESKTOP                                             MOBILE
┌ Allergi Katalog                    [📄 Plakat] ┐  ┌ Allergi Katalog      [📄 Plakat] ┐
│ ⚠ Vigtige bemærkninger                          │  │ ⚠ Vigtige bemærkninger            │
│  • Glutenfri boller findes i fryseren …         │  │  • Glutenfri boller …             │
│  • Ved mælkeprodukter i brød …                  │  │  • Husk at give besked …          │
│ ⓘ Spørgsmål om allergier? (managers)            │  │ ⓘ Spørgsmål om allergier?         │
│ [⧉ Sammenlign] [↓ Antal] [＋ Opret allergi]      │  │ [⧉ Sammenlign] [↓ Antal]          │
│ ┌ master ──────┬ detail (sticky) ─────────────┐ │  │ [＋ Opret allergi]                 │
│ │ 🥛 Mælk  2   │ Detaljer          [✏️] [🗑]  │ │  │ [▼] 🥜 Jordnødder 2                │
│ │ 🥜 Jordn. 2 ◀│ …                             │ │  │  ┌ Detaljer  [✏️][🗑] ┐             │
│ └──────────────┴───────────────────────────────┘ │  │  └────────────────────┘             │
└──────────────────────────────────────────────────┘  └────────────────────────────────────┘
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
  + `:icon="ICONS.warning"` — the look decided 2026-09-16), mounted in the `AdminAllergies` card header above the managers list and on the poster; the poster's
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
| `/admin/allergies`, catalog loaded | 375px | `AllergyNotes` → `ALERTS.legend` + `:icon="ICONS.warning"` in the card header, above the managers list | neutral outline box at the top of the card, ⚠ beside "Vigtige bemærkninger:", three bullets; text wraps, no horizontal scroll |
| `/admin/allergies`, catalog loaded | desktop | same, card header | box spans the card above the toolbar and the master/detail panes |
| `/admin/allergies`, empty catalog | both | `AllergyNotes` + `UTable #empty` → `ALERTS.emptyState` | notes still render under the empty-state table |
| `/admin/allergies/pdf` | desktop | `AllergyNotes` (`class="mt-4"`) | identical box to the catalog footer, between the allergy table and the `AllergyManagersList` box; same spacing as before |
| `/admin/allergies/pdf`, print preview | print | same | notes print (no `no-print`); ⚠ icon and bullets legible in black on white |

---

## QR code — ✅ IMPLEMENTED (2026-09-16)

### Problem

The poster built `https://api.qrserver.com/v1/create-qr-code/?…` into an `<img>` inside a `no-print` block: an external dependency at
render time, and the QR stayed off paper.

### Solution

`uqr` 0.1.3 (zero deps, runs in Workers and browsers).

| Piece | What it holds |
|---|---|
| `app/utils/qr.ts` | `encodeQrPath(value, {ecc = 'M', border = 1})` → `{size, d}`: the module grid edge and every dark module as a 1x1 rect, in module units |
| `app/components/shared/QrCode.vue` | props `value`, `size` (default 160), `label`; inline `<svg role="img" shape-rendering="crispEdges" data-testid="qr-code">` with a white `<rect>` and one black `<path>`; `aria-label` reads `<label>: <value>` |
| `app/pages/admin/allergies/pdf.vue` | `<QrCode :value="qrCodeUrl" label="Scan for online version"/>` in the `poster-row`, which is `flex-col md:flex-row` on screen and `row` in the print block (A4 content is ~680px, below `md`); the QR prints with the poster |

Literal `#000000`/`#ffffff` keep the code legible under `print-color-adjust: exact`. The page owns the caption and the layout.

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
| `AdminTeams.e2e.spec.ts` | `?mode=edit` on a season with no teams shows `teams-empty-state` + `create-new-team` |
| `BookingGridView.nuxt.spec.ts` | week and month with no events show the grid empty text; a period with one event grids the household again |
| `AllergyDetailPanel.nuxt.spec.ts` | the edit control stays the row-style pencil with `aria-label="Rediger"` (reverted 2026-09-16); testid unchanged |

**Verified (2026-09-16):** red first — `qr.unit` and `QrCode.nuxt` unresolved (`~/utils/qr` absent), `qr-code` missing on the poster page,
`Ingen middage denne uge|måned` absent from the grid, the allergy edit control empty. Green: 497 vitest tests across
`tests/component/{utils,components/shared,components/allergy,components/booking,pages,architecture}`; `npm run pre:all` clean;
`AllergyPoster` + `AdminAllergies` + `AdminTeams` e2e 17/17 at `--workers=4`.

### Visual check — QR batch

| Route + state | Viewport | DS element to expect | Expect |
|---|---|---|---|
| `/admin/allergies/pdf` as a member | desktop | `QrCode` (`data-testid="qr-code"`) beside the allergy table | 160px black-on-white QR right of the table, caption "Scan for online version" under it; scanning it opens the same page |
| `/admin/allergies/pdf` as a member | 375px | same `QrCode`, row is `flex-col md:flex-row` | table full width, QR below it, no horizontal page scroll |
| `/admin/allergies/pdf` → Print (⌘P) | print preview | `QrCode` (the `no-print` wrapper is gone), `.poster-row` print rule | QR beside the table on the printed page, black on white; the ← Tilbage and 🖨 Print buttons stay off paper |
| `/admin/teams?season=<season with no teams>&mode=edit` | 375px + desktop | `UTable #empty` → `ALERTS.emptyState` + `BUTTONS.primaryAction` `create-new-team` | 💤 "Her ser lidt tomt ud!" with "Opret madhold"; no "Vælg et madhold for at redigere" panel and no footer buttons |
| `/admin/teams?season=<season with teams>&mode=edit` | desktop | master-detail + footer `add-team-button` | team tabs, the selected team card and "Tilføj madhold" all unchanged |
| `/household/<own>/bookings?view=week` on a week with no dinners | 375px + desktop | `UTable #empty` → `ALERTS.emptyState` | emoji + "Ingen middage denne uge"; the Beboer / Alle grid rows are gone; arrows still move to the next week |
| `/admin/allergies`, an allergy selected | desktop (sticky detail) | `BUTTONS.edit` pencil in the "Detaljer" header (reverted 2026-09-16) | ghost ✏️ beside the ghost 🗑, as before; clicking it opens the edit form in place |
| `/admin/allergies`, a row tapped | 375px | same button in the docked detail | button and 🗑 fit the row width, header wraps rather than clipping |

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

### Contrast test — step 1 ✅ (2026-09-16, tests + docs only)

The criterion the presets are generated against, automated. `tests/component/architecture/designSystemContrast.unit.spec.ts` turns
EN 301 549 → WCAG 2.1 into a check of the design system: it resolves every colour a token names through the same stylesheets the browser
reads — `main.css` `@theme static`, Tailwind 4's oklch defaults, `app.config.ts` `ui.colors`, Nuxt UI's `--ui-*` semantics — composites the
alpha surfaces, and measures `(L1 + 0.05) / (L2 + 0.05)`. The colour maths (`hexToRgb`, `oklchToHex`, `relativeLuminance`, `contrastRatio`,
`composite`) is exported from `tests/component/architecture/contrast.ts` so **the palette generator reuses the functions it is measured by**
— no colour dependency, no second implementation. The OKLCH conversion is anchored against Tailwind's published hex
(`oklch(72.3% 0.219 149.579)` → `#00c950`, `oklch(55.1% 0.027 264.364)` → `#6a7282`, `oklch(63.7% 0.237 25.331)` → `#fb2c36`).

**Pair inventory** — derived by walking the exported tokens, so a token added tomorrow is measured tomorrow. Light and dark are separate pairs.

| Group | What is measured | Threshold |
|---|---|---|
| **text on surface** | Every foreground token (`TEXT.ink/strong/toned/muted/dimmed/timestamp/menuBody`, `TYPOGRAPHY.*`, `COMPONENTS.*` icon and heading ink) on `page` (`bg-default`), `BG.panel`, `BG.panelNested`, `BG.inset`, `BG.ticket`, `BG.invoiceGround`, `BG.invoiceStat`, `BG.budgetHead` | 4.5 (7 in Høj kontrast) |
| **paired token** | A token that carries **both** its ink and its fill — `BACKGROUNDS.*`, `PANTONE_CHIPS`, `COMPONENTS.kitchenPanel`, `CALENDAR`/`CHEF_CALENDAR`/`DINNER_CALENDAR`/`PLANNING_CALENDAR` day styles, `ALERTS.emptyStateCompact` — plus the eleven light-ink tokens whose fill has one owner (`TYPOGRAPHY.footerText` on `BACKGROUNDS.appShell`, the countdown ink on `CALENDAR.countdown.container`, …) | 4.5 (7) |
| **edge on surface** | Every `BORDER.*`/`RING.*` rung, `LAYOUTS.*Divider`, `COMPONENTS.segmentedActive`, the calendar rings and selections, and the economy-tree header/footer/statBox fills, against `page` and `BG.panel` | 3 (1.4.11 has no AAA level) |
| **semantic slot** | The 13 Nuxt UI slots of `app.config.ts`: `text-<slot>` on the page, `text-<slot>` on the soft `bg-<slot>/10` alert/badge surface, `text-inverted` on the solid `bg-<slot>` | 4.5 (7) |

Two reductions keep the inventory honest rather than merely large, both commented in the spec: a **palette rung** (`TEXT.gray[500]`) is half a
pair — docs/ui.md calls `BG`/`TEXT`/`BORDER`/`RING` low-level builders, and a text rung carries no dark face — so text rungs are measured where a
token pairs them with a fill, while border and ring rungs stay in the edge group (being visible against an unknown surface *is* an edge's
contract). And surfaces that resolve to the same colour in a mode are folded into the first name that carries it (`BG.panel`,
`BG.invoiceGround` and `BG.budgetHead` are all `neutral-50` in light).

**Default-theme result (measured 2026-09-16, before the scoping of step 2): 438 pairs, 191 pass, 247 fail.**
The scoped numbers are in "Tydelig — step 2" below.

| Group | Pairs | Pass | Fail | Worst |
|---|---:|---:|---:|---|
| text on surface | 153 | 84 | 69 | `TEXT.dimmed` 1.82 (dark, `BG.panelNested`) |
| paired token | 86 | 53 | 33 | `BACKGROUNDS.hero.pink` / `landing.section1` 2.32 |
| edge on surface | 121 | 44 | 77 | `BORDER.gray[700]` 1.00 (dark, page); every economy-tree fill 1.00–1.34 |
| semantic slot | 78 | 10 | 68 | `slot.yellow` 1.80; `slot.success` 2.03; `slot.secondary` 2.31 |

The shape of the finding is one sentence: **TheSlope's Pantone palette is a warm pastel set whose 500/400 rungs sit at 2–4:1 on white**, so
in light mode **all 39 slot pairs fail** (13 slots × page / soft / solid) and only 10 of the 39 dark pairs pass (`success` and `yellow` fully,
the page and solid faces of `peach` and `ocean`); the hero pairings miss it too (`hero.mocha` 3.55, `hero.orange` 2.64, `hero.pink` 2.32), and the
Tailwind-default borders miss 1.4.11 (`BORDER.gray[200]` 1.24 on the page). Every miss is listed per pair in `KNOWN_FINDINGS` with its ratio and
runs as `it.fails`, so a fix breaks the build and asks for the entry to be deleted, and a new miss cannot be hidden by adding one. The full
247-pair list is the map the palette generator works from; the questions it puts to the colour decision:

1. Does the **default** theme move to AA (retune the 500/400 rungs, or point `text-<slot>` at 600/700), or does AA become the promise of the
   presets only, with the default accepted as-is?
2. Are `TEXT.dimmed`, `LAYOUTS.sectionDivider` and the economy-tree fills **decorative** (1.4.3/1.4.11 exempt) or content? If decorative, they
   leave the inventory by an explicit exemption in the spec, not by a lowered threshold.
   → **Answered in step 2** for the dividers and the economy-tree banding (exempt, named per token); `TEXT.dimmed` stays content and is fixed by
   the preset.
3. The brand surfaces (landing rainbow, hero, kitchen panels) are large text in practice — should they be measured at the 3:1 large-text rung of
   1.4.3 instead of 4.5? That is a per-token decision, not a global one.
   → **Answered in step 2**, per token, from the components: `INK_ON_FILL` maps each brand surface to the typography that draws on it. The landing
   bands and the title bar carry `sectionTitle` / `heroTitle` and take the 3:1 rung; the kitchen panels carry `kitchenLabel` at `text-xs` and stay
   at 4.5:1; `hero.mocha` carries `bodyTextMedium` and stays.

Two Nuxt UI observations fell out of the same resolution work and are recorded here, not fixed: `--ui-neutral` is never emitted (the colours
plugin destructures `neutral` out), and `mocha`/`bonbon` are declared in `nuxt.config.ts` `ui.theme.colors` but never mapped in `app.config.ts`
`ui.colors` — so `bg-mocha` and `bg-bonbon` paint nothing. Neither is reached today (`COLOR.mocha` sites use `BG.mocha[500]` = `bg-amber-500`,
and Nuxt UI's own neutral compound variants use `text-highlighted`/`bg-elevated`), but a future `:color="COLOR.mocha"` would be invisible.

**Preset status:** `app/assets/css/palettes/high-contrast.css` (AAA) and `colorblind.css` (AA) do not exist yet, so their 401 cases each are
**skipped by name** (`describe.skipIf`) — 802 skipped, 0 faked. They go green the moment the generator emits the files.

### Tydelig — step 2 ✅ (2026-09-16, the AA preset + its generator)

**Scoped to the standard first.** Three rules put the inventory on what WCAG 2.1 asks, all stated in
`designSystemPairs.ts` and in docs/ui.md "Palettes":

1. **1.4.3 large-scale text** — every face a token renders is measured and the smallest one sets the bar: 24px, or
   18.66px at `font-bold` and heavier, takes the 3:1 rung. Today that is `TYPOGRAPHY.sectionIconLight` (`text-2xl`,
   light 3.55 and dark 3.01).
2. **1.4.3 for a fill** — a fill token carries no size, so its bar comes from the typography a component places on it.
   `INK_ON_FILL` lists one row per surface with the component and line that draws it: the landing bands carry
   `TYPOGRAPHY.sectionTitle` (`text-xl md:text-3xl font-bold` — 20px bold at phone width, large at both widths) and
   move to 3:1; `BACKGROUNDS.landing.titleBar` carries `heroTitle`; `BACKGROUNDS.hero.mocha` carries
   `bodyTextMedium` (`text-sm`) and stays at 4.5:1; `COMPONENTS.kitchenPanel.*` carry `kitchenLabel` `text-xs`,
   `kitchenSecondary`, `kitchenMain` `text-base md:text-lg font-bold` and `kitchenDetail` — all under the large bar,
   so **4.5:1 stays**. `BACKGROUNDS.landing.ticker` is out of the table: its words are `PANTONE_CHIPS`, which bring
   their own fill and are measured as their own pairs.
3. **1.4.11 decorative edges** — `LAYOUTS.sectionDivider`, `LAYOUTS.panelDivider` and the economy tree's `border` /
   `header` / `footer` / `statBox` / `tableHead` draw a boundary the indentation, heading and icon already state, so
   they sit outside non-text contrast. Their ink stays measured in the text groups.

A new case guards the baseline: **every listed finding still names a pair**, so a scoping rule that removes a pair
removes its line.

**Default theme after scoping: 401 pairs, 197 pass, 204 fail** (was 438 / 191 / 247).

| Group | Pairs | Pass | Fail | Moved by the scoping |
|---|---:|---:|---:|---|
| text on surface | 153 | 84 | 69 | — |
| paired token | 86 | 59 | 27 | 6 to pass (2 large text, 4 placed ink) |
| edge on surface | 84 | 44 | 40 | 37 pairs out (decorative) |
| semantic slot | 78 | 10 | 68 | — |

**The preset.** `scripts/palettes/generate.ts` (run with `npx jiti scripts/palettes/generate.ts`; jiti is already a Nuxt
dependency) reads the inventory the spec asserts, and for each pair walks the `--color-<family>-<step>` behind its ink or
its fill along OKLCH lightness — hue and chroma held — until the pair clears its threshold. Each side keeps the side it
is on, a dark ink darker and a light ink lighter, so a scale stays a scale and `pink-50` on `bg-pink-500` is answered by
darkening the fill. The eight neutral surfaces are held. Every pair constrains its variable, the ones that pass today
included, so the preset never trades one pair for another; where two pairs ask one variable for opposite things, the
variable goes the way that answers more of them. Output: `app/assets/css/palettes/tydelig.css`, **25 steps in the light
block across 14 families, 34 in the dark block**, imported by `main.css`. Two runs write the same bytes.

| Family | Light block | Dark block |
|---|---|---|
| amber | 500 `#a47864`→`#8c614e` | 400 `#ae8a71`→`#ddb89d`, 500 →`#835a46`, 600 `#8d5f52`→`#b48375`, 800 back to `#633f3d` |
| blue | 400 `#33becc`→`#00808e`, 500 `#25a6b5`→`#007685`, 600 `#228698`→`#007385` | 400 →`#4dd2e0`, 500 →`#0d9baa`, 700 `#226d7d`→`#5298a9` |
| caramel | 500 `#b76a4a`→`#a15737` | 400 `#ca815a`→`#f9ac84` |
| gray | 200 `#e5e7eb`→`#8b8c90`, 300 `#d1d5dc`→`#898c93`, 400 `#99a1af`→`#616976`, 500 `#6a7282`→`#616878` | 200 and 300 back to published, 400 →`#b5bdcc`, 500 →`#b4bdce`, 600 `#4a5565`→`#8390a1`, 700 `#364153`→`#838fa4` |
| green | 500 `#00c950`→`#007c00` | 400 and 500 back to published |
| orange | 200 `#f9ceaf`→`#ac8467`, 500 `#ec6a37`→`#bb3d00` | 200 back to published, 400 `#ef7e48`→`#ffaa74`, 500 →`#ffa875` |
| party | 500 `#e84c76`→`#c6295b`, 700 `#c4516c`→`#c04d69` | 400 `#f17999`→`#ffa3c2` |
| peach | 400 `#ff9b5e`→`#b85a14`, 500 `#fe7320`→`#c23a00`, 600 `#ef5616`→`#c62d00` | 400 →`#ffab6d`, 700 `#c63f14`→`#ed633d` |
| pink | 300 `#fab0c7`→`#be788f`, 500 `#fa7b95`→`#b83f5e` | 300 back to published, 400 `#f77da1`→`#ffa3c6`, 500 →`#dd627d`, 800 `#a9284b`→`#ffa2ba` |
| red | 500 `#c4746f`→`#a25551` | 400 `#d69c96`→`#ecb1aa`, 500 →`#c97973`, 700 `#904040`→`#cd7674` |
| sky | 500 `#3c8c9e`→`#207586`, 600 `#357385`→`#327082` | 400 `#52a5b6`→`#7accde` |
| violet | 500 `#de5697`→`#b93277` | 400 `#e97db3`→`#ffa0d6`, 500 →`#ff9ddd` |
| winery | 500 `#d65c72`→`#b84059` | 400 `#e68494`→`#ffa5b4` |
| yellow | 500 `#eab308`→`#946000` | 400 back to published |

**Tydelig result: 401 pairs, 385 pass, 16 fail** — text on surface 153/153, semantic slot 78/78, edge on surface 80/84,
paired token 74/86.

**The bands, measured.** The placed-ink rule lowered the bands' own bar to 3:1, and the emitted values barely moved:
the same `--color-<family>-500` also paints a **solid button**, whose `text-inverted` label is body text at 4.5:1
(`slot.secondary` = pink, `slot.warning` = orange, `slot.party`, `slot.neutral` = sky). That constraint is the binding
one, so the bands land where the slots put them. Light mode:

| Band | Fill | Bar | Default | Tydelig |
|---|---|---:|---:|---:|
| `landing.section1` / `hero.pink` | pink-500 | 3 | 2.32 | **4.95** |
| `landing.section2` / `hero.orange` | orange-500 | 3 | 2.64 | **4.67** |
| `landing.section3` | party-700 | 3 | 4.07 | **4.29** |
| `landing.section4` | sky-500 | 3 | 2.78 | **5.09** |
| `landing.titleBar` / `ticker` / `hero.mocha` | amber-500 | 3 / 3 / 4.5 | 3.55 | **4.91** |
| `hero.peach` | peach-300 | 3 | 9.01 | 9.01 |

Four distinct hues remain (deep rose, burnt orange, mauve-rose, teal), each one step deeper than the published band.
Three values changed against the pre-scoping run: `party-700` `#b94763`→`#c04d69`, dark `blue-500` `#007c8b`→`#0d9baa`,
dark `pink-500` `#bd4461`→`#dd627d`. The light block still carries 25 steps, the dark block 34.

**The 16 are one variable asked to be two things**, listed per pair in `PRESET_FINDINGS` and run as `it.fails`. Twelve of
the fourteen dark ones are a token with **no `dark:` face**: `COMPONENTS.kitchenPanel.*` paints `bg-orange-500 text-white`
in both modes while dark mode also draws `text-warning-500` in that orange on a dark page, and the same shape repeats for
`CHEF_CALENDAR.day.next` / `DINNER_CALENDAR.day.next` (`bg-ocean-400`/`bg-peach-400` + white), `CALENDAR.picker.cookingDay`
and `PLANNING_CALENDAR.day.generated` (`bg-pink-800 text-pink-50`), `BACKGROUNDS.hero.orange` and `landing.section2`,
`PANTONE_CHIPS[1]`. `BORDER.gray.800` is `BG.inset`'s own dark fill, which a preset holds. **A dark face on those eight
tokens closes all sixteen** — a token change, which the "Tydelig, the AA preset" decision puts outside this package.

**Kitchen panels — three options, numbers only.** White `text-xs` on a vibrant fill needs 4.5:1, which the palette can
only reach by pulling all four fills to the same depth. That is a surface design decision, so the kitchen pairs stay in
`PRESET_FINDINGS` and the choice is the user's:

| Panel | Published fill | (a) as generated, white ink | (b) dark ink on the published fill | (c) main number at `text-2xl font-bold` (3:1), published fill |
|---|---|---:|---|---:|
| TAKEAWAY (`bg-warning-500`) | orange-500 `#ec6a37` | `#bb3d00` → 5.55 | `TEXT.ink` 5.65 · black 6.68 | white 3.14 ✅ |
| DINEIN (`bg-party-700`) | party-700 `#c4516c` | `#c04d69` → 4.66 | `TEXT.ink` 4.01 · black 4.74 | white 4.43 ✅ |
| DINEINLATE (`bg-orange-500`) | orange-500 `#ec6a37` | `#bb3d00` → 5.55 | `TEXT.ink` 5.65 · black 6.68 | white 3.14 ✅ |
| RELEASED (`bg-gray-500`) | gray-500 `#6a7282` | `#616878` → 5.59 | `TEXT.ink` 3.67 · black 4.34 | white 4.84 ✅ |

(a) costs the four hues: TAKEAWAY and DINEINLATE are the **same** `orange-500` in the published palette too, so the
panel row reads as three colours either way, at a deeper saturation. (b) clears 4.5:1 on three of the four with
`TEXT.ink` (`text-gray-900`) and on all four with black; `RELEASED` at 3.67 needs one step lighter — `gray-400`
`#99a1af` gives 6.82, and the other three at their 400 rung give 6.55 / 6.71 / 6.55. (c) clears the 3:1 large-text bar
on all four with the fills untouched, and the small labels (`kitchenLabel`, `kitchenSecondary`, `kitchenDetail`) then
move to dark ink, where they read at the (b) numbers.

**Screenshots** (`test-results/palettes/<page>-<viewport>-<default|tydelig>.png`, 28 files, desktop 1440×900 and 375×812),
taken against seeded content: the singleton active season with dinner events, a cooking team with the admin as chef on
the next three dinners, and `scaffold-prebookings` run for the season. Pages: `chef` (team, countdown, calendar, chef
card, kitchen panels), `chef-kitchen` (agenda open, the seeded menu in the list), `dinner` (selected dinner, the
household's ticket rows, kitchen panels), `household-bookings` (week grid with two dinner columns), `admin-planning`
(season + calendar), `admin-allergies` (catalog + detail), `landing`.

### Visual check — Tydelig

Set the preset from the console on any page: `document.documentElement.dataset.palette = 'tydelig'`, back to Standard with
`delete document.documentElement.dataset.palette`, dark with `document.documentElement.classList.toggle('dark')`.

| Route + state | Viewport | DS element to expect | Expect |
|---|---|---|---|
| `/` landing, scrolled | 375px + desktop | `BACKGROUNDS.landing.section1-4`, `PANTONE_CHIPS` | Four distinct bands, each a step deeper: pink 2.32→4.95, orange 2.64→4.67, party 4.07→4.29, ocean 2.78→5.09. The near-white section titles read on every band. The ticker chips keep their tint |
| `/admin/planning`, view mode | desktop | `CALENDAR.holiday` ring, `PLANNING_CALENDAR.day.generated`, `BUTTONS.primaryAction` | Holiday ring darkens to `#007c00` and separates from white; generated cooking days keep their pink fill; `Opret sæson` / `Rediger` go mocha `#a47864`→`#8c614e` |
| `/admin/planning?mode=edit`, holiday rows | 375px | `CalendarDateRangePicker` inputs, `LAYOUTS.sectionDivider` | Input borders `gray-200`→`#8b8c90`; the field edges become visible; section rules darken with them |
| `/admin/allergies`, a row tapped | 375px + desktop | `AllergyCatalogTable`, `AllergyDetailPanel`, `TEXT.dimmed` | Muted and dimmed greys darken (`gray-400` `#99a1af`→`#616976`); timestamps and placeholder text read on the panel |
| `/admin/teams`, a team card | desktop | `CookingTeamCard`, `TeamCalendarDisplay`, `COMPONENTS.segmentedActive` | Team colours darken a notch; the segmented control's `orange-200` ring becomes a visible edge `#ac8467` |
| `/household/<own>/bookings?view=week` | 375px + desktop | `BookingGridView`, `DinnerTicket`, deadline dots | Ticket badges darken (`Voksen` brown, `Barn` deep green); the calendar's deadline dots go from bright to deep orange |
| `/dinner?date=<a dinner>` | 375px + desktop | `KitchenPreparation`, `DinnerTicket`, `DinnerDetailHeader` | Kitchen panel row deepens; **TAKEAWAY and SPIS SENT are the same orange in both palettes** — they share `orange-500`. The header's mocha band darkens with the rest |
| `/chef?team=<id>`, calendar open | 375px + desktop | `ChefCalendarDisplay`, `CALENDAR.countdown`, `BUTTONS.primaryAction` | Ocean day circles darken; `Rediger menu` goes deep orange; **the countdown accent on the near-black container is one of the two light-mode misses — check it reads** |
| `/chef?team=<id>&view=agenda:open` | desktop | Agenda list, `KitchenPreparation` | The dinner cards keep their state chips; the kitchen row deepens |
| Any page, dark mode | desktop | `TEXT.muted`, `BORDER.gray.*`, slot inks | Greys lighten instead (`gray-400`→`#b5bdcc`, `gray-700`→`#838fa4`); every `text-<slot>` lightens |
| `/dinner` + `/chef`, dark mode | desktop | `COMPONENTS.kitchenPanel.*`, `*_CALENDAR.day.next` | **The known misses:** white on `orange-500`/`ocean-400`/`peach-400` stays low-contrast — those tokens have no dark face |

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
│ │   Farver   (•) Standard ( ) Tydelig ( ) Høj kontrast ( ) Farveblind-venlig │  URadioGroup → html[data-palette]
│ │            🇪🇺 EN 301 549 · WCAG 2.1 AA ✓                 │   │  small flag + green check (UBadge COLOR.success + ICONS.checkCircle);
│ │                                                       │   │  level text per preset comes from the contrast test’s verified level
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
  - Picker selection follows what is picked (`CALENDAR.picker`, drawn in the pickers' `#day` slot through the shared `dayCircleClasses` helper): a holiday is the green `CALENDAR.holiday` ring the preview draws, a season date the filled pink `PLANNING_CALENDAR.day.generated` of a cooking day with a dinner. Every calendar day circle in the app now goes through that one helper.
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
| `CalendarDateRangePicker.nuxt.spec.ts` | `selection=cookingDay\|holiday` renders every picked day as the `dayCircleClasses(CALENDAR.picker[selection])` circle, and `[data-selected]` cells exist |
| `CalendarDisplay.nuxt.spec.ts`, `designSystemUsage.unit.spec.ts` | the day circle comes from `dayCircleClasses`; every `<UCalendar>` binds the grid directly or through `calendarPickerProps` |

### Affected Areas

`AdminPlanning.vue`, `admin/planning/AdminPlanningSeason.vue`, `calendar/CalendarDateRangeListPicker.vue`, `calendar/CalendarDateRangePicker.vue`,
`calendar/CalendarDatePicker.vue`, `form/FormModeSelector.vue`, `useTheSlopeDesignSystem.ts` (`CALENDAR.picker`, `calendarPickerProps`, `dayCircleClasses`), the four calendar displays,
`server/routes/api/admin/season/[id].post.ts`, `server/utils/reconcileDinnerEvents.ts`, `useSeasonValidation.ts` (`SeasonUpdateResponse`),
`app/stores/plan.ts` (`updateSeason` returns the envelope), `app/utils/utils.ts` (`capitalize`), delete `admin/AdminSeason.vue`, compliance docs.

**Verified (2026-09-16):** red first — 4 failing cases in `AdminPlanningSeason.nuxt.spec.ts` (no edit control, footer labelled "Arbejder..."), 6 of 7
in `AdminPlanning.nuxt.spec.ts` (no `create-season`, no `edit-season`), 3 in `CalendarDateRangeListPicker.nuxt.spec.ts` (no row picker),
`SeasonFactory.updateSeasonWithResult is not a function` in both season API specs, `isActive: true` accepted, and 2 UI e2e failures on the
missing `create-season` / `edit-season`. Green: 2255 vitest tests across `tests/component`; `npm run pre:all` clean; e2e
`season.e2e.spec.ts` 23 passed, `seasonLiveEdit.e2e.spec.ts` (serial) 1 passed, `AdminPlanning` + `AdminPlanningSeason` + `admin` +
`AdminTeams` + `SeasonSelector` at `--workers=4` 52 passed, `AdminPlanningLiveSeason.e2e.spec.ts` (serial UI) 1 passed. Picker selection
verified in the browser: `test-results/picker-season-cookingday.png` (filled pink range) and `test-results/picker-holiday-selection.png`
(green ring circles).

### Visual check — Planning form (walk before the package is approved; copied into the PR description)

| Route + state | Viewport | DS element to expect | Expect |
|---|---|---|---|
| `/admin/planning` as ADMIN, a season selected | 375px + desktop | `LAYOUTS.cardActionRow` + `BUTTONS.primaryAction` + `COLOR.primary` + `ICONS.plusCircle` | "⊕ Opret sæson" solid beside the season selector, full width on the phone and inline on desktop; the old [👁][✏️][＋] trio is gone |
| same | 375px + desktop | `BUTTONS.secondaryAction` + `COLOR.primary` + `ICONS.edit` | the card header reads "Fællesspisning sæson 08/26-07/27" with "✏ Rediger 08/26-07/27" beside it; the form has no read-only "Sæson" field any more |
| `/admin/planning?mode=edit` | 375px + desktop | `LAYOUTS.formButtonRow` + `BUTTONS.cancel` + `BUTTONS.save` | title "Rediger fællesspisning sæson 08/26-07/27"; "✕ Annuller" and "✓ Gem" right-aligned on desktop and stacked with Gem on top on the phone; the error list sits above them |
| `/admin/planning?mode=create` | 375px + desktop | same footer | title "Opret fællesspisning sæson", and the computed name appears as soon as start and slut are valid |
| `/admin/planning?mode=edit`, season with holidays | 375px + desktop | row `CalendarDateRangePicker` + `BUTTONS.edit` + `ICONS.trash` | each holiday row is ☀ + [Start dato][Slut dato] + 🗑; a date change lands on that row alone; an overlapping change shows "Ferieperioder må ikke overlappe hinanden" by the add row and the row keeps its old dates |
| same, a holiday row picker open | 375px + desktop | `dayCircleClasses(CALENDAR.picker.holiday)` | every picked day is an empty circle with a green ring, start and end included; adjacent-month days stay hidden (`test-results/picker-holiday-selection.png`) |
| `/admin/planning?mode=edit`, season date picker open | 375px + desktop | `dayCircleClasses(CALENDAR.picker.cookingDay)` | the picked range is a row of filled pink circles, like the cooking days the preview draws (`test-results/picker-season-cookingday.png`) |
| `/household/<own>/settings`, pencil → move-out date | 375px + desktop | `dayCircleClasses(CALENDAR.picker.cookingDay)` | the picked date is one filled pink circle; picking a date still works |
| `/admin/planning?mode=view` | 375px + desktop | read-only rows | holiday rows are disabled inputs "13/10/2026-17/10/2026" with the ☀ leading icon, no 🗑 and no footer buttons |
| `/admin/planning?mode=edit` on the ACTIVE season: add a holiday over a booked date, then Gem | desktop | toast `ICONS.checkCircle` + `COLOR.success` | "Sæson opdateret — 0 datoer tilføjet, 1 fjernet. Forudbestillinger er opdateret."; adding dates appends "Husk at tildele madhold til nye datoer." |
| `/dinner`, `/chef`, `/admin/teams` calendars | desktop | `dayCircleClasses(<palette>)` | day circles and legend circles are unchanged after the sweep onto the shared helper |
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
| `AllergyNotes` + `QrCode` on the poster | `AllergyPoster.e2e.spec.ts` | `admin-allergies-pdf.nuxt.spec.ts`, `QrCode.nuxt.spec.ts`, `qr.unit.spec.ts` |
| Teams edit mode with no teams | `AdminTeams.e2e.spec.ts` | — (`AdminTeams` has no component spec) |
| Booking grid period with no dinners | covered by the component spec | `BookingGridView.nuxt.spec.ts` |
| Allergy detail edit affordance | `AdminAllergies.e2e.spec.ts` | `AllergyDetailPanel.nuxt.spec.ts`, `AdminAllergies.nuxt.spec.ts` |
| `UserPreferencesCard` | `UserPreferences.e2e.spec.ts` (new) | `UserPreferencesCard.nuxt.spec.ts`, `preferences.nuxt.spec.ts` (new) |
| Planning form controls, member gating | `AdminPlanning.e2e`, `AdminPlanningSeason.e2e`, `admin.e2e`, `AdminPlanningLiveSeason.e2e` (serial) | `AdminPlanning.nuxt.spec.ts`, `AdminPlanningSeason.nuxt.spec.ts` |
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
| 6 | Planning form | ✅ shipped (2026-09-16) |
| 7 | QR code | ✅ shipped (2026-09-16) — with the teams empty state, the booking grid empty period and the allergy edit affordance |
| 8 | Colour drift sweep | ✅ shipped (2026-09-16) — DS tokens for every colour, two architecture rules |
| 9 | Poster notes editing + My preferences (one migration) | mockups ✅; color decision taken; brief approved; migration created and applied by the user |
| 10 | Ship: the settings ADR, compliance docs, `docs/ui.md`, `docs/testing.md`, `pre:all`, full suites, `/dry` | — |

Per package: red output shown → green output shown → `npm run pre:all` → architect diff review against the package, the coverage matrix
and the design-system rule → compliance rows in the same change. Agents (`tdd-pair-programmer`, `nuxt-typescript-developer`,
`test-automation-engineer`) never commit; the user commits per package.

**Commands the user runs**

```
npm i uqr                                                  # QR code
make d1-prisma                                             # after the schema edit (commit generated zod)
make d1-create-migration name=settings_preferences     # → migrations/0015_settings_preferences.sql
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

- **ADR-0xx (next free number when it ships) [Editable settings and user preferences as key-value stores with code registries]** — proposed by "Poster notes" / "My preferences":
  two tables, one pattern; keys, value schemas, defaults and writers declared in code registries; GET returns defaults, never 404; per-key
  write check in the endpoint, never in the route table; the domain store owns the fetch; a new preference is a registry entry, not a migration.
- **ADR-018 [Design system owns shared UI patterns — components bind tokens, never raw Nuxt UI props]** — recorded in `docs/adr.md` 2026-09-16:
  `BUTTONS`, `ALERTS`, `COMPONENTS.calendarGrid` live in `useTheSlopeDesignSystem`; architecture tests enforce; a new Nuxt UI component
  family gets a token before its first use.
