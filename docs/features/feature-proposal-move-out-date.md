# Feature Proposal: Move-Out Date Enforcement & Household Coexistence

**Status:** Phases 1–2 done, Phase 5a–5b done, Phase 5c (UX polish) in progress, Phases 3–4 pending
**Date:** 2026-02-22
**Updated:** 2026-04-15

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

### Decision 4: Heynabo Import Routing

Existing inhabitants update/delete on their current household. NEW inhabitants coming in with a given `heynaboId` are routed to the household (among those sharing that `heynaboId`) selected by:

1. The household with no `moveOutDate` set.
2. Fallback (all households at that `heynaboId` have a `moveOutDate`): the household with the **newest** `moveOutDate`.

An inhabitant always needs a household, so there is no skip case — the fallback guarantees a target.

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

### Phase 3: Schema Migration + Repository Refactor

**Goal:** Allow multiple households with the same `heynaboId` (old + new family at same address).

**Safe because:** Phase 2 already handles URL disambiguation.

**Schema change:** Drop `@unique` on `Household.heynaboId` only; add `@@index`. `Inhabitant.heynaboId` stays `@unique` (inhabitants are distinct Heynabo users; households can share a Heynabo address).

**Repository refactor:** Only one repo function breaks — `saveHousehold` (line 605) uses `prisma.household.upsert({ where: { heynaboId } })`. After dropping `@unique`, Prisma rejects upsert on a non-unique key. All other household repo functions are safe:

| Function | Current WHERE | Status |
|----------|---------------|--------|
| `saveHousehold` (line 605) | `{ heynaboId }` | **BREAKS** — refactor to branch on `data.id` |
| `deleteHouseholdsByHeynaboId` (line 697) | `deleteMany({ heynaboId: { in: [...] } })` | SAFE — batch delete on non-unique works; semantics correct (address leaves community → delete all households there) |
| `deleteHousehold` (line 813) | `{ id }` | SAFE — uses our unique id |
| `updateHousehold` | `{ id }` | SAFE |
| `createHouseholds` | No WHERE (batch create) | SAFE |
| `saveInhabitant` (line 292) | `{ heynaboId }` on Inhabitant | SAFE — `Inhabitant.heynaboId` stays `@unique` |
| `linkUsersToInhabitants` (line 228) | `{ heynaboId }` on Inhabitant | SAFE — same reason |

**`saveHousehold` refactor:** Accept optional `data.id`. Caller decides create vs update. No more `heynaboId` in WHERE.

```typescript
const saved = data.id
    ? await prisma.household.update({ where: { id: data.id }, data: toDbData(data) })
    : await prisma.household.create({ data: toDbData(data) })
```

**Routing function:** `resolveHouseholdForHeynaboId(heynaboId, candidates)` added to `app/composables/useHousehold.ts` (alongside existing `isHouseholdActiveOnDay`, `getResidencyStatus`). Pure function, no side effects. Server code imports it the same way `scaffoldPrebookings.ts` already imports `isHouseholdActiveOnDay`. Decision 4 rules:

1. 0 candidates → create new
2. 1 candidate → that one
3. N candidates, exactly 1 without `moveOutDate` → that one
4. N candidates, all with `moveOutDate` → newest `moveOutDate`
5. N candidates, 2+ without `moveOutDate` → lowest `id` (deterministic, always resolves)

**Callers of `saveHousehold`** (2 external):

| Caller | File | Post-refactor |
|--------|------|---------------|
| Admin create endpoint | `server/routes/api/admin/household/index.put.ts:25` | Passes data without `id` → create path. No change needed. |
| Heynabo import (update branch) | `server/utils/heynaboImportService.ts:103` | Calls `resolveHouseholdForHeynaboId` to get target `id`; passes `{ id, ...mergedData }` to `saveHousehold`. |

**Import service update** (lines 95–104): The existing `existingByHeynaboId` map (line 79) becomes `existingByHeynaboId: Map<number, HouseholdDisplay[]>` (grouped, not 1:1). Before calling `saveHousehold`, the update loop resolves each incoming household's target via `resolveHouseholdForHeynaboId`. Delete branch (lines 83–89) stays unchanged.

**ADR compliance updates:**

| ADR | Addition |
|-----|----------|
| **ADR-010** | Repository WHERE clauses MUST use unique fields (`id` or `@unique` constraints). Non-unique lookups MUST be resolved by caller. |
| **ADR-013** | External ID → internal ID resolution is integration concern (import service / routing function), not persistence. |

