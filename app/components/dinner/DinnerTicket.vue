<script setup lang="ts">
/**
 * DinnerTicket - Compact ticket stub display (VIEW ONLY)
 *
 * Edit controls are in the expanded row (DinnerBookingForm)
 *
 * STATES: normal (no icon), released (📤), claimed (🎟️)
 * PROPS: isGuest adds "Gæst" to badge, NOT a state
 *
 * ┃                                                    ░░░░░░░░┃
 * ┃  [VOKSEN · 55kr]              [🍽️] Spisesal       ░░🎟️░░░┃  NORMAL
 * ┃                                                    ░░░░░░░░┃
 * ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
 *  ↑ primary accent                              watermark ↗
 *
 * ┃                                                    ░░░░░░░░┃
 * ┃  📤 [VOKSEN · 55kr]           [❌] Ingen          ░░🎟️░░░┃  RELEASED
 * ┃                                                    ░░░░░░░░┃
 * ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
 *  ↑ error accent
 *
 * ┃                                                    ░░░░░░░░┃
 * ┃  🎟️ [VOKSEN · 55kr]           [🍽️] Spisesal      ░░🎟️░░░┃  CLAIMED
 * ┃     fra Hansen                🥜 Gluten, Nødder   ░░░░░░░░┃  (row 2)
 * ┃                                                    ░░░░░░░░┃
 * ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
 *  ↑ info accent
 *
 * ROW 1: [StateIcon?] [Type·Price·Gæst?]  ...  [ModeIcon] ModeLabel
 * ROW 2: (optional) "fra Household"  [🥜 Allergies badge]
 *
 * Accent border color: normal=primary, released=error, claimed=info
 * Mode labels: Spisesal | Sen | Takeaway | Ingen
 */
import type {DinnerMode} from '~/composables/useBookingValidation'
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
  allergies?: string[] // Inhabitant's own allergies (shown on ticket)
  provenanceHousehold?: string // Source household if claimed
}

const props = withDefaults(defineProps<Props>(), {
  isReleased: false,
  isClaimed: false,
  isGuest: false,
  allergies: () => [],
  provenanceHousehold: undefined
})

const {TYPOGRAPHY, ICONS, SIZES, COLOR} = useTheSlopeDesignSystem()
const {formatPrice} = useTicket()

// Both-side accent line color based on ticket state
const accentClass = computed(() => {
  if (props.isReleased) return 'border-x-4 md:border-x-8 border-error'
  if (props.isClaimed) return 'border-x-4 md:border-x-8 border-info'
  return 'border-x-4 md:border-x-8 border-primary'
})

// State icon color (matches accent)
const stateIconColor = computed(() => {
  if (props.isReleased) return 'text-error'
  if (props.isClaimed) return 'text-info'
  return 'text-primary'
})

// Has allergies to show
const hasAllergies = computed(() => props.allergies && props.allergies.length > 0)

// Has extra info row (provenance or allergy names)
const hasExtraRow = computed(() => props.provenanceHousehold || hasAllergies.value)

// Combined badge text: "VOKSEN · 55kr" or "BARN · 35kr · Gæst"
const badgeText = computed(() => {
  const parts = [props.ticketConfig?.label ?? '']
  parts.push(`${formatPrice(props.price)} kr`)
  if (props.isGuest) parts.push('Gæst')
  return parts.join(' · ')
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2 md:p-3 w-full"
    :class="accentClass"
  >
    <!-- 🎟️ Dramatic oversize watermark - bleeds out like a real ticket stamp -->
    <div class="absolute -bottom-8 -right-6 md:-bottom-12 md:-right-8 opacity-[0.04] pointer-events-none rotate-[-15deg]">
      <UIcon :name="ICONS.ticket" class="size-40 md:size-56 text-gray-500 dark:text-gray-400" />
    </div>

    <!-- Ticket content -->
    <div class="relative z-10 space-y-1">
      <!-- ROW 1: [State] [Badge] ... [Allergy icon] [Mode] [Label] -->
      <div class="flex items-center justify-between gap-2">
        <!-- Left: State icon + Combined badge -->
        <div class="flex items-center gap-2">
          <!-- State icon (same color as accent) -->
          <UIcon
            v-if="isReleased"
            :name="ICONS.released"
            class="size-5 md:size-6 flex-shrink-0"
            :class="stateIconColor"
          />
          <UIcon
            v-else-if="isClaimed"
            :name="ICONS.ticket"
            class="size-5 md:size-6 flex-shrink-0"
            :class="stateIconColor"
          />

          <!-- Combined badge: Type · Price · Gæst -->
          <UBadge
            v-if="ticketConfig"
            :color="ticketConfig.color"
            variant="solid"
            :size="SIZES.small"
            class="uppercase whitespace-nowrap"
          >
            {{ badgeText }}
          </UBadge>
        </div>

        <!-- Right: Allergy icon + Mode icon + fineprint label -->
        <div class="flex items-center gap-1">
          <!-- Allergy indicator icon -->
          <UIcon
            v-if="hasAllergies"
            name="i-heroicons-exclamation-triangle"
            class="size-4 md:size-5 text-warning"
          />

          <!-- Mode badge (uses DinnerModeSelector in VIEW mode) -->
          <DinnerModeSelector
            :model-value="dinnerMode"
            show-label
          />
        </div>
      </div>

      <!-- ROW 2 (optional): [Provenance] [Allergy names] -->
      <div v-if="hasExtraRow" class="flex items-center gap-2 pl-7 md:pl-8">
        <!-- Provenance household -->
        <span v-if="provenanceHousehold" :class="[TYPOGRAPHY.finePrint, 'text-gray-500']">
          fra {{ provenanceHousehold }}
        </span>

        <!-- Allergy names badge -->
        <UBadge
          v-if="hasAllergies"
          :color="COLOR.warning"
          variant="soft"
          :size="SIZES.small"
        >
          🥜 {{ allergies.join(', ') }}
        </UBadge>
      </div>
    </div>
  </div>
</template>
