<script setup lang="ts">
/**
 * Chef Page - Team calendar and dinner management for cooking team members
 *
 * Architecture:
 * - All team members see everything (team selector, calendar, details)
 * - Only chefs get edit controls in DinnerMenuHero (mode='chef')
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
import {formatDate, parseDate} from '~/utils/date'

// Design system
const { COLOR, TYPOGRAPHY, LAYOUTS } = useTheSlopeDesignSystem()

// Initialize stores
const planStore = usePlanStore()
const {isPlanStoreReady, selectedSeason} = storeToRefs(planStore)
planStore.initPlanStore()

const usersStore = useUsersStore()
const {myTeams, isMyTeamsInitialized} = storeToRefs(usersStore)
usersStore.loadMyTeams()

const allergiesStore = useAllergiesStore()
allergiesStore.initAllergiesStore()

// Page ready when both plan store and myTeams are initialized
const isPageReady = computed(() => isPlanStoreReady.value && isMyTeamsInitialized.value)

// Permission helpers and date utilities
const { isChefFor, getDefaultDinnerStartTime, getNextDinnerDate } = useSeason()
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
const teamDinnerDates = computed(() => teamDinnerEvents.value.map(e => new Date(e.date)))

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
    return teamDinnerEvents.value.some(e => {
      const eventDate = new Date(e.date)
      return eventDate.toDateString() === date.toDateString()
    })
  },
  defaultValue: getDefaultDate,
  syncWhen: () => isPageReady.value && teamDinnerEvents.value.length > 0
})

const selectedDinnerEvent = computed(() => {
  return teamDinnerEvents.value.find(e => {
    const eventDate = new Date(e.date)
    return eventDate.toDateString() === selectedDate.value.toDateString()
  })
})

// Bridge between date-based page state and ID-based component selection
const selectedDinnerId = computed(() => selectedDinnerEvent.value?.id ?? null)

const handleDinnerSelect = (dinnerId: number) => {
  const dinner = teamDinnerEvents.value.find(e => e.id === dinnerId)
  if (dinner) setSelectedDate(new Date(dinner.date))
}

// DinnerMenuHero mode based on chef permission
const dinnerMenuHeroMode = computed(() => {
  if (!selectedTeam.value) return 'view'
  const inhabitantId = authStore.user?.Inhabitant?.id
  if (!inhabitantId) return 'view'
  return isChefFor(inhabitantId, selectedTeam.value) ? 'chef' : 'view'
})

// Handle allergen updates
const handleAllergenUpdate = async (allergenIds: number[]) => {
  console.info('Chef allergen update:', allergenIds)
  // TODO: Implement allergen update API call
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
  <UPage>
    <!-- Master: Team selector and calendar (left slot) -->
    <template #left>
      <CalendarMasterPanel title="Mine Madhold">
        <!-- Header: Team selector and status -->
        <template #header>
          <!-- Loading teams -->
          <Loader v-if="!isPageReady" text="Henter madholdsdata..." />

          <!-- Team selector and status -->
          <div v-else class="space-y-4">
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
          <!-- No events for team -->
          <div v-if="!isPageReady" class="px-4">
            <Loader text="Henter kalender..." />
          </div>

          <div v-else-if="teamDinnerEvents.length === 0" class="px-4">
            <UAlert
              type="info"
              variant="soft"
              :color="COLOR.info"
              icon="i-heroicons-calendar-days"
            >
              <template #title>
                Ingen fællesspisninger
              </template>
              <template #description>
                Dette madhold har ingen fællesspisninger i den aktive sæson.
              </template>
            </UAlert>
          </div>

          <div v-else>
            <ChefCalendarDisplay
              v-if="selectedSeason && selectedTeam"
              :season-dates="selectedSeason.seasonDates"
              :team="selectedTeam"
              :dinner-events="teamDinnerEvents"
              :selected-dinner-id="selectedDinnerId"
              :show-selection="true"
              :color="'cyan'"
              @select="handleDinnerSelect"
            />
          </div>
        </template>
      </CalendarMasterPanel>
    </template>

    <!-- Detail: Dinner management -->
    <DinnerDetailPanel
      :dinner-event-id="selectedDinnerId"
      :ticket-prices="selectedSeason?.ticketPrices ?? []"
      :mode="dinnerMenuHeroMode"
      @update-allergens="handleAllergenUpdate"
    />
  </UPage>
</template>
