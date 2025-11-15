/**
 * Business logic composable for Order domain
 * Following ADR-001: Business logic in composables
 * Following ADR-001: Import enums from validation composables (NOT from generated layer)
 */
import type {Order} from '~/composables/useOrderValidation'

export const useOrder = () => {
  // Import enum schemas from validation layer (ADR-001)
  const {OrderStateSchema, TicketTypeSchema} = useOrderValidation()
  const OrderState = OrderStateSchema.enum
  const TicketType = TicketTypeSchema.enum

  /**
   * Check if order is active (counts for kitchen preparation)
   * Active = BOOKED or CLOSED (not released for sale)
   */
  const isActiveOrder = (order: Order): boolean => {
    return order.state !== OrderState.RELEASED
  }

  /**
   * Check if order is released (available for sale/swap)
   */
  const isReleasedOrder = (order: Order): boolean => {
    return order.state === OrderState.RELEASED
  }

  /**
   * Filter orders by active state
   */
  const getActiveOrders = (orders: Order[]): Order[] => {
    return orders.filter(isActiveOrder)
  }

  /**
   * Filter orders by released state
   */
  const getReleasedOrders = (orders: Order[]): Order[] => {
    return orders.filter(isReleasedOrder)
  }

  /**
   * Calculate portion count from ticket type
   * ADULT = 1 portion, CHILD = 0.5 portion, BABY = 0 portions
   * @deprecated Use getPortionsForTicketPrice instead (supports dynamic portion sizes)
   */
  const getPortionsForTicketType = (ticketType: typeof TicketType[keyof typeof TicketType]): number => {
    if (ticketType === TicketType.ADULT) return 1
    if (ticketType === TicketType.CHILD) return 0.5
    return 0 // BABY
  }

  /**
   * Calculate portion count from ticket price
   * TODO: When portionSize field is added to TicketPrice model, use that instead
   * For now: ADULT=1, CHILD=0.5, BABY=0 (but can add special cases like HUNGRY_BABY=0.25)
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

    // Default ticket type mapping
    if (ticketPrice.ticketType === TicketType.ADULT) return 1
    if (ticketPrice.ticketType === TicketType.CHILD) return 0.5
    return 0 // BABY
  }

  /**
   * Calculate total portions from orders
   */
  const calculateTotalPortions = (orders: Order[]): number => {
    return orders.reduce((sum, order) => {
      return sum + getPortionsForTicketType(order.ticketType)
    }, 0)
  }

  /**
   * Calculate total portions from orders with ticket prices (more accurate)
   * Uses ticket price-specific portion sizes (supports HUNGRY_BABY, etc.)
   */
  const calculateTotalPortionsFromPrices = (orders: Array<{ ticketPrice: { ticketType: typeof TicketType[keyof typeof TicketType], description: string | null } }>): number => {
    return orders.reduce((sum, order) => {
      return sum + getPortionsForTicketPrice(order.ticketPrice)
    }, 0)
  }

  /**
   * Group orders by ticket type with counts and portions
   * Returns dynamic breakdown - no hardcoded ticket types
   */
  const groupByTicketType = (orders: Array<{ ticketPrice: { ticketType: typeof TicketType[keyof typeof TicketType], description: string | null } }>) => {
    const groups = new Map<string, { ticketType: string, count: number, portions: number, descriptions: Map<string, number> }>()

    orders.forEach(order => {
      const ticketType = order.ticketPrice.ticketType
      const description = order.ticketPrice.description || 'Standard'

      if (!groups.has(ticketType)) {
        groups.set(ticketType, {
          ticketType,
          count: 0,
          portions: 0,
          descriptions: new Map()
        })
      }

      const group = groups.get(ticketType)!
      group.count++
      group.portions += getPortionsForTicketPrice(order.ticketPrice)

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

  return {
    // State filtering
    getActiveOrders,
    getReleasedOrders,

    // Grouping and calculations
    groupByTicketType, // Dynamic grouping, no hardcoded types
    calculateTotalPortionsFromPrices,
    getPortionsForTicketPrice,
    requiresChair
  }
}