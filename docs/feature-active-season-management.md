# Feature: Active Season Management

**Status:** Planning
**Created:** 2025-11-11
**ADRs:** ADR-001 (Zod), ADR-002 (API Patterns), ADR-003 (Testing), ADR-010 (Domain Types)

## Overview

Implement comprehensive active season management allowing administrators to set/unset active seasons with automatic "most appropriate" season selection, visual indicators in UI, and sorting capabilities.

## Business Rules

1. **Single Active Season:** At most one season can be active at any time
2. **No Past Active:** Seasons with end dates in the past cannot be set as active
3. **Database Authority:** `isActive` field in database is source of truth
4. **Auto-Selection:** If no active season exists and admin triggers activation without ID, system selects most appropriate season
5. **Selection Priority:** Future season closest to today > Current season > Most recent past season

## Technical Requirements

### Database Schema
**No changes needed** - `Season.isActive` field already exists in `prisma/schema.prisma`

### Domain Logic (Pure Functions)

**Location:** `app/composables/useSeason.ts`

```typescript
/**
 * Determine if a season can be active (not in the past)
 * Pure function - no side effects
 */
export function canSeasonBeActive(season: Season, referenceDate: Date = new Date()): boolean

/**
 * Select the most appropriate season to activate
 * Priority: 1) Future closest to today, 2) Current (includes today), 3) Most recent past
 * Pure function - no side effects
 */
export function selectMostAppropriateActiveSeason(seasons: Season[], referenceDate: Date = new Date()): Season | null

/**
 * Categorize season status relative to today
 * Returns: 'active' | 'future' | 'current' | 'past'
 * Pure function - no side effects
 */
export function getSeasonStatus(season: Season, referenceDate: Date = new Date()): 'active' | 'future' | 'current' | 'past'

/**
 * Sort seasons by relevance to active season selection
 * Order: Active first, then future (closest), then past (most recent)
 * Pure function - no side effects
 */
export function sortSeasonsByActivePriority(seasons: Season[], referenceDate: Date = new Date()): Season[]
```

### API Endpoints

#### New: POST `/api/admin/season/active`
**Purpose:** Set active season (or auto-select if no ID provided)

```typescript
// Request body schema
const SetActiveSeasonSchema = z.object({
  seasonId: z.number().int().positive().optional()
})

// Response type
type SetActiveSeasonResponse = {
  previousActiveSeasonId: number | null
  newActiveSeasonId: number
  autoSelected: boolean  // true if no seasonId provided
  newActiveSeason: Season
}
```

**Behavior:**
1. If `seasonId` provided:
   - Validate season exists and can be active (not past)
   - Set all seasons `isActive = false`
   - Set specified season `isActive = true`
2. If no `seasonId`:
   - Fetch all seasons
   - Call `selectMostAppropriateActiveSeason()`
   - Set selected season `isActive = true`
3. Return previous and new active season info

#### Modified: GET `/api/admin/season/active.get.ts`
**Current:** Returns hardcoded season
**New:** Returns actual active season from database

```typescript
// Query all seasons where isActive = true
// Should return 0 or 1 results (business rule)
// If 0: return null (no active season)
// If 1: return the active season
```

### Repository Functions

**Location:** `server/data/prismaRepository.ts`

```typescript
/**
 * Set a season as active, deactivating all others
 * Atomic operation - updates all in single transaction (via batch update)
 */
export async function setActiveSeason(
  d1Client: D1Database,
  seasonId: number
): Promise<Season>

/**
 * Deactivate all seasons
 */
export async function deactivateAllSeasons(
  d1Client: D1Database
): Promise<number>  // Returns count of updated seasons

/**
 * Fetch current active season (if any)
 */
export async function fetchActiveSeason(
  d1Client: D1Database
): Promise<Season | null>
```

### UI Components

#### SeasonSelector Enhancement
**Location:** `app/components/admin/SeasonSelector.vue`

**Visual Indicators:**
- **Green bulb** (`i-heroicons-light-bulb` solid): Active season
- **Dashed circle** (`i-heroicons-circle-dashed`): Future seasons (can be active)
- **Archive icon** (`i-heroicons-archive-box`): Past seasons (cannot be active)

