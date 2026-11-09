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
| `/admin/[tab]` | `admin/[tab].vue` | ✅ plan, bookings, auth | N/A | ✅ the tab path, `?season=`, `?team=` | ✅ `admin` | ✅ `admin-tab`: the season and the team the URL names, the billing overview, who edits allergies, the head, the tabs and the read-only banner | ✅ its words from `ADMIN_WORDS` (ADR-017); its classes on `COMPONENTS.adminPage` (ADR-018) |
| `/admin/planning` | `AdminPlanning.vue` | ✅ plan | ✅ full | ✅ `?mode=` `?season=` | ✅ | ✅ | ✅ |
| `/admin/teams` | `AdminTeams.vue` | ✅ plan | ✅ partial | ✅ `?mode=` `?team=` | ✅ | ⚠️ the open row by id | ⚠️ partial unit; master-detail on `LAYOUTS.masterDetailPage` (ADR-018) |
| `/admin/households` | `AdminHouseholds.vue` | ✅ households | ❓ | ✅ `?mode=` | ✅ | ⚠️ loading row, the open row by id | ⚠️ audit needed |
| `/admin/allergies` | `AdminAllergies.vue` | ✅ allergies | N/A | ✅ `?allergy=` | ✅ | ✅ | ✅ master-detail on `LAYOUTS.masterDetailPage` (ADR-018) |
| `/admin/users` | `AdminUsers.vue` | ✅ users | N/A | ✅ | ✅ | ⚠️ loading row, the open row by id | ⚠️ partial unit; asks for the users through `loadUsers` at setup (ADR-007 compliance 8); button verbs and the open-details toggle from `BUTTON_WORDS`, the header, search, columns, caption and failed read from `USER_WORDS.admin` (ADR-017); a user without an inhabitant named by `USER_WORDS.unknownUser` (ADR-017) |
| `/admin/economy` | `AdminEconomy.vue` | ✅ plan, bookings | N/A | ✅ `?period=` `?invoice=` | ✅ serial | ⚠️ the URL's selection, the loading rows, the upcoming table's Menu cell, the columns and the boxes of a dinner and a closed period, the billing words | ⚠️ partial unit; button verbs and the details toggle from `BUTTON_WORDS`, its words from `BOOKING_WORDS.billing`, the PBS number from `HOUSEHOLD_WORDS.facts` (ADR-017); the upcoming lines name the eater the order carries; it asks the store for the upcoming orders of every household |
| `/admin/system` | `AdminSystem.vue` | N/A, `storeAsyncData` (ADR-007 component-local) | N/A | ✅ | ✅ | ✅ | ✅ a box's stat lines wear their own stats' icons (`JobStat` from `jobRunStats`), no cast; trigger buttons by `data-testid` (ADR-018); box words from `MAINTENANCE_WORDS` (ADR-017); the config tree as Nuxt UI `TreeItem`s, no cast; the Heynabo import's header wears the Heynabo logo (`IMG.heynabo` on `UAvatar`, `COMPONENTS.adminSystem.jobLogo`), the spinning sync icon while a job runs |
| `/admin/allergies/pdf` | `admin/allergies/pdf.vue` | ✅ allergies, plan | N/A | N/A | ✅ smoke | ✅ colour mode, button style, the poster's words | ✅ light mode by page meta; layout from `COMPONENTS.allergyPoster` on `BG.page` (ADR-018); words from `ALLERGY_WORDS.poster`, `ALLERGY_WORDS.managers.posterMessage` and `BUTTON_WORDS` (ADR-017); the date through `formatDate` |
| **Household** | | | | | | | |
| `/household/[shortname]` | `household/[shortname]/index.vue` | N/A | N/A | ✅ the route redirect to the bookings tab keeps the whole query | ✅ | ✅ `household`: `householdBookingsRedirect` | ✅ redirect by page meta (`householdBookingsRedirect`, `HOUSEHOLD_TAB` in `app/utils/household.ts`, ADR-006) |
| `/household/[shortname]/[tab]` | `household/[shortname]/[tab].vue` | ✅ households, auth | N/A | ✅ `?pbs=`, the tab path | ✅ `household` | ✅ `household-tab`: the URL's household, the override per viewer and tab, the edit props on the tabs that edit | ✅ ADR-018 tokens; its words from `HOUSEHOLD_WORDS.page` (ADR-017) |
| `/household/[shortname]/bookings` | `HouseholdBookings.vue` | ✅ plan, households, bookings | N/A | ✅ `?pbs=` `?cal=` | ✅ | ✅ | ✅ master-detail on `LAYOUTS.masterDetailPage` while the calendar shows (ADR-018) |
| `/household/[shortname]/allergies` | `HouseholdAllergies.vue` | ✅ allergies | ❓ | ✅ `?pbs=` | ✅ | ⚠️ loading, the open row by id | ⚠️ partial unit, the open row by id |
| `/household/[shortname]/settings` | `HouseholdSettings.vue` | ✅ households | N/A | ✅ `?pbs=` | ✅ | ⚠️ the undo's toast and alert, the tab's words, the move-out draft | ⚠️ partial unit; its words from `HOUSEHOLD_WORDS` (ADR-017); the move-out draft starts on the edit button (ADR-007) |
| `/household/[shortname]/economy` | `HouseholdEconomy.vue` | ✅ plan, bookings | N/A | ✅ `?pbs=` | ❌ | ⚠️ the upcoming table's Menu cell, the columns, the billing words, the requests following the `household` prop, the loading rows | ⚠️ partial unit; the details toggle from `BUTTON_WORDS`, its words from `BOOKING_WORDS.billing` (ADR-017); the upcoming lines name the eater the order carries; its `household` prop names the household of the upcoming orders and the billing it asks the store for |
| **Other** | | | | | | | |
| `/` | `Hero.vue` | N/A | N/A | N/A | ✅ | ✅ | ✅ |
| `/login` | `Login.vue` | ✅ auth | N/A | ✅ | ✅ | ✅ `Login.nuxt.spec.ts` | ✅ its words from `USER_WORDS.login` (ADR-017); its layout from `COMPONENTS.login` (ADR-018) |
| `/dinner` | `dinner/index.vue` | ✅ plan, bookings, auth | N/A | ✅ `?date=` `?cal=` | ✅ | ❌ | ⚠️ e2e only; master-detail on `LAYOUTS.masterDetailPage` (ADR-018); no dead props on the calendar |
| `/chef` | `chef/index.vue` | ✅ plan, users, allergies, bookings | N/A | ✅ `?team=` over the season's teams, by default the person's first team, else the team of the season's next dinner; `?date=`, `?view=`; a calendar click writes `?team=` and `?date=` in one navigation | ✅ | ✅ `chef.nuxt`: the team on view with and without `?team=`, the visit of a person on no team, "Ingen madhold" alone with no dinner ahead or no season, the own teams from the users store and no users list read | ✅ the only page that asks for the person's own teams (`loadMyTeams`); the plan store's team dataset waits for the selected season and the own teams, so the server render carries a no-team visit's team (ADR-007 compliance 9); master-detail on `LAYOUTS.masterDetailPage` (ADR-018); the next dinner from `useSeason().splitDinnerEvents` on `useClock`, dinner dates used as the `Date` they are (ADR-017); a team the person is not on opens as a visit, read through the plan store's selected team; with no team on view the calendar slot stays empty; the bookings store toasts the chef's dinner actions (ADR-007); `?view=` through `CHEF_CALENDAR_VIEW` and the accordion's `ACCORDION_STATE`, no literal; the head, the master's title and the failed reads from `TEAM_WORDS.page` (ADR-017); the card's advance arrives as a `DinnerState` |
| **Public** | | | | | | | |
| `/public/billing/[token]` | `public/billing/[token].vue` | N/A, `storeAsyncData` (ADR-007 component-local) | N/A | N/A | ✅ `monthly-billing.feature`: no sideways scroll on a phone | ✅ `public-billing`: the billing words of a link and a gone link | ✅ its words from `BOOKING_WORDS.billing` (ADR-017); its classes on `COMPONENTS.publicBilling` (ADR-018) |
| `/public/billing/[token].csv` | `public/billing/[token].csv.vue` | N/A | N/A | N/A | ❌ | ❌ | ❌ no tests; no link reaches it; its class on `COMPONENTS.publicBilling` (ADR-018) |

