# Feature Proposal: Move-Out Date Enforcement & Household Coexistence

**Status:** Phases 1–2 done, Phase 5a–5b done, Phase 5c (UX polish) in progress, Phases 3–4 pending
**Date:** 2026-02-22
**Updated:** 2026-03-04

## Business Rule

**No orders for dinner events BEFORE `movedInDate`. No orders for dinner events AFTER `moveOutDate`.** When either date changes, re-scaffold so this rule always holds.

This is a **per-dinner-event** constraint. A household with `moveOutDate` next month still gets orders for this week's dinners. A household with `movedInDate` next week gets orders for dinner events after that date (the 60-day rolling window covers them).

## Problem Statement

### Current Behavior

```
Family A has moveOutDate = 2026-03-01
  → Scaffolder creates orders for ALL dinner events    (BUG: orders after 03-01 shouldn't exist)
  → movedInDate is also ignored                        (BUG: orders before move-in shouldn't exist)

Family B moves in at same address (same heynaboId)
  → Heynabo import FAILS: unique constraint            (BUG: blocks import)
  → Workaround: admin manually deletes Family A        (RISK: loses audit trail)
```

### Desired Behavior

```
Family A has moveOutDate = 2026-03-01
  → Dinner events up to 03-01: orders created/kept      ✅
  → Dinner events after 03-01: no orders / orphan-deleted ✅
  → Historical data preserved                             ✅

Family B has movedInDate = 2026-03-15
  → Dinner events before 03-15: no orders                 ✅
  → Dinner events from 03-15 onwards: orders created      ✅
```

## Architecture Decisions

### Decision 1: `isHouseholdActiveOnDay` — Curried Predicate on Dinner Events

A curried predicate: takes household dates, returns a filter function for dinner events. Checks whether a dinner event's date falls within the household's residency period (`movedInDate` to `moveOutDate`).

**DRY — one line of decision for both user booking and system scaffolding.** Per ADR-016, both paths build a `dinnerEventById` map that determines which events the generator can see. The predicate is applied once per household to filter dinner events before either generator runs. Both generators inherit the filtered set — no branching by mode.

**Location:** `useHousehold()` composable (business logic, same pattern as `useSeason()`/`useCookingTeam()`).

**Boundary rules:**
- Event on `movedInDate` → included (moved in that day, can eat)
- Event on `moveOutDate` → included (still there that day)
- `moveOutDate` null → no upper bound

| movedInDate | moveOutDate | Dinner Event | Eligible? | Reason |
|-------------|-------------|--------------|-----------|--------|
| 2020-01-01 | null | any future | YES | No move-out set |
| 2020-01-01 | 2026-04-01 | 2026-03-15 | YES | Before move-out |
| 2020-01-01 | 2026-04-01 | 2026-05-01 | NO | After move-out |
| 2026-04-01 | null | 2026-03-15 | NO | Before move-in |
| 2026-04-01 | null | 2026-05-01 | YES | After move-in |
| 2026-04-01 | null | 2026-04-01 | YES | On move-in day |
| 2020-01-01 | 2026-04-01 | 2026-04-01 | YES | On move-out day |

### Decision 2: No Top-Level Household Filter

The scaffolder must NOT skip entire households based on whether they're "active today." A household that moved out yesterday still needs its future orders cleaned up via orphan detection. A household moving in next week needs orders created for events after their move-in.

The per-dinner-event filter handles all cases correctly:
- Moved-out household → zero eligible dinner events → all existing orders become orphans → deleted
- Not-yet-moved-in household → only future events after move-in → orders created for those only

### Decision 3: Re-scaffold on Date Change

When `moveOutDate` or `movedInDate` changes on a household, trigger a re-scaffold for that household. The per-event filter ensures the business rule holds: orders outside the new residency period are orphan-detected and deleted; orders within are created/kept.

Uses the existing `rescaffoldOnFieldChange` shared helper (DRY with inhabitant preference/birthDate updates).

### Decision 4: Heynabo Import Routing (Future Phase)

Existing inhabitants update/delete on their current household. NEW inhabitants are routed to the household WITHOUT `moveOutDate`. If none exists, skip + log warning.

### Decision 5: Household URL Disambiguation with `?pbs=X` (Future Phase)

Keep route `/household/[shortname]/[tab]`, add `?pbs=X` for disambiguation when multiple households share an address.

### Decision 6: Phase Ordering is Critical

