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
 * │   TAKEAWAY - 40%         │  SPIS HER - 35%     │SPIS SENT-20% │TIL SALG-5% │
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
import type {OrderDetail} from '~/composables/useOrderValidation'

// Import DinnerMode from validation composable (ADR-001)
const {DinnerModeSchema} = useDinnerEventValidation()
const DinnerMode = DinnerModeSchema.enum
const {TicketTypeSchema} = useOrderValidation()
const TicketType = TicketTypeSchema.enum

// Extended order detail for mock data (diningMode will come from inhabitant preferences in real implementation)
interface OrderDetailWithDiningMode extends OrderDetail {
  diningMode: typeof DinnerMode[keyof typeof DinnerMode]
  allergyIcon?: string
}

// Statistics for one dining mode
interface DiningModeStats {
  key: typeof DinnerMode[keyof typeof DinnerMode] | 'RELEASED'
  label: string
  percentage: number
  count: number
  portions: number | null
  chairs: number | null
  plates: number | null
  allergies: Array<{ icon: string; name: string; portions: number }>
}

// Ticket price breakdown (dynamic, not hardcoded)
interface TicketPriceBreakdown {
  ticketType: typeof TicketType[keyof typeof TicketType]
  description: string
  count: number
  portions: number
}

interface Props {
  orders: OrderDetailWithDiningMode[]
}

const props = defineProps<Props>()

// Use business logic composable for order calculations (ADR-001)
const {getActiveOrders, getReleasedOrders, groupByTicketType, calculateTotalPortionsFromPrices, getPortionsForTicketPrice, requiresChair} = useOrder()

// Separate active orders (cooking for) from released orders (for sale)
const activeOrders = computed(() => getActiveOrders(props.orders))
const releasedOrders = computed(() => getReleasedOrders(props.orders))

// Group orders by ticket type (dynamic - supports any ticket type)
const ticketTypeGroups = computed(() => groupByTicketType(activeOrders.value))

// Calculate total portions using business logic (dynamic based on ticket prices)
const totalPortions = computed(() => calculateTotalPortionsFromPrices(activeOrders.value))

// Calculate dining mode statistics
const diningModeStats = computed(() => {
  const total = props.orders.length
  if (total === 0) return []

  // Active dining modes (people eating)
  const modes = [DinnerMode.TAKEAWAY, DinnerMode.DINEIN, DinnerMode.DINEINLATE]
  const labels = {
    [DinnerMode.TAKEAWAY]: 'TAKEAWAY',
    [DinnerMode.DINEIN]: 'SPIS HER',
    [DinnerMode.DINEINLATE]: 'SPIS SENT'
  }

  const stats = modes.map(mode => {
    const modeOrders = activeOrders.value.filter(o => o.diningMode === mode)
    const count = modeOrders.length
    const portions = calculateTotalPortionsFromPrices(modeOrders)

    // For dine-in modes, calculate chairs (ADULT + CHILD, no BABY)
    const chairs = [DinnerMode.DINEIN, DinnerMode.DINEINLATE].includes(mode)
      ? modeOrders.filter(o => requiresChair(o.ticketPrice.ticketType)).length
      : null

    // Plates = portions rounded
    const plates = Math.round(portions)

    // Collect allergies (group by person)
    const allergies = modeOrders
      .filter(o => o.allergyIcon && o.inhabitant?.name)
      .reduce((acc, o) => {
        const existing = acc.find(a => a.name === o.inhabitant.name && a.icon === o.allergyIcon)
        if (existing) {
          existing.portions += getPortionsForTicketPrice(o.ticketPrice)
        } else {
          acc.push({
            icon: o.allergyIcon!,
            name: o.inhabitant.name,
            portions: getPortionsForTicketPrice(o.ticketPrice)
          })
        }
        return acc
      }, [] as Array<{ icon: string; name: string; portions: number }>)

    return {
      key: mode,
      label: labels[mode],
      percentage: Math.round((count / total) * 100),
      count,
      portions: Math.round(portions),
      chairs,
      plates,
      allergies
    }
  }).filter(stat => stat.count > 0)

  // Add released tickets panel if any exist (rightmost panel for tickets for sale)
  if (releasedOrders.value.length > 0) {
    const count = releasedOrders.value.length
    stats.push({
      key: 'RELEASED' as any,
      label: 'TIL SALG',
      percentage: Math.round((count / total) * 100),
      count,
      portions: null, // Not cooking for these
      chairs: null,
      plates: null,
      allergies: []
    })
  }

  return stats
})

// Use design system for kitchen panel colors
const { getKitchenPanelClasses, COMPONENTS } = useTheSlopeDesignSystem()

// Get background color classes for each dining mode
const getModeClasses = (key: string) => {
  return getKitchenPanelClasses(key as 'TAKEAWAY' | 'DINEIN' | 'DINEINLATE' | 'RELEASED')
}
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

    <!-- Bottom bar: Dining mode distribution - Proportional widths -->
    <div class="flex overflow-hidden">
      <div
        v-for="mode in diningModeStats"
        :key="mode.key"
        :style="{ width: `${mode.percentage}%` }"
        class="border-r last:border-r-0 p-3 md:p-4 text-center min-w-0 box-border"
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

        <!-- Allergies -->
        <div v-if="mode.allergies && mode.allergies.length > 0" class="text-xs border-t pt-2">
          <div
            v-for="allergy in mode.allergies"
            :key="allergy.name"
            class="flex items-center justify-center gap-1 truncate"
          >
            <span>{{ allergy.icon }}</span>
            <span class="truncate">{{ allergy.name }}</span>
            <span v-if="allergy.count">({{ allergy.count }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
