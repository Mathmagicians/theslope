<script setup lang="ts" generic="T extends CostLineItem">
import type {TicketType} from '~/composables/useBookingValidation'
import type {CostLineOrder} from '~/composables/useBookingUi'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {BUTTON_WORDS} from '~/config/buttonWords'

/**
 * CostLine - Individual line item in economy views
 *
 * Generic component for both Transactions (billing) and Orders (live bookings).
 * Shows inhabitant name, ticket type badge, amount, guest/state badges, and order history.
 * A live order shows its eating mode beside the name; a billed line shows none, and its badge reads Frigivet when its
 * order closed with Ingen.
 *
 * @generic T - Item type extending CostLineItem (OrderDisplay or TransactionDisplay)
 *
 * Visual check: /household/[shortname]/economy and /admin/economy, a period's lines with a history open, phone and desktop.
 */

/**
 * Minimal interface for CostLine items - both OrderDisplay and TransactionDisplay satisfy this
 */
export interface CostLineItem extends CostLineOrder {
    id: number
    inhabitant: { name: string }
    ticketType: TicketType | null
    orderId?: number | null      // For history lookup (transactions have this)
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

const {formatKroner} = useTicket()
const {formatCostLine} = useBookingUi()
const {TYPOGRAPHY, SIZES, COMPONENTS, NOISE, BUTTONS, COLOR} = useTheSlopeDesignSystem()

// An order is its own history; a transaction names its order, null once the order is deleted
const orderId = computed(() => props.item.orderId !== undefined ? props.item.orderId : props.item.id)
const isHistoryExpanded = computed(() => orderId.value !== null && props.historyOrderId === orderId.value)
const ticketPresentation = computed(() => props.item.ticketType ? ticketTypePresentation(props.item.ticketType) : null)
// Every mode shows, Ingen included (its X icon); a billed line shows none
const dinnerModeValue = computed(() => costLineMode(props.item))
const showDinnerMode = computed(() => dinnerModeValue.value !== undefined)

// Amount - prefer priceAtBooking (orders) over amount (transactions)
const itemAmount = computed(() => props.item.priceAtBooking ?? props.item.amount ?? 0)

// The state and guest badges: the claimed override, a released ticket, a billed line read as closed or released
const formatted = computed(() => formatCostLine(props.item))
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
      <span :class="COMPONENTS.costLine.nameSlot">{{ item.inhabitant.name }}</span>
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
      <span :class="[COMPONENTS.costLine.amountSlot, compact ? TYPOGRAPHY.finePrint : TYPOGRAPHY.bodyTextMuted]">{{ formatKroner(itemAmount) }}</span>
    </div>
    <div v-if="isHistoryExpanded && orderId" :class="COMPONENTS.costLine.history">
      <OrderHistoryDisplay :order-id="orderId"/>
    </div>
  </div>
</template>
