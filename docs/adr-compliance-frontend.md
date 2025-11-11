# ADR Compliance - Frontend Routes & Components

**Generated:** 2025-11-11
**Last Updated:** 2025-11-11

## Legend

### ADR Compliance Markers
- ✅ = Fully compliant
- ⚠️ = Partial compliance (needs review)
- ❌ = Non-compliant
- ❓ = Not yet audited
- N/A = Not applicable

### Test Coverage
- ✅ = Adequate test coverage (component + E2E)
- ⚠️ = Partial coverage (component OR E2E only)
- ❌ = Missing tests
- N/A = No tests needed (simple display component)

## Page Routes

| Route | Page Component | ADR-007 Store | ADR-008 FormManager | ADR-006 URL Nav | E2E Tests | Component Tests | Status |
|-------|----------------|---------------|---------------------|-----------------|-----------|-----------------|--------|
| **Admin Routes** |
| `/admin/planning` | `admin/[tab].vue` → `AdminPlanning.vue` | ✅ `usePlanStore()` | ✅ Full usage | ✅ `?mode=` | ✅ | ⚠️ | **✅ COMPLIANT** |
| `/admin/teams` | `admin/[tab].vue` → `AdminTeams.vue` | ✅ `usePlanStore()` | ✅ Partial usage | ✅ `?mode=` | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `/admin/households` | `admin/[tab].vue` → `AdminHouseholds.vue` | ✅ `useHouseholdsStore()` | ❓ | ✅ `?mode=` | ✅ | ⚠️ | **⚠️ AUDIT NEEDED** |
| `/admin/allergies` | `admin/[tab].vue` → `AdminAllergies.vue` | ✅ `useAllergiesStore()` | N/A | ✅ tabs | ✅ | ⚠️ | **⚠️ REVIEW** |
| `/admin/users` | `admin/[tab].vue` → `AdminUsers.vue` | ✅ `useUsersStore()` | ❓ | ✅ `?mode=` | ❌ | ❌ | **❌ NO TESTS** |
| `/admin/chefs` | `admin/[tab].vue` → `AdminChefs.vue` | ✅ `usePlanStore()` | N/A | ✅ tabs | ❌ | ❌ | **❌ NO TESTS** |
| `/admin/economy` | `admin/[tab].vue` → `AdminEconomy.vue` | ❓ | N/A | ✅ tabs | ❌ | ❌ | **❌ NO TESTS** |
| `/admin/settings` | `admin/[tab].vue` → `AdminSettings.vue` | N/A | N/A | ✅ tabs | ❌ | ❌ | **❌ NO TESTS** |
| `/admin/allergies/pdf` | `admin/allergies/pdf.vue` | ✅ `useAllergiesStore()` | N/A | N/A | ❌ | ❌ | **❌ NO TESTS** |
| **Household Routes** |
| `/household/[shortname]` | `household/[shortname]/index.vue` | ✅ `useHouseholdsStore()` | N/A | ✅ path params | ✅ | ⚠️ | **⚠️ REVIEW** |
| `/household/[shortname]/bookings` | `household/[shortname]/[tab].vue` → `HouseholdBookings.vue` | ✅ Multiple stores | N/A | ✅ tabs | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `/household/[shortname]/allergies` | `household/[shortname]/[tab].vue` → `HouseholdAllergies.vue` | ✅ `useAllergiesStore()` | ❓ | ✅ tabs | ❌ | ❌ | **❌ NO TESTS** |
| `/household/[shortname]/settings` | `household/[shortname]/[tab].vue` → `HouseholdSettings.vue` | ✅ `useHouseholdsStore()` | ❓ | ✅ tabs | ❌ | ❌ | **❌ NO TESTS** |
| `/household/[shortname]/economy` | `household/[shortname]/[tab].vue` → `HouseholdEconomy.vue` | ❓ | N/A | ✅ tabs | ❌ | ❌ | **❌ NO TESTS** |
| `/household/mytickets` | `household/mytickets.vue` | ✅ `useBookingsStore()` | N/A | N/A | ❌ | ❌ | **❌ NO TESTS** |
| **Other Routes** |
| `/` | `index.vue` → `Hero.vue` | N/A | N/A | N/A | ✅ | ✅ | **✅ COMPLIANT** |
| `/login` | `login.vue` → `Login.vue` | ✅ `useAuthStore()` | N/A | N/A | ❌ | ❌ | **❌ NO TESTS** |
| `/dinner` | `dinner/index.vue` | ✅ `useEventStore()` | N/A | N/A | ❌ | ❌ | **❌ NO TESTS** |
| `/chef/dinner/[id]` | `chef/dinner/[id].vue` | ❓ | N/A | ✅ path params | ❌ | ❌ | **❌ NO TESTS** |

