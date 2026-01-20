<script setup lang="ts">
/**
 * OrderHistoryDisplay - Vertical timeline of order audit history
 *
 * Lazy-loads order history via GET /api/order/:id
 * Uses UTimeline with action-specific icons and colors
 *
 * ADR-007: component-local useAsyncData exception
 */
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'

interface Props {
    orderId: number | null
}

const props = defineProps<Props>()

const {OrderDetailSchema, OrderAuditActionSchema} = useBookingValidation()
const {ICONS, TYPOGRAPHY, SIZES, COLOR} = useTheSlopeDesignSystem()

// Lazy-load order detail with history
const {data: orderDetail, status, error} = useAsyncData<OrderDetail | null>(
    computed(() => `order-history-${props.orderId ?? 'null'}`),
    () => props.orderId
        ? $fetch<OrderDetail>(`/api/order/${props.orderId}`)
        : Promise.resolve(null),
    {
        default: () => null,
        transform: (data) => data ? OrderDetailSchema.parse(data) : null
    }
)

const isLoading = computed(() => status.value === 'pending')

// Action config for timeline items
interface ActionConfig { icon: string; color: NuxtUIColor; label: string }
const ACTION_CONFIG: Record<string, ActionConfig> = {
    [OrderAuditActionSchema.enum.USER_BOOKED]: {icon: ICONS.check, color: COLOR.success, label: 'Bestilt'},
    [OrderAuditActionSchema.enum.USER_CANCELLED]: {icon: ICONS.xMark, color: COLOR.warning, label: 'Afmeldt'},
    [OrderAuditActionSchema.enum.USER_CLAIMED]: {icon: ICONS.claim, color: COLOR.info, label: 'Købt fra anden'},
    [OrderAuditActionSchema.enum.SYSTEM_CREATED]: {icon: ICONS.calendar, color: COLOR.neutral, label: 'Automatisk bestilling'},
    [OrderAuditActionSchema.enum.SYSTEM_DELETED]: {icon: ICONS.xMark, color: COLOR.error, label: 'Slettet'},
    [OrderAuditActionSchema.enum.SYSTEM_UPDATED]: {icon: ICONS.edit, color: COLOR.neutral, label: 'Opdateret'}
}

const getActionConfig = (action: string): ActionConfig =>
    ACTION_CONFIG[action] ?? {icon: ICONS.info, color: COLOR.neutral, label: action}

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
  <UAlert v-else-if="!orderId" color="warning" variant="soft" :icon="ICONS.exclamationCircle" title="Ordre slettet"/>

  <!-- Error -->
  <UAlert v-else-if="error" color="error" variant="soft" :icon="ICONS.exclamationCircle" title="Kunne ikke hente historik"/>

  <!-- Timeline -->
  <UTimeline v-else-if="timelineItems.length > 0" :items="timelineItems" :size="SIZES.small"/>

  <!-- No history -->
  <span v-else :class="TYPOGRAPHY.finePrint">Ingen historik</span>
</template>
