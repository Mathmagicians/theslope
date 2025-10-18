# TODO

## 🎯 URGENT: Team Assignment Algorithm Implementation

**Context**: Implementing team-to-event assignment algorithm using TDD. Functions are implemented incrementally with unit tests first.

---

### ✅ Task 1: Make Affinity Computation Idempotent

**Business Requirement**: Affinity assignment should produce consistent results when called multiple times with same inputs.

**Implementation**:
- ✅ Added unit test: "calling with already-assigned affinities preserves assignments"
- ✅ Verified idempotency guarantee (test passes without code changes)
- ✅ Documented behavior in function implementation

**Verification**: Unit test confirms deterministic output with existing affinities preserved

---

### ✅ Task 2: Sort Teams by Affinity Relative to First Cooking Day

**Business Requirement**: Teams should be assigned in order of their affinity match to the season's first cooking day, ensuring fair rotation.

**Algorithm Implementation**:
1. Find first cooking day in season (uses `findFirstCookingDayInDates()`)
2. Compare affinities by distance from start day
3. Create sorted map of affinities to teams
4. Zigzag through matrix to produce fair team roster

**Completed Functions**:
- ✅ **Task 2.1**: `compareAffinities(startDay)` - Curried comparator function
  - Returns comparator that sorts affinities by weekday distance from startDay
  - Handles wraparound (Sunday to Monday)
  - Unit tests: 3 parameterized scenarios (all passing)

- ✅ **Task 2.2**: `createSortedAffinitiesToTeamsMap(teams, startDay)`
  - Returns `Map<WeekDay, CookingTeam[]>` with keys sorted by distance from startDay
  - Teams with same affinity sorted alphabetically by name
  - Unit tests: 3 scenarios covering single/multiple teams per affinity (all passing)

- ✅ **Task 2.3**: `createTeamRoster(teams, startDay)`
  - Zigzag traversal through affinity matrix for fair distribution
  - Uses `Array.from` to iterate Map entries in insertion order
  - Unit tests: 3 scenarios verifying fair rotation (all passing)

**Verification**: All unit tests in `season.unit.spec.ts` passing for these functions

---

### ✅ Task 3: Implement Round-Robin Assignment Algorithm

**Business Requirement**: Assign teams to dinner events using round-robin rotation based on `consecutiveCookingDays` quota.

**Implementation Complete**:
- ✅ Implemented `computeTeamAssignmentsForEvents()` in `utils/season.ts:161-204`
- ✅ Uses `createTeamRoster()` from Task 2 for affinity-based sorting
- ✅ Handles all edge cases:
  - No teams (return events unchanged)
  - No events (return empty array)
  - More teams than events (some teams get 0 assignments)
  - Already assigned events (skip assignment, not included in rotation)
  - Holiday handling (ghost assignments - team gets credit even when event missing)

**Optimizations Applied**:
- Removed redundant `seasonDates` parameter (use event dates directly)
- Direct Map creation using flatMap (single pass, no intermediate arrays)
- Clean functional style with nullish coalescing

**Verification**: All 43 unit tests passing in `season.unit.spec.ts`

---

## 🎯 HIGHEST PRIORITY: Migration 003 - Remaining E2E Tests

**Remaining work**: Expand E2E test suite for ticket price API and UI validation

---

### Task 8: E2E API Tests - Ticket Price CRUD

**Expand `tests/e2e/api/admin/season.e2e.spec.ts:261`** (add to existing describe block):

**Ticket price tests**:
- [ ] PUT season with 4 ticket prices returns 201 with nested prices
- [ ] PUT season with HUNGRY_BABY (900 øre) persists correctly
- [ ] GET season includes ticketPrices relation
- [ ] POST updates season ticketPrices
- [ ] DELETE season cascades delete ticketPrices
- [ ] Validation: Missing ticket type returns 400
- [ ] Validation: Duplicate types returns 400
- [ ] Edge case: Season without prices returns empty array

---

### Task 9: E2E UI Tests

**Update `tests/e2e/ui/AdminPlanningSeason.e2e.spec.ts`**:

