<script setup lang="ts">
/**
 * Dinner Page - Master/Detail view of communal dinners
 *
 * UX: Master-detail pattern
 * - Master (Calendar): 1/4 width, shows calendar with dinner events
 * - Detail (Dinner info): 3/4 width, shows selected day details
 *
 * Detail View Layout:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ MENU HERO (UCard Header - Full Bleed)                                      │
 * │ ┌─────────────────────────────────────────────────────────────────────────┐ │
 * │ │ [Baggrund: Menu Foto eller Fast Farve]                                  │ │
 * │ │                                                                          │ │
 * │ │                       SPAGHETTI CARBONARA                                │ │
 * │ │               Cremet pasta med bacon og parmesan                         │ │
 * │ │                                                                          │ │
 * │ │     Allergener: 🥛 Laktose   🌾 Gluten   🥚 Æg                           │ │
 * │ │                                                                          │ │
 * │ │     [Bestil] [Byt] [Annuller] [Skift Servering]                         │ │
 * │ └─────────────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ KØKKEN FORBEREDELSE (UCard Body - Full Bleed)                              │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ 👨‍🍳 Chefkok: Anna Larsen                                                   │
 * │ 👥 Madhold 3: Bob Jensen, Clara Nielsen, David Hansen                      │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                          LAV MAD - 100%                                     │
 * │  100 PORTIONER                                                              │
 * │  Voksne: 80  |  Børn: 40 (20 portioner)  |  Baby: 5 (0 portioner)          │
 * ├──────────────────────────┬─────────────────────┬──────────────┬────────────┤
 * │   TAKEAWAY - 40%         │  SPIS HER - 35%     │SPIS SENT-20% │IKKE-5%     │
 * │                          │                     │              │            │
 * │      50 personer         │    44 personer      │  25 personer │ 6 personer │
 * │                          │                     │              │            │
 * │    40 portioner          │     35 stole        │   20 stole   │            │
 * │    40 tallerkener        │   33 tallerkener    │18 tallerkener│            │
 * │                          │                     │              │            │
 * │    🌾 Maria (2)          │   🥛 Anna (3)       │  🌾 Peter    │            │
 * │    🥚 Tom (1)            │   🥚 Lars (1)       │              │            │
 * │                          │                     │              │            │
 * └──────────────────────────┴─────────────────────┴──────────────┴────────────┘
 * ←─────────── 40% ─────────→←──────── 35% ──────→←──── 20% ───→←─── 5% ──→
 */

import {formatDate, parseDate} from '~/utils/date'
import type {DateRange} from '~/types/dateTypes'
import {useQueryParam} from '~/composables/useQueryParam'

// Design system
const { COLOR, TYPOGRAPHY, BACKGROUNDS, LAYOUTS, COMPONENTS, SIZES } = useTheSlopeDesignSystem()

// Component needs to handle its own data needs
const planStore = usePlanStore()
const {selectedSeason, isActiveSeasonIdLoading,
  isPlanStoreReady,
  isSelectedSeasonInitialized, isSelectedSeasonLoading, isSelectedSeasonErrored} = storeToRefs(planStore)
// Initialize without await for SSR hydration consistency
planStore.initPlanStore()

// Derive needed data from store
const seasonDates = computed(() => selectedSeason.value?.seasonDates)
const holidays = computed(() => selectedSeason.value?.holidays ?? [])
const cookingDays = computed(() => selectedSeason.value?.cookingDays)
const dinnerEvents = computed(() => selectedSeason.value?.dinnerEvents ?? [])

// Get dinner start time from season configuration
const {getDefaultDinnerStartTime, getNextDinnerDate} = useSeason()
const dinnerStartTime = getDefaultDinnerStartTime()

// Date selection via URL query parameter
const dinnerDates = computed(() => dinnerEvents.value.map(e => new Date(e.date)))
const getDefaultDate = (): Date => {
    const nextDinner = getNextDinnerDate(dinnerDates.value, dinnerStartTime)
    return nextDinner?.start ?? new Date()
}

const {value: selectedDate, setValue} = useQueryParam<Date>('date', {
    serialize: formatDate,
    deserialize: (s) => {
        const parsed = parseDate(s)
        return parsed && !isNaN(parsed.getTime()) ? parsed : null
    },
    validate: (date) => {
        // Check if this date has a dinner event
        return dinnerEvents.value.some(e => {
            const eventDate = new Date(e.date)
            return eventDate.toDateString() === date.toDateString()
        })
    },
    defaultValue: getDefaultDate,
    // Auto-sync URL when store is ready and events are loaded
    syncWhen: () => isPlanStoreReady.value && dinnerEvents.value.length > 0
})