URL disambiguation (Phase 2) MUST ship BEFORE the schema migration (Phase 3) that drops `@unique` on `heynaboId`. Otherwise, pages break when two households share the same shortname.

## Implementation Phases

### Phase 1: Residency Period Enforcement ✅ DONE

**Branch:** `move-out-date-does-not-scaffold`

| File | Change |
|------|--------|
| `app/composables/useHousehold.ts` | `isHouseholdActiveOnDay` standalone curried predicate |
| `server/utils/scaffoldPrebookings.ts` | Per-household event filter; `rescaffoldOnFieldChange` + `noScaffoldResult` shared helpers |
| `server/routes/api/admin/household/[id].post.ts` | Re-scaffold on moveOutDate/movedInDate change |
| `server/routes/api/admin/household/inhabitants/[id].post.ts` | Refactored to shared `rescaffoldOnFieldChange` |
| `server/routes/api/household/inhabitants/[id]/preferences.post.ts` | `?adminBypass=true` for admin preference updates |
| `app/composables/useCoreValidation.ts` | `moveOutDate` in household schemas |
| `app/stores/households.ts` | `updateInhabitantPreferences` / `updateAllInhabitantPreferences` actions |

**Tests:** 7 unit tests (boundary cases), 8+ E2E tests (scaffold/re-scaffold/daily maintenance/deadline interaction). All green.

### Phase 2: Household URL `?pbs=X` (BEFORE Schema Migration)

**Goal:** All household links include `?pbs=X` for disambiguation. Store resolves by `pbsId` from query. Old URLs without `?pbs` still work via fallback.

**Key findings:**
- `shortName` is NOT a database field — computed from `address` via `getHouseholdShortName()`
- `pbsId` is `@unique` on Household, available on `HouseholdDisplay`, `HouseholdDetail`, and user's nested household schema
- `useTabNavigation` already preserves `route.query` on tab switches — `?pbs` survives automatically

**Disambiguation logic for missing `?pbs`:**

| Scenario | Behavior |
|----------|----------|
| 1 household with shortname | Use it |
| Multiple + user is member of one | Use theirs |
| Multiple + not member of any | Redirect `/admin/households` |

**`getHouseholdUrl(shortName, pbsId, tab?)` utility** — new `app/utils/household.ts`, auto-imported. Single source of truth for household URL construction.

**Store: stored init args** — `initHouseholdsStore` is called sync during setup when `households.value` may be empty. Existing watcher re-invokes without args. Fix: store `shortName`/`pbsId` in refs so watcher re-invokes with original context.

**Changes:**

| File | Change |
|------|--------|
| `app/utils/household.ts` (new) | `getHouseholdUrl(shortName, pbsId, tab?)` pure utility |
| `app/stores/households.ts` | `initHouseholdsStore(shortName?, pbsId?)` with pbsId resolution + disambiguation + stored init args for watcher |
| `app/pages/household/[shortname]/[tab].vue` | Read `?pbs` from query, pass to store init |
| `app/pages/household/[shortname]/index.vue` | Preserve `?pbs` on redirect to `/bookings` |
| `app/components/PageHeader.vue` | `getHouseholdUrl(myHousehold.shortName, myHousehold.pbsId, 'bookings')` |
| `app/components/admin/AdminHouseholds.vue` | `getHouseholdUrl(row.original.shortName, row.original.pbsId)` |
| `app/components/user/UserProfileCard.vue` | Add `householdPbsId` computed + `getHouseholdUrl` |
| `app/components/login/Login.vue` | Add `householdPbsId` computed + `getHouseholdUrl` |

**E2E tests (7 files, 10 `page.goto` calls):** `household.e2e`, `HouseholdMembers.e2e`, `HouseholdCard.e2e`, `HouseholdAllergies.e2e`, `DinnerBookingForm.e2e`, `HouseholdScaffolding.e2e`, `HouseholdBookingsCrossHousehold.e2e`

### Phase 3: Schema Migration (Drop `@unique`, Add `@@index`)

**Goal:** Allow multiple households with the same `heynaboId` (old + new family at same address).

**Safe because:** Phase 2 already handles URL disambiguation.

**Changes:**

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Drop `@unique` on `Household.heynaboId` and `Inhabitant.heynaboId`, add `@@index` |
| `server/data/prismaRepository.ts` | `saveHousehold`: find-first-active then create/update |

### Phase 4: Admin Household UI + Import Routing

**Goal:** Admin can set/clear `moveOutDate`, create new households, edit preferences, move inhabitants. Heynabo import routes new inhabitants to active households.

