# ADR Compliance - Frontend

**Generated:** 2025-11-11
**Last Updated:** 2026-10-27
**History:** git and the feature plans under `docs/features/` (shipped plans in `docs/features/archived/`)

One row per route, component, store and composable: which ADRs it answers to, its markers and its test coverage. The code
and the component headers hold the detail; a row names a gap in a few words.

## Legend

| Marker | Compliance | Tests |
|---|---|---|
| ✅ | compliant | own spec |
| ✅ parent | | covered through a parent's spec |
| ⚠️ | partial, the gap named in Status | one of component spec and e2e |
| ❌ | non-compliant | none |
| ❓ | not audited | |
| N/A | not applicable | no test needed |

## Page routes

| Route | Component | Stores (ADR-007) | Form (ADR-008) | URL (ADR-006) | E2E | Component spec | Status |
|---|---|---|---|---|---|---|---|
| **Admin** | | | | | | | |
| `/admin/planning` | `AdminPlanning.vue` | ✅ plan | ✅ full | ✅ `?mode=` `?season=` | ✅ | ✅ | ✅ |
| `/admin/teams` | `AdminTeams.vue` | ✅ plan | ✅ partial | ✅ `?mode=` `?team=` | ✅ | ⚠️ the open row by id | ⚠️ partial unit; master-detail on `LAYOUTS.masterDetailPage` (ADR-018) |
| `/admin/households` | `AdminHouseholds.vue` | ✅ households | ❓ | ✅ `?mode=` | ✅ | ⚠️ loading row, the open row by id | ⚠️ audit needed |
| `/admin/allergies` | `AdminAllergies.vue` | ✅ allergies | N/A | ✅ `?allergy=` | ✅ | ✅ | ✅ master-detail on `LAYOUTS.masterDetailPage` (ADR-018) |
| `/admin/users` | `AdminUsers.vue` | ✅ users | N/A | ✅ | ✅ | ⚠️ loading row, the open row by id | ⚠️ partial unit |
| `/admin/economy` | `AdminEconomy.vue` | ✅ plan, bookings | N/A | ✅ `?period=` `?invoice=` | ✅ serial | ⚠️ the URL's selection, the loading rows, the upcoming table's Menu cell | ⚠️ partial unit |
| `/admin/system` | `AdminSystem.vue` | N/A, `storeAsyncData` (ADR-007 component-local) | N/A | ✅ | ✅ | ✅ | ✅ |
| `/admin/allergies/pdf` | `admin/allergies/pdf.vue` | ✅ allergies, plan | N/A | N/A | ✅ smoke | ✅ | ✅ |
| **Household** | | | | | | | |
| `/household/[shortname]` | `household/[shortname]/index.vue` | ✅ households | N/A | ✅ `?pbs=` | ✅ | ⚠️ | ⚠️ review `?pbs` on redirect |
| `/household/[shortname]/[tab]` | `household/[shortname]/[tab].vue` | ✅ households, auth | N/A | ✅ `?pbs=`, the tab path | ✅ `household` | ✅ `household-tab`: the URL's household, the override per viewer and tab, the edit props on the tabs that edit | ✅ ADR-018 tokens |
| `/household/[shortname]/bookings` | `HouseholdBookings.vue` | ✅ plan, households, bookings | N/A | ✅ `?pbs=` `?cal=` | ✅ | ✅ | ✅ master-detail on `LAYOUTS.masterDetailPage` while the calendar shows (ADR-018) |
| `/household/[shortname]/allergies` | `HouseholdAllergies.vue` | ✅ allergies | ❓ | ✅ `?pbs=` | ✅ | ⚠️ loading, the open row by id | ⚠️ partial unit, the open row by id |
| `/household/[shortname]/settings` | `HouseholdSettings.vue` | ✅ households | N/A | ✅ `?pbs=` | ✅ | ⚠️ the undo's toast and alert | ⚠️ partial unit |
| `/household/[shortname]/economy` | `HouseholdEconomy.vue` | ✅ plan, bookings | N/A | ✅ `?pbs=` | ❌ | ⚠️ the upcoming table's Menu cell | ⚠️ partial unit |
| **Other** | | | | | | | |
| `/` | `Hero.vue` | N/A | N/A | N/A | ✅ | ✅ | ✅ |
| `/login` | `Login.vue` | ✅ auth | N/A | ✅ | ✅ | ⚠️ via the cards | ⚠️ e2e only |
| `/dinner` | `dinner/index.vue` | ✅ plan, bookings, auth | N/A | ✅ `?date=` `?cal=` | ✅ | ❌ | ⚠️ e2e only; master-detail on `LAYOUTS.masterDetailPage` (ADR-018) |
| `/chef` | `chef/index.vue` | ✅ plan, users, allergies, bookings | N/A | ✅ `?team=` over the season's teams, `?date=`, `?view=`; a calendar click writes `?team=` and `?date=` in one navigation | ✅ | ❌ | ⚠️ e2e only; master-detail on `LAYOUTS.masterDetailPage` (ADR-018); a team the person is not on opens as a visit, read through the plan store's selected team; the bookings store toasts the chef's dinner actions (ADR-007) |
| **Public** | | | | | | | |
| `/public/billing/[token]` | `public/billing/[token].vue` | N/A, `storeAsyncData` (ADR-007 component-local) | N/A | N/A | ✅ `PublicBilling` | ❌ | ⚠️ e2e only |
| `/public/billing/[token].csv` | `public/billing/[token].csv.vue` | N/A | N/A | N/A | ❌ | ❌ | ❌ no tests; no link reaches it |

