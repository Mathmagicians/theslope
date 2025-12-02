import { describe, it, expect } from 'vitest'
import { useOrder } from '~/composables/useOrder'
import { useBookingValidation } from '~/composables/useBookingValidation'

// Get enum schemas for type-safe test data
const { OrderStateSchema, TicketTypeSchema } = useBookingValidation()
const OrderState = OrderStateSchema.enum
const TicketType = TicketTypeSchema.enum

// Test data factory helper
const createTestOrder = (overrides: {
  state?: typeof OrderState[keyof typeof OrderState]
  priceAtBooking?: number
  ticketType?: typeof TicketType[keyof typeof TicketType]
  description?: string | null
} = {}) => ({
  id: Math.random(),
  state: overrides.state ?? OrderState.BOOKED,
  priceAtBooking: overrides.priceAtBooking ?? 5000,
  ticketPrice: {
    ticketType: overrides.ticketType ?? TicketType.ADULT,
    description: overrides.description ?? null
  }
})

describe('useOrder', () => {
  const { calculateBudget, getActiveOrders, getReleasedOrders, getPortionsForTicketPrice, requiresChair } = useOrder()

  describe('calculateBudget', () => {
    describe.each([
      {
        scenario: 'empty orders',
        orders: [],
        expected: { ticketCount: 0, totalRevenue: 0, kitchenContribution: 0, availableBudget: 0, availableBudgetExVat: 0 }
      },
      {
        scenario: 'single BOOKED order (50 kr)',
        orders: [createTestOrder({ state: OrderState.BOOKED, priceAtBooking: 5000 })],
        expected: { ticketCount: 1, totalRevenue: 5000, kitchenContribution: 250, availableBudget: 4750, availableBudgetExVat: 3800 }
      },
      {
        scenario: 'mixed states (BOOKED + CLOSED count, RELEASED excluded)',
        orders: [
          createTestOrder({ state: OrderState.BOOKED, priceAtBooking: 5000 }),
          createTestOrder({ state: OrderState.CLOSED, priceAtBooking: 5000 }),
          createTestOrder({ state: OrderState.RELEASED, priceAtBooking: 5000 })
        ],
        expected: { ticketCount: 2, totalRevenue: 10000, kitchenContribution: 500, availableBudget: 9500, availableBudgetExVat: 7600 }
      },
      {
        scenario: 'only RELEASED orders',
        orders: [
          createTestOrder({ state: OrderState.RELEASED }),
          createTestOrder({ state: OrderState.RELEASED })
        ],
        expected: { ticketCount: 0, totalRevenue: 0, kitchenContribution: 0, availableBudget: 0, availableBudgetExVat: 0 }
      }
    ])('GIVEN $scenario', ({ orders, expected }) => {
      it('WHEN calculating budget THEN returns correct values', () => {
        const result = calculateBudget(orders)

        expect(result.ticketCount).toBe(expected.ticketCount)
        expect(result.totalRevenue).toBe(expected.totalRevenue)
        expect(result.kitchenContribution).toBe(expected.kitchenContribution)
        expect(result.availableBudget).toBe(expected.availableBudget)
        expect(result.availableBudgetExVat).toBe(expected.availableBudgetExVat)
      })
    })

    it('GIVEN custom rates WHEN calculating budget THEN uses custom rates', () => {
      const orders = [createTestOrder({ priceAtBooking: 10000 })]

      const result = calculateBudget(orders, 10, 20) // 10% kitchen, 20% VAT

      expect(result.kitchenContribution).toBe(1000) // 10% of 10000
      expect(result.availableBudget).toBe(9000) // 10000 - 1000
      expect(result.availableBudgetExVat).toBe(7500) // 9000 / 1.20
      expect(result.kitchenBaseRatePercent).toBe(10)
      expect(result.vatPercent).toBe(20)
    })
  })

  describe('getActiveOrders / getReleasedOrders', () => {
    const mixedOrders = [
      createTestOrder({ state: OrderState.BOOKED }),
      createTestOrder({ state: OrderState.CLOSED }),
      createTestOrder({ state: OrderState.RELEASED })
    ]

    it('GIVEN mixed orders WHEN filtering active THEN excludes RELEASED', () => {
      const active = getActiveOrders(mixedOrders)

      expect(active).toHaveLength(2)
      expect(active.every(o => o.state !== OrderState.RELEASED)).toBe(true)
    })

    it('GIVEN mixed orders WHEN filtering released THEN returns only RELEASED', () => {
      const released = getReleasedOrders(mixedOrders)

      expect(released).toHaveLength(1)
      expect(released.every(o => o.state === OrderState.RELEASED)).toBe(true)
    })
  })

  describe('getPortionsForTicketPrice', () => {
    it.each([
      [TicketType.ADULT, null, 1],
      [TicketType.CHILD, null, 0.5],
      [TicketType.BABY, null, 0],
      [TicketType.BABY, 'Sulten baby', 0.25],
      [TicketType.BABY, 'hungry baby', 0.25],
      [TicketType.CHILD, 'Hungry child', 0.75],
      [TicketType.CHILD, 'sulten barn', 0.75]
    ])('GIVEN %s with description "%s" WHEN getting portions THEN returns %s',
      (ticketType, description, expectedPortions) => {
        const ticketPrice = { ticketType, description }

        expect(getPortionsForTicketPrice(ticketPrice)).toBe(expectedPortions)
      }
    )
  })

  describe('requiresChair', () => {
    it.each([
      [TicketType.ADULT, true],
      [TicketType.CHILD, true],
      [TicketType.BABY, false]
    ])('GIVEN %s WHEN checking chair requirement THEN returns %s',
      (ticketType, expected) => {
        expect(requiresChair(ticketType)).toBe(expected)
      }
    )
  })
})
