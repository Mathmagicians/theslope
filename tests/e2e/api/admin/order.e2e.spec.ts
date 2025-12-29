import { test, expect } from '@playwright/test'
import { OrderFactory } from '../../testDataFactories/orderFactory'
import { HouseholdFactory } from '../../testDataFactories/householdFactory'
import { SeasonFactory } from '../../testDataFactories/seasonFactory'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import type { TicketPrice } from '~/composables/useTicketPriceValidation'
import testHelpers from '../../testHelpers'

const { validatedBrowserContext, salt, headers, getSessionUserInfo } = testHelpers
const { TicketTypeSchema, DinnerModeSchema, OrderStateSchema } = useBookingValidation()
const { createDefaultWeekdayMap } = useWeekDayMapValidation()

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

    // Get user's actual household from session (not a created test household)
    const { householdId, inhabitantId } = await getSessionUserInfo(context)
    testHouseholdId = householdId
    testInhabitantId = inhabitantId

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
    // Don't delete testHouseholdId - it's the user's real household, not a test one
  })

  test('PUT can create and GET can retrieve order with status 200/201', async ({ browser }) => {
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
    expect(retrievedOrder!.createdAt).toBeDefined()
  })

  test('POST can update order dinnerMode with status 200', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Create an order first
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

    // Update to TAKEAWAY
    const updatedOrder = await OrderFactory.updateOrder(context, orderId, {
      dinnerMode: DinnerModeSchema.enum.TAKEAWAY
    })

    expect(updatedOrder).toBeDefined()
    expect(updatedOrder!.id).toBe(orderId)
    expect(updatedOrder!.dinnerMode).toBe(DinnerModeSchema.enum.TAKEAWAY)

    // Verify the change persisted
    const retrievedOrder = await OrderFactory.getOrder(context, orderId)
    expect(retrievedOrder!.dinnerMode).toBe(DinnerModeSchema.enum.TAKEAWAY)
  })

  test('POST cancellation AFTER deadline releases order (state=RELEASED, user pays)', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Default season events are within 7 days (< 10 day deadline) = AFTER deadline
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

    // Cancel by setting dinnerMode to NONE
    const updatedOrder = await OrderFactory.updateOrder(context, orderId, {
      dinnerMode: DinnerModeSchema.enum.NONE
    })

    // Order should be RELEASED (not deleted) - user still pays
    expect(updatedOrder).toBeDefined()
    expect(updatedOrder!.id).toBe(orderId)
    expect(updatedOrder!.dinnerMode).toBe(DinnerModeSchema.enum.NONE)
    expect(updatedOrder!.state).toBe(OrderStateSchema.enum.RELEASED)
    expect(updatedOrder!.releasedAt).toBeDefined()

    // Order should still exist in database
    const retrievedOrder = await OrderFactory.getOrder(context, orderId)
    expect(retrievedOrder).toBeDefined()
    expect(retrievedOrder!.state).toBe(OrderStateSchema.enum.RELEASED)
  })

  test('POST cancellation BEFORE deadline deletes order (user not charged)', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Create season with events far in the future (15+ days = BEFORE 10-day deadline)
    const futureStart = new Date()
    futureStart.setDate(futureStart.getDate() + 15)
    const futureEnd = new Date(futureStart)
    futureEnd.setDate(futureEnd.getDate() + 7)

    const futureSeason = await SeasonFactory.createSeason(context, {
      shortName: salt('FutureCancelTest'),
      seasonDates: { start: futureStart, end: futureEnd },
      cookingDays: createDefaultWeekdayMap([true, true, true, true, true, false, false]) // Mon-Fri
    })

    try {
      const futureDinnerEventId = futureSeason.dinnerEvents![0]!.id
      const futureTicketPriceId = futureSeason.ticketPrices!.find(tp => tp.ticketType === TicketTypeSchema.enum.ADULT)!.id!

      // Create order for future dinner
      const result = await OrderFactory.createOrder(context, {
        householdId: testHouseholdId,
        dinnerEventId: futureDinnerEventId,
        orders: [OrderFactory.defaultOrderItem({
          inhabitantId: testInhabitantId,
          ticketPriceId: futureTicketPriceId
        })]
      })
      const orderId = result!.createdIds[0]!

      // Cancel by setting dinnerMode to NONE
      const updatedOrder = await OrderFactory.updateOrder(context, orderId, {
        dinnerMode: DinnerModeSchema.enum.NONE
      })

      // Response should show NONE dinnerMode
      expect(updatedOrder).toBeDefined()
      expect(updatedOrder!.dinnerMode).toBe(DinnerModeSchema.enum.NONE)

      // Order should be DELETED from database (not found)
      await OrderFactory.getOrder(context, orderId, 404)
    } finally {
      // Cleanup future season
      await SeasonFactory.deleteSeason(context, futureSeason.id!)
    }
  })

  test('POST returns 400 for invalid dinnerMode', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    // Create an order first
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

    // Try to update with invalid dinnerMode
    await OrderFactory.updateOrder(context, orderId, {
      dinnerMode: 'INVALID_MODE'
    }, 400)
  })

  test('DELETE can remove existing order with status 200', async ({ browser }) => {
    const context = await validatedBrowserContext(browser)

    const result = await OrderFactory.createOrder(context, {
      householdId: testHouseholdId,
      dinnerEventId: testDinnerEventId,
      orders: [OrderFactory.defaultOrderItem({
        inhabitantId: testInhabitantId,
        ticketPriceId: testChildTicketPriceId
      })]
    })
    expect(result!.createdIds).toHaveLength(1)
    const orderId = result!.createdIds[0]!

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
