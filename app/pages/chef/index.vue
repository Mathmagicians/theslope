<script setup lang="ts">
/**
 * Chef Page - Team calendar and dinner management for cooking team members
 *
 * Architecture:
 * - All team members see everything (team selector, calendar, details)
 * - Only chefs get edit controls in ChefMenuCard (formMode='EDIT')
 *
 * Master Panel (1/4 width):
 * ┌─────────────────────────────────────────┐
 * │ Mine Madhold                            │
 * │ [Madhold A] Madhold B                   │
 * ├─────────────────────────────────────────┤
 * │ Team Calendar (ChefDinnerCard list)     │
 * │ 📅 25/12 [PLANLAGT] ⚠️ 2 dage tilbage   │
 * │ Spaghetti Carbonara                     │
 * │ Chefkok tildelt                         │
 * └─────────────────────────────────────────┘
 *
 * Detail Panel (3/4 width):
 * ┌─────────────────────────────────────────┐
 * │ MENU HERO                               │
 * │ (chef mode if isChefFor, else view)     │
 * │                                         │
 * │ Hvem laver maden?                       │
 * │ (CookingTeamCard)                       │
 * │                                         │
 * │ Køkkenstatistik                         │
 * │ (KitchenPreparation)                    │
 * └─────────────────────────────────────────┘
 *
 * Query Parameters:
 * - ?team=3 - Selected team ID
 * - ?dinner=42 - Selected dinner ID
 */

import {useQueryParam} from '~/composables/useQueryParam'
import {FORM_MODES, type FormMode} from '~/types/form'
import type {DinnerEventDisplay, ChefMenuForm} from '~/composables/useBookingValidation'

// Design system
const {COLOR, ICONS, LAYOUTS} = useTheSlopeDesignSystem()

// Initialize stores
const planStore = usePlanStore()
const {isPlanStoreReady, isPlanStoreErrored, planStoreError, selectedSeason} = storeToRefs(planStore)
planStore.initPlanStore()

const usersStore = useUsersStore()
const {myTeams, isMyTeamsLoading, isMyTeamsErrored, isMyTeamsInitialized, myTeamsError} = storeToRefs(usersStore)
usersStore.loadMyTeams()

const allergiesStore = useAllergiesStore()
allergiesStore.initAllergiesStore()

const bookingsStore = useBookingsStore()

// Page ready when both plan store and myTeams are initialized
const isPageReady = computed(() => isPlanStoreReady.value && isMyTeamsInitialized.value)

// Permission helpers and date utilities
const {isChefFor, getDefaultDinnerStartTime, getNextDinnerDate} = useSeason()
const authStore = useAuthStore()
const dinnerStartTime = getDefaultDinnerStartTime()

// Team selection via query parameter
const {value: selectedTeamId, setValue: setSelectedTeamId} = useQueryParam<number>('team', {
  serialize: (id) => id.toString(),
  deserialize: (s) => {
    const parsed = parseInt(s)
    return !isNaN(parsed) ? parsed : null
  },
  validate: (id) => {
    return myTeams.value.some(t => t.id === id)
  },
  defaultValue: () => {
    return myTeams.value[0]?.id ?? 0
  },
  syncWhen: () => isPageReady.value && myTeams.value.length > 0
})

// Selected team
const selectedTeam = computed(() => {
  return myTeams.value.find(t => t.id === selectedTeamId.value) || null
})

const teamDinnerEvents = computed(() => selectedTeam.value?.dinnerEvents ?? [])

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
  defaultValue: () => ({ mode: 'calendar', open: true }),
  syncWhen: () => isPageReady.value
})

// Computed getters/setters for component v-model bindings
const calendarViewMode = computed({
  get: () => viewState.value.mode,
  set: (mode) => setViewState({ ...viewState.value, mode })
})
const calendarAccordionOpen = computed({
  get: () => viewState.value.open,
  set: (open) => setViewState({ ...viewState.value, open })
})
const teamDinnerDates = computed(() => teamDinnerEvents.value.map((e: DinnerEventDisplay) => new Date(e.date)))

const getDefaultDate = (): Date => {
  const nextDinner = getNextDinnerDate(teamDinnerDates.value, dinnerStartTime)
  return nextDinner?.start ?? new Date()
}

const {value: selectedDate, setValue: setSelectedDate} = useQueryParam<Date>('date', {
  serialize: formatDate,
  deserialize: (s) => {
    const parsed = parseDate(s)
    return parsed && !isNaN(parsed.getTime()) ? parsed : null
  },
  validate: (date) => {
    // Check if this date has a dinner event for this team
    return teamDinnerEvents.value.some((e: DinnerEventDisplay) => {
      const eventDate = new Date(e.date)
      return eventDate.toDateString() === date.toDateString()
    })
  },
  defaultValue: getDefaultDate,
  syncWhen: () => isPageReady.value && teamDinnerEvents.value.length > 0
})

