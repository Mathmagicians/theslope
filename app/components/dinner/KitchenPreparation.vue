<script setup lang="ts">
/**
 * KitchenPreparation - Kitchen statistics panel for dinner preparation
 *
 * Calculates kitchen stats from orders with dynamic ticket prices
 * Full-bleed design with no rounded corners for monitor-style layout
 * Mobile-first responsive design with proportional width bars
 *
 * Layout (Full Bleed):
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                          FÆLLES MAD - 100% ØKOLOGI                          │
 * │                             100 PORTIONER                                   │
 * │           Voksen: 60 (50 port.) | Barn: 30 (15 port.) | Baby: 10            │
 * ├──────────────────────────┬─────────────────────┬──────────────┬────────────┤
 * │   TAKEAWAY - 38%         │  SPISESAL - 33%     │SPIS SENT-19% │TIL SALG-10%│
 * │                          │                     │              │            │
 * │    40 port.              │     35 port.        │   20 port.   │  5 port.   │
 * │                          │  Voksen: 25         │  Voksen: 15  │  6 pers.   │
 * │                          │  Barn: 8 | Baby: 2  │  Barn: 4     │            │
 * │                          │  = 35               │  Baby: 1 = 20│            │
 * │    🌾 Maria (2)          │   🥛 Anna (3)       │  🌾 Peter    │            │
 * └──────────────────────────┴─────────────────────┴──────────────┴────────────┘
 *
 * Panel content:
 * - TAKEAWAY: % + portions only
 * - SPISESAL/SPIS SENT: % + portions + ticket breakdown (Voksen/Barn/Baby = total)
 * - TIL SALG: % + portions + people count
 */
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {AffectedDiner} from '~/composables/useAllergy'

// Import DinnerMode from validation composable (ADR-001)
const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum

// Ticket type breakdown for dine-in modes (chair planning)
interface TicketBreakdown {
  adult: number
  child: number
  baby: number
  total: number
}

// Statistics for one dining mode panel
interface DiningModeStats {
  key: typeof DinnerMode[keyof typeof DinnerMode] | 'RELEASED'
  label: string
  percentage: number
  portions: number
  peopleCount: number // Total people/orders
  ticketBreakdown: TicketBreakdown | null // Only for DINEIN/DINEINLATE
  affectedDiners: AffectedDiner[]
}

interface Props {
  orders: OrderDetail[]
  allergens?: AllergyTypeDisplay[]  // Menu allergens to check against
}

const props = defineProps<Props>()