**Sorting:**
- Add sort dropdown with options:
  - "Relevance" (default): Active → Future (closest) → Past (recent)
  - "Name": Alphabetical by shortName
  - "Dates": By seasonDates.start

#### AdminPlanning Integration
**Location:** `app/components/admin/AdminPlanning.vue`

Add button/toggle in season header:
- "Set as Active Season" button (only visible if season can be active)
- "Active Season" badge (if season is active)
- Calls POST `/api/admin/season/active` with seasonId

### Store Updates

**Location:** `app/stores/plan.ts`

```typescript
// Add computed
const activeSeason = computed(() =>
  seasons.value.find(s => s.isActive) || null
)

// Add action
const setActiveSeason = async (seasonId?: number) => {
  const response = await $fetch('/api/admin/season/active', {
    method: 'POST',
    body: { seasonId }
  })
  // Refresh seasons to reflect new isActive state
  await refreshSeasons()
  return response
}
```

## Implementation Plan (TDD)

### Phase 1: Domain Logic (Pure Functions)
**Files:** `app/composables/useSeason.ts`, `tests/component/composables/useSeason.unit.spec.ts`

1. **Write failing tests** for pure functions (RED)
   - `canSeasonBeActive()` - test with past/current/future seasons
   - `selectMostAppropriateActiveSeason()` - test priority logic
   - `getSeasonStatus()` - test all status categories
   - `sortSeasonsByActivePriority()` - test sort order

2. **Implement functions** (GREEN)
   - Date comparison logic
   - Priority selection algorithm
   - Status categorization
   - Sort comparator

3. **Refactor** - ensure pure functions, no side effects

**Acceptance:** All unit tests pass, functions are pure (referenceDate injectable for testing)

### Phase 2: Repository Functions
**Files:** `server/data/prismaRepository.ts`, `tests/e2e/api/season-active.e2e.spec.ts`

1. **Write failing E2E tests** (RED)
   - Test `setActiveSeason()` deactivates others
   - Test `deactivateAllSeasons()` updates count
   - Test `fetchActiveSeason()` returns correct season

2. **Implement repository functions** (GREEN)
   - Use Prisma batch updates for atomicity
   - Validate season exists before activation
   - Handle null case for no active season

3. **Refactor** - ensure ADR-010 compliance (domain types)

**Acceptance:** E2E tests pass, only one season can be active

### Phase 3: API Endpoints
**Files:** `server/routes/api/admin/season/active.post.ts`, `server/routes/api/admin/season/active.get.ts`, `tests/e2e/api/season-active.e2e.spec.ts`

1. **Write failing E2E tests** (RED)
   ```typescript
   describe('POST /api/admin/season/active', () => {
     it('GIVEN valid seasonId WHEN setting active THEN deactivates others', async () => {})
     it('GIVEN past season WHEN setting active THEN returns 400', async () => {})
     it('GIVEN no seasonId WHEN setting active THEN auto-selects', async () => {})
   })

   describe('GET /api/admin/season/active', () => {
     it('GIVEN active season exists WHEN fetching THEN returns season', async () => {})
     it('GIVEN no active season WHEN fetching THEN returns null', async () => {})
   })
   ```

2. **Implement endpoints** (GREEN)
   - POST: Input validation, business logic orchestration
   - GET: Remove hardcoded response, query database
   - Both: Follow ADR-002 (separate try-catch blocks)

3. **Refactor** - ensure proper error handling, logging

**Acceptance:** All E2E tests pass, endpoints follow ADR-002

### Phase 4: Store Integration
**Files:** `app/stores/plan.ts`, `tests/component/stores/plan.nuxt.spec.ts`

1. **Write failing tests** (RED)
   - Test `activeSeason` computed
   - Test `setActiveSeason()` action
   - Test seasons refresh after activation

2. **Implement store logic** (GREEN)
   - Add computed and action
   - Ensure ADR-007 compliance (no abdication)

3. **Refactor** - ensure proper error handling

**Acceptance:** Store tests pass, no ADR violations

### Phase 5: UI Components
**Files:** `app/components/admin/SeasonSelector.vue`, `app/components/admin/AdminPlanning.vue`

