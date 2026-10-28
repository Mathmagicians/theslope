<script setup lang="ts">
/**
 * ChefCalendarDisplay - Chef cooking schedule with countdown and deadline tracking
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │           COUNTDOWN TIMER (Train Station Style)              │
 * │  ┌────────────────────────────────────────────────────────┐  │
 * │  │           NÆSTE MADLAVNING                             │  │
 * │  │              LØR 25/01                                 │  │
 * │  │           OM 2T 15M                                    │  │
 * │  │              18:00  ●                                  │  │
 * │  └────────────────────────────────────────────────────────┘  │
 * ├──────────────────────────────────────────────────────────────┤
 * │ [Agenda] [Kalender]                                      [v] │  ← UTabs left, chevron right
 * ├──────────────────────────────────────────────────────────────┤     (BUTTONS.flipOpen, aria-expanded)
 * │  calendar or agenda content                                  │  ← UCollapsible body: opens and
 * ├──────────────────────────────────────────────────────────────┤     closes with the chevron
 * │  CALENDAR VIEW                                               │
 * │  ┌────────────────────────────────────────┐                  │
 * │  │  M   T   O   T   F   L   S             │                  │
 * │  │  8   9  10  11  12  13  14             │                  │
 * │  │ 15 ⭕16 ⭕18  19  20  21  22            │                  │
 * │  │     🔴  🟡                              │  ← Rings        │
 * │  │ 22 ⭕25  26 (27) 28  29  30             │  (27) another   │
 * │  └────────────────────────────────────────┘  team's dinner  │
 * │  Forklaring: … Aflyst madlavning, Andet madholds             │
 * │  fællesspisning (the plain circle)                           │
 * ├──────────────────────────────────────────────────────────────┤
 * │  AGENDA VIEW (Same visual as calendar!)                      │
 * │  ┌────────────────────────────────────────────────────────┐  │
 * │  │ ⭕ 16  Spaghetti Carbonara                             │  │
 * │  │ 🔴    [PLANLAGT]                                       │  │
 * │  │       🔴 Menu (8t) 🟡 Indkøb (36t) ✅ Best. (96t)     │  │
 * │  ├────────────────────────────────────────────────────────┤  │
 * │  │ ⭕ 18  Lasagne Bolognese                               │  │
 * │  │ 🟡    [PLANLAGT]                                       │  │
 * │  │       🟡 Menu (24t) ✅ Indkøb (72t) ✅ Bestilling      │  │
 * │  ├────────────────────────────────────────────────────────┤  │
 * │  │ ⭕ 25  Kylling Curry                                   │  │
 * │  │       [PLANLAGT]                                       │  │
 * │  │       ✅ Menu (96t) ✅ Indkøb (120t) ✅ Bestilling     │  │
 * │  └────────────────────────────────────────────────────────┘  │
 * └──────────────────────────────────────────────────────────────┘
 *
 * Color System (Ocean - Professional Chef):
 * - Ocean blue circles: Next (bold), Future (light), Past (mocha)
 * - Deadline chips: 🔴 Red (critical <24h), 🟡 Yellow (warning 24-72h)
 * - The other teams' dinners: a plain circle (CHEF_CALENDAR.day.otherTeam), calendar view only; a click selects it
 * - Visual continuity: Same colored circles + chips in both views
 *
 * Visual check: /chef calendar view with the other teams' dinners and the legend, phone and desktop, light and dark.
 *
 * Features:
 * - Countdown timer (train station style) to next cooking
 * - Temporal states (next/future/past) with ocean color palette
 * - Deadline rings (red critical, yellow warning, green ok)
 * - Deadline badges in agenda (specific deadline types with time)
 * - Calendar + Agenda views with identical visual language
 * - The header row is no button: the tabs and the chevron are siblings, since a button may not hold a button
 * - NO holidays (chef cares about cooking schedule, not vacation)
 *
 * Uses:
 * - BaseCalendar for calendar structure
 * - useTemporalCalendar for shared temporal/countdown logic, the dinner on a day and whether it is cancelled
 * - CHEF_CALENDAR design system for consistent ocean palette
 * - DEADLINE_BADGES for urgency indicators
 */
import type {DateRange} from '~/types/dateTypes'
import type {DateValue} from '@internationalized/date'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import {LEGEND_KIND, type CalendarLegendItem} from '~/components/calendar/CalendarLegend.vue'
import {TEAM_WORDS} from '~/config/teamWords'
import {DATE_WORDS} from '~/config/dateWords'
import {getPaginationRowModel} from '@tanstack/vue-table'

