<script setup lang="ts">
/**
 * DinnerMenuHero - Hero panel with booking section
 *
 * Mobile-first booking interface for busy families (90% mobile usage)
 * Reuses DinnerModeSelector for consistent UX with household preferences
 * Single-click edit: VIEW mode shows bookings, [ÆNDRE BOOKING] button enters EDIT mode
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * EMPTY STATE (no dinner event):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UPageHero (mocha gradient background)                              │
 * │                                                                     │
 * │                           🍽️                                        │
 * │                                                                     │
 * │              Ingen fællesspisning denne dag                         │
 * │                                                                     │
 * │        Vælg en anden dato i kalenderen for at                       │
 * │              se menuoplysninger                                     │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * VIEW MODE - Show who's booked (no prices):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UPageHero - 🍽️ Pasta Carbonara                                     │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │   ┌───────────────────────────────────────────────────────┐    │ │
 * │ │   │ BOOKING SECTION                                       │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │ [Voksen]  👤 Anna      🍽️                           │    │ │
 * │ │   │ [Voksen]  👤 Bob       🍽️                           │    │ │
 * │ │   │ [Barn]    👤 Clara     🍽️                           │    │ │
 * │ │   │ [Baby]    👤 David     ❌                            │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │              [ÆNDRE BOOKING]                          │    │ │
 * │ │   │                                                       │    │ │
 * │ │   └───────────────────────────────────────────────────────┘    │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * EDIT MODE - DESKTOP (horizontal DinnerModeSelector):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UPageHero                                                           │
 * │ ┌─────────────────────────────────────────────────────────────────┐ │
 * │ │   ┌───────────────────────────────────────────────────────┐    │ │
 * │ │   │ [⚡ Power mode: Opdater hele familien]               │    │ │
 * │ │   │ ───────────────────────────────────────────────────── │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │ [Voksen] 👤 Anna  [🍽️][🕐][🛍️][❌]       60 kr    │    │ │
 * │ │   │                    ^^^^                               │    │ │
 * │ │   │ [Voksen] 👤 Bob   [🍽️][🕐][🛍️][❌]       60 kr    │    │ │
 * │ │   │                    ^^^^                               │    │ │
 * │ │   │ [Barn] 👤 Clara   [🍽️][🕐][🛍️][❌]       30 kr    │    │ │
 * │ │   │                    ^^^^                               │    │ │
 * │ │   │ [Baby] 👤 David   [🍽️][🕐][🛍️][❌]        0 kr    │    │ │
 * │ │   │                           ^^^^                        │    │ │
 * │ │   │ ───────────────────────────────────────────────────── │    │ │
 * │ │   │ [+] Tilføj gæst                                       │    │ │
 * │ │   │ ───────────────────────────────────────────────────── │    │ │
 * │ │   │                                  Total: 150 kr        │    │ │
 * │ │   │                                                       │    │ │
 * │ │   │              [Annuller] [💾 Gem]                      │    │ │
 * │ │   └───────────────────────────────────────────────────────┘    │ │
 * │ └─────────────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * EDIT MODE - MOBILE (vertical DinnerModeSelector):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ┌───────────────────────────────────┐
 * │ UPageHero                         │
 * │ ┌───────────────────────────────┐ │
 * │ │ ┌───────────────────────────┐ │ │
 * │ │ │ [⚡ Power mode]          │ │ │
 * │ │ ├───────────────────────────┤ │ │
 * │ │ │                           │ │ │
 * │ │ │ [Voksen] 👤 Anna         │ │ │
 * │ │ │ [🍽️ Spis]               │ │ │
 * │ │ │ [🕐 Sen]                 │ │ │
 * │ │ │ [🛍️ Takeaway]           │ │ │
 * │ │ │ [❌ Ingen]               │ │ │
 * │ │ │                  60 kr    │ │ │
 * │ │ │                           │ │ │
 * │ │ │ [Voksen] 👤 Bob          │ │ │
 * │ │ │ [🍽️ Spis]               │ │ │
 * │ │ │ [🕐 Sen]                 │ │ │
 * │ │ │ [🛍️ Takeaway]           │ │ │
 * │ │ │ [❌ Ingen]               │ │ │
 * │ │ │                  60 kr    │ │ │
 * │ │ ├───────────────────────────┤ │ │
 * │ │ │ [+] Tilføj gæst          │ │ │
 * │ │ ├───────────────────────────┤ │ │
 * │ │ │         Total: 150 kr     │ │ │
 * │ │ │                           │ │ │
 * │ │ │ [Annuller] [💾 Gem]      │ │ │
 * │ │ └───────────────────────────┘ │ │
 * │ └───────────────────────────────┘ │
 * └───────────────────────────────────┘
 *
 * Features:
 * - UPageHero for responsive hero structure
 * - Empty state when no dinner event
 * - VIEW mode: Show all household members with their bookings
 * - Prominent [ÆNDRE BOOKING] button (single click to edit)
 * - EDIT mode: Inline DinnerModeSelector (responsive: horizontal desktop, vertical mobile)
 * - Power mode for family-wide booking updates
 * - Total price calculation
 * - TODO: Add guest functionality
 * - TODO: Ticket price selection dropdown (when multiple prices per type)
 */
import type {DinnerEvent} from '~/composables/useDinnerEventValidation'
import type {AllergyWithRelations} from '~/composables/useAllergyValidation'
import type {Order} from '~/composables/useOrderValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {FORM_MODES} from '~/types/form'

