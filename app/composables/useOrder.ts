/**
 * Business logic composable for Order domain
 * Following ADR-001: Business logic in composables
 * Following ADR-001: Import enums from validation composables (NOT from generated layer)
 */
import {useBookingValidation, TicketState, type OrderDisplay, type OrderDetail, type TicketType} from '~/composables/useBookingValidation'
import {isPendingOrder, ticketStateOf} from '~/composables/useBooking'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {sumBy} from '~/utils/ledger'
import {BOOKING_WORDS} from '~/config/bookingWords'

/**
 * Statistics for one dining mode in kitchen display
 */
export interface DiningModeStats {
  key: string
  label: string
  percentage: number  // Based on PORTIONS (cooking workload), not order count
  portions: number
  orderCount: number
}

export type SpendingFigures = {budgetGross: number, spentGross: number}

const {OrderStateSchema, DinnerModeSchema} = useBookingValidation()
const OrderState = OrderStateSchema.enum
const DinnerMode = DinnerModeSchema.enum

export const useOrder = () => {
  // Import enum schemas from validation layer (ADR-001)
  const {TicketTypeSchema} = useBookingValidation()
  const TicketType = TicketTypeSchema.enum

  /**
   * Format guest label consistently across UI
   * @param bookerName - Optional booker name for "Gæst af X" format
   * @returns "Gæst af {bookerName}" or "Gæst"
   */
  const formatGuestLabel = (bookerName?: string): string =>
    bookerName ? BOOKING_WORDS.guests.ofBooker(bookerName) : BOOKING_WORDS.guests.name

  /**
   * The orders the kitchen cooks for: every order not released
   * Generic to preserve OrderDisplay or OrderDetail type
   */
  const getActiveOrders = <T extends OrderDisplay>(orders: T[]): T[] => {
    return orders.filter(o => ticketStateOf(o) !== TicketState.released)
  }

  /**
   * The released orders
   * Generic to preserve OrderDisplay or OrderDetail type
   */
  const getReleasedOrders = <T extends OrderDisplay>(orders: T[]): T[] => {
    return orders.filter(o => ticketStateOf(o) === TicketState.released)
  }

  // A person's counts over their own orders and places: the tickets waiting for the close, the released among them, the places
  const personTicketCounts = (orders: OrderDisplay[], entries: TicketWaitlistDisplay[]): {total: number, released: number, queued: number} => {
    const tickets = orders.filter(isPendingOrder)
    return {total: tickets.length, released: getReleasedOrders(tickets).length, queued: entries.length}
  }

  // The kitchen's count of the orders: a ticket weighs its price's portions; a ticket whose price row is gone weighs 0
  const calculateTotalPortions = (orders: OrderDetail[]): number =>
    sumBy(orders, order => order.ticketPrice?.portions ?? 0)

  /**
   * Group orders by ticket type with counts, portions, and revenue
   * Uses order.ticketType and priceAtBooking (frozen at booking time)
   */
  const groupByTicketType = (orders: OrderDetail[]) => {
    const groups = new Map<TicketType, {
      ticketType: TicketType
      count: number
      portions: number
      unitPrice: number
      revenue: number
      descriptions: Map<string, number>
    }>()

    orders.forEach(order => {
      const ticketType = order.ticketType
      if (!ticketType) return

      const description = order.ticketPrice?.description || 'Standard'

      if (!groups.has(ticketType)) {
        groups.set(ticketType, {
          ticketType,
          count: 0,
          portions: 0,
          unitPrice: order.priceAtBooking,
          revenue: 0,
          descriptions: new Map()
        })
      }

      const group = groups.get(ticketType)!
      group.count++
      group.portions += order.ticketPrice?.portions ?? 0
      group.revenue += order.priceAtBooking

      const currentCount = group.descriptions.get(description) || 0
      group.descriptions.set(description, currentCount + 1)
    })

    return Array.from(groups.values())
  }

  /**
   * Check if ticket type requires a chair (ADULT or CHILD, not BABY)
   */
  const requiresChair = (ticketType: typeof TicketType[keyof typeof TicketType]): boolean => {
    return ticketType !== TicketType.BABY
  }

  // ========== KITCHEN STATISTICS ==========

  /**
   * Calculate dining mode statistics for kitchen display
   * Percentages are based on PORTIONS (cooking workload) to match "X PORTIONER" header
   *
   * @param orders - All orders to analyze
   * @returns Array of stats per dining mode + RELEASED, with portion-based percentages
   */
  const calculateDiningModeStats = (orders: OrderDetail[]): DiningModeStats[] => {
    const activeOrders = getActiveOrders(orders)
    const releasedOrders = getReleasedOrders(orders)
    const totalPortions = calculateTotalPortions(orders)

    const modes = [
      { key: DinnerMode.TAKEAWAY, label: 'TAKEAWAY' },
      { key: DinnerMode.DINEIN, label: 'SPISESAL' },
      { key: DinnerMode.DINEINLATE, label: 'SPIS SENT' }
    ] as const

    const stats: DiningModeStats[] = modes.map(({ key, label }) => {
      const modeOrders = activeOrders.filter(o => o.dinnerMode === key)
      const portions = calculateTotalPortions(modeOrders)
      const percentage = totalPortions > 0 ? Math.round((portions / totalPortions) * 100) : 0

      return {
        key,
        label,
        percentage,
        portions: Math.round(portions),
        orderCount: modeOrders.length
      }
    })

    // Add released tickets panel
    const releasedPortions = calculateTotalPortions(releasedOrders)
    stats.push({
      key: OrderState.RELEASED,
      label: 'TIL SALG',
      percentage: totalPortions > 0 ? Math.round((releasedPortions / totalPortions) * 100) : 0,
      portions: Math.round(releasedPortions),
      orderCount: releasedOrders.length
    })

    return stats
  }

  /**
   * Calculate normalized widths for kitchen display panels
   * Applies minimum width (10%) and scales to sum to 100%
   *
   * @param stats - Dining mode stats with percentages
   * @param minWidth - Minimum width percentage (default 10%)
   * @returns Object mapping key → normalized width percentage
   */
  const calculateNormalizedWidths = (
    stats: DiningModeStats[],
    minWidth = 10
  ): Record<string, number> => {
    if (stats.length === 0) return {}

    // Apply minimum, track how much we've used
    const withMin = stats.map(s => ({ key: s.key, width: Math.max(s.percentage, minWidth) }))
    const total = sumBy(withMin, s => s.width)

    // Scale to 100% if needed
    const scale = total > 0 ? 100 / total : 1
    return Object.fromEntries(withMin.map(s => [s.key, s.width * scale]))
  }

  // ========== BUDGET CALCULATIONS ==========

  /**
   * Kitchen config defaults (can be overridden via app.config.ts)
   */
  const DEFAULT_KITCHEN_BASE_RATE_PERCENT = 5
  const DEFAULT_VAT_PERCENT = 25

  /**
   * Convert amount between gross (inkl. moms) and net (ex moms)
   * @param amountOre - Amount in øre
   * @param vatPercent - VAT as whole number (25 = 25%)
   * @param toNet - true: gross→net, false: net→gross
   */
  const convertVat = (amountOre: number, vatPercent: number, toNet: boolean): number => {
    const multiplier = 1 + vatPercent / 100
    return Math.round(toNet ? amountOre / multiplier : amountOre * multiplier)
  }

  /**
   * Calculate budget breakdown from orders
   * Returns all financial figures for kitchen/chef planning
   *
   * Revenue counts every ticket that is paid: a ticket released after the booking deadline stays paid by its household
   * or by the one who claims it, so it stays in the budget; kuverter are the kitchen's own count (getActiveOrders)
   */
  const calculateBudget = (
    orders: OrderDisplay[],
    kitchenBaseRatePercent = DEFAULT_KITCHEN_BASE_RATE_PERCENT,
    vatPercent = DEFAULT_VAT_PERCENT
  ) => {
    const paidOrders = orders.filter(order => order.state !== OrderState.CANCELLED)
    const ticketCount = paidOrders.length
    const totalRevenue = sumBy(paidOrders, o => o.priceAtBooking)
    const kitchenContribution = Math.round(totalRevenue * kitchenBaseRatePercent / 100)
    const availableBudget = totalRevenue - kitchenContribution

    return {
      ticketCount,
      totalRevenue,
      kitchenContribution,        // inkl. moms
      availableBudget,            // inkl. moms
      kitchenBaseRatePercent,
      vatPercent
    }
  }

  /**
   * The spending figures of a dinner or a run of dinners, gross øre: the allowance and what was spent. A sum over rows,
   * what is left, and whether the figure still waits for tickets (no allowance yet) all come from here; components bind
   */
  /** A typed kroner amount as gross øre: an ex moms amount gains the VAT, an inkl. moms amount is the figure itself */
  const typedKrToGrossOre = (amountKr: number, exVat: boolean, vatPercent: number = DEFAULT_VAT_PERCENT): number =>
    exVat ? convertVat(Math.round(amountKr * 100), vatPercent, false) : Math.round(amountKr * 100)
  /** The other unit of a typed kroner amount, for the hint beside the field */
  const typedKrOtherUnitOre = (amountKr: number, exVat: boolean, vatPercent: number = DEFAULT_VAT_PERCENT): number =>
    exVat ? typedKrToGrossOre(amountKr, true, vatPercent) : convertVat(Math.round(amountKr * 100), vatPercent, true)

  const spendingTotals = (rows: SpendingFigures[]): SpendingFigures =>
    ({budgetGross: sumBy(rows, row => row.budgetGross), spentGross: sumBy(rows, row => row.spentGross)})
  const spendingLeft = (figures: SpendingFigures): number => figures.budgetGross - figures.spentGross
  const spendingAwaitsTickets = (figures: SpendingFigures): boolean => figures.budgetGross === 0

  return {
    formatGuestLabel,

    // State filtering
    getActiveOrders,
    getReleasedOrders,
    personTicketCounts,

    // Grouping and calculations
    groupByTicketType,
    calculateTotalPortions,
    requiresChair,

    // Kitchen statistics
    calculateDiningModeStats,
    calculateNormalizedWidths,

    // Budget & VAT
    calculateBudget,
    spendingTotals,
    spendingLeft,
    spendingAwaitsTickets,
    typedKrToGrossOre,
    typedKrOtherUnitOre,
    convertVat
  }
}