// Use business logic composables (ADR-001)
const {getActiveOrders, getReleasedOrders, calculateTotalPortionsFromPrices} = useOrder()
const {TicketTypeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum
const {computeAffectedDiners} = useAllergy()

// Menu allergen IDs for affected diner calculation
const menuAllergenIds = computed(() => props.allergens?.map(a => a.id) ?? [])

// Separate active orders (cooking for) from released orders (for sale)
const activeOrders = computed(() => getActiveOrders(props.orders))
const releasedOrders = computed(() => getReleasedOrders(props.orders))

// Group orders by ticket type - always show all three types
// Uses ALL orders (active + released) to match totalPortions
const ticketTypeBreakdown = computed(() => {
  const orders = props.orders
  return {
    adult: orders.filter(o => o.ticketType === TicketType.ADULT).length,
    child: orders.filter(o => o.ticketType === TicketType.CHILD).length,
    baby: orders.filter(o => o.ticketType === TicketType.BABY).length
  }
})

// Calculate total portions using business logic (dynamic based on ticket prices)
// Includes ALL orders (active + released) so it matches sum of all 4 bottom panels
const totalPortions = computed(() => calculateTotalPortionsFromPrices(props.orders))

// Helper to calculate ticket breakdown for dine-in modes
const calculateTicketBreakdown = (orders: OrderDetail[]): TicketBreakdown => {
  const adult = orders.filter(o => o.ticketType === TicketType.ADULT).length
  const child = orders.filter(o => o.ticketType === TicketType.CHILD).length
  const baby = orders.filter(o => o.ticketType === TicketType.BABY).length
  return { adult, child, baby, total: adult + child + baby }
}

// Calculate dining mode statistics - always returns all modes with fallback 0 values
const diningModeStats = computed(() => {
  const total = props.orders.length || 1 // Avoid division by zero, use 1 as divisor for empty

  // Active dining modes (people eating)
  const modes = [DinnerMode.TAKEAWAY, DinnerMode.DINEIN, DinnerMode.DINEINLATE] as const
  const labels: Record<typeof modes[number], string> = {
    [DinnerMode.TAKEAWAY]: 'TAKEAWAY',
    [DinnerMode.DINEIN]: 'SPISESAL',
    [DinnerMode.DINEINLATE]: 'SPIS SENT'
  }

  const stats: DiningModeStats[] = modes.map(mode => {
    const modeOrders = activeOrders.value.filter(o => o.dinnerMode === mode)
    const count = modeOrders.length
    const portions = calculateTotalPortionsFromPrices(modeOrders)

    // For dine-in modes, calculate ticket breakdown for chair planning
    const isDineIn = mode === DinnerMode.DINEIN || mode === DinnerMode.DINEINLATE
    const ticketBreakdown = isDineIn ? calculateTicketBreakdown(modeOrders) : null

    // Calculate percentage (0 if no orders)
    const percentage = props.orders.length > 0 ? Math.round((count / total) * 100) : 0

    // Calculate affected diners for this mode (who has allergies matching menu allergens)
    const affectedResult = computeAffectedDiners(modeOrders, menuAllergenIds.value)
    const affectedDiners = affectedResult?.affectedList ?? []

    return {
      key: mode,
      label: labels[mode]!,
      percentage,
      portions: Math.round(portions),
      peopleCount: count,
      ticketBreakdown,
      affectedDiners
    }
  })

  // Add released tickets panel (always show - rightmost panel for tickets for sale)
  const releasedCount = releasedOrders.value.length
  const releasedPortions = calculateTotalPortionsFromPrices(releasedOrders.value)
  const releasedAffectedResult = computeAffectedDiners(releasedOrders.value, menuAllergenIds.value)

  stats.push({
    key: 'RELEASED' as const,
    label: 'TIL SALG',
    percentage: props.orders.length > 0 ? Math.round((releasedCount / total) * 100) : 0,
    portions: Math.round(releasedPortions),
    peopleCount: releasedCount,
    ticketBreakdown: releasedCount > 0 ? calculateTicketBreakdown(releasedOrders.value) : null,
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
        <div class="text-xs md:text-sm text-gray-600 dark:text-gray-400 flex flex-wrap justify-center gap-x-2">
          <span class="whitespace-nowrap">Voksen: {{ ticketTypeBreakdown.adult }}</span>
          <span class="whitespace-nowrap">| Barn: {{ ticketTypeBreakdown.child }}</span>
          <span class="whitespace-nowrap">| Baby: {{ ticketTypeBreakdown.baby }}</span>
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

        <!-- Portions (main number) -->
        <div class="font-bold text-base md:text-lg">
          {{ mode.portions }} port.
        </div>

        <!-- Ticket breakdown for dine-in modes (chair planning) -->
        <div v-if="mode.ticketBreakdown" class="text-xs md:text-sm flex flex-wrap justify-center gap-x-1">
          <span class="whitespace-nowrap">Voksen: {{ mode.ticketBreakdown.adult }}</span>
          <span class="whitespace-nowrap">| Barn: {{ mode.ticketBreakdown.child }}</span>
          <span class="whitespace-nowrap">| Baby: {{ mode.ticketBreakdown.baby }}</span>
          <span class="whitespace-nowrap font-semibold">= {{ mode.ticketBreakdown.total }}</span>
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
