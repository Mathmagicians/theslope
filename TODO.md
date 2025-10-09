# TODO

## 🎯 HIGH PRIORITY: Admin Dining Season Management
**Milestone**: Admin can create a dining season with cooking teams and corresponding events

**Architecture Decision**: Separate admin tabs (simple workflow for once-a-year task)
- `/admin/planning` - Season creation + auto-generated events view
- `/admin/teams` - Cooking team management (NEW tab)

### Phase 3: Team Member Assignment (IN PROGRESS)
**Goal**: Assign inhabitants to teams with roles (100-200 users across ~10 teams)

**UX Pattern**: Master-Detail Layout
```
┌─────────────────┬──────────────────────────────┐
│ TEAMS (Left)    │ EDIT TEAM (Right)            │
│                 │                              │
│ □ Hold 1 [8]    │ ┌─ Hold 1 ────────────┐     │
│ ■ Hold 2 [6]    │ │ Name: [Hold 2      ]│     │
│ □ Hold 3 [0]    │ └─────────────────────┘     │
│ □ Hold 4 [5]    │                              │
│ ...             │ Current Members:             │
│                 │ 👤 Anna (Chef)               │
│                 │ 👤 Bob (Cook)                │
│                 │                              │
│                 │ Add Members: [search...]     │
│                 │ ☐ Charlie (available)        │
│                 │ ☐ Diana (available)          │
│                 │ ☑ Anna (in Hold 2)           │
└─────────────────┴──────────────────────────────┘
```

**Implementation Tasks**:
[] Left panel: Teams list (compact cards showing name, member count, status)
[] Add team selection state (selectedTeamId) and highlight selected team
[] Right panel: Edit selected team (name editor, current members by role)
[] Create inhabitant selector component (search, filter, pagination for 100-200 users)
[] Wire up add/remove member actions (checkboxes → immediate save)
[] Add responsive layout (stack vertically on mobile, side-by-side on desktop)
[] Test EDIT mode with master-detail UX (manual + E2E if needed)

**Future Enhancements**:
[] Extend database model with team affinity (preferred cooking days)
[] Add endpoint that auto-assigns teams to cooking days
[] Write component tests for member assignment
[] Write E2E tests for team composition

### Phase 4: Integration & Validation
**Validation & Business Rules**
[] Implement overlapping season prevention
[] Add team size validation rules
[] Check scheduling conflicts
[] Add warnings for incomplete teams
[] Write unit tests for all validation rules

**Testing & Documentation**
[] Write integration tests for season-team-event flow
[] Add error handling and recovery tests
[] Create API documentation
[] Update ADR with team/event architecture decisions

### Technical Implementation Details (Remaining)

**Extend Validation Schemas** (Future - for team member assignment):
```typescript
// Add to useCookingTeamValidation.ts or new composable
const CookingTeamAssignmentSchema = z.object({
  teamId: z.number(),
  inhabitantId: z.number(),
  role: z.enum(['CHEF', 'COOK', 'JUNIORHELPER'])
})
```

**Store Extensions** (Future):
- Add `useEventStore()` for dinner events (currently in plan store)

---

## Low priority: Future E2E test work

### Skipped E2E Tests (1 test)

**`tests/e2e/api/admin/dinnerEvent.e2e.spec.ts:46`**
- Test: `POST can update existing dinner event with status 200`
- Status: Intentionally skipped - feature not yet implemented
- Action: Implement POST /api/admin/dinner-event/[id] endpoint when needed

### Current Status
- **101 total E2E tests** in 13 files
- **100 tests passing** ✅
- **1 test skipped** (POST dinner-event - future feature)
- All critical user workflows covered

### Future Test Enhancements
- [ ] Refactor login.vue to use zod validation from api schema
- [ ] Add POST endpoint for dinner event updates (when required)

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

### Pinia 3 Migration (MEDIUM PRIORITY)
**Branch**: `migrate-pinia-3`
**Current**: 2.3.1 → **Target**: 3.0.3
**Impact**: MEDIUM - State management changes

### Zod 4 Migration (MEDIUM PRIORITY)
**Branch**: `migrate-zod-4`
**Current**: 3.24.1 → **Target**: 4.1.5
**Impact**: MEDIUM - Form validation and API schemas

### Migration Principles
1. **One migration per branch/PR** - Isolate changes
2. **Comprehensive testing** - Full test suite must pass
3. **Rollback ready** - Keep fallback options

---

# ✅ COMPLETED

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