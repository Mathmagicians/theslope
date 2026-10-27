<script setup lang="ts">
/**
 * TicketChanges - Billetændringer: the dinner's ticket changes, newest first, behind a toggle row. Opening it loads the
 * stretch since Framelding closed; before that moment the newest change stands alone; one button loads the rest.
 * A line holds the ticket events of one user, or of the system, within one minute: who made them, each event's word
 * with the tickets it touched, then what the dinner is paid for after it. The moment Framelding closes is a row of its
 * own: the last row until the full history loads, then between the changes since it and the older ones.
 *
 *   Se billetændringer                                                                                  [v]
 *   Dato              Husstand  Af         Ændring                        Billetter · kuverter   Indtægter
 *   21/10/2026 02:00  System    System     lukket                         30V 11B 3b · 35,5      2.035 kr
 *   20/10/2026 21:15  S_22      Bo K.      frameldt, ADMIN korrektion 1B  30V 11B 3b · 35,5      2.035 kr
 *   20/10/2026 19:10  S_14      Anna H.    købt 1V fra S_31               30V 11B 3b · 35,5      2.035 kr
 *   20/10/2026 09:05  S_31      Lars J.    frigivet 2V                    29V 12B 3b · 35        2.015 kr
 *   ── Framelding lukker · 19/10/2026 18:00 ──────────────────────────────────────────────────────────────
 *   [Vis fuld historik]
 *
 *   With the full history the moment line stands between the changes since it and the older ones:
 *   20/10/2026 09:05  S_31      Lars J.    frigivet 2V                    29V 12B 3b · 35        2.015 kr
 *   ── Framelding lukker · 19/10/2026 18:00 ──────────────────────────────────────────────────────────────
 *   18/10/2026 14:20  S_22      Bo K.      tilmeldt 1B                    29V 12B 3b · 35        2.015 kr
 *
 *   A line by one actor within one minute lists its events in the action order; a sale names the household it bought
 *   from, one event per seller:
 *   20/10/2026 12:40  S_31  Lars J.   tilmeldt 1B, frigivet 2V  …
 *   20/10/2026 19:12  S_14  Anna H.   købt 1V 1B fra S_22, købt 1V fra S_32  …
 *
 *   An admin's correction follows each event's word with its reason; the chef's extra portions for the first in line
 *   name the households that receive them:
 *   20/10/2026 21:15  S_22        Bo K.   tilmeldt, ADMIN korrektion 1V  …
 *   20/10/2026 20:30  S_14, S_22  Mia S.  ekstra tilmeldt 1V 1B  …
 *
 *   A user's line over more than two households (a season activation, an admin's run) names the first two and counts
 *   the rest on a link (COMPONENTS.ticketChanges.householdsToggle); a click opens that line's list, which wraps inside
 *   the capped Husstand cell (COMPONENTS.ticketChanges.households) while the other cells keep their line, and the link
 *   then folds it again:
 *   01/10/2026 04:00  S_14, S_22 [+54]             Bo K.  tilmeldt 41V 12B 3b  …
 *   01/10/2026 04:00  S_14, S_22, S_31, S_32,      Bo K.  tilmeldt 41V 12B 3b  …
 *                     S_40, S_41, S_43, S_45, …
 *                     S_98, S_99 [skjul]
 *
 *   No change since Framelding closed: the empty state with the moment line under it
 *                            Billetterne har holdt sig i ro
 *   ── Framelding lukker · 19/10/2026 18:00 ──────────────────────────────────────────────────────────────
 *
 *   While the changes load, the table's loading row (COMPONENTS.table.loadingRow):
 *                                (sync, spinning)  Henter...
 *
 *   On a phone every row keeps its width and the table scrolls sideways inside its box (COMPONENTS.table.historyUi).
 *
 * Visual check: /chef Billetændringer at 375px and desktop, since the deadline and with the full history: the chips sit
 * on the middle of the row's text line, and the moment line spans the table between the stretch since it and the older
 * rows; a line over many households reads its first two and the count, and opened its names wrap inside the Husstand
 * column, so on a desktop every column stays in view.
 *
 * ADR-007: component-local useAsyncData exception - the pane holds its own dinner's history, fetched on open through
 * the bookings store.
 */
