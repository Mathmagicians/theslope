# Feature: Active Season Management

## Overview

Implement comprehensive active season management allowing administrators to set/unset active seasons with automatic "most appropriate" season selection, visual indicators in UI, and sorting capabilities.

## Business Rules

1. **Single Active Season:** At most one season can be active at any time
2. **No Past Active:** Seasons with end dates in the past cannot be set as active
3. **Database Authority:** `isActive` field in database is source of truth
4. **Auto-Selection:** If no active season exists and admin triggers activation without ID, system selects most appropriate season
5. **Selection Priority:** Future season closest to today > Current season > Most recent past season

### API Endpoints

#### New: POST `/api/admin/season/active`
**Purpose:** Set active season (or auto-select if no ID provided)


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


## Implementation Plan (TDD)

### Phase 1: Domain Logic (Pure Functions)
**Files:** `app/composables/useSeason.ts`, `tests/component/composables/useSeason.unit.spec.ts`
**Acceptance:** All unit tests pass, functions are pure (referenceDate injectable for testing)

### Phase 2: Repository Functions
**Files:** `server/data/prismaRepository.ts`, `tests/e2e/api/season-active.e2e.spec.ts`

1. **Write failing E2E tests** (RED)
   - Test `setActiveSeason()` deactivates others
   - Test `deactivateAllSeasons()` updates count
   - Test `fetchActiveSeason()` returns correct season

**Acceptance:** E2E tests pass, only one season can be active

### Phase 3: API Endpoints
**Files:** `server/routes/api/admin/season/active.post.ts`, `server/routes/api/admin/season/active.get.ts`, `tests/e2e/api/season-active.e2e.spec.ts`
**Acceptance:** All E2E tests pass, endpoints follow ADR-002

### Phase 4: Store Integration
**Files:** `app/stores/plan.ts`, `tests/component/stores/plan.nuxt.spec.ts`

### Phase 5: UI Components
**Files:** `app/components/admin/SeasonSelector.vue`, `app/components/admin/AdminPlanning.vue`

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
