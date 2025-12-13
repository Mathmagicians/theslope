import { test, expect } from '@playwright/test'
import { OrderFactory } from '../../testDataFactories/orderFactory'
import { HouseholdFactory } from '../../testDataFactories/householdFactory'
import { SeasonFactory } from '../../testDataFactories/seasonFactory'
import { useBookingValidation } from '~/composables/useBookingValidation'
import type { TicketPrice } from '~/composables/useTicketPriceValidation'
import testHelpers from '../../testHelpers'

const { validatedBrowserContext, salt, headers } = testHelpers
const { TicketTypeSchema, DinnerModeSchema } = useBookingValidation()

const ORDER_ENDPOINT = '/api/order'

const testOrderIds: number[] = []
let testHouseholdId: number
let testInhabitantId: number
let testSeasonId: number
let testDinnerEventId: number
let testAdultTicketPriceId: number
let testChildTicketPriceId: number

test.describe('Order API', () => {

  test.beforeAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const { household, inhabitants } = await HouseholdFactory.createHouseholdWithInhabitants(
      context,
      { name: salt('Order Test Household') },
      1
    )
    testHouseholdId = household.id
    testInhabitantId = inhabitants[0]!.id

    const season = await SeasonFactory.createSeason(context)
    testSeasonId = season.id!

    const adultTicketPrice = season.ticketPrices?.find((tp: TicketPrice) => tp.ticketType === TicketTypeSchema.enum.ADULT)
    const childTicketPrice = season.ticketPrices?.find((tp: TicketPrice) => tp.ticketType === TicketTypeSchema.enum.CHILD)

    if (!adultTicketPrice?.id || !childTicketPrice?.id) {
      throw new Error('Season must have ticket prices with IDs for ADULT and CHILD')
    }

    testAdultTicketPriceId = adultTicketPrice.id
    testChildTicketPriceId = childTicketPrice.id

    const generatedEvents = await SeasonFactory.generateDinnerEventsForSeason(context, season.id!)
    testDinnerEventId = generatedEvents.events[0]!.id
  })

  test.afterAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    await Promise.all(testOrderIds.map(id =>
      OrderFactory.deleteOrder(context, id).catch(() => {
        console.warn(`Failed to cleanup order ${id}`)
      })
    ))

    if (testSeasonId) {
      await SeasonFactory.deleteSeason(context, testSeasonId).catch(() => {
        console.warn(`Failed to cleanup season ${testSeasonId}`)
      })
    }

    if (testHouseholdId) {
      await HouseholdFactory.deleteHousehold(context, testHouseholdId).catch(() => {
        console.warn(`Failed to cleanup household ${testHouseholdId}`)
      })
    }
  })

  test('PUT can create and GET can retrieve order with status 200/201', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const result = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [
        {
          inhabitantId: testInhabitantId,
          ticketPriceId: testAdultTicketPriceId,
          bookedByUserId: 1,
          dinnerMode: DinnerModeSchema.enum.DINEIN
        }
      ]
    })

    expect(result.householdId).toBe(testHouseholdId)
    expect(result.createdIds).toHaveLength(1)
    const orderId = result.createdIds[0]!
    testOrderIds.push(orderId)

    const retrievedOrder = await OrderFactory.getOrder(context, orderId)

    expect(retrievedOrder).toBeDefined()
    expect(retrievedOrder!.id).toBe(orderId)
    expect(retrievedOrder!.dinnerEventId).toBe(testDinnerEventId)
    expect(retrievedOrder!.inhabitantId).toBe(testInhabitantId)
    expect(retrievedOrder!.ticketType).toBe(TicketTypeSchema.enum.ADULT)
    expect(retrievedOrder!.createdAt).toBeDefined()
  })

  test('DELETE can remove existing order with status 200', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const result = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [
        {
          inhabitantId: testInhabitantId,
          ticketPriceId: testChildTicketPriceId,
          bookedByUserId: 1,
          dinnerMode: DinnerModeSchema.enum.DINEIN
        }
      ]
    })
    expect(result.createdIds).toHaveLength(1)
    const orderId = result.createdIds[0]!

    const deletedOrder = await OrderFactory.deleteOrder(context, orderId)

    expect(deletedOrder).toBeDefined()
    expect(deletedOrder!.id).toBe(orderId)

    const response = await context.request.get(`${ORDER_ENDPOINT}/${orderId}`)
    expect(response.status()).toBe(404)
  })

  test('GET should return 404 for non-existent order', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    const nonExistentId = 999999
    await OrderFactory.getOrder(context, nonExistentId, 404)
  })

  test('PUT should validate required fields', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const invalidData = {
      dinnerEventId: testDinnerEventId,
      ticketType: TicketTypeSchema.enum.ADULT
    }

    const response = await context.request.put(ORDER_ENDPOINT, {
      headers: { 'Content-Type': 'application/json' },
      data: invalidData
    })

    expect(response.status()).toBe(400)
  })

  test('PUT should validate ticket type enum', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const invalidData = {
      dinnerEventId: testDinnerEventId,
      inhabitantId: testInhabitantId,
      ticketType: 'INVALID_TYPE'
    }

    const response = await context.request.put(ORDER_ENDPOINT, {
      headers: { 'Content-Type': 'application/json' },
      data: invalidData
    })

    expect(response.status()).toBe(400)
  })

  test('GIVEN orders with different bookedByUserId WHEN creating batch THEN fails with 400', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const invalidData = {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [
        {
          inhabitantId: testInhabitantId,
          ticketPriceId: testAdultTicketPriceId,
          dinnerMode: 'DINEIN',
          bookedByUserId: 1
        },
        {
          inhabitantId: testInhabitantId,
          ticketPriceId: testChildTicketPriceId,
          dinnerMode: 'DINEIN',
          bookedByUserId: 999
        }
      ]
    }

    const response = await context.request.put(ORDER_ENDPOINT, {
      headers,
      data: invalidData
    })

    expect(response.status()).toBe(400)
    const errorBody = await response.json()
    expect(errorBody.message || errorBody.statusMessage).toMatch(/samme bruger/i)
  })

  test('GIVEN orders from different households WHEN creating batch THEN fails with 400', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const household2 = await HouseholdFactory.createHousehold(context)
    const inhabitant2 = await HouseholdFactory.createInhabitantForHousehold(context, household2.id, 'TestPerson2')

    const invalidData = {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [
        {
          inhabitantId: testInhabitantId,
          ticketPriceId: testAdultTicketPriceId,
          dinnerMode: 'DINEIN',
          bookedByUserId: 1
        },
        {
          inhabitantId: inhabitant2.id,
          ticketPriceId: testAdultTicketPriceId,
          dinnerMode: 'DINEIN',
          bookedByUserId: 1
        }
      ]
    }

    const response = await context.request.put(ORDER_ENDPOINT, {
      headers,
      data: invalidData
    })

    expect(response.status()).toBe(400)
    const errorBody = await response.json()
    expect(errorBody.message || errorBody.statusMessage).toMatch(/same household|household/i)

    await HouseholdFactory.deleteHousehold(context, household2.id)
  })

  test('GIVEN multiple orders for same inhabitant WHEN creating batch THEN succeeds', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const validData = {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [
        {
          inhabitantId: testInhabitantId,
          ticketPriceId: testAdultTicketPriceId,
          dinnerMode: 'DINEIN',
          bookedByUserId: 1
        },
        {
          inhabitantId: testInhabitantId,
          ticketPriceId: testChildTicketPriceId,
          dinnerMode: 'DINEIN',
          bookedByUserId: 1
        }
      ]
    }

    const response = await context.request.put(ORDER_ENDPOINT, {
      headers,
      data: validData
    })

    const errorBody = response.status() !== 201 ? await response.json() : null
    expect(response.status(), `Expected 201 but got ${response.status()}: ${JSON.stringify(errorBody)}`).toBe(201)
    const result = await response.json()

    // CreateOrdersResult: { householdId, createdIds }
    expect(result.householdId).toBe(testHouseholdId)
    expect(result.createdIds).toHaveLength(2)

    for (const id of result.createdIds) {
      testOrderIds.push(id)
    }
  })
})