**Changes:**

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Drop `@unique` on `Household.heynaboId`, add `@@index` |
| `server/data/prismaRepository.ts` | `saveHousehold`: branch on `data.id` — `update({where:{id}})` or `create`. Remove `heynaboId` from WHERE. |
| `app/composables/useHousehold.ts` | Add `resolveHouseholdForHeynaboId(heynaboId, candidates)` pure function |
| `server/utils/heynaboImportService.ts` | Group `existingByHeynaboId` as `Map<number, HouseholdDisplay[]>`; resolve target via routing before `saveHousehold`; delete branch unchanged |
| `docs/adr.md` | ADR-010 + ADR-013 compliance additions |

**Verification:**

| # | Check | Test file |
|---|-------|-----------|
| pre | **All** unit and E2E suites green before and after — `npx vitest run` + `npx playwright test` (full suite). No regressions. | — |
| 1 | Unit — `resolveHouseholdForHeynaboId` parametrized over all 5 branches: 0 candidates → create; 1 candidate → that one; N with 1 active → active; N all with moveOutDate → newest; N with 2+ active → lowest id | `tests/component/composables/useHousehold.nuxt.spec.ts` |
| 2 | E2E API — admin creates a household via PUT, verify it persists correctly (regression: create path still works after upsert removal) | `tests/e2e/api/parallel/admin/household.e2e.spec.ts` |
| 3 | E2E API — admin updates an existing household via POST by id, verify update applies correctly (regression: update path works via id instead of heynaboId) | `tests/e2e/api/parallel/admin/household.e2e.spec.ts` |
| 4 | E2E API — create two households with same heynaboId (one with moveOutDate, one without); both persist; both retrievable by their own id | `tests/e2e/api/parallel/admin/household.e2e.spec.ts` |
| 5 | E2E API — Heynabo import with existing single-household community still succeeds (regression: no duplicate heynaboIds yet, existing flow intact) | `tests/e2e/api/serial/admin/heynabo.e2e.spec.ts` |
| 6 | E2E API — Heynabo import with two households sharing heynaboId (one active, one leaving): update routes to the active household, leaving household untouched | `tests/e2e/api/serial/admin/heynabo.e2e.spec.ts` |
| 7 | E2E API — Heynabo import deletes an address from community: `deleteHouseholdsByHeynaboId` removes all households at that heynaboId (both active and leaving) | `tests/e2e/api/serial/admin/heynabo.e2e.spec.ts` |
| 8 | Factory — add helpers for creating households with explicit heynaboId + moveOutDate combinations | `tests/e2e/testDataFactories/householdFactory.ts` |
| 9 | Deploy to dev, verify E2E on dev environment | — |
| 10 | Migrate prod: `make d1-migrate-prod` once verified on dev | — |

### Phase 4: Add New Household + Heynabo Import Routing

**Goal:** Admin can create a new household at an address that already has one (so families can overlap during a move). Heynabo import routes incoming inhabitants to the correct household per Decision 4.

**UX:** `[+ Ny husstand]` header button opens a virtual expanded row at the top of the `AdminHouseholds` table (mirrors `AdminUsers.vue` `v-model:expanded` + `#expanded` pattern). Admin inputs **PBS-nummer**, **Adresse**, **Indflytningsdato**. `shortName` derived from address and shown inline. `heynaboId` copied from sibling at the same address.

