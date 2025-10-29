# TODO

## About this file

- Tasks we work with are listed with priorities
- As tasks get completed, they are compacted and moved to the "COMPLETED" section at the bottom
- New tasks are added to the top of the file
- Once we are ready to ship a task, then
    1. compacted version of "COMPLETED" is added to the Pull Request summary
    2. A user friendly version of "COMPLETED" is added to `docs/features.md`
    3. The task and "COMPLETED" items are removed from this TODO file
    4. Any left over incompleted items are preserved with "Last finishes for <task title>", Low priority

---

## 🔥 CRITICAL: Store Initialization Pattern (ADR-007 Refactoring) - NOT COMPLETED

**Goal**: Fix SSR flash by using reactive `useFetch` + `useAsyncData` pattern with **NO AWAITS** - pure reactive loading

**Current Status**: ⚠️ **80% COMPLETE** - Core pattern implemented but **3 critical await issues remain**

**What Was Done** ✅:
- ✅ Stores use **hybrid pattern**: `useFetch` for lists + `useAsyncData` for details
- ✅ Stores expose status-derived computed: `isLoading`, `isErrored`, `isInitialized`, `isEmpty`
- ✅ Most components show proper 4-state UI (loading/error/empty/data)
- ✅ All tests updated with `clearNuxtData()` to prevent cache pollution
- ✅ `useHouseholdsStore` is perfect - fully reactive, no awaits

**What's BROKEN** ⚠️:
- ❌ `usePlanStore.initPlanStore()` has internal `await` calls (lines 306, 313)
- ❌ `admin/[tab].vue` uses `await initPlanStore()` (line 118)
- ❌ `household/index.vue` uses useless `await initHouseholdsStore()` (line 5 - function is not async!)

**Target Pattern** (NO AWAITS ANYWHERE):
- **ALL stores**: Synchronous `initStore()` methods - just set IDs, reactive loading handles the rest
- **ALL pages/components**: Call `initStore()` WITHOUT await, show loaders reactively
- **Rationale**: `useFetch` and `useAsyncData` are reactive - setting IDs triggers automatic loads, status updates trigger UI re-renders

**Store Architecture** (Hybrid Pattern):
```typescript
// INDEX: useFetch auto-loads on store creation
const { data: seasons, status, error } = useFetch('/api/admin/season', {
  default: () => []
})

// DETAIL: useAsyncData with reactive key - loads when ID changes
const selectedSeasonId = ref<number | null>(null)
const selectedSeasonKey = computed(() => `/api/admin/season/${selectedSeasonId.value}`)
const { data: selectedSeason, status: detailStatus } = useAsyncData(
  selectedSeasonKey,
  () => selectedSeasonId.value ? $fetch(`/api/admin/season/${selectedSeasonId.value}`) : null,
  { default: () => null }
)
```

**Why This Pattern?**
- `useFetch`: Auto-loads index/list data (SSR-compatible, cached)
- `useAsyncData`: Loads detail when reactive key changes (selectedSeasonId)
- Both expose `status` for reactive UI (no manual loading flags needed)

---

### Current Store Status

| Store                  | List Pattern                          | Detail Pattern                        | Init Method             | Uses Await? | Status        |
|------------------------|---------------------------------------|---------------------------------------|-------------------------|-------------|---------------|
| `usePlanStore`         | `useFetch` (seasons)                  | `useAsyncData` (selectedSeason)       | `initPlanStore()`       | ⚠️ **YES** (lines 306, 313) | **Needs Fix** |
| `useHouseholdsStore`   | `useFetch` (households, immediate)    | `useAsyncData` (selectedHousehold)    | `initHouseholdsStore()` | ✅ No       | ✅ **Perfect** |
| `useAuthStore`         | `useUserSession`                      | -                                     | -                       | ✅ No       | ✅ OK         |
| `useUsersStore`        | Inside action                         | -                                     | -                       | -           | Not used in SSR |

**⚠️ Issues Found:**
- `usePlanStore.initPlanStore()` uses `await refreshActiveSeasonId()` (line 306) and `await loadSeason()` (line 313)
- These awaits should be removed - let reactive loading handle it

---

### Current Pages & Components Status

| File                               | Type      | Init Pattern                          | Uses Await? | Loaders | Status        |
|------------------------------------|-----------|---------------------------------------|-------------|---------|---------------|
| `admin/[tab].vue`                  | Page      | `initPlanStore()` (line 118)          | ⚠️ **YES**  | ✅ Yes  | **Needs Fix** |
| `household/index.vue`              | Page      | `initHouseholdsStore()` (line 5)      | ⚠️ **YES** (useless) | ✅ Yes  | **Needs Fix** |
| `household/[shortname]/[tab].vue`  | Page      | `initHouseholdsStore()` (line 84)     | ✅ No       | ✅ Yes  | ✅ **Perfect** |
| `AdminPlanning.vue`                | Component | Uses store reactively                 | ✅ No       | ✅ Yes  | ✅ **Perfect** |
| `AdminTeams.vue`                   | Component | Uses store reactively                 | ✅ No       | ✅ Yes  | ✅ **Perfect** |
| `AdminHouseholds.vue`              | Component | `initHouseholdsStore()` (line 6)      | ✅ No       | ✅ Yes  | ✅ **Perfect** |
| `HouseholdBookings.vue`            | Component | `initPlanStore()` (line 47)           | ✅ No       | ✅ Yes  | ✅ **Reference** |

**⚠️ Issues Found:**
1. **`admin/[tab].vue:118`** - `await initPlanStore()` should be removed, use sync init + loaders
2. **`household/index.vue:5`** - `await initHouseholdsStore()` is useless (function is not async), should be removed
3. **`usePlanStore.initPlanStore()`** - Remove internal awaits, make it synchronous like `initHouseholdsStore()`

---

### 🔥 CRITICAL TASKS - Fix Awaits (Must Do First!)

**Goal**: Remove ALL awaits - complete transition to pure reactive pattern

