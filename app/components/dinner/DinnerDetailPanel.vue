<script setup lang="ts">
/**
 * DinnerDetailPanel - Pure layout component for dinner detail pages
 *
 * ARCHITECTURE: Pure layout - receives data via props, pages own the data
 * No data fetching, no slot props - just layout structure
 *
 * PROPS:
 * - dinnerEvent: DinnerEventDetail | null - the dinner data (page owns this)
 * - ticketPrices: TicketPrice[] - ticket prices for the season
 * - isLoading: boolean - loading state
 * - isError: boolean - error state
 *
 * SLOTS (pure layout, no props):
 * - #hero  - Menu hero area (includes header via ChefMenuCard)
 * - #team  - Cooking team section
 * - #stats - Kitchen statistics section
 *
 * ADR COMPLIANCE:
 * - ADR-001: Types from validation composables
 * - ADR-007: Page owns data, layout receives via props
 * - ADR-010: Domain types throughout
 */
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {DinnerEventDetail} from '~/composables/useBookingValidation'

interface Props {
  dinnerEvent: DinnerEventDetail | null
  ticketPrices?: TicketPrice[]
  isLoading?: boolean
  isError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  ticketPrices: () => [],
  isLoading: false,
  isError: false
})

// Design system
const { TYPOGRAPHY, IMG, LAYOUTS, RESPONSIVE_ICONS } = useTheSlopeDesignSystem()

// Effective picture URL: use menu picture if available, otherwise default dinner picture
const effectivePictureUrl = computed(() =>
  props.dinnerEvent?.menuPictureUrl || IMG.defaultDinnerPicture
)

// Derived states
const hasNoDinnerSelected = computed(() => !props.dinnerEvent && !props.isLoading && !props.isError)
</script>

<template>
  <UPageBody class="!mt-0 !space-y-2 md:!space-y-8">
    <!-- Loading state -->
    <UPageCard v-if="isLoading" :class="LAYOUTS.cardResponsive">
      <Loader text="Henter fællesspisning..." />
    </UPageCard>

    <!-- Error state -->
    <UPageCard v-else-if="isError" :class="LAYOUTS.cardResponsive">
      <ViewError text="Kan ikke hente fællesspisning" />
    </UPageCard>

    <!-- No dinner selected -->
    <UPageCard
      v-else-if="hasNoDinnerSelected"
      :class="LAYOUTS.cardResponsive"
      :icon="RESPONSIVE_ICONS.arrowToMaster"
      title="Vælg en fællesspisning"
      description="Vælg en fællesspisning fra kalenderen for at se detaljer."
    />

    <!-- Main content when dinner is loaded -->
    <template v-else-if="dinnerEvent">
      <!-- #hero: Menu content with background image -->
      <UPageHero
data-testid="dinner-detail-panel"
        :class="LAYOUTS.cardResponsive"
        :ui="{
          root: `relative bg-cover bg-center min-h-[300px] md:min-h-[400px] overflow-hidden`
        }"
        :style="{ backgroundImage: `url(${effectivePictureUrl})` }"
      >
        <!-- Radial gradient overlay: transparent center (80%), dark edges for text readability -->
        <template #top>
          <div class="absolute inset-0 pointer-events-none bg-radial from-transparent from-80% to-black/60" />
        </template>

        <slot name="hero" />
      </UPageHero>

      <!-- #team: Cooking team section -->
      <UPageCard :class="`mt-1 md:mt-4 ${LAYOUTS.cardResponsive}`">
        <template #title>
          <h3 :class="TYPOGRAPHY.cardTitle">Hvem laver maden?</h3>
        </template>

        <slot name="team" />
      </UPageCard>

      <!-- #stats: Kitchen statistics section -->
      <UPageCard :class="`mt-1 md:mt-4 ${LAYOUTS.cardResponsive}`">
        <template #title>
          <h3 :class="TYPOGRAPHY.cardTitle">Hvem kommer og spiser?</h3>
        </template>

        <slot name="stats" />
      </UPageCard>
    </template>
  </UPageBody>
</template>
