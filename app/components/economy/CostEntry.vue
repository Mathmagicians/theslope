<script setup lang="ts" generic="T extends { ticketType: string | null }">
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

interface Props {
    /** Cost entry with grouped items */
    entry: CostEntry<T>
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
  <UCard>
    <template v-if="showHeader" #header>
      <div class="flex justify-between" :class="TYPOGRAPHY.bodyTextMedium">
        <span>{{ formatDate(entry.date) }} - {{ entry.menuTitle }}</span>
        <span>{{ formatPrice(entry.totalAmount) }} kr</span>
      </div>
    </template>

    <!-- Items via slot (parent decides how to render each item) -->
    <div v-if="entry.items.length > 0" class="space-y-1">
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
    />
  </UCard>
</template>