**Create mode**:
- [ ] Default prices load (4 types visible)
- [ ] Prices editable (change ADULT 4000→5000)
- [ ] Season saves with custom prices
- [ ] Verify via API

**Edit mode**:
- [ ] Existing prices load
- [ ] Changes save
- [ ] Verify via API

**View mode**:
- [ ] Read-only formatted display

**Validation**:
- [ ] Cannot save without all 4 types
- [ ] Price range validation

---

## 🎯 HIGH PRIORITY: Team Assignment UI Integration

**Remaining UI work**: 
- [ ] Manual reassignment UI (admin changes team for specific event)
- [ ] Display team assignment counts in UI ("Hold 1: 12 fællesspisninger")
- [ ] User-defined team affinity preferences
- [ ] Use allocationPercentage for team member workload distribution
- [ ] Auto-reassign when teams added/removed
- [ ] Warnings for imbalanced distribution

### Phase 4: Integration & Validation
- [ ] Write integration tests for season-team-event flow
- [ ] Create API documentation
- [ ] Update ADR with team/event architecture decisions

---


## 🎯 HIGH PRIORITY: URL-Based Admin Navigation (DRY Season Selection)

### Goal
Implement URL-based navigation for admin context (season, team) using query parameters, consolidating routing logic and eliminating component duplication.

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
Form validation is working (submit button is disabled when errors exist), but the error message in the footer doesn't display.

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

## Team Assignment Calendar Visualization & UI Integration (2025-10-19)
**Date**: 2025-10-19 | **Compliance**: ADR-007, DRY principles

### Store Integration
- ✅ **assignTeamAffinitiesAndEvents()** orchestration method in plan store
  - Sequential execution: assign affinities → assign teams to events
  - Combined toast notification showing both operation counts
  - Replaces separate function calls with single orchestrated flow
  - Returns `{teamCount, eventCount}` for UI feedback

### Calendar Visualization
- ✅ **TeamCalendarDisplay component** created
  - Shows team cooking assignments with color-coded badges
  - Tooltips display team names on hover
  - Holiday support with green chips
  - Efficient Map-based date lookup for O(1) event access
  - Hides days from adjacent months (`data-[outside-view]:hidden`)
  - Responsive: 3 months on desktop, 1 month on mobile
- ✅ **Integrated into AdminTeams**
  - VIEW mode: Calendar after table showing all teams
  - EDIT mode: Calendar in CookingTeamCard showing only selected team's events
  - Filtered dinner events passed as props to avoid unnecessary data

### UX Improvements
- ✅ **CookingTeamCard layout reorganized** (3-row layout)
  - Header: Team icon + name input + compact member view + delete button
  - Row 1: Affinity selector (1/4 width) + Team calendar (3/4 width)
  - Row 2: Team members (FULL WIDTH, horizontal role columns)
  - Row 3: Inhabitant selector (FULL WIDTH)
  - Compact member view in header (avatar group + count badge)
  - Better information hierarchy on large screens

### Bug Fixes
- ✅ **InhabitantSelector team number display bug fixed**
  - Problem: Regex `/Hold (\d+)/` failed to match "Madhold {n}" team names
  - All people in other teams showed "Madhold 1" regardless of actual team
  - Solution: Pass full teams list as prop, lookup by ID instead of regex
  - Team index determines display number and color (reliable, works with renamed teams)
  - Type-safe: `teams?: Array<{ id: number, name: string }>`

### Files Modified
- `app/stores/plan.ts` - assignTeamAffinitiesAndEvents() orchestration
- `app/components/calendar/TeamCalendarDisplay.vue` - NEW calendar component
- `app/components/admin/AdminTeams.vue` - Calendar integration, teams prop passing
- `app/components/cooking-team/CookingTeamCard.vue` - 3-row layout, teams prop
- `app/components/cooking-team/InhabitantSelector.vue` - ID-based team lookup

### Key Achievements
- Calendar provides visual confirmation of team assignment algorithm
- UX improvements make team management more intuitive on large screens
- Bug fix ensures accurate team status display across all contexts
- All changes follow established ADR patterns (no new technical debt)

