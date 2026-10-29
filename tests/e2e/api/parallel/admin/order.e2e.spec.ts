import { test, expect } from '@playwright/test'
import { OrderFactory } from '~~/tests/e2e/testDataFactories/orderFactory'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useTicket } from '~/composables/useTicket'
import testHelpers from '~~/tests/e2e/testHelpers'

const { validatedBrowserContext, getSessionUserInfo } = testHelpers
const { TicketTypeSchema, DinnerModeSchema, OrderStateSchema } = useBookingValidation()
const { findTicketPriceByType } = useTicket()

const testOrderIds: number[] = []
const testSeasonIds: number[] = []
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
    testSeasonIds.push(testSeasonId)

    const adultTicketPrice = findTicketPriceByType(TicketTypeSchema.enum.ADULT, season.ticketPrices)

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

    await SeasonFactory.cleanupSeasons(context, testSeasonIds)
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
    testOrderIds.push(...result!.createdIds)

    expect(result!.householdId).toBe(testHouseholdId)
    expect(result!.createdIds).toHaveLength(1)
    const orderId = result!.createdIds[0]!

    const retrievedOrder = await OrderFactory.getOrder(context, orderId)

    expect(retrievedOrder).toBeDefined()
    expect(retrievedOrder!.id).toBe(orderId)
    expect(retrievedOrder!.dinnerEventId).toBe(testDinnerEventId)
    expect(retrievedOrder!.inhabitantId).toBe(testInhabitantId)
    expect(retrievedOrder!.ticketType).toBe(TicketTypeSchema.enum.ADULT)
    expect(retrievedOrder!.ticketPrice).toMatchObject({id: testAdultTicketPriceId, portions: testAdultTicketPortions})
    expect(retrievedOrder!.createdAt).toBeDefined()
  })

  test('GET should return 404 for a removed order', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    const result = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [OrderFactory.defaultOrderItem({
        inhabitantId: testInhabitantId,
        ticketPriceId: testAdultTicketPriceId
      })]
    })
    testOrderIds.push(...result!.createdIds)
    const removedId = result!.createdIds[0]!
    await OrderFactory.deleteOrder(context, removedId)

    await OrderFactory.getOrder(context, removedId, 404)
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
    testOrderIds.push(...result!.createdIds)
    const orderId = result!.createdIds[0]!

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
    testOrderIds.push(...myResult!.createdIds)
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

    // GET with a household that holds no orders → empty, our order excluded
    const otherHouseholdOrders = await OrderFactory.getOrders(context, {
      dinnerEventIds: testDinnerEventId,
      householdId: 999999  // Non-existent household
    })
    expect(otherHouseholdOrders, 'Different householdId should NOT include our order').toEqual([])
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

  test('GET with upcomingForSeason and includeDinnerContext returns the orders of upcoming dinners with their dinner', async ({ browser }) => {
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
    testOrderIds.push(...result!.createdIds)

    // Fetch with upcomingForSeason (server computes upcoming dinner IDs from season)
    const orders = await OrderFactory.getOrders(context, {
      upcomingForSeason: testSeasonId,
      allHouseholds: true,
      includeDinnerContext: true
    })

    const order = orders.find(o => o.id === result!.createdIds[0])
    expect(order, 'The order on an upcoming dinner is returned').toBeDefined()
    expect(order!.dinnerEvent).toMatchObject({id: testDinnerEventId})
    expect(order!.dinnerEvent!.date).toBeDefined()
  })

  test('GET with upcomingForSeason for a removed season returns 404', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    const removedSeason = await SeasonFactory.createSeason(context)
    await SeasonFactory.deleteSeason(context, removedSeason.id!, 200)

    await OrderFactory.getOrders(context, {
      upcomingForSeason: removedSeason.id!,
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
