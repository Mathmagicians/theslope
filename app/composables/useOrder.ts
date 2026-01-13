/**
 * Business logic composable for Order domain
 * Following ADR-001: Business logic in composables
 * Following ADR-001: Import enums from validation composables (NOT from generated layer)
 */
import type {OrderDisplay, OrderDetail} from '~/composables/useBookingValidation'

export const useOrder = () => {
  // Import enum schemas from validation layer (ADR-001)
  const {OrderStateSchema, TicketTypeSchema} = useBookingValidation()
  const OrderState = OrderStateSchema.enum
  const TicketType = TicketTypeSchema.enum

  /**
   * Check if order is active (counts for kitchen preparation)
   * Active = BOOKED or CLOSED (not released for sale)
   */
  const isActiveOrder = (order: OrderDisplay): boolean => {
    return order.state !== OrderState.RELEASED
  }

  /**
   * Check if order is released (available for sale/swap)
   */
  const isReleasedOrder = (order: OrderDisplay): boolean => {
    return order.state === OrderState.RELEASED
  }

  /**
   * Filter orders by active state
   * Generic to preserve OrderDisplay or OrderDetail type
   */
  const getActiveOrders = <T extends OrderDisplay>(orders: T[]): T[] => {
    return orders.filter(o => isActiveOrder(o))
  }

  /**
   * Filter orders by released state
   * Generic to preserve OrderDisplay or OrderDetail type
   */
  const getReleasedOrders = <T extends OrderDisplay>(orders: T[]): T[] => {
    return orders.filter(o => isReleasedOrder(o))
  }

  /**
   * Get portions for a ticket type (simple mapping)
   * ADULT=1, CHILD=0.5, BABY=0
   */
  const getPortionsForTicketType = (ticketType: typeof TicketType[keyof typeof TicketType]): number => {
    if (ticketType === TicketType.ADULT) return 1
    if (ticketType === TicketType.CHILD) return 0.5
    return 0 // BABY
  }

  /**
   * Calculate portion count from ticket price
   * TODO: When portionSize field is added to TicketPrice model, use that instead
   * For now: Uses getPortionsForTicketType with description overrides for special cases
   */
  const getPortionsForTicketPrice = (ticketPrice: { ticketType: typeof TicketType[keyof typeof TicketType], description: string | null }): number => {
    // Future: return ticketPrice.portionSize ?? 0

    // For now: Use ticket type as base, with description overrides
    const description = ticketPrice.description?.toLowerCase() || ''

    // Special cases based on description
    if (description.includes('sulten') || description.includes('hungry')) {
      if (ticketPrice.ticketType === TicketType.BABY) return 0.25
      if (ticketPrice.ticketType === TicketType.CHILD) return 0.75
    }

    // Default: delegate to simple ticket type mapping
    return getPortionsForTicketType(ticketPrice.ticketType)
  }

  /**
   * Calculate total portions from orders
   * Uses order.ticketType (priceAtBooking preserves the price)
   */
  const calculateTotalPortionsFromPrices = (orders: OrderDetail[]): number => {
    return orders.reduce((sum, order) => {
      return sum + (order.ticketType ? getPortionsForTicketType(order.ticketType) : 0)
    }, 0)
  }

  /**
   * Group orders by ticket type with counts, portions, and revenue
   * Uses order.ticketType and priceAtBooking (frozen at booking time)
   */
  const groupByTicketType = (orders: OrderDetail[]) => {
    const groups = new Map<string, {
      ticketType: string
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
      group.portions += getPortionsForTicketType(ticketType)
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
   */
  const calculateBudget = (
    orders: OrderDisplay[],
    kitchenBaseRatePercent = DEFAULT_KITCHEN_BASE_RATE_PERCENT,
    vatPercent = DEFAULT_VAT_PERCENT
  ) => {
    const activeOrders = orders.filter(isActiveOrder)
    const ticketCount = activeOrders.length
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.priceAtBooking, 0)
    const kitchenContribution = Math.round(totalRevenue * kitchenBaseRatePercent / 100)
    const kitchenContributionExVat = convertVat(kitchenContribution, vatPercent, true)
    const availableBudget = totalRevenue - kitchenContribution
    const availableBudgetExVat = convertVat(availableBudget, vatPercent, true)

    return {
      ticketCount,
      totalRevenue,
      kitchenContribution,        // inkl. moms
      kitchenContributionExVat,   // ex moms
      availableBudget,            // inkl. moms
      availableBudgetExVat,       // ex moms (for grocery shopping)
      kitchenBaseRatePercent,
      vatPercent
    }
  }

  return {
    // State filtering
    getActiveOrders,
    getReleasedOrders,

    // Grouping and calculations
    groupByTicketType,
    calculateTotalPortionsFromPrices,
    getPortionsForTicketPrice,
    requiresChair,

    // Budget & VAT
    calculateBudget,
    convertVat
  }
}