## Components

Types (ADR-001) and domain objects (ADR-010) come from validation composables in every row below; a deviation is named in
Status.

### Admin planning

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `AdminPlanning.vue` | `/admin/planning` | plan | ✅ | ✅ | ✅ |
| `AdminPlanningSeason.vue` | `/admin/planning` | plan | ✅ | ✅ parent | ✅ button verbs from `BUTTON_WORDS`, its words from `SEASON_WORDS.editor` (ADR-017); its layout from `COMPONENTS.seasonForm`, the cooking day count from `COMPONENTS.statBox` (ADR-018) |
| `AdminToCreateSeason.vue` | `/admin/planning`, `/admin/teams` | none | ✅ | ❌ | ✅ |
| `TicketPriceListEditor.vue` | `/admin/planning` | none | ✅ | ✅ parent | ✅ its words from `SEASON_WORDS.ticketPriceEditor`, the ticket type's field from `BOOKING_WORDS.ticketType` (ADR-017); the list and its empty line from `COMPONENTS.seasonFormList`, shared with the holiday list (ADR-018); a removal emits the prices without it |
| `SeasonSelector.vue` | `/admin/planning`, `/admin/teams` | plan | ✅ | ✅ parent | ✅ season states from `SEASON_STATUS` (`seasonWords.ts`, ADR-017) |
| `SeasonStatusDisplay.vue` | `/admin/planning` | plan | ✅ | ✅ parent | ✅ season states from `SEASON_STATUS` (`seasonWords.ts`, ADR-017); its alerts, hint and buttons from `SEASON_WORDS.statusAlert` and `SEASON_WORDS.activation` (ADR-017) |

### Admin teams

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `AdminTeams.vue` | `/admin/teams` | plan, households | ⚠️ the open row by id | ✅ | ⚠️ partial unit; button verbs and the open-details toggle from `BUTTON_WORDS`, the create button and the team count from `TEAM_WORDS.admin`, the column headers from `ADMIN_WORDS.tabs` and `TEAM_WORDS.card` (ADR-017); the card face from `TEAM_CARD_MODES` |
| `CookingTeamCard.vue` | `/admin/teams`, `/chef`, `/dinner` | plan, households | ✅ | ✅ parent | ✅; on a visit on /chef the header carries "Ikke dit hold" (`COMPONENTS.visitBadge`, shared with the visiting tab); role labels from `TEAM_WORDS.roles` (ADR-017); button verbs from `BUTTON_WORDS` (ADR-017); its words from `TEAM_WORDS.card`, the monitor headings from the roles' plurals (ADR-017); its face from `TEAM_CARD_MODES` (`app/types/form.ts`); the role groups per `TeamRole`, no `in` check or cast |
| `TeamMemberAddForm.vue` | `/admin/teams` | none | ✅ | ✅ parent | ✅ button verbs from `BUTTON_WORDS` (ADR-017) |
| `TeamRoleFields.vue` | `/admin/teams` | none | ✅ parent | ✅ parent | ✅ its role items from `TeamRoleSchema.options` and `TEAM_WORDS.roles` (ADR-017) |
| `JokerSlotForm.vue` | `/admin/teams` | none | ✅ | ✅ | ✅ button verbs from `BUTTON_WORDS`, its fields' words from `DUTY_WORDS.jokerSlot` (ADR-017) |
| `MyTeamSelector.vue` | `/chef` | none | ✅ | ✅ parent | ✅ the visiting tab last, "Ikke dit hold" on the team name's line (`COMPONENTS.myTeamSelector.nameLine`, `COMPONENTS.visitBadge`), its word from `TEAM_WORDS` (ADR-017, ADR-018); the visit alone for a person on no team; "Ingen madhold" on `ALERTS.emptyState` with no team and no visit |
| `WorkAssignment.vue` | `/dinner`, `/chef` | plan, auth | ❌ | ✅ parent | ⚠️ missing unit |
| `InhabitantSelector.vue` | `/admin/teams` | none | ✅ | ✅ parent | ✅ its default words from `HOUSEHOLD_WORDS.inhabitantSelector` (ADR-017) |
| `CookingTeamBadges.vue` | `/admin/teams`, `/chef`, `/dinner` | none | ✅ | ✅ parent | ✅ its size is the `SIZES` token the site binds (`NuxtUISize`, ADR-018) |
| `TeamCalendarDisplay.vue` | `/admin/teams` | none | ✅ | ❌ | ✅ each team's dinners on its rainbow stop, holidays ringed; no selection; a day's badge wears its list's `band`, no cast or non-null assertion |