import type {TicketChange} from '~/composables/useBookingValidation'
import type {TableColumn, TableRow} from '@nuxt/ui'
import {isAfter, isBefore} from 'date-fns'
import {BOOKING_WORDS} from '~/config/bookingWords'

const props = defineProps<{
  dinnerEventId: number
  /** The moment Framelding closes; the shown changes start there, and before it the newest change stands alone */
  since: Date | null
}>()

const {COMPONENTS, BUTTONS, SIZES, ICONS, NOISE, COLOR, TYPOGRAPHY, ALERTS, getRandomEmptyMessageText} = useTheSlopeDesignSystem()
const WORDS = BOOKING_WORDS.ticketChange
const now = useClock()
const noTicketChanges = getRandomEmptyMessageText('noTicketChanges', now.value)

// The moment Framelding closes, as a row of the table
type DeadlineRow = {deadline: Date}
type ChangeRow = TicketChange | DeadlineRow
const isDeadline = (row: ChangeRow): row is DeadlineRow => 'deadline' in row
// The deadline row's Dato cell spans the row; its other cells step aside
const besideDeadline = (td = '') => ({td: ({row}: {row: TableRow<ChangeRow>}) => isDeadline(row.original) ? COMPONENTS.table.spannedCell : td})
const changeColumns: TableColumn<ChangeRow>[] = [
  {id: 'timestamp', header: WORDS.columns.date, meta: {colspan: {td: ({row}) => isDeadline(row.original) ? String(changeColumns.length) : '1'}}},
  {id: 'households', header: WORDS.columns.households, meta: {class: besideDeadline()}},
  {id: 'performedBy', header: WORDS.columns.performedBy, meta: {class: besideDeadline()}},
  {id: 'change', header: WORDS.columns.change, meta: {class: besideDeadline()}},
  {id: 'tickets', header: WORDS.columns.tickets, meta: {class: besideDeadline()}},
  {id: 'revenue', header: WORDS.columns.revenue, meta: {class: {th: COMPONENTS.table.amountColumn.class.th, ...besideDeadline(COMPONENTS.table.amountColumn.class.td)}}}
]
const {formatPrice} = useTicket()
const {formatMoment} = useBooking()
const bookingsStore = useBookingsStore()

const open = ref(false)
const showAll = ref(false)

// Before Framelding closes nothing has moved since that moment, so the history is read whole and the newest change shown
const beforeDeadline = computed(() => props.since !== null && isAfter(props.since, now.value))
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
const shown = computed(() => beforeDeadline.value && !showAll.value ? changes.value.slice(0, 1) : changes.value)
const deadlineLine = computed(() => props.since ? WORDS.deadline(formatMoment(props.since)) : '')
// The deadline row follows the changes since Framelding closed: the last row until the full history loads
const rows = computed<ChangeRow[]>(() => {
  const since = props.since
  if (!since || shown.value.length === 0) return shown.value
  const at = showAll.value ? shown.value.filter(change => !isBefore(change.timestamp, since)).length : shown.value.length
  return [...shown.value.slice(0, at), {deadline: since}, ...shown.value.slice(at)]
})
// What the full history still holds beyond the rows shown
const moreCount = computed(() => beforeDeadline.value && !showAll.value ? Math.max(changes.value.length - 1, 0) : (data.value?.olderCount ?? 0))

// The lines whose households show in full
const openHouseholds = reactive(new Set<number>())
const toggleHouseholds = (id: number) => {
  if (!openHouseholds.delete(id)) openHouseholds.add(id)
}
const householdsOf = (change: TicketChange) => ticketChangeHouseholds(change, openHouseholds.has(change.id))
</script>

