// Factory for Order test data
import type { Order, OrderCreate } from '~/composables/useOrderValidation'
import { expect, BrowserContext } from '@playwright/test'
import testHelpers from '../testHelpers'

const { headers } = testHelpers
const ORDER_ENDPOINT = '/api/order'

export class OrderFactory {
  // === DEFAULT DATA ===

  static readonly defaultOrder = (overrides?: Partial<Order>): Order => ({
    id: 1,
    dinnerEventId: 5,
    inhabitantId: 10,
    ticketType: 'ADULT',
    createdAt: new Date(2025, 0, 1), // Jan 1, 2025
    updatedAt: new Date(2025, 0, 1), // Jan 1, 2025
    ...overrides
  })

  static readonly defaultOrderCreate = (overrides?: Partial<OrderCreate>): OrderCreate => ({
    dinnerEventId: 5,
    inhabitantId: 10,
    ticketType: 'ADULT',
    ...overrides
  })

  // === API METHODS ===

  static readonly createOrder = async (
    context: BrowserContext,
    orderData?: Partial<OrderCreate>,
    expectedStatus: number = 201
  ): Promise<Order> => {
    const data = this.defaultOrderCreate(orderData)

    const response = await context.request.put(ORDER_ENDPOINT, {
      headers,
      data
    })

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

    if (expectedStatus === 201) {
      const responseBody = await response.json()
      expect(responseBody.id, 'Response should contain the new order ID').toBeDefined()
      return responseBody
    }

    return await response.json()
  }

  static readonly getOrder = async (
    context: BrowserContext,
    orderId: number,
    expectedStatus: number = 200
  ): Promise<Order | null> => {
    const response = await context.request.get(`${ORDER_ENDPOINT}/${orderId}`)

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
    const response = await context.request.delete(`${ORDER_ENDPOINT}/${orderId}`)

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return null
  }
}