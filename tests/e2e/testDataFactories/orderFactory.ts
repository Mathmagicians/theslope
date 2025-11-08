// Factory for Order test data
import type { Order, OrderCreate, CreateOrdersRequest, SwapOrderRequest, OrderDetail, OrderHistory } from '~/composables/useOrderValidation'
import { useOrderValidation } from '~/composables/useOrderValidation'
import { expect, BrowserContext } from '@playwright/test'
import testHelpers from '../testHelpers'

const { headers, salt, temporaryAndRandom } = testHelpers

// Get enum schemas from composable
const { OrderStateSchema, TicketTypeSchema, OrderActionSchema } = useOrderValidation()

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

  static readonly defaultOrder = (testSalt: string = temporaryAndRandom(), overrides?: Partial<Order>): Order => ({
    id: 1,
    dinnerEventId: 5,
    inhabitantId: 10,
    bookedByUserId: 1,
    ticketPriceId: 1,
    priceAtBooking: 45,
    state: OrderStateSchema.enum.BOOKED,
    releasedAt: null,
    closedAt: null,
    createdAt: SeasonFactory.generateUniqueDate(),
    updatedAt: SeasonFactory.generateUniqueDate(),
    ...overrides
  })

  static readonly defaultOrderDetail = (testSalt: string = temporaryAndRandom(), overrides?: Partial<OrderDetail>): OrderDetail => ({
    ...OrderFactory.defaultOrder(testSalt),
    dinnerEvent: {
      id: 5,
      date: SeasonFactory.generateUniqueDate(),
      menuTitle: salt('Test Menu', testSalt),
      menuDescription: 'Test Description'
    },
    inhabitant: {
      id: 10,
      name: 'Test',
      lastName: 'User',
      pictureUrl: null
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

  static readonly defaultCreateOrdersRequest = (overrides?: Partial<CreateOrdersRequest>): CreateOrdersRequest => ({
    dinnerEventId: 5,
    orders: [
      {
        inhabitantId: 10,
        ticketPriceId: 1
      }
    ],
    ...overrides
  })

  static readonly defaultSwapOrderRequest = (overrides?: Partial<SwapOrderRequest>): SwapOrderRequest => ({
    inhabitantId: 10,
    ...overrides
  })

  static readonly defaultOrderHistory = (testSalt: string = temporaryAndRandom(), overrides?: Partial<OrderHistory>): OrderHistory => ({
    id: 1,
    orderId: 1,
    action: OrderActionSchema.enum.CREATED,
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

  // === API METHODS ===

  static readonly createOrder = async (
    context: BrowserContext,
    orderData?: Partial<CreateOrdersRequest>,
    expectedStatus: number = 201
  ): Promise<Order[]> => {
    const data = this.defaultCreateOrdersRequest(orderData)

    const response = await context.request.post('/api/booking/order', {
      headers,
      data
    })

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

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
    const response = await context.request.get(`/api/booking/order/${orderId}`, { headers })

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

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
    const response = await context.request.delete(`/api/booking/order/${orderId}`, { headers })

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

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
    const response = await context.request.post(`/api/booking/order/${orderId}/release`, { headers })

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

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

    const response = await context.request.post(`/api/booking/order/${orderId}/swap-order`, {
      headers,
      data
    })

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

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
    const response = await context.request.get(`/api/booking/order/${orderId}/history`, { headers })

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

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

    for (const id of orderIds) {
      try {
        await this.deleteOrder(context, id)
      } catch (error) {
        // Ignore 404 errors (order already deleted), log others
        console.error(`Failed to delete test order with ID ${id}:`, error)
      }
    }
  }
}

// Re-export SeasonFactory for date generation
import { SeasonFactory } from './seasonFactory'