### Admin households

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `AdminHouseholds.vue` | `/admin/households` | households | ⚠️ loading row, the open row by id | ✅ | ⚠️ partial unit; hands the store `HouseholdMoveOut`; its words from `HOUSEHOLD_WORDS.adminList` (ADR-017); the active households first by `ResidencyStatus` |
| `HouseholdCreateForm.vue` | `/admin/households` | households | ✅ `HouseholdCreateForm.nuxt.spec.ts` | ✅ parent | ⚠️ emits `HouseholdMoveOut`; its words from `HOUSEHOLD_WORDS.createForm`, button verbs from `BUTTON_WORDS` (ADR-017); its card, header and select bind `COMPONENTS.addCard`, shared with `GuestBookingForm` (ADR-018) |
| `HouseholdEditPanel.vue` | `/admin/households` | none | ✅ `HouseholdEditPanel.nuxt.spec.ts` | ✅ parent | ✅ its words from `HOUSEHOLD_WORDS.editPanel`, button verbs from `BUTTON_WORDS` (ADR-017); its layout from `COMPONENTS.householdEditPanel` (ADR-018) |
| `HouseholdCard.vue` | `/admin/households`, `/household/[shortname]` | households, plan | ✅ | ✅ parent | ⚠️ partial unit; passes the ring keys `household` and `inhabitant`; button verbs from `BUTTON_WORDS`, the power toggle, save and warning title from `BOOKING_WORDS.power`, its words from `HOUSEHOLD_WORDS.preferences` (ADR-017); power mode previews and saves through the first member's path with `allInhabitants`, one request each |
| `InhabitantCard.vue` | `/admin/households`, `/household/[shortname]` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `HouseholdListItem.vue` | `/admin/households` | none | ❌ | N/A | ⚠️ missing unit |
| `HouseholdSettings.vue` | `/household/[shortname]/settings` | households | ⚠️ the undo's toast and alert, the tab's words, the move-out draft | ✅ | ⚠️ partial unit; its words from `HOUSEHOLD_WORDS` (ADR-017); the move-out draft starts on the edit button (ADR-007) |

### Allergies

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `AdminAllergies.vue` | `/admin/allergies` | allergies, households | ✅ | ✅ | ✅ |
| `AllergyCatalogTable.vue` | `/admin/allergies`, `/chef` | none | ✅ | ✅ parent | ✅ |
| `AllergyDetailPanel.vue` | `/admin/allergies` | none | ✅ | ✅ parent | ✅ button verbs from `BUTTON_WORDS` (ADR-017) |
| `AllergenMultiSelector.vue` | `/admin/allergies`, `/chef` | none | ✅ | ✅ parent | ✅ |
| `AllergyOverviewLine.vue` | `/chef`, `/dinner`, `/admin/allergies` | none | ✅ | ✅ parent | ✅ |
| `AllergyTypeCard.vue` | `/admin/allergies`, `/household/[shortname]/allergies` | plan | ✅ | ✅ parent | ✅ button verbs from `BUTTON_WORDS` (ADR-017) |
| `AllergyTypeDisplay.vue` | `/dinner`, `/chef`, `/admin/allergies`, `/household/[shortname]/allergies` | none | ✅ | N/A | ✅ |
| `AllergyNotes.vue` | `/admin/allergies`, `/admin/allergies/pdf` | none | ✅ | ✅ parent | ✅ button verbs from `BUTTON_WORDS` (ADR-017) |
| `HouseholdAllergies.vue` | `/household/[shortname]/allergies` | allergies, households | ⚠️ loading, the open row by id | ✅ | ⚠️ component: loading, `adminBypass` on each change, the open row by id; button verbs from `BUTTON_WORDS`, the allergy toggle, the card and the editor label from `ALLERGY_WORDS`, the column headers from `HOUSEHOLD_WORDS` and `ADMIN_WORDS.tabs` (ADR-017) |
| `AllergyEditor.vue` | `/household/[shortname]/allergies` | none | ❌ | ✅ parent | ⚠️ missing unit; its label from `ADMIN_WORDS.tabs`, the placeholders and the aria-labels from `ALLERGY_WORDS.editor` (ADR-017) |
| `AllergyManagersList.vue` | `/admin/allergies`, `/admin/allergies/pdf`, `/household/[shortname]/allergies` | users | ✅ `AllergyManagersList.nuxt`: the managers who have an inhabitant, the box's title, line and label | ❌ | ✅ layout from `COMPONENTS.allergyManagersList`; mockup and visual check in its header; asks for the managers through `loadAllergyManagers` at setup (ADR-007 compliance 8); the title, the default message and the label from `ALLERGY_WORDS.managers` (ADR-017) |

### Shared

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `TableSearchPagination.vue` | `/admin/users`, `/admin/households` | none | ✅ | ✅ parent | ✅ |
| `UserPreferencesCard.vue` | `/login` | auth | ✅ | ✅ | ✅ words from `USER_WORDS.preferences` (ADR-017), channel icons in the component, every class on `COMPONENTS.userPreferencesCard` (ADR-018); channels by `NotificationChannelSchema.enum`, no cast; button verbs from `BUTTON_WORDS` (ADR-017) |
| `UserProfileCard.vue` | `/login`, `/admin/users` | auth, users | ✅ `UserProfileCard.nuxt.spec.ts` | ✅ | ✅ button verbs and the Heynabo name from `BUTTON_WORDS`, its words from `USER_WORDS.profile` (ADR-017); a role Heynabo owns is read-only by `useUserRoles`' `ROLE_OWNERSHIP`; the household from `UserDetailSchema` |
| `UserView.vue` | every route | auth | ❌ | ❌ | ❌ no tests |
| `UserListItem.vue` | `/admin/users`, `/admin/allergies`, `/household/[shortname]` | none | ✅ each ring key and the ring-less face, group and single mode | ✅ parent | ⚠️ `label` props declared, not rendered; `ring` typed `UserListItemRing` |
| `DangerButton.vue` | `/household/[shortname]/settings`, `/admin/economy`, `/chef` | none | ✅ `DangerButton.nuxt.spec.ts` | ✅ parent | ✅ the busy and armed labels from `BUTTON_WORDS` (ADR-017); the default and armed colours and variants from `COLOR` and `NOISE`, the root, the armed ring and ink (`TEXT.onFill`) and the countdown gradient per mode from `COMPONENTS.dangerButton`, the component setting only the wipe position (ADR-018); size and variant typed `NuxtUISize`, `NuxtUIButtonVariant` |
| `QrCode.vue` | `/admin/allergies/pdf` | none | ✅ | ✅ parent | ✅ |
| `InstallPrompt.vue` | `/login` | none | ✅ | ✅ | ✅ |
| `ActionCard.vue` | `/login` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `RoleAssignment.vue` | `/chef`, `/dinner` | auth, plan | ✅ | ✅ serial | ✅ role labels from `TEAM_WORDS.roles`, the duty change trigger from `TEAM_WORDS.dutyChange` (ADR-017) |
| `RoleAssignmentForm.vue` | `/chef`, `/dinner` | plan | ✅ | ✅ serial | ✅ role labels from `TEAM_WORDS.roles` (ADR-017); button verbs from `BUTTON_WORDS` (ADR-017) |
| `DeadlineBadge.vue` | `/chef`, `/dinner`, `/household/[shortname]/bookings`, `/admin/economy` | none | ✅ parent | ✅ parent | ✅ |

