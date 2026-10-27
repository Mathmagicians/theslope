<script setup lang="ts">
/**
 * Chef Page - Team calendar and dinner management for cooking team members
 *
 * Architecture:
 * - The page shows one of the season's teams: one of the person's own, or a visit to another team
 * - Only the team's chef gets edit controls in ChefMenuCard (formMode='EDIT'); a member and a visitor read it
 * - The chef role panel and Kok / Kokkespire are the dinner page's, open to every member; taking a role puts the person
 *   on the team, and the visiting tab becomes their own tab
 *
 * LAYOUTS.masterDetailPage on UPage: from md the master beside the detail, stacked on a phone.
 *
 * /chef?team=3&date=04/11/2026, desktop: Anna, a cook on Madhold 2 and 5, clicked Madhold 3's dinner on Wednesday 4/11
 *
 * MASTER (a third of the row)
 * +--------------------------------------------------+
 * | Mine Madhold                                     |
 * |  (team icon)  (team icon)  (team icon)           |
 * |  Madhold 2    Madhold 5    [Madhold 3] [Ikke dit hold] visiting tab, selected, its badge after the name
 * | Du er ikke på Madhold 3                          |  role line
 * +--------------------------------------------------+
 * | NÆSTE MADLAVNING  Madhold 3                      |
 * | TOR 12/11 · OM 16D 2T · 18:00                    |
 * +--------------------------------------------------+
 * | [Agenda] [Kalender]                     [skjul]  |
 * |  november 2026                                   |
 * |  M    T    O    T    F    L    S                 |
 * |                           1                      |
 * |  2   (3)  [4]   5    6    7    8                 |  [4] selected: ring
 * |  9  (10)  11  [12]* 13   14   15                 |  * deadline chip
 * | 16  (17)  18  [19]  20   21   22                 |
 * |  [n] Madhold 3's dinners: chef colours,          |
 * |      deadline chips                              |
 * |  (n) the other teams' dinners, your own          |
 * |      included: plain circles, clickable          |
 * | Forklaring: Næste madlavning, Valgt dato,        |
 * |   Planlagt madlavning, Tidligere madlavning,     |
 * |   Deadline overskredet / kritisk / snart,        |
 * |   Aflyst madlavning, Andet madholds              |
 * |   fællesspisning                                 |
 * +--------------------------------------------------+
 *
 * DETAIL (the rest of the row): ChefMenuCard read-only on a visit, with its state controls
 * +----------------------------------------------------------------------------+
 * | MIDDAG  [forrige] [næste]                                 [ANNONCERET]     |  Madhold 3's dinners
 * | Lasagne, the chef portrait: click opens the chef role panel                |
 * | ALLERGENER, MADBESTILLING, the state stepper with its deadline badges      |  no edits on a visit
 * | Budget                                                                     |
 * | Hvem laver maden?    Madhold 3's team card, [Ikke dit hold] after its badges |  the visit only
 * |   [(pot) Kok (plus)]  [(sprout) Kokkespire (plus)]  [(team) Byt Tjans]     |
 * | Hvem kommer og spiser?   the kitchen                                       |
 * +----------------------------------------------------------------------------+
 * No menu, allergen, grocery or state edits, no Annoncer and no Flere: those need the team's chef.
 *
 * Visual check: /chef on an own team and on a visiting tab, phone and desktop, light and dark.
 *
 * Query Parameters:
 * - ?team=3 - The team on view, one of the season's teams; defaults to the person's first team
 * - ?date=04/11/2026 - The team's dinner on view
 * - ?view=calendar:open - The calendar's view and open state
 */

import {FORM_MODES, type FormMode} from '~/types/form'
import type {DinnerEventDisplay, ChefMenuForm} from '~/composables/useBookingValidation'
import type {ExpenseCreate} from '~/composables/useBillingValidation'
import type {CookingRoundRow} from '~/composables/useBookingUi'

// Design system
const {ICONS, LAYOUTS, ALERTS, COMPONENTS, breakpoint} = useTheSlopeDesignSystem()

// Initialize stores
const planStore = usePlanStore()
const {
  isPlanStoreReady, isPlanStoreErrored, planStoreError, selectedSeason,
  selectedTeam: planSelectedTeam, isSelectedTeamErrored, selectedTeamError
} = storeToRefs(planStore)

