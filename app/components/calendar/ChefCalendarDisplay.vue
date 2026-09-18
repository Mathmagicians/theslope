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
 * │           [AGENDA] [KALENDER] ← View Toggle                  │
 * ├──────────────────────────────────────────────────────────────┤
 * │  CALENDAR VIEW                                               │
 * │  ┌────────────────────────────────────────┐                  │
 * │  │  M   T   O   T   F   L   S             │                  │
 * │  │  8   9  10  11  12  13  14             │                  │
 * │  │ 15 ⭕16 ⭕18  19  20  21  22            │                  │
 * │  │     🔴  🟡                              │  ← Rings        │
 * │  │ 22 ⭕25  26  27  28  29  30             │                  │
 * │  └────────────────────────────────────────┘                  │
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
 * - Visual continuity: Same colored circles + chips in both views
 *
 * Features:
 * - Countdown timer (train station style) to next cooking
 * - Temporal states (next/future/past) with ocean color palette
 * - Deadline rings (red critical, yellow warning, green ok)
 * - Deadline badges in agenda (specific deadline types with time)
 * - Calendar + Agenda views with identical visual language
 * - NO holidays (chef cares about cooking schedule, not vacation)
 *
 * Uses:
 * - BaseCalendar for calendar structure
 * - useTemporalCalendar for shared temporal/countdown logic
 * - CHEF_CALENDAR design system for consistent ocean palette
 * - DEADLINE_BADGES for urgency indicators
 */
import type {DateRange} from '~/types/dateTypes'
import type {DateValue} from '@internationalized/date'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {DayEventList} from '~/composables/useCalendarEvents'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'
import {toDate} from '~/utils/date'
import {getPaginationRowModel} from '@tanstack/vue-table'

interface Props {
  seasonDates: DateRange
  team: CookingTeamDisplay
  dinnerEvents: DinnerEventDisplay[]
  deadlines: SeasonDeadlines
  selectedDinnerId?: number | null
  showSelection?: boolean
  viewMode: 'agenda' | 'calendar'
  accordionOpen: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedDinnerId: null,
  showSelection: false
})

const emit = defineEmits<{
  select: [dinnerId: number]
  'tab-click': [mode: 'agenda' | 'calendar']
  'update:accordion-open': [open: boolean]
}>()

const {useTemporalSplit, createTemporalEventLists} = useTemporalCalendar()
const {sortDinnerEventsByTemporal} = useSeason()
const {getChefDeadlineAlarm} = useBooking()
const {CALENDAR, CHEF_CALENDAR, TYPOGRAPHY, SIZES, PAGINATION, COMPONENTS, TEXT, URGENCY_TO_CHIP_COLOR, dayCircleClasses} = useTheSlopeDesignSystem()
const {DinnerStateSchema} = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Selected dinner for detail display
const selectedDinner = computed(() => props.dinnerEvents.find(e => e.id === props.selectedDinnerId))