### Calendars

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `CalendarDatePicker.vue` | `/household/[shortname]/settings`, `/admin/households` | none | ✅ | ✅ parent | ✅ its default label from `DATE_WORDS.picker` (ADR-017); the padded field from `COMPONENTS.datePickerField` (ADR-018); the field and the calendar hand over whole dates, so a pick needs no validation of its own |
| `CalendarDateRangePicker.vue` | `/admin/planning` | none | ✅ | ✅ parent | ✅ its default label from `DATE_WORDS.picker` (ADR-017); the padded field from `COMPONENTS.datePickerField` (ADR-018) |
| `CalendarPickerPopover.vue` | via both pickers | none | ✅ parent | ✅ parent | ✅ |
| `CalendarDateRangeListPicker.vue` | `/admin/planning` | none | ✅ | ✅ parent | ✅ its words from `DATE_WORDS.picker.holidays` (ADR-017); its layout from `COMPONENTS.holidayListPicker`, the list and its empty line from `COMPONENTS.seasonFormList` (ADR-018); a removal emits the list without the holiday |
| `WeekDayMapDisplay.vue` | `/admin/planning`, `/admin/teams` | none | ✅ | ✅ parent | ✅ |
| `WeekDayMapDinnerModeDisplay.vue` | `/household/[shortname]/settings` | none | ❌ | ❌ | ❌ no tests; the edit layout from `WEEKDAY.editRow`, `WEEKDAY.editDay` (ADR-018) |
| `BaseCalendar.vue` | every calendar | none | ❌ | N/A | ⚠️ missing unit |
| `CalendarLegend.vue` | `/admin/teams`, `/chef`, `/dinner`, `/household/[shortname]/bookings`, `/admin/economy` | none | ✅ | ✅ parent | ✅ the one "Forklaring" panel, one entry per row (`COMPONENTS.legend.list`, `sample`); `DinnerModeLegend`'s rows join its list; `LEGEND_KIND` names the kinds; its title from `DATE_WORDS.calendarLegend` (ADR-017) |
| `CalendarDisplay.vue` | `/admin/planning` | none | ✅ | ❌ | ✅ |
| `ChefCalendarDisplay.vue` | `/chef` | none | ✅ | ✅ | ✅ the dinner on a day and a cancelled day from `useTemporalCalendar`'s `getDinnerForDay` and `isCancelledDay`; the other teams' dinners as plain circles from their own event list, the legend words from `TEAM_WORDS` (ADR-017); views by `CHEF_CALENDAR_VIEW`, a tab click read back from the tab, no cast; the countdown, tab, agenda and chevron words from `TEAM_WORDS.calendar` and `DATE_WORDS.countdown` (ADR-017); a day's colour from `dayColorClass(CHEF_CALENDAR, …)`, its type from `dayTypeOf`, categories by `TEMPORAL_CATEGORY` |
| `DinnerCalendarDisplay.vue` | `/dinner`, `/household/[shortname]/bookings` | none | ✅ | ✅ serial `Waitlist` | ✅ a cancelled day from `useTemporalCalendar`'s `isCancelledDay`, drawn as the chef calendar's (`CALENDAR.day.past` + `CALENDAR.day.cancelled`), its legend word from `BOOKING_WORDS.cancelledDinner`; the countdown and accordion words from `BOOKING_WORDS.calendar` and `DATE_WORDS.countdown`; a day's colour from `dayColorClass(DINNER_CALENDAR, …)`, its type from `dayTypeOf` |
| `CountdownTimer.vue` | `/chef`, `/dinner` | none | ✅ `CountdownTimer.nuxt.spec.ts` | ✅ | ✅ palettes by `COUNTDOWN_PALETTE`, states by `COUNTDOWN_STATE`, words from `DATE_WORDS.countdown`; `nextEvent` is a `DinnerEventDate`, its date read as given |
| `CalendarDateNav.vue` | `/household/[shortname]/bookings`, `/chef`, `/dinner` | none | ✅ parent | ✅ serial | ✅ |
| `CalendarMasterPanel.vue` | `/chef`, `/dinner` | none | ❌ | ✅ parent | ⚠️ missing unit |