---

# ✅ COMPLETED (EARLIER)

## Season Serialization Refactoring (ADR-010: Domain-Driven Serialization Architecture)
**Date**: 2025-10-15 | **Compliance**: ADR-010, ADR-001, ADR-005

### Architecture Changes
- ✅ **Serialization moved to repository layer** - API endpoints work with domain types only
- ✅ **ADR-010 created** - Domain-Driven Serialization Architecture documented
- ✅ **Schema pattern established** - Domain schema (SeasonSchema) + Serialized schema (SerializedSeasonSchema) in composables
- ✅ **Repository transforms** - serialize/deserialize at DB boundary (`createSeason`, `updateSeason`, `fetchSeason`, etc.)
- ✅ **API cleanup** - Endpoints accept/return Season domain type, not SerializedSeason
- ✅ **Factory simplification** - SeasonFactory sends domain objects, no manual serialization
- ✅ **Test regression fixes** - Date regex (single-digit support), factory API usage, mock data DRY (25/25 tests passing)

### Key Benefits
- Clean separation: DB format is implementation detail, not API contract
- Type safety: Domain types throughout app, serialization isolated to repository
- Migration flexibility: Can change DB without touching API/UI
- Testing simplicity: Factories use domain types

## Migration 003 - Ticket Prices and Team Assignment Fields
**Date**: 2025-10-15 | **Compliance**: ADR-001, ADR-002, ADR-005

### Schema Changes
- ✅ Added `HUNGRY_BABY` to TicketType enum
- ✅ Added `affinity: String?` to CookingTeam model (JSON array of weekdays)
- ✅ Added `allocationPercentage: Int @default(100)` to CookingTeamAssignment model
- ✅ Note: `consecutiveCookingDays` already existed in Season model (E2E tests passing)
- ✅ Created and applied migration: `migration_003_ticket_prices_and_team_fields`
- ✅ Generated Prisma client with new types

### Validation & Composables
- ✅ Created `useTicketPriceValidation.ts` composable
  - TicketPriceSchema with id, seasonId, ticketType, price (0-20000 øre), description
  - Exported TicketPrice type
  - Unit tests passing
- ✅ Updated `useSeasonValidation.ts`
  - Imported TicketPriceSchema from useTicketPriceValidation
  - Replaced `z.array(z.any()).optional()` with proper TicketPrice array schema
  - Added validation: At least 1 ticket type required (ADULT, CHILD, BABY, HUNGRY_BABY)
  - Added validation: No duplicate ticket types within same season
  - Updated `deserializeSeason` to handle ticketPrices relation
  - Updated composable tests
- ✅ Updated `useSeason.ts`
  - `getDefaultSeason()` exports default ticket prices
  - Updated composable tests
- ✅ Updated `useCookingTeam.ts`
  - Added `affinity: string | null` to CookingTeam type
  - Added `allocationPercentage: number` to CookingTeamAssignment type
- ✅ Updated `useInhabitant.ts`
  - Added `affinity: string | null` to Inhabitant type

### Repository Layer
- ✅ Created `createTicketPrices()` - batch create ticket prices
- ✅ Created `deleteTicketPrices()` - cleanup helper for season deletion
- ✅ Modified `createSeason()` to accept optional nested `ticketPrices` array
- ✅ Modified `updateSeason()` to handle nested ticketPrice updates (delete + recreate pattern)
- ✅ Verified `deleteSeason()` cascades ticketPrices via Prisma schema (ADR-005)
- ✅ Updated repository to handle team affinity and allocationPercentage
- ✅ Updated E2E CRUD tests to handle team affinity and allocationPercentage

### UI Components
- ✅ Created `TicketPriceListEditor.vue` component
  - Add/remove ticket prices with validation
  - Display ticket type, price (DKK), max age, and description
  - Proper width sizing with Nuxt UI patterns
  - Simplified icon usage (auto-styled by component)
- ✅ Updated `AdminPlanningSeason.vue`
  - Added `<TicketPriceListEditor v-model="model.ticketPrices" />`
  - Handle nested ticketPrices in save operation
  - Display existing prices in EDIT mode
