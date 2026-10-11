<script setup lang="ts">
/**
 * OrderHistoryDisplay - Vertical timeline of order audit history
 *
 * Lazy-loads the order's history through the bookings store's fetchOrderDetail
 * Uses UTimeline with action-specific icons and colors
 *
 * ADR-007: component-local useAsyncData exception - each expanded row holds its own order's history
 */
import type {OrderActionLabel} from '~/composables/useBookingUi'

interface Props {
    orderId: number | null
}

const props = defineProps<Props>()

const {ICONS, TYPOGRAPHY, SIZES, COLOR, ALERTS} = useTheSlopeDesignSystem()
const bookingsStore = useBookingsStore()

// Lazy-load order detail with history
const {data: orderDetail, status, error} = useAsyncData(
    computed(() => `order-history-${props.orderId ?? 'null'}`),
    () => bookingsStore.fetchOrderDetail(props.orderId!),
    {
        default: () => null,
        enabled: () => !!props.orderId
    }
)

const isLoading = computed(() => status.value === 'pending')

// The shared action labels (useBookingUi); an action the map does not name reads as itself
const getActionConfig = (action: string): OrderActionLabel =>
    (ORDER_ACTION_LABELS as Record<string, OrderActionLabel>)[action] ?? {icon: ICONS.info, color: COLOR.neutral, label: action}

const formatTimestamp = (date: Date) => date.toLocaleString('da-DK', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
})

// Transform history to UTimeline items
const timelineItems = computed(() =>
    (orderDetail.value?.history ?? []).map(entry => {
        const config = getActionConfig(entry.action)
        return {
            title: config.label,
            description: entry.performedByUser?.email ?? 'System',
            date: formatTimestamp(entry.timestamp),
            icon: config.icon,
            color: config.color
        }
    })
)
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading" class="flex items-center gap-2 py-2">
    <UIcon :name="ICONS.sync" :size="SIZES.smallIconSize" class="animate-spin"/>
    <span :class="TYPOGRAPHY.finePrint">Henter...</span>
  </div>

  <!-- Order deleted -->
  <UAlert v-else-if="!orderId" v-bind="ALERTS.warning" :icon="ICONS.exclamationCircle" title="Ordre slettet"/>

  <!-- Error -->
  <UAlert v-else-if="error" v-bind="ALERTS.error" title="Kunne ikke hente historik"/>

  <!-- Timeline -->
  <UTimeline v-else-if="timelineItems.length > 0" :items="timelineItems" :size="SIZES.small"/>

  <!-- No history -->
  <span v-else :class="TYPOGRAPHY.finePrint">Ingen historik</span>
</template>