const selectedDinnerEvent = computed(() => {
  return teamDinnerEvents.value.find((e: DinnerEventDisplay) => {
    const eventDate = new Date(e.date)
    return eventDate.toDateString() === selectedDate.value.toDateString()
  })
})

// Bridge between date-based page state and ID-based component selection
const selectedDinnerId = computed(() => selectedDinnerEvent.value?.id ?? null)

// Page owns dinner detail data (ADR-007: page owns data, layout receives via props)
const {DinnerEventDetailSchema} = useBookingValidation()

// Reactive key for useAsyncData - follows ADR-007 pattern
const dinnerDetailKey = computed(() => `chef-dinner-detail-${selectedDinnerId.value || 'null'}`)

const {
  data: dinnerEventDetail,
  status: dinnerEventDetailStatus,
  refresh: refreshDinnerEventDetail
} = useAsyncData(
    dinnerDetailKey,
    () => selectedDinnerId.value
        ? bookingsStore.fetchDinnerEventDetail(selectedDinnerId.value)
        : Promise.resolve(null),
    {
      default: () => null,
      watch: [selectedDinnerId],
      immediate: true,
      transform: (data: unknown) => {
        if (!data) return null
        try {
          return DinnerEventDetailSchema.parse(data)
        } catch (e) {
          console.error('Error parsing dinner event detail:', e)
          throw e
        }
      }
    }
)

const isDinnerDetailLoading = computed(() => dinnerEventDetailStatus.value === 'pending')
const isDinnerDetailError = computed(() => dinnerEventDetailStatus.value === 'error')

