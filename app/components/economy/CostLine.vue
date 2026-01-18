<script setup lang="ts">
/**
 * CostLine - Individual line item in economy views
 *
 * Displays inhabitant name, ticket type, amount, and optional order history.
 * Used for both Transactions (billing) and Orders (live bookings).
 *
 * Optionally shows order state (Bestilt/Frigivet/Gæst) for live order views.
 * Emits toggle-history for lazy-loading OrderHistoryDisplay.
 */
import type {TicketType, OrderDisplay} from '~/composables/useBookingValidation'

interface Props {
    /** Inhabitant name to display */
    inhabitantName: string
    /** Ticket type for label display */
    ticketType: TicketType | null
    /** Amount in øre */
    amount: number
    /** Order ID for history lookup (null if order deleted) */
    orderId: number | null
    /** Currently expanded history order ID */
    historyOrderId: number | null
    /** Use compact typography (for nested displays) */
    compact?: boolean
    /** Order object for state display (optional - for live order views) */
    order?: OrderDisplay
    /** Booker name for guest ticket display */
    bookerName?: string
}

const props = withDefaults(defineProps<Props>(), {
    compact: false,
    order: undefined,
    bookerName: undefined
})

const emit = defineEmits<{
    'toggle-history': [orderId: number | null]
}>()

const {formatPrice, ticketTypeConfig} = useTicket()
const {formatOrder} = useOrder()
const {TYPOGRAPHY, ICONS, SIZES} = useTheSlopeDesignSystem()

const isHistoryExpanded = computed(() => props.orderId && props.historyOrderId === props.orderId)
const ticketLabel = computed(() => props.ticketType ? ticketTypeConfig[props.ticketType]?.label : 'Ukendt')

// Order state display (when order prop is provided)
const orderDisplay = computed(() => props.order ? formatOrder(props.order, props.bookerName) : null)
</script>

<template>
  <div class="space-y-1">
    <div class="flex justify-between items-center max-w-sm md:max-w-md" :class="compact ? TYPOGRAPHY.finePrint : TYPOGRAPHY.bodyTextSmall">
      <div class="flex items-center gap-2">
        <UButton
            v-if="orderId"
            color="neutral"
            variant="ghost"
            :icon="isHistoryExpanded ? ICONS.chevronUp : ICONS.clipboard"
            square
            :size="SIZES.small"
            aria-label="Vis ordrehistorik"
            @click="emit('toggle-history', orderId)"
        />
        <span>{{ inhabitantName }} ({{ ticketLabel }})</span>
        <!-- Order state badges -->
        <template v-if="orderDisplay">
          <UBadge v-if="orderDisplay.guest" :color="orderDisplay.guest.color" variant="subtle" :size="SIZES.small">
            <UIcon :name="orderDisplay.guest.icon" :class="SIZES.smallBadgeIcon"/>
            {{ orderDisplay.guest.label }}
          </UBadge>
          <UBadge :color="orderDisplay.stateColor" variant="subtle" :size="SIZES.small">
            <UIcon :name="orderDisplay.stateIcon" :class="SIZES.smallBadgeIcon"/>
            {{ orderDisplay.stateText }}
          </UBadge>
        </template>
      </div>
      <span :class="compact ? TYPOGRAPHY.finePrint : TYPOGRAPHY.bodyTextMuted">{{ formatPrice(amount) }} kr</span>
    </div>
    <div v-if="isHistoryExpanded" class="pl-4 md:pl-8 pt-1">
      <OrderHistoryDisplay :order-id="orderId!"/>
    </div>
  </div>
</template>