- ✅ Updated `CalendarDateRangeListPicker.vue`
  - Proper width sizing to prevent date cutoff
  - Simplified icon usage

### Test Factories
- ✅ Updated `seasonFactory.ts`
  - Added `ticketPrices` to `defaultSeason()`
  - Note: `consecutiveCookingDays: 2` already present

### E2E Tests
- ✅ ConsecutiveCookingDays tests complete (season.e2e.spec.ts:263-304)
- ✅ Affinity tests complete (team.e2e.spec.ts:252-298)
- ✅ AllocationPercentage tests complete (team.e2e.spec.ts:300-328)

### App Configuration
- ✅ Updated `app.config.ts` with ticket price defaults and team assignment settings

### Key Patterns Applied
- **ADR-001**: Zod schemas in composables for shared validation
- **ADR-002**: Separate validation try-catch blocks
- **ADR-005**: Prisma CASCADE deletion for strong relations (TicketPrice → Season)
- **Nuxt UI v4**: Proper `:ui` prop usage for component styling (`base: 'w-fit min-w-full mr-4'`)
- **Component width sizing**: Using `base` layer instead of `root` for proper content-based sizing

## Cleanup of ai attributions - replaced with grazing unicorns 🦄

## Household Management View (Admin Husstande Tab)
**Date**: 2025-01-28 | **Compliance**: ADR-009

### Implementation
- ✅ **ADR-009 created**: Weight-Based Data Inclusion Strategy for API endpoints
  - Index endpoints include lightweight relations if: bounded cardinality, lightweight data, essential context, performance safe
  - Detail endpoints include comprehensive relations
  - Clear decision criteria documented
- ✅ **HouseholdSummary type** created for lightweight index data
  - Includes basic inhabitant fields (id, name, lastName, pictureUrl, birthDate)
  - Full HouseholdWithInhabitants type for detail operations
- ✅ **AdminHouseholds.vue** component created
  - UTable with address and inhabitants columns
  - Top-level await for SSR-compatible data loading
  - Compact household display with avatar groups and name badges
  - Empty state handling
- ✅ **HouseholdCard.vue** extended with compact mode
  - Boolean `compact` prop (false by default)
  - Compact view: UAvatarGroup (max 3, with tooltips) + UBadge for names
  - Full view: UCard with inhabitant list
- ✅ **E2E tests** (6/6 passing)
  - Load households page
  - Display household with inhabitants
  - Display multiple households
  - Display household without inhabitants (empty state)
  - API test verifying lightweight vs comprehensive data
- ✅ **HouseholdFactory** updated
  - Sequential inhabitant creation (prevents unique constraint violations)
  - Unique inhabitant names (Donald0 Duck, Donald1 Duck, etc.)

### Key Patterns
- **ADR-009 compliance**: GET index returns HouseholdSummary, GET by ID returns HouseholdWithInhabitants
- **Prisma select**: Efficient queries with specific field selection
- **Component reuse**: HouseholdCard supports both compact and full views
- **Type safety**: Separate types for lightweight vs comprehensive data

## Phase 1: Display Generated Events with Calendar Visualization (PR #31: create-dinner-events-for-season)
**Merged**: 2025-10-09

### Auto-Generate Dinner Events
- ✅ Season creation handler auto-generates dinner events via component orchestration
- ✅ Component orchestrates createSeason() → generateDinnerEvents() → toast notification
- ✅ Toast notification: "Sæson oprettet - X fællesspisninger genereret"
- ✅ GET /api/admin/dinner-event endpoint with optional seasonId filter
- ✅ API tests for GET endpoint (all events, filtered by season, validation)
- ✅ Exact count assertions in generate-dinner-events API tests (3 tests)
- ✅ POST /api/admin/season/[id]/generate-dinner-events endpoint
- ✅ Event generation algorithm (cooking days, holidays, date range)
- ✅ E2E API tests for event generation (7 tests passing)