interface Props {
  dinnerEvent?: DinnerEvent
  allergies?: AllergyWithRelations[]
  // Booking section data (optional - for specific dinner event view)
  orders?: Order[]
  ticketPrices?: TicketPrice[]
}

const props = withDefaults(defineProps<Props>(), {
  dinnerEvent: undefined,
  allergies: () => [],
  orders: () => [],
  ticketPrices: () => []
})

// Emit events for booking actions (parent handles business logic)
const emit = defineEmits<{
  updateBooking: [inhabitantId: number, dinnerMode: string, ticketPriceId: number]
  updateAllBookings: [dinnerMode: string]
  addGuest: []
}>()

// Store integration
const householdsStore = useHouseholdsStore()
const { myHousehold } = storeToRefs(householdsStore)

// Design system
const { BACKGROUNDS, TYPOGRAPHY, SIZES, COMPONENTS } = useTheSlopeDesignSystem()

// UI state for booking section
const formMode = ref(FORM_MODES.VIEW)
const isPowerModeActive = ref(false)

// Draft state for editing
const {DinnerModeSchema} = useDinnerEventValidation()
const DinnerMode = DinnerModeSchema.enum
const draftDinnerMode = ref<typeof DinnerMode[keyof typeof DinnerMode]>(DinnerMode.DINEIN)

// Calculate total price
const totalPrice = computed(() => {
  if (!props.orders || !props.dinnerEvent) return 0
  return props.orders
    .filter(o => o.dinnerEventId === props.dinnerEvent!.id)
    .reduce((sum, order) => sum + order.priceAtBooking, 0)
})

// Count booked inhabitants
const bookedCount = computed(() => {
  if (!props.orders || !props.dinnerEvent) return 0
  return props.orders.filter(o => o.dinnerEventId === props.dinnerEvent!.id).length
})
</script>

<template>
  <!-- Empty state when no dinner event -->
  <UPageHero
    v-if="!dinnerEvent"
    :class="BACKGROUNDS.hero.mocha"
    class="min-h-[300px] md:min-h-[400px]"
  >
    <template #headline>
      <div class="text-6xl md:text-8xl">🍽️</div>
    </template>
    <template #title>
      Ingen fællesspisning denne dag
    </template>
    <template #description>
      Vælg en anden dato i kalenderen for at se menuoplysninger
    </template>
  </UPageHero>

  <!-- Dinner event content -->
  <UPageHero
    v-else
    :class="dinnerEvent.menuPictureUrl ? '' : BACKGROUNDS.hero.mocha"
    :style="dinnerEvent.menuPictureUrl
      ? `background-image: url(${dinnerEvent.menuPictureUrl}); background-size: cover; background-position: center;`
      : ''"
    class="min-h-[300px] md:min-h-[400px]"
    data-testid="dinner-menu-hero"
  >
    <template #top>
      <!-- Overlay for better text readability when image is present -->
      <div
        v-if="dinnerEvent.menuPictureUrl"
        class="absolute inset-0 bg-black/40 -z-10"
      />
    </template>

    <template #title>
      <span class="text-white" data-testid="dinner-menu-title">{{ dinnerEvent.menuTitle }}</span>
    </template>

    <template #description>
      <span v-if="dinnerEvent.menuDescription" class="text-white opacity-90">{{ dinnerEvent.menuDescription }}</span>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Allergies -->
        <div v-if="allergies.length > 0" class="flex flex-wrap justify-center gap-3 md:gap-4 text-sm md:text-base">
          <span
            v-for="allergy in allergies"
            :key="allergy.id"
            class="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white"
          >
            <span v-if="allergy.allergyType.icon">{{ allergy.allergyType.icon }}</span>
            <span>{{ allergy.allergyType.name }}</span>
          </span>
        </div>

        <!-- Booking Section -->
        <div v-if="myHousehold" class="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white">
          <!-- Booking Form -->
          <DinnerBookingForm
            :household="myHousehold"
            :dinner-event="dinnerEvent"
            :orders="orders"
            :ticket-prices="ticketPrices"
            :form-mode="formMode"
            @update-booking="emit('updateBooking', $event)"
            @update-all-bookings="emit('updateAllBookings', $event)"
          />

          <!-- VIEW mode: Prominent edit button -->
          <UButton
            v-if="formMode === FORM_MODES.VIEW"
            color="primary"
            variant="solid"
            size="lg"
            name="edit-booking"
            block
            class="mt-4"
            @click="formMode = FORM_MODES.EDIT"
          >
            ÆNDRE BOOKING
          </UButton>

          <!-- EDIT mode: Total price + Action buttons -->
          <div v-else-if="formMode === FORM_MODES.EDIT" class="mt-4 space-y-4">
            <!-- Total Price Footer -->
            <div class="border-t border-white/20 pt-4">
              <div class="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>{{ totalPrice }} kr</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="lg"
                name="cancel-booking"
                @click="formMode = FORM_MODES.VIEW; isPowerModeActive = false"
              >
                Annuller
              </UButton>
              <UButton
                color="primary"
                variant="solid"
                size="lg"
                name="save-booking"
                class="flex-1"
                @click="formMode = FORM_MODES.VIEW"
              >
                💾 Gem
              </UButton>
            </div>
          </div> <!-- Close EDIT mode div -->
        </div> <!-- Close booking section div -->
      </div> <!-- Close space-y-6 div -->
    </template> <!-- Close #body slot -->
  </UPageHero>
</template>
