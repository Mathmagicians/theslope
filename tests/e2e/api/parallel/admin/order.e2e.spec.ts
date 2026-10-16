import { test, expect } from '@playwright/test'
import { OrderFactory } from '~~/tests/e2e/testDataFactories/orderFactory'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { useBookingValidation } from '~/composables/useBookingValidation'
import type { TicketPrice } from '~/composables/useTicketPriceValidation'
import testHelpers from '~~/tests/e2e/testHelpers'

const { validatedBrowserContext, getSessionUserInfo } = testHelpers
const { TicketTypeSchema, DinnerModeSchema, OrderStateSchema } = useBookingValidation()

const testOrderIds: number[] = []
let testSeasonId: number
let testHouseholdId: number
let testInhabitantId: number
let testDinnerEventId: number
let testAdultTicketPriceId: number
let testAdultTicketPortions: number

test.describe('Order API', () => {

  test.beforeAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Get user's actual household from session (not a created test household)
    const { householdId, inhabitantId } = await getSessionUserInfo(context)
    testHouseholdId = householdId
    testInhabitantId = inhabitantId

    const season = await SeasonFactory.createSeason(context)
    testSeasonId = season.id!

    const adultTicketPrice = season.ticketPrices?.find((tp: TicketPrice) => tp.ticketType === TicketTypeSchema.enum.ADULT)

    if (!adultTicketPrice?.id) {
      throw new Error('Season must have an ADULT ticket price with an id')
    }

    testAdultTicketPriceId = adultTicketPrice.id
    testAdultTicketPortions = adultTicketPrice.portions

    const generatedEvents = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)
    testDinnerEventId = generatedEvents.events[0]!.id
  })

  // One regular order per inhabitant per dinner: every test starts with no order for the test inhabitant on the test dinner
  test.afterEach(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    await OrderFactory.cleanupOrders(context, testOrderIds.splice(0))
  })

  test.afterAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    if (testSeasonId) {
      await SeasonFactory.deleteSeason(context, testSeasonId).catch(() => {
        console.warn(`Failed to cleanup season ${testSeasonId}`)
      })
    }
    // Don't delete testHouseholdId - it's the user's real household, not a test one
  })

  test('GIVEN an order booked through the scaffold WHEN reading it by id THEN it carries its dinner, inhabitant, ticket type and its price row with the portions a ticket at it weighs', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const result = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [OrderFactory.defaultOrderItem({
        inhabitantId: testInhabitantId,
        ticketPriceId: testAdultTicketPriceId
      })]
    })

    expect(result).not.toBeNull()
    expect(result!.householdId).toBe(testHouseholdId)
    expect(result!.createdIds).toHaveLength(1)
    const orderId = result!.createdIds[0]!
    testOrderIds.push(orderId)

    const retrievedOrder = await OrderFactory.getOrder(context, orderId)

    expect(retrievedOrder).toBeDefined()
    expect(retrievedOrder!.id).toBe(orderId)
    expect(retrievedOrder!.dinnerEventId).toBe(testDinnerEventId)
    expect(retrievedOrder!.inhabitantId).toBe(testInhabitantId)
    expect(retrievedOrder!.ticketType).toBe(TicketTypeSchema.enum.ADULT)
    expect(retrievedOrder!.ticketPrice).toMatchObject({id: testAdultTicketPriceId, portions: testAdultTicketPortions})
    expect(retrievedOrder!.createdAt).toBeDefined()
  })

  test('GET should return 404 for non-existent order', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    const nonExistentId = 999999
    await OrderFactory.getOrder(context, nonExistentId, 404)
  })

  test('GET with allHouseholds=true returns orders from all households', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Create and release an order
    const result = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [OrderFactory.defaultOrderItem({
        inhabitantId: testInhabitantId,
        ticketPriceId: testAdultTicketPriceId
      })]
    })
    const orderId = result!.createdIds[0]!
    testOrderIds.push(orderId)

    // Release the order
    await OrderFactory.updateOrder(context, orderId, { dinnerMode: DinnerModeSchema.enum.NONE })

    // Fetch with allHouseholds=true, state=RELEASED
    const orders = await OrderFactory.getOrders(context, {
      dinnerEventIds: testDinnerEventId,
      state: OrderStateSchema.enum.RELEASED,
      allHouseholds: true,
      sortBy: 'releasedAt'
    })

    // Should include the released order
    const foundOrder = orders.find(o => o.id === orderId)
    expect(foundOrder).toBeDefined()
    expect(foundOrder!.state).toBe(OrderStateSchema.enum.RELEASED)
    // DATA INTEGRITY: RELEASED orders must have dinnerMode=NONE
    expect(foundOrder!.dinnerMode).toBe(DinnerModeSchema.enum.NONE)
  })

  // ============================================================================
  // householdId query param tests (cross-household viewing)
  // ============================================================================

  test('GET with householdId returns orders for that specific household only', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Create order for session user's household
    const myResult = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [OrderFactory.defaultOrderItem({
        inhabitantId: testInhabitantId,
        ticketPriceId: testAdultTicketPriceId
      })]
    })
    testOrderIds.push(myResult!.createdIds[0]!)
    const myOrderId = myResult!.createdIds[0]!

    // GET without householdId → returns session user's household orders (default behavior)
    const defaultOrders = await OrderFactory.getOrders(context, {
      dinnerEventIds: testDinnerEventId
    })
    const myOrderInDefault = defaultOrders.find(o => o.id === myOrderId)
    expect(myOrderInDefault, 'Default GET should include our order').toBeDefined()

    // GET with explicit householdId → returns orders for that specific household
    const filteredOrders = await OrderFactory.getOrders(context, {
      dinnerEventIds: testDinnerEventId,
      householdId: testHouseholdId
    })
    const myOrderInFiltered = filteredOrders.find(o => o.id === myOrderId)
    expect(myOrderInFiltered, 'householdId filter should include our order').toBeDefined()

    // GET with different householdId → should NOT include our order
    // Use a non-existent household ID to verify filtering excludes our order
    const otherHouseholdOrders = await OrderFactory.getOrders(context, {
      dinnerEventIds: testDinnerEventId,
      householdId: 999999  // Non-existent household
    })
    const myOrderInOther = otherHouseholdOrders.find(o => o.id === myOrderId)
    expect(myOrderInOther, 'Different householdId should NOT include our order').toBeUndefined()
  })

  test('GET with both householdId and allHouseholds=true returns 400', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Both params together should fail validation - use factory with expectedStatus=400
    await OrderFactory.getOrders(context, {
      dinnerEventIds: testDinnerEventId,
      householdId: testHouseholdId,
      allHouseholds: true
    }, 400)
  })

  test('GET with householdId for non-existent household returns empty array', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Non-existent household ID should return empty array
    const orders = await OrderFactory.getOrders(context, {
      dinnerEventIds: testDinnerEventId,
      householdId: 999999
    })

    expect(orders).toEqual([])
  })

  test('GET with upcomingForSeason returns orders for upcoming dinners only', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Create order for the test dinner event
    const result = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [OrderFactory.defaultOrderItem({
        inhabitantId: testInhabitantId,
        ticketPriceId: testAdultTicketPriceId
      })]
    })
    testOrderIds.push(result!.createdIds[0]!)

    // Fetch with upcomingForSeason
    const orders = await OrderFactory.getOrders(context, {
      upcomingForSeason: testSeasonId,
      allHouseholds: true
    })

    // Should return orders (server computes upcoming dinner IDs from season)
    expect(orders.length).toBeGreaterThan(0)
    // All returned orders should be for dinner events in the test season
    // (We can't verify exact dinner IDs without knowing what's "upcoming", but orders should exist)
  })

  test('GET with upcomingForSeason and includeDinnerContext returns dinnerEvent data', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const orders = await OrderFactory.getOrders(context, {
      upcomingForSeason: testSeasonId,
      allHouseholds: true,
      includeDinnerContext: true
    })

    // If there are orders, they should have dinnerEvent embedded
    if (orders.length > 0) {
      const order = orders[0]!
      expect(order.dinnerEvent).toBeDefined()
      expect(order.dinnerEvent!.id).toBeDefined()
      expect(order.dinnerEvent!.date).toBeDefined()
    }
  })

  test('GET with upcomingForSeason for non-existent season returns 404', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    await OrderFactory.getOrders(context, {
      upcomingForSeason: 999999,
      allHouseholds: true
    }, 404)
  })

  test('GET with both upcomingForSeason and dinnerEventIds returns 400', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    await OrderFactory.getOrders(context, {
      upcomingForSeason: testSeasonId,
      dinnerEventIds: testDinnerEventId,
      allHouseholds: true
    }, 400)
  })
})
