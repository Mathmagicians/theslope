# ADR Compliance - Frontend Routes & Components

**Generated:** 2025-11-11
**Last Updated:** 2026-08-20 (Allergy catalog: single responsive tree in `AdminAllergies.vue`, `AllergyTypeCard.vue` serves create+edit, inline delete confirm, allergies store on `useAsyncData`; new `AdminAllergies.nuxt.spec.ts` + `AllergyTypeCard.nuxt.spec.ts`)

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
| `/admin/allergies` | `admin/[tab].vue` → `AdminAllergies.vue` | ✅ `useAllergiesStore()` | N/A | ✅ tabs | ✅ | ✅ | **✅ COMPLIANT** |
| `/admin/users` | `admin/[tab].vue` → `AdminUsers.vue` | ✅ `useUsersStore()` | N/A | ✅ tabs | ✅ | ❌ | **⚠️ E2E ONLY** |
| `/admin/economy` | `admin/[tab].vue` → `AdminEconomy.vue` | ✅ `usePlanStore()`, `useBookingsStore()` | N/A | ✅ tabs | ✅ Serial | ❌ | **⚠️ E2E ONLY** - Admin corrections feature |
| `/admin/settings` | `admin/[tab].vue` → `AdminSettings.vue` | N/A | N/A | ✅ tabs | ❌ | ❌ | **❌ NO TESTS** |
| `/admin/allergies/pdf` | `admin/allergies/pdf.vue` | ✅ `useAllergiesStore()` | N/A | N/A | ❌ | ❌ | **❌ NO TESTS** |
| **Household Routes** |
| `/household/[shortname]` | `household/[shortname]/index.vue` | ✅ `useHouseholdsStore()` | N/A | ✅ path + `?pbs=` | ✅ | ⚠️ | **⚠️ REVIEW** - ADR-006 preserves `?pbs` on redirect |
| `/household/[shortname]/bookings` | `household/[shortname]/[tab].vue` → `HouseholdBookings.vue` | ✅ Multiple stores | N/A | ✅ tabs + `?pbs=` | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `/household/[shortname]/allergies` | `household/[shortname]/[tab].vue` → `HouseholdAllergies.vue` | ✅ `useAllergiesStore()` | ❓ | ✅ tabs + `?pbs=` | ❌ | ❌ | **❌ NO TESTS** |
| `/household/[shortname]/settings` | `household/[shortname]/[tab].vue` → `HouseholdSettings.vue` | ✅ `useHouseholdsStore()` | N/A | ✅ tabs + `?pbs=` | ✅ | ❌ | **⚠️ E2E ONLY** - Move-out date management |
| `/household/[shortname]/economy` | `household/[shortname]/[tab].vue` → `HouseholdEconomy.vue` | ❓ | N/A | ✅ tabs + `?pbs=` | ❌ | ❌ | **❌ NO TESTS** |
| **Other Routes** |
| `/` | `index.vue` → `Hero.vue` | N/A | N/A | N/A | ✅ | ✅ | **✅ COMPLIANT** |
| `/login` | `login.vue` → `Login.vue` | ✅ `useAuthStore()` | N/A | N/A | ❌ | ❌ | **❌ NO TESTS** |
| `/dinner` | `dinner/index.vue` | ✅ `useEventStore()` | N/A | N/A | ❌ | ❌ | **❌ NO TESTS** |
| `/chef` | `chef/index.vue` | ✅ `usePlanStore()` | N/A | ✅ `?team=` | ✅ | ❌ | **⚠️ E2E ONLY** - Team tab switching with calendar reactivity |
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
| `AdminTeams.vue` | `/admin/teams` | `usePlanStore()`, `useHouseholdsStore()` | `useEntityFormManager()`, `useCookingTeam()`, `useQueryParam()` | ✅ | ✅ | ❌ | ✅ Full | **⚠️ MISSING UNIT** — `?team=` query param bleeds to other tabs (parked) |
| `CookingTeamCard.vue` | `/admin/teams` | `usePlanStore()`, `useHouseholdsStore()` | `useCookingTeam()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** — Uses shared InhabitantSelector + TeamMemberAddForm |
| `TeamMemberAddForm.vue` | `/admin/teams` (via CookingTeamCard) | None | `useCookingTeamValidation()` | ✅ | ✅ | ✅ 13 tests | ✅ Indirect | **✅ COMPLIANT** |
| `InhabitantSelector.vue` | `/admin/teams`, future `/admin/households` | None | - | ✅ | ✅ | ✅ 22 tests | ✅ Indirect | **✅ COMPLIANT** — Moved to `shared/`; generic slots |

### Admin Household Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminHouseholds.vue` | `/admin/households` | `useHouseholdsStore()` | - | ✅ | ✅ | ⚠️ Store tested | ✅ Full | **⚠️ COMPONENT TESTS** — Row expansion with HouseholdEditPanel, move/delete via store |
| `HouseholdEditPanel.vue` | `/admin/households` (via expand) | None (prop-driven) | - | ✅ | ✅ | ✅ 11 tests | ✅ Indirect | **✅ COMPLIANT** |
| `HouseholdCard.vue` | `/admin/households`, `/household/[shortname]` | Parent props | `useHouseholdValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `InhabitantCard.vue` | `/admin/households`, `/household/[shortname]` | Parent props | `useInhabitantValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `HouseholdListItem.vue` | `/admin/households` | Parent props | - | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** |
| `HouseholdSettings.vue` | `/household/[shortname]/settings` | `useHouseholdsStore()` | `useBooking()`, `useHousehold()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ | **⚠️ E2E ONLY** - Move-out date management with pencil-gate edit flow |

### Allergy Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `AdminAllergies.vue` | `/admin/allergies` | `useAllergiesStore()`, `useHouseholdsStore()` | `useAllergyValidation()`, `useAllergy()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 14 tests | ✅ | **✅ COMPLIANT** — One responsive tree (no `md:hidden` branch); row actions replace `FormModeSelector`; inline delete confirm naming the cascade replaces `confirm()`; owns the households lookup passed to `AllergyTypeCard` |
| `HouseholdAllergies.vue` | `/household/[shortname]/allergies` | `useAllergiesStore()`, `useHouseholdsStore()` | `useAllergyValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `AllergyTypeCard.vue` | `/admin/allergies`, `/household/[shortname]/allergies` | Parent props | `useAllergyValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ 12 tests | ✅ Indirect | **✅ COMPLIANT** — Serves view/compact/edit **and create** (`allergyType` optional); household rendered via `UserListItem` `#badge` slot; `<NuxtTime relative>` for timestamps (SSR-safe) |
| `AllergyTypeDisplay.vue` | `/admin/allergies/pdf` | Parent props | `useAllergyValidation()` | ✅ | ✅ | ❌ | N/A | **N/A DISPLAY** |
| `AllergyManagersList.vue` | `/admin/allergies` | `useUsersStore()` | `useUserValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |

### Form & Shared Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `FormModeSelector.vue` | All CRUD admin routes | None | - | N/A | N/A | ✅ Full | ✅ Indirect | **✅ COMPLIANT** |
| `SeasonSelector.vue` | `/admin/planning`, `/admin/teams` | `usePlanStore()` | `useSeasonSelector()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** |
| `TableSearchPagination.vue` | `/admin/users`, `/admin/households` | None | `useTheSlopeDesignSystem()` | N/A | N/A | ✅ | ✅ Indirect | **✅ COMPLIANT** |
| `SeasonStatusDisplay.vue` | `/admin/planning` | `usePlanStore()` | `useSeasonValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ | ✅ Indirect | **✅ COMPLIANT** |
| `UserView.vue` | All routes (PageHeader) | `useAuthStore()` | `useUserValidation()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `UserListItem.vue` | `/admin/users`, `/admin/allergies` | Parent props | `useUserValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ `label`/`labelPlural` declared but not rendered (removed in #62)** |
| `DangerButton.vue` | `/household/[shortname]/settings`, `/admin/economy` | None | - | N/A | N/A | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - Two-click confirm pattern for destructive actions |

### Calendar Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `CalendarDatePicker.vue` | `/household/[shortname]/settings` | None | `useDateRangeValidation()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** - Single date picker with UCalendar + validation |
| `CalendarDateRangePicker.vue` | `/admin/planning` | None | `useDateRange()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** |
| `CalendarDateRangeListPicker.vue` | `/admin/planning` | None | `useDateRange()` | ✅ | ✅ | ✅ Full | ✅ Indirect | **✅ COMPLIANT** |
| `WeekDayMapDisplay.vue` | `/admin/planning`, `/admin/teams` | None | `useWeekday()` | ✅ | ✅ | ✅ 9 tests | ✅ Indirect | **✅ COMPLIANT** — Added `hideRestricted` prop; compact view only renders active days |
| `WeekDayMapDinnerModeDisplay.vue` | `/household/[shortname]/settings` | None | `useWeekday()`, `useDinnerMode()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |
| `BaseCalendar.vue` | All calendar displays | None | - | N/A | N/A | ❌ | N/A | **N/A DISPLAY** |
| `CalendarDisplay.vue` | `/admin/planning` (via `AdminSeason`, `AdminPlanningSeason`) | None | `useSeason()`, `useCalendarEvents()` | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** - potential-cooking/generated-events preview |
| `ChefCalendarDisplay.vue` | `/chef` | Parent props | `useTemporalCalendar()` | ✅ | ✅ | ❌ | ✅ | **⚠️ E2E ONLY** - Uses MaybeRefOrGetter for reactivity |
| `DinnerCalendarDisplay.vue` | `/dinner`, `/household/[shortname]/bookings` | Parent props | `useTemporalCalendar()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ E2E ONLY** - DRY with ChefCalendarDisplay |
| `TeamCalendarDisplay.vue` | `/admin/teams`, `/chef` | Parent props | - | ✅ | ✅ | ❌ | ❌ | **❌ NO TESTS** |

### Household Booking Components

| Component | Used By Routes | Stores Used | Composables | ADR-001 Types | ADR-010 Domain | Component Tests | E2E Tests | Status |
|-----------|----------------|-------------|-------------|---------------|----------------|-----------------|-----------|--------|
| `HouseholdBookings.vue` | `/household/[shortname]/bookings` | `usePlanStore()`, `useHouseholdsStore()`, `useBookingsStore()` | `useBookingView()`, `useBooking()` | ✅ | ✅ | ❌ | ✅ Full | **⚠️ MISSING UNIT** - E2E arrow-nav (`HouseholdBookings.e2e.spec.ts`) + day-view + cross-household covered |
| `BookingGridView.vue` | `/household/[shortname]/bookings` | Parent props | `useBooking()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - ADR-016 week/month grid |
| `BookingViewSwitcher.vue` | `/household/[shortname]/bookings` | Parent props | `useBookingView()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - Day/week/month toggle |
| `ActionPreview.vue` | `/household/[shortname]/bookings`, `/admin/economy` | Parent props | `useBooking()` | ✅ | ✅ | ✅ | ✅ Indirect | **✅ COMPLIANT** - Shows booking changes before save |
| `GuestBookingForm.vue` | `/household/[shortname]/bookings`, `/admin/economy` | Parent props | `useBookingValidation()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** - Guest ticket form |
| `DinnerBookingForm.vue` | `/dinner`, `/household/[shortname]/bookings`, `/admin/economy` | `useBookingsStore()` | `useBooking()`, `useBookingValidation()` | ✅ | ✅ | ✅ | ✅ Serial | **✅ COMPLIANT** - ADR-016 booking form, admin override support |
| `DinnerEvent.vue` | `/household/[shortname]/bookings`, `/dinner` | Parent props | `useDinnerEvent()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |
| `DinnerTicket.vue` | `/household/[shortname]/bookings` | Parent props | `useTicket()`, `useTheSlopeDesignSystem()` | ✅ | ✅ | ❌ | ✅ Indirect | **⚠️ MISSING UNIT** |

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
| `households.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** - `setMoveOutDate()`, `lastMoveOutResult`, `moveInhabitant()`, `deleteHousehold()`, `lastMoveResult`, `updateInhabitantPreferences()`, `updateAllInhabitantPreferences()`, `initHouseholdsStore(shortName?, pbsId?)` disambiguation |
| `allergies.ts` | ✅ | ✅ | ✅ | ✅ | ✅ Full | **✅ COMPLIANT** — Catalog converted from `useFetch` to `useAsyncData` + `useRequestFetch`; `isAllergyTypesInitialized` checks data presence (ADR-007 rule 3); mutations refetch the catalog |
| `users.ts` | ✅ | ✅ | ✅ | ✅ | ❌ | **⚠️ MISSING TESTS** |
| `auth.ts` | N/A | ✅ | N/A | N/A | ❌ | **✅ COMPLIANT** - Uses `usePermissions()` for role checks, added `isMemberOfHousehold()` |
| `event.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |
| `tickets.ts` | ❓ | ❓ | ❓ | ❓ | ❌ | **❓ AUDIT NEEDED** |
| `bookings.ts` | ✅ | ✅ | ✅ | ✅ | ❌ | **✅ COMPLIANT** - ADR-016 scaffold methods, `processAdminCorrection()` for admin bypass, `useRequestFetch()` for SSR |

## Composable Compliance

| Composable | ADR-001 Zod Schemas | ADR-001 Enum Re-export | ADR-010 Domain Types | Unit Tests | Status |
|------------|---------------------|------------------------|----------------------|------------|--------|
| **Validation Composables** |
| `useCoreValidation()` | ✅ | ✅ `SystemRoleSchema`, `DinnerModeSchema` | ✅ User, Inhabitant, Household (Display + Detail) | ✅ Full | **✅ COMPLIANT** - Merged useUserValidation + useHouseholdValidation via fragment pattern (ADR-001) |
| `useBookingValidation()` | ✅ | ✅ `OrderStateSchema`, `DinnerModeSchema` | ✅ Order, DinnerEvent, DesiredOrder, ScaffoldResult, HouseholdUpdateResponse | ✅ Full | **✅ COMPLIANT** - ADR-016 schemas, operation result types (ADR-009) |
| `useSeasonValidation()` | ✅ | ✅ | ✅ SerializedSeason | ✅ Full | **✅ COMPLIANT** |
| `useCookingTeamValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useAllergyValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useTicketPriceValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useDateRangeValidation()` | ✅ | N/A | ✅ DateRange schemas (required + nullable end) | ✅ Full | **✅ COMPLIANT** - Factory pattern for date range schemas with composable refinements |
| `useWeekDayMapValidation()` | ✅ | N/A | ✅ Generic WeekDayMap<T> | ✅ Full | **✅ COMPLIANT** - Generic weekday map validation factory |
| `useBillingValidation()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Billing, transaction, invoice schemas |
| `useHeynaboValidation()` | ✅ | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Heynabo import response schemas |
| `useMaintenanceValidation()` | ✅ | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Season import response schemas |
| **Business Logic Composables** |
| `useBooking()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - ADR-016 `decideOrderAction`, bucket resolvers, `formatActionPreview()`, `resolveUserBookingBuckets()` |
| `useHousehold()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - `isHouseholdActiveOnDay()` residency predicate (ADR-016), `getResidencyStatus()`, consensus, name formatting |
| `useSeason()` | ✅ | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Exposes pre-configured `splitDinnerEvents`, `getNextDinnerDate`, `getAdjacentDinner` (the last powers `useBookingView` arrow nav) |
| `useCookingTeam()` | ✅ | ✅ | ✅ Domain types | ✅ Full | **✅ COMPLIANT** |
| `useBilling()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Billing business logic |
| `useHeynabo()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Heynabo import merge logic, `mergeHouseholdForUpdate()`, `resolveInhabitantImportPlan()` (4-bucket inhabitant plan: ADR-016 decide/execute, global deletion + placement routing) |
| `useOrder()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Order business logic |
| `useTicket()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Ticket display logic |
| `useUserRoles()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Role reconciliation logic |
| **UI/Navigation Composables** |
| `useBookingView()` | ✅ `BookingViewSchema` | N/A | ✅ DateRange | ✅ Full | **✅ COMPLIANT** - ADR-006 URL-synced view/date for booking calendar. Single `findAdjacent(direction)` helper (boundary from `getPeriodBoundary` → `getAdjacentDinner`) replaces per-view switches; `seasonDates` option dropped (implicit via `dinnerDates`) |
| `useEntityFormManager()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useTabNavigation()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useSeasonSelector()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `useQueryParam()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** - Generic query param composable for URL state |
| `useApiHandler()` | N/A | N/A | N/A | ✅ Full | **✅ COMPLIANT** |
| `usePermissions()` | N/A | ✅ `SystemRoleSchema` | N/A | ✅ Full | **✅ COMPLIANT** - Permission predicates for auth (imports from generated layer, re-exports enum) |
| `useTemporalCalendar()` | N/A | N/A | ✅ Domain types | ✅ Full | **✅ COMPLIANT** - Uses `MaybeRefOrGetter` + `toValue()` for reactive inputs, shared by ChefCalendarDisplay and DinnerCalendarDisplay (DRY) |
| `useTheSlopeDesignSystem()` | N/A | N/A | N/A | N/A | **N/A UTILITY** - Design system constants (icons, sizes, typography, buttons) |

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
- ✅ Household URLs use `?pbs=X` for disambiguation (`getHouseholdUrl()` utility in `app/utils/household.ts`)
- ✅ `?pbs` preserved on tab switches (via `useTabNavigation` query passthrough) and index redirects

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
- ❓ `event.ts` - Not audited
- ❓ `tickets.ts` - Not audited

**Note:** `auth.ts` uses `useUserSession()` from nuxt-auth-utils (not `useAsyncData`), so ADR-007 patterns don't fully apply. It's compliant for its use case.

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
- ✅ Admin economy (`AdminEconomy.e2e.spec.ts` - serial, admin corrections)
- ✅ Household members (`HouseholdMembers.e2e.spec.ts`)
- ✅ Household navigation (`household.e2e.spec.ts`)
- ✅ Household bookings (`DinnerBookingForm.e2e.spec.ts` - serial, `HouseholdBookingsCrossHousehold.e2e.spec.ts`)
- ✅ Public billing (`PublicBilling.e2e.spec.ts`)
- ✅ Chef page (`Chef.e2e.spec.ts` - team tab switching, calendar reactivity)
- ✅ Household settings (`household.e2e.spec.ts` - move-out date management, tab navigation)

**Missing E2E:**
- ❌ Admin users
- ❌ Admin allergies (has admin.e2e.spec.ts but needs specific tests)
- ❌ Admin settings
- ❌ Household allergies
- ❌ Household economy
- ❌ Login flow
- ❌ Dinner calendar
- ❌ Chef dinner editing

### Component Test Coverage (Vitest + Nuxt)

**Full Coverage:**
- ✅ Calendar components (`CalendarDatePicker`, `CalendarDateRangePicker`, `CalendarDateRangeListPicker`)
- ✅ Form components (`FormModeSelector`, `SeasonSelector`)
- ✅ Composables (`useEntityFormManager`, `useTabNavigation`, `useSeasonSelector`, `useApiHandler`, `useSeason`, `useCookingTeam`, `useTemporalCalendar`)
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
- ❌ Layout components (ViewError, Loader, etc.)
- ✅ Validation composables (all `use*Validation()` composables have comprehensive unit tests)
- ✅ Booking components (`ActionPreview.nuxt.spec.ts`, `DinnerBookingForm.nuxt.spec.ts`, `useBooking.nuxt.spec.ts`)

## Priority Actions

### High Priority (Critical Gaps)

1. **Store Audits** - Audit remaining 3 stores for ADR-007 compliance
   - `auth.ts`
   - `event.ts`
   - `tickets.ts`

2. **Validation Composable Tests** - ✅ COMPLETE
   - All `use*Validation()` composables now have comprehensive unit tests
   - Tests cover schemas, serialization/deserialization, validation rules, and edge cases
   - All tests passing (262 tests across 8 validation composables)

3. **Core Component Tests** - Add component tests for high-risk components
   - `UserProfileCard.vue` (role management UI needs component tests)
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

Use this checklist when creating/reviewing frontend components.

### Critical Architectural Principles

**Before implementing ANY frontend code, understand these core principles:**

1. **🎨 NuxtUI First** - Use NuxtUI components (UButton, UInput, UCard, USelect) instead of custom HTML. We use the Nuxt ecosystem.

2. **📱 Mobile First** - 90% of users on mobile. Design mobile-first, use `isMd` (injected from layout) for desktop enhancements, use Tailwind `md:` breakpoint for responsive styling.

3. **📡 Stores Own Network** - ALL API calls (`$fetch`) happen in stores. Components/pages NEVER call APIs directly. (ADR-007)

4. **✅ Validation Composables Are Truth** - ALL validation schemas, types, and enums live in `use*Validation.ts` composables. Application code imports from there, NEVER from `~~/prisma/generated/zod` or `@prisma/client`. (ADR-001)

5. **🔄 Three-Layer Architecture** (ADR-001):
   - **Generated Layer** (`~~/prisma/generated/zod/`) → **Validation Layer** (`use*Validation.ts`) → **Application Layer** (components, stores, pages)
   - Each layer imports from the previous layer only
   - Application code gets everything from validation composables

6. **🎯 Domain Types Everywhere** - Work with domain types (Season with Date objects) throughout application code. Serialization happens in repository layer. (ADR-010)

---

### Components (Application Layer)

**UI & Presentation:**
- [ ] **CRITICAL:** Use NuxtUI components (UButton, UInput, UCard, USelect, UCheckbox, etc.) instead of hand-coded HTML (Nuxt stack principle)
- [ ] **CRITICAL:** Mobile-first responsive design - 90% of users on mobile
- [ ] **CRITICAL:** DRY components - extract repeated logic into reusable atomic components
- [ ] **CRITICAL:** Clean template structure - use single if-else instead of checking same condition multiple times (e.g., `v-if="isTitle"` / `v-else` instead of `v-if="isTitle"` / `v-else-if="!isTitle && ..."`)
- [ ] Inject `isMd` from layout via `inject<Ref<boolean>>('isMd')` for reactive breakpoint detection
- [ ] Use `md:` breakpoint in Tailwind classes for responsive styling
- [ ] For NuxtUI component props (colors, variants, size), use `isMd` ref to switch between mobile/desktop values
- [ ] Use `name` attribute for form elements (E2E test selectors)
- [ ] Use `data-testid` for complex UI components that may not forward `name` to DOM

**Data & Types:**
- [ ] **CRITICAL:** NO direct API calls (`$fetch`) in components - ALL network communication goes through stores (ADR-007)
- [ ] **CRITICAL:** Import types/enums ONLY from validation composables, NEVER from `~~/prisma/generated/zod` or `@prisma/client` (ADR-001)
- [ ] Use domain types from validation composables (ADR-010)
- [ ] Use `.enum` property for enum values (e.g., `TicketTypeSchema.enum.ADULT`)
- [ ] NO validation logic in components - ALL validation in validation composables (ADR-001)

**State Management:**
- [ ] Interact with stores for all server data (read/write)
- [ ] Own UI state only (formMode, draft, UI flags)
- [ ] Show reactive loaders based on store's `isReady` flags (ADR-007)

**Testing:**
- [ ] Component tests for components with logic
- [ ] E2E tests for user-facing flows
- [ ] Adequate test coverage (see test coverage tables)

### Pages (Application Layer)

**Initialization & Navigation:**
- [ ] **CRITICAL:** Store initialization is synchronous - NO `await` on init (ADR-007)
- [ ] Show reactive loaders based on `isStoreReady` (ADR-007)
- [ ] Use URL parameters for navigation state (ADR-006)
- [ ] Path-based routing for tabs, query params for modes (`?mode=edit`)

**Data & State:**
- [ ] **CRITICAL:** NO direct API calls - ALL network communication through stores
- [ ] **CRITICAL:** Import types/enums from validation composables only (ADR-001)
- [ ] Use `useEntityFormManager` for CRUD forms (ADR-008)
- [ ] Pages coordinate between stores and components, don't own data

**Testing:**
- [ ] E2E test coverage for critical user paths

### Stores (Application Layer)

**Data Fetching:**
- [ ] **CRITICAL:** Prefer `useAsyncData` over `useFetch` (ADR-007)
- [ ] **CRITICAL:** ALL API calls happen in stores - NO direct $fetch in components/pages (ADR-007)
- [ ] Use unique string keys for static endpoints, computed keys for reactive (ADR-007)
- [ ] Internal watchers for reactive initialization (ADR-007)

**State Management:**
- [ ] Export status-derived computeds: `isLoading`, `isErrored`, `isInitialized`, `isEmpty` (ADR-007)
- [ ] Export `isStoreReady` convenience computed combining all checks (ADR-007)
- [ ] Expose raw error ref for statusCode access (ADR-007)
- [ ] Provide `refresh()` actions wrapping `useAsyncData` refresh (ADR-007)
- [ ] Init methods are synchronous - NO async/await (ADR-007)

**Types & Validation:**
- [ ] **CRITICAL:** Import types/enums from validation composables, NEVER from generated layer or @prisma/client (ADR-001)
- [ ] Work with domain types throughout (ADR-010)
- [ ] NO validation logic in stores - validation in composables only

**Testing:**
- [ ] Component tests for store logic (initialization, CRUD actions, computeds)
- [ ] Mock endpoints using `registerEndpoint` pattern
- [ ] Use `clearNuxtData()` in `beforeEach()` to prevent test pollution

### Validation Composables (Validation Layer - `use*Validation.ts`)

**Single Source of Truth:**
- [ ] **CRITICAL:** ALL validation schemas defined here - NEVER in components, stores, or pages (ADR-001)
- [ ] **CRITICAL:** ALL types exported via `z.infer` - application code imports types from here (ADR-001)
- [ ] **CRITICAL:** ALL enum schemas re-exported - application code gets enums from here (ADR-001)

**Schema Definition:**
- [ ] Import enum schemas from `~~/prisma/generated/zod` ONLY (not @prisma/client) (ADR-001)
- [ ] Re-export enum schemas for application code (ADR-001)
- [ ] Define all validation schemas using Zod (ADR-001)
- [ ] Export TypeScript types via `z.infer` (ADR-001)

**Domain Serialization (if needed):**
- [ ] Define domain types (ADR-010)
- [ ] Define serialized types for database format (ADR-010)
- [ ] Export serialize/deserialize functions (ADR-010)
- [ ] Transformation functions stay in validation composable

**Testing:**
- [ ] Unit tests for all validation schemas
- [ ] Unit tests for serialize/deserialize functions
- [ ] Unit tests for edge cases and validation rules

### Business Logic Composables (`use*.ts`)

**Types & Validation:**
- [ ] **CRITICAL:** Import types/enums from validation composables ONLY (ADR-001)
- [ ] NO validation schemas here - validation in `use*Validation.ts` only
- [ ] Work with domain types from validation composables (ADR-010)

**Logic & Utilities:**
- [ ] Complex business logic and calculations
- [ ] Default value creation
- [ ] Domain-specific utilities
- [ ] Functions depending on multiple composables

**Testing:**
- [ ] Unit tests for all complex logic functions
- [ ] Parametrized tests for similar cases with different data

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
- ✅ `useBooking()` - ADR-016 order decision logic (`decideOrderAction`, bucket resolvers)
- ✅ `useEntityFormManager()` - Form management pattern
- ✅ `useTabNavigation()` - URL navigation pattern
- ✅ `useTemporalCalendar()` - `MaybeRefOrGetter` + `toValue()` pattern for reactive composable inputs (DRY shared by calendar displays)

### Tests
- ✅ `tests/component/stores/plan.nuxt.spec.ts` - Store testing pattern
- ✅ `tests/component/components/calendar/CalendarDateRangeListPicker.nuxt.spec.ts` - Component testing best practices
- ✅ `tests/e2e/ui/AdminPlanning.e2e.spec.ts` - E2E testing pattern with factories
- ✅ `tests/e2e/ui/Chef.e2e.spec.ts` - E2E testing with proper beforeAll/afterAll cleanup, salted test data