```
┌─ Husstande på Skråningen ────────────────────────────── [+ Ny husstand] ─┐
│ [🔍 Søg…]                                        [⇅ Adresse]              │
│                                                                           │
│ ▾ │ (ny)        │ ___                │ ___           │ ─          │       │
│ ╔═══════════════════════════════════════════════════════════════════╗    │
│ ║  PBS-nummer *       [ ______ ]                                     ║    │
│ ║                       ⚠ PBS 101 bruges af Skr_17   (if duplicate)  ║    │
│ ║                                                                     ║    │
│ ║  Adresse *          [ Skråningen 14                          ]    ║    │
│ ║                       → Forkortelse: Skr_14                        ║    │
│ ║                       ⓘ 1 eksisterende husstand på adressen:      ║    │
│ ║                          Skr_14 · PBS 115 · ➡ Fraflytter 01/06     ║    │
│ ║                          heynaboId kopieres fra den (42)           ║    │
│ ║                                                                     ║    │
│ ║  Indflytningsdato * [ 15/05/2026                       📅 ]       ║    │
│ ║                                                                     ║    │
│ ║              [✕ Annuller]          [✓ Opret husstand]              ║    │
│ ╚═══════════════════════════════════════════════════════════════════╝    │
│ ▸ │ Skr_14      │ 115 ➡ Fraflytter   │ Skråningen 14 │ Emil, Frida│       │
│ ▸ │ Skr_14      │ 116 ☀ Indflytter   │ Skråningen 14 │ (ingen)    │       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Changes:**

| File | Change |
|------|--------|
| `app/components/admin/AdminHouseholds.vue` | `[+ Ny husstand]` button; `v-model:expanded`; virtual create row at top of table |
| `app/stores/households.ts` | `createHousehold()` action |
| `app/composables/useCoreValidation.ts` | Household create schema (PBS, address, movedInDate) |
| `server/routes/api/admin/household/index.put.ts` | Accept create at existing address; copy `heynaboId` from sibling |
| `server/utils/heynaboImportService.ts` | Route new inhabitants per Decision 4 (no-`moveOutDate` first, newest `moveOutDate` as fallback) |

**Verification:**

| # | Check | Test file |
|---|-------|-----------|
| pre | **All** unit and E2E suites green before and after this phase — `npx vitest run` + `npx playwright test` (full suite, not just touched files). No regressions tolerated. | — |
| 1 | E2E API — create a second household at an existing address; both persist; `heynaboId` copied from sibling; PBS conflict returns 400 | `tests/e2e/api/parallel/admin/household.e2e.spec.ts` |
| 2 | E2E API — Heynabo import with a new inhabitant at a `heynaboId` with one active + one leaving household routes to the active one | `tests/e2e/api/serial/admin/heynabo.e2e.spec.ts` |
| 3 | E2E API — Heynabo import with a new inhabitant at a `heynaboId` where all households have `moveOutDate` routes to the one with the newest `moveOutDate` | `tests/e2e/api/serial/admin/heynabo.e2e.spec.ts` |
| 4 | E2E UI — admin clicks `[+ Ny husstand]`, fills PBS/adresse/indflytningsdato, submits, row appears with correct PBS and coexistence visible | `tests/e2e/ui/AdminHouseholds.e2e.spec.ts` |
| 5 | Unit — `createHousehold` store action: success, PBS conflict, heynaboId copy | `tests/component/stores/households.nuxt.spec.ts` |
| 6 | Unit — household create schema: required fields, PBS integer, date parsing | `tests/component/composables/useCoreValidation.unit.spec.ts` |
| 7 | Factory — `createHouseholdAtExistingAddress(context, siblingPbsId, {pbsId, movedInDate})` helper added | `tests/e2e/testDataFactories/householdFactory.ts` |
| 8 | `npx vitest run` green | — |
| 9 | `npx playwright test tests/e2e/api/parallel/admin/household.e2e.spec.ts tests/e2e/api/serial/admin/heynabo.e2e.spec.ts tests/e2e/ui/AdminHouseholds.e2e.spec.ts --workers=4` green | — |

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
| **ADR-006** (URL Navigation) | Phase 2: `?pbs=X` follows query param pattern |
| **ADR-009** (Index Data Inclusion) | `moveOutDate` added to `HouseholdDisplay` (scalar, bounded, essential) |
| **ADR-013** (External System) | Phase 4: Heynabo import routing changes |
| **ADR-015** (Idempotent Jobs) | Per-event filter is idempotent: same input → same output |
| **ADR-016** (Unified Booking) | Predicate filters dinner events BEFORE generators — both modes inherit filtered set |

**No new ADR needed.** The predicate follows existing composable patterns.

## Verification Plan

| # | Verification | Phase | Status |
|---|-------------|-------|--------|
| 1 | Unit + E2E tests for residency enforcement | 1 | ✅ |
| 2 | `/household/S_31/bookings?pbs=100` resolves correctly | 2 | ✅ |
| 3 | Two households with same `heynaboId` coexist | 3 | |
| 4a | Admin can create a second household at an existing address via `[+ Ny husstand]`; `heynaboId` copied from sibling | 4 | |
| 4b | Heynabo import routes new inhabitant to household with no `moveOutDate` when one exists | 4 | |
| 4c | Heynabo import falls back to household with newest `moveOutDate` when none is active | 4 | |
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

## References

- Prisma schema: `prisma/schema.prisma` (Household model)
- Scaffolder: `server/utils/scaffoldPrebookings.ts`
- Generator: `app/composables/useBooking.ts` (ADR-016 decision flow)
- Preference clipper: `server/utils/initializePreferences.ts`
- Heynabo import: `server/utils/heynaboImportService.ts`
- UX companion: `docs/feature-proposal-household-admin-override.md`
