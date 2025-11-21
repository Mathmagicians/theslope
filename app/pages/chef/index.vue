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

// DinnerMenuHero mode based on chef permission
const dinnerMenuHeroMode = computed(() => {
  if (!selectedTeam.value) return 'view'
  const inhabitantId = authStore.user?.Inhabitant?.id
  if (!inhabitantId) return 'view'
  return isChefFor(inhabitantId, selectedTeam.value) ? 'chef' : 'view'
})

const selectedDinnerEvent = computed(() => {
  return teamDinnerEvents.value.find(e => {
    const eventDate = new Date(e.date)
    return eventDate.toDateString() === selectedDate.value.toDateString()
  })
})

// Validation schema for parsing dinner event detail
const { DinnerEventDetailSchema } = useBookingValidation()

// Component-local data: Fetch dinner detail with orders when selection changes (ADR-007)
const {data: selectedDinnerEventDetail} = useAsyncData(
  computed(() => `chef-dinner-${selectedDinnerEvent.value?.id || 'none'}`),
  () => selectedDinnerEvent.value?.id
    ? planStore.fetchDinnerEventDetail(selectedDinnerEvent.value.id)
    : Promise.resolve(null),
  {
    watch: [() => selectedDinnerEvent.value?.id],
    immediate: true,
    transform: (data: any) => {
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

const orders = computed(() => selectedDinnerEventDetail.value?.tickets ?? [])

// Bridge between date-based page state and ID-based component selection
const selectedDinnerId = computed(() => selectedDinnerEvent.value?.id ?? null)

const handleDinnerSelect = (dinnerId: number) => {
  const dinner = teamDinnerEvents.value.find(e => e.id === dinnerId)
  if (dinner) setSelectedDate(new Date(dinner.date))
}

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
      <UCard :ui="{ rounded: '', base: 'flex flex-col flex-1' }">
        <template #header>
          <h3 :class="TYPOGRAPHY.cardTitle">Mine Madhold</h3>
        </template>

        <!-- Loading teams -->
        <Loader v-if="!isPageReady" text="Henter madholdsdata..." />

        <!-- Team selector and calendar -->
        <div v-else class="space-y-4">
          <!-- Team selector (always visible, handles own empty state) -->
          <div class="px-4 pt-4">
            <MyTeamSelector
              :model-value="selectedTeamId"
              :teams="myTeams"
              @update:model-value="setSelectedTeamId"
            />
          </div>

          <!-- Team role status -->
          <div v-if="selectedTeam && authStore.user?.Inhabitant?.id" class="px-4">
            <TeamRoleStatus
              :team="selectedTeam"
              :inhabitant-id="authStore.user.Inhabitant.id"
            />
          </div>

          <!-- Team calendar with agenda/calendar views -->
          <div v-if="teamDinnerEvents.length === 0" class="px-4">
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

          <div v-else class="px-4">
            <TeamCalendarDisplay
              v-if="selectedSeason"
              :season-dates="selectedSeason.seasonDates"
              :teams="[selectedTeam].filter(Boolean)"
              :dinner-events="teamDinnerEvents"
              :holidays="selectedSeason.holidays"
              :selected-dinner-id="selectedDinnerId"
              :show-selection="true"
              @select="handleDinnerSelect"
            />
          </div>
        </div>
      </UCard>
    </template>

    <!-- Detail: Dinner view (default slot = right side) -->
    <UCard :ui="{ rounded: '', header: { padding: 'p-0' }, body: { padding: 'p-0' } }">
      <!-- Menu Hero in header slot (chef mode if isChefFor, else view mode) -->
      <template v-if="isPageReady && selectedDinnerEventDetail" #header>
        <DinnerMenuHero
          :dinner-event="selectedDinnerEventDetail"
          :ticket-prices="selectedSeason?.ticketPrices ?? []"
          :mode="dinnerMenuHeroMode"
          @update-allergens="handleAllergenUpdate"
        />
      </template>

      <!-- Loading -->
      <Loader v-if="!isPageReady" text="Henter fællesspisning..." />

      <!-- No dinner selected -->
      <UAlert
        v-else-if="!selectedDinnerEvent"
        type="info"
        variant="soft"
        :color="COLOR.info"
        icon="i-heroicons-arrow-left"
      >
        <template #title>
          Vælg en fællesspisning
        </template>
        <template #description>
          Vælg en fællesspisning fra listen til venstre for at se detaljer.
        </template>
      </UAlert>

      <!-- Kitchen Preparation in body -->
      <div v-else :class="LAYOUTS.sectionDivider">
        <div class="px-0 py-4 md:py-6 space-y-4">
          <h3 :class="`px-4 md:px-0 ${TYPOGRAPHY.cardTitle}`">Hvem laver maden?</h3>

          <!-- Cooking Team Display -->
          <CookingTeamCard
            v-if="selectedDinnerEvent.cookingTeamId"
            :team-id="selectedDinnerEvent.cookingTeamId"
            :team-number="selectedDinnerEvent.cookingTeamId"
            mode="monitor"
          />

          <!-- No cooking team assigned -->
          <UAlert
            v-else
            type="info"
            variant="soft"
            :color="COLOR.info"
            icon="i-heroicons-user-group"
          >
            <template #title>
              Intet madhold tildelt
            </template>
            <template #description>
              Der er endnu ikke tildelt et madhold til denne fællesspisning.
            </template>
          </UAlert>
        </div>

        <!-- Kitchen stats section -->
        <div class="px-4 md:px-6 py-4 md:py-6 space-y-4">
          <h3 :class="TYPOGRAPHY.cardTitle">Køkkenstatistik</h3>

          <!-- No orders yet -->
          <UAlert
            v-if="orders.length === 0"
            type="info"
            variant="soft"
            :color="COLOR.info"
            icon="i-heroicons-ticket"
          >
            <template #title>
              Ingen billetter endnu
            </template>
            <template #description>
              Der er endnu ikke bestilt nogen billetter til denne fællesspisning.
            </template>
          </UAlert>

          <!-- Kitchen statistics -->
          <KitchenPreparation v-else :orders="orders" />
        </div>
      </div>
    </UCard>
  </UPage>
</template>
