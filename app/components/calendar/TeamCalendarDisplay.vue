<script setup lang="ts">
/**
 * TeamCalendarDisplay - Displays cooking team assignments with calendar/agenda views
 *
 * Features:
 * - Calendar view: Shows team assignments on calendar with colored badges
 * - Agenda view: Shows dinner events in table with pagination, sorting, filtering
 * - View toggle: Horizontal tabs to switch between views
 * - Selection support: Click to select dinner event (optional via emit)
 * - Responsive: Adapts pagination and display based on screen size
 *
 * Uses BaseCalendar for calendar view and UTable for agenda view.
 * Tanstack Table API for pagination management.
 *
 * Used in:
 * - /admin/teams (view mode - no selection)
 * - /chef/index (selection mode - emit select events)
 */
import type {DateRange} from '~/types/dateTypes'
import type {CookingTeam} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type{DayEventList} from '~/composables/useCalendarEvents'
import type {DateValue} from '@internationalized/date'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { isSameDay } from 'date-fns'
// formatDate is auto-imported from ~/utils/date

interface Props {
  seasonDates: DateRange
  teams: CookingTeam[]
  dinnerEvents: DinnerEventDisplay[]
  holidays?: DateRange[]
  selectedDinnerId?: number | null // For chef page selection
  showSelection?: boolean // Enable selection mode
}

const props = withDefaults(defineProps<Props>(), {
  selectedDinnerId: null,
  showSelection: false
})

const emit = defineEmits<{
  select: [dinnerId: number]
}>()

const {getTeamColor} = useCookingTeam()
const {createEventList} = useCalendarEvents()
const {getHolidayDatesFromDateRangeList} = useSeason()
const { COLOR, ICONS, SIZES, DINNER_STATE_BADGES, PAGINATION } = useTheSlopeDesignSystem()

// View state with horizontal tabs
const viewTabs = [
  { label: 'Agenda', value: 'agenda', icon: 'i-heroicons-list-bullet' },
  { label: 'Kalender', value: 'calendar', icon: 'i-heroicons-calendar' }
]
const selectedViewIndex = ref(0)
const viewMode = computed(() => viewTabs[selectedViewIndex.value].value as 'agenda' | 'calendar')

// Validation schemas
const { DinnerStateSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// State badge configuration (from design system)
const getStateBadge = (state: string) => {
  return DINNER_STATE_BADGES[state as keyof typeof DINNER_STATE_BADGES] || DINNER_STATE_BADGES.SCHEDULED
}

// Agenda view - sorted dinner events
const sortedDinnerEvents = computed(() => {
  return [...props.dinnerEvents].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
})

// Pagination (Tanstack Table API)
const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})

const table = useTemplateRef('table')

// Table columns for agenda view
const columns = [
  {
    accessorKey: 'date',
    header: 'Dato',
    enableSorting: false
  },
  {
    accessorKey: 'state',
    header: '',
    enableSorting: false
  },
  {
    accessorKey: 'team',
    header: 'Madhold',
    enableSorting: false
  }
]

// Get team for dinner event
const getTeamForEvent = (event: DinnerEventDisplay) => {
  return props.teams.find(t => t.id === event.cookingTeamId)
}

// Row selection (UTable v-model)
const selectedRows = ref<DinnerEventDisplay[]>([])

// Sync external selectedDinnerId prop with internal selection
watch(() => props.selectedDinnerId, (newId) => {
  if (newId !== null && newId !== undefined) {
    const dinner = sortedDinnerEvents.value.find(d => d.id === newId)
    selectedRows.value = dinner ? [dinner] : []
  } else {
    selectedRows.value = []
  }
}, { immediate: true })

// Handle row selection (UTable @select event)
const handleRowSelect = (row: DinnerEventDisplay) => {
  if (props.showSelection) {
    emit('select', row.id)
  }
}

// ========================================
// Calendar view logic (existing)
// ========================================

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
  <div class="space-y-4">
    <!-- View tabs (horizontal orientation on both mobile and desktop) -->
    <UTabs
      v-model="selectedViewIndex"
      :items="viewTabs"
      orientation="horizontal"
      variant="link"
      :size="SIZES.standard.value"
    />

    <!-- Agenda view -->
    <div v-if="viewMode === 'agenda'" class="space-y-4">
      <!-- Pagination controls -->
      <div class="flex justify-end">
        <UPagination
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          :size="SIZES.small.value"
          :sibling-count="PAGINATION.siblingCount.value"
          @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>

      <!-- Table -->
      <UTable
        ref="table"
        v-model="selectedRows"
        v-model:pagination="pagination"
        :columns="columns"
        :data="sortedDinnerEvents"
        :single-select="true"
        :pagination-options="{
          getPaginationRowModel: getPaginationRowModel()
        }"
        :ui="{
          tbody: 'divide-y divide-gray-200 dark:divide-gray-800'
        }"
        @select="handleRowSelect"
      >
        <!-- Date column -->
        <template #date-cell="{ row }">
          <div class="flex items-center gap-2">
            <UIcon :name="ICONS.calendar" class="text-gray-500" />
            <span class="font-medium">{{ formatDate(row.original.date) }}</span>
          </div>
        </template>

        <!-- State column (color indicator only) -->
        <template #state-cell="{ row }">
          <div class="flex items-center justify-center">
            <UBadge
              :color="getStateBadge(row.original.state).color"
              variant="solid"
              :size="SIZES.small.value"
              class="w-3 h-3 p-0 min-w-0"
            />
          </div>
        </template>

        <!-- Team column -->
        <template #team-cell="{ row }">
          <UBadge
            v-if="getTeamForEvent(row.original)"
            :color="getTeamColor(teams.findIndex(t => t.id === row.original.cookingTeamId))"
            variant="soft"
            :size="SIZES.small.value"
          >
            {{ getTeamForEvent(row.original)?.name }}
          </UBadge>
          <span v-else class="text-gray-500 italic text-sm">Ikke tildelt</span>
        </template>

        <!-- Empty state -->
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-6 gap-3">
            <UIcon name="i-heroicons-calendar-days" class="w-8 h-8 text-gray-400"/>
            <p class="text-sm text-gray-500">Ingen fællesspisninger i denne sæson</p>
          </div>
        </template>
      </UTable>
    </div>

    <!-- Calendar view -->
    <div v-else-if="viewMode === 'calendar'">
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
      </BaseCalendar>
    </div>
  </div>
</template>