1. **Write failing component tests** (RED)
   - SeasonSelector: Test visual indicators render
   - SeasonSelector: Test sort functionality
   - AdminPlanning: Test "Set Active" button visibility

2. **Implement UI** (GREEN)
   - Add icons based on `getSeasonStatus()`
   - Add sort dropdown and logic
   - Add active season controls to AdminPlanning

3. **Write E2E tests** for user workflow (RED → GREEN)
   ```typescript
   test('GIVEN admin WHEN setting season active THEN UI reflects change', async ({ page }) => {
     // Navigate to AdminPlanning
     // Select a future season
     // Click "Set as Active Season"
     // Verify green bulb appears
     // Verify previous active season loses green bulb
   })
   ```

**Acceptance:** Component tests pass, E2E workflow passes, UI matches design

### Phase 6: Integration & Polish
1. **Manual testing** - test full user workflow
2. **Edge case verification**:
   - No seasons exist
   - All seasons are in the past
   - Multiple admins setting active concurrently
3. **Documentation updates**:
   - Update user guide (how to set active season)
   - Update API documentation
4. **Performance check** - ensure no N+1 queries

## Testing Strategy

### Unit Tests (Vitest)
- ✅ Pure functions in `useSeason()` - 100% coverage
- ✅ All edge cases for date comparisons
- ✅ All sorting scenarios

### Component Tests (Vitest + @nuxt/test-utils)
- ✅ Store actions and computeds
- ✅ SeasonSelector visual indicators
- ✅ AdminPlanning controls

### E2E Tests (Playwright)
- ✅ API endpoints (POST/GET active season)
- ✅ Repository functions (via API)
- ✅ Full user workflow (set active via UI)
- ✅ Auto-selection logic (POST without ID)

## Edge Cases to Handle

1. **No seasons exist:** GET returns null, POST returns 404
2. **All seasons past:** Auto-select selects most recent past, POST with ID returns 400
3. **Concurrent activation:** Database constraint ensures only one active (last write wins)
4. **Active season deleted:** Database cascade sets `isActive = false` before delete
5. **Season dates updated:** If active season moved to past, UI shows warning (future enhancement)

## UI/UX Specifications

### Visual Design Mockups

#### SeasonSelector with Status Indicators

```
┌─────────────────────────────┐
│ ▼ Vælg sæson               │
│ ───────────────────────────  │
│ ● Forår 2025               │  ◄─── ACTIVE (solid green circle)
│ ◌ Efterår 2025              │  ◄─── FUTURE (dashed green circle)
│ ◌ Forår 2026                │  ◄─── FUTURE (dashed green circle)
│ ◉ Efterår 2024              │  ◄─── PAST (solid grey circle)
│ ◉ Forår 2024                │  ◄─── PAST (solid grey circle)
└─────────────────────────────┘

Season Status Legend:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● Forår 2025           🟢 ACTIVE    (solid green circle)
◌ Efterår 2025         🟢 FUTURE    (dashed green circle)
◉ Efterår 2024         ⚫ PAST      (solid grey circle)

Sorting: Active → Future (by start date) → Past (by start date descending)
```