**Changes:**

| File | Change |
|------|--------|
| `app/components/admin/AdminHouseholds.vue` | moveOutDate column, create/edit household forms |
| `app/stores/households.ts` | New admin actions: setMoveOutDate, createHousehold, moveInhabitant |
| `server/utils/heynaboImportService.ts` | Route new inhabitants to household without moveOutDate |
| `app/composables/useCoreValidation.ts` | `householdId` in `InhabitantUpdateSchema` |

### Phase 5a: Household Member `moveOutDate` Setting ✅ DONE

**Goal:** Household members can set their own `moveOutDate` via household settings tab.

**UX decisions:**
- Pencil-gate pattern: rare/high-consequence operation, hidden behind edit pencil
- `CalendarDatePicker` (new single-date component) — move-in and move-out are independent, not a range
- Guiding text always visible: "Skal familien flytte? Du kan angive flyttedato her, og alle bookinger stopper efter denne dato."
- Sun icon + "Familien har ingen flytteplaner" when no move-out date
- DangerButton double-confirm for set ("Klik igen for at bekræfte flytning") and clear ("Klik igen for at fortryde")
- Master data section matches UserProfileCard layout: opacity-60 icons, TYPOGRAPHY.bodyTextMuted values

**Changes:**

| File | Change |
|------|--------|
| `app/components/calendar/CalendarDatePicker.vue` (new) | Single nullable date picker (UPopover + UCalendar + UInput) |
| `app/components/calendar/CalendarDateRangePicker.vue` | Cleanup: useTheSlopeDesignSystem(), added disabled prop, removed debug |
| `app/components/household/HouseholdSettings.vue` | Full rewrite: 3 sections (master data, fraflytning, calendar), pencil-gate, DangerButton |
| `app/composables/useTheSlopeDesignSystem.ts` | Added ICONS: moveIn, moveOut, identification; fixed ribbon clipping |
| `app/stores/households.ts` | `setMoveOutDate(householdId, date|null)` action |
| `app/types/dateTypes.ts` | Removed unused `NullableDateRange` |
| `server/utils/eventHandlerHelper.ts` | Fixed Nuxt 4.3 TS: H3Error → NuxtError (createError return type change) |
| `tests/component/components/calendar/CalendarDatePicker.nuxt.spec.ts` (new) | 7 parametrized tests |
| `tests/component/components/calendar/CalendarDateRangePicker.nuxt.spec.ts` | Reverted to main, DRY helpers |

### Phase 5b: Move-Out Scaffold Result Feedback ✅ DONE

**Goal:** Show users what happened to their bookings after setting/clearing move-out date. Same UX as preference changes: info box → toast → persistent alert. Moved endpoint from admin-only to self-service with admin bypass (`/api/household/[id]/update`).

**Changes:**

| File | Change |
|------|--------|
| `app/composables/useBookingValidation.ts` | `HouseholdUpdateResponseSchema` (household + scaffoldResult) |
| `server/routes/api/household/[id]/update.post.ts` (moved) | Self-service with `requireHouseholdAccess` + `?adminBypass=true` |
| `app/stores/households.ts` | `lastMoveOutResult` ref, `setMoveOutDate` with `adminBypass` param |
| `app/components/household/HouseholdSettings.vue` | Warning info box, success toast, persistent result alert |
| `tests/e2e/api/parallel/admin/household.e2e.spec.ts` | Parametrized: member (200), admin bypass (200), cross-household (403) |

### Phase 5c: Move-Out UX Polish ← IN PROGRESS

**Goal:** Restyle Fraflytning section with UCard header/content/footer pattern, add cancel action, use prominent button styling.

**Current issues:**
- No cancel action when editing (user must reload to escape)
- Button styling not prominent
- Flat layout — no visual grouping like other edit flows

#### UX Mockups — 4 States

**State 1: No move-out date, viewing (default)**
```
┌─ Fraflytning ──────────────────────────────────┐
│                                                 │
│  ☀  Familien har ingen flytteplaner      [pen]  │
│                                                 │
└─────────────────────────────────────────────────┘
```

**State 2: No move-out date, editing (after pencil click)**
```
┌─ Fraflytning ──────────────────────────────────┐
│                                                 │
│  Familien har planer om at flytte               │
│                                                 │
│  !! Advarsel                                    │
│  Naar du angiver en fraflytningsdato, slettes   │
│  alle bookinger efter den valgte dato.          │
│                                                 │
│  Fraflytningsdato: [  dd/MM/yyyy  cal ]         │
│                                                 │
├─────────────────────────────────────────────────┤
│  [x Annuller]     [!! Angiv fraflytningsdato]   │
│                      (click again to confirm)   │
└─────────────────────────────────────────────────┘
```