const usersStore = useUsersStore()
const {myTeams, isMyTeamsLoading, isMyTeamsErrored, isMyTeamsInitialized, myTeamsError} = storeToRefs(usersStore)
usersStore.loadMyTeams()

const bookingsStore = useBookingsStore()
const {
  isDinnerUpdating,
  selectedDinnerWaitlist,
  selectedDinnerEventDetail: dinnerEventDetail,
  isSelectedDinnerEventLoading: isDinnerDetailLoading,
  isSelectedDinnerEventErrored: isDinnerDetailError
} = storeToRefs(bookingsStore)

// Page ready when both plan store and myTeams are initialized
const isPageReady = computed(() => isPlanStoreReady.value && isMyTeamsInitialized.value)

// Permission helpers and date utilities
const {isChefFor, deadlinesForSeason} = useSeason()
const authStore = useAuthStore()

// The season's teams and dinners: any of its teams opens on the page, any of its dinners opens on its team
const seasonTeams = computed(() => selectedSeason.value?.CookingTeams ?? [])
const seasonDinners = computed(() => selectedSeason.value?.dinnerEvents ?? [])
const isSeasonTeam = (id: number | null) => !!id && seasonTeams.value.some(t => t.id === id)

// Team selection via query parameter; with no team of the person's own and no visit the key stays off the URL
const {value: selectedTeamId, setValue: setSelectedTeamId} = useQueryParam<number>('team', {
  serialize: (id) => id.toString(),
  deserialize: (s) => {
    const parsed = parseInt(s)
    return !isNaN(parsed) ? parsed : null
  },
  validate: isSeasonTeam,
  normalize: (id) => isSeasonTeam(id) ? id : null,
  defaultValue: () => {
    return myTeams.value[0]?.id ?? 0
  },
  syncWhen: () => isPageReady.value && seasonTeams.value.length > 0
})

// The team card and a visit read the team on view from the plan store
planStore.selectTeam(() => selectedTeamId.value || null)

// A visit: a team on view the person is not on. Its dinners come from the plan store's team once that team has loaded
const ownTeam = computed(() => myTeams.value.find(t => t.id === selectedTeamId.value) ?? null)
const visitingTeam = computed(() => ownTeam.value ? null : seasonTeams.value.find(t => t.id === selectedTeamId.value) ?? null)
const visitedTeam = computed(() =>
  visitingTeam.value && planSelectedTeam.value?.id === visitingTeam.value.id ? planSelectedTeam.value : null)
const isVisitErrored = computed(() => !!visitingTeam.value && isSelectedTeamErrored.value)
const isVisitLoading = computed(() => !!visitingTeam.value && !visitedTeam.value && !isVisitErrored.value)

const selectedTeam = computed(() => ownTeam.value ?? visitedTeam.value)
const teamOnView = computed(() => ownTeam.value ?? visitingTeam.value)

const teamDinnerEvents = computed(() => selectedTeam.value?.dinnerEvents ?? [])

// The other teams' dinners; a dinner without a team has no team page
const otherTeamDinners = computed(() => seasonDinners.value.filter(dinner =>
  dinner.cookingTeamId !== null && dinner.cookingTeamId !== selectedTeamId.value))

const calendarError = computed(() => isPlanStoreErrored.value ? planStoreError.value : selectedTeamError.value)

// Calendar view mode + accordion state via URL query param - survives component remounts (ADR-006)
// Format: view=calendar:open or view=agenda:closed
type ViewState = { mode: 'agenda' | 'calendar', open: boolean }
const {value: viewState, setValue: setViewState} = useQueryParam<ViewState>('view', {
  serialize: (v) => `${v.mode}:${v.open ? 'open' : 'closed'}`,
  deserialize: (s) => {
    const [mode, state] = s.split(':')
    if ((mode === 'agenda' || mode === 'calendar') && (state === 'open' || state === 'closed')) {
      return { mode, open: state === 'open' }
    }
    return null
  },
  defaultValue: () => ({ mode: 'calendar', open: breakpoint.isMd.value ?? false }),
  // The default reads the viewport, so the one-shot sync waits for the layout to measure it
  syncWhen: () => isPageReady.value && breakpoint.measured.value
})

