# Bug Fix: Allergy Catalog — Ages, Categories & Display Logic

**Status:** Implemented | **Date:** 2026-09-01
**Branch:** `fix/allergy-ages-categories-and-display-logic`

## Fix Inventory

| id | Fix | Status |
|----|-----|--------|
| D1 | Master/detail display logic — mobile detail off-screen | ✅ IMPLEMENTED (2026-09-01) |
| D2 | Compare mode — mobile summary bar | ✅ IMPLEMENTED (2026-09-01) |
| A1 | Wrong age categories in allergy surfaces (children as adults) | **Implemented** (2026-09-01) |

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

## ADR Notes

- **ADR-001 [Core Framework and Technology Stack]** — new components import types from
  `useAllergyValidation` only; no imports from the generated layer.
- **ADR-007 [SSR-Friendly Store Pattern with useAsyncData]** — no new server data; the
  panel is prop-driven; store access + the `householdShortNames` map stay in
  `AdminAllergies` (container).
- **ADR-006 [URL-Based Navigation and Client-Side State]** — catalog selection stays
  client-side (unchanged).

**Out of scope (noted):** mobile Playwright viewport projects (commented out in
`playwright.config.ts`); `HouseholdAllergies.vue`.
