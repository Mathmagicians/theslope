import { describe, it, expect } from 'vitest'
import { useOrder } from '~/composables/useOrder'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { sumBy } from '~/utils/ledger'
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
      ...OrderFactory.ticketPriceRow(overrides.ticketType ?? TicketType.ADULT),
      description: overrides.description ?? null,
      price: 5000
    }
  })
}

describe('useOrder spending figures', () => {
    const {spendingTotals, spendingLeft, spendingAwaitsTickets} = useOrder()

    it('sums the allowance and the spending over rows', () => {
        expect(spendingTotals([{budgetGross: 178100, spentGross: 192500}, {budgetGross: 189000, spentGross: 0}])).toEqual({budgetGross: 367100, spentGross: 192500})
        expect(spendingTotals([])).toEqual({budgetGross: 0, spentGross: 0})
    })

    it('reads what is left as the allowance less the spending, below zero included', () => {
        expect(spendingLeft({budgetGross: 178100, spentGross: 163800})).toBe(14300)
        expect(spendingLeft({budgetGross: 178100, spentGross: 192500})).toBe(-14400)
    })

    it('waits for tickets while there is no allowance, whatever was spent', () => {
        expect(spendingAwaitsTickets({budgetGross: 0, spentGross: 0})).toBe(true)
        expect(spendingAwaitsTickets({budgetGross: 0, spentGross: 500})).toBe(true)
        expect(spendingAwaitsTickets({budgetGross: 1, spentGross: 0})).toBe(false)
    })
})

describe('useOrder', () => {
  const { calculateBudget, getActiveOrders, getReleasedOrders, requiresChair, convertVat, formatGuestLabel } = useOrder()

  describe('formatGuestLabel', () => {
    it.each([
      {bookerName: undefined, expected: 'Gæst'},
      {bookerName: 'Anna', expected: 'Gæst af Anna'},
      {bookerName: '', expected: 'Gæst'},  // empty string treated as falsy
    ])('GIVEN bookerName="$bookerName" THEN returns "$expected"', ({bookerName, expected}) => {
      expect(formatGuestLabel(bookerName)).toBe(expected)
    })
  })

  describe('convertVat', () => {
    describe.each([
      // toNet=true: gross → net (divide by 1.25 for 25% VAT)
      { amountOre: 12500, vatPercent: 25, toNet: true, expected: 10000, description: '125 kr gross → 100 kr net' },
      // toNet=false: net → gross (multiply by 1.25 for 25% VAT)
      { amountOre: 10000, vatPercent: 25, toNet: false, expected: 12500, description: '100 kr net → 125 kr gross' }
    ])('GIVEN $description', ({ amountOre, vatPercent, toNet, expected }) => {
      it(`WHEN converting with toNet=${toNet} THEN returns ${expected} øre`, () => {
        expect(convertVat(amountOre, vatPercent, toNet)).toBe(expected)
      })
    })
  })

  describe('calculateBudget', () => {
    describe.each([
      {
        scenario: 'mixed states (BOOKED, CLOSED and RELEASED all paid)',
        orders: [
          createTestOrder({ state: OrderState.BOOKED, priceAtBooking: 5000 }),
          createTestOrder({ state: OrderState.CLOSED, priceAtBooking: 5000 }),
          createTestOrder({ state: OrderState.RELEASED, priceAtBooking: 5000 })
        ],
        expected: { ticketCount: 3, totalRevenue: 15000, kitchenContribution: 750, availableBudget: 14250, availableBudgetExVat: 11400 }
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

  describe('requiresChair', () => {
    it.each([
      [TicketType.ADULT, true],
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

    it('GIVEN a closed dinner with tickets kept with Ingen WHEN counting the panels THEN they add up to the total kuverter and TIL SALG holds the released ones', () => {
      const { calculateTotalPortions } = useOrder()
      const closed = [
        createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT, OrderState.CLOSED),
        createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT, OrderState.CLOSED),
        createOrderWithMode(DinnerMode.TAKEAWAY, TicketType.ADULT, OrderState.CLOSED),
        createOrderWithMode(DinnerMode.TAKEAWAY, TicketType.CHILD, OrderState.CLOSED),
        createOrderWithMode(DinnerMode.TAKEAWAY, TicketType.CHILD, OrderState.CLOSED),
        createOrderWithMode(DinnerMode.DINEINLATE, TicketType.ADULT, OrderState.CLOSED),
        createOrderWithMode(DinnerMode.NONE, TicketType.ADULT, OrderState.CLOSED),
        createOrderWithMode(DinnerMode.NONE, TicketType.CHILD, OrderState.CLOSED),
        createOrderWithMode(DinnerMode.NONE, TicketType.CHILD, OrderState.CLOSED)
      ]

      const stats = calculateDiningModeStats(closed)

      expect(sumBy(stats, s => s.portions)).toBe(calculateTotalPortions(closed))
      expect(stats.find(s => s.key === OrderState.RELEASED)).toMatchObject({ label: 'TIL SALG', orderCount: 3 })
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