## Component Breakdown

### Admin Planning Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminPlanning.vue` | `/admin/planning` | `usePlanStore()` | `useEntityFormManager()`, `useSeasonValidation()` | ✅ | ✅ | ⚠️ Indirect | ✅ Full | **✅ COMPLIANT** |
| `AdminPlanningSeason.vue` | `/admin/planning` | Parent props | `useSeasonValidation()`, `useSeason()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `AdminToCreateSeason.vue` | `/admin/planning` | `usePlanStore()` | `useSeasonValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `TicketPriceListEditor.vue` | `/admin/planning` | Parent props | `useTicketPriceValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |

### Admin Team Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminTeams.vue` | `/admin/teams` | `usePlanStore()` | `useEntityFormManager()`, `useCookingTeam()` | ✅ | ✅ | ❌ | ✅ Full | **⚠️ MISSING UNIT** |
| `CookingTeamCard.vue` | `/admin/teams` | Parent props | `useCookingTeam()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `InhabitantSelector.vue` | `/admin/teams` | `useHouseholdsStore()` | `useInhabitantValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |

### Admin Household Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminHouseholds.vue` | `/admin/households` | `useHouseholdsStore()` | `useHouseholdValidation()` | ✅ | ✅ | ⚠️ Store tested | ✅ Full | **⚠️ COMPONENT TESTS** |
| `HouseholdCard.vue` | `/admin/households`, `/household/[shortname]` | Parent props | `useHouseholdValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `InhabitantCard.vue` | `/admin/households`, `/household/[shortname]` | Parent props | `useInhabitantValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `HouseholdListItem.vue` | `/admin/households` | Parent props | - | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** |

### Allergy Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminAllergies.vue` | `/admin/allergies` | `useAllergiesStore()` | `useAllergyValidation()` | ✅ | ✅ | ⚠️ Store tested | ✅ | **⚠️ COMPONENT TESTS** |
| `HouseholdAllergies.vue` | `/household/[shortname]/allergies` | `useAllergiesStore()`, `useHouseholdsStore()` | `useAllergyValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `AllergyTypeCard.vue` | `/admin/allergies`, `/household/[shortname]/allergies` | Parent props | `useAllergyValidation()` | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** |
| `AllergyTypeDisplay.vue` | `/admin/allergies/pdf` | Parent props | `useAllergyValidation()` | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** |
| `AllergyManagersList.vue` | `/admin/allergies` | `useUsersStore()` | `useUserValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |

### Form & Shared Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `FormModeSelector.vue` | All CRUD admin routes | None | - | N/A | N/A | ✅ Full | ✅ Indirect | **✅ COMPLIANT** |
| `SeasonSelector.vue` | `/admin/planning`, `/admin/teams`, `/admin/chefs` | `usePlanStore()` | `useSeasonSelector()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** |
| `UserView.vue` | All routes (PageHeader) | `useAuthStore()` | `useUserValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `UserListItem.vue` | `/admin/users` | Parent props | `useUserValidation()` | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** |

