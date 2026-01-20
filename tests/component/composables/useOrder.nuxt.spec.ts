import { describe, it, expect } from 'vitest'
import { useOrder } from '~/composables/useOrder'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { OrderFactory } from '../../e2e/testDataFactories/orderFactory'

// Get enum schemas for type-safe test data
const { OrderStateSchema, TicketTypeSchema, DinnerModeSchema } = useBookingValidation()
const OrderState = OrderStateSchema.enum
const TicketType = TicketTypeSchema.enum
const DinnerMode = DinnerModeSchema.enum

// Test data factory helper - uses OrderFactory for DRY test data
let orderIdCounter = 1
const createTestOrder = (overrides: {
  state?: typeof OrderState[keyof typeof OrderState]
  priceAtBooking?: number
  ticketType?: typeof TicketType[keyof typeof TicketType]
  description?: string | null
} = {}) => {
  const id = orderIdCounter++
  return OrderFactory.defaultOrderDetail(`test-${id}`, {
    id,
    priceAtBooking: overrides.priceAtBooking ?? 5000,
    state: overrides.state ?? OrderState.BOOKED,
    ticketType: overrides.ticketType ?? TicketType.ADULT,
    ticketPrice: {
      id: 1,
      ticketType: overrides.ticketType ?? TicketType.ADULT,
      description: overrides.description ?? null,
      price: 5000
    }
  })
}

describe('useOrder', () => {
  const { calculateBudget, getActiveOrders, getReleasedOrders, getPortionsForTicketPrice, requiresChair, convertVat } = useOrder()

  describe('convertVat', () => {
    describe.each([
      // toNet=true: gross → net (divide by 1.25 for 25% VAT)
      { amountOre: 12500, vatPercent: 25, toNet: true, expected: 10000, description: '125 kr gross → 100 kr net' },
      { amountOre: 10000, vatPercent: 25, toNet: true, expected: 8000, description: '100 kr gross → 80 kr net' },
      { amountOre: 0, vatPercent: 25, toNet: true, expected: 0, description: '0 kr gross → 0 kr net' },
      // toNet=false: net → gross (multiply by 1.25 for 25% VAT)
      { amountOre: 10000, vatPercent: 25, toNet: false, expected: 12500, description: '100 kr net → 125 kr gross' },
      { amountOre: 8000, vatPercent: 25, toNet: false, expected: 10000, description: '80 kr net → 100 kr gross' },
      { amountOre: 0, vatPercent: 25, toNet: false, expected: 0, description: '0 kr net → 0 kr gross' }
    ])('GIVEN $description', ({ amountOre, vatPercent, toNet, expected }) => {
      it(`WHEN converting with toNet=${toNet} THEN returns ${expected} øre`, () => {
        expect(convertVat(amountOre, vatPercent, toNet)).toBe(expected)
      })
    })
  })

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

  describe('calculateDiningModeStats - percentages based on PORTIONS not order count', () => {
    const { calculateDiningModeStats } = useOrder()

    // Helper to create orders with specific mode
    const createOrderWithMode = (
      mode: typeof DinnerMode[keyof typeof DinnerMode],
      ticketType: typeof TicketType[keyof typeof TicketType],
      state: typeof OrderState[keyof typeof OrderState] = OrderState.BOOKED
    ) => ({ ...createTestOrder({ state, ticketType }), dinnerMode: mode })

    describe.each([
      {
        scenario: 'empty orders',
        orders: [] as ReturnType<typeof createTestOrder>[],
        expected: { TAKEAWAY: 0, SPISESAL: 0, 'SPIS SENT': 0, 'TIL SALG': 0 }
      },
      {
        scenario: 'all adults in DINEIN → SPISESAL 100%',
        orders: [
          createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT),
          createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT)
        ],
        expected: { TAKEAWAY: 0, SPISESAL: 100, 'SPIS SENT': 0, 'TIL SALG': 0 }
      },
      {
        scenario: 'released babies → TIL SALG 0% (not order-based)',
        orders: [
          createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT),        // 1 portion
          createOrderWithMode(DinnerMode.DINEIN, TicketType.CHILD),        // 0.5 portion
          createOrderWithMode(DinnerMode.DINEIN, TicketType.BABY, OrderState.RELEASED), // 0 portions
          createOrderWithMode(DinnerMode.DINEIN, TicketType.BABY, OrderState.RELEASED), // 0 portions
          createOrderWithMode(DinnerMode.DINEIN, TicketType.BABY, OrderState.RELEASED)  // 0 portions
        ],
        expected: { TAKEAWAY: 0, SPISESAL: 100, 'SPIS SENT': 0, 'TIL SALG': 0 }
      },
      {
        scenario: 'equal portions split → 25% each',
        orders: [
          createOrderWithMode(DinnerMode.TAKEAWAY, TicketType.ADULT),      // 1 portion
          createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT),        // 1 portion
          createOrderWithMode(DinnerMode.DINEINLATE, TicketType.ADULT),    // 1 portion
          createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT, OrderState.RELEASED) // 1 portion released
        ],
        expected: { TAKEAWAY: 25, SPISESAL: 25, 'SPIS SENT': 25, 'TIL SALG': 25 }
      }
    ])('GIVEN $scenario', ({ orders, expected }) => {
      it('THEN percentages reflect portion distribution', () => {
        const stats = calculateDiningModeStats(orders)

        expect(stats.find(s => s.label === 'TAKEAWAY')!.percentage).toBe(expected.TAKEAWAY)
        expect(stats.find(s => s.label === 'SPISESAL')!.percentage).toBe(expected.SPISESAL)
        expect(stats.find(s => s.label === 'SPIS SENT')!.percentage).toBe(expected['SPIS SENT'])
        expect(stats.find(s => s.label === 'TIL SALG')!.percentage).toBe(expected['TIL SALG'])

        // Verify sum = 100% (unless all zero)
        const total = stats.reduce((sum, s) => sum + s.percentage, 0)
        expect(total === 0 || total === 100).toBe(true)
      })
    })
  })

  describe('calculateNormalizedWidths - visual widths with minimum', () => {
    const { calculateNormalizedWidths } = useOrder()

    const makeStats = (percentages: number[]) =>
      percentages.map((p, i) => ({ key: `K${i}`, label: `L${i}`, percentage: p, portions: p, orderCount: p }))

    describe.each([
      { scenario: 'empty', percentages: [], minWidth: 10, expectedWidths: {} },
      { scenario: 'all zeros (4 items)', percentages: [0, 0, 0, 0], minWidth: 10, expectedWidths: { K0: 25, K1: 25, K2: 25, K3: 25 } },
      { scenario: '100% in one', percentages: [100, 0, 0, 0], minWidth: 10, expectedWidths: { K0: 76.9, K1: 7.7, K2: 7.7, K3: 7.7 } },
      { scenario: 'custom min 20%', percentages: [80, 0], minWidth: 20, expectedWidths: { K0: 80, K1: 20 } }
    ])('GIVEN $scenario', ({ percentages, minWidth, expectedWidths }) => {
      it('THEN widths are normalized correctly', () => {
        const stats = makeStats(percentages)
        const widths = calculateNormalizedWidths(stats, minWidth)

        Object.entries(expectedWidths).forEach(([key, expected]) => {
          expect(widths[key]).toBeCloseTo(expected, 0)
        })

        // Verify sum = 100% (unless empty)
        const total = Object.values(widths).reduce((sum, w) => sum + w, 0)
        if (percentages.length > 0) expect(total).toBeCloseTo(100, 1)
      })
    })
  })
})
