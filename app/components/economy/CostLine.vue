<script setup lang="ts">
import {CostLineKind, type CostLine} from '~/composables/useBillingValidation'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {BUTTON_WORDS} from '~/config/buttonWords'

/**
 * CostLine - Individual line item in economy views
 *
 * One line for an order with its eater (live bookings) or a billed transaction.
 * Shows inhabitant name, ticket type badge, amount, guest/state badges, and order history.
 * A live order shows its eating mode beside the name; a billed line shows none, and its badge reads Frigivet when its
 * order closed with Ingen.
 *
 * Visual check: /household/[shortname]/economy and /admin/economy, a period's lines with a history open, phone and desktop.
 */

interface Props {
    /** The line to display */
    line: CostLine
    /** Currently expanded history order ID */
    historyOrderId: number | null
    /** Use compact typography (for nested displays) */
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    compact: false
})

const emit = defineEmits<{
    'toggle-history': [orderId: number | null]
}>()

const {formatKroner} = useTicket()
const {formatCostLine} = useBookingUi()
const {TYPOGRAPHY, SIZES, COMPONENTS, NOISE, BUTTONS, COLOR} = useTheSlopeDesignSystem()

// The eater, the ticket type and the amount the line reads. An order is its own history; a transaction names its order,
// null once the order is deleted
const shownOf = (line: CostLine) => {
    switch (line.kind) {
        case CostLineKind.ORDER:
            return {name: line.inhabitant.name, ticketType: line.order.ticketType, amount: line.order.priceAtBooking, orderId: line.order.id}
        case CostLineKind.TRANSACTION:
            return {name: line.transaction.inhabitant.name, ticketType: line.transaction.ticketType, amount: line.transaction.amount, orderId: line.transaction.orderId}
    }
}
const shown = computed(() => shownOf(props.line))
const orderId = computed(() => shown.value.orderId)
const isHistoryExpanded = computed(() => orderId.value !== null && props.historyOrderId === orderId.value)
const ticketPresentation = computed(() => shown.value.ticketType ? ticketTypePresentation(shown.value.ticketType) : null)
// Every mode shows, Ingen included (its X icon); a billed line shows none
const dinnerModeValue = computed(() => costLineMode(props.line))
const showDinnerMode = computed(() => dinnerModeValue.value !== undefined)

// The state and guest badges: the claimed override, a released ticket, a billed line read as closed or released
const formatted = computed(() => formatCostLine(props.line))
</script>

<template>
  <div :class="COMPONENTS.costLine.stack">
    <div :class="[COMPONENTS.costLine.row, COMPONENTS.costLine.columns, compact ? TYPOGRAPHY.finePrint : TYPOGRAPHY.bodyTextSmall]">
      <div>
        <UButton
            v-if="orderId"
            v-bind="BUTTONS.history(isHistoryExpanded)"
            :aria-label="BUTTON_WORDS.history"
            @click="emit('toggle-history', orderId)"
        />
      </div>
      <span :class="COMPONENTS.costLine.nameSlot">{{ shown.name }}</span>
      <div>
        <UBadge :color="ticketPresentation?.color ?? COLOR.neutral" :variant="NOISE.soft" :size="SIZES.small">
          {{ ticketPresentation?.label ?? BOOKING_WORDS.unknownTicketType }}
        </UBadge>
      </div>
      <div>
        <DinnerModeSelector v-if="showDinnerMode" :model-value="dinnerModeValue" :size="SIZES.xs"/>
      </div>
      <div>
        <UBadge v-if="formatted.guest" :color="formatted.guest.color" :variant="NOISE.soft" :size="SIZES.small" :icon="formatted.guest.icon">
          {{ formatted.guest.label }}
        </UBadge>
      </div>
      <div>
        <UBadge :color="formatted.stateColor" :variant="NOISE.soft" :size="SIZES.small" :icon="formatted.stateIcon">
          {{ formatted.stateText }}
        </UBadge>
      </div>
      <span :class="[COMPONENTS.costLine.amountSlot, compact ? TYPOGRAPHY.finePrint : TYPOGRAPHY.bodyTextMuted]">{{ formatKroner(shown.amount) }}</span>
    </div>
    <div v-if="isHistoryExpanded && orderId" :class="COMPONENTS.costLine.history">
      <OrderHistoryDisplay :order-id="orderId"/>
    </div>
  </div>
</template>