interface Props {
  seasonDates: DateRange
  team: CookingTeamDisplay
  dinnerEvents: DinnerEventDisplay[]
  otherTeamDinners?: DinnerEventDisplay[]
  deadlines: SeasonDeadlines
  selectedDinnerId?: number | null
  showSelection?: boolean
  viewMode: 'agenda' | 'calendar'
  accordionOpen: boolean
}

const props = withDefaults(defineProps<Props>(), {
  otherTeamDinners: () => [],
  selectedDinnerId: null,
  showSelection: false
})

const emit = defineEmits<{
  select: [dinnerId: number]
  'tab-click': [mode: 'agenda' | 'calendar']
  'update:accordion-open': [open: boolean]
}>()

const {useTemporalSplit, createTemporalEventLists, getDinnerForDay, isCancelledDay} = useTemporalCalendar()
const {createEventList} = useCalendarEvents()
const {sortDinnerEventsByTemporal} = useSeason()
const {getChefDeadlineAlarm} = useBooking()
const now = useClock()
const {CALENDAR, CHEF_CALENDAR, TYPOGRAPHY, SIZES, PAGINATION, COMPONENTS, TEXT, BUTTONS, COLOR, NOISE, ICONS, URGENCY_TO_CHIP_COLOR, dayCircleClasses} = useTheSlopeDesignSystem()

// Selected dinner for detail display
const selectedDinner = computed(() => props.dinnerEvents.find(e => e.id === props.selectedDinnerId))

// View state with horizontal tabs
// Both viewMode and accordionOpen are one-way props to prevent race conditions
// Changes emit via events for atomic updates in parent
const viewTabs = [
  { label: 'Agenda', value: 'agenda', icon: ICONS.agenda },
  { label: 'Kalender', value: 'calendar', icon: ICONS.calendar }
]
const viewMode = toRef(props, 'viewMode')
const accordionOpen = toRef(props, 'accordionOpen')

// Temporal splitting using shared composable
// Pass getter to maintain reactivity when team changes (props.dinnerEvents updates)
const {
  nextDinner,
  pastDinnerDates,
  futureDinnerDates,
  nextDinnerDateRange,
  dinnerStartHour
} = useTemporalSplit(() => props.dinnerEvents)

// Focus date for calendar navigation (selected dinner → next dinner → first dinner)
// Must be after useTemporalSplit since it depends on nextDinner
const focusDate = computed(() => selectedDinner.value?.date ?? nextDinner.value?.date ?? props.dinnerEvents[0]?.date ?? null)

// The team's dinners split into past, next and future; the other teams' dinners carry no temporal state
const OTHER_TEAM_DINNERS = 'other-team-dinners'
const allEventLists = computed(() => [
  ...createTemporalEventLists(
    pastDinnerDates.value,
    futureDinnerDates.value,
    nextDinner.value
  ),
  createEventList(props.otherTeamDinners.map(dinner => dinner.date), OTHER_TEAM_DINNERS)
])

const isOtherTeamDay = (eventLists: DayEventList[]): boolean => eventLists.some(list => list.listId === OTHER_TEAM_DINNERS)

// Day type detection - returns 'next' | 'future' | 'past' | null
type DayType = 'next' | 'future' | 'past'
const getDayType = (eventLists: DayEventList[]): DayType | null => {
  if (eventLists.some(list => list.listId === 'next-dinner')) return 'next'
  if (eventLists.some(list => list.listId === 'future-dinners')) return 'future'
  if (eventLists.some(list => list.listId === 'past-dinners')) return 'past'
  return null
}

// Get day color class (past is shared, next/future are palette-specific)
const getDayColorClass = (type: DayType): string => {
  return type === 'past' ? CALENDAR.day.past : CHEF_CALENDAR.day[type]
}

// Selection support: a day of the team on view, or another team's dinner
const handleDateClick = (day: DateValue) => {
  if (!props.showSelection) return
  const dinner = getDinnerForDay(props.dinnerEvents, day) ?? getDinnerForDay(props.otherTeamDinners, day)
  if (dinner) emit('select', dinner.id)
}

const isSelected = (day: DateValue): boolean => {
  if (!props.selectedDinnerId || !props.showSelection) return false
  const dinner = getDinnerForDay(props.dinnerEvents, day)
  return dinner?.id === props.selectedDinnerId
}

