<script setup lang="ts">
/**
 * HouseholdCard - members and their settings - especially weekly dinner preferencesid
 *
 * UX: Master-detail pattern for Tilmeldinger tab
 * - Master (Calendar): 1/3 width on large screens, shows 1 month
 * - Detail (Booking panel): 2/3 width, shows selected day details
 */
import type {DateRange} from '~/types/dateTypes'

interface Inhabitant {
  id: number
  name: string
  lastName: stringtra
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

// Mockup: Weekly preferences expanded/collapsed state
const preferencesExpanded = ref(false)


// Mockup: Determine inhabitant ticket type based on age (placeholder)
const getTicketTypeLabel = (inhabitant: Inhabitant): string => {
  // TODO: Calculate from birthDate when implemented
  return 'Voksen'
}

// TODO: Import DinnerMode and create test preferences
// Temporary test data matching the prototype
const testPreferences = ref<Record<number, any>>({
  // These IDs should match actual inhabitant IDs when wired up
})
</script>

<template>
  <!-- Weekly Preferences Section -->
  <div class="border-t pt-4">
    <button
        class="flex items-center justify-between w-full text-left"
        @click="preferencesExpanded = !preferencesExpanded"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5"/>
        <span class="font-semibold">Ugentlige præferencer</span>
      </div>
      <UIcon
          :name="preferencesExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="w-5 h-5"
      />
    </button>

    <!-- Compact view (collapsed) - Overview of all inhabitants -->
    <div v-if="!preferencesExpanded" class="mt-4 space-y-3">
      <div
          v-for="inhabitant in household.inhabitants"
          :key="inhabitant.id"
          class="flex items-start gap-3"
      >
        <div class="flex items-center gap-2 min-w-[120px]">
          <UIcon name="i-heroicons-user" class="w-3 h-3 text-gray-400"/>
          <span class="text-sm font-medium">{{ inhabitant.name }}</span>
        </div>
        <WeekDayMapDinnerModeDisplay
            :model-value="null"
            compact
            :name="`compact-inhabitant-${inhabitant.id}-preferences`"
        />
      </div>
    </div>

    <!-- Expanded view -->
    <div v-else class="mt-4 space-y-4">
      <p class="text-sm text-muted">
        Standard for hver ugedag (opdaterer automatisk fremtidige bookinger)
      </p>

      <div
          v-for="inhabitant in household.inhabitants"
          :key="inhabitant.id"
          class="space-y-2"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user" class="w-4 h-4"/>
          <span class="font-medium">{{ inhabitant.name }}</span>
        </div>

        <!-- TODO: Wire up to actual inhabitant.dinnerPreferences when available -->
        <WeekDayMapDinnerModeDisplay
            :model-value="null"
            :name="`inhabitant-${inhabitant.id}-preferences`"
            @update:model-value="(value) => console.log('Update preferences for', inhabitant.id, value)"
        />
      </div>

      <UAlert
          icon="i-heroicons-information-circle"
          color="primary"
          variant="soft"
          title="Ændringer opdaterer fremtidige bookinger"
      />
    </div>
  </div>

</template>
