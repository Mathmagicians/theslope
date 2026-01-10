<script setup lang="ts">
/**
 * DinnerTicket - Pure info display ticket card with 🎟️ watermark
 *
 * VIEW ONLY - No edit controls inside ticket
 * Edit controls are in the expanded row (DinnerBookingForm)
 *
 * ┌─────────────────────────────────────╮
 * │         ░░🎟️░░                     │
 * │         Voksen                      │
 * │ 📤  55 kr           🍽️ Spiser      │
 * ╰─────────────────────────────────────╯
 *
 * Left accent line: primary (normal), blue (claimed), red (released)
 */
import type {DinnerMode} from '~/composables/useBookingValidation'
import {FORM_MODES} from '~/types/form'
import type {NuxtUIColor} from '~/composables/useTheSlopeDesignSystem'

interface TicketConfig {
  label: string
  color: NuxtUIColor
  icon: string
}

interface Props {
  ticketConfig: TicketConfig | null
  price: number
  dinnerMode: DinnerMode
  isReleased?: boolean
  isClaimed?: boolean
  isGuest?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReleased: false,
  isClaimed: false,
  isGuest: false
})

const {TYPOGRAPHY, ICONS, SIZES} = useTheSlopeDesignSystem()
const {formatPrice} = useTicket()

// Left accent line color based on ticket state
const accentClass = computed(() => {
  if (props.isReleased) return 'border-l-4 md:border-l-8 border-error'
  if (props.isClaimed) return 'border-l-4 md:border-l-8 border-info'
  return 'border-l-4 md:border-l-8 border-primary'
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800/50 p-1.5 md:p-2"
    :class="accentClass"
  >
    <!-- 🎟️ Background watermark -->
    <div class="absolute -inset-2 md:-inset-4 flex items-center justify-center opacity-15 pointer-events-none">
      <UIcon :name="ICONS.ticket" class="w-24 h-24 md:w-32 md:h-32 text-gray-500 dark:text-gray-400" />
    </div>

    <!-- Ticket content -->
    <div class="relative z-10 space-y-0.5 md:space-y-1">
      <!-- Row 1: Ticket type (centered) -->
      <div class="text-center">
        <UBadge
          v-if="ticketConfig"
          :color="ticketConfig.color"
          variant="solid"
          :size="SIZES.small"
          class="uppercase"
        >
          {{ ticketConfig.label }}<template v-if="isGuest"> · Gæst</template>
        </UBadge>
      </div>

      <!-- Row 2: [State] Price | Mode (VIEW only) -->
      <div class="flex items-center justify-between gap-2">
        <!-- Left: State icon (fixed width for alignment) + Price -->
        <div class="flex items-center gap-1">
          <div class="w-4 h-4 flex-shrink-0">
            <UIcon
              v-if="isReleased"
              :name="ICONS.released"
              class="w-4 h-4 text-error"
            />
          </div>
          <span :class="[TYPOGRAPHY.cardTitle, 'text-gray-600 dark:text-gray-400 whitespace-nowrap']">
            {{ formatPrice(price) }} kr
          </span>
        </div>

        <!-- Right: Mode badge (VIEW only) -->
        <DinnerModeSelector
          :model-value="dinnerMode"
          :form-mode="FORM_MODES.VIEW"
          :size="SIZES.small"
          name="ticket-mode-view"
        />
      </div>
    </div>
  </div>
</template>