<template>
  <div data-testid="ticket-changes">
    <!-- The same title-and-chevron row as the Budget pane; folded by default -->
    <div :class="COMPONENTS.collapsible.headerRow">
      <h5 :class="[TYPOGRAPHY.sectionSubheading, COMPONENTS.ticketChanges.title]">
        <UIcon :name="ICONS.clipboard" :class="COMPONENTS.cardSection.glyph" />
        {{ WORDS.title }}
      </h5>
      <UButton
        v-bind="BUTTONS.flipOpen(open)"
        :color="COLOR.neutral"
        :variant="NOISE.quiet"
        :size="SIZES.standard"
        :aria-label="WORDS.toggle(open)"
        data-testid="ticket-changes-toggle"
        @click="toggle"
      />
    </div>

    <UCollapsible v-model:open="open" v-bind="COMPONENTS.collapsible.belowTrigger">
      <template #content>
      <UAlert v-if="error" v-bind="ALERTS.error" :title="WORDS.failed" />
      <UTable v-else :data="rows" :columns="changeColumns" :loading="isLoading" :ui="COMPONENTS.table.historyUi">
        <template #timestamp-cell="{ row }">
          <USeparator v-if="isDeadline(row.original)" v-bind="COMPONENTS.separator.moment" :label="deadlineLine" data-testid="ticket-changes-deadline" />
          <template v-else>{{ formatMoment(row.original.timestamp) }}</template>
        </template>
        <template #households-cell="{ row }">
          <span v-if="!isDeadline(row.original)" :class="COMPONENTS.ticketChanges.households" data-testid="ticket-change-households">
            {{ householdsOf(row.original).names }}
            <UButton
              v-if="householdsOf(row.original).toggle"
              v-bind="COMPONENTS.ticketChanges.householdsToggle"
              :label="householdsOf(row.original).toggle?.label"
              :aria-label="householdsOf(row.original).toggle?.ariaLabel"
              :aria-expanded="openHouseholds.has(row.original.id)"
              data-testid="ticket-change-households-toggle"
              @click="toggleHouseholds(row.original.id)"
            />
          </span>
        </template>
        <template #performedBy-cell="{ row }">
          <span v-if="!isDeadline(row.original)" data-testid="ticket-change-performer">{{ row.original.performedByName }}</span>
        </template>
        <template #change-cell="{ row }">
          <span v-if="!isDeadline(row.original)">
            <template v-for="(event, index) in row.original.events" :key="index">
              <template v-if="index > 0">, </template>
              <span :class="COMPONENTS.ticketChanges.chips" data-testid="ticket-change-event">
                <span data-testid="ticket-change-word">{{ ticketChangeWord(event.change, event.reason) }}</span>
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
          <span v-if="!isDeadline(row.original)" :class="COMPONENTS.ticketChanges.chips">
            <UBadge v-for="chip in ticketChips(row.original.counts)" :key="chip.type" :color="chip.color" :variant="NOISE.soft" :size="SIZES.small">
              {{ chip.text }}
            </UBadge>
            <span :class="TYPOGRAPHY.finePrint">{{ WORDS.portions(formatPortions(row.original.portions)) }}</span>
          </span>
        </template>
        <template #revenue-cell="{ row }">
          <span v-if="!isDeadline(row.original)" data-testid="ticket-change-revenue">{{ formatPrice(row.original.revenue) }} kr</span>
        </template>
        <template #loading>
          <div :class="COMPONENTS.table.loadingRow">
            <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" :class="COMPONENTS.table.loadingSpinner" />
            Henter...
          </div>
        </template>
        <template #empty>
          <UAlert v-bind="ALERTS.emptyStateCompact" :title="noTicketChanges" data-testid="ticket-changes-none-since" />
          <USeparator v-if="deadlineLine" v-bind="COMPONENTS.separator.moment" :label="deadlineLine" data-testid="ticket-changes-deadline" />
        </template>
      </UTable>

      <div v-if="!isLoading && !error && !showAll && moreCount > 0" :class="COMPONENTS.ticketChanges.moreRow">
        <UButton v-bind="BUTTONS.secondaryAction" :size="SIZES.small" data-testid="ticket-changes-more" @click="showAll = true">
          {{ WORDS.more }}
        </UButton>
      </div>
      </template>
    </UCollapsible>
  </div>
</template>