#### 1. Remove Awaits from usePlanStore (10 min) 🔥 **HIGHEST PRIORITY**
- [ ] **File**: `app/stores/plan.ts` (lines 303-314)
- [ ] **Current Code**:
  ```typescript
  const initPlanStore = async (shortName?: string) => {  // ❌ async
    await refreshActiveSeasonId()  // ❌ line 306
    if (seasonId && seasonId != selectedSeasonId.value) await loadSeason(seasonId)  // ❌ line 313
  }
  ```
- [ ] **Change To**:
  ```typescript
  const initPlanStore = (shortName?: string) => {  // ✅ No async
    refreshActiveSeasonId()  // ✅ Trigger reactive load
    if (seasonId && seasonId != selectedSeasonId.value) loadSeason(seasonId)  // ✅ Just set ID
  }
  ```

#### 2. Remove Await from admin/[tab].vue (2 min) 🔥
- [ ] **File**: `app/pages/admin/[tab].vue` (line 118)
- [ ] **Current**: `await initPlanStore()` ❌
- [ ] **Change To**: `initPlanStore()` ✅
- [ ] **Loaders**: Already exist (lines 138-139)

#### 3. Remove Useless Await from household/index.vue (2 min) 🔥
- [ ] **File**: `app/pages/household/index.vue` (line 5)
- [ ] **Current**: `await initHouseholdsStore()` ❌ (function is NOT async!)
- [ ] **Change To**: `initHouseholdsStore()` ✅
- [ ] **Loaders**: Already exist (line 26)

---

### 🔥 Remaining Critical Tasks

**Goal**: Finish refactoring polish - code cleanup and test improvements

#### 1. Refactor Admin Tab Navigation (20 min)
- [ ] **File**: `app/pages/admin/[tab].vue` (lines 74-115)
- [ ] **Issue**: Custom TAB_PREFIX routing logic (~40 lines)
- [ ] **Action**: Replace with `useTabNavigation` composable (5 lines, like household pages)
- [ ] **Benefit**: DRY - consistent pattern across all tab-based pages

#### 2. Replace E2E Test Anti-Pattern (60 min)
- [ ] **Files**: 3 E2E test files, 17 occurrences total
  - `AdminPlanningSeason.e2e.spec.ts` (8×)
  - `AdminHouseholds.e2e.spec.ts` (4×)
  - `AdminPlanning.e2e.spec.ts` (5×)
- [ ] **Issue**: `waitForLoadState('networkidle')` - slow, flaky
- [ ] **Action**: Replace with `page.waitForResponse()` pattern
- [ ] **Template**: `AdminTeams.e2e.spec.ts` already uses correct pattern

#### 3. Update ADR-007 Documentation (15 min)
- [ ] **File**: `docs/adr.md`
- [ ] **Action**: Document reactive store pattern
  - When to use `await` (pages with shared data)
  - When to use sync + loaders (dynamic tab components)
  - Why this pattern avoids SSR flash
- [ ] **Include**: Code examples from `HouseholdBookings.vue` (has excellent comments!)

#### 4. Run Full Test Suite (5 min)
- [ ] **Command**: `npm run test && npm run test:e2e`
- [ ] **Goal**: Verify no regressions after changes
- [ ] **Expected**: All tests pass

---

### Reference Implementation

**Best example**: `app/components/household/HouseholdBookings.vue:46-47`

```typescript
// Initialize without await for SSR hydration consistency
planStore.initPlanStore()

// Template handles reactive loading
<Loader v-if="isSelectedSeasonLoading" text="Henter sæsondata..." />
<ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />
<div v-else-if="isSelectedSeasonInitialized && activeSeason">
```

**Why this works**:
- `useFetch` is reactive - status updates trigger component re-renders
- No `await` needed - template shows loaders while data loads
- Component owns its loading state, parent doesn't block
- Performance: Only loads data when tab is viewed


---

## CRITICAL : Bug in adminTeams
1After submitting the form in Create mode, set draft / display to 0, otherwise it shows next 8 teams to create!
. Make help component functional again - it is broken after recent refactor. Remove marquee, place the text in help
   system
4. time to add the tabs as a 2. level menu to the menu component, so it doesnt scroll seperately

## 🎯🌋 HIGHEST PRIORITY: Household Booking Feature

**Feature Overview:**

- ✅ **Task 1**: Refactor calendar architecture (DRY) - Create reusable BaseCalendar component for all calendar views
- ✅  **Task 2**: Extend WeekDayMap to support ticket preferences - Members can set weekly DINEIN/TAKEAWAY/NONE per
  inhabitant
- [ ] **Task 3**: Build HouseholdCard component - Intuitive calendar showing bookings and team obligations (mobile +
  desktop)
- [ ] **Task 4**: Implement booking management UI - Members can book/cancel tickets for family members and guests
- [ ] **Task 5**: Auto-generate orders from preferences - Orders created automatically when seasons generate dinner
  events

Household members can view and manage dinner bookings for their family through an intuitive calendar interface.
Members can book/cancel tickets, set weekly preferences per inhabitant, book guest tickets, and see their team cooking
obligations.
Orders are auto-generated when seasons create dinner events based on stored preferences.
Accessible from admin view and household-specific URLs.
Mobile and desktop UX must be intuitive.

---

### HouseholdCard Component - UX Design

**Design Philosophy:**

- **Single-manager workflow**: One family member manages all bookings
- **Batch operations**: Plan by week/month, not individual days (matches real-world behavior)
- **Weekly preferences as power controls**: Live controls that auto-update all future bookings when changed
- **Master-detail pattern**: Calendar/grid (master) + booking details (detail panel) - proven pattern from AdminTeams
- **No modals**: All editing inline, auto-save on blur/change
- **Grid-based editing**: Spreadsheet-like for week/month views - efficient for batch changes
- **Simple feedback**: Toast notifications without undo (just change it again if needed)
- **Current season only**: Always shows active season, focuses on current/next event

---

#### HouseholdCard Structure

**Overall Component (Desktop):**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Hansen Familie                                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [•Tilmeldinger]  [Allergier]  [Økonomi]  [Indstillinger]                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                         (Tab content renders here)                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Overall Component (Mobile):**

