<script setup lang="ts" generic="T extends CostLineItem">
import type {DinnerMode} from '~/composables/useBookingValidation'

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
    dinnerMode?: DinnerMode      // DinnerMode for display (DINEIN/TAKEAWAY/DINEINLATE)
    orderId?: number | null      // For history lookup (transactions have this)
    isGuestTicket?: boolean      // For guest badge
    state?: string               // OrderState for live orders
    provenanceHousehold?: string | null  // Source household if claimed from marketplace
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
const {formatOrder} = useOrder()
const {TYPOGRAPHY, ICONS, SIZES, COMPONENTS} = useTheSlopeDesignSystem()
const {OrderStateSchema} = useBookingValidation()
const OrderState = OrderStateSchema.enum

// Extract fields from item
// For orders: use item.id (order is itself), for transactions: use orderId (may be null if order deleted)
const orderId = computed(() => {
    if (props.item.orderId !== undefined) {
        return props.item.orderId  // transactions - use orderId (may be null)
    }
    return props.item.id  // orders - use own id for history
})
const isHistoryExpanded = computed(() => orderId.value && props.historyOrderId === orderId.value)
const ticketLabel = computed(() => props.item.ticketType ? ticketTypeConfig[props.item.ticketType as keyof typeof ticketTypeConfig]?.label : 'Ukendt')
const ticketColor = computed(() => props.item.ticketType ? ticketTypeConfig[props.item.ticketType as keyof typeof ticketTypeConfig]?.color : 'neutral')
// DinnerModeSelector accepts string | undefined, handles type validation internally
const dinnerModeValue = computed(() => props.item.dinnerMode)
// Show dinner mode icon for all modes including NONE (X icon) - only hide if dinnerMode is undefined
const showDinnerMode = computed(() => dinnerModeValue.value !== undefined)

// Amount - prefer priceAtBooking (orders) over amount (transactions)
const itemAmount = computed(() => props.item.priceAtBooking ?? props.item.amount ?? 0)

// Formatted order display (handles claimed override, released state, guest badge)
// For transactions, as they don't have order state, use CLOSED
const formatted = computed(() => {
    const state = props.item.state ?? OrderState.CLOSED
    return formatOrder({
        state,
        provenanceHousehold: props.item.provenanceHousehold ?? null,
        isGuestTicket: props.item.isGuestTicket ?? false
    } as Parameters<typeof formatOrder>[0])
})
</script>

<template>
  <div class="space-y-1">
    <div :class="[COMPONENTS.costLine.row, COMPONENTS.costLine.columns, compact ? TYPOGRAPHY.finePrint : TYPOGRAPHY.bodyTextSmall]">
      <!-- History button -->
      <div>
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
      </div>
      <!-- Name -->
      <span :class="['truncate', COMPONENTS.costLine.nameSlot]">{{ item.inhabitant.name }}</span>
      <!-- Ticket type -->
      <div>
        <UBadge :color="ticketColor" variant="soft" :size="SIZES.small">
          {{ ticketLabel }}
        </UBadge>
      </div>
      <!-- Dinner mode -->
      <div>
        <DinnerModeSelector v-if="showDinnerMode" :model-value="dinnerModeValue" size="xs"/>
      </div>
      <!-- Guest badge -->
      <div>
        <UBadge v-if="formatted.guest" :color="formatted.guest.color" variant="soft" :size="SIZES.small" :icon="formatted.guest.icon">
          {{ formatted.guest.label }}
        </UBadge>
      </div>
      <!-- Order state -->
      <div>
        <UBadge :color="formatted.stateColor" variant="soft" :size="SIZES.small" :icon="formatted.stateIcon">
          {{ formatted.stateText }}
        </UBadge>
      </div>
      <!-- Amount -->
      <span :class="[COMPONENTS.costLine.amountSlot, compact ? TYPOGRAPHY.finePrint : TYPOGRAPHY.bodyTextMuted]">{{ formatPrice(itemAmount) }} kr</span>
    </div>
    <div v-if="isHistoryExpanded" class="pl-6 md:pl-8 pt-1">
      <OrderHistoryDisplay :order-id="orderId!"/>
    </div>
  </div>
</template>
