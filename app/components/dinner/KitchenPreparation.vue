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
 * TIL SALG while anyone waits: the waiting-list part follows a gap, its portions and its ticket count
 * without a share; opened, the list adds the VENTELISTE heading and one line per ticket type, led by
 * the ticket type badge, each place as the booking form numbers it:
 * ┌────────────┬────────────┬────────────┬────────────────────────┐
 * │  TAKEAWAY  │  SPISESAL  │ SPIS SENT  │        TIL SALG        │
 * │    38%     │    33%     │    19%     │          10%           │
 * │  40 kuv.   │  35 kuv.   │  20 kuv.   │         4 kuv.         │
 * │    ...     │    ...     │    ...     │  Voksen: 4 | Barn: 0   │
 * │            │            │            │  | Baby: 0  # 4        │
 * │            │            │            │  (allergy) 1 kuv.      │
 * │            │            │            │                        │
 * │            │            │            │ (hourglass) VENTELISTE │
 * │            │            │            │         1 kuv.         │
 * │            │            │            │  Voksen: 0 | Barn: 2   │
 * │            │            │            │  | Baby: 0  # 2        │
 * ├────────────┴────────────┴────────────┴────────────────────────┤
 * │  (allergy) 1 kuv. | (milk) Mælk · 1                           │
 * │  S_31 · 2V · Anna (milk) Mælk, Bo                             │
 * │  N_12 · 2V · Maria, Jens                                      │
 * │                                                               │
 * │  (hourglass) VENTELISTE                                       │
 * │  [Barn] #1 T_04 · Emil, #2 S_12 · Liva                        │
 * └───────────────────────────────────────────────────────────────┘
 *    [Barn] = the ticket type badge
 *
 * Phone, the boxes stacked and TIL SALG open:
 * ┌─────────────────────────────────────┐
 * │  TAKEAWAY · SPISESAL · SPIS SENT    │
 * ├─────────────────────────────────────┤
 * │              TIL SALG               │
 * │                 10%                 │
 * │               4 kuv.                │
 * │  Voksen: 4 | Barn: 0 | Baby: 0 # 4  │
 * │          (allergy) 1 kuv.           │
 * │                                     │
 * │       (hourglass) VENTELISTE        │
 * │               1 kuv.                │
 * │  Voksen: 0 | Barn: 2 | Baby: 0 # 2  │
 * ├─────────────────────────────────────┤
 * │ (allergy) 1 kuv. | (milk) Mælk · 1  │
 * │ S_31 · 2V · Anna (milk) Mælk, Bo    │
 * │ N_12 · 2V · Maria, Jens             │
 * │                                     │
 * │ (hourglass) VENTELISTE              │
 * │ [Barn] #1 T_04 · Emil,              │
 * │        #2 S_12 · Liva               │
 * └─────────────────────────────────────┘
 *
 * Each panel: % + kuverter + ticket breakdown (Voksen/Barn/Baby + total) + the kuverter of its
 * diners carrying an allergen on the menu. The expanded list opens with the allergy overview, each
 * menu allergen by kuverter in the menu's order; every such diner carries one compact
 * AllergyTypeDisplay per menu allergen, its own icon and name. A household row centres every segment
 * on one line. A panel without such a diner, and a menu without allergens, show no allergy line and
 * no allergy types; the panel heads add up to the chef's allergen line. A person on the waiting list
 * holds no ticket yet, so the waiting-list lines carry no allergy types.
 *
 * The three dining modes walk the brand rainbow in its order; TIL SALG stays grey, because a
 * released ticket on offer is not a dining mode. Fill, ink and divider come from
 * `COMPONENTS.kitchenPanel` (ADR-018); this component owns the layout and the numbers.
 */
import type {OrderDetail, TicketType} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import type {AllergenOverview} from '~/composables/useAllergy'
import type {DiningModeStats} from '~/composables/useOrder'
import type {HouseholdDisplay} from '~/composables/useCoreValidation'
import type {TicketWaitlistDisplay, WaitlistQueueSummary} from '~/composables/useWaitlistValidation'
import type {KitchenPanelKey} from '~/composables/useTheSlopeDesignSystem'