// Agenda view - temporal order: next (today), future, past
// Each event has temporalCategory ('next' | 'future' | 'past') attached
const sortedDinnerEvents = computed(() =>
  sortDinnerEventsByTemporal(props.dinnerEvents, nextDinnerDateRange.value, now.value)
)

// Agenda table configuration (UTable + UPagination pattern from AdminHouseholds)
const agendaTable = useTemplateRef('agendaTable')
const agendaPagination = ref({
  pageIndex: 0,
  pageSize: SIZES.agendaPageSize
})

const agendaColumns = [
  {
    accessorKey: 'dinner',
    header: 'Fællesspisning'
  }
]

// Deadline alarm for day using chef deadline logic (menu + groceries)
const getAlarmForDay = (day: DateValue): -1 | 0 | 1 | 2 | 3 => {
  const dinner = getDinnerForDay(props.dinnerEvents, day)
  if (!dinner) return -1
  return getChefDeadlineAlarm(dinner, props.deadlines, now.value)
}

// The day read once per cell, so the template narrows them: its dinner type, and the deadline chip's colour on an
// upcoming dinner that is not cancelled (null when on track)
const dayCellOf = (day: DateValue, eventLists: DayEventList[]) => {
  const type = getDayType(eventLists)
  const upcoming = type !== null && type !== 'past' && !isCancelledDay(props.dinnerEvents, day)
  return {type, chipColor: upcoming ? URGENCY_TO_CHIP_COLOR[getAlarmForDay(day)] : null}
}

// Legend items: the deadline chips wrap a planned-day circle, as the day cells do
const legendItems = computed((): CalendarLegendItem[] => {
  const chipCircle = dayCircleClasses(CHEF_CALENDAR.day.future)
  const words = TEAM_WORDS.calendarLegend
  return [
    {label: words.next, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CHEF_CALENDAR.day.next)},
    {label: DATE_WORDS.calendarLegend.selected, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CHEF_CALENDAR.day.next, CHEF_CALENDAR.selection)},
    {label: words.planned, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CHEF_CALENDAR.day.future)},
    {label: words.past, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CALENDAR.day.past)},
    {label: words.overdue, kind: LEGEND_KIND.chip, chipColor: URGENCY_TO_CHIP_COLOR[3], circleClass: chipCircle, chipSize: SIZES.md},
    {label: words.critical, kind: LEGEND_KIND.chip, chipColor: URGENCY_TO_CHIP_COLOR[2], circleClass: chipCircle, chipSize: SIZES.md},
    {label: words.soon, kind: LEGEND_KIND.chip, chipColor: URGENCY_TO_CHIP_COLOR[1], circleClass: chipCircle, chipSize: SIZES.md},
    {label: words.cancelled, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CALENDAR.day.past, CALENDAR.day.cancelled)},
    {label: words.otherTeam, kind: LEGEND_KIND.circle, circleClass: dayCircleClasses(CHEF_CALENDAR.day.otherTeam)}
  ]
})

// The parent owns the open state: the chevron asks for the toggled value, a tab click asks for its mode
const toggleOpen = () => emit('update:accordion-open', !accordionOpen.value)
const handleTabClick = (mode: 'agenda' | 'calendar') => emit('tab-click', mode)

</script>

