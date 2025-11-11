import { test, expect } from '@playwright/test'
import { OrderFactory } from '../../testDataFactories/orderFactory'
import { HouseholdFactory } from '../../testDataFactories/householdFactory'
import { SeasonFactory } from '../../testDataFactories/seasonFactory'
import { useOrderValidation } from '~/composables/useOrderValidation'
import type { TicketPrice } from '~/composables/useTicketPriceValidation'
import testHelpers from '../../testHelpers'

const { validatedBrowserContext, salt } = testHelpers
const { TicketTypeSchema } = useOrderValidation()

const ORDER_ENDPOINT = '/api/order'

// Variables for cleanup and test data
let testOrderIds: number[] = []
let testHouseholdId: number
let testInhabitantId: number
let testSeasonId: number
let testDinnerEventId: number
let testAdultTicketPriceId: number
let testChildTicketPriceId: number

test.describe('Order/api/order CRUD operations', () => {

  // Setup: Create prerequisite data (household, inhabitant, season, dinner event)
  test.beforeAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Create household with one inhabitant
    const { household, inhabitants } = await HouseholdFactory.createHouseholdWithInhabitants(
      context,
      { name: salt('Order Test Household') },
      1
    )
    testHouseholdId = household.id
    testInhabitantId = inhabitants[0].id

    // Create season
    const season = await SeasonFactory.createSeason(context)
    testSeasonId = season.id

    // Extract ticket price IDs from season
    const adultTicketPrice = season.ticketPrices?.find((tp: TicketPrice) => tp.ticketType === TicketTypeSchema.enum.ADULT)
    const childTicketPrice = season.ticketPrices?.find((tp: TicketPrice) => tp.ticketType === TicketTypeSchema.enum.CHILD)

    if (!adultTicketPrice?.id || !childTicketPrice?.id) {
      throw new Error('Season must have ticket prices with IDs for ADULT and CHILD')
    }

    testAdultTicketPriceId = adultTicketPrice.id
    testChildTicketPriceId = childTicketPrice.id

    // Generate dinner events for the season
    const generatedEvents = await SeasonFactory.generateDinnerEventsForSeason(context, season.id)
    testDinnerEventId = generatedEvents.events[0].id
  })

  test.afterAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Cleanup orders
    await Promise.all(testOrderIds.map(id =>
      OrderFactory.deleteOrder(context, id).catch(() => {
        console.warn(`Failed to cleanup order ${id}`)
      })
    ))

    // Cleanup season (cascades to dinner events via ADR-005)
    if (testSeasonId) {
      await SeasonFactory.deleteSeason(context, testSeasonId).catch(() => {
        console.warn(`Failed to cleanup season ${testSeasonId}`)
      })
    }

    // Cleanup household (cascades to inhabitants via ADR-005)
    if (testHouseholdId) {
      await HouseholdFactory.deleteHousehold(context, testHouseholdId).catch(() => {
        console.warn(`Failed to cleanup household ${testHouseholdId}`)
      })
    }
  })

  test('PUT can create and GET can retrieve order with status 200/201', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Valid order data with existing dinnerEvent and inhabitant
    // WHEN: Create order (factory validates 201 and id exists)
    const orders = await OrderFactory.createOrder(context, {
      dinnerEventId: testDinnerEventId,
      orders: [
        {
          inhabitantId: testInhabitantId,
          ticketPriceId: testAdultTicketPriceId
        }
      ]
    })

    // THEN: Verify order was created
    expect(orders).toBeDefined()
    expect(orders.length).toBeGreaterThan(0)
    const order = orders[0]
    expect(order).toBeDefined()
    expect(order!.id).toBeDefined()
    testOrderIds.push(order!.id)

    // THEN: Verify essential fields exist
    expect(order!.dinnerEventId).toBe(testDinnerEventId)
    expect(order!.inhabitantId).toBe(testInhabitantId)
    expect(order!.ticketType).toBe(TicketTypeSchema.enum.ADULT)
    expect(order!.createdAt).toBeDefined()

    // WHEN: Retrieve the created order
    const retrievedOrder = await OrderFactory.getOrder(context, order!.id)

    // THEN: Retrieved order matches created order
    expect(retrievedOrder).toBeDefined()
    expect(retrievedOrder!.id).toBe(order!.id)
    expect(retrievedOrder!.ticketType).toBe(TicketTypeSchema.enum.ADULT)
  })

  test('DELETE can remove existing order with status 200', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Create order first
    const orders = await OrderFactory.createOrder(context, {
      dinnerEventId: testDinnerEventId,
      orders: [
        {
          inhabitantId: testInhabitantId,
          ticketPriceId: testChildTicketPriceId
        }
      ]
    })
    expect(orders).toBeDefined()
    expect(orders.length).toBeGreaterThan(0)
    const order = orders[0]
    expect(order).toBeDefined()
    expect(order!.id).toBeDefined()

    // WHEN: Delete order
    const deletedOrder = await OrderFactory.deleteOrder(context, order!.id)

    // THEN: Deletion successful
    expect(deletedOrder).toBeDefined()
    expect(deletedOrder!.id).toBe(order!.id)

    // THEN: Verify order is deleted - should get 404
    const response = await context.request.get(`${ORDER_ENDPOINT}/${order!.id}`)
    expect(response.status()).toBe(404)
  })

  test('GET should return 404 for non-existent order', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Non-existent order ID
    const nonExistentId = 999999

    // WHEN/THEN: Get non-existent order should return 404
    await OrderFactory.getOrder(context, nonExistentId, 404)
  })

  test('PUT should validate required fields', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Invalid order data (missing inhabitantId)
    const invalidData = {
      dinnerEventId: testDinnerEventId,
      ticketType: TicketTypeSchema.enum.ADULT
      // Missing inhabitantId
    }

    // WHEN/THEN: Create should fail with 400
    const response = await context.request.put(ORDER_ENDPOINT, {
      headers: { 'Content-Type': 'application/json' },
      data: invalidData
    })

    expect(response.status()).toBe(400)
  })

  test('PUT should validate ticket type enum', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Invalid ticket type
    const invalidData = {
      dinnerEventId: testDinnerEventId,
      inhabitantId: testInhabitantId,
      ticketType: 'INVALID_TYPE'
    }

    // WHEN/THEN: Create should fail with 400
    const response = await context.request.put(ORDER_ENDPOINT, {
      headers: { 'Content-Type': 'application/json' },
      data: invalidData
    })

    expect(response.status()).toBe(400)
  })
})
