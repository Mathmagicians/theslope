<script setup lang="ts">
/**
 * HouseholdBookings - Booking management (Tilmeldinger tab content)
 *
 * UX: Master-detail pattern
 * - Master (Calendar): 1/3 width on large screens, shows 1 month
 * - Detail (Booking panel): 2/3 width, shows selected day details
 */
import type {DateRange} from '~/types/dateTypes'
import {formatDate} from '~/utils/date'

interface Inhabitant {
  id: number
  name: string
  lastName: string
}

interface Household {
  id: number
  name: string
  shortName: string
  inhabitants: Inhabitant[]
}

interface DinnerEvent {
  id: number
  date: Date
  cookingTeamId: number | null
}

interface Order {
  id: number
  dinnerEventId: number
  inhabitantId: number
}

interface Props {
  household: Household
  seasonDates: DateRange
  dinnerEvents: DinnerEvent[]
  orders: Order[]
  holidays?: DateRange[]
}

const props = defineProps<Props>()

// Selected day for detail panel (null = show today or next event)
const selectedDate = ref<Date | null>(null)
</script>

<template>
  <!-- Check if season exists and is loaded -->
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

    <!-- Detail: Booking management (2/3 on large screens) -->
    <div class="lg:col-span-2">
      <h3 class="text-lg font-semibold mb-4">
        {{ selectedDate ? formatDate(selectedDate) : 'I dag' }}
      </h3>

      <div class="rounded-lg border p-4">
        <p class="text-muted">
          Vælg en dag i kalenderen for at administrere tilmeldinger
        </p>
        <!-- TODO: Booking management UI will go here -->
        <!-- - List of inhabitants with dropdowns -->
        <!-- - Quick actions (Tilmeld alle, Tag alle med, Afmeld) -->
        <!-- - Guest ticket button -->
        <!-- - Event details (cooking team, deadline, price) -->
      </div>
    </div>
  </div>
</template>