### Calendar Display Component
- ✅ CalendarDisplay.vue shows dinner events with visual indicators:
  - Filled circle (●) for generated events
  - Ring (○) for expected cooking days
- ✅ Season type extended to support optional relations (dinnerEvents, CookingTeams, ticketPrices)
- ✅ Store fetches full season data with relations when selected
- ✅ UI E2E test verifies exact event count after async generation with exponential backoff polling
- ✅ Comprehensive E2E test coverage in AdminPlanningSeason.e2e.spec.ts

### Critical Infrastructure Fixes
- ✅ **Wrangler Environment Configuration** - Fixed login 500 error
  - Implemented three-environment structure (local/dev/prod)
  - Explicit vars and d1_databases for each environment
  - Updated package.json, Makefile, cicd.yml, README.md
- ✅ **CI Cross-Platform Compatibility** - Tests now pass on macOS and Linux
  - Changed text locators to semantic selectors (getByRole)
  - Documented OS-specific rendering differences in testing.md
- ✅ **Async Event Generation Polling** - DinnerEventFactory.waitForDinnerEventsGeneration()
  - Exponential backoff (500ms → 1s → 2s → 4s → 8s)
  - Handles timing issues in CI environment
- ✅ **Nuxt UI 4 Form Submission Bug** - Fixed array mutations not persisting
  - Changed from event.data to model.value for v-model changes
  - Ensures holiday removal works correctly
- ✅ **Repository Type Fixes** - All functions use properly imported types
  - Added relation field exclusion in createSeason and updateSeason
- ✅ **Cloudflare Compatibility Dates** - Updated to 2025-10-01
  - Both nuxt.config.ts and wrangler.toml synchronized
  - Includes latest Node.js compatibility improvements

## Phase 2: Cooking Teams Admin Tab - API
- ✅ PUT/POST/DELETE /api/admin/team endpoints
- ✅ Team member assignment endpoints
- ✅ E2E API tests passing

## Phase 2: Cooking Teams Admin Tab - UI (Immediate Operations Pattern)
**Date**: 2025-01-28 | **Compliance**: ADR-007, ADR-008

### UI Development
- ✅ **Teams tab** added to admin navigation (alongside Planning)
- ✅ **`/admin/teams` page component** created (handled by `/admin/[tab].vue`)
- ✅ **AdminTeams.vue** refactored with immediate operations pattern
  - Partial `useEntityFormManager()` usage (URL/mode management only)
  - Component-owned CREATE draft for dynamic team generation
  - Immediate save operations (add team, delete team, rename on blur)
  - No "Gem ændringer" button - operations save immediately
- ✅ **CookingTeamCard.vue component** created (replaces separate form/list components)
  - Reusable team display component
  - List and standalone variants
  - Edit mode with immediate save-on-blur for team names
  - View mode for read-only display

### Testing
- ✅ **E2E tests for teams workflow** (9/9 passing)
  - Create teams via batch generation
  - Add team (immediate save)
  - Delete team (immediate save)
  - Rename team (save on blur)
  - All immediate operations verified via API
- ✅ **AdminPlanning verified** working after refactor

### Infrastructure Fixes
- ✅ **Fixed hydration mismatch**
  - SSR-safe mode initialization from URL query parameters
  - Synchronous `formMode` initialization prevents server/client mismatch

### Architecture Patterns Documented
- ✅ **ADR-008 created**: Form Draft Ownership and Operation Patterns
  - Deferred Save Pattern (AdminPlanning) - full composable usage
  - Immediate Operations Pattern (AdminTeams) - partial composable usage
  - Clear decision criteria for when to use each pattern
- ✅ **Draft ownership clarified**
  - Composable: URL/mode management (always)
  - Component: CREATE draft when dynamic generation needed
  - Live data: EDIT/VIEW modes show store data directly

### Key Learnings
- `useEntityFormManager` designed for deferred-save patterns
- Components can opt out of draft management for immediate operations
- Separation: composable handles URL sync, component handles business logic
- No synchronization issues when showing live data in EDIT mode

## Phase 3: Team Member Assignment - Master-Detail Pattern
**Date**: 2025-10-10 | **Compliance**: ADR-007, ADR-008

