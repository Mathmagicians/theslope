import { describe, it, expect } from 'vitest'
import { useOrder, type DiningModeStats } from '~/composables/useOrder'
import { useBookingValidation, type DinnerMode as DinnerModeValue, type OrderState as OrderStateValue, type TicketType as TicketTypeValue, type KitchenPanel, type OrderDetail } from '~/composables/useBookingValidation'
import { sumBy } from '~/utils/ledger'
import { TEAM_WORDS } from '~/config/teamWords'
import { BOOKING_WORDS } from '~/config/bookingWords'
import { OrderFactory } from '../../e2e/testDataFactories/orderFactory'
import { WaitlistFactory } from '../../e2e/testDataFactories/waitlistFactory'
import { itemAt } from '~~/tests/component/listHelpers'

const { OrderStateSchema, TicketTypeSchema, DinnerModeSchema, KitchenPanelSchema } = useBookingValidation()
const OrderState = OrderStateSchema.enum
const TicketType = TicketTypeSchema.enum
const DinnerMode = DinnerModeSchema.enum
// The kitchen box's panels, in their order
const PANELS = KitchenPanelSchema.options

let orderIdCounter = 1
const createTestOrder = (overrides: {
  state?: OrderStateValue
  priceAtBooking?: number
  ticketType?: TicketTypeValue
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
      {bookerName: undefined, expected: BOOKING_WORDS.guests.name},
      {bookerName: 'Anna', expected: BOOKING_WORDS.guests.ofBooker('Anna')},
      {bookerName: '', expected: BOOKING_WORDS.guests.name}
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
        expected: { ticketCount: 3, totalRevenue: 15000, kitchenContribution: 750, availableBudget: 14250 }
      }
    ])('GIVEN $scenario', ({ orders, expected }) => {
      it('WHEN calculating budget THEN returns correct values', () => {
        const result = calculateBudget(orders)

        expect(result.ticketCount).toBe(expected.ticketCount)
        expect(result.totalRevenue).toBe(expected.totalRevenue)
        expect(result.kitchenContribution).toBe(expected.kitchenContribution)
        expect(result.availableBudget).toBe(expected.availableBudget)
      })
    })

    it('GIVEN custom rates WHEN calculating budget THEN uses custom rates', () => {
      const orders = [createTestOrder({ priceAtBooking: 10000 })]

      const result = calculateBudget(orders, 10, 20) // 10% kitchen, 20% VAT

      expect(result.kitchenContribution).toBe(1000) // 10% of 10000
      expect(result.availableBudget).toBe(9000) // 10000 - 1000
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

  // The booking grid's name cell: a person's own tickets and places over a row's dinners
  describe('personTicketCounts', () => {
    const { personTicketCounts } = useOrder()
    const ticket = (state: OrderStateValue, dinnerMode: DinnerModeValue = DinnerMode.DINEIN) =>
      OrderFactory.defaultOrder(undefined, { state, dinnerMode })

    it.each([
      { desc: 'a booked and a released ticket', orders: [ticket(OrderState.BOOKED), ticket(OrderState.RELEASED)], places: 0, counts: { total: 2, released: 1, queued: 0 } },
      { desc: 'tickets the close or a cancellation ended', orders: [ticket(OrderState.CLOSED, DinnerMode.NONE), ticket(OrderState.CANCELLED)], places: 0, counts: { total: 0, released: 0, queued: 0 } },
      { desc: 'two places on the waiting list', orders: [], places: 2, counts: { total: 0, released: 0, queued: 2 } }
    ])('GIVEN $desc THEN counts $counts.total tickets, $counts.released released and $counts.queued places', ({ orders, places, counts }) => {
      const entries = Array.from({ length: places }, (_, index) => WaitlistFactory.defaultEntry({ id: index + 1 }))
      expect(personTicketCounts(orders, entries)).toEqual(counts)
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

    const createOrderWithMode = (mode: DinnerModeValue, ticketType: TicketTypeValue, state: OrderStateValue = OrderState.BOOKED): OrderDetail =>
      ({ ...createTestOrder({ state, ticketType }), dinnerMode: mode })
    const noOrders: OrderDetail[] = []
    const panelOf = (stats: DiningModeStats[], key: KitchenPanel) => {
      const panel = stats.find(stat => stat.key === key)
      if (!panel) throw new Error(`No kitchen panel ${key}`)
      return panel
    }

    describe.each([
      {
        scenario: 'empty orders',
        orders: noOrders,
        expected: { [DinnerMode.TAKEAWAY]: 0, [DinnerMode.DINEIN]: 0, [DinnerMode.DINEINLATE]: 0, [OrderState.RELEASED]: 0 }
      },
      {
        scenario: 'released babies → the tickets for sale 0% (not order-based)',
        orders: [
          createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT),        // 1 portion
          createOrderWithMode(DinnerMode.DINEIN, TicketType.CHILD),        // 0.5 portion
          createOrderWithMode(DinnerMode.DINEIN, TicketType.BABY, OrderState.RELEASED), // 0 portions
          createOrderWithMode(DinnerMode.DINEIN, TicketType.BABY, OrderState.RELEASED), // 0 portions
          createOrderWithMode(DinnerMode.DINEIN, TicketType.BABY, OrderState.RELEASED)  // 0 portions
        ],
        expected: { [DinnerMode.TAKEAWAY]: 0, [DinnerMode.DINEIN]: 100, [DinnerMode.DINEINLATE]: 0, [OrderState.RELEASED]: 0 }
      },
      {
        scenario: 'equal portions split → 25% each',
        orders: [
          createOrderWithMode(DinnerMode.TAKEAWAY, TicketType.ADULT),      // 1 portion
          createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT),        // 1 portion
          createOrderWithMode(DinnerMode.DINEINLATE, TicketType.ADULT),    // 1 portion
          createOrderWithMode(DinnerMode.DINEIN, TicketType.ADULT, OrderState.RELEASED) // 1 portion released
        ],
        expected: { [DinnerMode.TAKEAWAY]: 25, [DinnerMode.DINEIN]: 25, [DinnerMode.DINEINLATE]: 25, [OrderState.RELEASED]: 25 }
      }
    ])('GIVEN $scenario', ({ orders, expected }) => {
      it('THEN percentages reflect portion distribution', () => {
        const stats = calculateDiningModeStats(orders)

        PANELS.forEach(panel => expect(panelOf(stats, panel).percentage, panel).toBe(expected[panel]))

        // The panels share the whole, unless no portion is booked
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
      expect(panelOf(stats, OrderState.RELEASED)).toMatchObject({ label: TEAM_WORDS.kitchen.forSale, orderCount: 3 })
    })
  })

  describe('calculateNormalizedWidths - visual widths with minimum', () => {
    const { calculateNormalizedWidths } = useOrder()

    const makeStats = (percentages: number[]) =>
      percentages.map((p, i) => ({ key: itemAt(PANELS, i), label: `L${i}`, percentage: p, portions: p, orderCount: p }))

    describe.each([
      { scenario: 'empty', percentages: [], minWidth: 10, expectedWidths: [] },
      { scenario: 'all zeros (4 items)', percentages: [0, 0, 0, 0], minWidth: 10, expectedWidths: [25, 25, 25, 25] },
      { scenario: '100% in one', percentages: [100, 0, 0, 0], minWidth: 10, expectedWidths: [76.9, 7.7, 7.7, 7.7] },
      { scenario: 'custom min 20%', percentages: [80, 0], minWidth: 20, expectedWidths: [80, 20] }
    ])('GIVEN $scenario', ({ percentages, minWidth, expectedWidths }) => {
      it('THEN widths are normalized correctly', () => {
        const stats = makeStats(percentages)
        const widths = calculateNormalizedWidths(stats, minWidth)

        expectedWidths.forEach((expected, index) => {
          expect(widths[itemAt(PANELS, index)]).toBeCloseTo(expected, 0)
        })

        const total = Object.values(widths).reduce((sum, w) => sum + w, 0)
        if (percentages.length > 0) expect(total).toBeCloseTo(100, 1)
      })
    })
  })
})
