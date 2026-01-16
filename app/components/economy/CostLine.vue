<script setup lang="ts">
/**
 * CostLine - Individual line item in economy views
 *
 * Displays inhabitant name, ticket type, amount, and optional order history.
 * Used for both Transactions (billing) and Orders (live bookings).
 *
 * Emits toggle-history for lazy-loading OrderHistoryDisplay.
 */
import type {TicketType} from '~/composables/useBookingValidation'

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
}

const props = withDefaults(defineProps<Props>(), {
    compact: false
})

const emit = defineEmits<{
    'toggle-history': [orderId: number | null]
}>()

const {formatPrice, ticketTypeConfig} = useTicket()
const {TYPOGRAPHY, ICONS, SIZES} = useTheSlopeDesignSystem()

const isHistoryExpanded = computed(() => props.orderId && props.historyOrderId === props.orderId)
const ticketLabel = computed(() => props.ticketType ? ticketTypeConfig[props.ticketType]?.label : 'Ukendt')
</script>

<template>
  <div class="space-y-1">
    <div class="flex justify-between items-center" :class="compact ? TYPOGRAPHY.finePrint : TYPOGRAPHY.bodyTextSmall">
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
      </div>
      <span :class="compact ? 'text-muted' : TYPOGRAPHY.bodyTextMuted">{{ formatPrice(amount) }} kr</span>
    </div>
    <OrderHistoryDisplay v-if="isHistoryExpanded" :order-id="orderId!"/>
  </div>
</template>
