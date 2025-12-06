<script setup lang="ts">
/**
 * KitchenPreparation - Kitchen statistics panel for dinner preparation
 *
 * Calculates kitchen stats from orders with dynamic ticket prices
 * NO HARDCODED CATEGORIES - Supports HUNGRY_BABY, VEGETARIAN_ADULT, etc.
 * Full-bleed design with no rounded corners for monitor-style layout
 * Mobile-first responsive design with proportional width bars
 *
 * Layout (Full Bleed):
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                          LAV MAD - 100%                                     │
 * │                       100 PORTIONER                                         │
 * │  Voksne: 60 (50 Standard + 10 Vegetar)  |  Børn: 30 (25 Normal + 5 Sulten) │
 * │  Baby: 10 (8 Normal + 2 Sulten) (0.5 portioner)                            │
 * ├──────────────────────────┬─────────────────────┬──────────────┬────────────┤
 * │   TAKEAWAY - 38%         │  SPIS HER - 33%     │SPIS SENT-19% │TIL SALG-10%│
 * │   (normalized: min 10% each, always shown, sums to 100%)                  │
 * │                          │                     │              │            │
 * │      50 personer         │    44 personer      │  25 personer │ 6 billetter│
 * │                          │                     │              │            │
 * │    40 portioner          │     35 stole        │   20 stole   │            │
 * │    40 tallerkener        │   33 tallerkener    │18 tallerkener│            │
 * │                          │                     │              │            │
 * │    🌾 Maria (2)          │   🥛 Anna (3)       │  🌾 Peter    │            │
 * │    🥚 Tom (1)            │   🥚 Lars (1)       │              │            │
 * │                          │                     │              │            │
 * └──────────────────────────┴─────────────────────┴──────────────┴────────────┘
 * ←─────────── 40% ─────────→←──────── 35% ──────→←──── 20% ───→←─── 5% ──→
 */
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {AffectedDiner} from '~/composables/useAllergy'

// Import DinnerMode from validation composable (ADR-001)
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum

// Statistics for one dining mode panel
interface DiningModeStats {
  key: typeof DinnerMode[keyof typeof DinnerMode] | 'RELEASED'
  label: string
  percentage: number
  count: number
  portions: number | null
  chairs: number | null
  plates: number | null
  affectedDiners: AffectedDiner[]
}

interface Props {
  orders: OrderDetail[]
  allergens?: AllergyTypeDisplay[]  // Menu allergens to check against
}

const props = defineProps<Props>()

// Use business logic composables (ADR-001)
const {getActiveOrders, getReleasedOrders, groupByTicketType, calculateTotalPortionsFromPrices, requiresChair} = useOrder()
const {computeAffectedDiners} = useAllergy()

// Menu allergen IDs for affected diner calculation
const menuAllergenIds = computed(() => props.allergens?.map(a => a.id) ?? [])

// Separate active orders (cooking for) from released orders (for sale)
const activeOrders = computed(() => getActiveOrders(props.orders))
const releasedOrders = computed(() => getReleasedOrders(props.orders))

// Group orders by ticket type (dynamic - supports any ticket type)
const ticketTypeGroups = computed(() => groupByTicketType(activeOrders.value))

// Calculate total portions using business logic (dynamic based on ticket prices)
const totalPortions = computed(() => calculateTotalPortionsFromPrices(activeOrders.value))

// Calculate dining mode statistics - always returns all modes with fallback 0 values
const diningModeStats = computed(() => {
  const total = props.orders.length || 1 // Avoid division by zero, use 1 as divisor for empty

  // Active dining modes (people eating)
  const modes = [DinnerMode.TAKEAWAY, DinnerMode.DINEIN, DinnerMode.DINEINLATE] as const
  const labels: Record<typeof modes[number], string> = {
    [DinnerMode.TAKEAWAY]: 'TAKEAWAY',
    [DinnerMode.DINEIN]: 'SPIS HER',
    [DinnerMode.DINEINLATE]: 'SPIS SENT'
  }

  const stats: DiningModeStats[] = modes.map(mode => {
    const modeOrders = activeOrders.value.filter(o => o.dinnerMode === mode)
    const count = modeOrders.length
    const portions = calculateTotalPortionsFromPrices(modeOrders)

    // For dine-in modes, calculate chairs (ADULT + CHILD, no BABY)
    const chairs = [DinnerMode.DINEIN, DinnerMode.DINEINLATE].includes(mode)
      ? modeOrders.filter(o => requiresChair(o.ticketPrice.ticketType)).length
      : null

    // Plates = portions rounded
    const plates = Math.round(portions)

    // Calculate percentage (0 if no orders)
    const percentage = props.orders.length > 0 ? Math.round((count / total) * 100) : 0

    // Calculate affected diners for this mode (who has allergies matching menu allergens)
    const affectedResult = computeAffectedDiners(modeOrders, menuAllergenIds.value)
    const affectedDiners = affectedResult?.affectedList ?? []

    return {
      key: mode,
      label: labels[mode],
      percentage,
      count,
      portions: Math.round(portions),
      chairs,
      plates,
      affectedDiners
    }
  })

  // Add released tickets panel (always show - rightmost panel for tickets for sale)
  const releasedCount = releasedOrders.value.length
  const releasedAffectedResult = computeAffectedDiners(releasedOrders.value, menuAllergenIds.value)

  stats.push({
    key: 'RELEASED' as const,
    label: 'TIL SALG',
    percentage: props.orders.length > 0 ? Math.round((releasedCount / total) * 100) : 0,
    count: releasedCount,
    portions: null,
    chairs: null,
    plates: null,
    affectedDiners: releasedAffectedResult?.affectedList ?? []
  })

  return stats
})