## Components

Types (ADR-001) and domain objects (ADR-010) come from validation composables in every row below; a deviation is named in
Status.

### Admin planning

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `AdminPlanning.vue` | `/admin/planning` | plan | ✅ | ✅ | ✅ |
| `AdminPlanningSeason.vue` | `/admin/planning` | plan | ✅ | ✅ parent | ✅ |
| `AdminToCreateSeason.vue` | `/admin/planning`, `/admin/teams` | none | ✅ | ❌ | ✅ |
| `TicketPriceListEditor.vue` | `/admin/planning` | none | ✅ | ✅ parent | ✅ |
| `SeasonSelector.vue` | `/admin/planning`, `/admin/teams` | plan | ✅ | ✅ parent | ✅ |
| `SeasonStatusDisplay.vue` | `/admin/planning` | plan | ✅ | ✅ parent | ✅ |

### Admin teams

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `AdminTeams.vue` | `/admin/teams` | plan, households | ⚠️ the open row by id | ✅ | ⚠️ partial unit |
| `CookingTeamCard.vue` | `/admin/teams`, `/chef`, `/dinner` | plan, households | ✅ | ✅ parent | ✅; on a visit on /chef the header carries "Ikke dit hold" (`COMPONENTS.visitBadge`, shared with the visiting tab) |
| `TeamMemberAddForm.vue` | `/admin/teams` | none | ✅ | ✅ parent | ✅ |
| `TeamRoleFields.vue` | `/admin/teams` | none | ✅ parent | ✅ parent | ✅ |
| `JokerSlotForm.vue` | `/admin/teams` | none | ✅ | ✅ | ✅ |
| `MyTeamSelector.vue` | `/chef` | none | ✅ | ✅ parent | ✅ the visiting tab last, its badge word from `TEAM_WORDS` (ADR-017) |
| `WorkAssignment.vue` | `/dinner`, `/chef` | plan, auth | ❌ | ✅ parent | ⚠️ missing unit |
| `InhabitantSelector.vue` | `/admin/teams` | none | ✅ | ✅ parent | ✅ |
| `CookingTeamBadges.vue` | `/admin/teams`, `/chef`, `/dinner` | none | ✅ | ✅ parent | ✅ |
| `TeamCalendarDisplay.vue` | `/admin/teams` | none | ✅ | ❌ | ✅ the dinner on a day from `useTemporalCalendar`'s `getDinnerForDay` |

