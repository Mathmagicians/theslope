import { describe, it, expect } from 'vitest'
import { useOrderValidation } from '~/composables/useOrderValidation'
import { OrderFactory } from '../../e2e/testDataFactories/orderFactory'

describe('useOrderValidation', () => {
  const { OrderSchema, OrderCreateSchema } = useOrderValidation()

  describe('OrderSchema', () => {
    it('should parse valid order data', () => {
      const validOrder = OrderFactory.defaultOrder()

      const result = OrderSchema.safeParse(validOrder)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(1)
        expect(result.data.ticketType).toBe('ADULT')
      }
    })

    it('should reject order with missing required fields', () => {
      const invalidOrder = {
        id: 1,
        dinnerEventId: 5
        // Missing inhabitantId and ticketType
      }

      const result = OrderSchema.safeParse(invalidOrder)
      expect(result.success).toBe(false)
    })

    it('should reject order with invalid ticketType', () => {
      const invalidOrder = OrderFactory.defaultOrder({ ticketType: 'INVALID_TYPE' as any })

      const result = OrderSchema.safeParse(invalidOrder)
      expect(result.success).toBe(false)
    })
  })

  describe('OrderCreateSchema', () => {
    it('should parse valid order creation data without id or timestamps', () => {
      const validOrderCreate = OrderFactory.defaultOrderCreate()

      const result = OrderCreateSchema.safeParse(validOrderCreate)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dinnerEventId).toBe(5)
        expect(result.data.inhabitantId).toBe(10)
        expect(result.data.ticketType).toBe('ADULT')
      }
    })

    it('should reject order with negative dinnerEventId', () => {
      const invalidOrder = OrderFactory.defaultOrderCreate({ dinnerEventId: -5 })

      const result = OrderCreateSchema.safeParse(invalidOrder)
      expect(result.success).toBe(false)
    })

    it('should parse all valid ticket types', () => {
      const ticketTypes: Array<'ADULT' | 'CHILD' | 'HUNGRY_BABY' | 'BABY'> =
        ['ADULT', 'CHILD', 'HUNGRY_BABY', 'BABY']

      ticketTypes.forEach(ticketType => {
        const order = OrderFactory.defaultOrderCreate({ ticketType })
        const result = OrderCreateSchema.safeParse(order)
        expect(result.success).toBe(true)
      })
    })
  })
})