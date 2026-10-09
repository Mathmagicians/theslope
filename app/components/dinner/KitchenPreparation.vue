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
 * │    40 kuv.               │     35 kuv.         │   20 kuv.    │  5 kuv.    │
 * │  Voksen: 30              │  Voksen: 25         │  Voksen: 15  │  Voksen: 4 │
 * │  Barn: 6 | Baby: 4       │  Barn: 8 | Baby: 2  │  Barn: 4     │  Barn: 1   │
 * │  # 40                    │  # 35               │  Baby: 1 # 20│  # 5       │
 * │  (allergy) 2 kuv.        │  (allergy) 3,5 kuv. │              │            │
 * └──────────────────────────┴─────────────────────┴──────────────┴────────────┘
 *    pink + black              orange + black        ocean + black  gray + black
 *    RAINBOW[0]                RAINBOW[1]            RAINBOW[2]     neutral
 *
 * Expanded (SPISESAL selected), on the panel's surface below the row:
 * │  (allergy) 3,5 kuv. | (milk) Mælk · 2,5 | (wheat) Gluten · 1                │
 * │  S_31 · 2V 1B · Anna (wheat) Gluten (milk) Mælk, Bo, Emil                   │
 * │  N_12 · 1V · Maria (milk) Mælk                                              │
 *
 * Each panel: % + kuverter + ticket breakdown (Voksen/Barn/Baby + total) + the kuverter of its
 * diners carrying an allergen on the menu. The expanded list opens with the allergy overview, each
 * menu allergen by kuverter in the menu's order; every such diner carries one compact
 * AllergyTypeDisplay per menu allergen, its own icon and name. A household row centres every segment
 * on one line. A panel without such a diner, and a menu without allergens, show no allergy line and
 * no allergy types; the panel heads add up to the chef's allergen line.
 *
 * The three dining modes walk the brand rainbow in its order; TIL SALG stays grey, because a
 * released ticket on offer is not a dining mode. Fill, ink and divider come from
 * `COMPONENTS.kitchenPanel` (ADR-018); this component owns the layout and the numbers.
 */
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {AllergenOverview} from '~/composables/useAllergy'
import type {DiningModeStats} from '~/composables/useOrder'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'

interface TicketBreakdown {
  adult: number
  child: number
  baby: number
  total: number
}

// Extended stats with component-specific fields
interface ExtendedDiningModeStats extends DiningModeStats {
  ticketBreakdown: TicketBreakdown | null
  allergies: AllergenOverview
}

interface Props {
  orders: OrderDetail[]
  allergens?: AllergyTypeDisplay[]  // The menu's allergens, the only allergies the panels count
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
const {TicketTypeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum
const {computeAllergenOverview} = useAllergy()
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

    const ticketBreakdown = modeOrders.length > 0
      ? calculateTicketBreakdown(modeOrders)
      : null

    return {
      ...stat,
      ticketBreakdown,
      allergies: computeAllergenOverview(modeOrders, props.allergens ?? [])
    }
  })
})

const selectedPanelAllergies = computed(() =>
  diningModeStats.value.find(mode => mode.key === selectedPanel.value)?.allergies ?? null
)