### Bookings

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `HouseholdBookings.vue` | `/household/[shortname]/bookings` | plan, households, bookings | ✅ | ✅ | ⚠️ partial unit; dates read as given; the grid's `navigate` goes straight to `useBookingView`'s `navigate` |
| `BookingGridView.vue` | `/household/[shortname]/bookings` | bookings | ✅ `BookingGridView.nuxt.spec.ts` | ✅ serial | ✅ each cell's modes, the power cell's and the add-guest chevron's from `useBooking`'s `getBookingOptions` and `powerOptions`; a person's cell, the guest rows and the planned bookings from `useBookingUi`'s `personOnDinner`, `guestItemsOf` and `useExpectedBookings`, a cancelled dinner from `isDinnerCancelled`, as the day view reads them (ADR-016 compliance 13); an expected cell and the power cell keep the plan's ghost until the first click adopts it as a draft; a cancelled dinner's header binds `DINNER_STATE_BADGES.CANCELLED` and its cells `cancelled`; the edit footer keeps to the box in view (`bookingGrid.actionPanel`) (ADR-018); the header lock chip read once per header (`headerLockChipOf`), no non-null assertion; the power cell intersects its column's cells as built; each one-item loop keyed by its own value; `navigate` carries a `PeriodDirection`; the power row's and the add-guest row's names, the sum footer and the unknown booker from `BOOKING_WORDS`, the name column from `HOUSEHOLD_WORDS.inhabitant`, the working label from `BUTTON_WORDS` (ADR-017) |
| `BookingViewSwitcher.vue` | `/household/[shortname]/bookings` | none | ✅ `BookingViewSwitcher.nuxt.spec.ts` | ✅ parent | ✅ the default view from `BookingViewSchema.enum`, the labels from `DATE_WORDS.periodViews` (ADR-017); the selected and other views' variants from `NOISE`, the label's md breakpoint from `COMPONENTS.bookingViewSwitcher` (ADR-018) |
| `ActionPreview.vue` | `/household/[shortname]/bookings`, `/household/[shortname]`, `/dinner`, `/admin/economy` | none | ✅ | ✅ parent | ✅ |
| `GuestBookingForm.vue` | `/household/[shortname]/bookings`, `/dinner`, `/admin/economy` | none | ✅ `GuestBookingForm.nuxt.spec.ts`, parent `DinnerBookingForm.nuxt.spec.ts`, `BookingGridView.nuxt.spec.ts` | ✅ parent | ✅ its modes from `useBooking`'s `getBookingOptions`, over the booking context from its parent (`bookingContextOf`); button verbs from `BUTTON_WORDS`, its title from `BOOKING_WORDS.guests.add` (ADR-017); its input schema in the component (ADR-001 compliance 4), the rules' words from `BOOKING_WORDS.guestForm`, its field words from `BOOKING_WORDS.guestForm.fields`; its card, header and select bind `COMPONENTS.addCard`, shared with `HouseholdCreateForm` (ADR-018) |
| `DinnerBookingForm.vue` | `/dinner`, `/household/[shortname]/bookings`, `/admin/economy` | allergies, auth, bookings, households, plan | ✅ `DinnerBookingForm.nuxt.spec.ts` | ✅ serial, incl. `Waitlist` | ✅ each row's modes from `useBooking`'s `getBookingOptions`, the power row's from `powerOptions`; a person's row, the guest rows and the planned bookings from `useBookingUi`'s `personOnDinner`, `guestItemsOf` and `useExpectedBookings`, a cancelled dinner from `isDinnerCancelled`, as the grid reads them (ADR-016 compliance 13); an expected row's draft starts on the person's click (ADR-007); a cancelled dinner wears the cancel ribbon (`getRibbonClasses`, `ribbon` false inside ChefMenuCard), its word from `BOOKING_WORDS.cancelledDinner` (ADR-017), and its tickets and the expanded row's selector `cancelled` (ADR-018); no edit on a cancelled dinner, as on a past one; button verbs from `BUTTON_WORDS` (ADR-017); the add-guest row's name and the power row's name and save from `BOOKING_WORDS` (ADR-017); the power row's warning from `BOOKING_WORDS.power.alert`, the expanded rows' titles, the face group's name, a missing booker and a missing price from `BOOKING_WORDS.power`, `.guests` and `.bookingForm`, the day bill through `formatKroner` (ADR-017) |
| `DinnerModeLegend.vue` | `/household/[shortname]/bookings`, `/dinner`, `/admin/economy` | none | ✅ | ✅ parent | ✅ renders its rows into `CalendarLegend`'s list, its words from `BOOKING_WORDS` (ADR-017) |
| `DinnerModeSelector.vue` | `/household/[shortname]/bookings`, `/dinner` | none | ✅ `DinnerModeSelector.nuxt.spec.ts` | ✅ parent | ✅ offers the `enabledModes` its parent reads from `getBookingOptions`, in `DINNER_MODE_ORDER` (`useBooking`); a plan's faces bind `COMPONENTS.bookingGrid.expectedBadge` and `dinnerModeSelector.plannedButton`, a wish's `waitlist.ghostBadge`, in edit mode too, a cancelled dinner's view face `dinnerModeSelector.cancelledFace` in every form mode (ADR-018) |
| `DinnerEvent.vue` | `/household/[shortname]/bookings`, `/dinner` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `DinnerTicket.vue` | `/dinner`, `/household/[shortname]/bookings`, `/admin/planning` | none | ✅ | ✅ parent | ✅ a cancelled dinner's ticket binds `ticket.face.cancelled` (ADR-018) |
| `OrderHistoryDisplay.vue` | `/admin/economy`, `/household/[shortname]/economy`, `/dinner` | bookings | ✅ | ✅ parent | ✅ |
| `KitchenPreparation.vue` | `/dinner`, `/chef` | households | ✅ | ✅ parent | ✅ the panels' names from `useOrder`, read from `TEAM_WORDS.kitchen` (ADR-017); the TIL SALG counts from the queue's `queuedByType`; the TIL SALG box binds its mode's queue (`mode.queue`); its panels keyed by `KitchenPanel` |
| `DinnerDetailHeader.vue` | `/chef`, `/dinner` | none | ✅ | ✅ serial | ✅ the state badge from `DINNER_STATE_BADGES` by the dinner's state; the Heynabo link's words from `BUTTON_WORDS.heynabo` (ADR-017); its layout from `COMPONENTS.dinnerDetailHeader` (ADR-018) |
| `DinnerDetailPanel.vue` | `/chef`, `/dinner` | none | ❌ | ✅ | ⚠️ missing unit |

