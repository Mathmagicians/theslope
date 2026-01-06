<script setup lang="ts">
/**
 * DinnerTicket - Visual ticket card with 🎟️ watermark
 *
 * ┌─────────────────────────────────────╮
 * │         ░░🎟️░░                     │
 * │         Voksen                      │
 * │ 📤  55 kr           🍽️ Spiser      │
 * ╰─────────────────────────────────────╯
 *
 * Left accent line: none (normal), blue (claimed), red (released)
 */
import type {DinnerMode, OrderState} from '~/composables/useBookingValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

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
  formMode?: FormMode
  disabledModes?: DinnerMode[]
  selectorName: string
}

const props = withDefaults(defineProps<Props>(), {
  isReleased: false,
  isClaimed: false,
  isGuest: false,
  formMode: FORM_MODES.VIEW,
  disabledModes: () => []
})

const emit = defineEmits<{
  'update:dinnerMode': [mode: DinnerMode]
}>()

const {TYPOGRAPHY, ICONS, SIZES} = useTheSlopeDesignSystem()
const {formatPrice} = useTicket()

const accentClass = computed(() => {
  if (props.isReleased) return 'border-l-4 border-error'
  if (props.isClaimed) return 'border-l-4 border-info'
  return ''
})

const isEditMode = computed(() => props.formMode === FORM_MODES.EDIT)
</script>

<template>
  <div
    class="relative overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800/50 p-1.5 md:p-2"
    :class="accentClass"
  >
    <!-- 🎟️ Background watermark - oversized to create border effect -->
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

      <!-- Row 2: [State] Price | Mode -->
      <div class="flex items-center justify-between gap-2">
        <!-- Left: State icon (if released) + Price -->
        <div class="flex items-center gap-1">
          <UIcon
            v-if="isReleased"
            name="i-heroicons-arrow-up-tray"
            class="w-4 h-4 text-error"
          />
          <span :class="[TYPOGRAPHY.finePrint, 'text-gray-600 dark:text-gray-400 whitespace-nowrap']">
            {{ formatPrice(price) }} kr
          </span>
        </div>

        <!-- Right: Mode (VIEW or EDIT) -->
        <DinnerModeSelector
          v-if="!isEditMode"
          :model-value="dinnerMode"
          :form-mode="FORM_MODES.VIEW"
          :size="SIZES.small"
          :name="`${selectorName}-view`"
        />
        <DinnerModeSelector
          v-else
          :model-value="dinnerMode"
          :form-mode="FORM_MODES.EDIT"
          :disabled-modes="disabledModes"
          :size="SIZES.small"
          :name="`${selectorName}-edit`"
          @update:model-value="(mode: DinnerMode) => emit('update:dinnerMode', mode)"
        />
      </div>
    </div>
  </div>
</template>