### Admin households

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `AdminHouseholds.vue` | `/admin/households` | households | ⚠️ loading row, the open row by id | ✅ | ⚠️ partial unit |
| `HouseholdCreateForm.vue` | `/admin/households` | households | ✅ | ✅ parent | ❓ audit needed |
| `HouseholdEditPanel.vue` | `/admin/households` | none | ✅ | ✅ parent | ✅ |
| `HouseholdCard.vue` | `/admin/households`, `/household/[shortname]` | households, plan | ✅ | ✅ parent | ⚠️ partial unit |
| `InhabitantCard.vue` | `/admin/households`, `/household/[shortname]` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `HouseholdListItem.vue` | `/admin/households` | none | ❌ | N/A | ⚠️ missing unit |
| `HouseholdSettings.vue` | `/household/[shortname]/settings` | households | ⚠️ the undo's toast and alert | ✅ | ⚠️ partial unit |

### Allergies

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `AdminAllergies.vue` | `/admin/allergies` | allergies, households | ✅ | ✅ | ✅ |
| `AllergyCatalogTable.vue` | `/admin/allergies`, `/chef` | none | ✅ | ✅ parent | ✅ |
| `AllergyDetailPanel.vue` | `/admin/allergies` | none | ✅ | ✅ parent | ✅ |
| `AllergenMultiSelector.vue` | `/admin/allergies`, `/chef` | none | ✅ | ✅ parent | ✅ |
| `AllergyOverviewLine.vue` | `/chef`, `/dinner`, `/admin/allergies` | none | ✅ | ✅ parent | ✅ |
| `AllergyTypeCard.vue` | `/admin/allergies`, `/household/[shortname]/allergies` | plan | ✅ | ✅ parent | ✅ |
| `AllergyTypeDisplay.vue` | `/dinner`, `/chef`, `/admin/allergies`, `/household/[shortname]/allergies` | none | ✅ | N/A | ✅ |
| `AllergyNotes.vue` | `/admin/allergies`, `/admin/allergies/pdf` | none | ✅ | ✅ parent | ✅ |
| `HouseholdAllergies.vue` | `/household/[shortname]/allergies` | allergies, households | ⚠️ loading, the open row by id | ✅ | ⚠️ component: loading, `adminBypass` on each change, the open row by id |
| `AllergyEditor.vue` | `/household/[shortname]/allergies` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `AllergyManagersList.vue` | `/admin/allergies`, `/household/[shortname]/allergies` | users | ❌ | ❌ | ❌ no tests |

### Shared

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `TableSearchPagination.vue` | `/admin/users`, `/admin/households` | none | ✅ | ✅ parent | ✅ |
| `UserPreferencesCard.vue` | `/login` | auth | ✅ | ✅ | ✅ |
| `UserProfileCard.vue` | `/login`, `/admin/users` | auth, users | ✅ | ✅ | ✅ |
| `UserView.vue` | every route | auth | ❌ | ❌ | ❌ no tests |
| `UserListItem.vue` | `/admin/users`, `/admin/allergies`, `/household/[shortname]` | none | ✅ | ✅ parent | ⚠️ `label` props declared, not rendered |
| `DangerButton.vue` | `/household/[shortname]/settings`, `/admin/economy`, `/chef` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `QrCode.vue` | `/admin/allergies/pdf` | none | ✅ | ✅ parent | ✅ |
| `InstallPrompt.vue` | `/login` | none | ✅ | ✅ | ✅ |
| `ActionCard.vue` | `/login` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `RoleAssignment.vue` | `/chef`, `/dinner` | auth, plan | ✅ | ✅ serial | ✅ |
| `RoleAssignmentForm.vue` | `/chef`, `/dinner` | plan | ✅ | ✅ serial | ✅ |
| `DeadlineBadge.vue` | `/chef`, `/dinner`, `/household/[shortname]/bookings`, `/admin/economy` | none | ✅ parent | ✅ parent | ✅ |