### Calendar Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `CalendarDateRangePicker.vue` | `/admin/planning` | None | `useDateRange()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** |
| `CalendarDateRangeListPicker.vue` | `/admin/planning` | None | `useDateRange()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** |
| `WeekDayMapDisplay.vue` | `/admin/planning`, `/admin/teams` | None | `useWeekday()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `WeekDayMapDinnerModeDisplay.vue` | `/household/[shortname]/settings` | None | `useWeekday()`, `useDinnerMode()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `BaseCalendar.vue` | All calendar displays | None | - | N/A | N/A | ❌ | N/A | **N/A DISPLAY** |
| `CalendarDisplay.vue` | `/dinner` | `useEventStore()` | - | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `TeamCalendarDisplay.vue` | `/admin/chefs` | Parent props | - | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `HouseholdCalendarDisplay.vue` | `/household/[shortname]/bookings` | Parent props | - | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |

### Household Booking Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `HouseholdBookings.vue` | `/household/[shortname]/bookings` | `usePlanStore()`, `useHouseholdsStore()`, `useBookingsStore()` | `useOrderValidation()` | ✅ | ✅ | ❌ | ✅ | **⚠️ MISSING UNIT** |
| `DinnerEvent.vue` | `/household/[shortname]/bookings`, `/dinner` | Parent props | `useDinnerEvent()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `DinnerTicket.vue` | `/household/[shortname]/bookings`, `/household/mytickets` | Parent props | `useOrderValidation()` | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** |

### Layout Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `PageHeader.vue` | All routes (app.vue) | `useAuthStore()` | - | ✅ | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `PageFooter.vue` | All routes (app.vue) | None | - | N/A | N/A | ❌ | N/A | **N/A LAYOUT** |
| `ViewError.vue` | All routes (error handler) | None | - | N/A | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `Loader.vue` | All routes (loading states) | None | - | N/A | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `Ticker.vue` | `/` (landing page) | None | - | N/A | N/A | ❌ | N/A | **N/A DISPLAY** |
| `HelpButton.vue` | Various admin routes | None | - | N/A | N/A | ❌ | N/A | **N/A UTILITY** |

## Store Compliance

