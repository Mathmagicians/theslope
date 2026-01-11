<script setup lang="ts">
/**
 * BookingGridView - Unified week/month grid for household booking management
 *
 * ADR-016: Draft state pattern with Cancel/Save
 * @see HouseholdCard.vue for synthetic row pattern (power mode)
 *
 * VIEW MODE:
 * ┌──────────┬───────┬──────┬──────╫──────┬──────╫──────┐
 * │ Beboer   │ Antal │ Ti 7 │ To 9 ║Ti 14 │To 16 ║Ti 21 │
 * ├──────────┼───────┼──────┼──────╫──────┼──────╫──────┤
 * │ Anna     │   4   │  🍽️  │ 📤❌ ║  🛍️  │  🍽️  ║ 🎟️🍽️│
 * │ Lars     │   3   │  🍽️  │  🕐  ║  🍽️  │  ❌  ║  🍽️  │
 * │ 🎫 Gæst  │   1   │  🍽️  │      ║      │      ║      │
 * └──────────┴───────┴──────┴──────╨──────┴──────╨──────┘
 *
 * EDIT MODE:
 * ┌──────────┬───────┬──────┬──────╫──────┬──────╫──────┐
 * │ Beboer   │ Antal │ Ti 7 │ To 9 ║Ti 14 │To 16 ║Ti 21 │
 * ├──────────┼───────┼──────┼──────╫──────┼──────╫──────┤
 * │⚡Alle    │       │  🍽️  │  🍽️  ║  🛍️  │  🍽️  ║  🍽️  │ <- POWER ROW
 * │ Anna     │   4   │  🍽️° │  🍽️  ║  🛍️° │  🍽️  ║  🍽️  │ °= modified
 * │ Lars     │   3   │  🍽️  │  🕐° ║  🍽️  │  ❌  ║  🍽️  │
 * │➕Gæst    │       │  +   │  +   ║  +   │  +   ║  +   │ <- ADD GUEST
 * │ 🎫 Gæst  │   1   │  🍽️  │      ║      │      ║      │
 * ├──────────┴───────┴──────┴──────╨──────┴──────╨──────┤
 * │ 3 ændringer              [Annuller] [Gem]           │ <- PINNED FOOTER
 * └─────────────────────────────────────────────────────┘
 *
 * Cell states: 🍽️=eating, 📤=released, 🎟️=claimed, °=modified
 */
import type {HouseholdDetail, InhabitantDisplay} from '~/composables/useCoreValidation'
import type {DinnerEventDisplay, OrderDisplay, DinnerMode} from '~/composables/useBookingValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {SeasonDeadlines} from '~/composables/useSeason'
import type {BookingView} from '~/composables/useBookingView'
import type {DateRange} from '~/types/dateTypes'
import {FORM_MODES, type FormMode} from '~/types/form'

// Row types for synthetic rows (same pattern as HouseholdCard)
type RowType = 'power' | 'inhabitant'

interface GridRow {
  rowType: RowType
  id: number | string
  name: string
  inhabitant?: InhabitantDisplay
  inhabitants?: InhabitantDisplay[] // For power mode
  isSynthetic: boolean
}

interface Props {
  view: BookingView
  dateRange: DateRange
  household: HouseholdDetail
  dinnerEvents: DinnerEventDisplay[]
  orders: OrderDisplay[]
  ticketPrices: TicketPrice[]
  deadlines: SeasonDeadlines
  formMode?: FormMode
}

const props = withDefaults(defineProps<Props>(), {
  formMode: FORM_MODES.VIEW
})

const emit = defineEmits<{
  save: [changes: { inhabitantId: number, dinnerEventId: number, dinnerMode: DinnerMode }[]]
  cancel: []
}>()

// Design system
const {ICONS, COLOR, SIZES, COMPONENTS, getRandomEmptyMessage} = useTheSlopeDesignSystem()
const emptyState = getRandomEmptyMessage('noDinners')

// Validation schemas
const {DinnerModeSchema} = useBookingValidation()
const DinnerModeEnum = DinnerModeSchema.enum

// ============================================================================
// DRAFT STATE (ADR-016)
// ============================================================================

const draftChanges = ref<Map<string, DinnerMode>>(new Map())
const hasPendingChanges = computed(() => draftChanges.value.size > 0)
const pendingChangeCount = computed(() => draftChanges.value.size)