### Calendars

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `CalendarDatePicker.vue` | `/household/[shortname]/settings`, `/admin/households` | none | ✅ | ✅ parent | ✅ |
| `CalendarDateRangePicker.vue` | `/admin/planning` | none | ✅ | ✅ parent | ✅ |
| `CalendarPickerPopover.vue` | via both pickers | none | ✅ parent | ✅ parent | ✅ |
| `CalendarDateRangeListPicker.vue` | `/admin/planning` | none | ✅ | ✅ parent | ✅ |
| `WeekDayMapDisplay.vue` | `/admin/planning`, `/admin/teams` | none | ✅ | ✅ parent | ✅ |
| `WeekDayMapDinnerModeDisplay.vue` | `/household/[shortname]/settings` | none | ❌ | ❌ | ❌ no tests |
| `BaseCalendar.vue` | every calendar | none | ❌ | N/A | ⚠️ missing unit |
| `CalendarLegend.vue` | `/admin/teams`, `/chef`, `/dinner`, `/household/[shortname]/bookings`, `/admin/economy` | none | ✅ | ✅ parent | ✅ the one "Forklaring" panel, one entry per row (`COMPONENTS.legend.list`, `sample`); `DinnerModeLegend`'s rows join its list |
| `CalendarDisplay.vue` | `/admin/planning` | none | ✅ | ❌ | ✅ |
| `ChefCalendarDisplay.vue` | `/chef` | none | ✅ | ✅ | ✅ the dinner on a day and a cancelled day from `useTemporalCalendar`'s `getDinnerForDay` and `isCancelledDay`; the other teams' dinners as plain circles from their own event list, the legend words from `TEAM_WORDS` (ADR-017) |
| `DinnerCalendarDisplay.vue` | `/dinner`, `/household/[shortname]/bookings` | none | ✅ | ✅ serial `Waitlist` | ✅ a cancelled day from `useTemporalCalendar`'s `isCancelledDay`, drawn as the chef calendar's (`CALENDAR.day.past` + `CALENDAR.day.cancelled`), its legend word from `BOOKING_WORDS.cancelledDinner` |
| `CountdownTimer.vue` | `/chef`, `/dinner` | none | ❌ | ✅ | ⚠️ missing unit |
| `CalendarDateNav.vue` | `/household/[shortname]/bookings`, `/chef`, `/dinner` | none | ✅ parent | ✅ serial | ✅ |
| `CalendarMasterPanel.vue` | `/chef`, `/dinner` | none | ❌ | ✅ parent | ⚠️ missing unit |