```
┌──────────────────────────────────┐
│ 🏠 Hansen Familie                │
├──────────────────────────────────┤
│ [•Tilmeldinger] [Allergier] [Øko]│
├──────────────────────────────────┤
│                                  │
│   (Tab content, scrollable)      │
│                                  │
└──────────────────────────────────┘
```

**Tab Structure (Same on Desktop/Mobile):**

1. **Tilmeldinger** - Calendar + booking management + weekly preferences (3 view modes: Dag/Uge/Måned)
2. **Allergier** - Family allergy management
3. **Økonomi** - Monthly cost breakdown

**Entry Point:** Opens Tilmeldinger tab, Dag view, today (or next upcoming event) selected

---

#### Tab 1: Tilmeldinger - Desktop Layouts

**DAG View (Entry Point - Quick Check):**

```
┌──────────────────────────────┬──────────────────────────────────────────────────┐
│ KALENDER                     │ DENNE DAG                                        │
│                              │                                                  │
│ [•Dag] [Uge] [Måned]         │ Tirsdag 8. Oktober 2025                         │
│                              │                                                  │
│ [◀ Sep] OKTOBER 2025 [Nov ▶] │ ┌────────────────────────────────────────────┐  │
│                              │ │👤 Anna      [📍Spis her▾]  [Voksen▾]  ☑  │  │
│ Ma Ti On To Fr Lø Sø         │ │👤 Bob       [📍Spis her▾]  [Voksen▾]  ☑  │  │
│    1  2  3  4  5  6          │ │👶 Clara     [📍Spis her▾]  [Sulten▾]  ☑  │  │
│ 7 [●8] 9 ●10 11 12 13        │ │👶 David     [⊘ Ingen▾]     [Baby▾]     ☐  │  │
│14 15 ●16 17 ◆18 19 20        │ └────────────────────────────────────────────┘  │
│21 22 ●23 24 25 ◆26 27        │                                                  │
│28 29 ●30 31                  │ [Tilmeld alle 📍] [Tag alle med 📦] [Afmeld ⊘]  │
│                              │ [+ Gæstebillet]                                 │
│ ● Tilmeldt  ◆ Hold laver     │                                                  │
│ ○ Ikke tilmeldt              │ 🍳 Hold 2 laver mad                              │
│                              │ Frist: 6. okt kl. 18:00 • Pris: 180kr           │
│                              │                                                  │
│                              ├──────────────────────────────────────────────────┤
│                              │ ⚙️ UGENTLIGE PRÆFERENCER            [▼ Udvid]   │
│                              │ Tirsdag: Anna📍, Bob📍, Clara📍 • David⊘         │
└──────────────────────────────┴──────────────────────────────────────────────────┘
```

**UGE View (Weekly Batch Planning):**

```
┌──────────────────────────────┬──────────────────────────────────────────────────┐
│ KALENDER                     │ DENNE UGE                                        │
│                              │                                                  │
│ [Dag] [•Uge] [Måned]         │ Uge 41 (7.-13. Oktober)                         │
│                              │                                                  │
│ [◀ Uge 40]    [Uge 42 ▶]     │ Hurtighandlinger:                               │
│                              │ [Tilmeld alle Anna] [Afmeld alle David]         │
│ ┌────────────────────────┐   │                                                  │
│ │Dag  Anna Bob Cla David │   │ Uge total: 780kr (13 billetter)                 │
│ ├────────────────────────┤   │                                                  │
│ │Ma 7 ☑📍  ☑📍 ☑📍  ☐   │   ├──────────────────────────────────────────────────┤
│ │Ti 8 ☑📍  ☑📍 ☑📍  ☐ 🍳│   │ ⚙️ UGENTLIGE PRÆFERENCER            [▼ Udvid]   │
│ │On 9 ☑📍  ☐   ☑📍  ☐   │   │                                                  │
│ │To10 ☑📍  ☑📍 ☑📍  ☐   │   │ Ma: Anna📍Bob📍Clara📍 • Ti: Anna📍Bob📍Clara📍   │
│ │Fr11 ☑📦  ☑📦 ☑📦  ☐ 🍳│   │ On: Anna📍Clara📍 • To: Anna📍Bob📍Clara📍        │
│ └────────────────────────┘   │ Fr: Anna📦Bob📦Clara📦                           │
│                              │                                                  │
│ Klik ☑/☐ tilmeld/afmeld      │                                                  │
│ Klik 📍/📦 skift venue        │                                                  │
└──────────────────────────────┴──────────────────────────────────────────────────┘
```

**MÅNED View (Monthly Overview):**

```
┌──────────────────────────────┬──────────────────────────────────────────────────┐
│ KALENDER                     │ DENNE MÅNED                                      │
│                              │                                                  │
│ [Dag] [Uge] [•Måned]         │ Oktober 2025                                     │
│                              │                                                  │
│ [◀ September]  [November ▶]  │ Hurtighandlinger:                               │
│                              │ [Tilmeld hele familien] [Afmeld alle David]     │
│ ┌────────────────────────┐   │                                                  │
│ │Dag   Anna Bob Cla David│   │ Måned total: 1.140kr (19 billetter)             │
│ ├────────────────────────┤   │                                                  │
│ │Ma 7  ☑📍  ☑📍 ☑📍  ☐   │   ├──────────────────────────────────────────────────┤
│ │Ti 8  ☑📍  ☑📍 ☑📍  ☐ 🍳│   │ ⚙️ UGENTLIGE PRÆFERENCER            [▼ Udvid]   │
│ │On 9  ☑📍  ☐   ☑📍  ☐   │   │                                                  │
│ │To10  ☑📍  ☑📍 ☑📍  ☐   │   │ Ma: Anna📍Bob📍Clara📍 • Ti: Anna📍Bob📍Clara📍   │
│ │Fr11  ☑📦  ☑📦 ☑📦  ☐ 🍳│   │ On: Anna📍Clara📍 • To: Anna📍Bob📍Clara📍        │
│ │... (scroll for more)   │   │ Fr: Anna📦Bob📦Clara📦                           │
│ └────────────────────────┘   │                                                  │
│                              │                                                  │
│ [Vis kun dage med middage]   │                                                  │
└──────────────────────────────┴──────────────────────────────────────────────────┘
```

