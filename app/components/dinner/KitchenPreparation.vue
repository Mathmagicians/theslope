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
 * │                             100 KUVERTER                                    │
 * │           Voksen: 60 (50 kuv.) | Barn: 30 (15 kuv.) | Baby: 10              │
 * ├──────────────────────────┬─────────────────────┬──────────────┬────────────┤
 * │   TAKEAWAY - 38%         │  SPISESAL - 33%     │SPIS SENT-19% │TIL SALG-10%│
 * │                          │                     │              │            │
 * │    40 kuv.               │     35 kuv.         │   20 kuv.    │  5 kuv.    │
 * │                          │  Voksen: 25         │  Voksen: 15  │  6 pers.   │
 * │                          │  Barn: 8 | Baby: 2  │  Barn: 4     │            │
 * │                          │  = 35               │  Baby: 1 = 20│            │
 * │    🌾 Maria (2)          │   🥛 Anna (3)       │  🌾 Peter    │            │
 * └──────────────────────────┴─────────────────────┴──────────────┴────────────┘
 *
 * Panel content:
 * - TAKEAWAY: % + kuverter only
 * - SPISESAL/SPIS SENT: % + kuverter + ticket breakdown (Voksen/Barn/Baby = total)
 * - TIL SALG: % + kuverter + people count
 */
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {AffectedDiner} from '~/composables/useAllergy'
import type {DiningModeStats} from '~/composables/useOrder'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

// Ticket type breakdown for dine-in modes (chair planning)
interface TicketBreakdown {
  adult: number
  child: number
  baby: number
  total: number
}

// Extended stats with component-specific fields (allergies, chair planning)
interface ExtendedDiningModeStats extends DiningModeStats {
  ticketBreakdown: TicketBreakdown | null
  affectedDiners: AffectedDiner[]
}

interface Props {
  orders: OrderDetail[]
  allergens?: AllergyTypeDisplay[]  // Menu allergens to check against
}

const props = defineProps<Props>()