### Bookings

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `HouseholdBookings.vue` | `/household/[shortname]/bookings` | plan, households, bookings | ✅ | ✅ | ⚠️ partial unit |
| `BookingGridView.vue` | `/household/[shortname]/bookings` | bookings | ✅ `BookingGridView.nuxt.spec.ts` | ✅ serial | ✅ each cell's modes, the power cell's and the add-guest chevron's from `useBooking`'s `getBookingOptions` and `powerOptions`; an expected cell and the power cell keep the plan's ghost until the first click adopts it as a draft; a cancelled dinner's header binds `DINNER_STATE_BADGES.CANCELLED` and its cells `cancelled`; the edit footer keeps to the box in view (`bookingGrid.actionPanel`) (ADR-018) |
| `BookingViewSwitcher.vue` | `/household/[shortname]/bookings` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `ActionPreview.vue` | `/household/[shortname]/bookings`, `/household/[shortname]`, `/dinner`, `/admin/economy` | none | ✅ | ✅ parent | ✅ |
| `GuestBookingForm.vue` | `/household/[shortname]/bookings`, `/dinner`, `/admin/economy` | none | ✅ parent `DinnerBookingForm.nuxt.spec.ts`, `BookingGridView.nuxt.spec.ts` | ✅ parent | ✅ its modes from `useBooking`'s `getBookingOptions`, over the booking context from its parent (`bookingContextOf`) |
| `DinnerBookingForm.vue` | `/dinner`, `/household/[shortname]/bookings`, `/admin/economy` | allergies, auth, bookings, households, plan | ✅ `DinnerBookingForm.nuxt.spec.ts` | ✅ serial, incl. `Waitlist` | ✅ each row's modes from `useBooking`'s `getBookingOptions`, the power row's from `powerOptions`; an expected row's draft starts on the person's click (ADR-007); a cancelled dinner wears the cancel ribbon (`getRibbonClasses`, `ribbon` false inside ChefMenuCard), its word from `BOOKING_WORDS.cancelledDinner` (ADR-017), and its tickets and the expanded row's selector `cancelled` (ADR-018); no edit on a cancelled dinner, as on a past one |
| `DinnerModeLegend.vue` | `/household/[shortname]/bookings`, `/dinner`, `/admin/economy` | none | ✅ | ✅ parent | ✅ renders its rows into `CalendarLegend`'s list, its words from `BOOKING_WORDS` (ADR-017) |
| `DinnerModeSelector.vue` | `/household/[shortname]/bookings`, `/dinner` | none | ✅ `DinnerModeSelector.nuxt.spec.ts` | ✅ parent | ✅ offers the `enabledModes` its parent reads from `getBookingOptions`, in `DINNER_MODE_ORDER` (`useBooking`); a plan's faces bind `COMPONENTS.bookingGrid.expectedBadge` and `dinnerModeSelector.plannedButton`, a wish's `waitlist.ghostBadge`, in edit mode too, a cancelled dinner's view face `dinnerModeSelector.cancelledFace` in every form mode (ADR-018) |
| `DinnerEvent.vue` | `/household/[shortname]/bookings`, `/dinner` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `DinnerTicket.vue` | `/dinner`, `/household/[shortname]/bookings`, `/admin/planning` | none | ✅ | ✅ parent | ✅ a cancelled dinner's ticket binds `ticket.face.cancelled` (ADR-018) |
| `OrderHistoryDisplay.vue` | `/admin/economy`, `/household/[shortname]/economy`, `/dinner` | bookings | ✅ | ✅ parent | ✅ |
| `KitchenPreparation.vue` | `/dinner`, `/chef` | households | ✅ | ✅ parent | ✅ |
| `DinnerDetailHeader.vue` | `/chef`, `/dinner` | none | ✅ | ✅ serial | ✅ |
| `DinnerDetailPanel.vue` | `/chef`, `/dinner` | none | ❌ | ✅ | ⚠️ missing unit |

### Chef

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `ChefMenuCard.vue` | `/chef`, `/dinner` | allergies | ✅ real stores | ✅ serial `Waitlist` | ✅ the cancel ribbon's word from `BOOKING_WORDS.cancelledDinner` (ADR-017) |
| `DinnerBudget.vue` | `/chef` | none | ✅ | ✅ | ✅ |
| `ExpenseLines.vue` | `/chef` | none | ✅ | ✅ | ✅ |
| `VatAmount.vue` | `/chef` | none | ✅ | ✅ parent | ✅ |
| `CookingRoundSpending.vue` | `/chef` | bookings | ✅ | ❌ | ✅; a dot (`table.currentMarker`) and the bold name (`table.currentDinnerLabel`) on the dinner on view; the team's round heads with the team's badge (`CookingTeamBadges`) and its period and binds the round's orders loading |
| `TicketChanges.vue` | `/chef` | bookings | ✅ | ❌ | ✅; Husstand of a user's line over more than two households folds behind a "+N" link (`ticketChanges.householdsToggle`, `ticketChanges.households`), its words from `BOOKING_WORDS.ticketChange.households` (ADR-017, ADR-018) |
| `TeamRoleStatus.vue` | `/chef` | none | ✅ | ✅ parent | ✅ the role glyphs from `ROLE_ICONS`, the role and visitor lines from `TEAM_WORDS` (ADR-017, ADR-018) |
| `ChefDinnerCard.vue` | `/chef` | bookings | ✅ | ✅ parent | ✅ |
| `DinnerStatusStepper.vue` | `/chef` | bookings | ✅ parent | ✅ parent | ✅ |