// Computed getters for component bindings (one-way to prevent race conditions)
const calendarViewMode = computed(() => viewState.value.mode)
const calendarAccordionOpen = computed(() => viewState.value.open)

// A tab click sets the mode and opens the calendar; the chevron toggles the open state in the current mode
const handleTabClick = (mode: 'agenda' | 'calendar') => setViewState({ mode, open: true })
const handleAccordionToggle = (open: boolean) => setViewState({ mode: viewState.value.mode, open })
const teamDinnerDates = computed(() => teamDinnerEvents.value.map((e: DinnerEventDisplay) => new Date(e.date)))

// Date selection via URL query parameter using curried pattern
const {value: selectedDate, setValue: setSelectedDate} = useDinnerDateParam({
  dinnerDates: () => teamDinnerDates.value,
  syncWhen: () => isPageReady.value && teamDinnerEvents.value.length > 0
})

// Navigation logic from useBookingView
const {hasPrev, hasNext, navigate} = useBookingView({
  selectedDate,
  setDate: setSelectedDate,
  dinnerDates: () => teamDinnerDates.value
})

const selectedDinnerEvent = computed(() => {
  return teamDinnerEvents.value.find((e: DinnerEventDisplay) => {
    const eventDate = new Date(e.date)
    return eventDate.toDateString() === selectedDate.value.toDateString()
  })
})

const selectedDinnerId = computed(() => selectedDinnerEvent.value?.id ?? null)

// Only the team's own dinners: the store resolves the date against the selected season
bookingsStore.selectDinnerDate(() => selectedDinnerEvent.value ? selectedDate.value : null)

// A dinner of any team opens on its team at its date: both writes of the tick land in one navigation (ADR-006)
const handleDinnerSelect = (dinnerId: number) => {
  const dinner = seasonDinners.value.find(e => e.id === dinnerId)
  if (!dinner?.cookingTeamId) return
  setSelectedTeamId(dinner.cookingTeamId)
  setSelectedDate(new Date(dinner.date))
}

// ChefMenuCard formMode: EDIT for chef, VIEW for team members
const currentInhabitantId = computed(() => authStore.user?.Inhabitant?.id)

const isCurrentUserChef = computed(() => {
  if (!selectedTeam.value || !currentInhabitantId.value) return false
  return isChefFor(currentInhabitantId.value, selectedTeam.value)
})

const chefFormMode = computed<FormMode>(() => {
  return isCurrentUserChef.value ? FORM_MODES.EDIT : FORM_MODES.VIEW
})

// Event handlers: the store toasts each action's result
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

const handleAllergenUpdate = (allergenIds: number[]) => {
  if (selectedDinnerId.value) bookingsStore.updateDinnerEventAllergens(selectedDinnerId.value, allergenIds)
}

const handleFormUpdate = async (data: ChefMenuForm) => {
  if (!selectedDinnerId.value) return
  const result = await bookingsStore.updateDinnerEventField(
    selectedDinnerId.value,
    data,
    dinnerEventDetail.value?.chefId ?? null
  )
  if (!result) return
  await usersStore.loadMyTeams()
}

// The chef's grocery lines go to the dinner whose detail is on view; the store re-reads it for its computed cost
// The words a grocery line's note starts with: this dinner, and the signed-in chef as the card names people
const {expenseNoteWords} = useBilling()
const {formatNameWithInitials} = useHousehold()
const expenseNote = computed(() => {
  const user = authStore.user
  if (!dinnerEventDetail.value || !user) return ''
  const name = user.Inhabitant ? formatNameWithInitials(user.Inhabitant) : user.email
  return expenseNoteWords(dinnerEventDetail.value, {name, email: user.email})
})

const handleAddExpense = (line: ExpenseCreate) => {
  if (dinnerEventDetail.value) bookingsStore.addExpense(dinnerEventDetail.value.id, line)
}
const handleRemoveExpense = (expenseId: number) => {
  if (dinnerEventDetail.value) bookingsStore.removeExpense(dinnerEventDetail.value.id, expenseId)
}

// The chef cooks more portions for the waiting list of the dinner on view
const handleExtraPortions = (portions: number) => {
  if (dinnerEventDetail.value) bookingsStore.addExtraPortions(dinnerEventDetail.value.id, portions)
}