### Chef

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `ChefMenuCard.vue` | `/chef`, `/dinner` | allergies | ✅ real stores | ✅ serial `Waitlist` | ✅ the cancel ribbon's word from `BOOKING_WORDS.cancelledDinner` (ADR-017); button verbs from `BUTTON_WORDS` (ADR-017); the danger zone's cancel and resign words from `TEAM_WORDS.dutyChange` (ADR-017); the card's action row, danger zone heading, extra portions, menu form, allergen and grocery words from `TEAM_WORDS.menuCard`, the published button from `BOOKING_WORDS.dinnerSteps`, the portrait's role from `TEAM_WORDS.roles` (ADR-017); the compact budget from `TEAM_WORDS.menuCard.budget` (ADR-017) in kroner through `useTicket().convertPriceToDecimalFormat`, the waiting list's counts through `useTicket().formatTicketCounts` over `queuedByType`; the state badge by the dinner's state from `DINNER_STATE_BADGES` (ADR-018) |
| `DinnerBudget.vue` | `/chef` | none | ✅ | ✅ | ✅ every word from `BOOKING_WORDS.budget` (title, chevron, boxes, kuverter, rate, ticket columns, sums); units `BOOKING_WORDS.vatUnits`, Brugt, Tilbage and Rådighedsbeløb from `BOOKING_WORDS.allowance` (ADR-017) |
| `ExpenseLines.vue` | `/chef` | none | ✅ | ✅ | ✅ columns, VAT modes, the other-unit line and placeholders from `BOOKING_WORDS.budget`, units `BOOKING_WORDS.vatUnits`, Luk, Tilføj and Slet from `BUTTON_WORDS`; `vatPercent` from `appConfig.theslope.kitchen` (ADR-017) |
| `VatAmount.vue` | `/chef` | none | ✅ | ✅ parent | ✅ its unit from `PRICE_WORDS` (ADR-017) |
| `CookingRoundSpending.vue` | `/chef` | bookings | ✅ | ❌ | ✅; a dot (`table.currentMarker`) and the bold name (`table.currentDinnerLabel`) on the dinner on view; the team's round heads with the team's badge (`CookingTeamBadges`) and its period and binds the round's orders loading; the team's round on `dinnerBudget.roundHeadingLine`, the dinner on `dinnerHeadingLine`, whose long title wraps; units and headers from `BOOKING_WORDS` (`budget.columns`, `allowance`) |
| `TicketChanges.vue` | `/chef` | bookings | ✅ | ❌ | ✅; Husstand of a user's line over more than two households folds behind a "+N" link (`ticketChanges.householdsToggle`, `ticketChanges.households`), its words from `BOOKING_WORDS.ticketChange.households` (ADR-017, ADR-018) |
| `TeamRoleStatus.vue` | `/chef` | none | ✅ | ✅ parent | ✅ the role glyphs from `ROLE_ICONS`, the role and visitor lines from `TEAM_WORDS` (ADR-017, ADR-018) |
| `ChefDinnerCard.vue` | `/chef` | bookings | ✅ | ✅ parent | ✅ the date's colour from `dayColorClass`, categories by `TEMPORAL_CATEGORY` |
| `DinnerStatusStepper.vue` | `/chef` | bookings | ✅ parent | ✅ parent | ✅ |

### Economy

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `EconomyTable.vue` | `/admin/economy`, `/household/[shortname]/economy` | none | ✅ | ✅ parent | ✅ |
| `CostEntry.vue` | `/admin/economy`, `/household/[shortname]/economy` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `CostLine.vue` | `/admin/economy`, `/household/[shortname]/economy` | none | ✅ `CostLine.nuxt.spec.ts` | ✅ parent | ✅ its amount through `formatKroner`, a gone ticket type from `BOOKING_WORDS.unknownTicketType`, the history button from `BUTTON_WORDS` (ADR-017); one `line` prop, a `CostLine` from `useBillingValidation`: an order with its eater or a billed transaction |
| `ControlBadge.vue` | `/admin/economy`, `/household/[shortname]/economy` | none | ❌ | ✅ parent | ⚠️ missing unit |
| `ShareLinksPopover.vue` | `/admin/economy`, `/public/billing/[token]` | none | ❌ | ✅ parent | ⚠️ missing unit |

### Layout

| Component | Routes | Stores | Component spec | E2E | Status |
|---|---|---|---|---|---|
| `PageHeader.vue` | every route | auth, households | ✅ `PageHeader.nuxt.spec.ts` | ✅ parent | ✅ the menu holds its item names; the household link on `HOUSEHOLD_TAB.bookings` through `getHouseholdUrl` (ADR-006); UHeader's slots, its drawer, the bar, the title's logo width and the menus from `COMPONENTS.pageHeader`, each menu placed per breakpoint by its classes, the menus' orientation from `ORIENTATIONS` (ADR-018); the drawer closes when `breakpoint.isMd` turns true; the burger is the framework's toggle on `NAVIGATION.toggle` and the title link the framework's, both with their spoken names |
| `PageFooter.vue` | every route | none | ✅ | N/A | ✅ |
| `ViewError.vue` | every route | none | ❌ | ✅ parent | ⚠️ missing unit |
| `Loader.vue` | every route | none | ❌ | ✅ parent | ⚠️ missing unit |
| `Ticker.vue` | `/` | none | ❌ | N/A | ⚠️ missing unit |
| `HelpButton.vue` | every route | auth | ✅ | N/A | ✅ button verbs from `BUTTON_WORDS` (ADR-017) |
| `Logo.vue` | every route | none | ❌ | ✅ parent | ⚠️ missing unit |

## Stores

| Store | `storeAsyncData` reads | Status computeds | `isStoreReady` | Spec | Status |
|---|---|---|---|---|---|
| `plan.ts` | ✅ | ✅ | ✅ | ✅ | ✅ words from `seasonWords.ts` and `TEAM_WORDS` (ADR-017); the team dataset `dependsOn` the selected season and the users store's `myTeamsDataset`; the role acts refresh the own teams through `refreshMyTeams`, only once a page asked for them |
| `households.ts` | ✅ | ✅ | ✅ | ✅ | ✅ words from `householdWords.ts`; the override through `adminBypassQuery`, power mode through `allInhabitantsQuery`: one request per preview and save, the server's scaffold result as it comes; `createHousehold` takes `HouseholdCreate`; `HouseholdMoveOut` for a create's move-out updates |
| `allergies.ts` | ✅ | ✅ | ✅ | ✅ | ✅ words from `allergyWords.ts` |
| `users.ts` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ no `isEmpty`, `isInitialized` on my teams only; 0.9.1; each read gated by `enabled` and asked for by the component that shows it (`loadUsers`, `loadAllergyManagers`, `loadMyTeams`), counted by `isUsersStoreReady` and `isUsersStoreErrored` while asked for (ADR-007 compliance 8); the roles toast from `userWords.ts` (ADR-017) |
| `auth.ts` | N/A | ✅ | N/A | ✅ | ✅ the greeting's fallback, the failed sign-in and the preference toasts from `userWords.ts` (ADR-017); the session user parsed by `UserDetailSchema`, the test message's reply by `SenderEmitResultSchema` (ADR-001) |
| `bookings.ts` | ✅ | ✅ | ✅ | ✅ | ✅ spec covers the queue entries, the household places, the dinner's queue, `addExtraPortions`, `isBookingsReloading`, the toasts of the chef's dinner actions, and the GET reads `fetchExpectedBookings` and `previewBookings`; words from `app/config/` (ADR-017); query flags through `queryFlag`; each dinner write toasts its failure word from `TEAM_WORDS`; closed dinners by `CLOSED_DINNER_STATES`; the dinner's queue counts its entries by ticket type (`queuedByType`) through `useTicket().countTicketTypes`; the dinner detail `dependsOn` the selected season, the selected team and the users store's `myTeamsDataset`; the job triggers through `adminTrigger`; the upcoming orders carry their dinner and their eater (`includeCostContext`); `loadUpcomingOrders` and `loadHouseholdBilling` take the page's scope through a getter, as `loadOrdersForDinners` does, and the spec covers both following it |