### Economy

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `EconomyTable.vue` | `/admin/economy`, `/household/[shortname]/economy` | none | ✅ | ✅ parent | ✅ |
| `CostEntry.vue` | `/admin/economy`, `/household/[shortname]/economy` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `CostLine.vue` | `/admin/economy`, `/household/[shortname]/economy` | none | ✅ | ✅ parent | ✅ |
| `ControlBadge.vue` | `/admin/economy`, `/household/[shortname]/economy` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `ShareLinksPopover.vue` | `/admin/economy`, `/public/billing/[token]` | none | ❌ | ✅ parent | ⚠️ missing unit |

### Layout

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `PageHeader.vue` | every route | auth | ❌ | ✅ parent | ⚠️ missing unit |
| `PageFooter.vue` | every route | none | ✅ | N/A | ✅ |
| `ViewError.vue` | every route | none | ❌ | ✅ parent | ⚠️ missing unit |
| `Loader.vue` | every route | none | ❌ | ✅ parent | ⚠️ missing unit |
| `Ticker.vue` | `/` | none | ❌ | N/A | ⚠️ missing unit |
| `HelpButton.vue` | every route | auth | ✅ | N/A | ✅ |
| `Logo.vue` | every route | none | ❌ | ✅ parent | ⚠️ missing unit |

## Stores