const getServerMode = (inhabitantId: number, eventId: number): DinnerMode =>
  props.orders.find(o => o.inhabitantId === inhabitantId && o.dinnerEventId === eventId)?.dinnerMode ?? DinnerModeEnum.NONE

const getCellMode = (inhabitantId: number, eventId: number): DinnerMode => {
  const key = `${inhabitantId}-${eventId}`
  return draftChanges.value.get(key) ?? getServerMode(inhabitantId, eventId)
}

const isCellModified = (inhabitantId: number, eventId: number): boolean =>
  draftChanges.value.has(`${inhabitantId}-${eventId}`)

const handleCellUpdate = (inhabitantId: number, eventId: number, newMode: DinnerMode) => {
  const key = `${inhabitantId}-${eventId}`
  const serverMode = getServerMode(inhabitantId, eventId)
  if (newMode === serverMode) {
    draftChanges.value.delete(key)
  } else {
    draftChanges.value.set(key, newMode)
  }
}

const handlePowerUpdate = (eventId: number, newMode: DinnerMode) => {
  props.household.inhabitants.forEach(inhabitant => {
    handleCellUpdate(inhabitant.id, eventId, newMode)
  })
}

const handleCancel = () => {
  draftChanges.value.clear()
  emit('cancel')
}

const handleSave = () => {
  const changes = Array.from(draftChanges.value.entries()).map(([key, dinnerMode]) => {
    const [inhabitantId, dinnerEventId] = key.split('-').map(Number)
    return { inhabitantId: inhabitantId!, dinnerEventId: dinnerEventId!, dinnerMode }
  })
  emit('save', changes)
  draftChanges.value.clear()
}

// ============================================================================
// COMPUTED: Dinner events grouped by week
// ============================================================================

const eventsByWeek = computed(() => {
  if (props.dinnerEvents.length === 0) return []
  return getEventsForGridView(props.dinnerEvents, props.dateRange)
})

const flatEvents = computed(() => eventsByWeek.value.flat())

// ============================================================================
// COMPUTED: Dynamic columns (fixed + dinner events)
// ============================================================================

const columns = computed(() => {
  const fixedColumns = [
    {id: 'name', header: 'Beboer', size: 150},
    {id: 'count', header: 'Antal', size: 60}
  ]

  // Dynamic columns for each dinner event
  const eventColumns = flatEvents.value.map((event, idx) => ({
    id: `event-${event.id}`,
    header: formatDanishWeekdayDate(new Date(event.date)),
    size: 50,
    meta: {
      eventId: event.id,
      isWeekBoundary: isFirstEventOfWeek(event, idx)
    }
  }))

  return [...fixedColumns, ...eventColumns]
})

// Column pinning - fixed columns on left
const columnPinning = ref({
  left: ['name', 'count'],
  right: [] as string[]
})

// ============================================================================
// COMPUTED: Table rows (synthetic power row + inhabitants)
// ============================================================================

const tableData = computed((): GridRow[] => {
  const inhabitants = props.household.inhabitants

  const inhabitantRows: GridRow[] = inhabitants.map(inhabitant => ({
    rowType: 'inhabitant' as RowType,
    id: inhabitant.id,
    name: inhabitant.name,
    inhabitant,
    isSynthetic: false
  }))

  // VIEW mode: just inhabitants
  if (props.formMode === FORM_MODES.VIEW) return inhabitantRows

  // EDIT mode: power row + inhabitants
  const powerRow: GridRow = {
    rowType: 'power',
    id: 'power-mode',
    name: 'Alle',
    inhabitants,
    isSynthetic: true
  }

  return [powerRow, ...inhabitantRows]
})

// ============================================================================
// HELPERS
// ============================================================================

const getOrderForCell = (inhabitantId: number, eventId: number): OrderDisplay | undefined =>
  props.orders.find(o => o.inhabitantId === inhabitantId && o.dinnerEventId === eventId)

const getDinnerModeForCell = (inhabitantId: number, eventId: number): DinnerMode =>
  getOrderForCell(inhabitantId, eventId)?.dinnerMode ?? DinnerModeEnum.NONE

const getMealCountForInhabitant = (inhabitantId: number): number => {
  return props.orders.filter(o =>
    o.inhabitantId === inhabitantId &&
    o.dinnerMode !== DinnerModeEnum.NONE
  ).length
}