const handleDinnerSelect = (dinnerId: number) => {
  const dinner = teamDinnerEvents.value.find((e: DinnerEventDisplay) => e.id === dinnerId)
  if (dinner) setSelectedDate(new Date(dinner.date))
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

// Event handlers
const toast = useToast()
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Announce dinner with useAsyncData for loading state (ADR-007: component-local data)
const announceParams = ref<{dinnerEventId: number} | null>(null)
const {
  status: announceStatus,
  execute: executeAnnounce
} = useAsyncData(
    'chef-page-announce-dinner',
    () => announceParams.value
        ? bookingsStore.announceDinner(announceParams.value.dinnerEventId)
        : Promise.resolve(null),
    { immediate: false }
)
const isAnnouncingDinner = computed(() => announceStatus.value === 'pending')

// Cancel dinner with useAsyncData for loading state (ADR-007: component-local data)
const cancelParams = ref<{dinnerEventId: number} | null>(null)
const {
  status: cancelStatus,
  execute: executeCancel
} = useAsyncData(
    'chef-page-cancel-dinner',
    () => cancelParams.value
        ? bookingsStore.cancelDinner(cancelParams.value.dinnerEventId)
        : Promise.resolve(null),
    { immediate: false }
)
const isCancellingDinner = computed(() => cancelStatus.value === 'pending')

const handleAllergenUpdate = async (allergenIds: number[]) => {
  if (!selectedDinnerId.value) return

  try {
    await bookingsStore.updateDinnerEventAllergens(selectedDinnerId.value, allergenIds)
    await refreshDinnerEventDetail() // Refresh page-owned data
    const message = allergenIds.length > 0
        ? 'Beboerne kan nu se allergenerne i menuen'
        : 'Menuen er markeret uden allergener'
    toast.add({
      title: 'Allergeninformation gemt',
      description: message,
      icon: ICONS.checkCircle,
      color: COLOR.success
    })
  } catch (error) {
    // Error already handled by store with handleApiError
    console.error('Failed to update allergens:', error)
  }
}

const handleFormUpdate = async (data: ChefMenuForm) => {
  if (!selectedDinnerId.value) return

  try {
    await bookingsStore.updateDinnerEventField(selectedDinnerId.value, data)
    await refreshDinnerEventDetail()
    toast.add({
      title: 'Menu gemt',
      description: 'Menuen er nu opdateret',
      icon: ICONS.checkCircle,
      color: COLOR.success
    })
    await usersStore.loadMyTeams()
  } catch (error) {
    console.error('Failed to update menu:', error)
  }
}

const handleAdvanceState = async (newState: string) => {
  if (!selectedDinnerId.value) return
  // Only handle ANNOUNCED - CONSUMED is set automatically by cron job
  if (newState !== DinnerState.ANNOUNCED) return

  try {
    announceParams.value = {dinnerEventId: selectedDinnerId.value}
    await executeAnnounce()
    await refreshDinnerEventDetail() // Refresh page-owned data
    toast.add({
      title: 'Menu annonceret',
      description: 'Beboerne kan nu tilmelde sig fællesspisningen',
      icon: ICONS.megaphone,
      color: COLOR.success
    })
    // Refresh team data to show updated state in calendar
    await usersStore.loadMyTeams()
  } catch (error) {
    // Error already handled by store with handleApiError
    console.error('Failed to advance state:', error)
  }
}

const handleCancelDinner = async () => {
  if (!selectedDinnerId.value) return

  cancelParams.value = {dinnerEventId: selectedDinnerId.value}
  await executeCancel()

  // Check if cancel succeeded (useAsyncData doesn't throw, it captures errors)
  if (cancelStatus.value === 'error') {
    console.error('Failed to cancel dinner')
    return
  }

  await refreshDinnerEventDetail() // Refresh page-owned data
  toast.add({
    title: 'Middag aflyst',
    description: 'Fællesspisningen er blevet aflyst',
    icon: ICONS.xMark,
    color: COLOR.warning
  })
  // Refresh team data to show updated state in calendar
  await usersStore.loadMyTeams()
}

useHead({
  title: '👨‍🍳 Madlavning',
  meta: [
    {
      name: 'Chef Dashboard',
      content: 'Menu editing and dinner management for cooking teams'
    }
  ]
})
</script>

<template>
  <UPage :ui="LAYOUTS.masterDetailPage">
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
            <div v-else class="space-y-1 md:space-y-4">
              <!-- Team selector (always visible, handles own empty state) -->
              <MyTeamSelector
                  :model-value="selectedTeamId"
                  :teams="myTeams"
                  @update:model-value="setSelectedTeamId"
              />

              <!-- Team role status -->
              <TeamRoleStatus
                  v-if="selectedTeam && authStore.user?.Inhabitant?.id"
                  :team="selectedTeam"
                  :inhabitant-id="authStore.user.Inhabitant.id"
              />
            </div>
          </template>

          <!-- Calendar: Team calendar with agenda/calendar views -->
          <template #calendar>
            <!-- Loading calendar -->
            <div v-if="!isPlanStoreReady && !isPlanStoreErrored" >
              <Loader text="Henter kalender..."/>
            </div>

            <!-- Error loading calendar -->
            <ViewError
                v-else-if="isPlanStoreErrored"
                :error="planStoreError?.statusCode"
                message="Vi kan ikke hente data til kalenderen. Prøv at genindlæse siden 🔃."
                :cause="planStoreError"
            />

            <!-- No events for team -->
            <UAlert
                v-else-if="teamDinnerEvents.length === 0"
                type="info"
                variant="soft"
                :color="COLOR.info"
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
                  v-model:view-mode="calendarViewMode"
                  v-model:accordion-open="calendarAccordionOpen"
                  :season-dates="selectedSeason.seasonDates"
                  :team="selectedTeam"
                  :dinner-events="teamDinnerEvents"
                  :selected-dinner-id="selectedDinnerId"
                  :show-selection="true"
                  @select="handleDinnerSelect"
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
              v-if="dinnerEventDetail"
              :dinner-event="dinnerEventDetail"
              :form-mode="chefFormMode"
              :show-state-controls="true"
              :show-allergens="true"
              :is-announcing="isAnnouncingDinner"
              :is-cancelling="isCancellingDinner"
              @update:form="handleFormUpdate"
              @update:allergens="handleAllergenUpdate"
              @advance-state="handleAdvanceState"
              @cancel-dinner="handleCancelDinner"
          />
        </template>

        <!-- #team: Cooking team -->
        <template #team>
          <template v-if="dinnerEventDetail">
            <CookingTeamCard
                v-if="dinnerEventDetail.cookingTeamId"
                :team-id="dinnerEventDetail.cookingTeamId"
                :team-number="dinnerEventDetail.cookingTeamId"
                mode="monitor"
            />
            <UAlert
                v-else
                variant="soft"
                :color="COLOR.neutral"
                :icon="ICONS.userGroup"
            >
              <template #title>Intet madhold tildelt endnu</template>
            </UAlert>
            <WorkAssignment :dinner-event="dinnerEventDetail"/>
          </template>
        </template>

        <!-- #stats: Kitchen statistics -->
        <template #stats>
          <KitchenPreparation v-if="dinnerEventDetail" :orders="dinnerEventDetail.tickets ?? []"/>
        </template>
      </DinnerDetailPanel>
  </UPage>
</template>