// Use business logic composables (ADR-001)
const {
  getActiveOrders,
  getReleasedOrders,
  calculateTotalPortionsFromPrices,
  calculateDiningModeStats,
  calculateNormalizedWidths
} = useOrder()
const {TicketTypeSchema, DinnerModeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum
const DinnerMode = DinnerModeSchema.enum
const {computeAffectedDiners} = useAllergy()
const {formatTicketCounts} = useBilling()
const {getHouseholdForInhabitant} = useHouseholdsStore()

// Panel expansion state
const selectedPanel = ref<string | null>(null)
const togglePanel = (key: string) => {
  selectedPanel.value = selectedPanel.value === key ? null : key
}

// Group orders by household for breakdown display
interface HouseholdBreakdownEntry {
  shortName: string
  orders: OrderDetail[]
}
const selectedPanelBreakdown = computed((): HouseholdBreakdownEntry[] => {
  if (!selectedPanel.value) return []
  const orders = getOrdersForMode(selectedPanel.value)

  const byHousehold = new Map<number, { household: HouseholdDisplay, orders: OrderDetail[] }>()
  for (const order of orders) {
    const household = getHouseholdForInhabitant(order.inhabitantId)
    if (!household) continue
    if (!byHousehold.has(household.id)) {
      byHousehold.set(household.id, { household, orders: [] })
    }
    byHousehold.get(household.id)!.orders.push(order)
  }

  return Array.from(byHousehold.values()).map(({ household, orders }) => ({
    shortName: getHouseholdShortName(household.address),
    orders
  }))
})

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

// Get orders for a specific mode (for extending base stats)
const getOrdersForMode = (key: string): OrderDetail[] => {
  if (key === 'RELEASED') return releasedOrders.value
  return activeOrders.value.filter(o => o.dinnerMode === key)
}

// Calculate dining mode statistics using composable, then extend with component-specific fields
const diningModeStats = computed((): ExtendedDiningModeStats[] => {
  // Get base stats from composable (percentage based on PORTIONS)
  const baseStats = calculateDiningModeStats(props.orders)

  // Extend with component-specific fields
  return baseStats.map(stat => {
    const modeOrders = getOrdersForMode(stat.key)

    // For dine-in modes, calculate ticket breakdown for chair planning
    const isDineIn = stat.key === DinnerMode.DINEIN || stat.key === DinnerMode.DINEINLATE
    const ticketBreakdown = (isDineIn || stat.key === 'RELEASED') && modeOrders.length > 0
      ? calculateTicketBreakdown(modeOrders)
      : null

    // Calculate affected diners for this mode (who has allergies matching menu allergens)
    const affectedResult = computeAffectedDiners(modeOrders, menuAllergenIds.value)
    const affectedDiners = affectedResult?.affectedList ?? []

    return {
      ...stat,
      ticketBreakdown,
      affectedDiners
    }
  })
})

// Use design system for kitchen panel colors
const { getKitchenPanelClasses, COMPONENTS, ICONS, TYPOGRAPHY } = useTheSlopeDesignSystem()

// Get background color classes for each dining mode
const getModeClasses = (key: string) => {
  return getKitchenPanelClasses(key as 'TAKEAWAY' | 'DINEIN' | 'DINEINLATE' | 'RELEASED')
}

// Normalize percentages: minimum 10% each, sum always equals 100%
const normalizedWidths = computed(() => calculateNormalizedWidths(diningModeStats.value))
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
          {{ Math.round(totalPortions) }} KUVERTER
        </div>
        <div class="text-xs md:text-sm text-gray-600 dark:text-gray-400 flex flex-wrap justify-center gap-x-2">
          <span class="whitespace-nowrap">Voksen: {{ ticketTypeBreakdown.adult }}</span>
          <span class="whitespace-nowrap">| Barn: {{ ticketTypeBreakdown.child }}</span>
          <span class="whitespace-nowrap">| Baby: {{ ticketTypeBreakdown.baby }}</span>
          <span class="whitespace-nowrap font-semibold">| # {{ ticketTypeBreakdown.adult + ticketTypeBreakdown.child + ticketTypeBreakdown.baby }}</span>
        </div>
      </div>
    </div>

    <!-- Bottom bar: Dining mode distribution - Proportional heights on mobile, widths on desktop -->
    <div class="flex flex-col md:flex-row overflow-hidden">
      <div
        v-for="mode in diningModeStats"
        :key="mode.key"
        :style="{ flex: `${normalizedWidths[mode.key]} 0 0` }"
        class="border-b md:border-b-0 md:border-r last:border-b-0 last:md:border-r-0 p-3 md:p-4 text-center min-w-0 box-border cursor-pointer"
        :class="getModeClasses(mode.key)"
        @click="togglePanel(mode.key)"
      >
        <!-- Header with label, percentage, and chevron (only if content exists) -->
        <div :class="TYPOGRAPHY.kitchenLabel" class="truncate flex items-center justify-center gap-1">
          {{ mode.label }}
          <UIcon v-if="getOrdersForMode(mode.key).length > 0" :name="selectedPanel === mode.key ? ICONS.chevronUp : ICONS.chevronDown" class="size-4" />
        </div>
        <div :class="TYPOGRAPHY.kitchenSecondary">
          {{ mode.percentage }}%
        </div>

        <!-- Portions (main number) -->
        <div :class="TYPOGRAPHY.kitchenMain">
          {{ mode.portions }} kuv.
        </div>

        <!-- Ticket breakdown for dine-in modes (chair planning) -->
        <div v-if="mode.ticketBreakdown" :class="TYPOGRAPHY.kitchenDetail" class="flex flex-wrap justify-center gap-x-1">
          <span class="whitespace-nowrap">Voksen: {{ mode.ticketBreakdown.adult }}</span>
          <span class="whitespace-nowrap">| Barn: {{ mode.ticketBreakdown.child }}</span>
          <span class="whitespace-nowrap">| Baby: {{ mode.ticketBreakdown.baby }}</span>
          <span class="whitespace-nowrap font-semibold"># {{ mode.ticketBreakdown.total }}</span>
        </div>


        <!-- Affected Diners (allergies matching menu) -->
        <div v-if="mode.affectedDiners && mode.affectedDiners.length > 0" :class="TYPOGRAPHY.kitchenDetail" class="border-t pt-2">
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

    <!-- Household breakdown (shown when panel selected) -->
    <div v-if="selectedPanel && selectedPanelBreakdown.length > 0" :class="getModeClasses(selectedPanel)" class="px-8 md:px-32 py-6 md:py-8 max-h-64 overflow-y-auto text-left">
      <div v-for="entry in selectedPanelBreakdown" :key="entry.shortName" :class="TYPOGRAPHY.kitchenDetail" class="py-1">
        <span class="font-semibold">{{ entry.shortName }}</span> · {{ formatTicketCounts(entry.orders) }} · {{ entry.orders.map(o => o.inhabitant.name).join(', ') }}
      </div>
    </div>
  </div>
</template>
