<script setup lang="ts">
/**
 * ChefDinnerCard - Dinner event card for chef master view
 *
 * Features:
 * - Display dinner date, menu, state
 * - Click to select dinner
 * - Deadline warnings using useSeason time logic
 * - State badges (SCHEDULED, ANNOUNCED, CANCELLED, CONSUMED)
 * - Visual selection state
 *
 * Used in:
 * - /chef/[teamId].vue master view (dinner list)
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - Mobile-first responsive design
 * - Uses useSeason for time-related logic
 */
import type { DinnerEventDisplay } from '~/composables/useBookingValidation'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

interface Props {
  dinnerEvent: DinnerEventDisplay
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false
})

const emit = defineEmits<{
  select: [dinnerEventId: number]
}>()

// Design system
const { COLOR, COMPONENTS, SIZES } = useTheSlopeDesignSystem()

// Validation schemas
const { DinnerStateSchema } = useBookingValidation()
const DinnerState = DinnerStateSchema.enum

// Time logic from useSeason
const { canAnnounceMenu } = useSeason()

// Format dinner date
const formattedDate = computed(() => {
  return format(new Date(props.dinnerEvent.date), 'EEEE d. MMMM', { locale: da })
})

const formattedShortDate = computed(() => {
  return format(new Date(props.dinnerEvent.date), 'dd/MM', { locale: da })
})

// Deadline warning
const deadlineWarning = computed(() => {
  if (props.dinnerEvent.state !== DinnerState.SCHEDULED) return null

  const canAnnounce = canAnnounceMenu(new Date(props.dinnerEvent.date))

  if (!canAnnounce) {
    return {
      level: 'critical',
      message: 'Deadline overskredet',
      color: COLOR.error
    }
  }

  // Calculate time until deadline (dinner start time)
  const now = new Date()
  const dinnerDate = new Date(props.dinnerEvent.date)
  const hoursUntil = (dinnerDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntil < 24) {
    return {
      level: 'urgent',
      message: `${Math.floor(hoursUntil)} timer tilbage`,
      color: COLOR.warning
    }
  }

  if (hoursUntil < 72) {
    return {
      level: 'warning',
      message: `${Math.floor(hoursUntil / 24)} dage tilbage`,
      color: COLOR.warning
    }
  }

  return null
})

// State badge configuration
const stateBadge = computed(() => {
  const configs = {
    [DinnerState.SCHEDULED]: {
      label: 'Planlagt',
      color: COLOR.neutral,
      icon: 'i-heroicons-calendar'
    },
    [DinnerState.ANNOUNCED]: {
      label: 'Annonceret',
      color: COLOR.success,
      icon: 'i-heroicons-megaphone'
    },
    [DinnerState.CANCELLED]: {
      label: 'Aflyst',
      color: COLOR.error,
      icon: 'i-heroicons-x-circle'
    },
    [DinnerState.CONSUMED]: {
      label: 'Afholdt',
      color: COLOR.neutral,
      icon: 'i-heroicons-check-circle'
    }
  }

  return configs[props.dinnerEvent.state as keyof typeof configs] || configs[DinnerState.SCHEDULED]
})

// Menu title or placeholder
const menuTitle = computed(() => {
  return props.dinnerEvent.menuTitle || 'Menu ikke annonceret'
})

const isMenuAnnounced = computed(() => {
  return props.dinnerEvent.menuTitle && props.dinnerEvent.menuTitle !== 'TBD'
})

// Handle card click
const handleClick = () => {
  emit('select', props.dinnerEvent.id)
}
</script>

<template>
  <UCard
    :name="`chef-dinner-card-${dinnerEvent.id}`"
    :ui="{
      root: 'cursor-pointer transition-all hover:scale-[1.02]',
      ring: selected ? 'ring-2 ring-primary' : ''
    }"
    @click="handleClick"
  >
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <!-- Date -->
        <div>
          <div class="text-sm font-semibold text-primary">
            {{ formattedShortDate }}
          </div>
          <div class="text-xs text-neutral-500 hidden md:block">
            {{ formattedDate }}
          </div>
        </div>

        <!-- State badge -->
        <UBadge
          :color="stateBadge.color"
          :icon="stateBadge.icon"
          variant="subtle"
          size="sm"
        >
          {{ stateBadge.label }}
        </UBadge>
      </div>

      <!-- Deadline warning (SCHEDULED only) -->
      <UAlert
        v-if="deadlineWarning"
        :color="deadlineWarning.color"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        class="mt-2"
        :ui="{ padding: 'p-2', title: 'text-xs' }"
      >
        <template #title>
          {{ deadlineWarning.message }}
        </template>
      </UAlert>
    </template>

    <!-- Menu title -->
    <div class="py-2">
      <div
        :class="[
          'text-sm',
          isMenuAnnounced ? 'font-medium' : 'italic text-neutral-500'
        ]"
      >
        {{ menuTitle }}
      </div>

      <!-- Chef info if announced -->
      <div
        v-if="dinnerEvent.chefId"
        class="text-xs text-neutral-500 mt-1"
      >
        Chefkok tildelt
      </div>
    </div>
  </UCard>
</template>
