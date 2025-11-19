import {describe, it, expect} from 'vitest'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {DinnerStateSchema, DinnerModeSchema, OrderStateSchema, TicketTypeSchema} from '~~/prisma/generated/zod'
import {OrderFactory} from '../../e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '../../e2e/testDataFactories/dinnerEventFactory'

const getValidationError = (result: any) =>
  !result.success ? `Validation errors: ${JSON.stringify(result.error.format())}` : ''

describe('useBookingValidation', () => {
  const {
    DinnerStateSchema: ExportedDinnerStateSchema,
    DinnerModeSchema: ExportedDinnerModeSchema,
    OrderStateSchema: ExportedOrderStateSchema,
    TicketTypeSchema: ExportedTicketTypeSchema,
    DinnerEventDisplaySchema,
    DinnerEventDetailSchema,
    DinnerEventCreateSchema,
    DinnerEventUpdateSchema,
    OrderDisplaySchema,
    OrderDetailSchema,
    CreateOrdersRequestSchema,
    OrderHistorySchema,
    serializeOrder,
    deserializeOrder,
    serializeOrderHistory,
    deserializeOrderHistory
  } = useBookingValidation()

  const DinnerState = DinnerStateSchema.enum
  const DinnerMode = DinnerModeSchema.enum

  describe('Enum Validation', () => {
    it.each([
      ...DinnerStateSchema.options.map(s => ({enum: 'DinnerState', value: s, schema: ExportedDinnerStateSchema})),
      ...DinnerModeSchema.options.map(s => ({enum: 'DinnerMode', value: s, schema: ExportedDinnerModeSchema})),
      ...OrderStateSchema.options.map(s => ({enum: 'OrderState', value: s, schema: ExportedOrderStateSchema})),
      ...TicketTypeSchema.options.map(s => ({enum: 'TicketType', value: s, schema: ExportedTicketTypeSchema}))
    ])('GIVEN valid $enum value $value WHEN parsing THEN succeeds', ({value, schema}) => {
      expect(() => schema.parse(value)).not.toThrow()
    })

    it.each([
      {enum: 'DinnerState', value: 'INVALID', schema: ExportedDinnerStateSchema},
      {enum: 'DinnerMode', value: 'INVALID', schema: ExportedDinnerModeSchema},
      {enum: 'OrderState', value: 'INVALID', schema: ExportedOrderStateSchema},
      {enum: 'TicketType', value: 'INVALID', schema: ExportedTicketTypeSchema}
    ])('GIVEN invalid $enum value WHEN parsing THEN throws', ({value, schema}) => {
      expect(() => schema.parse(value)).toThrow()
    })
  })

  describe('DinnerEvent Schemas', () => {
    describe('DinnerEventDisplaySchema (ADR-009: Minimal)', () => {
      const validDisplay = DinnerEventFactory.defaultDinnerEventDisplay()

      it('GIVEN valid display data WHEN parsing THEN succeeds', () => {
        const result = DinnerEventDisplaySchema.parse(validDisplay)
        expect(result).toMatchObject(validDisplay)
      })

      it.each(DinnerStateSchema.options.map(state => ({state})))(
        'GIVEN state $state WHEN parsing THEN succeeds',
        ({state}) => {
          expect(() => DinnerEventDisplaySchema.parse({...validDisplay, state})).not.toThrow()
        }
      )

      it.each([
        {desc: 'missing id', override: {id: undefined}},
        {desc: 'invalid state', override: {state: 'INVALID'}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({override}) => {
        expect(() => DinnerEventDisplaySchema.parse({...validDisplay, ...override})).toThrow()
      })
    })

    describe('DinnerEventDetailSchema (ADR-009: Detail extends Display)', () => {
      const validDetail = DinnerEventFactory.defaultDinnerEventDetail()

      it('GIVEN detail with ALL scalar fields WHEN parsing THEN succeeds', () => {
        const result = DinnerEventDetailSchema.parse(validDetail)
        expect(result).toMatchObject(validDetail)
      })

      it.each([
        {field: 'chef', value: null},
        {field: 'cookingTeam', value: null},
        {field: 'tickets', value: []},
        {field: 'menuDescription', value: null},
        {field: 'heynaboEventId', value: null}
      ])('GIVEN nullable $field WHEN parsing THEN succeeds', ({field, value}) => {
        expect(() => DinnerEventDetailSchema.parse({...validDetail, [field]: value})).not.toThrow()
      })

      it.each([
        {desc: 'negative totalCost', override: {totalCost: -100}},
        {desc: 'menuDescription too long', override: {menuDescription: 'a'.repeat(501)}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({override}) => {
        expect(() => DinnerEventDetailSchema.parse({...validDetail, ...override})).toThrow()
      })
    })

    describe('DinnerEventCreateSchema', () => {
      const baseCreate = DinnerEventFactory.defaultDinnerEventCreate()

      it('GIVEN valid create data WHEN parsing THEN succeeds', () => {
        expect(() => DinnerEventCreateSchema.parse(baseCreate)).not.toThrow()
      })

      it.each([
        {desc: 'menuTitle too long (>500)', override: {menuTitle: 'a'.repeat(501)}},
        {desc: 'negative totalCost', override: {totalCost: -50}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({override}) => {
        expect(() => DinnerEventCreateSchema.parse({...baseCreate, ...override})).toThrow()
      })

      it('GIVEN empty menuTitle WHEN parsing THEN succeeds (no min validation)', () => {
        expect(() => DinnerEventCreateSchema.parse({...baseCreate, menuTitle: ''})).not.toThrow()
      })
    })

    describe('DinnerEventUpdateSchema', () => {
      it('GIVEN update with id WHEN parsing THEN succeeds', () => {
        const result = DinnerEventUpdateSchema.parse({id: 1, menuTitle: 'Updated'})
        expect(result.id).toBe(1)
      })

      it('GIVEN update without id WHEN parsing THEN throws', () => {
        expect(() => DinnerEventUpdateSchema.parse({menuTitle: 'Updated'})).toThrow()
      })

      it.each([
        {field: 'menuTitle', value: 'Updated Title'},
        {field: 'state', value: DinnerState.CANCELLED},
        {field: 'totalCost', value: 50000}
      ])('GIVEN partial update with $field WHEN parsing THEN succeeds', ({field, value}) => {
        const result = DinnerEventUpdateSchema.parse({id: 1, [field]: value})
        expect(result[field as keyof typeof result]).toBe(value)
      })
    })
  })

  describe('Order Schemas', () => {
    describe('OrderDisplaySchema (ADR-009: Minimal)', () => {
      it('GIVEN valid order WHEN parsing THEN succeeds', () => {
        const validOrder = OrderFactory.defaultOrder()
        const result = OrderDisplaySchema.safeParse(validOrder)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it.each(OrderStateSchema.options.map(state => ({state})))(
        'GIVEN state $state WHEN parsing THEN succeeds',
        ({state}) => {
          const order = OrderFactory.defaultOrder(undefined, {state})
          const result = OrderDisplaySchema.safeParse(order)
          expect(result.success, getValidationError(result)).toBe(true)
        }
      )

      it.each([
        {field: 'bookedByUserId', value: null},
        {field: 'releasedAt', value: null},
        {field: 'closedAt', value: null}
      ])('GIVEN nullable $field WHEN parsing THEN succeeds', ({field, value}) => {
        const order = OrderFactory.defaultOrder(undefined, {[field]: value})
        const result = OrderDisplaySchema.safeParse(order)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it.each([
        'id', 'dinnerEventId', 'inhabitantId', 'ticketPriceId',
        'priceAtBooking', 'dinnerMode', 'state', 'createdAt', 'updatedAt', 'ticketType'
      ].map(field => ({field})))('GIVEN missing $field WHEN parsing THEN throws', ({field}) => {
        const order = OrderFactory.defaultOrder()
        delete (order as any)[field]
        const result = OrderDisplaySchema.safeParse(order)
        expect(result.success).toBe(false)
      })
    })

    describe('OrderDetailSchema (ADR-009: ALL scalar relations)', () => {
      it('GIVEN valid detail WHEN parsing THEN succeeds', () => {
        const validDetail = OrderFactory.defaultOrderDetail()
        const result = OrderDetailSchema.safeParse(validDetail)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it('GIVEN detail WHEN parsing THEN includes ALL DinnerEvent scalars (ADR-009)', () => {
        const detail = OrderFactory.defaultOrderDetail()
        const result = OrderDetailSchema.safeParse(detail)

        if (result.success) {
          const dinnerEvent = result.data.dinnerEvent
          const requiredFields = [
            'id', 'date', 'menuTitle', 'menuDescription', 'menuPictureUrl',
            'state', 'totalCost', 'heynaboEventId', 'chefId', 'cookingTeamId',
            'seasonId', 'createdAt', 'updatedAt'
          ]
          requiredFields.forEach(field => {
            expect(dinnerEvent).toHaveProperty(field)
          })
        }
      })

      it('GIVEN nullable bookedByUser WHEN parsing THEN succeeds', () => {
        const detail = OrderFactory.defaultOrderDetail(undefined, {
          bookedByUserId: null,
          bookedByUser: null
        })
        const result = OrderDetailSchema.safeParse(detail)
        expect(result.success, getValidationError(result)).toBe(true)
      })
    })

    describe('CreateOrdersRequestSchema', () => {
      it('GIVEN valid batch request WHEN parsing THEN succeeds', () => {
        const validInput = OrderFactory.defaultCreateOrdersRequest()
        const result = CreateOrdersRequestSchema.safeParse(validInput)
        expect(result.success, getValidationError(result)).toBe(true)
      })

    })

    describe('OrderHistorySchema', () => {
      it('GIVEN valid history WHEN parsing THEN succeeds', () => {
        const validHistory = OrderFactory.defaultOrderHistory()
        const result = OrderHistorySchema.safeParse(validHistory)
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it.each(OrderStateSchema.options.map(action => ({action})))(
        'GIVEN action $action WHEN parsing THEN succeeds',
        ({action}: {action: z.infer<typeof OrderStateSchema>}) => {
          const history = OrderFactory.defaultOrderHistory(undefined, {action})
          const result = OrderHistorySchema.safeParse(history)
          expect(result.success, getValidationError(result)).toBe(true)
        }
      )
    })
  })

  describe('Serialization (ADR-010)', () => {
    describe('serializeOrder / deserializeOrder', () => {
      it('GIVEN order WHEN round-tripping THEN preserves data', () => {
        const originalOrder = OrderFactory.defaultOrder()
        const serialized = serializeOrder(originalOrder)
        const deserialized = deserializeOrder(serialized)
        expect(deserialized).toEqual(originalOrder)
      })

      it.each(['createdAt', 'updatedAt', 'releasedAt', 'closedAt'].map(field => ({field})))(
        'GIVEN $field WHEN serializing THEN converts Date to string',
        ({field}) => {
          const order = OrderFactory.defaultOrder(undefined, {
            releasedAt: new Date(2025, 0, 15),
            closedAt: new Date(2025, 0, 20)
          })
          const serialized = serializeOrder(order)
          if (serialized[field as keyof typeof serialized] !== null) {
            expect(typeof serialized[field as keyof typeof serialized]).toBe('string')
          }
        }
      )

      it.each(['releasedAt', 'closedAt'].map(field => ({field})))(
        'GIVEN null $field WHEN serializing THEN preserves null',
        ({field}) => {
          const order = OrderFactory.defaultOrder(undefined, {[field]: null})
          const serialized = serializeOrder(order)
          expect(serialized[field as keyof typeof serialized]).toBeNull()

          const deserialized = deserializeOrder(serialized)
          expect(deserialized[field as keyof typeof deserialized]).toBeNull()
        }
      )
    })

    describe('serializeOrderHistory / deserializeOrderHistory', () => {
      it('GIVEN history WHEN round-tripping THEN preserves data', () => {
        const originalHistory = OrderFactory.defaultOrderHistory()
        const serialized = serializeOrderHistory(originalHistory)
        const deserialized = deserializeOrderHistory(serialized)
        expect(deserialized).toEqual(originalHistory)
      })

      it('GIVEN history WHEN serializing THEN converts timestamp to string', () => {
        const history = OrderFactory.defaultOrderHistory()
        const serialized = serializeOrderHistory(history)
        expect(typeof serialized.timestamp).toBe('string')
      })

      it('GIVEN serialized history WHEN deserializing THEN converts to Date', () => {
        const history = OrderFactory.defaultOrderHistory()
        const serialized = serializeOrderHistory(history)
        const deserialized = deserializeOrderHistory(serialized)
        expect(deserialized.timestamp).toBeInstanceOf(Date)
      })
    })
  })
})
