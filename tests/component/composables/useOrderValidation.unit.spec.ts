import { describe, it, expect } from 'vitest'
import { useOrderValidation } from '~/composables/useOrderValidation'
import { OrderFactory } from '../../e2e/testDataFactories/orderFactory'

// Helper to format validation error messages for assertions
const getValidationError = (result: any) =>
  !result.success ? `Validation errors: ${JSON.stringify(result.error.format())}` : ''

describe('useOrderValidation', () => {
  const {
    OrderStateSchema,
    TicketTypeSchema,
    OrderActionSchema,
    CreateOrdersRequestSchema,
    SwapOrderRequestSchema,
    OrderQuerySchema,
    OrderIdSchema,
    OrderSchema,
    OrderDetailSchema,
    OrderHistorySchema,
    serializeOrder,
    deserializeOrder,
    serializeOrderHistory,
    deserializeOrderHistory
  } = useOrderValidation()

  describe('Input Schemas', () => {
    describe('CreateOrdersRequestSchema', () => {
      it('should accept valid order creation with single order', () => {
        const validInput = OrderFactory.defaultCreateOrdersRequest()

        const result = CreateOrdersRequestSchema.safeParse(validInput)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it('should accept multiple orders (up to 20)', () => {
        const validInput = OrderFactory.defaultCreateOrdersRequest({
          orders: Array(20).fill(null).map(() => ({
            inhabitantId: 10,
            ticketPriceId: 1
          }))
        })

        const result = CreateOrdersRequestSchema.safeParse(validInput)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it.each([
        { field: 'dinnerEventId', value: -1, reason: 'negative dinnerEventId' },
        { field: 'dinnerEventId', value: 0, reason: 'zero dinnerEventId' },
        { field: 'dinnerEventId', value: 1.5, reason: 'non-integer dinnerEventId' }
      ])('should reject invalid $reason', ({ field, value }) => {
        const invalidInput = OrderFactory.defaultCreateOrdersRequest({
          [field]: value
        })

        const result = CreateOrdersRequestSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })

      it('should reject empty orders array', () => {
        const invalidInput = OrderFactory.defaultCreateOrdersRequest({ orders: [] })

        const result = CreateOrdersRequestSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })

      it('should reject more than 20 orders', () => {
        const invalidInput = OrderFactory.defaultCreateOrdersRequest({
          orders: Array(21).fill(null).map(() => ({
            inhabitantId: 10,
            ticketPriceId: 1
          }))
        })

        const result = CreateOrdersRequestSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })
    })

    describe('SwapOrderRequestSchema', () => {
      it('should accept valid swap order input', () => {
        const validInput = OrderFactory.defaultSwapOrderRequest()

        const result = SwapOrderRequestSchema.safeParse(validInput)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it.each([
        { value: -1, reason: 'negative inhabitantId' },
        { value: 0, reason: 'zero inhabitantId' },
        { value: 1.5, reason: 'non-integer inhabitantId' }
      ])('should reject $reason', ({ value }) => {
        const invalidInput = OrderFactory.defaultSwapOrderRequest({
          inhabitantId: value
        })

        const result = SwapOrderRequestSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
      })
    })

    describe('OrderQuerySchema', () => {
      it('should accept all query parameters as optional', () => {
        const validQueries = [
          {},
          { state: OrderStateSchema.enum.BOOKED },
          { fromDate: new Date(2025, 0, 1) },
          { toDate: new Date(2025, 0, 31) },
          {
            state: OrderStateSchema.enum.RELEASED,
            fromDate: new Date(2025, 0, 1),
            toDate: new Date(2025, 0, 31)
          }
        ]

        validQueries.forEach(query => {
          const result = OrderQuerySchema.safeParse(query)
          expect(result.success, getValidationError(result)).toBe(true)
        })
      })

      it.each(OrderStateSchema.options)(
        'should accept valid OrderState: %s',
        (state) => {
          const result = OrderQuerySchema.safeParse({ state })
          expect(result.success, getValidationError(result)).toBe(true)
        }
      )

      it('should reject invalid OrderState', () => {
        const result = OrderQuerySchema.safeParse({ state: 'INVALID_STATE' })
        expect(result.success).toBe(false)
      })

      it('should coerce string dates to Date objects', () => {
        const result = OrderQuerySchema.safeParse({
          fromDate: '2025-01-01',
          toDate: '2025-01-31'
        })

        expect(result.success, getValidationError(result)).toBe(true)
        if (result.success) {
          expect(result.data.fromDate).toBeInstanceOf(Date)
          expect(result.data.toDate).toBeInstanceOf(Date)
        }
      })
    })

    describe('OrderIdSchema', () => {
      it('should accept valid positive integer ID', () => {
        const result = OrderIdSchema.safeParse({ id: 123 })
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it('should coerce string ID to number', () => {
        const result = OrderIdSchema.safeParse({ id: '123' })

        expect(result.success, getValidationError(result)).toBe(true)
        if (result.success) {
          expect(result.data.id).toBe(123)
          expect(typeof result.data.id).toBe('number')
        }
      })

      it.each([
        { value: -1, reason: 'negative' },
        { value: 0, reason: 'zero' },
        { value: 1.5, reason: 'non-integer' }
      ])('should reject $reason ID', ({ value }) => {
        const result = OrderIdSchema.safeParse({ id: value })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Domain Schemas', () => {
    describe('OrderSchema', () => {
      it('should accept valid order', () => {
        const validOrder = OrderFactory.defaultOrder()

        const result = OrderSchema.safeParse(validOrder)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it.each(OrderStateSchema.options)(
        'should accept order with state: %s',
        (state) => {
          const order = OrderFactory.defaultOrder(undefined, { state })
          const result = OrderSchema.safeParse(order)
          expect(result.success, getValidationError(result)).toBe(true)
        }
      )

      it('should accept nullable bookedByUserId, releasedAt, closedAt', () => {
        const order = OrderFactory.defaultOrder(undefined, {
          bookedByUserId: null,
          releasedAt: null,
          closedAt: null
        })

        const result = OrderSchema.safeParse(order)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it('should coerce date strings to Date objects', () => {
        const order = {
          ...OrderFactory.defaultOrder(),
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
          releasedAt: '2025-01-03T00:00:00.000Z'
        }

        const result = OrderSchema.safeParse(order)
        expect(result.success, getValidationError(result)).toBe(true)
        if (result.success) {
          expect(result.data.createdAt).toBeInstanceOf(Date)
          expect(result.data.updatedAt).toBeInstanceOf(Date)
          expect(result.data.releasedAt).toBeInstanceOf(Date)
        }
      })

      it.each([
        'id',
        'dinnerEventId',
        'inhabitantId',
        'ticketPriceId',
        'priceAtBooking',
        'state',
        'createdAt',
        'updatedAt'
      ])('should reject missing required field: %s', (field) => {
        const order = OrderFactory.defaultOrder()
        delete (order as any)[field]

        const result = OrderSchema.safeParse(order)
        expect(result.success).toBe(false)
      })
    })

    describe('OrderDetailSchema', () => {
      it('should accept valid order detail with all relations', () => {
        const validDetail = OrderFactory.defaultOrderDetail()

        const result = OrderDetailSchema.safeParse(validDetail)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it('should accept order detail with nullable bookedByUser', () => {
        const detail = OrderFactory.defaultOrderDetail(undefined, {
          bookedByUserId: null,
          bookedByUser: null
        })

        const result = OrderDetailSchema.safeParse(detail)
        expect(result.success, getValidationError(result)).toBe(true)
      })
    })

    describe('OrderHistorySchema', () => {
      it('should accept valid order history', () => {
        const validHistory = OrderFactory.defaultOrderHistory()

        const result = OrderHistorySchema.safeParse(validHistory)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it.each(OrderActionSchema.options)(
        'should accept action: %s',
        (action) => {
          const history = OrderFactory.defaultOrderHistory(undefined, {
            action
          })

          const result = OrderHistorySchema.safeParse(history)
          expect(result.success, getValidationError(result)).toBe(true)
        }
      )

      it('should accept nullable orderId and performedByUserId', () => {
        const history = OrderFactory.defaultOrderHistory(undefined, {
          orderId: null,
          performedByUserId: null
        })

        const result = OrderHistorySchema.safeParse(history)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it('should reject invalid action', () => {
        const history = OrderFactory.defaultOrderHistory(undefined, {
          action: 'INVALID_ACTION' as any
        })

        const result = OrderHistorySchema.safeParse(history)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Serialization Functions', () => {
    describe('serializeOrder / deserializeOrder', () => {
      it('should serialize and deserialize order correctly', () => {
        const originalOrder = OrderFactory.defaultOrder()

        const serialized = serializeOrder(originalOrder)
        const deserialized = deserializeOrder(serialized)

        expect(deserialized).toEqual(originalOrder)
      })

      it('should serialize Date objects to ISO strings', () => {
        const order = OrderFactory.defaultOrder(undefined, {
          releasedAt: new Date(2025, 0, 15),
          closedAt: new Date(2025, 0, 20)
        })

        const serialized = serializeOrder(order)

        expect(typeof serialized.createdAt).toBe('string')
        expect(typeof serialized.updatedAt).toBe('string')
        expect(typeof serialized.releasedAt).toBe('string')
        expect(typeof serialized.closedAt).toBe('string')
      })

      it('should deserialize ISO strings back to Date objects', () => {
        const order = OrderFactory.defaultOrder(undefined, {
          releasedAt: new Date(2025, 0, 15),
          closedAt: new Date(2025, 0, 20)
        })

        const serialized = serializeOrder(order)
        const deserialized = deserializeOrder(serialized)

        expect(deserialized.createdAt).toBeInstanceOf(Date)
        expect(deserialized.updatedAt).toBeInstanceOf(Date)
        expect(deserialized.releasedAt).toBeInstanceOf(Date)
        expect(deserialized.closedAt).toBeInstanceOf(Date)
      })

      it('should handle null releasedAt and closedAt', () => {
        const order = OrderFactory.defaultOrder(undefined, {
          releasedAt: null,
          closedAt: null
        })

        const serialized = serializeOrder(order)
        expect(serialized.releasedAt).toBeNull()
        expect(serialized.closedAt).toBeNull()

        const deserialized = deserializeOrder(serialized)
        expect(deserialized.releasedAt).toBeNull()
        expect(deserialized.closedAt).toBeNull()
      })
    })

    describe('serializeOrderHistory / deserializeOrderHistory', () => {
      it('should serialize and deserialize order history correctly', () => {
        const originalHistory = OrderFactory.defaultOrderHistory()

        const serialized = serializeOrderHistory(originalHistory)
        const deserialized = deserializeOrderHistory(serialized)

        expect(deserialized).toEqual(originalHistory)
      })

      it('should serialize Date to ISO string', () => {
        const history = OrderFactory.defaultOrderHistory()

        const serialized = serializeOrderHistory(history)

        expect(typeof serialized.timestamp).toBe('string')
      })

      it('should deserialize ISO string back to Date', () => {
        const history = OrderFactory.defaultOrderHistory()

        const serialized = serializeOrderHistory(history)
        const deserialized = deserializeOrderHistory(serialized)

        expect(deserialized.timestamp).toBeInstanceOf(Date)
      })
    })
  })
})