// A box's ticket count line: each ticket type's count under its Danish name, then the total
interface TicketFigures {
  figures: {ticketType: TicketType, text: string}[]
  total: number
}

// Extended stats with component-specific fields
interface ExtendedDiningModeStats extends DiningModeStats {
  ticketFigures: TicketFigures | null
  allergies: AllergenOverview
}

interface Props {
  orders: OrderDetail[]
  allergens?: AllergyTypeDisplay[]  // The menu's allergens, the only allergies the panels count
  waitlist?: WaitlistQueueSummary | null  // The dinner's queue: the waiting-list part of the TIL SALG box while it has entries
}

const props = withDefaults(defineProps<Props>(), {
  allergens: () => [],
  waitlist: null
})

// Use business logic composables (ADR-001)
const {
  getActiveOrders,
  getReleasedOrders,
  calculateTotalPortions,
  calculateDiningModeStats,
  calculateNormalizedWidths
} = useOrder()
const {TicketTypeSchema, OrderStateSchema} = useBookingValidation()
const OrderState = OrderStateSchema.enum
const {computeAllergenOverview} = useAllergy()
const {formatTicketCounts, countTicketTypes} = useBilling()
const {ticketTypeWords} = useTicket()
const {getHouseholdForInhabitant} = useHouseholdsStore()

const ticketFiguresOf = (counts: Partial<Record<TicketType, number>>): TicketFigures => ({
  figures: TicketTypeSchema.options.map((ticketType, index) =>
    ({ticketType, text: `${index > 0 ? '| ' : ''}${ticketTypeWords[ticketType].label}: ${counts[ticketType] ?? 0}`})),
  total: sumBy(TicketTypeSchema.options, ticketType => counts[ticketType] ?? 0)
})

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

// All three ticket types over ALL orders (active + released), to match totalPortions
const totalFigures = computed(() => ticketFiguresOf(countTicketTypes(props.orders)))

// Calculate total portions using business logic (dynamic based on ticket prices)
// Includes ALL orders (active + released) so it matches sum of all 4 bottom panels
const totalPortions = computed(() => calculateTotalPortions(props.orders))

// Get orders for a specific mode (for extending base stats)
const getOrdersForMode = (key: string): OrderDetail[] => {
  if (key === OrderState.RELEASED) return releasedOrders.value
  return activeOrders.value.filter(o => o.dinnerMode === key)
}

// Calculate dining mode statistics using composable, then extend with component-specific fields
const diningModeStats = computed((): ExtendedDiningModeStats[] => {
  // Get base stats from composable (percentage based on PORTIONS)
  const baseStats = calculateDiningModeStats(props.orders)

  // Extend with component-specific fields
  return baseStats.map(stat => {
    const modeOrders = getOrdersForMode(stat.key)

    return {
      ...stat,
      ticketFigures: modeOrders.length > 0 ? ticketFiguresOf(countTicketTypes(modeOrders)) : null,
      allergies: computeAllergenOverview(modeOrders, props.allergens ?? [])
    }
  })
})

// While anyone waits, the TIL SALG box carries the queue: its portions, its ticket count and its lines
const queue = computed(() => {
  const waitlist = props.waitlist
  if (!waitlist || waitlist.entries === 0) return null
  return {
    portions: waitlist.portions,
    ticketFigures: ticketFiguresOf(countTicketTypes(waitlist.lines.flatMap(({ticketType, entries}) => entries.map(() => ({ticketType}))))),
    lines: waitlist.lines
  }
})
const hasQueue = (key: string) => key === OrderState.RELEASED && queue.value !== null
const canOpen = (key: string) => getOrdersForMode(key).length > 0 || hasQueue(key)

// A place in its line: the household and the person, as the booking form numbers it
const placeOf = (entry: TicketWaitlistDisplay, place: number): string[] => {
  const household = getHouseholdForInhabitant(entry.inhabitantId)
  const name = household?.inhabitants.find(inhabitant => inhabitant.id === entry.inhabitantId)?.name
  return household && name ? [`#${place} ${getHouseholdShortName(household.address)} · ${name}`] : []
}
const selectedQueueLines = computed(() => selectedPanel.value && hasQueue(selectedPanel.value)
  ? queue.value!.lines.map(({ticketType, entries}) => ({
      ticketType,
      presentation: ticketTypePresentation(ticketType),
      places: entries.flatMap((entry, index) => placeOf(entry, index + 1)).join(', ')
    }))
  : [])

