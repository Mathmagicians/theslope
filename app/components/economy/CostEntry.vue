<script setup lang="ts">
/**
 * CostEntry - Grouped items by dinner event for economy display
 *
 * Displays dinner date/menu header with total, then list of CostLine items.
 * Used for both Transactions (billing) and Orders (live bookings).
 *
 * Generic via slots - parent provides item rendering via #item slot.
 */
import {formatDate} from '~/utils/date'
import type {CostEntry} from '~/composables/useBillingValidation'
import type {TicketType} from '~/composables/useBookingValidation'

interface Props {
    /** Cost entry with grouped items */
    entry: CostEntry<{ ticketType: TicketType | null }>
    /** Show header with date/menu (false for flat lists) */
    showHeader?: boolean
}

withDefaults(defineProps<Props>(), {
    showHeader: true
})

const {formatPrice} = useTicket()
const {TYPOGRAPHY, ICONS} = useTheSlopeDesignSystem()
</script>

<template>
  <div class="border rounded p-2 bg-white dark:bg-neutral-800">
    <!-- Header: Date, Menu, Total -->
    <div v-if="showHeader" class="flex justify-between mb-1" :class="TYPOGRAPHY.bodyTextMedium">
      <span>{{ formatDate(entry.date) }} - {{ entry.menuTitle }}</span>
      <span>{{ formatPrice(entry.totalAmount) }} kr</span>
    </div>

    <!-- Items via slot (parent decides how to render each item) -->
    <div v-if="entry.items.length > 0" class="space-y-1" :class="showHeader ? 'pl-2' : ''">
      <slot name="items" :items="entry.items"/>
    </div>

    <!-- Empty state -->
    <UAlert
        v-else
        :icon="ICONS.robotHappy"
        color="neutral"
        variant="subtle"
        title="Tomt her!"
        description="Ingen har spist denne aften - måske var der takeaway?"
        :class="showHeader ? 'ml-2' : ''"
    />
  </div>
</template>
