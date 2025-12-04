<script setup lang="ts">
/**
 * TeamCalendarDisplay - Displays cooking team assignments in calendar view
 *
 * Features:
 * - Calendar view: Shows team assignments on calendar with colored badges
 * - Selection support: Click to select dinner event (optional via emit)
 * - Multi-team support: Shows all teams with distinct colors
 * - Holiday awareness: Displays holidays as green chips
 *
 * Uses BaseCalendar for consistent calendar structure.
 *
 * Used in:
 * - /admin/teams (admin overview - no selection)
 */
import type {DateRange} from '~/types/dateTypes'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type{DayEventList} from '~/composables/useCalendarEvents'
import type {DateValue} from '@internationalized/date'
import { isSameDay } from 'date-fns'

interface Props {
  seasonDates: DateRange
  teams: CookingTeamDisplay[]
  dinnerEvents: DinnerEventDisplay[]
  holidays?: DateRange[]
  selectedDinnerId?: number | null // For chef page selection
  showSelection?: boolean // Enable selection mode
}

const props = withDefaults(defineProps<Props>(), {
  holidays: () => [],
  selectedDinnerId: null,
  showSelection: false
})

const emit = defineEmits<{
  select: [dinnerId: number]
}>()

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

// Calendar selection support - match agenda view behavior
const getDinnerForDay = (day: DateValue): DinnerEventDisplay | undefined => {
  const dayAsDate = toDate(day)
  return props.dinnerEvents.find(event => isSameDay(new Date(event.date), dayAsDate))
}

const handleCalendarDayClick = (day: DateValue) => {
  if (!props.showSelection) return
  const dinner = getDinnerForDay(day)
  if (dinner) emit('select', dinner.id)
}

const isCalendarDaySelected = (day: DateValue): boolean => {
  if (!props.selectedDinnerId || !props.showSelection) return false
  const dinner = getDinnerForDay(day)
  return dinner?.id === props.selectedDinnerId
}

const getCalendarDayClasses = (day: DateValue) => [
  props.showSelection ? 'cursor-pointer hover:ring-2 hover:ring-offset-1' : '',
  isCalendarDaySelected(day) ? 'ring-2 ring-primary ring-offset-1' : ''
]
</script>

<template>
  <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists">
        <template #day="{ day, eventLists }">
          <!-- Holiday takes precedence -->
          <UChip v-if="isHoliday(day)" show size="md" color="success">
            {{ day.day }}
          </UChip>

          <!-- Team cooking day with tooltip and selection -->
          <UTooltip
            v-else-if="getTeamEventList(eventLists)"
            :text="getTeamEventList(eventLists)!.events[0]?.label"
          >
            <UBadge
              :color="getTeamColor(getTeamEventList(eventLists)!.color as number)"
              variant="solid"
              size="md"
              :class="getCalendarDayClasses(day)"
              @click="handleCalendarDayClick(day)"
            >
              {{ day.day }}
            </UBadge>
          </UTooltip>

          <!-- Regular day -->
          <span v-else class="text-sm">{{ day.day }}</span>
        </template>

        <!-- Legend: Responsive layout matching calendar months (1 col mobile, 3 cols desktop) -->
        <template #legend>
          <div class="px-4 py-6 md:px-6 md:py-8 border-t mt-auto text-sm grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <!-- Teams -->
            <div v-for="(team, index) in teams" :key="team.id" class="flex items-center gap-3">
              <UBadge
                :color="getTeamColor(index)"
                variant="solid"
                size="md"
                class="w-8 h-8 flex items-center justify-center shrink-0"
              >
                1
              </UBadge>
              <span class="truncate">{{ team.name }}</span>
            </div>

            <!-- Holidays -->
            <div v-if="holidays && holidays.length > 0" class="flex items-center gap-3">
              <div class="w-8 h-8 flex items-center justify-center shrink-0">
                <UChip show size="md" color="success">1</UChip>
              </div>
              <span>Ferie</span>
            </div>
          </div>
    </template>
  </BaseCalendar>
</template>
