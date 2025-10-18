<script setup lang="ts">
/**
 * TeamCalendarDisplay - Displays cooking team assignments on a calendar
 *
 * Shows which team is assigned to cook on each date using colored circles.
 * Each team gets a distinct color, and hovering shows the team name in a tooltip.
 *
 * This component is purpose-built for team assignment visualization and differs from
 * CalendarDisplay which is designed for season planning (showing potential vs actual cooking days).
 */
import type {DateRange} from '~/types/dateTypes'
import type {CookingTeam} from '~/composables/useCookingTeamValidation'
import type {DinnerEvent} from '~/composables/useDinnerEventValidation'
import type {DateValue} from "@internationalized/date"
import {isCalendarDateInDateList, eachDayOfManyIntervals, toCalendarDate, toCalendarDateRange, translateToDanish, formatDate} from "~/utils/date"

interface Props {
  seasonDates: DateRange
  teams: CookingTeam[]
  dinnerEvents: DinnerEvent[]
  holidays?: DateRange[]
}

const props = defineProps<Props>()
const {getTeamColor} = useCookingTeam()

// Map dinner events to dates with team information for efficient lookup
const eventsByDate = computed(() => {
  const map = new Map<string, {teamId: number, teamName: string, colorIndex: number}>()

  props.dinnerEvents.forEach(event => {
    if (!event.cookingTeamId) return

    const team = props.teams.find(t => t.id === event.cookingTeamId)
    if (!team) return

    const dateKey = formatDate(event.date)
    const teamIndex = props.teams.findIndex(t => t.id === team.id)

    map.set(dateKey, {
      teamId: team.id!,
      teamName: team.name,
      colorIndex: teamIndex
    })
  })

  return map
})

const getEventForDay = (day: DateValue) => {
  // Convert CalendarDate to JS Date, then use formatDate for consistency
  const jsDate = new Date(day.year, day.month - 1, day.day)
  const dateKey = formatDate(jsDate)
  return eventsByDate.value.get(dateKey)
}

const isHoliday = (day: DateValue): boolean => {
  if (!props.holidays?.length) return false
  const allHolidays = eachDayOfManyIntervals(props.holidays)
  return isCalendarDateInDateList(day, allHolidays)
}

const isMd = inject<Ref<boolean>>('isMd')
const getIsMd = computed((): boolean => isMd?.value ?? false)

// Custom UI to hide days outside current month
const calendarUi = {
  cellTrigger: 'data-[outside-view]:hidden'
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">Holdkalender</h3>
    <UCalendar
        :size="getIsMd ? 'xl': 'sm'"
        :number-of-months="getIsMd ? 3: 1"
        :min-value="toCalendarDateRange(seasonDates).start"
        :max-value="toCalendarDateRange(seasonDates).end"
        :week-starts-on="1"
        :fixed-weeks="false"
        :disable-days-outside-current-view="true"
        :ui="calendarUi"
        weekday-format="short"
        readonly
    >
      <template #day="{ day }">
        <!-- Holiday takes precedence -->
        <UChip v-if="isHoliday(day)" show size="md" color="success">
          {{ day.day }}
        </UChip>

        <!-- Team cooking day with tooltip -->
        <UTooltip
            v-else-if="getEventForDay(day)"
            :text="getEventForDay(day)!.teamName"
        >
          <UBadge
              :color="getTeamColor(getEventForDay(day)!.colorIndex)"
              variant="solid"
              size="md"
          >
            {{ day.day }}
          </UBadge>
        </UTooltip>

        <!-- Regular day -->
        <span v-else class="text-sm">{{ day.day }}</span>
      </template>

      <template #week-day="{ day }">
        <span class="text-sm text-muted uppercase">
          {{ translateToDanish(day) }}
        </span>
      </template>
    </UCalendar>
  </div>
</template>