// Use design system for kitchen panel colors
const { getKitchenPanelClasses, COMPONENTS } = useTheSlopeDesignSystem()

// Get background color classes for each dining mode
const getModeClasses = (key: string) => {
  return getKitchenPanelClasses(key as 'TAKEAWAY' | 'DINEIN' | 'DINEINLATE' | 'RELEASED')
}

// Normalize percentages: minimum 10% each, sum always equals 100%
const normalizedWidths = computed(() => {
  const MIN_WIDTH = 10
  const stats = diningModeStats.value
  if (stats.length === 0) return {}

  // Apply minimum, track how much we've used
  const withMin = stats.map(s => ({ key: s.key, width: Math.max(s.percentage, MIN_WIDTH) }))
  const total = withMin.reduce((sum, s) => sum + s.width, 0)

  // Scale to 100% if needed
  const scale = total > 0 ? 100 / total : 1
  return Object.fromEntries(withMin.map(s => [s.key, s.width * scale]))
})
</script>

<template>
  <div>
    <!-- Top bar: LAV MAD - 100% -->
    <div :class="COMPONENTS.kitchenStatsBar">
      <div class="text-center">
        <div class="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400">
          FÆLLES MAD - 100% ØKOLOGI OG 💚
        </div>
        <div class="text-2xl md:text-3xl lg:text-4xl font-bold">
          {{ Math.round(totalPortions) }} PORTIONER
        </div>
        <div class="text-xs md:text-sm text-gray-600 dark:text-gray-400 flex flex-wrap justify-center gap-2 md:gap-4">
          <template v-for="(group, index) in ticketTypeGroups" :key="group.ticketType">
            <span v-if="index > 0">|</span>
            <span>{{ group.ticketType }}: {{ group.count }} ({{ Math.round(group.portions ) }} port.)</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Bottom bar: Dining mode distribution - Proportional heights on mobile, widths on desktop -->
    <div class="flex flex-col md:flex-row overflow-hidden">
      <div
        v-for="mode in diningModeStats"
        :key="mode.key"
        :style="{ flex: `${normalizedWidths[mode.key]} 0 0` }"
        class="border-b md:border-b-0 md:border-r last:border-b-0 last:md:border-r-0 p-3 md:p-4 text-center min-w-0 box-border"
        :class="getModeClasses(mode.key)"
      >
        <!-- Header with label and percentage -->
        <div class="font-semibold text-xs md:text-sm truncate">
          {{ mode.label }}
        </div>
        <div class="text-xs md:text-sm font-medium opacity-90">
          {{ mode.percentage }}%
        </div>

        <!-- People count -->
        <div class="font-bold text-base md:text-lg">
          {{ mode.count }}
        </div>

        <!-- Portions (for modes that need food) -->
        <div v-if="mode.portions !== null" class="text-xs md:text-sm">
          {{ mode.portions }} port.
        </div>

        <!-- Chairs (for dine-in modes) -->
        <div v-if="mode.chairs !== null" class="text-xs md:text-sm">
          {{ mode.chairs }} stole
        </div>

        <!-- Plates -->
        <div v-if="mode.plates !== null" class="text-xs md:text-sm">
          {{ mode.plates }} tallerk.
        </div>

        <!-- Affected Diners (allergies matching menu) -->
        <div v-if="mode.affectedDiners && mode.affectedDiners.length > 0" class="text-xs border-t pt-2">
          <div
            v-for="diner in mode.affectedDiners"
            :key="diner.inhabitant.id"
            class="flex items-center justify-center gap-1 truncate"
          >
            <span v-if="diner.matchingAllergens[0]?.icon">{{ diner.matchingAllergens[0].icon }}</span>
            <span class="truncate">{{ diner.inhabitant.name }}</span>
            <span v-if="diner.matchingAllergens.length > 1">({{ diner.matchingAllergens.length }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
