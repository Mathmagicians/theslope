<script setup lang="ts">
/**
 * TeamCalendarDisplay - Displays cooking team assignments in calendar view
 *
 * Features:
 * - Calendar view: Shows team assignments on calendar with colored badges
 * - Multi-team support: a team wears the rainbow stop of its number (`getTeamNumber` over the season's teams, `getRainbowBand`); the stops repeat after the last
 * - Holiday awareness: Displays holidays as green rings
 *
 * Uses BaseCalendar for consistent calendar structure.
 *
 * Used in:
 * - /admin/teams (all-teams overview)
 * - CookingTeamCard (the team's own calendar in its regular and edit modes, on /admin/teams)
 *
 * Visual check: /admin/teams, the all-teams calendar and a team's card calendar, phone and desktop.
 */
import type {DateRange} from '~/types/dateTypes'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type{DayEventList} from '~/composables/useCalendarEvents'
import type {DateValue} from '@internationalized/date'
import {LEGEND_KIND, type CalendarLegendItem} from '~/components/calendar/CalendarLegend.vue'

interface Props {
  seasonDates: DateRange
  teams: CookingTeamDisplay[]
  seasonTeams: CookingTeamDisplay[] // The season's full team list: the number fallback for a team whose name carries none
  dinnerEvents: DinnerEventDisplay[]
  holidays?: DateRange[]
}

const props = withDefaults(defineProps<Props>(), {
  holidays: () => []
})

const {createEventList} = useCalendarEvents()
const {getHolidayDatesFromDateRangeList} = useSeason()
const {CALENDAR, COMPONENTS, dayCircleClasses, getRainbowBand, SIZES} = useTheSlopeDesignSystem()
const {getTeamNumber} = useCookingTeam()
const teamBandIndex = (team: CookingTeamDisplay) => getTeamNumber(team, props.seasonTeams) - 1

// Legend: each team wears the rainbow stop of its number, then the holiday ring when the season has holidays
const legendItems = computed((): CalendarLegendItem[] => [
  ...props.teams.map(team => ({label: team.name, kind: LEGEND_KIND.badge, badgeClass: getRainbowBand(teamBandIndex(team))})),
  ...(props.holidays && props.holidays.length > 0
    ? [{label: 'Ferie', kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CALENDAR.holiday)}]
    : [])
])

// Expand holiday ranges into individual dates
const holidayDates = computed(() => {
  if (!props.holidays || props.holidays.length === 0) return []
  return getHolidayDatesFromDateRangeList(props.holidays)
})

// Transform team assignments into event lists (one per team for color coding)
const teamEventLists = computed(() => {
  return props.teams.map(team => {
    // Filter events for this team
    const teamEvents = props.dinnerEvents
      .filter(event => event.cookingTeamId === team.id)
      .map(event => event.date)

    return createEventList(teamEvents, `team-${team.id}`, RENDER_STYLE.badge, {
      label: team.name,
      band: teamBandIndex(team),
      metadata: { teamId: team.id, teamName: team.name }
    })
  })
})

// Check if a day is a holiday using isCalendarDateInDateList
const isHoliday = (day: DateValue): boolean => {
  return isCalendarDateInDateList(day, holidayDates.value)
}

// The day's team list: the tooltip names the team, the badge wears its band
const getTeamEventList = (eventLists: DayEventList[]) => eventLists.find(list => list.listId.startsWith('team-'))

const teamBandOf = (eventLists: DayEventList[]) => {
  const band = getTeamEventList(eventLists)?.band
  return band === undefined ? undefined : getRainbowBand(band)
}
</script>

<template>
  <BaseCalendar :season-dates="seasonDates" :event-lists="teamEventLists">
        <template #day="{ day, eventLists }">
          <!-- Holiday takes precedence (green ring) -->
          <div
            v-if="isHoliday(day)"
            :class="dayCircleClasses(CALENDAR.holiday)"
          >
            {{ day.day }}
          </div>

          <!-- Team cooking day with tooltip -->
          <UTooltip
            v-else-if="getTeamEventList(eventLists)"
            :text="getTeamEventList(eventLists)?.events[0]?.label"
          >
            <UBadge
              :size="SIZES.md"
              data-testid="team-calendar-day"
              :class="teamBandOf(eventLists)"
            >
              {{ day.day }}
            </UBadge>
          </UTooltip>

          <!-- Regular day -->
          <span v-else :class="COMPONENTS.teamCalendar.plainDay">{{ day.day }}</span>
        </template>

        <!-- Legend -->
        <template #legend>
          <CalendarLegend :items="legendItems" />
        </template>
  </BaseCalendar>
</template>