**Expanded Preferences (All Views):**

```
│ ⚙️ UGENTLIGE PRÆFERENCER                               [▲ Skjul]   │
│                                                                     │
│ Standard for hver ugedag (opdaterer automatisk fremtidige bookinger)│
│                                                                     │
│ ┌─👤 Anna──────────────────────────────────┐                       │
│ │Ma[📍▾] Ti[📍▾] On[📍▾] To[📍▾] Fr[📦▾]  │                       │
│ └──────────────────────────────────────────┘                       │
│                                                                     │
│ ┌─👤 Bob───────────────────────────────────┐                       │
│ │Ma[📍▾] Ti[📍▾] On[📍▾] To[⊘▾]  Fr[📦▾]  │                       │
│ └──────────────────────────────────────────┘                       │
│                                                                     │
│ ┌─👶 Clara─────────────────────────────────┐                       │
│ │Alle dage: [📍 Spis her ▾]                │                       │
│ └──────────────────────────────────────────┘                       │
│                                                                     │
│ ℹ️ Ændringer opdaterer fremtidige bookinger                         │
```

---

#### Tab 1: Tilmeldinger - Mobile Layouts (Stacked + Scrollable)

**DAG View:**

```
┌──────────────────────────────────┐
│ KALENDER                         │
│ [•Dag] [Uge] [Måned]             │
│ [◀] OKTOBER 2025 [▶]             │
│ ┌─────────────────────────────┐  │
│ │Ma Ti On To Fr Lø Sø         │  │
│ │    1  2  3  4  5  6         │  │
│ │ 7 [●8] 9 ●10 11 12 13       │  │
│ │14 15 ●16 17 ◆18 19 20       │  │
│ └─────────────────────────────┘  │
│ ● Tilmeldt ◆ Hold ○ Ingen       │
│ ──────────────────────────────── │
│ TIRSDAG 8. OKTOBER               │
│ ┌────────────────────────────┐   │
│ │👤 Anna  [Spis her▾][Vok▾]☑│   │
│ │👤 Bob   [Spis her▾][Vok▾]☑│   │
│ │👶 Clara [Spis her▾][Sul▾]☑│   │
│ │👶 David [Ingen▾]  [Baby▾]☐│   │
│ └────────────────────────────┘   │
│ [Tilmeld alle] [Tag med] [Afmeld]│
│ [+ Gæstebillet]                  │
│ 🍳 Hold 2 • Frist: 6/10 18:00    │
│ Pris: 180kr                      │
│ ──────────────────────────────── │
│ ⚙️ PRÆFERENCER       [▼ Udvid]   │
│ Tirsdag: Anna📍, Bob📍, Clara📍  │
└──────────────────────────────────┘
```

**UGE View:**

```
┌──────────────────────────────────┐
│ KALENDER                         │
│ [Dag] [•Uge] [Måned]             │
│ [◀ Uge 40] UGE 41 [Uge 42 ▶]     │
│ ┌────────────────────────────┐   │
│ │Dag   Anna Bob Clara David  │   │
│ ├────────────────────────────┤   │
│ │Ma 7  ☑📍  ☑📍  ☑📍   ☐    │   │
│ │Ti 8  ☑📍  ☑📍  ☑📍   ☐ 🍳 │   │
│ │On 9  ☑📍  ☐    ☑📍   ☐    │   │
│ │To10  ☑📍  ☑📍  ☑📍   ☐    │   │
│ │Fr11  ☑📦  ☑📦  ☑📦   ☐ 🍳 │   │
│ └────────────────────────────┘   │
│ Tryk ☑ tilmeld • 📍/📦 skift     │
│ ──────────────────────────────── │
│ DENNE UGE                        │
│ 780kr (13 billetter)             │
│ [Tilmeld alle Anna]              │
│ [Afmeld alle David]              │
│ ──────────────────────────────── │
│ ⚙️ PRÆFERENCER [▼]               │
│ Ma: Anna📍Bob📍Clara📍           │
└──────────────────────────────────┘
```

**Grid Cell Interactions (Week/Month Views):**

- **Checkbox (☑/☐)**: Toggle booking on/off (checked = booking active)
- **Venue Toggle (📍/📦)**: Click to cycle Spis her ↔ Tag med (only when ☑)
- **Ticket Type (▾)**: Dropdown for Voksen/Barn/Sulten/Baby (only when ☑)
- **Auto-save**: All changes save immediately
- **Toast (simple)**: "✓ Anna tilmeldt mandag 7/10" or "⚠️ Bob's torsdagspræference ændret - 8 torsdage opdateret"

---

#### Tab 2: Allergier

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Hansen Familie                                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Tilmeldinger]  [•Allergier]  [Økonomi]                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ Familiens allergier og diætkrav                                                │
│                                                                                 │
│ ┌─👤 Anna (Voksen)──────────────────────────────────────────────────────────┐  │
│ │ 🥜 Peanuts                                                          [✕]   │  │
│ │ 🌾 Gluten                                                           [✕]   │  │
│ │ [Tilføj allergi___________________________] [+]                           │  │
│ └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ ┌─👤 Bob (Voksen)───────────────────────────────────────────────────────────┐  │
│ │ Ingen allergier                                                            │  │
│ │ [Tilføj allergi___________________________] [+]                           │  │
│ └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ ┌─👶 Clara + David──────────────────────────────────────────────────────────┐  │
│ │ 🥛 Laktose (Clara)                                                  [✕]   │  │
│ │ [Tilføj allergi___________________________] [+]                           │  │
│ └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│ ℹ️ Køkkenet ser disse allergier når de planlægger menuen                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

