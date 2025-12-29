<script setup lang="ts">
/**
 * HouseholdBookings - Booking management (Tilmeldinger tab content)
 *
 * UX: Master-detail pattern
 * - Master (Calendar): 1/3 width on large screens, shows 1 month
 * - Detail (Booking panel): 2/3 width, shows selected day details
 */
import {WEEKDAYS} from '~/types/dateTypes'
import {formatDate, formatWeekdayCompact} from '~/utils/date'
import {FORM_MODES} from '~/types/form'
import type {WeekDayMap} from '~/types/dateTypes'
import type {DinnerMode, OrderDisplay} from '~/composables/useBookingValidation'

interface Inhabitant {
  id: number
  name: string
  lastName: string
  birthDate?: Date | null
  dinnerPreferences?: WeekDayMap<DinnerMode> | null
}

interface Household {
  id: number
  name: string
  shortName: string
  inhabitants: Inhabitant[]
}

interface Props {
  household: Household
}

const _props = defineProps<Props>()

// Use ticket composable for ticket type determination (DRY - respects maximumAgeLimit)
const {determineTicketType, ticketTypeConfig} = useTicket()

// Component needs to handle its own data needs for non core data elements
const planStore = usePlanStore()
const {activeSeason, isSelectedSeasonInitialized, isSelectedSeasonLoading, isSelectedSeasonErrored} = storeToRefs(planStore)
// Initialize without await for SSR hydration consistency
planStore.initPlanStore()

// Derive needed data from store
const seasonDates = computed(() => activeSeason.value?.seasonDates ?? { start: new Date(), end: new Date() })
const dinnerEvents = computed(() => activeSeason.value?.dinnerEvents ?? [])
const holidays = computed(() => activeSeason.value?.holidays ?? [])
// TODO: Orders should come from bookings store, not Season type
const orders = computed((): OrderDisplay[] => [])

// UI state
// Selected day for detail panel (null = show today or next event)
const selectedDate = ref<Date | null>(null)

// Visible cooking days based on season config
const visibleCookingDays = computed(() => {
  if (!activeSeason.value?.cookingDays) return WEEKDAYS
  return WEEKDAYS.filter(d => activeSeason.value!.cookingDays[d])
})
</script>

<template>
  <Loader v-if="isSelectedSeasonLoading" text="Henter sæsondata..." />
  <ViewError v-else-if="isSelectedSeasonErrored" text="Kan ikke hente sæsondata" />
  <div v-else-if="isSelectedSeasonInitialized && activeSeason" data-test-id="household-bookings">
    <!-- Master-Detail layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Master: Calendar (1/3 on large screens) -->
      <div class="lg:col-span-1">
        <h3 class="text-lg font-semibold mb-4">Kalender</h3>
        <HouseholdCalendarDisplay
          :season-dates="seasonDates"
          :household="household"
          :dinner-events="dinnerEvents"
          :orders="orders"
          :holidays="holidays"
        />

        <!-- Legend -->
        <div class="mt-4 space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-xs">●</span>
            <span>Tilmeldt</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs">◆</span>
            <span>Hold laver mad</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs">○</span>
            <span>Ikke tilmeldt</span>
          </div>
        </div>
      </div>

    <!-- Detail: Preferences & Booking management (2/3 on large screens) -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Weekly preferences overview -->
      <UCard>
        <template #header>
          <h3 class="text-sm font-semibold">Ugentlige præferencer</h3>
        </template>

        <div class="space-y-2">
          <!-- Header row: labels (shown once) -->
          <div class="flex items-center gap-3">
            <div class="min-w-[90px]">
              <span class="text-xs text-gray-500 font-semibold">Billettype</span>
            </div>
            <div class="min-w-[100px]">
              <span class="text-xs text-gray-500 font-semibold">Navn</span>
            </div>
            <div class="flex gap-1">
              <div
                v-for="day in visibleCookingDays"
                :key="day"
                class="flex flex-col items-center gap-1 min-w-[32px]"
              >
                <span class="text-xs text-gray-500 capitalize">{{ formatWeekdayCompact(day) }}</span>
              </div>
            </div>
          </div>

          <!-- Data rows: one per inhabitant -->
          <div
            v-for="inhabitant in household.inhabitants"
            :key="inhabitant.id"
            class="flex items-center gap-3"
          >
            <!-- Ticket type badge -->
            <div class="min-w-[90px]">
              <UBadge
                :color="ticketTypeConfig[determineTicketType(inhabitant.birthDate)]?.color ?? 'neutral'"
                variant="subtle"
                size="sm"
              >
                {{ ticketTypeConfig[determineTicketType(inhabitant.birthDate)]?.label ?? 'Ukendt' }}
              </UBadge>
            </div>

            <!-- Name -->
            <span class="text-sm min-w-[100px]">{{ inhabitant.name }}</span>

            <!-- Weekly preferences -->
            <WeekDayMapDinnerModeDisplay
              :model-value="inhabitant.dinnerPreferences"
              :form-mode="FORM_MODES.VIEW"
              :parent-restriction="activeSeason?.cookingDays"
              :show-labels="false"
            />
          </div>
        </div>
      </UCard>

      <!-- Booking management placeholder -->
      <UCard>
        <template #header>
          <h3 class="text-sm font-semibold">
            {{ selectedDate ? formatDate(selectedDate) : 'I dag' }}
          </h3>
        </template>

        <div class="space-y-4">
          <div v-for="i in household.inhabitants.length" :key="i" class="flex items-center gap-4">
            <USkeleton class="h-10 w-32" />
            <USkeleton class="h-10 flex-1" />
          </div>
        </div>
      </UCard>
    </div>
    </div>
  </div>
  <UAlert
    v-else
    icon="i-heroicons-calendar-days"
    color="primary"
    variant="subtle"
    title="Ingen aktiv sæson"
    description="Der er ingen aktiv fællesspisnings sæson i øjeblikket. Kontakt administratoren for at aktivere en sæson."
    data-test-id="household-bookings-empty"
  />
</template>