// The team's cooking round around the dinner on view: the round's orders give each dinner its allowance
const {consecutiveDinnerRun} = useBooking()
const {getTeamNumber} = useCookingTeam()
const {calculateBudget} = useOrder()
const kitchenConfig = useAppConfig().theslope?.kitchen
const roundDinners = computed(() => selectedDinnerId.value
  ? consecutiveDinnerRun(teamDinnerEvents.value.map((e: DinnerEventDisplay) => ({...e, date: new Date(e.date)})), selectedDinnerId.value)
  : [])
bookingsStore.loadOrdersForDinners(() => ({dinnerEventIds: roundDinners.value.map(dinner => dinner.id), allHouseholds: true}))
const roundRows = computed<CookingRoundRow[]>(() => roundDinners.value.map(dinner => ({
  dinnerEventId: dinner.id,
  date: dinner.date,
  menuTitle: dinner.menuTitle,
  isCurrent: dinner.id === selectedDinnerId.value,
  budgetGross: calculateBudget(bookingsStore.orders.filter(order => order.dinnerEventId === dinner.id), kitchenConfig?.baseRatePercent ?? 5, kitchenConfig?.vatPercent ?? 25).availableBudget,
  spentGross: dinner.totalCost
})))

const handleAdvanceState = async (newState: string) => {
  if (!selectedDinnerId.value) return
  if (newState !== DinnerState.ANNOUNCED) return
  if (await bookingsStore.announceDinner(selectedDinnerId.value)) await usersStore.loadMyTeams()
}

const handleCancelDinner = async () => {
  if (!selectedDinnerId.value) return
  if (await bookingsStore.cancelDinner(selectedDinnerId.value)) await usersStore.loadMyTeams()
}

const handleUndoCancelDinner = async () => {
  if (!selectedDinnerId.value || !dinnerEventDetail.value) return
  // Restore to ANNOUNCED if menu title exists, otherwise SCHEDULED
  const targetState = dinnerEventDetail.value.menuTitle?.trim()
    ? DinnerState.ANNOUNCED
    : DinnerState.SCHEDULED
  if (await bookingsStore.undoCancelDinner(selectedDinnerId.value, targetState)) await usersStore.loadMyTeams()
}

useHead({
  title: '👨‍🍳 Madlavning',
  meta: [
    {
      name: 'description',
      content: 'Menu editing and dinner management for cooking teams'
    }
  ]
})
</script>