#### AdminPlanning - Active Season View

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIEWING ACTIVE SEASON (Forår 2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Vis fællesspisning sæson                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 🟢 AKTIV SÆSON                                                │  │
│  │ Denne sæson er synlig for alle beboere og kan bookes         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Sæson: [Forår 2025]        Periode: 01/01/2025 - 30/06/2025       │
│  ...                                                                 │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                         [Edit]        │
└─────────────────────────────────────────────────────────────────────┘
```

#### AdminPlanning - Future Season View

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIEWING FUTURE SEASON (Efterår 2025)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Vis fællesspisning sæson                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ ⏳ FREMTIDIG SÆSON                                            │  │
│  │ Denne sæson starter om 45 dage. Kun synlig for admins.       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Sæson: [Efterår 2025]      Periode: 01/08/2025 - 31/12/2025       │
│  ...                                                                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 💡 Gør denne sæson aktiv?                                     │ │
│  │                                                                │ │
│  │ Når du aktiverer denne sæson:                                 │ │
│  │ • Beboere kan se og booke fællesspisninger                    │ │
│  │ • Nuværende aktive sæson (Forår 2025) deaktiveres            │ │
│  │                                                                │ │
│  │                   [✓ Aktiver denne sæson]                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                         [Edit]        │
└─────────────────────────────────────────────────────────────────────┘
```

#### AdminPlanning - Past Season View

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIEWING PAST SEASON (Efterår 2024)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Vis fællesspisning sæson                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 📁 ARKIVERET SÆSON                                            │  │
│  │ Denne sæson er afsluttet. Kun synlig for admins.             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Sæson: [Efterår 2024]      Periode: 01/08/2024 - 31/12/2024       │
│  ...                                                                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ℹ️  Arkiverede sæsoner                                         │ │
│  │                                                                │ │
│  │ Gamle sæsoner kan ikke genaktiveres. De bevares til           │ │
│  │ regnskab og historik.                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                         [Edit]        │
└─────────────────────────────────────────────────────────────────────┘
```

### SeasonSelector Icons
```typescript
const seasonIcon = computed(() => {
  const status = getSeasonStatus(season.value)
  switch (status) {
    case 'active':
      return 'i-heroicons-light-bulb'  // Green, solid
    case 'future':
    case 'current':
      return 'i-heroicons-circle-dashed'  // Blue, dashed
    case 'past':
      return 'i-heroicons-archive-box'  // Gray
  }
})

const seasonIconColor = computed(() => {
  const status = getSeasonStatus(season.value)
  switch (status) {
    case 'active': return 'text-green-500'
    case 'future':
    case 'current': return 'text-blue-500'
    case 'past': return 'text-gray-400'
  }
})
```

### Sort Options
```typescript
const sortOptions = [
  { value: 'relevance', label: 'Relevance (Active First)' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'dates', label: 'Start Date' }
]
```

### AdminPlanning Controls
```html
<UButton
  v-if="canSeasonBeActive(selectedSeason)"
  :disabled="selectedSeason.isActive"
  @click="setActiveSeason(selectedSeason.id)"
>
  {{ selectedSeason.isActive ? 'Active Season' : 'Set as Active Season' }}
</UButton>

<UBadge v-if="selectedSeason.isActive" color="green">
  Active
</UBadge>
```

## Definition of Done

- [ ] All unit tests pass (pure functions)
- [ ] All component tests pass (store, UI)
- [ ] All E2E tests pass (API, user workflow)
- [ ] POST `/api/admin/season/active` implemented and tested
- [ ] GET `/api/admin/season/active` updated (no longer hardcoded)
- [ ] SeasonSelector shows correct visual indicators
- [ ] SeasonSelector supports sorting
- [ ] AdminPlanning has "Set Active" controls
- [ ] Store has `activeSeason` computed and action
- [ ] Repository functions handle atomicity
- [ ] Edge cases handled gracefully
- [ ] No ADR violations (ran compliance checks)
- [ ] Documentation updated
- [ ] Manual testing completed
- [ ] Code reviewed and approved

## Risk Assessment

**Low Risk:**
- Pure functions (easily testable)
- Existing `isActive` field (no migration)
- Single endpoint change (isolated)

**Medium Risk:**
- UI changes (requires E2E testing)
- Auto-selection logic (needs thorough testing)

**Mitigations:**
- TDD approach ensures correctness
- Comprehensive E2E tests catch integration issues
- Pure functions enable predictable behavior

## Estimated Effort

- **Phase 1 (Domain Logic):** 2-3 hours
- **Phase 2 (Repository):** 1-2 hours
- **Phase 3 (API):** 2-3 hours
- **Phase 4 (Store):** 1 hour
- **Phase 5 (UI):** 3-4 hours
- **Phase 6 (Integration):** 1-2 hours

**Total:** 10-15 hours

## Notes

- Pure functions in `useSeason()` accept `referenceDate` parameter for testing (defaults to `new Date()`)
- Database has no transaction support (D1), so we use batch updates for atomicity
- Consider adding migration to ensure only one `isActive = true` exists (future enhancement)
- Consider webhook/event when active season changes (future enhancement)