### UI Implementation
- ✅ **Master-Detail Layout** implemented in AdminTeams.vue
  - Left panel: Vertical team tabs with member count badges
  - Right panel: Selected team editor with member management
  - Responsive design (stacks vertically on mobile)
- ✅ **Team selection state** (selectedTeamIndex) with active highlighting
- ✅ **InhabitantSelector component** created
  - Searchable table with filtering for 100-200 users
  - TanStack Table integration with sorting
  - Shows current team assignments inline
  - Add member functionality with role selection
- ✅ **CookingTeamCard enhanced** for member display
  - Shows current members grouped by role (Chef, Cook, Junior Helper)
  - Remove member functionality (immediate delete)
  - Compact and full view modes
- ✅ **useCookingTeam composable** created
  - Team color generation (blue, green, amber, rose, etc.)
  - Default team factory functions
  - Shared team utilities

### Testing & Best Practices
- ✅ **E2E test refactoring** - Playwright best practices applied
  - Removed all `waitForLoadState('networkidle')` calls (22 tests in admin.e2e.spec.ts)
  - Direct URL navigation instead of click-based routing (avoids hydration timing issues)
  - API response waiting pattern with `page.waitForResponse()`
  - DRY refactoring with consolidated test data arrays
- ✅ **Test helper utilities** expanded
  - `selectDropdownOption()` with API wait support
  - `pollUntil()` for async operations
  - `captureDebugScreenshot()` for debugging
- ✅ **Testing documentation updated** (docs/testing.md)
  - Playwright best practices documented
  - CI/CD compatibility patterns (macOS vs Linux)
  - Hydration timing issue solutions
- ✅ **Data-testid selectors** added for robust test selection
  - `data-testid="team-name-input"`
  - `data-testid="delete-team-button"`
  - `data-testid="add-team-button"`

### Architecture Achievements
- Master-detail UX pattern successfully implemented
- Immediate operations for all member add/remove actions
- Fully tested with both API and UI E2E tests
- Cross-platform CI compatibility (macOS and Linux)

## Phase 2: useEntityFormManager() Composable Pattern (TDD Composition Pattern)
**Date**: 2025-01-28 | **Compliance**: ADR-007

### Implementation
- ✅ **Unit tests written first** (`tests/component/composables/useEntityFormManager.nuxt.spec.ts`)
  - Form mode state management (view/edit/create)
  - Draft entity state transitions
  - URL query parameter synchronization
  - currentModel computed property logic
  - Initialization from URL query on mount
  - Edge cases (null entities, reactive updates)
- ✅ **Composable implemented** (`app/composables/useEntityFormManager.ts`)
  - Generic form mode management for any entity type
  - Draft vs selected entity logic (prevents store mutation)
  - URL sync using `navigateTo()` with `{replace: true}`
  - Reactive `watch()` for v-model updates (handles FormModeSelector changes)
- ✅ **AdminPlanning.vue refactored** to use composable
  - Reduced from ~197 lines to ~140 lines
  - Removed 60+ lines of manual form management code
  - Kept season-specific business logic (`generateDinnerEvents`, `handleSeasonUpdate`)
  - E2E tests passing (matrix tests for Planning + Teams tabs)

### Key Patterns Established
- **Composition over duplication**: Reusable form logic extracted to composable
- **v-model + watch pattern**: FormModeSelector uses `defineModel` (emits `update:modelValue`), composable watches `formMode` ref for URL sync
- **ADR-007 compliance**: UI state (formMode, draftEntity) in component/composable, server data in store
- **Generic type support**: `useEntityFormManager<T>()` works with any entity type

### Architecture Benefits
- DRY principle: Form management logic written once, reused across admin tabs
- Type safety: Generic TypeScript types ensure compile-time correctness
- Testability: Composable tested independently, components focus on business logic
- Maintainability: Changes to form logic propagate to all consumers automatically

## BDD/TDD Tests Completed (ADR-005 compliance)

