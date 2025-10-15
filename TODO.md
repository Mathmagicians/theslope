# TODO
## IMMEDIATE BROKEN
- Hvornår holder fællesspisning fri?
  Start dato
  11/08/2025 (season start date has been changed to2026)

Slut dato
11/08/2025

- ticket is much shorter than its content in create / view
- when zod forms has an error, and the submit is disabled, an error message should be showm in the footer

## 🎯 HIGHEST PRIORITY: Refactor Serialization to Repository Layer (Architectural Fix)

**Problem**: Current implementation violates separation of concerns - API endpoints expect serialized data (DB format) instead of domain objects.

**Impact**:
- API layer leaks DB implementation details (JSON string storage)
- Client must serialize/deserialize (see `seasonFactory.ts:79`)
- API contract changes if we migrate from SQLite to PostgreSQL
- Harder to test and maintain

**Solution**: Move serialization to repository layer where it belongs (DB implementation detail).

**Implementation**:
- [ ] Refactor Season validation schemas (`app/composables/useSeasonValidation.ts`)
  - [ ] Remove `SerializedSeasonValidationSchema` (no longer needed - API doesn't validate serialized format)
  - [ ] Keep `SerializedSeasonSchema` transform (used internally by repository)
  - [ ] Export only domain types: `Season`, `SerializedSeason` (for repository use)
- [ ] Refactor Season endpoints (`server/routes/api/admin/season/*.ts`)
  - [ ] Change `index.put.ts` to accept `SeasonSchema` instead of `SerializedSeasonValidationSchema`
  - [ ] Change `[id].post.ts` to accept `SeasonSchema` instead of `SerializedSeasonValidationSchema`
  - [ ] Endpoints accept domain objects (Season type)
  - [ ] Endpoints return domain objects (Season type) - not serialized format
- [ ] Refactor Season repository (`server/data/prismaRepository.ts`)
  - [ ] `createSeason(d1, season: Season): Promise<Season>` - serialize internally before DB, deserialize response
  - [ ] `updateSeason(d1, id, season: Season): Promise<Season>` - serialize internally before DB, deserialize response
  - [ ] `fetchSeasons(d1): Promise<Season[]>` - deserialize responses
  - [ ] `fetchSeason(d1, id): Promise<Season>` - deserialize response
  - [ ] Repository owns all ser/deser logic
- [ ] Update E2E test factories (`tests/e2e/testDataFactories/seasonFactory.ts`)
  - [ ] Remove `serializeSeason()` calls from `createSeason()` (line 79)
  - [ ] Factory sends domain objects to API
  - [ ] Remove `deserializeSeason()` calls (API returns domain objects)
- [ ] Verify all Season E2E tests pass
- [ ] Apply same pattern to CookingTeam implementation (do it right from the start)
  - [ ] Don't create `SerializedCookingTeamValidationSchema` in composable
  - [ ] CookingTeam endpoints accept/return domain objects only
  - [ ] Repository handles all serialization
  - [] update ADR005 about serialization/deser responsibility

**Architecture Compliance**:
- ✅ ADR-001: Clean separation between layers
- ✅ ADR-005: Repository pattern - data transformation is repository concern
- ✅ Clean Architecture: Dependency rule - domain shouldn't know about persistence

---

## 🎯 HIGHEST PRIORITY: CookingTeam Serialization (Affinity Field)

**Impact**: CookingTeam.affinity and CookingTeamAssignment.affinity stored as JSON strings in SQLite

**Implementation**:
- [ ] Update `useCookingTeamValidation.ts` - Add serialize/deserialize functions (follow Season pattern)
  - [ ] Add `SerializedCookingTeamSchema` (affinity as string)
  - [ ] Add `serializeCookingTeam()` function
  - [ ] Add `deserializeCookingTeam()` function
  - [ ] Add `SerializedCookingTeamAssignmentSchema`
  - [ ] Add `serializeCookingTeamAssignment()` function
  - [ ] Add `deserializeCookingTeamAssignment()` function
- [ ] Update `tests/e2e/testDataFactories/seasonFactory.ts`
  - [ ] Serialize teams in `createCookingTeamForSeason()` before API call
  - [ ] Serialize assignments in `assignMemberToTeam()` before API call
- [ ] Update `server/data/prismaRepository.ts`
  - [ ] Import `SerializedCookingTeam` type
  - [ ] Update `createTeam()` signature to accept serialized type

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
- [ ] Validation: Price out of range returns 400
- [ ] Edge case: Season without prices returns empty array

**Team schema tests**:
- [ ] PUT team with affinity JSON persists correctly
- [ ] PUT assignment with allocationPercentage persists correctly

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

### Remaining Factory Work

**Update `tests/e2e/testDataFactories/cookingTeamFactory.ts`**:
- [ ] Add `affinity: null` to default team
- [ ] Add helper: `createTeamWithAffinity(seasonId, name, weekdays[])`

**Remaining Repository Work**:
- [ ] Create `updateTicketPrice(d1Client, id, priceData)` - single update (if needed)
- [ ] Update repository to handle team affinity and allocationPercentage

---

## 🎯 HIGH PRIORITY: Team Assignment to Dinner Events
**Milestone**: Automatic assignment of cooking teams to dinner events with affinity-based round-robin distribution

**Overview**:
When teams are created for a season, they are automatically assigned to dinner events based on:
- Round-robin rotation through teams
- Team affinities (calculated from `consecutiveCookingDays`)
- Holiday handling (teams get "credit" even when event doesn't exist)
- Preserves existing assignments (additive, not destructive)

---

### Task 1: Database Schema Changes

**Prisma Schema Updates**:
- [x ] Add `consecutiveCookingDays: Int @default(2)` to Season model
- [x ] Add `affinity: String?` to CookingTeam model (JSON array of weekdays)
- [ x] Add `allocationPercentage: Int @default(100)` to CookingTeamAssignment model (0-100 range)
- [ x] Run migrations: `npm run db:migrate:local` and `npm run db:generate-client`
- [ x] Add `defaultConsecutiveCookingDays: 2` to `app.config.ts`
- [ x] Update validation schemas (SeasonSchema, 
- [ ] update CookingTeamSchema
- [ ] Update test factories (SeasonFactory, CookingTeamFactory)
- [ ] Write API tests verifying fields persist/retrieve correctly

---

### Task 2: Season Form + Team Affinity Generation

**Part A: Season Form** (`/admin/planning`)
- [ x] Add numeric input for `consecutiveCookingDays` (default from config, validation ≥ 1)
- [x ] Update AdminPlanning.vue
- [x ] E2E tests for validation

**Part B: Team Affinity Calculation** (`/admin/teams`)
- [ ] Create `calculateTeamAffinities()` utility
  - Algorithm: Round-robin weekday assignment based on consecutiveCookingDays
  - Example: 3 teams, 2 consecutive days → Team 1: [Mon, Wed], Team 2: [Fri, Mon], Team 3: [Wed, Fri]
- [ ] Update AdminTeams.vue to calculate and display affinities when user inputs team count
- [ ] Update CookingTeamCard.vue to show affinity: "Hold 1 (Mandag, Onsdag)"
- [ ] Save affinities via PUT /api/admin/team
- [ ] E2E tests for affinity calculation and display

**BDD Scenarios**:
- 3 teams, consecutiveCookingDays=2, cookingDays=[Mon,Wed,Fri] → affinities calculated correctly
- consecutiveCookingDays > enabled weekdays → affinity wraps with duplicates
- consecutiveCookingDays=0 → validation error
- Team count changes → affinities recalculated

---

### Task 3: Assignment Endpoint

**Endpoint**: `POST /api/admin/season/[id]/assign-teams-to-dinner-events`

**Algorithm**:
1. Load all calendar days in season (includes holidays)
2. Load all dinner events (assigned + unassigned)
3. Load teams with affinities
4. Iterate calendar days:
   - Check if day's weekday matches current team's affinity
   - If event unassigned: assign to current team
   - If event assigned OR no event (holiday): skip assignment but increment quota
   - When quota reaches consecutiveCookingDays: rotate to next team
5. Return all DinnerEvent[] with updated assignments

**Implementation**:
- [ ] Create `/api/admin/season/[id]/assign-teams-to-dinner-events.post.ts`
- [ ] Implement assignment algorithm
- [ ] Validation: Season exists, ≥1 team, consecutiveCookingDays ≥1
- [ ] Update DinnerEventFactory with assignment helpers
- [ ] E2E API tests

**BDD Scenarios**:
- Happy path: 6 events, 3 teams → round-robin with affinity enforcement
- Holiday handling: Team gets credit in quota but no assignment
- Already assigned events: Treated as "holidays", skipped
- Edge cases: 0 events (200, empty array), 0 teams (400), more teams than events (some get 0)
- Validation: Invalid season ID (404)

---

### UI work 
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

## Major Framework Migrations Plan (Remaining)

### Zod 4 Migration (MEDIUM PRIORITY)
**Branch**: `migrate-zod-4`
**Current**: 3.24.1 → **Target**: 4.1.5
**Impact**: MEDIUM - Form validation and API schemas

---

# ✅ COMPLETED

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