const allergensByOrder = computed(() => new Map(
  selectedPanelAllergies.value?.affectedList.flatMap(diner => diner.orderIds.map(orderId => [orderId, diner.matchingAllergens] as const)) ?? []
))

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
      <div :class="COMPONENTS.kitchen.totals">
        <div :class="COMPONENTS.kitchen.totalsLabel">
          FÆLLES MAD - 100% ØKOLOGI OG 💚
        </div>
        <div :class="COMPONENTS.kitchen.totalsMain">
          {{ Math.round(totalPortions) }} KUVERTER
        </div>
        <div :class="COMPONENTS.kitchen.totalsBreakdown">
          <span :class="COMPONENTS.kitchen.figure">Voksen: {{ ticketTypeBreakdown.adult }}</span>
          <span :class="COMPONENTS.kitchen.figure">| Barn: {{ ticketTypeBreakdown.child }}</span>
          <span :class="COMPONENTS.kitchen.figure">| Baby: {{ ticketTypeBreakdown.baby }}</span>
          <span :class="COMPONENTS.kitchen.figureTotal">| # {{ ticketTypeBreakdown.adult + ticketTypeBreakdown.child + ticketTypeBreakdown.baby }}</span>
        </div>
      </div>
    </div>

    <!-- Bottom bar: Dining mode distribution - Proportional heights on mobile, widths on desktop -->
    <div :class="COMPONENTS.kitchen.panels">
      <div
        v-for="mode in diningModeStats"
        :key="mode.key"
        :data-testid="`kitchen-panel-${mode.key}`"
        :style="{ flex: `${normalizedWidths[mode.key]} 0 0` }"
        :class="[COMPONENTS.kitchen.panel, getModeClasses(mode.key)]"
        @click="togglePanel(mode.key)"
      >
        <!-- Header with label, percentage, and chevron (only if content exists) -->
        <div :class="COMPONENTS.kitchen.label">
          {{ mode.label }}
          <UIcon v-if="getOrdersForMode(mode.key).length > 0" :name="selectedPanel === mode.key ? ICONS.chevronUp : ICONS.chevronDown" :class="COMPONENTS.kitchen.glyph" />
        </div>
        <div :class="TYPOGRAPHY.kitchenSecondary">
          {{ mode.percentage }}%
        </div>

        <!-- Portions (main number) -->
        <div :class="TYPOGRAPHY.kitchenMain">
          {{ mode.portions }} kuv.
        </div>

        <!-- Ticket breakdown -->
        <div v-if="mode.ticketBreakdown" :class="COMPONENTS.kitchen.breakdown">
          <span :class="COMPONENTS.kitchen.figure">Voksen: {{ mode.ticketBreakdown.adult }}</span>
          <span :class="COMPONENTS.kitchen.figure">| Barn: {{ mode.ticketBreakdown.child }}</span>
          <span :class="COMPONENTS.kitchen.figure">| Baby: {{ mode.ticketBreakdown.baby }}</span>
          <span :class="COMPONENTS.kitchen.figureTotal"># {{ mode.ticketBreakdown.total }}</span>
        </div>

        <div v-if="mode.allergies.affectedList.length > 0" data-testid="kitchen-allergy-head" :class="COMPONENTS.kitchen.allergyHead">
          <UIcon :name="ICONS.allergy" :class="COMPONENTS.kitchen.glyph" />
          {{ formatPortions(mode.allergies.totalPortions) }} kuv.
        </div>
      </div>
    </div>

    <!-- Household breakdown (shown when panel selected) -->
    <div
      v-if="selectedPanel && selectedPanelBreakdown.length > 0"
      data-testid="kitchen-household-list"
      :class="[getModeClasses(selectedPanel), COMPONENTS.kitchen.householdList]"
    >
      <AllergyOverviewLine
        v-if="selectedPanelAllergies?.affectedList.length"
        data-testid="kitchen-allergy-overview"
        :class="COMPONENTS.kitchen.allergyOverview"
        :total-portions="selectedPanelAllergies.totalPortions"
        :allergens="selectedPanelAllergies.breakdownByAllergen"
      />
      <div v-for="entry in selectedPanelBreakdown" :key="entry.shortName" :class="COMPONENTS.kitchen.household">
        <span :class="COMPONENTS.kitchen.householdName">{{ entry.shortName }}</span>
        <span>·</span>
        <span>{{ formatTicketCounts(entry.orders) }}</span>
        <span>·</span>
        <span v-for="(order, index) in entry.orders" :key="order.id" :class="COMPONENTS.kitchen.diner">
          <span>{{ order.inhabitant.name }}</span>
          <AllergyTypeDisplay
            v-for="allergyType in allergensByOrder.get(order.id) ?? []"
            :key="allergyType.id"
            :allergy-type="allergyType"
            compact
            show-name
            :class="COMPONENTS.allergyOverview.besideName"
          />
          <span v-if="index < entry.orders.length - 1">,</span>
        </span>
      </div>
    </div>
  </div>
</template>