| Store | `storeAsyncData` reads | Status computeds | `isStoreReady` | Spec | Status |
|---|---|---|---|---|---|
| `plan.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `households.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `allergies.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `users.ts` | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ no ready flag, no `isEmpty`, `isInitialized` on my teams only; 0.9.1 |
| `auth.ts` | N/A | ✅ | N/A | ✅ | ✅ |
| `bookings.ts` | ✅ | ✅ | ✅ | ✅ | ✅ spec covers the queue entries, the household places, the dinner's queue, `addExtraPortions`, `isBookingsReloading`, the toasts of the chef's dinner actions, and the GET reads `fetchExpectedBookings` and `previewBookings`; words from `app/config/` (ADR-017) |

## Composables

| Composable | Kind (ADR-017) | Schemas (ADR-001) | Enums re-exported | Domain types (ADR-010) | Spec | Status |
|---|---|---|---|---|---|---|
| **Validation** | | | | | | |
| `useCoreValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useBookingValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ `BookingFailureSchema` (module-level `BookingFailure`) gives a failed order its reason; `WaitlistAssignedSchema` lives here, for the outcomes a scaffold run reports (`waitlistPortionsAssigned`) |
| `useSeasonValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useCookingTeamValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useDutyValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useAllergyValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useTicketPriceValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useDateRangeValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ |
| `useWeekDayMapValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ |
| `useBillingValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useHeynaboValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ |
| `useMaintenanceValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ |
| `useDeliveryValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ operation result types (ADR-009): `DeliveryCountsSchema`, a sender event's notifications sent; `DeliveryDryRunSchema`, the delivery dry run per user |
| `useNotificationValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ parent | ✅ |
| `useSettingValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ |
| `useUserPreferenceValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useWaitlistValidation()` | isomorphic | ✅ | ✅ `PlacementRecoverySchema` | ✅ | ✅ parent | ✅ an entry carries its placement (`placingAt`, `placingOrderId`); `PlacementOrderSchema` is the order a recovery reads; `WaitlistAssignedSchema` comes from `useBookingValidation` |
| `useFeedbackValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ parent | ✅ |
| `fragments/domainFragments.ts` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ `server/` reaches it through the validation composables |
| **Business logic** | | | | | | |
| `useBooking()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ |
| `useWaitlist()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ `placingLease` tells a held grab from an expired one, `placementLines` stop at an entry another run holds, `placingOrderOf` finds the order that serves a grab, `placementRecoveryOf` finishes or releases a stopped run's grab, `finishedPlacementOutcomes` reports a finished placement for its mails |
| `useHousehold()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ |
| `useSeason()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ |
| `useCookingTeam()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useBilling()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ |
| `useHeynabo()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ |
| `useOrder()` | client | N/A | N/A | ✅ | ✅ | ✅ a ticket's state is `useBooking`'s `ticketStateOf`; `server/` reaches none of `useOrder` |
| `useAllergy()` | client | N/A | N/A | ✅ | ✅ | ✅ |
| `useTicket()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ `findTicketPriceById`, the one price lookup by id; `resolveTicketPriceOn`, a ticket's price row on its dinner date |
| `useMaintenance()` | client | N/A | N/A | ✅ | ✅ | ✅ |
| `useUserRoles` (module) | isomorphic | ⚠️ | N/A | ✅ | ✅ | ⚠️ generated-enum import; 0.9.1 |
| `usePermissions()` | isomorphic | ⚠️ | N/A | N/A | ✅ | ⚠️ generated-enum import; 0.9.1 |
| **UI and navigation** | | | | | | |
| `useBookingView()` (with `useCalendarOpenParam`, `useDinnerDateParam`) | client | ✅ | N/A | ✅ | ✅ | ✅ |
| `useEntityFormManager()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useTabNavigation()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useSeasonSelector()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useQueryParam()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useUrlQueryWriter()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useApiHandler()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useBookingUi()` | pure UI | N/A | N/A | ✅ | ✅ | ✅ a failed order's conflict reads in the result lines (`CONFLICT_WORDS`) |
| `useUserRolesUi()` | pure UI | N/A | N/A | N/A | ✅ | ✅ |
| `useInstallPrompt()` | pure UI | N/A | N/A | N/A | ✅ | ✅ |
| `useTemporalCalendar()` | client | N/A | N/A | ✅ | ✅ parent | ✅ the dinner on a calendar day and a cancelled day (`getDinnerForDay`, `isCancelledDay`), for the three calendars |
| `useCalendarEvents()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useExpandableRow()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useTheSlopeDesignSystem()` | design system (ADR-018) | N/A | N/A | N/A | ✅ architecture specs, unit | ✅ |

## Checklist

For a new or changed page, component, store or composable:

- [ ] UI renders Nuxt UI components; shared UI values bind design-system tokens (ADR-018, `docs/ui.md`)
- [ ] Mobile-first: `md:` classes inside tokens; behaviour reads `breakpoint` from the design system
- [ ] Reads go through `storeAsyncData`, writes through `apiRequest`; stores expose the status flags; init is synchronous (ADR-007)
- [ ] Types, schemas and enums come from validation composables; enum values through `.enum` (ADR-001)
- [ ] Domain types throughout; serialization lives in the repository (ADR-010)
- [ ] Tabs are path-based, form mode is `?mode=`, a query parameter goes through `useQueryParam` and the URL writer; household URLs through `getHouseholdUrl()` (ADR-006)
- [ ] CRUD forms manage mode through `useEntityFormManager` (ADR-008)
- [ ] A composable the server imports is isomorphic; presentation lives in `use<Domain>Ui` (ADR-017)
- [ ] Form elements carry `name`; interactive elements carry `data-testid` (`docs/testing.md`)
- [ ] The row above is updated: markers, spec, e2e, status

## Reference implementations

| Pattern | File |
|---|---|
| Page with form manager, store and URL mode (ADR-006, 007, 008) | `AdminPlanning.vue` |
| Master table with a framed detail, selection in the URL | `AdminTeams.vue` |
| Store on `storeAsyncData` with selection getters | `app/stores/plan.ts` |
| Validation composable (ADR-001 three layers) | `useSeasonValidation.ts` |
| Isomorphic business logic (ADR-016, ADR-017) | `useBooking.ts`, `useCookingTeam.ts` |
| Reactive composable inputs (`MaybeRefOrGetter`) | `useTemporalCalendar.ts` |
| Store spec | `tests/component/stores/plan.nuxt.spec.ts` |
| Component spec | `tests/component/components/calendar/CalendarDateRangeListPicker.nuxt.spec.ts` |
| E2E with factories, salted data and cleanup | `tests/e2e/ui/AdminPlanning.e2e.spec.ts`, `Chef.e2e.spec.ts` |
| A browser spec's own dinner on a free day, reached through `?date=` | `tests/e2e/ui/ChefExpenses.e2e.spec.ts` |
