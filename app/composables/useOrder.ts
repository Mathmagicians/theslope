/**
 * The order rules: the kitchen's counts and panels, the budget and the VAT. The server imports it, so every import is
 * explicit (ADR-017)
 */
import {useBookingValidation, TicketState, type OrderDisplay, type OrderDetail, type TicketType} from '~/composables/useBookingValidation'
import {isPendingOrder, ticketStateOf} from '~/composables/useBooking'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {krToOre, sumBy} from '~/utils/ledger'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {TEAM_WORDS} from '~/config/teamWords'

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
  const {TicketTypeSchema} = useBookingValidation()
  const TicketType = TicketTypeSchema.enum

  const formatGuestLabel = (bookerName?: string): string =>
    bookerName ? BOOKING_WORDS.guests.ofBooker(bookerName) : BOOKING_WORDS.guests.name

  /** The orders the kitchen cooks for: every order not released */
  const getActiveOrders = <T extends OrderDisplay>(orders: T[]): T[] => {
    return orders.filter(o => ticketStateOf(o) !== TicketState.released)
  }

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
   * Orders by ticket type: the count, the portions and the revenue. The unit price is the first order's priceAtBooking,
   * frozen at its booking
   */
  const groupByTicketType = (orders: OrderDetail[]) => {
    const groups = new Map<TicketType, {
      ticketType: TicketType
      count: number
      portions: number
      unitPrice: number
      revenue: number
    }>()

    orders.forEach(order => {
      const ticketType = order.ticketType
      if (!ticketType) return

      const group = groups.get(ticketType) ?? {ticketType, count: 0, portions: 0, unitPrice: order.priceAtBooking, revenue: 0}
      group.count++
      group.portions += order.ticketPrice?.portions ?? 0
      group.revenue += order.priceAtBooking
      groups.set(ticketType, group)
    })

    return Array.from(groups.values())
  }

  /** A baby sits on a lap: every other ticket takes a chair */
  const requiresChair = (ticketType: TicketType): boolean => ticketType !== TicketType.BABY

  // ========== KITCHEN STATISTICS ==========

  /**
   * The kitchen's panels: one per eating mode and one for the tickets for sale. A percentage weighs portions (the
   * cooking workload), so the panels match the "X PORTIONER" header
   */
  const calculateDiningModeStats = (orders: OrderDetail[]): DiningModeStats[] => {
    const activeOrders = getActiveOrders(orders)
    const releasedOrders = getReleasedOrders(orders)
    const totalPortions = calculateTotalPortions(orders)

    const modes = [DinnerMode.TAKEAWAY, DinnerMode.DINEIN, DinnerMode.DINEINLATE] as const

    const stats: DiningModeStats[] = modes.map(key => {
      const modeOrders = activeOrders.filter(o => o.dinnerMode === key)
      const portions = calculateTotalPortions(modeOrders)
      const percentage = totalPortions > 0 ? Math.round((portions / totalPortions) * 100) : 0

      return {
        key,
        label: TEAM_WORDS.kitchen.panels[key],
        percentage,
        portions: Math.round(portions),
        orderCount: modeOrders.length
      }
    })

    const releasedPortions = calculateTotalPortions(releasedOrders)
    stats.push({
      key: OrderState.RELEASED,
      label: TEAM_WORDS.kitchen.forSale,
      percentage: totalPortions > 0 ? Math.round((releasedPortions / totalPortions) * 100) : 0,
      portions: Math.round(releasedPortions),
      orderCount: releasedOrders.length
    })

    return stats
  }

  /** The panels' widths by key: each at least minWidth percent, scaled so they fill 100% */
  const calculateNormalizedWidths = (
    stats: DiningModeStats[],
    minWidth = 10
  ): Record<string, number> => {
    if (stats.length === 0) return {}

    const withMin = stats.map(s => ({ key: s.key, width: Math.max(s.percentage, minWidth) }))
    const total = sumBy(withMin, s => s.width)

    const scale = total > 0 ? 100 / total : 1
    return Object.fromEntries(withMin.map(s => [s.key, s.width * scale]))
  }

  // ========== BUDGET CALCULATIONS ==========

  /** The kitchen's rates in app.config.ts, for a caller that passes none */
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

  /** A typed kroner amount as gross øre: an ex moms amount gains the VAT, an inkl. moms amount is the figure itself */
  const typedKrToGrossOre = (amountKr: number, exVat: boolean, vatPercent: number = DEFAULT_VAT_PERCENT): number =>
    exVat ? convertVat(krToOre(amountKr), vatPercent, false) : krToOre(amountKr)
  /** The other unit of a typed kroner amount, for the hint beside the field */
  const typedKrOtherUnitOre = (amountKr: number, exVat: boolean, vatPercent: number = DEFAULT_VAT_PERCENT): number =>
    exVat ? typedKrToGrossOre(amountKr, true, vatPercent) : convertVat(krToOre(amountKr), vatPercent, true)

  /**
   * The spending figures of a dinner or a run of dinners, gross øre: the allowance and what was spent. A sum over rows,
   * what is left, and whether the figure still waits for tickets (no allowance yet) all come from here, so components
   * compute none of them
   */
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