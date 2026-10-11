<script setup lang="ts">
/**
 * TicketChanges - Billetændringer: the dinner's ticket changes, newest first, behind a toggle row. Opening it loads the
 * stretch from the menu deadline; one button loads the rest.
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
import {DEADLINE_LABELS} from '~/composables/useBooking'

const props = defineProps<{
  dinnerEventId: number
  since: Date | null
}>()

const {COMPONENTS, BUTTONS, SIZES, ICONS, NOISE, TYPOGRAPHY, ALERTS} = useTheSlopeDesignSystem()
const {TicketTypeSchema} = useBookingValidation()
const {ticketTypeConfig, formatPrice} = useTicket()
const bookingsStore = useBookingsStore()

const open = ref(false)
const showAll = ref(false)

const {data, status, error, execute} = useAsyncData(
  computed(() => `ticket-changes-${props.dinnerEventId}-${showAll.value ? 'all' : props.since?.getTime() ?? 'none'}`),
  () => bookingsStore.fetchTicketChanges(props.dinnerEventId, showAll.value ? undefined : props.since ?? undefined),
  {immediate: false, default: () => null, watch: [showAll]}
)

const toggle = () => {
  open.value = !open.value
  if (open.value && !data.value) execute()
}

const isLoading = computed(() => status.value === 'pending')
const changes = computed(() => data.value?.changes ?? [])
const olderCount = computed(() => data.value?.olderCount ?? 0)

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
    <div :class="COMPONENTS.ticketChanges.toggleRow">
      <h5 :class="COMPONENTS.dinnerBudget.sectionTitle">Billetændringer</h5>
      <UButton
        v-bind="{...BUTTONS.settings, ...BUTTONS.flipOpen(open)}"
        :aria-label="open ? 'Luk billetændringer' : 'Vis billetændringer'"
        data-testid="ticket-changes-toggle"
        @click="toggle"
      />
    </div>

    <template v-if="open">
      <div v-if="isLoading" :class="COMPONENTS.ticketChanges.loading">
        <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.ticketChanges.spinner" />
        <span>Henter...</span>
      </div>
      <UAlert v-else-if="error" v-bind="ALERTS.error" title="Kunne ikke hente billetændringer" />
      <span v-else-if="changes.length === 0 && olderCount === 0" :class="TYPOGRAPHY.finePrint" data-testid="ticket-changes-empty">Ingen historik</span>
      <table v-else :class="COMPONENTS.ticketChanges.table">
        <thead>
          <tr>
            <th :class="COMPONENTS.ticketChanges.th">Dato</th>
            <th :class="COMPONENTS.ticketChanges.th">Husstand</th>
            <th :class="COMPONENTS.ticketChanges.th">Ændring</th>
            <th :class="COMPONENTS.ticketChanges.th">Billetter · kuverter</th>
            <th :class="COMPONENTS.ticketChanges.thRight">Indtægter</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="change in changes" :key="change.id" :class="COMPONENTS.ticketChanges.tr" data-testid="ticket-change">
            <td :class="COMPONENTS.ticketChanges.td">{{ formatMoment(change.timestamp) }}</td>
            <td :class="COMPONENTS.ticketChanges.td">{{ change.householdShortname ?? 'System' }}</td>
            <td :class="COMPONENTS.ticketChanges.td">
              <span :class="COMPONENTS.ticketChanges.chips">
                <span>{{ actionLabel(change) }}</span>
                <UBadge v-for="type in movedTypes(change.delta)" :key="type" :color="chip(type).color" :icon="chip(type).icon" :variant="NOISE.soft" :size="SIZES.small" data-testid="ticket-change-delta">
                  {{ signed(change.delta[type]) }} {{ chip(type).label }}
                </UBadge>
              </span>
            </td>
            <td :class="COMPONENTS.ticketChanges.td">
              <span :class="COMPONENTS.ticketChanges.chips">
                <UBadge v-for="type in heldTypes(change.counts)" :key="type" :color="chip(type).color" :icon="chip(type).icon" :variant="NOISE.soft" :size="SIZES.small">
                  {{ change.counts[type] }}
                </UBadge>
                <span :class="TYPOGRAPHY.finePrint">· {{ formatPortions(change.portions) }} kuverter</span>
              </span>
            </td>
            <td :class="COMPONENTS.ticketChanges.tdRight" data-testid="ticket-change-revenue">{{ formatPrice(change.revenue) }} kr</td>
          </tr>
        </tbody>
      </table>

      <div v-if="!isLoading && !error && since && !showAll" :class="COMPONENTS.ticketChanges.divider" data-testid="ticket-changes-deadline">
        <span :class="COMPONENTS.ticketChanges.dividerLine" />
        <span>{{ formatMoment(since) }} · {{ DEADLINE_LABELS.ANNOUNCED.label }}</span>
        <span :class="COMPONENTS.ticketChanges.dividerLine" />
      </div>
      <div v-if="!isLoading && !error && !showAll && olderCount > 0" :class="COMPONENTS.ticketChanges.moreRow">
        <UButton v-bind="BUTTONS.secondaryAction" :size="SIZES.small" data-testid="ticket-changes-more" @click="showAll = true">
          Vis fuld historik
        </UButton>
      </div>
    </template>
  </div>
</template>