const selectedPanelAllergies = computed(() =>
  diningModeStats.value.find(mode => mode.key === selectedPanel.value)?.allergies ?? null
)

const allergensByOrder = computed(() => new Map(
  selectedPanelAllergies.value?.affectedList.flatMap(diner => diner.orderIds.map(orderId => [orderId, diner.matchingAllergens] as const)) ?? []
))

// Use design system for kitchen panel colors
const { getKitchenPanelClasses, COMPONENTS, ICONS, TYPOGRAPHY, NOISE, SIZES } = useTheSlopeDesignSystem()

// Get background color classes for each dining mode
const getModeClasses = (key: string) => {
  return getKitchenPanelClasses(key as KitchenPanelKey)
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
          <span v-for="figure in totalFigures.figures" :key="figure.ticketType" :class="COMPONENTS.kitchen.figure">{{ figure.text }}</span>
          <span :class="COMPONENTS.kitchen.figureTotal">| # {{ totalFigures.total }}</span>
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
          <UIcon v-if="canOpen(mode.key)" :name="selectedPanel === mode.key ? ICONS.chevronUp : ICONS.chevronDown" :class="COMPONENTS.kitchen.glyph" />
        </div>
        <div :class="TYPOGRAPHY.kitchenSecondary">
          {{ mode.percentage }}%
        </div>

        <!-- Portions (main number) -->
        <div :class="TYPOGRAPHY.kitchenMain">
          {{ formatPortions(mode.portions) }} kuv.
        </div>

        <!-- Ticket breakdown -->
        <div v-if="mode.ticketFigures" :class="COMPONENTS.kitchen.breakdown">
          <span v-for="figure in mode.ticketFigures.figures" :key="figure.ticketType" :class="COMPONENTS.kitchen.figure">{{ figure.text }}</span>
          <span :class="COMPONENTS.kitchen.figureTotal"># {{ mode.ticketFigures.total }}</span>
        </div>

        <div v-if="mode.allergies.affectedList.length > 0" data-testid="kitchen-allergy-head" :class="COMPONENTS.kitchen.allergyHead">
          <UIcon :name="ICONS.allergy" :class="COMPONENTS.kitchen.glyph" />
          {{ formatPortions(mode.allergies.totalPortions) }} kuv.
        </div>

        <!-- The waiting-list part: the waiting list buys what is for sale -->
        <div v-if="hasQueue(mode.key)" data-testid="kitchen-waitlist-part" :class="COMPONENTS.kitchen.queue">
          <div :class="COMPONENTS.kitchen.label">
            <UIcon :name="ICONS.waitlist" :class="COMPONENTS.kitchen.glyph" />
            VENTELISTE
          </div>
          <div :class="TYPOGRAPHY.kitchenMain">
            {{ formatPortions(queue!.portions) }} kuv.
          </div>
          <div :class="COMPONENTS.kitchen.breakdown">
            <span v-for="figure in queue!.ticketFigures.figures" :key="figure.ticketType" :class="COMPONENTS.kitchen.figure">{{ figure.text }}</span>
            <span :class="COMPONENTS.kitchen.figureTotal"># {{ queue!.ticketFigures.total }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Household breakdown (shown when panel selected) -->
    <div
      v-if="selectedPanel && (selectedPanelBreakdown.length > 0 || selectedQueueLines.length > 0)"
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
      <div v-if="selectedQueueLines.length > 0" data-testid="kitchen-waitlist-lines" :class="COMPONENTS.kitchen.queue">
        <div :class="COMPONENTS.kitchen.queueHeading">
          <UIcon :name="ICONS.waitlist" :class="COMPONENTS.kitchen.glyph" />
          VENTELISTE
        </div>
        <div v-for="line in selectedQueueLines" :key="line.ticketType" :class="COMPONENTS.kitchen.household">
          <UBadge :color="line.presentation.color" :variant="NOISE.loud" :size="SIZES.small">{{ line.presentation.label }}</UBadge>
          <span>{{ line.places }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