#### Tab 3: Økonomi

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Hansen Familie                                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Tilmeldinger]  [Allergier]  [•Økonomi]                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ Oversigt over middagsomkostninger                                              │
│                                                                                 │
│ ┌─OKTOBER 2025────────────────────────────────────────────────────────────┐    │
│ │ 8/10  Tirsdag    Anna, Bob, Clara           3 × billetter      180kr   │    │
│ │ 10/10 Torsdag    Anna, Bob, Clara           3 × billetter      180kr   │    │
│ │ 16/10 Mandag     Anna, Bob, Clara           3 × billetter      180kr   │    │
│ │ 23/10 Torsdag    Anna, Bob, Clara           3 × billetter      180kr   │    │
│ │ 30/10 Torsdag    Anna, Bob, Clara + Gæst    4 × billetter      240kr   │    │
│ │                                              ─────────────────────────       │
│ │                                              Oktober total:   1.140kr   │    │
│ └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│ ┌─NOVEMBER 2025 [▼ Udvid]────────────────────────────────────────────────┐    │
│ │ November total: 880kr                                                   │    │
│ └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│ ════════════════════════════════════════════════════════════════════════════   │
│ Sæson total: 2.020kr                                                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

**Mobile Layouts for Allergier & Økonomi:**

- Same content as desktop, stacked vertically, scrollable

**Future Features:**

- Calendar feed export (.ics) for Google/Apple/Outlook
- Ticket marketplace (buy/sell past deadline) in Tilmeldinger detail panel

### Task 1: DRY Calendar Architecture Refactoring

**Goal**: Eliminate duplication between CalendarDisplay and TeamCalendarDisplay. Create reusable calendar foundation for
household booking calendar.

**Architecture (3-Layer)**:

1. `useCalendarEvents` composable - Generic event mapping/lookup (CalendarEventList type)
2. `BaseCalendar` component - Renderless calendar with slots (wraps UCalendar)
3. Domain composables - Event list creators in `useSeason`, `useCookingTeam`, `useHousehold` (new)
4. Specific calendars - Thin wrappers using BaseCalendar with custom rendering

**Test Plan (TDD - Tests First!)**:

| File                                    | Type | Status   | Tests                                                             |
|-----------------------------------------|------|----------|-------------------------------------------------------------------|
| `useCalendarEvents.unit.spec.ts`        | Unit | ✅        | Event mapping, day lookup (multiple lists support)                |
| `useSeason.nuxt.spec.ts`                | Nuxt | ✅        | Cooking day event lists, `isHoliday` detection, holiday exclusion |
| `useCookingTeam.nuxt.spec.ts`           | Nuxt | ✅        | Team event lists (with/without teams, color/name data)            |
| `useHousehold.unit.spec.ts`             | Unit | ✅        | Household booking event lists (aggregation, ticket types)         |
| `BaseCalendar.nuxt.spec.ts`             | Nuxt | ⭐ CREATE | Slots, day context, responsive sizing, multi-event lists          |
| `CalendarDisplay.nuxt.spec.ts`          | Nuxt | ⭐ CREATE | Smoke tests (renders, BaseCalendar, ring/chip styling)            |
| `TeamCalendarDisplay.nuxt.spec.ts`      | Nuxt | ⭐ CREATE | Smoke tests (badge styling, tooltips, team colors)                |
| `HouseholdCalendarDisplay.nuxt.spec.ts` | Nuxt | ⭐ CREATE | Smoke tests (chip bookings, count display, legend)                |

**Implementation (After Tests!)**:

- ✅ Phase 1: Foundation - `useCalendarEvents` + `BaseCalendar`
- ✅ Phase 2: Domain extensions - Update `useSeason`, `useCookingTeam`, create `useHousehold`
- ✅ Phase 3: Component migration - Refactor existing calendars, create `HouseholdCalendarDisplay`
- ✅Phase 4: Cleanup - Verify tests, remove duplication

**ADR Alignment**: ADR-001 (composables), ADR-007 (separation of concerns), ADR-010 (domain types)

### Task 2: Ticket Type Preferences (WeekDayMap Extension)

**Goal**: Store per-inhabitant weekly dinner preferences (DINEIN, TAKEAWAY, NONE) using generic `WeekDayMap<DinnerMode>`

**Architecture Decision**: Enhance existing `useWeekDayMapValidation()` with optional parameters (Option B)

- Zero breaking changes - existing boolean usage unchanged
- `useWeekDayMapValidation({ valueSchema: DinnerModeSchema, defaultValue: 'NONE' })`
- Same ser/de functions for all types

```typescript 
// in useWeekDayMapValidation.ts
useWeekDayMapValidation<T = boolean>(options ? : {
    valueSchema? : z.ZodType<T>      // Zod schema for each day's value
    defaultValue? : T                 // Default value for createDefaultWeekdayMap
    isRequired? : (map: WeekDayMap<T>) => boolean  // Custom "at least one" validation
    requiredMessage? : string         // Error message for validation
})
```

**TDD Implementation**:

**Phase 1: Type & Validation Foundation**

- ✅ **Test**: Unit test for generic `WeekDayMap<T>` type in `types/dateTypes.ts` impl  `type WeekDayMap<T = boolean> = Record<WeekDay, T>`
- ✅  **Impl**: Make `createDefaultWeekdayMap` generic
- ✅ fixed regressions after refactoring

**Phase 2: Prisma Schema**

- [ ] **Impl**: Add `dinnerPreferences String?` to `Inhabitant` model (JSON stringified `WeekDayMap<DinnerMode>`)
- [ ] **Impl**: Deprecate `DinnerPreference` model (add comment, keep for backward compat)
- [ ] **Impl**: Generate Prisma client + migration

**Phase 3: Domain Validation**

- [ ] **Test**: Unit test `useInhabitantValidation` with `dinnerPreferences` field
- [ ] **Impl**: Add `dinnerPreferences: WeekDayMapSchema.nullable()` using DinnerMode validation
- [ ] **Test**: Test ser/de for `dinnerPreferences` in repository
- [ ] **Impl**: Repository ser/de in `createInhabitant`, `updateInhabitant`

**Phase 4: API & UI**

- [ ] API endpoints: GET/PUT `/api/inhabitant/[id]`  should update the dinnerPreferences
- [ ] API e2e test case for GET/PUT endpoint
- [ ] UI: Weekly preference selector component
- [ ] e2e ui test - changes trigger

### Task 3: Household Calendar Card Component

**Goal**: Build HouseholdCard component showing family bookings and cooking obligations.

**Requirements**:

- Calendar view with:
    - Family member bookings (multi-inhabitant display)
    - Cooking team assignments (via team calendar integration)
    - Responsive: Intuitive on mobile and desktop
- Accessible from:
    - `/admin/household?household={id}` (admin context - future)
    - `/household/[shortname]` (household-specific URL - path-based routing)

**URL Pattern Decision**:

- Use path-based routing: `/household/[shortname]` for household detail view
- Rationale: Consistency with Nuxt 4 file-based routing, REST conventions, and existing patterns
- Note: Existing `/household/[id].vue` uses address-based IDs (T1, S31) - may need migration/coexistence strategy

**Architecture**:

**Tab Navigation Pattern** (ADR-006):
- URL: `/household/[shortname]/[tab]` (e.g., `/household/AR_1_st/tilmeldinger`)
- Client-side navigation (no full page reloads)
- Tabs: Tilmeldinger, Allergier, Økonomi, Medlemmer, Indstillinger
- Reusable `useTabNavigation` composable (shared with admin pages)

**File Structure**:
```
app/pages/household/
  [shortname]/[tab].vue      # Tab router (like admin/[tab].vue)
  [shortname].vue             # Redirects to first tab

app/components/household/
  HouseholdBookings.vue       # Tilmeldinger tab (calendar + booking)
  HouseholdAllergies.vue      # Allergier tab
  HouseholdEconomy.vue        # Økonomi tab
  HouseholdMembers.vue        # Medlemmer tab
  HouseholdSettings.vue       # Indstillinger tab
```

**Implementation Phases**:

**Phase 0: Foundation (Composable)**
- [ ] Create `app/composables/useTabNavigation.ts`
  - Support simple routes (`/admin/[tab]`)
  - Support nested routes (`/household/[shortname]/[tab]`)
  - Type-safe with TypeScript generics
- [ ] Unit test: `tests/component/composables/useTabNavigation.unit.spec.ts`

**Phase 1: Validate Pattern (Refactor Admin)**
- [ ] Refactor `app/pages/admin/[tab].vue` to use `useTabNavigation`
- [ ] Remove duplicate routing logic (~40 lines → composable call)
- [ ] E2E test: Verify admin tabs still work (no behavior change)
- [ ] Rationale: Validate composable works before applying to household

**Phase 2: Household Tab Structure**
- [ ] Create `app/pages/household/[shortname]/[tab].vue`
  - Use `useTabNavigation` with `additionalParams: ['shortname']`
  - Setup async component loading
  - Store initialization (householdStore, planStore)
- [ ] Update `app/pages/household/[shortname].vue`
  - Add redirect to `/household/[shortname]/tilmeldinger`
- [ ] E2E test: URL navigation and tab switching

**Phase 3: Component Extraction** (Can parallelize)
- [ ] Extract `HouseholdBookings.vue` from HouseholdCard
  - Master-detail: Calendar (1/3) + Booking panel (2/3)
  - Props: household, seasonDates, dinnerEvents, orders, holidays
  - Component test
- [ ] Extract `HouseholdAllergies.vue`
  - Component test
- [ ] Extract `HouseholdEconomy.vue`
  - Component test
- [ ] Extract `HouseholdMembers.vue`
  - Component test
- [ ] Extract `HouseholdSettings.vue`
  - Calendar feed, notifications, preferences
  - Component test

**Phase 4: Integration & Cleanup**
- [ ] Wire components in `[shortname]/[tab].vue`
- [ ] Pass props from page to components
- [ ] Remove/repurpose old `HouseholdCard.vue`
- [ ] E2E test: All tabs functional with data flow

**Phase 5: Documentation**
- [ ] Update ADR-006 with tab navigation pattern
- [ ] Document `useTabNavigation` usage
- [ ] Add examples for simple and nested routes

**Completion Criteria**:
- ✅ `HouseholdCard.vue` created (basic structure)
- ✅ `HouseholdCalendarDisplay` integrated (from Task 1)
- [ ] Tab navigation working with URL synchronization
- [ ] All 5 tabs extracted as separate components
- [ ] Client-side navigation (no full page reloads)
- [ ] Admin refactored to use same pattern (DRY)
- [ ] E2E tests for tab navigation and component rendering
- [ ] ADR-006 updated with pattern documentation

### Task 4: Booking Management UI

**Goal**: Members can book/cancel tickets for any family member.

**Requirements**:

- Book/cancel tickets per inhabitant per dinner event
- Select ticket types (ADULT, CHILD, HUNGRY_BABY, BABY)
- Guest ticket support (extra ticket for non-member)
- Validation: Cancellation deadline (`ticketIsCancellableDaysBefore`)

**Implementation**:

- [ ] API: POST/DELETE `/api/household/[id]/order` (create/cancel booking)
- [ ] UI: Day click → booking modal (select inhabitants + ticket types)
- [ ] Show existing bookings in calendar (chips with count)
- [ ] Guest ticket special handling
- [ ] Cancellation deadline warning/blocking

### Task 5: Auto-Generate Orders from Preferences

**Goal**: When season generates dinner events, auto-create orders based on inhabitant ticket preferences.

**Requirements**:

- During dinner event generation (existing flow)
- Create orders for each inhabitant matching their weekly preferences
- Skip if preference is NONE for that weekday
- Apply correct ticket type based on inhabitant age/preference

**Implementation**:

- [ ] Update `generateDinnerEvents` logic (server-side)
- [ ] For each event date, check all inhabitants' preferences for that weekday
- [ ] Bulk create orders matching preferences
- [ ] E2E tests: Generate season → verify auto-created orders
- [ ] Handle edge cases: Mid-season preference changes

### Feature Completion Criteria

- [ ] All calendar components use DRY BaseCalendar architecture
- [ ] Household members can view bookings in calendar
- [ ] Household members can book/cancel tickets (with deadline validation)
- [ ] Guest tickets supported
- [ ] Ticket preferences stored per inhabitant per weekday
- [ ] Orders auto-generated when season creates dinner events
- [ ] Mobile and desktop UX tested and approved
- [ ] E2E tests cover all booking flows

## 🗻 HIGH PRIORITY: Team Assignment UI Integration

**Remaining UI work**:

- [ ] Manual reassignment UI (admin changes team for specific event)
- [ ] Display team assignment counts in UI ("Hold 1: 12 fællesspisninger")
- [ ] User-defined team affinity preferences
- [ ] Use allocationPercentage for team member workload distribution
- [ ] Auto-reassign when teams added/removed
- [ ] Warnings for imbalanced distribution

---

## 🎯 HIGH PRIORITY: Feature: /dinner today dinner information page for everyone

When a user navigates to the /dinner page, they should see a master / detail view with a calendar of dinner events
and a complex information panel about today's dinner event if it exists, or the next upcoming dinner event if today's
dinner event does not exist.
The information panel should include:

- sell / buy tickets
- show unsold
- show hours / minutes deadlines
- menu information
- cooking team members
- allergy information

## 🎯 HIGH PRIORITY: URL-Based Admin Navigation (DRY Season Selection)

### Goal

Implement URL-based navigation for admin context (season, team) using query parameters, consolidating routing logic and
eliminating component duplication.

### Architecture Pattern

**Query parameters as context/filters**:

- Season context: `?season={shortName}`
- Team context: `?team={slug}` (future)
- Mode state: `?mode=edit|create|view` (existing)

**Example URLs**:

```
/admin/planning?season=fall-2025&mode=edit
/admin/teams?season=fall-2025&mode=view
/admin/teams?season=fall-2025&team=hold-1 (future)
```

### Business Requirements

#### 1. Season Context (Required)

**Default Behavior**:

- User navigates to `/admin/planning` (no `?season=`)
- Auto-redirect to `/admin/planning?season={activeSeason.shortName}`
- Active season = first season in list (temporary - will be database `isActive` field later)
- Only ONE season can be active at a time (business invariant)

**Invalid Season Handling**:

- User navigates to `/admin/planning?season=nonexistent`
- Redirect to `/admin/planning?season={activeSeason.shortName}` (graceful fallback)
- No error toast - silent recovery

**Empty State** (No Seasons):

- `isNoSeasons = true` when no seasons exist
- URL: `/admin/planning` (no redirect, no season param)
- Show empty state UI: "Ingen sæsoner. Opret en ny sæson."
- Season-dependent actions disabled (edit mode, team creation)

**Season Persistence**:

- Season param persists across ALL admin tabs
- User at `/admin/planning?season=fall-2025` → clicks "Madhold" → `/admin/teams?season=fall-2025`
- Coexists with mode param: `?season=fall-2025&mode=edit`

#### 2. URL Sync with Store

**Two-way binding**:

- URL query param `?season=fall-2025` → Store `selectedSeason`
- Store `selectedSeason` updated → URL reflects change
- SeasonSelector dropdown updates URL → Store syncs automatically

**Store Integration**:

- Add `activeSeason` computed property: `seasons.value[0] ?? null`
- Existing `selectedSeason` ref synced from URL
- Existing `onSeasonSelect(id)` method remains unchanged

#### 3. Routing Logic Consolidation

**Problem**: Routing logic fragmented across:

- FormModeSelector component (manages `?mode=`)
- Admin [tab].vue page (manages `/admin/[tab]`)
- Duplicated season selection in AdminPlanning + AdminTeams

**Solution**: Create `useAdminNavigation` composable

- Responsibility: Manage URL query params (season, future: team, filters)
- Single source of truth for admin context/navigation
- Separate from `useEntityFormManager` (entity editing state)

**Clear separation** (ADR-007 compliant):

```
useAdminNavigation    → URL context (season, team filters)
useEntityFormManager  → Entity editing (mode, draft entity)
usePlanStore          → Server data (seasons list, CRUD)
```

#### 4. Component Extraction (DRY)

**Create SeasonSelector component**:

- Replaces inline `<USelect>` in AdminPlanning.vue (lines 93-103)
- Replaces inline `<USelect>` in AdminTeams.vue (lines 257-266)
- Uses `useAdminNavigation` internally for URL updates
- Single source of truth for season selection UI

### Implementation Checklist

**New Files**:

- [ ] `app/composables/useAdminNavigation.ts` - URL query param management
- [ ] `app/components/admin/SeasonSelector.vue` - Reusable season dropdown

**Modified Files**:

- [ ] `app/stores/plan.ts` - Add `activeSeason` computed property
- [ ] `app/components/admin/AdminPlanning.vue` - Use SeasonSelector + useAdminNavigation
- [ ] `app/components/admin/AdminTeams.vue` - Use SeasonSelector + useAdminNavigation

**Unchanged Files** (respects ADR-007, ADR-008):

- [ ] `app/composables/useEntityFormManager.ts` - No changes
- [ ] `app/components/form/FormModeSelector.vue` - No changes
- [ ] `app/pages/admin/[tab].vue` - No changes

**Testing**:

- [ ] E2E: Season persists across admin tabs
- [ ] E2E: Invalid season redirects to active season
- [ ] E2E: Missing season param redirects to active season
- [ ] E2E: Dropdown selection updates URL
- [ ] E2E: Empty state when no seasons exist
- [ ] E2E: Mode + season params coexist correctly
- [ ] Unit: useAdminNavigation composable tests

**Documentation**:

- [ ] Move to `docs/features.md` after implementation
- [ ] Update URL patterns in README.md (if needed)

### Decision Rationale

Query parameters chosen over path-based routing because:

1. Season/team are "context filters" not primary entities
2. Minimal code changes (no new route files)
3. Consistent with existing `?mode=` pattern
4. DRY via extraction (primary goal achieved)
5. Respects existing ADR-007 and ADR-008 patterns

---

## Low priority: Future E2E test work

### Skipped E2E Tests (1 test)

**`tests/e2e/api/admin/dinnerEvent.e2e.spec.ts:46`**

- Test: `POST can update existing dinner event with status 200`
- Status: Intentionally skipped - feature not yet implemented
- Action: Implement POST /api/admin/dinner-event/[id] endpoint when needed

---

## Medium priority: Fix Vitest ECONNREFUSED error on test cleanup

### Issue

After all tests pass successfully, the test process throws an unhandled ECONNREFUSED error during cleanup:

```
AggregateError [ECONNREFUSED]:
  Error: connect ECONNREFUSED ::1:3000
  Error: connect ECONNREFUSED 127.0.0.1:3000
```

### Current Status

- **All tests pass**: 125/125 tests passing ✅
- **Error occurs**: During process teardown after tests complete
- **Affected**: Only when running all Nuxt tests together (`npm run test`)
- **Not affected**: Individual test files run without error

### Investigation Done

- ✅ Confirmed: `plan.ts` uses module-level `useFetch` (Nuxt 4 pattern with `refreshSeasons()`)
- ✅ Confirmed: Test properly registers mock endpoint before importing store
- ✅ Confirmed: Other stores use `useFetch` inside actions (users.ts, households.ts)
- ✅ Searched: Pinia/Nuxt test-utils documentation about `useFetch` in stores
- ✅ Found: `useFetch` designed for components, not stores (but Nuxt 4 allows it)

### Potential Causes

1. HMR code (`import.meta.hot`) running in test environment
2. Nuxt/Vite cleanup trying to connect to dev server (port 3000)
3. Test environment not fully mocking the Nuxt runtime during cleanup
4. Known issue with `@nuxt/test-utils` and module-level `useFetch`

### Action Items

- [ ] Check if `import.meta.hot` is active in test environment
- [ ] Research `@nuxt/test-utils` GitHub issues for similar problems
- [ ] Consider using MSW (Mock Service Worker) instead of `registerEndpoint`
- [ ] Investigate Nuxt 4 test-utils documentation for proper cleanup
- [ ] Test if issue persists with Pinia 3 migration (scheduled)

### References

- Pinia testing docs: https://pinia.vuejs.org/cookbook/testing.html
- `@nuxt/test-utils` issue #943: registerEndpoint doesn't expose to $fetch
- Search results indicate `useFetch` in stores is problematic for testing

---

## Medium priority: Fix UForm error display in AdminPlanningSeason footer

### Issue

Form validation is working (submit button is disabled when errors exist), but the error message in the footer doesn't
display.

### Current Behavior

- `app/components/admin/planning/AdminPlanningSeason.vue:175` has error display: `<div v-if="errors.length > 0">`
- UForm v-slot provides `errors` array which should populate with validation errors
- Debug output shows: `errors = [], length = 0` even when validation prevents submission
- Removing `form="seasonForm"` attribute fixed validation blocking (UForm now prevents invalid submission)

### Investigation Done

- ✅ Confirmed: UForm docs say errors array should populate during input events
- ✅ Confirmed: `errors.length > 0` is correct syntax per Nuxt UI docs
- ✅ Fixed: Removed `form` attribute from submit button (was bypassing UForm validation)
- ❌ Problem: `errors` array remains empty even though validation is active

### Potential Causes

1. UForm v-slot `errors` may only populate after attempted submit (not during input validation)
2. May need to use `@error` event instead of v-slot pattern
3. May need to set `validate-on` prop explicitly

### Action Items

- [ ] Test clicking submit button to see if errors populate after submission attempt
- [ ] Check Nuxt UI 4 migration docs for error handling changes
- [ ] Try `@error` event pattern as alternative to v-slot
- [ ] Research `validate-on` prop configuration
- [ ] Check if UForm exposes errors differently in v4

---

## Medium priority: Type-safe deserializeSeason (ADR-010 alignment)

### Issue

`deserializeSeason(serialized: SerializedSeason | any)` uses `| any` escape hatch, losing compile-time type safety.

### Root Cause

- **Prisma returns conditional types** based on `include` clause (index vs detail endpoints)
- **SerializedSeason is transform OUTPUT**, not deserialize INPUT (one-way schema)
- Function handles multiple input shapes (with/without relations) but lacks proper type

### Options

1. **Keep `| any`** - Pragmatic, runtime-safe, but loses compile-time safety
2. **Use Prisma Payload Types** - Type-safe but couples to Prisma, maintenance overhead
3. **Create SerializedSeasonBase type** ✅ **RECOMMENDED**
    - Define base serialized type matching database format
    - Separate from domain Season type (ADR-010 compliant)
    - Type-safe contract: what repository returns → what deserialize accepts

### Action Items

- [ ] Create `SerializedSeasonBase` type in `useSeasonValidation.ts`
- [ ] Update `deserializeSeason(serialized: SerializedSeasonBase): Season`
- [ ] Document in ADR-010 (serialized types represent DB format, not transform output)

---

## Major Framework Migrations Plan (Remaining)

### Zod 4 Migration (MEDIUM PRIORITY)

**Branch**: `migrate-zod-4`
**Current**: 3.24.1 → **Target**: 4.1.5
**Impact**: MEDIUM - Form validation and API schemas

---

# ✅ COMPLETED

## 🎯🌋 HIGHEST PRIORITY: Household Booking Feature

**Feature Overview:**

- ✅
- **Task 1**: Refactor calendar architecture (DRY) - Create reusable BaseCalendar component for all calendar views

1. useCalendarEvents composable (generic calendar logic):
    - createEventList() - Transform dates into event lists with metadata
    - createEventMap() - Efficient day lookup via Map
    - getEventsForDay() - Get events for a specific day
    - getEventListsForDay() - Get event lists with metadata for a day
    - Exported types: CalendarEvent, CalendarEventList, DayEventList
2. BaseCalendar component (DRY foundation):
    - Wraps UCalendar with consistent configuration
    - Responsive sizing (xl/3 months desktop, sm/1 month mobile)
    - Consistent UI (hides days outside current view)
    - Typed slots: #day="{ day, eventLists }" and #week-day="{ day }"
    - Minimal - delegates to useCalendarEvents composable
3. Domain composables (useSeason):
    - getHolidayDatesFromDateRangeList() - Expand holiday ranges
    - computeCookingDates() - Calculate potential cooking days
    - Domain-specific business logic
4. Specific calendar components (thin wrappers):
    - TeamCalendarDisplay: Team assignments with colored badges + tooltips
    - CalendarDisplay: Potential (rings) vs actual (filled) cooking days
    - Each uses BaseCalendar + domain-specific rendering via slots