// View state with horizontal tabs
// Both viewMode and accordionOpen are one-way props to prevent race conditions
// Changes emit via events for atomic updates in parent
const viewTabs = [
  { label: 'Agenda', value: 'agenda', icon: 'i-heroicons-list-bullet' },
  { label: 'Kalender', value: 'calendar', icon: 'i-heroicons-calendar' }
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
const focusDate = computed(() => {
  // Priority: selected dinner > next dinner > first dinner in list
  if (selectedDinner.value) return new Date(selectedDinner.value.date)
  if (nextDinner.value) return new Date(nextDinner.value.date)
  if (props.dinnerEvents.length > 0) return new Date(props.dinnerEvents[0]!.date)
  return null
})

// Create event lists with ocean color (professional chef palette)
const allEventLists = computed(() =>
  createTemporalEventLists(
    pastDinnerDates.value,
    futureDinnerDates.value,
    nextDinner.value,
    'ocean'
  )
)

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

// Selection support
const handleDateClick = (day: DateValue) => {
  if (!props.showSelection) return
  const dinner = getDinnerForDay(day)
  if (dinner) emit('select', dinner.id)
}

const getDinnerForDay = (day: DateValue): DinnerEventDisplay | undefined => {
  const dayDate = toDate(day)
  return props.dinnerEvents.find(event =>
    dayDate.toDateString() === new Date(event.date).toDateString()
  )
}

const isCancelledDay = (day: DateValue): boolean => {
  const dinner = getDinnerForDay(day)
  return dinner?.state === DinnerState.CANCELLED
}

const isSelected = (day: DateValue): boolean => {
  if (!props.selectedDinnerId || !props.showSelection) return false
  const dinner = getDinnerForDay(day)
  return dinner?.id === props.selectedDinnerId
}

// Agenda view - temporal order: next (today), future, past
// Each event has temporalCategory ('next' | 'future' | 'past') attached
const sortedDinnerEvents = computed(() =>
  sortDinnerEventsByTemporal(props.dinnerEvents, nextDinnerDateRange.value)
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
  const dinner = getDinnerForDay(day)
  if (!dinner) return -1
  return getChefDeadlineAlarm(dinner, props.deadlines)
}

// Legend items using design system classes
const legendItems = computed(() => [
  {
    label: 'Næste madlavning',
    type: 'circle' as const,
    circleClass: dayCircleClasses(CHEF_CALENDAR.day.next)
  },
  {
    label: 'Valgt dato',
    type: 'circle' as const,
    circleClass: dayCircleClasses(CHEF_CALENDAR.day.next, CHEF_CALENDAR.selection)
  },
  {
    label: 'Planlagt madlavning',
    type: 'circle' as const,
    circleClass: dayCircleClasses(CHEF_CALENDAR.day.future)
  },
  {
    label: 'Tidligere madlavning',
    type: 'circle' as const,
    circleClass: dayCircleClasses(CALENDAR.day.past)
  },
  {
    label: 'Deadline overskredet',
    type: 'chip' as const,
    chipColor: 'neutral'
  },
  {
    label: 'Deadline kritisk (<24t)',
    type: 'chip' as const,
    chipColor: URGENCY_TO_CHIP_COLOR[2]
  },
  {
    label: 'Deadline snart (24-72t)',
    type: 'chip' as const,
    chipColor: URGENCY_TO_CHIP_COLOR[1]
  },
  {
    label: 'Aflyst madlavning',
    type: 'circle' as const,
    circleClass: dayCircleClasses(CALENDAR.day.past, 'line-through')
  }
])

// Accordion bridge: convert boolean prop to UAccordion's string value model
// UAccordion uses '0' = first item open, undefined = all closed
const accordionItems = [{ slot: 'calendar-content', value: '0' }]
const accordionValue = computed({
  get: () => accordionOpen.value ? '0' : undefined,
  set: (v) => {
    // When UAccordion changes, emit event to parent
    emit('update:accordion-open', v === '0')
  }
})

// Handle tab click - emit to parent which will set mode AND open accordion
const handleTabClick = (mode: 'agenda' | 'calendar') => {
  emit('tab-click', mode)
}

</script>

<template>
  <div class="flex flex-col h-full">
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

    <!-- Accordion wraps both view toggle and content (collapsed on mobile, open on desktop) -->
    <UAccordion v-model="accordionValue" :items="accordionItems" class="flex-1">
      <!-- Custom leading slot: tabs instead of label -->
      <template #leading>
        <!-- Tab click always emits to parent for atomic state update -->
        <UTabs
          :model-value="viewMode"
          :items="viewTabs"
          orientation="horizontal"
          variant="link"
          @update:model-value="(m) => handleTabClick(m as 'agenda' | 'calendar')"
        />
      </template>

      <template #calendar-content>

        <!-- Agenda View (UTable + UPagination) -->
        <div v-if="viewMode === 'agenda'" class="flex-1 flex flex-col overflow-x-hidden">
          <UTable
            ref="agendaTable"
            v-model:pagination="agendaPagination"
            :columns="agendaColumns"
            :data="sortedDinnerEvents"
            :ui="{
              ...COMPONENTS.table.ui,
              th: 'border-b-0',
              td: 'py-1 md:py-2 max-w-0 w-full',
              base: 'table-fixed w-full'
            }"
            :pagination-options="{
              getPaginationRowModel: getPaginationRowModel()
            }"
          >
            <!-- Custom header: title + pagination -->
            <template #dinner-header>
              <div class="flex items-center justify-between w-full">
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
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <UIcon name="i-heroicons-calendar" :class="['w-8 h-8', TEXT.gray[400]]"/>
                <p :class="[TYPOGRAPHY.bodyTextSmall, TEXT.gray[500]]">Ingen fællesspisninger planlagt for dette hold</p>
              </div>
            </template>
          </UTable>
        </div>

        <!-- Calendar View -->
        <div v-else class="flex-1">
          <BaseCalendar :season-dates="seasonDates" :event-lists="allEventLists" :number-of-months="1" :focus-date="focusDate">
            <template #day="{ day, eventLists }">
              <!-- Deadline chip for warning/critical (alarm 1, 2, 3) - only for non-past, non-cancelled -->
              <!-- Chip wraps styled circle (same pattern as DinnerCalendarDisplay) -->
              <UChip
                v-if="getDayType(eventLists) && getDayType(eventLists) !== 'past' && !isCancelledDay(day) && URGENCY_TO_CHIP_COLOR[getAlarmForDay(day)]"
                show
                size="md"
                :color="URGENCY_TO_CHIP_COLOR[getAlarmForDay(day)]!"
              >
                <div
                  :data-testid="`calendar-dinner-date-${day.day}`"
                  :class="dayCircleClasses(getDayColorClass(getDayType(eventLists)!), isSelected(day) && CHEF_CALENDAR.selection)"
                  @click="handleDateClick(day)"
                >
                  {{ day.day }}
                </div>
              </UChip>

              <!-- Regular day circle (on-track, past, or cancelled) -->
              <div
                v-else-if="getDayType(eventLists)"
                :data-testid="`calendar-dinner-date-${day.day}`"
                :class="dayCircleClasses(
                  isCancelledDay(day) ? `${CALENDAR.day.past} line-through` : getDayColorClass(getDayType(eventLists)!),
                  isSelected(day) && CHEF_CALENDAR.selection
                )"
                @click="handleDateClick(day)"
              >
                {{ day.day }}
              </div>

              <!-- Non-dinner day -->
              <span v-else class="text-sm">{{ day.day }}</span>
            </template>

            <!-- Legend -->
            <template #legend>
              <div class="px-4 py-6 md:px-6 md:py-8 space-y-3 border-t mt-auto" :class="TYPOGRAPHY.bodyTextSmall">
                <div v-for="legendItem in legendItems" :key="legendItem.label" class="flex items-center gap-4">
                  <!-- Chip for deadline indicators (wraps styled circle like calendar) -->
                  <UChip v-if="legendItem.type === 'chip'" show size="md" :color="legendItem.chipColor as NuxtUIColor">
                    <div :class="dayCircleClasses(CHEF_CALENDAR.day.future)">1</div>
                  </UChip>
                  <!-- Circle for other indicators -->
                  <div v-else :class="legendItem.circleClass">
                    1
                  </div>
                  <span>{{ legendItem.label }}</span>
                </div>
              </div>
            </template>
          </BaseCalendar>
        </div>
      </template>
    </UAccordion>
  </div>
</template>