**State 3: Has move-out date, viewing**
```
┌─ Fraflytning ──────────────────────────────────┐
│                                                 │
│  >>  Fraflytter 15/03/2026               [pen]  │
│                                                 │
│  [<< Fortryd flytning]                          │
│     (click again to confirm)                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**State 4: Has move-out date, editing (after pencil click)**
```
┌─ Fraflytning ──────────────────────────────────┐
│                                                 │
│  (i) Aendring af fraflytningsdato              │
│  Bookinger efter den nye dato slettes, og       │
│  bookinger foer den nye dato kan genoprettes.   │
│                                                 │
│  Fraflytningsdato: [  15/03/2026  cal ]         │
│                                                 │
├─────────────────────────────────────────────────┤
│  [x Annuller]                       [v Gem]     │
└─────────────────────────────────────────────────┘
```

**Persistent result alert (below card, after any operation):**
```
(robot) Sidste aendring
        Fraflytningsdato aendret: 3 blev frameldt, 12 uaendret
```

#### Implementation

| Pattern | Source |
|---------|--------|
| UCard with `#header` / `#footer` | HouseholdCard, AdminPlanningSeason |
| `v-bind="BUTTONS.cancel"` | Design system (neutral/ghost, xMark, large) |
| `v-bind="BUTTONS.save"` | Design system (primary/solid, check, large) |
| `v-bind="BUTTONS.edit"` | Design system (neutral/ghost, pencil, square) |
| `DangerButton` 2-step confirm | Existing in component |

**Changes:**

| File | Change |
|------|--------|
| `app/components/household/HouseholdSettings.vue` | Wrap Fraflytning in UCard, `#footer` with cancel + DangerButton/save |

## ADR Impact Analysis

| ADR | Impact |
|-----|--------|
| **ADR-005** (Cascade/SET NULL) | Future phases: inhabitant can move between households |
| **ADR-006** (URL Navigation) | Phase 2: `?pbs=X` follows query param pattern |
| **ADR-009** (Index Data Inclusion) | `moveOutDate` added to `HouseholdDisplay` (scalar, bounded, essential) |
| **ADR-012** (Prisma.skip) | `moveOutDate` updates already compliant |
| **ADR-013** (External System) | Phase 4: Heynabo import routing changes |
| **ADR-015** (Idempotent Jobs) | Per-event filter is idempotent: same input → same output |
| **ADR-016** (Unified Booking) | Predicate filters dinner events BEFORE generators — both modes inherit filtered set |

**No new ADR needed.** The predicate follows existing composable patterns. However, **ADR-005 should be updated** in Phase 4 to document inhabitant reassignment.

## Verification Plan

| # | Verification | Phase | Status |
|---|-------------|-------|--------|
| 1 | Unit + E2E tests for residency enforcement | 1 | ✅ |
| 2 | `/household/S_31/bookings?pbs=100` resolves correctly | 2 | ✅ |
| 3 | Two households with same `heynaboId` coexist | 3 | |
| 4 | Heynabo import routes new members to active household | 4 | |
| 5a | Household member can set/clear moveOutDate in settings | 5a | ✅ |
| 5b | Toast + alert shows scaffold result after set/clear | 5b | ✅ |
| 5b | Info box warns about consequences before confirming | 5b | ✅ |
| 5b | Self-service endpoint with admin bypass, parametrized E2E | 5b | ✅ |
| 5c | UCard with cancel action + prominent button styling | 5c | |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Phase ordering mistake (schema before URL) | Medium | High | Strict phase gates |
| Heynabo import fails with non-unique heynaboId | Medium | High | Phase 3 + 4 deploy together |
| Existing moved-out households with stale orders | Low | Medium | Re-scaffold cleans up via orphan detection |
| Admin moves inhabitant with active orders | Low | Medium | Validate: no active orders before allowing move |

## References

- Prisma schema: `prisma/schema.prisma` (Household model)
- Scaffolder: `server/utils/scaffoldPrebookings.ts`
- Generator: `app/composables/useBooking.ts` (ADR-016 decision flow)
- Preference clipper: `server/utils/initializePreferences.ts`
- Heynabo import: `server/utils/heynaboImportService.ts`
- UX companion: `docs/feature-proposal-household-admin-override.md`