<template>
  <UPage :ui="LAYOUTS.masterDetailPage" data-testid="chef-page">
    <!-- Master: Team selector and calendar (left slot) -->
    <template #left>
        <CalendarMasterPanel title="Mine Madhold">
          <!-- Header: Team selector and status -->
          <template #header>
            <!-- Loading teams -->
            <Loader v-if="isMyTeamsLoading" text="Henter dine madhold..."/>

            <!-- Error loading teams -->
            <ViewError
                v-else-if="isMyTeamsErrored"
                :error="myTeamsError?.statusCode"
                message="Vi kan ikke hente dine madhold. Prøv at genindlæse siden."
                :cause="myTeamsError"
            />

            <!-- Team selector and status -->
            <div v-else :class="COMPONENTS.chefTeamStatus">
              <!-- Team selector (always visible, handles own empty state) -->
              <MyTeamSelector
                  :model-value="selectedTeamId"
                  :teams="myTeams"
                  :visiting-team="visitingTeam"
                  :season-teams="seasonTeams"
                  @update:model-value="setSelectedTeamId"
              />

              <!-- Team role status -->
              <TeamRoleStatus
                  v-if="teamOnView && authStore.user?.Inhabitant?.id"
                  :team="teamOnView"
                  :inhabitant-id="authStore.user.Inhabitant.id"
              />
            </div>
          </template>

          <!-- Calendar: Team calendar with agenda/calendar views -->
          <template #calendar>
            <!-- Loading calendar: the season, or the team a visit opens -->
            <div v-if="(!isPlanStoreReady && !isPlanStoreErrored) || isVisitLoading" >
              <Loader text="Henter kalender..."/>
            </div>

            <!-- Error loading calendar -->
            <ViewError
                v-else-if="isPlanStoreErrored || isVisitErrored"
                :error="calendarError?.statusCode"
                message="Vi kan ikke hente data til kalenderen. Prøv at genindlæse siden 🔃."
                :cause="calendarError"
            />

            <!-- No events for team -->
            <UAlert
                v-else-if="teamDinnerEvents.length === 0"
                v-bind="ALERTS.info"
                :icon="ICONS.calendarDays"
            >
              <template #title>
                Holdet har ingen fællesspisninger
              </template>
              <template #description>
                Dette madhold har ikke fået ansvar for nogen fællesspisninger endnu.
              </template>
            </UAlert>

            <!-- Calendar display -->
            <div v-else>
              <ChefCalendarDisplay
                  v-if="selectedSeason && selectedTeam"
                  :view-mode="calendarViewMode"
                  :accordion-open="calendarAccordionOpen"
                  :season-dates="selectedSeason.seasonDates"
                  :team="selectedTeam"
                  :dinner-events="teamDinnerEvents"
                  :other-team-dinners="otherTeamDinners"
                  :deadlines="deadlinesForSeason(selectedSeason)"
                  :selected-dinner-id="selectedDinnerId"
                  :show-selection="true"
                  @select="handleDinnerSelect"
                  @tab-click="handleTabClick"
                  @update:accordion-open="handleAccordionToggle"
              />
            </div>
          </template>
        </CalendarMasterPanel>
    </template>

    <!-- Detail: Dinner management (page owns data, passes directly to components) -->
    <DinnerDetailPanel
          :dinner-event="dinnerEventDetail"
          :ticket-prices="selectedSeason?.ticketPrices ?? []"
          :is-loading="isDinnerDetailLoading"
          :is-error="isDinnerDetailError"
      >
        <!-- #hero: ChefMenuCard with chef/view mode based on permissions -->
        <template #hero>
          <ChefMenuCard
              v-if="dinnerEventDetail && selectedSeason"
              :dinner-event="dinnerEventDetail"
              :deadlines="deadlinesForSeason(selectedSeason)"
              :form-mode="chefFormMode"
              :show-state-controls="true"
              :round-rows="roundRows"
              :expense-note="expenseNote"
              :waitlist="selectedDinnerWaitlist"
              :show-allergens="true"
              :is-updating="isDinnerUpdating"
              :has-prev="hasPrev"
              :has-next="hasNext"
              :calendar-open="calendarAccordionOpen"
              @update:form="handleFormUpdate"
              @add-expense="handleAddExpense"
              @remove-expense="handleRemoveExpense"
              @extra-portions="handleExtraPortions"
              @update:allergens="handleAllergenUpdate"
              @advance-state="handleAdvanceState"
              @cancel-dinner="handleCancelDinner"
              @undo-cancel-dinner="handleUndoCancelDinner"
              @prev="navigate(-1)"
              @next="navigate(1)"
              @toggle-calendar="setViewState({ ...viewState, open: !viewState.open })"
          />
        </template>

        <!-- #team: Cooking team -->
        <template #team>
          <template v-if="dinnerEventDetail">
            <CookingTeamCard
                v-if="dinnerEventDetail.cookingTeamId && dinnerEventDetail.cookingTeam"
                :team-id="dinnerEventDetail.cookingTeamId"
                :team-number="getTeamNumber(dinnerEventDetail.cookingTeam, selectedSeason?.CookingTeams ?? [])"
                mode="monitor"
                use-short-name
                :visiting="dinnerEventDetail.cookingTeamId === visitingTeam?.id"
            />
            <UAlert
                v-else
                v-bind="ALERTS.neutral"
                :icon="ICONS.userGroup"
            >
              <template #title>Intet madhold tildelt endnu</template>
            </UAlert>
            <WorkAssignment :dinner-event="dinnerEventDetail"/>
          </template>
        </template>

        <!-- #stats: Kitchen statistics -->
        <template #stats>
          <KitchenPreparation v-if="dinnerEventDetail" :orders="dinnerEventDetail.tickets ?? []" :allergens="dinnerEventDetail.allergens" :waitlist="selectedDinnerWaitlist"/>
        </template>
      </DinnerDetailPanel>
  </UPage>
</template>
