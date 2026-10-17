<script setup lang="ts">
/**
 * TicketChanges - Billetændringer: the dinner's ticket changes, newest first, behind a toggle row. Opening it loads the
 * stretch since Framelding closed; before that moment the newest change stands alone; one button loads the rest.
 * A line holds the ticket events of one user, or of the system, within one minute: each event's word with the tickets
 * it touched, then what the dinner is paid for after it.
 *
 *   Se billetændringer                                                                       [v]
 *   Dato              Husstand  Ændring                      Billetter · kuverter     Indtægter
 *   21/10/2026 02:00  System    lukket                       30V 11B 3b · 35,5        2.035 kr
 *   20/10/2026 19:10  S_14      købt 1V fra S_31             30V 11B 3b · 35,5        2.035 kr
 *   20/10/2026 12:40  S_22      ændret billettype 1B → 1V    30V 11B 3b · 35,5        2.035 kr
 *   20/10/2026 09:05  S_31      frigivet 2V                  29V 12B 3b · 35          2.015 kr
 *   ── Framelding lukker · 19/10/2026 18:00 ─────────────────────────────────────────────────
 *   [Vis fuld historik]
 *
 *   A line by one actor within one minute lists its events in the action order; a sale names the household it bought
 *   from, one event per seller:
 *   20/10/2026 12:40  S_31  tilmeldt 1B, frigivet 2V  …
 *   20/10/2026 19:12  S_14  købt 1V 1B fra S_22, købt 1V fra S_32  …
 *
 *   An order deleted after Framelding closed is the admin's correction; the chef's extra portions for the first in
 *   line name the households that receive them:
 *   20/10/2026 21:15  S_22        frameldt, ADMIN korrektion 1B   …
 *   20/10/2026 20:30  S_14, S_22  ekstra tilmeldt 1V 1B  …
 *
 *   While the changes load, the table's loading row (COMPONENTS.table.loadingRow):
 *                                (sync, spinning)  Henter...
 *
 * ADR-007: component-local useAsyncData exception - the pane holds its own dinner's history, fetched on open through
 * the bookings store.
 */
import type {TicketChange} from '~/composables/useBookingValidation'
import type {TableColumn} from '@nuxt/ui'
import {isFuture} from 'date-fns'

const props = defineProps<{
  dinnerEventId: number
  /** The moment Framelding closes; the shown changes start there, and before it the newest change stands alone */
  since: Date | null
}>()

const {COMPONENTS, BUTTONS, SIZES, ICONS, NOISE, COLOR, TYPOGRAPHY, ALERTS, getRandomEmptyMessageText} = useTheSlopeDesignSystem()
const noTicketChanges = getRandomEmptyMessageText('noTicketChanges')
const changeColumns: TableColumn<TicketChange>[] = [
  {accessorKey: 'timestamp', header: 'Dato'},
  {accessorKey: 'households', header: 'Husstand'},
  {id: 'change', header: 'Ændring'},
  {id: 'tickets', header: 'Billetter · kuverter'},
  {accessorKey: 'revenue', header: 'Indtægter', meta: COMPONENTS.table.amountColumn}
]
const {formatPrice} = useTicket()
const {formatMoment} = useBooking()
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
</script>

<template>
  <div data-testid="ticket-changes">
    <!-- The same title-and-chevron row as the Budget pane; folded by default -->
    <div :class="COMPONENTS.collapsible.headerRow">
      <h5 :class="[TYPOGRAPHY.sectionSubheading, COMPONENTS.ticketChanges.title]">
        <UIcon :name="ICONS.clipboard" :class="COMPONENTS.cardSection.glyph" />
        Se billetændringer
      </h5>
      <UButton
        v-bind="BUTTONS.flipOpen(open)"
        :color="COLOR.neutral"
        :variant="NOISE.quiet"
        :size="SIZES.standard"
        :aria-label="open ? 'Skjul billetændringer' : 'Vis billetændringer'"
        data-testid="ticket-changes-toggle"
        @click="toggle"
      />
    </div>

    <UCollapsible v-model:open="open" v-bind="COMPONENTS.collapsible.belowTrigger">
      <template #content>
      <UAlert v-if="error" v-bind="ALERTS.error" title="Kunne ikke hente billetændringer" />
      <UTable v-else :data="rows" :columns="changeColumns" :loading="isLoading" :ui="COMPONENTS.table.ui">
        <template #timestamp-cell="{ row }">{{ formatMoment(row.original.timestamp) }}</template>
        <template #households-cell="{ row }">{{ ticketChangeHouseholds(row.original) }}</template>
        <template #change-cell="{ row }">
          <span>
            <template v-for="(event, index) in row.original.events" :key="index">
              <template v-if="index > 0">, </template>
              <span :class="COMPONENTS.ticketChanges.chips" data-testid="ticket-change-event">
                <span data-testid="ticket-change-word">{{ ticketChangeWord(event.change) }}</span>
                <template v-for="(run, runIndex) in ticketEventChipRuns(event)" :key="runIndex">
                  <span v-if="runIndex > 0">→</span>
                  <UBadge v-for="chip in run" :key="chip.type" :color="chip.color" :variant="NOISE.soft" :size="SIZES.small" data-testid="ticket-change-chip">
                    {{ chip.text }}
                  </UBadge>
                </template>
                <span v-if="event.seller" data-testid="ticket-change-seller">{{ ticketChangeSeller(event.seller) }}</span>
              </span>
            </template>
          </span>
        </template>
        <template #tickets-cell="{ row }">
          <span :class="COMPONENTS.ticketChanges.chips">
            <UBadge v-for="chip in ticketChips(row.original.counts)" :key="chip.type" :color="chip.color" :variant="NOISE.soft" :size="SIZES.small">
              {{ chip.text }}
            </UBadge>
            <span :class="TYPOGRAPHY.finePrint">· {{ formatPortions(row.original.portions) }} kuverter</span>
          </span>
        </template>
        <template #revenue-cell="{ row }"><span data-testid="ticket-change-revenue">{{ formatPrice(row.original.revenue) }} kr</span></template>
        <template #loading>
          <div :class="COMPONENTS.table.loadingRow">
            <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.table.loadingSpinner" />
            Henter...
          </div>
        </template>
        <template #empty>
          <UAlert v-bind="ALERTS.emptyStateCompact" :title="noTicketChanges" data-testid="ticket-changes-none-since" />
        </template>
      </UTable>

      <USeparator
        v-if="!isLoading && !error && since && !showAll"
        v-bind="COMPONENTS.separator.moment"
        :label="`Framelding lukker · ${formatMoment(since)}`"
        data-testid="ticket-changes-deadline"
      />
      <div v-if="!isLoading && !error && !showAll && moreCount > 0" :class="COMPONENTS.ticketChanges.moreRow">
        <UButton v-bind="BUTTONS.secondaryAction" :size="SIZES.small" data-testid="ticket-changes-more" @click="showAll = true">
          Vis fuld historik
        </UButton>
      </div>
      </template>
    </UCollapsible>
  </div>
</template>
