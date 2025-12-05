// Factory for Order test data
import type { OrderDisplay, CreateOrdersRequest, SwapOrderRequest, OrderDetail, OrderHistory, OrderCreateWithPrice, AuditContext, CreateOrdersResult } from '~/composables/useBookingValidation'
import { useBookingValidation } from '~/composables/useBookingValidation'
import type { BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test'
import testHelpers from '../testHelpers'

// Re-export SeasonFactory for date generation
import { SeasonFactory } from './seasonFactory'

const { headers, salt, temporaryAndRandom } = testHelpers

// Get enum schemas from composable
const { OrderStateSchema, TicketTypeSchema, DinnerModeSchema, DinnerStateSchema } = useBookingValidation()

// API endpoints
const ORDER_ENDPOINT = '/api/order'

export class OrderFactory {
  // === DEFAULT DATA ===

  /**
   * Generate a unique test date to avoid collisions between parallel test runs
   * Uses year 5025-5124 to avoid conflicts with real data
   */
  static readonly generateUniqueDate = (): Date => {
    const randomYearOffset = Math.floor(Math.random() * 100) // 0-99
    const randomMonth = Math.floor(Math.random() * 12) // 0-11
    const randomDay = Math.floor(Math.random() * 28) + 1 // 1-28 (safe for all months)
    const year = 5025 + randomYearOffset
    return new Date(year, randomMonth, randomDay)
  }

  static readonly defaultOrder = (_testSalt: string = temporaryAndRandom(), overrides?: Partial<OrderDisplay>): OrderDisplay => ({
    id: 1,
    dinnerEventId: 5,
    inhabitantId: 10,
    bookedByUserId: 1,
    ticketPriceId: 1,
    ticketType: TicketTypeSchema.enum.ADULT,
    priceAtBooking: 45,
    dinnerMode: DinnerModeSchema.enum.DINEIN,
    state: OrderStateSchema.enum.BOOKED,
    releasedAt: null,
    closedAt: null,
    createdAt: SeasonFactory.generateUniqueDate(),
    updatedAt: SeasonFactory.generateUniqueDate(),
    ticketPrice: {
      id: 1,
      ticketType: TicketTypeSchema.enum.ADULT,
      price: 45,
      description: 'Adult ticket'
    },
    ...overrides
  })

  static readonly defaultOrderDetail = (testSalt: string = temporaryAndRandom(), overrides?: Partial<OrderDetail>): OrderDetail => ({
    ...OrderFactory.defaultOrder(testSalt),
    dinnerEvent: {
      id: 5,
      date: SeasonFactory.generateUniqueDate(),
      menuTitle: salt('Test Menu', testSalt),
      menuDescription: 'Test Description',
      menuPictureUrl: null,
      state: DinnerStateSchema.enum.SCHEDULED,
      totalCost: 0,
      heynaboEventId: null,
      chefId: null,
      cookingTeamId: null,
      seasonId: null,
      createdAt: SeasonFactory.generateUniqueDate(),
      updatedAt: SeasonFactory.generateUniqueDate()
    },
    inhabitant: {
      id: 10,
      heynaboId: 1001,
      householdId: 1,
      name: 'Test',
      lastName: 'User',
      pictureUrl: null,
      dinnerPreferences: null,
      allergies: []
    },
    bookedByUser: {
      id: 1,
      email: salt('test@example.com', testSalt)
    },
    ticketPrice: {
      id: 1,
      ticketType: TicketTypeSchema.enum.ADULT,
      price: 45,
      description: 'Adult ticket'
    },
    ...overrides
  })

  static readonly defaultCreateOrdersRequest = (overrides?: Partial<CreateOrdersRequest>): CreateOrdersRequest => {
    const defaults = {
      dinnerEventId: 5,
      orders: [
        {
          inhabitantId: 10,
          bookedByUserId: 1,
          ticketPriceId: 1,
          dinnerMode: DinnerModeSchema.enum.DINEIN
        }
      ]
    }

    // Deep merge orders array to preserve default fields
    if (overrides?.orders) {
      return {
        ...defaults,
        ...overrides,
        orders: overrides.orders.map(order => {
          const defaultOrder = defaults.orders[0]
          return {
            ...order,
            bookedByUserId: order.bookedByUserId ?? defaultOrder?.bookedByUserId,
            dinnerMode: order.dinnerMode ?? defaultOrder?.dinnerMode
          }
        })
      }
    }

    return {
      ...defaults,
      ...overrides
    }
  }

  static readonly defaultSwapOrderRequest = (overrides?: Partial<SwapOrderRequest>): SwapOrderRequest => ({
    inhabitantId: 10,
    ...overrides
  })

  static readonly defaultOrderHistory = (_testSalt: string = temporaryAndRandom(), overrides?: Partial<OrderHistory>): OrderHistory => ({
    id: 1,
    orderId: 1,
    action: OrderStateSchema.enum.BOOKED,
    performedByUserId: 1,
    auditData: JSON.stringify({
      inhabitantId: 10,
      bookedByUserId: 1,
      ticketPriceId: 1,
      priceAtBooking: 45
    }),
    timestamp: SeasonFactory.generateUniqueDate(),
    ...overrides
  })

  // === BULK ORDER CREATION ===

  static readonly defaultOrderCreateWithPrice = (householdId: number = 1, overrides?: Partial<OrderCreateWithPrice>): OrderCreateWithPrice => ({
    dinnerEventId: 1,
    inhabitantId: 1,
    bookedByUserId: null,
    ticketPriceId: 1,
    priceAtBooking: 4000,
    householdId,
    dinnerMode: DinnerModeSchema.enum.DINEIN,
    state: OrderStateSchema.enum.BOOKED,
    ...overrides
  })

  static readonly defaultAuditContext = (overrides?: Partial<AuditContext>): AuditContext => ({
    action: 'BULK_IMPORT',
    performedByUserId: 1,
    source: 'csv_billing',
    ...overrides
  })

  static readonly defaultCreateOrdersResult = (overrides?: Partial<CreateOrdersResult>): CreateOrdersResult => ({
    householdId: 1,
    createdIds: [1, 2, 3],
    ...overrides
  })

  /**
   * Create a batch of orders for same household (for OrdersBatchSchema tests)
   */
  static readonly createOrdersBatch = (householdId: number, count: number): OrderCreateWithPrice[] =>
    Array.from({length: count}, (_, i) => OrderFactory.defaultOrderCreateWithPrice(householdId, {inhabitantId: i + 1}))

  // === API METHODS ===

  static readonly createOrder = async (
    context: BrowserContext,
    orderData?: Partial<CreateOrdersRequest>,
    expectedStatus: number = 201
  ): Promise<Order[]> => {
    const data = this.defaultCreateOrdersRequest(orderData)

    const response = await context.request.put(ORDER_ENDPOINT, {
      headers,
      data
    })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 201) {
      const responseBody = await response.json()
      expect(Array.isArray(responseBody), 'Response should be array of orders').toBe(true)
      return responseBody
    }

    return await response.json()
  }

  static readonly getOrder = async (
    context: BrowserContext,
    orderId: number,
    expectedStatus: number = 200
  ): Promise<OrderDetail | null> => {
    const response = await context.request.get(`${ORDER_ENDPOINT}/${orderId}`, { headers })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return null
  }

  static readonly deleteOrder = async (
    context: BrowserContext,
    orderId: number,
    expectedStatus: number = 200
  ): Promise<Order | null> => {
    const response = await context.request.delete(`${ORDER_ENDPOINT}/${orderId}`, { headers })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return null
  }

  static readonly releaseOrder = async (
    context: BrowserContext,
    orderId: number,
    expectedStatus: number = 200
  ): Promise<Order | null> => {
    const response = await context.request.post(`${ORDER_ENDPOINT}/${orderId}/release`, { headers })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return null
  }

  static readonly swapOrder = async (
    context: BrowserContext,
    orderId: number,
    swapData?: Partial<SwapOrderRequest>,
    expectedStatus: number = 200
  ): Promise<Order | null> => {
    const data = this.defaultSwapOrderRequest(swapData)

    const response = await context.request.post(`${ORDER_ENDPOINT}/${orderId}/swap-order`, {
      headers,
      data
    })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return null
  }

  static readonly getOrderHistory = async (
    context: BrowserContext,
    orderId: number,
    expectedStatus: number = 200
  ): Promise<OrderHistory[]> => {
    const response = await context.request.get(`${ORDER_ENDPOINT}/${orderId}/history`, { headers })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return []
  }

  /**
   * Cleanup multiple orders by ID (for test afterAll hooks)
   * Gracefully handles 404 errors for already-deleted orders
   */
  static readonly cleanupOrders = async (
    context: BrowserContext,
    orderIds: number[]
  ): Promise<void> => {
    if (orderIds.length === 0) return

    await Promise.all(orderIds.map(async (id) => {
      const response = await context.request.delete(`${ORDER_ENDPOINT}/${id}`)
      if (response.status() !== 200 && response.status() !== 404) {
        console.warn(`Failed to cleanup order ${id}: status ${response.status()}`)
      }
    }))
  }
}