const isFirstEventOfWeek = (event: DinnerEventDisplay, idx: number): boolean => {
  if (idx === 0) return false
  const weekIndex = eventsByWeek.value.findIndex(week => week.some(e => e.id === event.id))
  return eventsByWeek.value[weekIndex]?.[0]?.id === event.id
}
</script>

<template>
  <div data-testid="booking-grid-view">
    <UTable
      sticky
      :data="tableData"
      :columns="columns"
      v-model:column-pinning="columnPinning"
      row-key="id"
      :ui="{
        tbody: '[&_tr:first-child]:bg-warning/10',
        th: 'px-1 py-1 md:px-2 md:py-2',
        td: 'px-1 py-1 md:px-2',
        tfoot: 'sticky bottom-0 bg-default'
      }"
    >
      <!-- Empty state -->
      <template #empty-state>
        <div class="flex flex-col items-center justify-center py-6 gap-3">
          <UIcon :name="ICONS.calendar" class="w-8 h-8 text-gray-400"/>
          <p class="text-sm text-gray-500">
            {{ view === 'week' ? 'Ingen middage denne uge' : 'Ingen middage denne måned' }}
          </p>
        </div>
      </template>

      <!-- Name column -->
      <template #name-cell="{row}">
        <!-- Power row -->
        <div v-if="row.original.rowType === 'power'" class="flex items-center gap-1">
          <UIcon :name="COMPONENTS.powerMode.buttonIcon" :class="COMPONENTS.powerMode.iconClass" />
          <UserListItem
            v-if="row.original.inhabitants"
            :inhabitants="row.original.inhabitants"
            :show-names="false"
            :link-to-profile="false"
            compact
            label="beboere"
          />
        </div>
        <!-- Inhabitant row -->
        <UserListItem
          v-else-if="row.original.inhabitant"
          :inhabitants="row.original.inhabitant"
          :link-to-profile="false"
          compact
        />
      </template>

      <!-- Count column (meal count) -->
      <template #count-cell="{row}">
        <span v-if="row.original.rowType === 'inhabitant' && row.original.inhabitant" class="text-sm">
          {{ getMealCountForInhabitant(row.original.inhabitant.id) }}
        </span>
      </template>

      <!-- Footer: Cancel/Save buttons (ADR-016) -->
      <template #name-footer>
        <div v-if="formMode === FORM_MODES.EDIT" class="flex items-center gap-2">
          <UBadge v-if="hasPendingChanges" :color="COLOR.warning" variant="soft" :size="SIZES.xs">
            {{ pendingChangeCount }} ændringer
          </UBadge>
          <UButton
            :color="COLOR.neutral"
            variant="ghost"
            :size="SIZES.xs"
            data-testid="grid-cancel"
            @click="handleCancel"
          >
            Annuller
          </UButton>
          <UButton
            :color="COLOR.primary"
            :size="SIZES.xs"
            :disabled="!hasPendingChanges"
            data-testid="grid-save"
            @click="handleSave"
          >
            Gem
          </UButton>
        </div>
      </template>

      <!-- Dynamic event columns -->
      <template v-for="event in flatEvents" :key="event.id" #[`event-${event.id}-cell`]="{row}">
        <!-- Power row -->
        <DinnerModeSelector
          v-if="row.original.rowType === 'power'"
          :model-value="DinnerModeEnum.DINEIN"
          :form-mode="formMode"
          :interaction="formMode === FORM_MODES.EDIT ? 'toggle' : 'buttons'"
          :size="SIZES.xs"
          :name="`power-${event.id}`"
          @update:model-value="(mode: DinnerMode) => handlePowerUpdate(event.id, mode)"
        />
        <!-- Inhabitant row -->
        <DinnerModeSelector
          v-else-if="row.original.inhabitant"
          :model-value="getCellMode(row.original.inhabitant.id, event.id)"
          :form-mode="formMode"
          :interaction="formMode === FORM_MODES.EDIT ? 'toggle' : 'buttons'"
          :size="SIZES.xs"
          :name="`cell-${row.original.inhabitant.id}-${event.id}`"
          :class="{ 'ring-2 ring-warning ring-offset-1': isCellModified(row.original.inhabitant.id, event.id) }"
          @update:model-value="(mode: DinnerMode) => handleCellUpdate(row.original.inhabitant!.id, event.id, mode)"
        />
      </template>
    </UTable>
  </div>
</template>
