<script setup lang="ts">
/**
 * TicketChanges - Billetændringer: the dinner's ticket changes, newest first, behind a toggle row. Opening it loads the
 * stretch since Framelding closed; before that moment the newest change stands alone; one button loads the rest.
 *
 *   Billetændringer                                                              [v]
 *   Dato         Husstand  Ændring                      Billetter · kuverter        Indtægter
 *   09/04 19:10  S_14      Købt fra anden  +1 (child) Barn   29 (adult) 11 (child) 3 (baby) · 34,5   1.725 kr
 *   05/04 08:02  S_31      Bestilt         +1 (adult) Voksen 29 (adult) 11 (child) 3 (baby) · 34,5   1.725 kr
 *   ── 03/04 18:00 · Menu ───────────────────────────────────────────────────────────────
 *   [Vis fuld historik]
 *
 * ADR-007: component-local useAsyncData exception - the pane holds its own dinner's history, fetched on open through
 * the bookings store.
 */
import type {TicketChange, TicketCounts} from '~/composables/useBookingValidation'
import type {TableColumn} from '@nuxt/ui'
import {isFuture} from 'date-fns'

const props = defineProps<{
  dinnerEventId: number
  /** The moment Framelding closes; the shown changes start there, and before it the newest change stands alone */
  since: Date | null
}>()

const {COMPONENTS, BUTTONS, SIZES, ICONS, NOISE, TYPOGRAPHY, ALERTS} = useTheSlopeDesignSystem()
const changeColumns: TableColumn<TicketChange>[] = [
  {accessorKey: 'timestamp', header: 'Dato'},
  {accessorKey: 'householdShortname', header: 'Husstand'},
  {id: 'change', header: 'Ændring'},
  {id: 'tickets', header: 'Billetter · kuverter'},
  {accessorKey: 'revenue', header: 'Indtægter', meta: COMPONENTS.table.amountColumn}
]
const {TicketTypeSchema} = useBookingValidation()
const {ticketTypeConfig, formatPrice} = useTicket()
const bookingsStore = useBookingsStore()

const open = ref(false)
const showAll = ref(false)

// Before Framelding closes nothing has moved since that moment, so the history is read whole and the newest change shown
const beforeDeadline = computed(() => props.since !== null && isFuture(props.since))
const windowStart = computed(() => showAll.value || beforeDeadline.value ? undefined : props.since ?? undefined)
const {data, status, error, execute} = useAsyncData(
  computed(() => `ticket-changes-${props.dinnerEventId}-${windowStart.value?.getTime() ?? 'all'}`),
  () => bookingsStore.fetchTicketChanges(props.dinnerEventId, windowStart.value),
  {immediate: false, default: () => null, watch: [showAll]}
)

const toggle = () => {
  open.value = !open.value
  if (open.value && !data.value) execute()
}

const isLoading = computed(() => status.value === 'pending')
const changes = computed(() => data.value?.changes ?? [])
const rows = computed(() => beforeDeadline.value && !showAll.value ? changes.value.slice(0, 1) : changes.value)
// What the full history still holds beyond the rows shown
const moreCount = computed(() => beforeDeadline.value && !showAll.value ? Math.max(changes.value.length - 1, 0) : (data.value?.olderCount ?? 0))

const TICKET_TYPES = [TicketTypeSchema.enum.ADULT, TicketTypeSchema.enum.CHILD, TicketTypeSchema.enum.BABY] as const
type TicketTypeKey = typeof TICKET_TYPES[number]
const chip = (type: TicketTypeKey) => ticketTypeConfig[type]
const movedTypes = (delta: TicketCounts) => TICKET_TYPES.filter(type => delta[type] !== 0)
const heldTypes = (counts: TicketCounts) => TICKET_TYPES.filter(type => counts[type] > 0)
const signed = (count: number) => `${count > 0 ? '+' : ''}${count}`
const actionLabel = (change: TicketChange) => ORDER_ACTION_LABELS[change.action].label
const formatMoment = (date: Date) => formatDate(date, 'dd/MM HH:mm')
</script>

<template>
  <div data-testid="ticket-changes">
    <!-- The same chevron row as the Budget pane's own toggle; folded by default -->
    <button type="button" :class="COMPONENTS.dinnerBudget.toggle" data-testid="ticket-changes-toggle" @click="toggle">
      <h5 :class="[COMPONENTS.dinnerBudget.sectionTitle, COMPONENTS.ticketChanges.title]">
        <UIcon :name="ICONS.clipboard" :class="COMPONENTS.cardSection.glyph" />
        Se billetændringer
      </h5>
      <UIcon :name="open ? ICONS.chevronDown : ICONS.chevronRight" :class="COMPONENTS.dinnerBudget.toggleIcon" />
    </button>

    <template v-if="open">
      <div v-if="isLoading" :class="COMPONENTS.ticketChanges.loading">
        <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.ticketChanges.spinner" />
        <span>Henter...</span>
      </div>
      <UAlert v-else-if="error" v-bind="ALERTS.error" title="Kunne ikke hente billetændringer" />
      <span v-else-if="rows.length === 0 && moreCount === 0" :class="TYPOGRAPHY.finePrint" data-testid="ticket-changes-empty">Ingen historik</span>
      <UTable v-else :data="rows" :columns="changeColumns" :ui="COMPONENTS.table.ui">
        <template #timestamp-cell="{ row }">{{ formatMoment(row.original.timestamp) }}</template>
        <template #householdShortname-cell="{ row }">{{ row.original.householdShortname ?? 'System' }}</template>
        <template #change-cell="{ row }">
          <span :class="COMPONENTS.ticketChanges.chips">
            <span>{{ actionLabel(row.original) }}</span>
            <UBadge v-for="type in movedTypes(row.original.delta)" :key="type" :color="chip(type).color" :variant="NOISE.soft" :size="SIZES.small" data-testid="ticket-change-delta">
              {{ signed(row.original.delta[type]) }} {{ chip(type).compactLabel }}
            </UBadge>
          </span>
        </template>
        <template #tickets-cell="{ row }">
          <span :class="COMPONENTS.ticketChanges.chips">
            <UBadge v-for="type in heldTypes(row.original.counts)" :key="type" :color="chip(type).color" :variant="NOISE.soft" :size="SIZES.small">
              {{ row.original.counts[type] }} {{ chip(type).compactLabel }}
            </UBadge>
            <span :class="TYPOGRAPHY.finePrint">· {{ formatPortions(row.original.portions) }} kuverter</span>
          </span>
        </template>
        <template #revenue-cell="{ row }"><span data-testid="ticket-change-revenue">{{ formatPrice(row.original.revenue) }} kr</span></template>
        <template #empty><span data-testid="ticket-changes-none-since">Ingen ændringer</span></template>
      </UTable>

      <div v-if="!isLoading && !error && since && !showAll" :class="COMPONENTS.ticketChanges.divider" data-testid="ticket-changes-deadline">
        <span :class="COMPONENTS.ticketChanges.dividerLine" />
        <span>Framelding lukker · {{ formatMoment(since) }}</span>
        <span :class="COMPONENTS.ticketChanges.dividerLine" />
      </div>
      <div v-if="!isLoading && !error && !showAll && moreCount > 0" :class="COMPONENTS.ticketChanges.moreRow">
        <UButton v-bind="BUTTONS.secondaryAction" :size="SIZES.small" data-testid="ticket-changes-more" @click="showAll = true">
          Vis fuld historik
        </UButton>
      </div>
    </template>
  </div>
</template>