**Season Aggregate** (tests/e2e/api/admin/season.e2e.spec.ts):
- ✅ Task 2a: PUT should create season with cooking teams (line 118)
- ✅ Task 2b: DELETE should cascade delete cooking teams (line 148)
- ✅ Task 2b: DELETE should cascade delete dinner events (line 177)
- ✅ Task 2b: DELETE should cascade delete complete seasonal aggregate (line 214)

**CookingTeam Aggregate** (tests/e2e/api/admin/team.e2e.spec.ts):
- ✅ Task 1b: PUT creates team with assignments + DELETE cascades (line 52)
- ✅ Task 1b: PUT /api/admin/team/[id]/members adds assignments (line 175)
- ✅ Task 1b: DELETE /api/admin/team/[id]/members removes assignments (line 188)

**Household Aggregate** (tests/e2e/api/admin/household.e2e.spec.ts):
- ✅ Task 3a: PUT can create household with inhabitants (line 68)
- ✅ Task 3b: DELETE should cascade delete inhabitants (line 89)

**Inhabitant Aggregate** (tests/e2e/api/admin/inhabitant.e2e.spec.ts):
- ✅ Task 4a: Inhabitant with User weak relation tests (line 85+)
- ✅ Task 4b: DELETE should cascade delete cooking team assignments (line 122)

## Path-based admin navigation
**Status**: COMPLETED - Successfully migrated from fragment-based to path-based routing

### Implementation Summary
- ✅ Path-based routing implemented: `/admin/planning`, `/admin/users`, etc.
- ✅ Clean URLs: Replaced fragment URLs (`/admin#adminplanning`) with paths (`/admin/planning`)
- ✅ Single page component maintained: Used `[tab].vue` dynamic routing
- ✅ Invalid route handling: `/admin/unicorn` redirects to `/admin/planning`
- ✅ Tests updated and passing: All 13 E2E tests passing
- ✅ Documentation added: Admin URLs documented in README.md

### Architecture Benefits Achieved
- Better SEO with distinct page URLs
- Cleaner, more intuitive URLs
- Simplified navigation logic (removed ~50 lines of fragment sync code)
- Standard browser back/forward behavior
- Query parameters work seamlessly with paths

## Major Framework Migrations Completed

