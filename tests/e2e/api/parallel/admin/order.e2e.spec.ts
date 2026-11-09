import { test, expect } from '@playwright/test'
import { OrderFactory } from '~~/tests/e2e/testDataFactories/orderFactory'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useTicket } from '~/composables/useTicket'
import testHelpers from '~~/tests/e2e/testHelpers'
import {itemAt, present} from '~~/tests/component/listHelpers'

const { validatedBrowserContext, getSessionUserInfo } = testHelpers
const { TicketTypeSchema, DinnerModeSchema, OrderStateSchema, OrderSortBySchema } = useBookingValidation()
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
    testSeasonId = present(season.id, 'season id')
    testSeasonIds.push(testSeasonId)

    const adultTicketPrice = findTicketPriceByType(TicketTypeSchema.enum.ADULT, season.ticketPrices)

    if (!adultTicketPrice?.id) {
      throw new Error('Season must have an ADULT ticket price with an id')
    }

    testAdultTicketPriceId = adultTicketPrice.id
    testAdultTicketPortions = adultTicketPrice.portions

    const generatedEvents = await SeasonFactory.generateDinnerEventsForSeason(context, testSeasonId)
    testDinnerEventId = itemAt(generatedEvents.events, 0).id
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
    const {householdId, createdIds} = present(result, 'created orders')
    testOrderIds.push(...createdIds)

    expect(householdId).toBe(testHouseholdId)
    expect(createdIds).toHaveLength(1)
    const orderId = itemAt(createdIds, 0)

    const retrievedOrder = present(await OrderFactory.getOrder(context, orderId), `order ${orderId}`)

    expect(retrievedOrder.id).toBe(orderId)
    expect(retrievedOrder.dinnerEventId).toBe(testDinnerEventId)
    expect(retrievedOrder.inhabitantId).toBe(testInhabitantId)
    expect(retrievedOrder.ticketType).toBe(TicketTypeSchema.enum.ADULT)
    expect(retrievedOrder.ticketPrice).toMatchObject({id: testAdultTicketPriceId, portions: testAdultTicketPortions})
    expect(retrievedOrder.createdAt).toBeDefined()
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
    const {createdIds} = present(result, 'created orders')
    testOrderIds.push(...createdIds)
    const removedId = itemAt(createdIds, 0)
    await OrderFactory.deleteOrder(context, removedId)

    await OrderFactory.getOrder(context, removedId, 404)
  })

  test('GET with allHouseholds=true returns orders from all households', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const result = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [OrderFactory.defaultOrderItem({
        inhabitantId: testInhabitantId,
        ticketPriceId: testAdultTicketPriceId
      })]
    })
    const {createdIds} = present(result, 'created orders')
    testOrderIds.push(...createdIds)
    const orderId = itemAt(createdIds, 0)

    // Release the order
    await OrderFactory.updateOrder(context, orderId, { dinnerMode: DinnerModeSchema.enum.NONE })

    const orders = await OrderFactory.getOrders(context, {
      dinnerEventIds: testDinnerEventId,
      state: OrderStateSchema.enum.RELEASED,
      allHouseholds: true,
      sortBy: OrderSortBySchema.enum.releasedAt
    })

    const foundOrder = present(orders.find(o => o.id === orderId), `released order ${orderId}`)
    expect(foundOrder.state).toBe(OrderStateSchema.enum.RELEASED)
    // DATA INTEGRITY: RELEASED orders must have dinnerMode=NONE
    expect(foundOrder.dinnerMode).toBe(DinnerModeSchema.enum.NONE)
  })

  // ============================================================================
  // householdId query param tests (cross-household viewing)
  // ============================================================================

  test('GET with householdId returns orders for that specific household only', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const myResult = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [OrderFactory.defaultOrderItem({
        inhabitantId: testInhabitantId,
        ticketPriceId: testAdultTicketPriceId
      })]
    })
    const {createdIds} = present(myResult, 'created orders')
    testOrderIds.push(...createdIds)
    const myOrderId = itemAt(createdIds, 0)

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

    await OrderFactory.getOrders(context, {
      dinnerEventIds: testDinnerEventId,
      householdId: testHouseholdId,
      allHouseholds: true
    }, 400)
  })

  test('GET with upcomingForSeason and includeCostContext returns each order of the upcoming dinners with its dinner and its eater, and without the flag neither', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const result = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [OrderFactory.defaultOrderItem({
        inhabitantId: testInhabitantId,
        ticketPriceId: testAdultTicketPriceId
      })]
    })
    const {createdIds} = present(result, 'created orders')
    testOrderIds.push(...createdIds)
    const orderId = itemAt(createdIds, 0)

    // The server computes the upcoming dinners from the season
    const withContext = await OrderFactory.getOrders(context, {
      upcomingForSeason: testSeasonId,
      allHouseholds: true,
      includeCostContext: true
    })
    const order = present(withContext.find(o => o.id === orderId), `upcoming order ${orderId} with its cost context`)
    // The dinner as its Display, the cost from its expenses
    expect(order.dinnerEvent).toMatchObject({id: testDinnerEventId, state: expect.any(String), totalCost: expect.any(Number)})
    expect(order.inhabitant).toMatchObject({id: testInhabitantId, householdId: testHouseholdId})

    const withoutContext = await OrderFactory.getOrders(context, {
      upcomingForSeason: testSeasonId,
      allHouseholds: true
    })
    const bare = present(withoutContext.find(o => o.id === orderId), `upcoming order ${orderId}`)
    expect(bare.dinnerEvent).toBeUndefined()
    expect(bare.inhabitant).toBeUndefined()
  })

  test('GET with upcomingForSeason for a removed season returns 404', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    const removedSeason = await SeasonFactory.createSeason(context)
    const removedSeasonId = present(removedSeason.id, 'removed season id')
    await SeasonFactory.deleteSeason(context, removedSeasonId, 200)

    await OrderFactory.getOrders(context, {
      upcomingForSeason: removedSeasonId,
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
