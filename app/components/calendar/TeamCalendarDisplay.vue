<script setup lang="ts">
/**
 * TeamCalendarDisplay - Displays cooking team assignments on a calendar
 *
 * Shows which team is assigned to cook on each date using colored circles.
 * Each team gets a distinct color, and hovering shows the team name in a tooltip.
 *
 * Uses BaseCalendar for consistent calendar structure and event management.
 * Domain-specific rendering via slots (badges with tooltips for team assignments).
 */
import type {DateRange} from '~/types/dateTypes'
import type {CookingTeam} from '~/composables/useCookingTeamValidation'
import type {DinnerEvent} from '~/composables/useDinnerEventValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import type {DateValue} from '@internationalized/date'

interface Props {
  seasonDates: DateRange
  teams: CookingTeam[]
  dinnerEvents: DinnerEvent[]
  holidays?: DateRange[]
}

const props = defineProps<Props>()
const {getTeamColor} = useCookingTeam()
const {createEventList} = useCalendarEvents()
const {getHolidayDatesFromDateRangeList} = useSeason()

// Expand holiday ranges into individual dates
const holidayDates = computed(() => {
  if (!props.holidays || props.holidays.length === 0) return []
  return getHolidayDatesFromDateRangeList(props.holidays)
})

// Transform team assignments into event lists (one per team for color coding)
const teamEventLists = computed(() => {
  return props.teams.map((team, teamIndex) => {
    // Filter events for this team
    const teamEvents = props.dinnerEvents
      .filter(event => event.cookingTeamId === team.id)
      .map(event => event.date)

    return createEventList(teamEvents, `team-${team.id}`, 'badge', {
      label: team.name,
      color: teamIndex,
      metadata: { teamId: team.id, teamName: team.name }
    })
  })
})

// Combine all event lists
const allEventLists = computed(() => teamEventLists.value)

// Check if a day is a holiday using isCalendarDateInDateList
const isHoliday = (day: DateValue): boolean => {
  return isCalendarDateInDateList(day, holidayDates.value)
}

// Helper to find team event list for a day (for rendering logic)
const getTeamEventList = (eventLists: DayEventList[]) => {
  return eventLists.find(list => list.listId.startsWith('team-'))
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">Holdkalender</h3>
    <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists">
      <template #day="{ day, eventLists }">
        <!-- Holiday takes precedence -->
        <UChip v-if="isHoliday(day)" show size="md" color="success">
          {{ day.day }}
        </UChip>

        <!-- Team cooking day with tooltip -->
        <UTooltip
            v-else-if="getTeamEventList(eventLists)"
            :text="getTeamEventList(eventLists)!.events[0]?.label"
        >
          <UBadge
              :color="getTeamColor(getTeamEventList(eventLists)!.color as number)"
              variant="solid"
              size="md"
          >
            {{ day.day }}
          </UBadge>
        </UTooltip>

        <!-- Regular day -->
        <span v-else class="text-sm">{{ day.day }}</span>
      </template>
    </BaseCalendar>
  </div>
</template>
