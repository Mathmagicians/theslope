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
  guestCount?: number // undefined = not guest, 1+ = guest ticket(s)
  ticketCount?: number // DEBUG: total orders for inhabitant (shown if > 1)
  consensus?: boolean // Power mode: true=all agree, false=mixed, undefined=not power mode
  allergies?: string[] // Inhabitant's own allergies (shown on ticket)
  provenanceHousehold?: string // Source household if claimed
}

const props = withDefaults(defineProps<Props>(), {
  isReleased: false,
  isClaimed: false,
  guestCount: undefined,
  ticketCount: undefined,
  consensus: undefined,
  allergies: () => [],
  provenanceHousehold: undefined
})

const isGuest = computed(() => props.guestCount !== undefined)

const {TYPOGRAPHY, ICONS, SIZES, COLOR, TEXT, BG, getOrderStateColor} = useTheSlopeDesignSystem()
const {formatPrice} = useTicket()

// Accent color from design system
const accentColor = computed(() => getOrderStateColor(props.isReleased, props.isClaimed))

// Both-side accent line class
const accentClass = computed(() => `border-x-4 md:border-x-8 border-${accentColor.value}`)

// State icon color (matches accent)
const stateIconColor = computed(() => `text-${accentColor.value}`)

// Has allergies to show
const hasAllergies = computed(() => props.allergies && props.allergies.length > 0)

// Has extra info row (provenance or allergy names)
const hasExtraRow = computed(() => props.provenanceHousehold || hasAllergies.value)

// Combined badge text: "VOKSEN · 55kr" or "BARN · 35kr · 2 Gæster" or "Powermode!" (no price for power mode)
// DEBUG: Shows "#3" if ticketCount > 1 (duplicate orders)
const badgeText = computed(() => {
  const parts = [props.ticketConfig?.label ?? '']
  if (props.consensus === undefined) parts.push(`${formatPrice(props.price)} kr`) // Only show price for regular tickets
  if (isGuest.value) {
    parts.push(props.guestCount === 1 ? 'Gæst' : `${props.guestCount} Gæster`)
  }
  if (props.ticketCount && props.ticketCount > 1) {
    parts.push(`#${props.ticketCount}`)
  }
  return parts.join(' · ')
})
</script>

<template>
  <div
    :class="[`relative overflow-hidden rounded-lg ${BG.ticket} p-2 md:p-3 w-full`, accentClass]"
  >
    <!-- 🎟️ Watermark - sized to look like the ticket border -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <UIcon name="i-heroicons-ticket-solid" :class="`w-full h-[140%] opacity-[0.12] ${TEXT.dimmed}`" />
    </div>

    <!-- Ticket content -->
    <div class="relative z-10 space-y-1">
      <!-- ROW 1: [State] [Badge] ... [Allergy icon] [Mode] [Label] -->
      <div class="flex items-center justify-between gap-2">
        <!-- Left: Fixed icon slot + Combined badge -->
        <div class="flex items-center gap-2">
          <!-- Fixed-width icon slot (reserves space even when empty for alignment) -->
          <div class="w-5 md:w-6 flex-shrink-0 flex items-center justify-center">
            <UIcon
              v-if="isReleased"
              :name="ICONS.released"
              class="size-5 md:size-6"
              :class="stateIconColor"
            />
            <UIcon
              v-else-if="isClaimed"
              :name="ICONS.claim"
              class="size-5 md:size-6"
              :class="stateIconColor"
            />
            <UIcon
              v-else-if="isGuest"
              :name="ICONS.userPlus"
              class="size-5 md:size-6 text-info"
            />
          </div>

          <!-- Combined badge: Type · Price · Gæst(er) -->
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
            :consensus="consensus"
            show-label
          />
        </div>
      </div>

      <!-- ROW 2 (optional): [Provenance] [Allergy names] -->
      <div v-if="hasExtraRow" class="flex items-center gap-2 pl-7 md:pl-8">
        <!-- Provenance household -->
        <span v-if="provenanceHousehold" :class="[TYPOGRAPHY.finePrint, TEXT.gray[500]]">
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