<template>
  <div :class="COMPONENTS.chefCalendar.root">
    <!-- Countdown Timer (Train Station Style) -->
    <CountdownTimer
      data-testid="chef-next-cooking-countdown"
      title="Næste Madlavning"
      time-label="madlavning"
      empty-text="Ingen"
      :next-event="nextDinner"
      :event-start-hour="dinnerStartHour"
      palette="chef"
      clickable
      @select="emit('select', $event)"
    />

    <div :class="COMPONENTS.chefCalendar.header" data-testid="chef-calendar-header">
      <UTabs
        v-bind="COMPONENTS.chefCalendar.viewTabs"
        :model-value="viewMode"
        :items="viewTabs"
        @update:model-value="(m) => handleTabClick(m as 'agenda' | 'calendar')"
      />
      <UButton
        v-bind="BUTTONS.flipOpen(accordionOpen)"
        :color="COLOR.neutral"
        :variant="NOISE.quiet"
        :size="SIZES.standard"
        :aria-label="accordionOpen ? 'Skjul kalender' : 'Vis kalender'"
        data-testid="chef-calendar-toggle"
        @click="toggleOpen"
      />
    </div>

    <UCollapsible v-bind="COMPONENTS.collapsible.chefCalendar" :open="accordionOpen">
      <template #content>
        <!-- Agenda View (UTable + UPagination) -->
        <div v-if="viewMode === 'agenda'" :class="COMPONENTS.chefCalendar.agenda" data-testid="chef-calendar-content">
          <UTable
            ref="agendaTable"
            v-model:pagination="agendaPagination"
            :columns="agendaColumns"
            :data="sortedDinnerEvents"
            :ui="COMPONENTS.table.agendaUi"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel()
            }"
          >
            <!-- Custom header: title + pagination -->
            <template #dinner-header>
              <div :class="COMPONENTS.chefCalendar.agendaHeader">
                <span :class="TYPOGRAPHY.bodyTextSmall">Maddage</span>
                <UPagination
                  v-if="(agendaTable?.tableApi?.getFilteredRowModel().rows.length || 0) > agendaPagination.pageSize"
                  :default-page="(agendaTable?.tableApi?.getState().pagination.pageIndex || 0) + 1"
                  :items-per-page="agendaTable?.tableApi?.getState().pagination.pageSize"
                  :total="agendaTable?.tableApi?.getFilteredRowModel().rows.length"
                  :size="SIZES.small"
                  :sibling-count="PAGINATION.siblingCount.value"
                  @update:page="(p: number) => agendaTable?.tableApi?.setPageIndex(p - 1)"
                />
              </div>
            </template>

            <!-- Custom cell with ChefDinnerCard -->
            <template #dinner-cell="{ row }">
              <ChefDinnerCard
                :dinner-event="row.original"
                :deadlines="deadlines"
                :selected="row.original.id === selectedDinnerId"
                :temporal-category="row.original.temporalCategory"
                @select="emit('select', $event)"
              />
            </template>

            <template #empty>
              <div :class="COMPONENTS.chefCalendar.empty">
                <UIcon :name="ICONS.calendar" :class="[COMPONENTS.chefCalendar.emptyIcon, TEXT.gray[400]]"/>
                <p :class="[TYPOGRAPHY.bodyTextSmall, TEXT.gray[500]]">Ingen fællesspisninger planlagt for dette hold</p>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Calendar View -->
        <div v-else :class="COMPONENTS.chefCalendar.calendar" data-testid="chef-calendar-content">
          <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists" :number-of-months="1" :focus-date="focusDate">
            <template #day="{ day, eventLists }">
              <template v-for="{type, chipColor} in [dayCellOf(day, eventLists)]" :key="day.toString()">
                <!-- Deadline chip for warning/critical (alarm 1, 2, 3) - only for non-past, non-cancelled -->
                <!-- Chip wraps styled circle (same pattern as DinnerCalendarDisplay) -->
                <UChip
                  v-if="type && chipColor"
                  show
                  :size="SIZES.md"
                  :color="chipColor"
                >
                  <div
                    :data-testid="`calendar-dinner-date-${day.day}`"
                    :class="dayCircleClasses(getDayColorClass(type), isSelected(day) && CHEF_CALENDAR.selection)"
                    @click="handleDateClick(day)"
                  >
                    {{ day.day }}
                  </div>
                </UChip>

                <!-- Regular day circle (on-track, past, or cancelled) -->
                <div
                  v-else-if="type"
                  :data-testid="`calendar-dinner-date-${day.day}`"
                  :class="dayCircleClasses(
                    isCancelledDay(dinnerEvents, day) ? `${CALENDAR.day.past} ${CALENDAR.day.cancelled}` : getDayColorClass(type),
                    isSelected(day) && CHEF_CALENDAR.selection
                  )"
                  @click="handleDateClick(day)"
                >
                  {{ day.day }}
                </div>

                <!-- Another team's dinner: a plain circle -->
                <div
                  v-else-if="isOtherTeamDay(eventLists)"
                  :data-testid="`calendar-other-team-dinner-${day.day}`"
                  :class="dayCircleClasses(CHEF_CALENDAR.day.otherTeam)"
                  @click="handleDateClick(day)"
                >
                  {{ day.day }}
                </div>

                <!-- Non-dinner day -->
                <span v-else :class="COMPONENTS.chefCalendar.plainDay">{{ day.day }}</span>
              </template>
            </template>

            <template #legend>
              <CalendarLegend :items="legendItems" />
            </template>
          </BaseCalendar>
        </div>
      </template>
    </UCollapsible>
  </div>
</template>
