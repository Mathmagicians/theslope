<script setup lang="ts" generic="T extends CostLineItem">
/**
 * CostLine - Individual line item in economy views
 *
 * Generic component for both Transactions (billing) and Orders (live bookings).
 * Shows inhabitant name, ticket type badge, amount, guest/state badges, and order history.
 *
 * @generic T - Item type extending CostLineItem (OrderDisplay or TransactionDisplay)
 */

/**
 * Minimal interface for CostLine items - both OrderDisplay and TransactionDisplay satisfy this
 */
export interface CostLineItem {
    id: number
    inhabitant: { name: string }
    ticketType: string | null
    orderId?: number | null      // For history lookup (transactions have this)
    isGuestTicket?: boolean      // For guest badge
    state?: string               // OrderState for live orders
    // Amount fields - one of these will be present
    amount?: number              // TransactionDisplay
    priceAtBooking?: number      // OrderDisplay
}

interface Props {
    /** The item to display */
    item: T
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
const {orderStateConfig} = useOrder()
const {TYPOGRAPHY, ICONS, SIZES, COLOR} = useTheSlopeDesignSystem()

// Extract fields from item
// For orders: use item.id (order is itself), for transactions: use orderId (may be null if order deleted)
const orderId = computed(() => {
    if (props.item.orderId !== undefined) {
        return props.item.orderId  // transactions - use orderId (may be null)
    }
    return props.item.id  // orders - use own id for history
})
const isHistoryExpanded = computed(() => orderId.value && props.historyOrderId === orderId.value)
const ticketLabel = computed(() => props.item.ticketType ? ticketTypeConfig[props.item.ticketType]?.label : 'Ukendt')
const ticketColor = computed(() => props.item.ticketType ? ticketTypeConfig[props.item.ticketType]?.color : 'neutral')

// Amount - prefer priceAtBooking (orders) over amount (transactions)
const itemAmount = computed(() => props.item.priceAtBooking ?? props.item.amount ?? 0)

// State config for live orders
const stateConfig = computed(() => props.item.state ? orderStateConfig[props.item.state] : null)
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
        <span>{{ item.inhabitant.name }}</span>
        <!-- Ticket type badge -->
        <UBadge :color="ticketColor" variant="soft" :size="SIZES.small">
          {{ ticketLabel }}
        </UBadge>
        <!-- Guest badge -->
        <UBadge v-if="item.isGuestTicket" :color="COLOR.info" variant="soft" :size="SIZES.small" :icon="ICONS.userPlus">
          Gæst
        </UBadge>
        <!-- Order state badge (for live orders) -->
        <UBadge v-if="stateConfig" :color="stateConfig.color" variant="soft" :size="SIZES.small" :icon="stateConfig.icon">
          {{ stateConfig.label }}
        </UBadge>
      </div>
      <span :class="compact ? TYPOGRAPHY.finePrint : TYPOGRAPHY.bodyTextMuted">{{ formatPrice(itemAmount) }} kr</span>
    </div>
    <div v-if="isHistoryExpanded" class="pl-4 md:pl-8 pt-1">
      <OrderHistoryDisplay :order-id="orderId!"/>
    </div>
  </div>
</template>