### Phase 1: Dependency Updates ✅
- ✅ Safe dependency updates (PR #21) - MERGED
- ✅ Wrangler 4 migration (PR #22) - IN REVIEW
- ✅ Security vulnerabilities resolved (0 vulnerabilities)

### Phase 2: Major Framework Updates ✅
- ✅ Nuxt 4 + Nuxt UI + Tailwind CSS Migration

## CookingTeam Affinity UI Implementation (2025-10-16)
**Compliance**: ADR-007, DRY principles

### Implementation
- ✅ **WeekDayMapDisplay component** enhanced with edit mode
  - UFormField integration for consistent form UI styling
  - Checkbox handlers for adding/removing cooking days
  - Factory method (`createDefaultWeekdayMap`) for null affinity initialization
  - Type-safe color prop using `BadgeProps['color']` from Nuxt UI (DRY)
  - Compact mode with color-coded day badges (soft variant)
  - Full mode with labeled checkboxes for editing
- ✅ **CookingTeamCard layout** reorganized
  - Moved team affinity section above members section
  - Better visual hierarchy in edit mode
- ✅ **AdminTeams handlers** connected
  - `handleUpdateTeamAffinity` for immediate save to DB
  - Store refresh pattern after updates
  - Toast notifications for user feedback

### Key Achievements
- Affinity field fully editable in UI with immediate save
- Type safety maintained using Nuxt UI's own type definitions
- Component reusability (WeekDayMapDisplay used in both compact and full modes)
- Consistent form styling across all admin forms

## Team Affinity Auto-Assignment (2025-10-17)
**Date**: 2025-10-17 | **Files**: `assign-team-affinities.post.ts`, `plan.ts`, `AdminTeams.vue`

- ✅ **API endpoint** `POST /season/[id]/assign-team-affinities` - Calculates and assigns affinities using `computeAffinitiesForTeams` from `app/utils/season.ts`
- ✅ **Store integration** - `assignTeamAffinities()` method in plan store with refresh
- ✅ **Automatic flow** - Affinities auto-assigned after batch team creation and single team addition
- ✅ **E2E test** - `season.e2e.spec.ts:493-533` verifies all cooking days assigned to exactly one team
- ✅ Pattern follows dinner event generation (create → auto-generate → toast notification)

## Team-to-Event Assignment Algorithm (2025-10-18)
**Date**: 2025-10-18 | **Compliance**: TDD, Functional Programming, ADR-002 | **Status**: READY TO SHIP 🚀

### TDD Implementation (Red-Green-Refactor)
- ✅ **Task 1**: Idempotent affinity computation
  - Unit tests written first for affinity preservation
  - Implementation using functional approach with nullish coalescing
  - Teams with existing affinities remain unchanged

- ✅ **Task 2**: Affinity-based team sorting (3 functions)
  - **`compareAffinities(startDay)`**: Curried comparator using circular weekday distance
  - **`createSortedAffinitiesToTeamsMap(teams, weekDay)`**: Groups teams by affinity, sorted by distance
  - **`createTeamRoster(startDay, teams)`**: Zigzag matrix traversal for fair distribution
  - 12 parameterized unit tests (all passing)

- ✅ **Task 3**: Round-robin event assignment
  - **`computeTeamAssignmentsForEvents(teams, cookingDays, consecutiveCookingDays, events)`**
  - Handles all edge cases: no teams, no events, pre-assigned events, holidays (ghost assignments)
  - 12 unit test scenarios covering quota tracking and rotation (all passing)

### Code Quality & Optimizations
- ✅ **Style improvements applied**
  - Fixed JSDoc comments and typos
  - Removed redundant code (`|| []` after filter, extra blank lines)
  - Better variable naming (`event` → `cookingDate`)
  - Split long lines for readability
  - Added comprehensive function documentation

- ✅ **Performance optimizations**
  - Removed redundant `seasonDates` parameter (use event dates directly)
  - Direct Map creation with flatMap (single pass, no intermediate arrays)
  - Functional style with nullish coalescing and type predicates
  - Fixed Prisma relation name bug (`season` → `Season`)

### API Integration
- ✅ **Endpoint**: `POST /api/admin/season/[id]/assign-cooking-teams`
  - Flat try-catch structure (ADR-002 compliance)
  - Fetches season with teams and events
  - Uses `assignTeamsToEvents()` composable
  - Batch updates all dinner events with computed assignments
  - Returns assignment summary with event count

- ✅ **Store integration**: `assignCookingTeamsToEvents()` method in plan store
- ✅ **E2E test**: Integrated into existing affinity test (combined workflow)
  - Creates season with 3 teams, generates 3 events
  - Assigns affinities, then assigns teams to events
  - Verifies all events have team assignments (round-robin distribution)

### Test Coverage
- ✅ **Unit tests**: 43/43 passing (`season.unit.spec.ts`)
- ✅ **E2E API test**: 1/1 passing (`season.e2e.spec.ts:494-560`)
- ✅ **All functions tested**: Idempotency, sorting, roster creation, event assignment
- ✅ **Edge cases covered**: Empty arrays, pre-assigned events, holiday gaps

### Key Technical Achievements
- Pure functional programming with no side effects
- Type-safe Map usage instead of Record for proper ordering
- Zigzag matrix traversal algorithm for fair team distribution
- Ghost assignment pattern for holiday handling
- Clean separation: algorithm (utils) → composable → API → store → UI

### Files Modified
- `app/utils/season.ts` - Core algorithm functions (200 lines, fully documented)
- `tests/component/utils/season.unit.spec.ts` - Comprehensive unit test suite
- `server/routes/api/admin/season/[id]/assign-cooking-teams.post.ts` - API endpoint
- `tests/e2e/api/admin/season.e2e.spec.ts` - E2E integration test
- `server/data/prismaRepository.ts` - Fixed Prisma relation name bug

**READY TO SHIP** - All tests green, code reviewed, optimized, and fully integrated! 🎉