// Selected dinner event based on URL date
const selectedDinnerEvent = computed(() => {
    return dinnerEvents.value.find(e => {
        const eventDate = new Date(e.date)
        return eventDate.toDateString() === selectedDate.value.toDateString()
    })
})

// Data from selected dinner event
const orders = computed(() => selectedDinnerEvent.value?.tickets ?? [])
const allergies = computed(() => {
    // TODO: Get allergies for inhabitants with orders for this event
    return []
})
const ticketPrices = computed(() => selectedSeason.value?.ticketPrices ?? [])
const teamAssignments = computed(() => {
    // Get cooking team assignments from the selected event's cooking team
    return selectedDinnerEvent.value?.cookingTeam?.assignments ?? []
})

useHead({
  title: '🍽️ Fællesspisning',
  meta: [
    {
      name: 'Fællesspisning',
      content: 'Tilmelding til dagens fællesspisning'
    }
  ]
})
</script>

<template>
  <Loader v-if="!isPlanStoreReady" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />

  <!-- No selected season state -->
  <UPage v-else-if="isSelectedSeasonInitialized && !selectedSeason">
    <div :class="`p-4 md:p-8 ${BACKGROUNDS.card}`">
      <UAlert
        type="info"
        variant="soft"
        :color="COLOR.info"
        icon="i-mage-robot-dead"
      >
        <template #title>
          Her ser lidt tomt ud!
        </template>
        <template #description>
          Bed din administrator om at oprette og aktivere en fællespisningssæson.
        </template>
        <template #actions>
          <UButton
            :color="COLOR.secondary"
            variant="solid"
            to="/admin/planning"
            icon="i-heroicons-plus-circle"
            size="lg"
          >
            Værsgo, opret en ny sæson
          </UButton>
        </template>
      </UAlert>
    </div>
  </UPage>

  <!-- Main master-detail layout -->
  <UPage v-else-if="isSelectedSeasonInitialized && selectedSeason">
    <!-- Master: Calendar (left slot) -->
    <template #left>
      <UCard :ui="{ rounded: '', base: 'flex flex-col flex-1' }">
        <template #header>
          <h3 :class="TYPOGRAPHY.cardTitle">Fællesspisningens kalender</h3>
        </template>

        <DinnerCalendarDisplay
          v-if="seasonDates && selectedDate"
          :season-dates="seasonDates"
          :cooking-days="cookingDays"
          :holidays="holidays"
          :dinner-events="dinnerEvents"
          :show-countdown="true"
          :color="COLOR.peach"
          :selected-date="selectedDate"
          @date-selected="setValue"
        />
      </UCard>
    </template>

    <!-- Detail: Dinner info (default slot = right side) -->
    <UCard :ui="{ rounded: '', header: { padding: 'p-0' }, body: { padding: 'p-0' } }">
      <!-- Menu Hero in header slot (full bleed) -->
      <template #header>
        <DinnerMenuHero
          :dinner-event="selectedDinnerEvent"
          :allergies="allergies"
          :orders="orders"
          :ticket-prices="ticketPrices"
        />
      </template>

      <!-- Kitchen Preparation in body -->
      <div :class="LAYOUTS.sectionDivider">
        <div class="px-0 py-4 md:py-6 space-y-4">
          <h3 :class="`px-4 md:px-0 ${TYPOGRAPHY.cardTitle}`">Hvem laver maden?</h3>

          <!-- Cooking Team Display (Monitor Mode) -->
          <CookingTeamCard
            v-if="selectedDinnerEvent?.cookingTeam"
            :team-id="selectedDinnerEvent.cookingTeam.id"
            :team-number="selectedDinnerEvent.cookingTeam.id"
            :team-name="selectedDinnerEvent.cookingTeam.name"
            :assignments="teamAssignments"
            mode="monitor"
          />

          <!-- No cooking team assigned -->
          <UAlert
            v-else
            variant="soft"
            :color="COLOR.neutral"
            :avatar="{ text: '🏃‍♀️🏃‍♂️', size: SIZES.emptyStateAvatar.value }"
            :ui="COMPONENTS.emptyStateAlert"
          >
            <template #title>
              👥 Køkkenholdet er løbet ud at lege
            </template>
            <template #description>
              Intet madhold tildelt endnu
            </template>
          </UAlert>
        </div>
        <KitchenPreparation :orders="orders" />
      </div>
    </UCard>
  </UPage>
</template>
