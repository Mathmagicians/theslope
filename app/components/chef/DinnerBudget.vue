<script setup lang="ts">
/**
 * DinnerBudget - Financial overview for dinner event
 *
 * Two display modes:
 * - compact: Just result (💰 +450 kr ✅) for TeamRoleStatus
 * - full: Detailed breakdown for DinnerMenuHero
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - Mobile-first responsive design with design system
 * - Uses NuxtUI components, utilities from useOrder
 */
import type { OrderDetail } from '~/composables/useBookingValidation'

interface Props {
  orders: OrderDetail[]
  totalCost: number
  mode?: 'compact' | 'full'
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'compact',
  editable: false
})

const emit = defineEmits<{
  'update:totalCost': [value: number]
}>()

// Design system
const { COLOR, SIZES, TYPOGRAPHY, LAYOUTS } = useTheSlopeDesignSystem()

// Business logic from useOrder
const { getActiveOrders, groupByTicketType } = useOrder()

// Price formatting utility
const { formatPrice } = usePriceFormat()

// Active orders (excluding RELEASED)
const activeOrders = computed(() => getActiveOrders(props.orders))

// Revenue by ticket type
const revenueByType = computed(() => {
  return groupByTicketType(activeOrders.value).map(group => ({
    ...group,
    unitPrice: activeOrders.value.find(o => o.ticketPrice.ticketType === group.ticketType)?.priceAtBooking || 0,
    revenue: activeOrders.value
      .filter(o => o.ticketPrice.ticketType === group.ticketType)
      .reduce((sum, o) => sum + o.priceAtBooking, 0)
  }))
})

// Totals
const totalRevenue = computed(() => activeOrders.value.reduce((sum, o) => sum + o.priceAtBooking, 0))
const balance = computed(() => totalRevenue.value - props.totalCost)
const isProfit = computed(() => balance.value >= 0)

// Budget status for UI
const budgetStatus = computed(() => ({
  color: isProfit.value ? COLOR.success : COLOR.error,
  label: isProfit.value ? 'Overskud' : 'Underskud',
  emoji: isProfit.value ? '✅' : '❌',
  prefix: isProfit.value ? '+' : ''
}))

// Editable cost state
const localCost = ref(props.totalCost / 100) // Store in kr for input
watch(() => props.totalCost, (val) => { localCost.value = val / 100 })
const saveCost = () => emit('update:totalCost', localCost.value * 100)
</script>

<template>
  <!-- Compact Mode -->
  <div v-if="mode === 'compact'" :class="`inline-flex items-center gap-1 ${TYPOGRAPHY.body}`">
    <span>💰</span>
    <span v-if="!activeOrders.length" class="text-neutral-500">
      0 kr (ingen salg)
    </span>
    <span v-else :class="['font-medium', isProfit ? 'text-success' : 'text-error']">
      {{ budgetStatus.prefix }}{{ formatPrice(balance) }} kr {{ budgetStatus.emoji }}
    </span>
  </div>

  <!-- Full Mode -->
  <UCard v-else :ui="{ body: { padding: LAYOUTS.cardPadding } }">
    <!-- Revenue -->
    <div class="space-y-3">
      <div :class="`flex items-center gap-2 ${TYPOGRAPHY.cardTitle}`">
        <span>💰</span>
        <span>Indtægter (Billetsalg)</span>
      </div>

      <div v-if="!activeOrders.length" :class="`${TYPOGRAPHY.body} text-neutral-500 italic py-2`">
        Ingen billetter solgt endnu
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="group in revenueByType"
          :key="group.ticketType"
          :class="`flex justify-between ${TYPOGRAPHY.body}`"
        >
          <span class="text-neutral-600 dark:text-neutral-400">
            {{ group.ticketType }}: <span class="font-medium">{{ group.count }} × {{ formatPrice(group.unitPrice) }} kr</span>
          </span>
          <span class="font-medium">{{ formatPrice(group.revenue) }} kr</span>
        </div>

        <div :class="`border-t pt-2 flex justify-between font-medium ${TYPOGRAPHY.body}`">
          <span>I alt: {{ activeOrders.length }} billetter</span>
          <span>{{ formatPrice(totalRevenue) }} kr</span>
        </div>
      </div>
    </div>

    <!-- Expenses -->
    <div :class="`mt-4 ${LAYOUTS.sectionSpacing} space-y-3`">
      <div :class="`flex items-center gap-2 ${TYPOGRAPHY.cardTitle}`">
        <span>🛒</span>
        <span>Udgifter (Indkøb)</span>
      </div>

      <UFormField v-if="editable" label="Indkøbsomkostninger" name="totalCost">
        <UInput
          v-model.number="localCost"
          type="number"
          min="0"
          :size="SIZES.medium.value"
          @blur="saveCost"
        >
          <template #trailing>
            <span :class="TYPOGRAPHY.caption">kr</span>
          </template>
        </UInput>
      </UFormField>

      <div v-else :class="`flex justify-between ${TYPOGRAPHY.body}`">
        <span class="text-neutral-600 dark:text-neutral-400">Indkøbsomkostninger:</span>
        <span class="font-medium">{{ formatPrice(totalCost) }} kr</span>
      </div>
    </div>

    <!-- Result -->
    <div :class="`mt-4 pt-4 border-t space-y-3 ${LAYOUTS.sectionSpacing}`">
      <div :class="`flex items-center gap-2 ${TYPOGRAPHY.cardTitle}`">
        <span>📊</span>
        <span>Resultat</span>
      </div>

      <div :class="`space-y-2 ${TYPOGRAPHY.body}`">
        <div class="flex justify-between">
          <span class="text-neutral-600 dark:text-neutral-400">Indtægter:</span>
          <span class="font-medium">{{ formatPrice(totalRevenue) }} kr</span>
        </div>
        <div class="flex justify-between">
          <span class="text-neutral-600 dark:text-neutral-400">Udgifter:</span>
          <span class="font-medium">{{ formatPrice(totalCost) }} kr</span>
        </div>
        <div :class="`border-t pt-2 flex justify-between font-semibold ${TYPOGRAPHY.cardTitle}`">
          <span>{{ budgetStatus.label }}:</span>
          <span :class="isProfit ? 'text-success' : 'text-error'">
            {{ budgetStatus.prefix }}{{ formatPrice(balance) }} kr {{ budgetStatus.emoji }}
          </span>
        </div>
      </div>

      <!-- Status alerts -->
      <UAlert
        v-if="!activeOrders.length"
        :color="COLOR.info"
        variant="soft"
        icon="i-heroicons-information-circle"
        :size="SIZES.small.value"
      >
        <template #title>Afventer bestillinger</template>
        <template #description>Budgettet opdateres automatisk når der kommer bestillinger</template>
      </UAlert>

      <UAlert
        v-else-if="!isProfit"
        :color="COLOR.warning"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        :size="SIZES.small.value"
      >
        <template #title>Underskud på {{ formatPrice(-balance) }} kr</template>
        <template #description>Overvej at reducere indkøb eller tilskynde flere bestillinger</template>
      </UAlert>

      <UAlert
        v-else-if="balance > 0"
        :color="COLOR.success"
        variant="soft"
        icon="i-heroicons-check-circle"
        :size="SIZES.small.value"
      >
        <template #title>Flot! Overskud på {{ formatPrice(balance) }} kr</template>
      </UAlert>
    </div>
  </UCard>
</template>