## Composables

| Composable | Kind (ADR-017) | Schemas (ADR-001) | Enums re-exported | Domain types (ADR-010) | Spec | Status |
|---|---|---|---|---|---|---|
| **Validation** | | | | | | |
| `useCoreValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ `queryFlag`, `QueryFlagSchema` and `adminBypassQuery`; serialized schemas for user, inhabitant and household, the inhabitant deserializers on their typed rows (ADR-010 compliance 3); `HouseholdMoveOutSchema`, a household's move-out update; `InhabitantNameSchema`, a name and last name (`formatNameWithInitials`); the household create form's messages from `HOUSEHOLD_WORDS.createForm`, the sign-in rules' from `USER_WORDS.login` (ADR-017) |
| `useBookingValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ `BookingFailureSchema` (module-level `BookingFailure`) gives a failed order its reason; `WaitlistAssignedSchema` lives here, for the outcomes a scaffold run reports (`waitlistPortionsAssigned`); `CLOSED_DINNER_STATES`, the closed dinner states; `OrderSortBySchema` (module-level `OrderSortBy`) sorts an order read; `SnapshotOrderSchema` and `OrderAuditRowSchema` type the order snapshot and the audit row; `TicketOrderSchema`, the order a ticket's state and badge read (`ticketStateOf`, `formatOrder`); `ForSaleCountsSchema` and `WaitlistCountsSchema`, a locked dinner's tickets for sale and its waiting list (`ReleasedTicketCounts` is both); `BookingIntentSchema`, a user's booking change for one inhabitant at one dinner; `DinnerEventDateSchema`, a dinner by its id and date (the pending dinners the daily maintenance reads, the dinners a scaffold decided); `SerializedDinnerEventSchema`, the stored dinner row (ADR-010 compliance 3); `OrderForTransactionSchema` takes its household and its dinner from `OrderSnapshotSchema` |
| `useSeasonValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ `StoredDateRangeSchema` and `SeasonRowSchema`, the stored season row: `deserializeSeason` parses it without casts and rejects a malformed row; `serializeSeason` leaves out the read-only relations (ADR-010 compliance 3); `SeasonStatusSchema` from `SEASON_STATUS` (`seasonWords.ts`), no cast; its messages from `SEASON_WORDS.form` (ADR-017) |
| `useCookingTeamValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ typed rows for the assignment, the Display and the Detail (ADR-010 compliance 3); `toPrismaUpdateData` parses through `PrismaTeamUpdateDataSchema`; `CookingTeamAssignmentUpdate`, an assignment's update; a team's dinners on `DinnerEventFragmentSchema` (`consecutiveDinnerRun`); no user-facing text and no select options |
| `useDutyValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ the joker slot's messages from `DUTY_WORDS.jokerSlot` (`dutyWords.ts`, ADR-017) |
| `useAllergyValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ the inhabitant with allergies from its typed row (ADR-010 compliance 3) |
| `useTicketPriceValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ `PortionTicketSchema`, the fields a ticket's portions are looked up by; its messages from `SEASON_WORDS.form` (ADR-017) |
| `useDateRangeValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ its messages from `DATE_WORDS.rules` (ADR-017) |
| `useWeekDayMapValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ the map schemas and builders, every map and the object schema spelled out by `weekDayMapOf` (`app/types/dateTypes.ts`), without casts; without options a map of booleans; the season form's required cooking days from `useSeasonValidation`'s `CookingDaysSchema` |
| `useBillingValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ a transaction's dinner and eater from `OrderSnapshotSchema`; `deserializeTransaction` reads each part live while its row lives, else from the snapshot |
| `useHeynaboValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ |
| `useMaintenanceValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ `adminTrigger`, the trigger of a job an admin starts |
| `useDeliveryValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ operation result types (ADR-009): `DeliveryCountsSchema`, a sender event's notifications sent; `DeliveryDryRunSchema`, the delivery dry run per user; `isDeliveryOf`, the delivery rows of one notification kind |
| `useNotificationValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ parent | ✅ |
| `useSettingValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ |
| `useUserPreferenceValidation()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ |
| `useWaitlistValidation()` | isomorphic | ✅ | ✅ `PlacementRecoverySchema` | ✅ | ✅ parent | ✅ an entry carries its placement (`placingAt`, `placingOrderId`); `PlacementOrderSchema` is the order a recovery reads; `TicketForSaleSchema` a released ticket with the household that sells it; `WaitlistPlacementOutcomesSchema` what a placement walk finished; `WaitlistAuditContextSchema` the audit of a write to an entry; `WaitlistQueueSummarySchema` carries the dinner's queue by ticket type (`queuedByType`); `WaitlistAssignedSchema` comes from `useBookingValidation` |
| `useFeedbackValidation()` | isomorphic | ✅ | N/A | ✅ | ✅ parent | ✅ |
| `fragments/domainFragments.ts` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ `server/` reaches it through the validation composables; `OrderSnapshotSchema`, the order a transaction freezes (its dinner, its eater, the eater's household), beside `PayerSnapshotSchema` |
| **Business logic** | | | | | | |
| `useBooking()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ the chef's deadlines and their alarms (`getChefDeadlines`, `ALARM_LEVEL`) and the chef page link (`buildChefUrl`), read by the chef page and the chef deadlines sender event; a group of `groupBy` is `NonEmpty`, the bucket maps and the counts spelled out, no cast or non-null assertion |
| `useWaitlist()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ `placingLease` tells a held grab from an expired one, `placementLines` stop at an entry another run holds, `placingOrderOf` finds the order that serves a grab, `placementRecoveryOf` finishes or releases a stopped run's grab, `finishedPlacementOutcomes` reports a finished placement for its mails |
| `useHousehold()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ `ResidencyStatus` is the const of its schema with the type derived from it; the family name from `HOUSEHOLD_WORDS.familyName` (ADR-017); no non-null assertion |
| `useSeason()` | isomorphic | ✅ | N/A | ✅ | ✅ | ✅ `BookingDeadlines` holds the two predicates the generator decides by, `SeasonDeadlines` builds on it; `deadlinesForSeason` takes the `Season` |
| `useCookingTeam()` | isomorphic | ✅ | ✅ | ✅ | ✅ | ✅ `tryAutoClaim` hands its claim the caller's inhabitant; a default team name from `TEAM_WORDS.card.fallbackName` (ADR-017) |
| `useBilling()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ its ticket counts through `useTicket().formatTicketCounts`; the economy groups typed by their base, no cast; `CostEntry` and `HouseholdEntry` beside the groupers, their bases from `OrderSnapshot` |
| `useHeynabo()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ |
| `useOrder()` | isomorphic | N/A | N/A | ✅ | ✅ | ✅ a ticket's state is `useBooking`'s `ticketStateOf`; a kitchen panel's stats keyed by `KitchenPanel` (`useBookingValidation`: the eating modes without NONE, then RELEASED); the kitchen panels' words from `TEAM_WORDS.kitchen` (ADR-017); a typed kroner amount becomes øre through `krToOre` (`app/utils/ledger.ts`); the waiting-list sender event reads `formatGuestLabel` |
| `useAllergy()` | client | N/A | N/A | ✅ | ✅ | ✅ |
| `useTicket()` | isomorphic | N/A | N/A | ✅ | ✅ | ⚠️ `findTicketPriceById`, the one price lookup by id; `resolveTicketPriceOn`, a ticket's price row on its dinner date; `formatKroner`, an amount with its unit from `PRICE_WORDS` (`priceWords.ts`, ADR-017), the "kr" of the economy, budget, ticket-change and booking-grid amounts; the ticket counts in words from `TICKET_COUNTS` ("2V 1B", "2 voksne, 1 barn", the kitchen box's labelled counts), `countTicketTypes` and `formatTicketCounts` for the app and the mails; `formatTicketPrice`, a ticket type with its price ("Barn · 17 kr"); the ticket type words still in the composable (ADR-017 compliance 6) |
| `useMaintenance()` | client | N/A | N/A | ✅ | ✅ | ✅ `jobRunStats` reads a run's stats with its job's schema, each stat with its icon (`JobStat`); `formatJobStat`, `formatJobStats` give the one stat line for the boxes, the job history and the job toast; labels from `MAINTENANCE_WORDS` (ADR-017) |
| `useUserRoles` (module) | isomorphic | ⚠️ | N/A | ✅ | ✅ | ⚠️ generated-enum import; 0.9.1 |
| `usePermissions()` | isomorphic | ⚠️ | N/A | N/A | ✅ | ⚠️ generated-enum import; 0.9.1 |
| **UI and navigation** | | | | | | |
| `useBookingView()` (with `useCalendarOpenParam`, `useDinnerDateParam`) | client | ✅ | N/A | ✅ | ✅ | ✅ |
| `useEntityFormManager()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useTabNavigation()` | client | N/A | N/A | N/A | ✅ | ✅ the tab and the additional params read as their first segment, without casts |
| `useSeasonSelector()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useQueryParam()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useUrlQueryWriter()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useApiHandler()` | client | N/A | N/A | N/A | ✅ | ✅ `runJob` toasts its stats through `formatJobStats`; error words from `API_ERROR_WORDS` (ADR-017); an API error read by `ApiErrorStatusSchema`, no `in` check, no cast; `loadOrThrow` takes a `StoreDataset` |
| `useBookingUi()` | pure UI | N/A | N/A | ✅ | ✅ | ✅ a failed order's conflict reads in the result lines (`CONFLICT_WORDS`); `createChefBadges` reads `getChefDeadlines`; the result days from `linesBy` over `NonEmpty` rows, no `in` check, cast or non-null assertion; the supply texts, ticket chips and priced lines through `useTicket`'s `formatTicketCounts`, `TICKET_COUNTS` and `formatTicketPrice` |
| `app/utils/date.ts` | isomorphic | N/A | N/A | N/A | ✅ | ⚠️ its words from `app/config/dateWords.ts` (ADR-017 compliance 7), `formatDateRange`'s fallback `DATE_WORDS.noRange`; `formatDateInTimezone` writes a moment as the clock in the timezone shows it (the server runs in UTC); masks and pattern strings: `features/release-0.9.3/feature-0.9.3.md` § Dates; `PERIOD_DIRECTION`/`PeriodDirection`, the direction of a period step |
| `useUserRolesUi()` | pure UI | N/A | N/A | N/A | ✅ | ✅ role labels from `USER_WORDS.roles` keyed by `SystemRole` (ADR-017); colours from `COLOR` (ADR-018) |
| `useInstallPrompt()` | pure UI | N/A | N/A | N/A | ✅ | ✅ |
| `useTemporalCalendar()` | client | N/A | N/A | ✅ | ✅ parent | ✅ the dinner on a calendar day and a cancelled day (`getDinnerForDay`, `isCancelledDay`), for the dinner and chef calendars; the temporal lists by `TEMPORAL_LIST_ID`, a day's category read back by `dayTypeOf`, categories by `TEMPORAL_CATEGORY` (`app/utils/season.ts`) |
| `useCalendarEvents()` | client | N/A | N/A | N/A | ✅ | ✅ `RENDER_STYLE` names the render styles; `band` carries a team's rainbow band, `color` a named colour |
| `useExpandableRow()` | client | N/A | N/A | N/A | ✅ | ✅ |
| `useTheSlopeDesignSystem()` | design system (ADR-018) | N/A | N/A | N/A | ✅ architecture specs, unit | ✅ `RING.warning`, `RING.primary`, `RING.ocean`, `COMPONENTS.userListItem.ring` and its key type `UserListItemRing`, `COMPONENTS.allergyManagersList`, `table.historyUi` on `table.ui` with its own cells; `COMPONENTS.adminPage`, `COMPONENTS.publicBilling`; the residency words from `HOUSEHOLD_WORDS.residency` (ADR-017) |

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