| Store | ADR-007 useFetch | ADR-007 Status Computeds | ADR-007 isReady | ADR-007 watch:false | Component Tests | Status |
|-------|------------------|--------------------------|-----------------|---------------------|-----------------|--------|
| `plan.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** |
| `households.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** |
| `allergies.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** |
| `users.ts` | ✅ | ✅ | ✅ | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `auth.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |
| `event.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |
| `tickets.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |
| `bookings.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |

## Composable Compliance

| Composable | ADR-001 Zod Schemas | ADR-001 Enum Re-export | ADR-010 Domain Types | Unit Tests | Status |
|------------|---------------------|------------------------|----------------------|------------|--------|
| `useSeasonValidation()` | ✅ | ✅ | ✅ SerializedSeason | ✅ Full | **✅ COMPLIANT** |
| `useSeason()` | ✅ | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useCookingTeam()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useHouseholdValidation()` | ✅ | ✅ | ✅ Domain types (includes Inhabitant schemas) | ✅ Full | **✅ COMPLIANT** |
| `useCookingTeamValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useAllergyValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useUserValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useOrderValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useDinnerEventValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useTicketPriceValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useEntityFormManager()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useTabNavigation()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useSeasonSelector()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useApiHandler()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |

## ADR Compliance Summary

### ADR-001: Core Framework and Technology Stack
**Status:** ✅ **Fully Compliant**

**Three-layer architecture strictly enforced:**

1. **Generated Layer** (`~~/prisma/generated/zod/`)
   - ✅ Stays in repository (committed to git)
   - ✅ ONLY imported by validation composables
   - ✅ Never imported by application code

2. **Validation Layer** (`composables/use*Validation.ts`)
   - ✅ All validation composables import from generated layer
   - ✅ Re-export enum schemas for application code
   - ✅ Define Zod validation schemas
   - ✅ Export TypeScript types via `z.infer`

3. **Application Layer** (stores, components, pages)
   - ✅ Import ONLY from validation composables
   - ✅ Use `.enum` property for runtime values
   - ✅ No string literals for enum values
   - ✅ No direct imports from `~~/prisma/generated/zod`

**Issues:**
- None identified

### ADR-006: URL-Based Navigation
**Status:** ✅ **Compliant**

All admin and household pages use:
- ✅ Path-based routing for tabs (`/admin/[tab].vue`)
- ✅ Query parameters for form mode (`?mode=edit|create|view`)
- ✅ Dynamic tab loading with async components

**Issues:**
- None identified

### ADR-007: SSR-Friendly Store Pattern
**Status:** ⚠️ **Partially Compliant**

**Compliant stores:**
- ✅ `plan.ts` - Full compliance (tested)
- ✅ `households.ts` - Full compliance (tested)
- ✅ `allergies.ts` - Full compliance (tested)
- ✅ `users.ts` - Full compliance (not tested)

**Needs audit:**
- ❓ `auth.ts` - Not audited
- ❓ `event.ts` - Not audited
- ❓ `tickets.ts` - Not audited
- ❓ `bookings.ts` - Not audited

### ADR-008: useEntityFormManager Pattern
**Status:** ⚠️ **Partially Compliant**

**Compliant:**
- ✅ `AdminPlanning.vue` - Full usage (tested)
- ✅ `AdminTeams.vue` - Partial usage (tested)

**Needs audit:**
- ❓ `AdminHouseholds.vue` - Not audited
- ❓ Other CRUD forms

### ADR-010: Domain-Driven Serialization
**Status:** ✅ **Compliant**

All components and stores work with domain types:
- ✅ UI/Client: Domain types (Season with Date objects, arrays)
- ✅ HTTP: Domain types (transparent via $fetch)
- ✅ Store: Domain types throughout
- ✅ Repository: Handles serialization (backend concern)

**Issues:**
- None identified

## Test Coverage Summary

### E2E Test Coverage (Playwright)

**Full Coverage:**
- ✅ Landing page (`pages.e2e.spec.ts`)
- ✅ Admin planning (`AdminPlanning.e2e.spec.ts`, `AdminPlanningSeason.e2e.spec.ts`)
- ✅ Admin teams (`AdminTeams.e2e.spec.ts`)
- ✅ Admin households (`AdminHouseholds.e2e.spec.ts`)
- ✅ Household members (`HouseholdMembers.e2e.spec.ts`)
- ✅ Household navigation (`household.e2e.spec.ts`)

**Missing E2E:**
- ❌ Admin users
- ❌ Admin allergies (has admin.e2e.spec.ts but needs specific tests)
- ❌ Admin chefs
- ❌ Admin economy
- ❌ Admin settings
- ❌ Household bookings (backend tested, UI not)
- ❌ Household allergies
- ❌ Household settings
- ❌ Household economy
- ❌ Login flow
- ❌ Dinner calendar
- ❌ Chef dinner editing

### Component Test Coverage (Vitest + Nuxt)

**Full Coverage:**
- ✅ Calendar components (`CalendarDateRangePicker`, `CalendarDateRangeListPicker`)
- ✅ Form components (`FormModeSelector`, `SeasonSelector`)
- ✅ Composables (`useEntityFormManager`, `useTabNavigation`, `useSeasonSelector`, `useApiHandler`, `useSeason`, `useCookingTeam`)
- ✅ Stores (`plan`, `households`, `allergies`)
- ✅ Landing (`Hero.vue`)

**Partial Coverage (indirect via E2E):**
- ⚠️ `AdminPlanning` components
- ⚠️ `AdminTeams` components
- ⚠️ `AdminHouseholds` components

**Missing Component Tests:**
- ❌ Most form components (tested indirectly via E2E)
- ❌ Calendar display components
- ❌ Allergy components
- ❌ Booking components
- ❌ Layout components (ViewError, Loader, etc.)
- ✅ Validation composables (all `use*Validation()` composables have comprehensive unit tests)

## Priority Actions

### High Priority (Critical Gaps)

1. **Store Audits** - Audit remaining 4 stores for ADR-007 compliance
   - `auth.ts`
   - `event.ts`
   - `tickets.ts`
   - `bookings.ts`

2. **Validation Composable Tests** - ✅ COMPLETE
   - All `use*Validation()` composables now have comprehensive unit tests
   - Tests cover schemas, serialization/deserialization, validation rules, and edge cases
   - All tests passing (262 tests across 8 validation composables)

3. **Core Component Tests** - Add component tests for high-risk components
   - `AdminUsers.vue` (CRUD with no tests)
   - `HouseholdAllergies.vue` (complex state management)
   - `HouseholdBookings.vue` (booking flow)

### Medium Priority (Coverage Gaps)

4. **E2E Coverage** - Add E2E tests for untested user flows
   - Login flow (authentication)
   - Admin users (system roles)
   - Household allergies (user-facing CRUD)
   - Household settings (profile management)

5. **Component Test Cleanup** - Add unit tests for display components
   - Error handling components (`ViewError`, `Loader`)
   - Card components (already tested via E2E but should have unit tests)

### Low Priority (Nice to Have)

6. **Documentation Components** - Test documentation/help components
   - `HelpButton.vue`
   - Layout components

7. **Calendar Components** - Component tests for calendar displays
   - Already tested via E2E but would benefit from unit tests

## Compliance Checklist

Use this checklist when creating/reviewing frontend components:

### Components (Application Layer)
- [ ] Use domain types from validation composables (ADR-010)
- [ ] Import enums ONLY from validation composables, NEVER from `~~/prisma/generated/zod` (ADR-001)
- [ ] NEVER import from `@prisma/client` for types/enums (ADR-001)
- [ ] Use `.enum` property for enum values (e.g., `TicketTypeSchema.enum.ADULT`)
- [ ] Component tests for logic components
- [ ] E2E tests for user-facing flows
- [ ] Use `data-testid` for E2E selectors
- [ ] Use `name` attribute for form elements

### Pages (Application Layer)
- [ ] Store initialization is synchronous (ADR-007)
- [ ] Show reactive loaders based on `isStoreReady` (ADR-007)
- [ ] Use URL parameters for navigation (ADR-006)
- [ ] Use `useEntityFormManager` for CRUD forms (ADR-008)
- [ ] Import enums from validation composables, not generated layer (ADR-001)
- [ ] E2E test coverage for critical paths

### Stores (Application Layer)
- [ ] Prefer `useAsyncData` over `useFetch` (ADR-007)
- [ ] Use unique string keys for static endpoints, computed keys for reactive (ADR-007)
- [ ] Export status-derived computeds (`isLoading`, `isErrored`, `isInitialized`, `isEmpty`) (ADR-007)
- [ ] Export `isStoreReady` convenience computed (ADR-007)
- [ ] Expose raw error ref for statusCode access (ADR-007)
- [ ] Provide `refresh()` actions (ADR-007)
- [ ] Init methods are synchronous (ADR-007)
- [ ] Internal watchers for reactive initialization (ADR-007)
- [ ] Import enums from validation composables, not generated layer (ADR-001)
- [ ] Component tests for store logic

### Validation Composables (Validation Layer - `use*Validation.ts`)
- [ ] Import ONLY from `~~/prisma/generated/zod` for enum schemas (ADR-001)
- [ ] Re-export enum schemas for application code (ADR-001)
- [ ] Define all validation schemas using Zod (ADR-001)
- [ ] Export TypeScript types via `z.infer` (ADR-001)
- [ ] Define domain types (ADR-010)
- [ ] Export serialize/deserialize if needed (ADR-010)
- [ ] Unit tests for validation logic

### Business Logic Composables (`use*.ts`)
- [ ] Import from validation composables for types/enums (ADR-001)
- [ ] Unit tests for complex logic

## Fully Compliant Examples

Reference these components for correct ADR implementation:

### Pages & Components
- ✅ `AdminPlanning.vue` + `useEntityFormManager` - ADR-006, ADR-007, ADR-008 pattern
- ✅ `AdminTeams.vue` - Partial useEntityFormManager usage
- ✅ `SeasonSelector.vue` - Reactive store integration
- ✅ `CalendarDateRangeListPicker.vue` - Pure component with proper testing

### Stores
- ✅ `plan.ts` - Full ADR-007 compliance with reactive initialization
- ✅ `households.ts` - Full ADR-007 compliance with dynamic tab pattern
- ✅ `allergies.ts` - Full ADR-007 compliance

### Composables
- ✅ `useSeasonValidation()` - ADR-001 three-layer architecture (imports from generated, re-exports enums, defines validation schemas)
- ✅ `useOrderValidation()` - ADR-001 validation layer pattern with ADR-010 domain types
- ✅ `useCookingTeam()` - Business logic composable with tests (imports from validation layer)
- ✅ `useEntityFormManager()` - Form management pattern
- ✅ `useTabNavigation()` - URL navigation pattern

### Tests
- ✅ `tests/component/stores/plan.nuxt.spec.ts` - Store testing pattern
- ✅ `tests/component/components/calendar/CalendarDateRangeListPicker.nuxt.spec.ts` - Component testing best practices
- ✅ `tests/e2e/ui/AdminPlanning.e2e.spec.ts` - E2E testing pattern with factories
