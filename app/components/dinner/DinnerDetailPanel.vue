<script setup lang="ts">
/**
 * DinnerDetailPanel - Shared detail panel for dinner display
 *
 * Encapsulates the common structure used by both /dinner and /chef pages:
 * - DinnerMenuHero in header (with mode switching)
 * - "Hvem laver maden?" section with CookingTeamCard
 * - Kitchen statistics section with KitchenPreparation
 *
 * ADR Compliance:
 * - ADR-001: Types from validation composables
 * - ADR-007: Component-local useAsyncData for dinner detail
 * - ADR-010: Domain types throughout
 * - Mobile-first responsive design
 *
 * Props:
 * - dinnerEventId: ID of dinner to display (null when no selection)
 * - mode: DinnerMenuHero display mode ('household' | 'chef' | 'view')
 * - ticketPrices: Available ticket prices for booking
 *
 * Features:
 * - Fetches dinner detail with orders when dinnerEventId changes
 * - Handles loading/error states
 * - Shows appropriate empty states for no selection / no team / no orders
 * - Emits events for booking updates (household mode)
 * - Emits events for allergen updates (chef mode)
 */
import type {TicketPrice} from '~/composables/useTicketPriceValidation'

interface Props {
  dinnerEventId: number | null
  mode?: 'household' | 'chef' | 'view'
  ticketPrices?: TicketPrice[]
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'household',
  ticketPrices: () => []
})

const emit = defineEmits<{
  updateBooking: [inhabitantId: number, dinnerMode: string, ticketPriceId: number]
  updateAllBookings: [dinnerMode: string]
  addGuest: []
  updateAllergens: [allergenIds: number[]]
}>()

// Design system
const { COLOR, TYPOGRAPHY, LAYOUTS, COMPONENTS, SIZES } = useTheSlopeDesignSystem()

// Store integration for fetching
const planStore = usePlanStore()

// Validation schema for parsing dinner event detail
const { DinnerEventDetailSchema } = useBookingValidation()

// Component-local data: Fetch dinner detail with orders when selection changes (ADR-007)
const {
  data: dinnerEventDetail,
  status: dinnerEventDetailStatus,
  error: dinnerEventDetailError,
  refresh: refreshDinnerEventDetail
} = useAsyncData(
  computed(() => `dinner-detail-${props.dinnerEventId}`),
  () => props.dinnerEventId
    ? planStore.fetchDinnerEventDetail(props.dinnerEventId)
    : Promise.resolve(null),
  {
    default: () => null,
    watch: [() => props.dinnerEventId],
    immediate: true,
    transform: (data: any) => {
      if (!data) return null
      try {
        return DinnerEventDetailSchema.parse(data)
      } catch (e) {
        console.error('Error parsing dinner event detail:', e)
        throw e
      }
    }
  }
)

const orders = computed(() => dinnerEventDetail.value?.tickets ?? [])

// Status-derived computeds (ADR-007 pattern)
const isDinnerEventDetailLoading = computed(() => dinnerEventDetailStatus.value === 'pending')
const isDinnerEventDetailErrored = computed(() => dinnerEventDetailStatus.value === 'error')
const isDinnerEventDetailInitialized = computed(() => dinnerEventDetailStatus.value === 'success')
const isNoDinnerEventDetail = computed(() => isDinnerEventDetailInitialized.value && !dinnerEventDetail.value)
const hasNoDinnerSelected = computed(() => !props.dinnerEventId)
</script>

<template>
  <UCard :ui="{ rounded: '', header: { padding: 'p-0' }, body: { padding: 'p-0' } }">
    <!-- Menu Hero in header slot (full bleed) -->
    <template v-if="dinnerEventDetail" #header>
      <DinnerMenuHero
        :dinner-event="dinnerEventDetail"
        :ticket-prices="ticketPrices"
        :mode="mode"
        @update-booking="emit('updateBooking', $event)"
        @update-all-bookings="emit('updateAllBookings', $event)"
        @add-guest="emit('addGuest')"
        @update-allergens="emit('updateAllergens', $event)"
      />
    </template>

    <!-- Loading state -->
    <Loader v-if="isDinnerEventDetailLoading" text="Henter fællesspisning..." />

    <!-- Error state -->
    <ViewError v-else-if="isDinnerEventDetailErrored" text="Kan ikke hente fællesspisning" />

    <!-- No dinner selected -->
    <UAlert
      v-else-if="hasNoDinnerSelected"
      type="info"
      variant="soft"
      :color="COLOR.info"
      icon="i-heroicons-arrow-left"
    >
      <template #title>
        Vælg en fællesspisning
      </template>
      <template #description>
        Vælg en fællesspisning fra listen til venstre for at se detaljer.
      </template>
    </UAlert>

    <!-- No data returned (successful fetch but null) -->
    <UAlert
      v-else-if="isNoDinnerEventDetail"
      type="info"
      variant="soft"
      :color="COLOR.info"
      icon="i-heroicons-exclamation-circle"
    >
      <template #title>
        Fællesspisning ikke fundet
      </template>
      <template #description>
        Kunne ikke finde data for den valgte fællesspisning.
      </template>
    </UAlert>

    <!-- Kitchen Preparation in body -->
    <div v-else :class="LAYOUTS.sectionDivider">
      <div :class="LAYOUTS.sectionContentNoPadX">
        <h3 :class="`px-4 md:px-0 ${TYPOGRAPHY.cardTitle}`">Hvem laver maden?</h3>

        <!-- Cooking Team Display (Monitor Mode) -->
        <CookingTeamCard
          v-if="dinnerEventDetail?.cookingTeamId"
          :team-id="dinnerEventDetail.cookingTeamId"
          :team-number="dinnerEventDetail.cookingTeamId"
          mode="monitor"
        />

        <!-- No cooking team assigned -->
        <UAlert
          v-else
          variant="soft"
          :color="COLOR.neutral"
          :avatar="{ text: '🏃‍♀️🏃‍♂️', size: SIZES.emptyStateAvatar.value }"
          :ui="COMPONENTS.emptyStateAlert"
        >
          <template #title>
            👥 Køkkenholdet er løbet ud at lege
          </template>
          <template #description>
            Intet madhold tildelt endnu
          </template>
        </UAlert>
      </div>

      <!-- Kitchen statistics section -->
      <div :class="LAYOUTS.sectionContent">
        <h3 :class="TYPOGRAPHY.cardTitle">Køkkenstatistik</h3>

        <!-- No orders yet -->
        <UAlert
          v-if="orders.length === 0"
          type="info"
          variant="soft"
          :color="COLOR.info"
          icon="i-heroicons-ticket"
        >
          <template #title>
            Ingen billetter endnu
          </template>
          <template #description>
            Der er endnu ikke bestilt nogen billetter til denne fællesspisning.
          </template>
        </UAlert>

        <!-- Kitchen statistics -->
        <KitchenPreparation v-else :orders="orders" />
      </div>
    </div>
  </UCard>
</template>
