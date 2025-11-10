<script setup lang="ts">
/**
 * Dinner Page - Master/Detail view of communal dinners
 *
 * UX: Master-detail pattern
 * - Master (Calendar): 1/3 width, shows calendar with dinner events
 * - Detail (Dinner info): 2/3 width, shows selected day details
 *
 * Detail View Layout:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ MENU PANEL - Hero Style                                                     │
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
 * │ KØKKEN FORBEREDELSE                                                         │
 * │                                                                              │
 * │ ┌──────────────────────────────────────────────────────────────────────────┐│
 * │ │                          LAV MAD - 100%                                  ││
 * │ │  100 PORTIONER                                                           ││
 * │ │  Voksne: 80  |  Børn: 40 (20 portioner)  |  Baby: 5 (0 portioner)       ││
 * │ └──────────────────────────────────────────────────────────────────────────┘│
 * │ ┌──────────────────────────┬─────────────────────┬──────────────┬────────┐ │
 * │ │   TAKEAWAY - 40%         │  SPIS HER - 35%     │SPIS SENT-20% │IKKE-5% │ │
 * │ │                          │                     │              │        │ │
 * │ │      50 personer         │    44 personer      │  25 personer │ 6 pers │ │
 * │ │                          │                     │              │        │ │
 * │ │    40 portioner          │     35 stole        │   20 stole   │        │ │
 * │ │    40 tallerkener        │   33 tallerkener    │18 tallerkener│        │ │
 * │ │                          │                     │              │        │ │
 * │ │    🌾 Maria (2)          │   🥛 Anna (3)       │  🌾 Peter    │        │ │
 * │ │    🥚 Tom (1)            │   🥚 Lars (1)       │              │        │ │
 * │ │                          │                     │              │        │ │
 * │ └──────────────────────────┴─────────────────────┴──────────────┴────────┘ │
 * │ ←─────────── 40% ─────────→←──────── 35% ──────→←──── 20% ───→←─ 5% ─→   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

import {formatDate} from '~/utils/date'
import type {DateRange} from '~/types/dateTypes'

// Component needs to handle its own data needs
const planStore = usePlanStore()
const {activeSeason, isSelectedSeasonInitialized, isSelectedSeasonLoading, isSelectedSeasonErrored} = storeToRefs(planStore)
// Initialize without await for SSR hydration consistency
planStore.initPlanStore()

// Derive needed data from store
const seasonDates = computed(() => activeSeason.value?.seasonDates)
const dinnerEvents = computed(() => activeSeason.value?.dinnerEvents ?? [])
const holidays = computed(() => activeSeason.value?.holidays ?? [])
const cookingDays = computed(() => activeSeason.value?.cookingDays ?? {})

// UI state
const selectedDate = ref<Date | null>(null)

// Mock data for dinner detail view (TODO: Replace with real data integration)
const mockDinnerEvent = {
  id: 1,
  date: new Date(),
  menuTitle: 'Spaghetti Carbonara',
  menuDescription: 'Cremet pasta med bacon og parmesan',
  menuPictureUrl: null, // Will use fallback color
  allergies: [
    { icon: '🥛', name: 'Laktose' },
    { icon: '🌾', name: 'Gluten' },
    { icon: '🥚', name: 'Æg' }
  ]
}

const mockBookings = {
  adults: 80,
  children: 40,
  babies: 5,
  // Distribution by dining mode
  byDiningMode: {
    TAKEAWAY: {
      count: 50,
      portions: 40,
      allergies: [
        { icon: '🌾', name: 'Maria', count: 2 },
        { icon: '🥚', name: 'Tom', count: 1 }
      ]
    },
    DINEIN: {
      count: 44,
      portions: 35,
      chairs: 35,
      plates: 33,
      allergies: [
        { icon: '🥛', name: 'Anna', count: 3 },
        { icon: '🥚', name: 'Lars', count: 1 }
      ]
    },
    DINEINLATE: {
      count: 25,
      portions: 20,
      chairs: 20,
      plates: 18,
      allergies: [
        { icon: '🌾', name: 'Peter', count: 1 }
      ]
    },
    NONE: {
      count: 6
    }
  }
}

// Calculated statistics
const totalBookings = computed(() => {
  const modes = mockBookings.byDiningMode
  return modes.TAKEAWAY.count + modes.DINEIN.count + modes.DINEINLATE.count + modes.NONE.count
})

const totalPortions = computed(() => {
  return mockBookings.adults + (mockBookings.children * 0.5) + (mockBookings.babies * 0)
})

const childPortions = computed(() => mockBookings.children * 0.5)

const diningModeStats = computed(() => {
  const total = totalBookings.value
  return [
    {
      key: 'TAKEAWAY',
      label: 'TAKEAWAY',
      percentage: Math.round((mockBookings.byDiningMode.TAKEAWAY.count / total) * 100),
      count: mockBookings.byDiningMode.TAKEAWAY.count,
      portions: mockBookings.byDiningMode.TAKEAWAY.portions,
      plates: mockBookings.byDiningMode.TAKEAWAY.portions,
      chairs: null,
      allergies: mockBookings.byDiningMode.TAKEAWAY.allergies
    },
    {
      key: 'DINEIN',
      label: 'SPIS HER',
      percentage: Math.round((mockBookings.byDiningMode.DINEIN.count / total) * 100),
      count: mockBookings.byDiningMode.DINEIN.count,
      portions: mockBookings.byDiningMode.DINEIN.portions,
      plates: mockBookings.byDiningMode.DINEIN.plates,
      chairs: mockBookings.byDiningMode.DINEIN.chairs,
      allergies: mockBookings.byDiningMode.DINEIN.allergies
    },
    {
      key: 'DINEINLATE',
      label: 'SPIS SENT',
      percentage: Math.round((mockBookings.byDiningMode.DINEINLATE.count / total) * 100),
      count: mockBookings.byDiningMode.DINEINLATE.count,
      portions: mockBookings.byDiningMode.DINEINLATE.portions,
      plates: mockBookings.byDiningMode.DINEINLATE.plates,
      chairs: mockBookings.byDiningMode.DINEINLATE.chairs,
      allergies: mockBookings.byDiningMode.DINEINLATE.allergies
    },
    {
      key: 'NONE',
      label: 'IKKE',
      percentage: Math.round((mockBookings.byDiningMode.NONE.count / total) * 100),
      count: mockBookings.byDiningMode.NONE.count,
      portions: null,
      plates: null,
      chairs: null,
      allergies: []
    }
  ]
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
  <Loader v-if="isSelectedSeasonLoading" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />
  <div v-else-if="isSelectedSeasonInitialized && activeSeason" class="flex flex-col lg:flex-row gap-6 h-full">
    <!-- Master: Calendar (1/3 on large screens) -->
    <div class="lg:w-1/3 flex flex-col">
      <UCard :ui="{ rounded: '', base: 'flex flex-col flex-1' }">
        <template #header>
          <h3 class="text-lg font-semibold">Kalender</h3>
        </template>

        <CalendarDisplay
          v-if="seasonDates"
          :season-dates="seasonDates"
          :cooking-days="cookingDays"
          :holidays="holidays"
          :dinner-events="dinnerEvents"
          :number-of-months="1"
        />

        <!-- Legend -->
        <div class="mt-4 space-y-2 text-sm border-t pt-4">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 flex items-center justify-center">
              <UChip show size="xs" color="success">1</UChip>
            </div>
            <span>Ferie</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 border-2 border-secondary-300 flex items-center justify-center text-xs">
              1
            </div>
            <span>Mulig maddag</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-secondary-800 text-white flex items-center justify-center text-xs">
              1
            </div>
            <span>Planlagt maddag</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Detail: Dinner info (2/3 on large screens) -->
    <div class="lg:w-2/3 flex flex-col gap-6">
      <!-- Menu Panel - Hero Style -->
      <UCard :ui="{ rounded: '', body: { padding: 'p-0' } }">
        <div
          class="relative min-h-[300px] flex flex-col justify-center items-center text-center p-8 bg-ocean-500"
          :style="mockDinnerEvent.menuPictureUrl
            ? `background-image: url(${mockDinnerEvent.menuPictureUrl}); background-size: cover; background-position: center;`
            : ''"
        >
          <!-- Overlay for better text readability when image is present -->
          <div
            v-if="mockDinnerEvent.menuPictureUrl"
            class="absolute inset-0 bg-black/40"
          />

          <!-- Content -->
          <div class="relative z-10 text-white space-y-4">
            <h1 class="text-4xl md:text-5xl font-bold">
              {{ mockDinnerEvent.menuTitle }}
            </h1>
            <p class="text-lg md:text-xl opacity-90">
              {{ mockDinnerEvent.menuDescription }}
            </p>

            <!-- Allergies -->
            <div class="flex justify-center gap-4 text-base">
              <span
                v-for="allergy in mockDinnerEvent.allergies"
                :key="allergy.name"
                class="flex items-center gap-1"
              >
                <span>{{ allergy.icon }}</span>
                <span>{{ allergy.name }}</span>
              </span>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-wrap justify-center gap-3 pt-4">
              <UButton color="primary" size="lg">Bestil</UButton>
              <UButton color="neutral" variant="solid" size="lg">Byt</UButton>
              <UButton color="error" variant="solid" size="lg">Annuller</UButton>
              <UButton color="neutral" variant="solid" size="lg">Skift Servering</UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Kitchen Preparation Panel -->
      <UCard :ui="{ rounded: '' }">
        <template #header>
          <h3 class="text-lg font-semibold">Køkken Forberedelse</h3>
        </template>

        <div class="space-y-4">
          <!-- Top bar: LAV MAD - 100% -->
          <div class="bg-gray-100 dark:bg-gray-800 p-4">
            <div class="text-center">
              <div class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                LAV MAD - 100%
              </div>
              <div class="text-3xl font-bold mb-2">
                {{ totalPortions }} PORTIONER
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap justify-center gap-2 md:gap-4">
                <span>Voksne: {{ mockBookings.adults }}</span>
                <span>|</span>
                <span>Børn: {{ mockBookings.children }} ({{ childPortions }} portioner)</span>
                <span>|</span>
                <span>Baby: {{ mockBookings.babies }} (0 portioner)</span>
              </div>
            </div>
          </div>

          <!-- Bottom bar: Dining mode distribution - Proportional widths -->
          <div class="flex gap-1">
            <div
              v-for="mode in diningModeStats"
              :key="mode.key"
              :style="{ width: `${mode.percentage}%` }"
              class="border p-3 text-center"
              :class="{
                'bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800': mode.key === 'TAKEAWAY',
                'bg-ocean-50 dark:bg-ocean-950 border-ocean-200 dark:border-ocean-800': mode.key === 'DINEIN',
                'bg-info-50 dark:bg-info-950 border-info-200 dark:border-info-800': mode.key === 'DINEINLATE',
                'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700': mode.key === 'NONE'
              }"
            >
              <!-- Header with label and percentage -->
              <div class="font-semibold text-xs mb-2 truncate">
                {{ mode.label }} - {{ mode.percentage }}%
              </div>

              <!-- People count -->
              <div class="font-bold text-lg mb-2">
                {{ mode.count }} {{ mode.count === 1 ? 'person' : 'personer' }}
              </div>

              <!-- Portions (for modes that need food) -->
              <div v-if="mode.portions !== null" class="text-sm mb-1">
                {{ mode.portions }} portioner
              </div>

              <!-- Chairs (for dine-in modes) -->
              <div v-if="mode.chairs !== null" class="text-sm mb-1">
                {{ mode.chairs }} stole
              </div>

              <!-- Plates -->
              <div v-if="mode.plates !== null" class="text-sm mb-2">
                {{ mode.plates }} tallerkener
              </div>

              <!-- Allergies -->
              <div v-if="mode.allergies && mode.allergies.length > 0" class="text-xs space-y-1 mt-2">
                <div
                  v-for="allergy in mode.allergies"
                  :key="allergy.name"
                  class="flex items-center justify-center gap-1"
                >
                  <span>{{ allergy.icon }}</span>
                  <span>{{ allergy.name }}</span>
                  <span v-if="allergy.count">({{ allergy.count }})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
