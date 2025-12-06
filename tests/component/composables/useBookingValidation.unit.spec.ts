import {describe, it, expect} from 'vitest'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {DinnerStateSchema, DinnerModeSchema, OrderStateSchema, TicketTypeSchema} from '~~/prisma/generated/zod'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import type {SafeParseReturnType} from 'zod'

const getValidationError = <T>(result: SafeParseReturnType<T, T>) =>
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
    deserializeOrderHistory,
    deserializeDinnerEvent,
    deserializeDinnerEventDetail
  } = useBookingValidation()

  const DinnerState = DinnerStateSchema.enum

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
      // Note: id comes from URL path, not body (ADR-013)
      it('GIVEN partial update with menuTitle WHEN parsing THEN succeeds', () => {
        const result = DinnerEventUpdateSchema.parse({menuTitle: 'Updated'})
        expect(result.menuTitle).toBe('Updated')
      })

      it('GIVEN empty update WHEN parsing THEN succeeds (all fields optional)', () => {
        const result = DinnerEventUpdateSchema.parse({})
        expect(result).toEqual({})
      })

      it.each([
        {field: 'menuTitle', value: 'Updated Title'},
        {field: 'state', value: DinnerState.CANCELLED},
        {field: 'totalCost', value: 50000}
      ])('GIVEN partial update with $field WHEN parsing THEN succeeds', ({field, value}) => {
        const result = DinnerEventUpdateSchema.parse({[field]: value})
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
        const order = OrderFactory.defaultOrder() as Record<string, unknown>
        Reflect.deleteProperty(order, field)
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

  describe('Orders Creation (Batch)', () => {
    const {
      AuditActionSchema,
      AuditContextSchema,
      OrderCreateWithPriceSchema,
      OrdersBatchSchema,
      CreateOrdersResultSchema,
      ORDER_BATCH_SIZE
    } = useBookingValidation()

    describe('AuditActionSchema', () => {
      it.each(AuditActionSchema.options.map(a => ({action: a})))(
        'GIVEN $action WHEN parsing THEN succeeds',
        ({action}) => expect(() => AuditActionSchema.parse(action)).not.toThrow()
      )

      it('GIVEN invalid action WHEN parsing THEN throws', () => {
        expect(() => AuditActionSchema.parse('INVALID')).toThrow()
      })
    })

    describe('AuditContextSchema', () => {
      it.each([
        {desc: 'with userId', ctx: OrderFactory.defaultAuditContext()},
        {desc: 'null userId (system)', ctx: OrderFactory.defaultAuditContext({performedByUserId: null})}
      ])('GIVEN valid context $desc WHEN parsing THEN succeeds', ({ctx}) => {
        expect(() => AuditContextSchema.parse(ctx)).not.toThrow()
      })

      it('GIVEN empty source WHEN parsing THEN throws', () => {
        expect(() => AuditContextSchema.parse(OrderFactory.defaultAuditContext({source: ''}))).toThrow()
      })
    })

    describe('OrderCreateWithPriceSchema', () => {
      it('GIVEN valid order WHEN parsing THEN succeeds', () => {
        expect(() => OrderCreateWithPriceSchema.parse(OrderFactory.defaultOrderCreateWithPrice())).not.toThrow()
      })

      it.each([
        {field: 'householdId' as const, desc: 'missing householdId'},
        {field: 'priceAtBooking' as const, desc: 'missing priceAtBooking'}
      ])('GIVEN $desc WHEN parsing THEN throws', ({field}) => {
        const order = OrderFactory.defaultOrderCreateWithPrice()
        const {[field]: _removed, ...orderWithoutField} = order
        expect(() => OrderCreateWithPriceSchema.parse(orderWithoutField)).toThrow()
      })

      it('GIVEN negative priceAtBooking WHEN parsing THEN throws', () => {
        expect(() => OrderCreateWithPriceSchema.parse(
          OrderFactory.defaultOrderCreateWithPrice(1, {priceAtBooking: -100})
        )).toThrow()
      })

      it('GIVEN zero priceAtBooking (free ticket) WHEN parsing THEN succeeds', () => {
        expect(() => OrderCreateWithPriceSchema.parse(
          OrderFactory.defaultOrderCreateWithPrice(1, {priceAtBooking: 0})
        )).not.toThrow()
      })
    })

    describe('OrdersBatchSchema', () => {
      it.each([
        {count: 1, desc: 'min'},
        {count: ORDER_BATCH_SIZE, desc: 'max'}
      ])('GIVEN batch of $desc ($count) orders WHEN parsing THEN succeeds', ({count}) => {
        expect(() => OrdersBatchSchema.parse(OrderFactory.createOrdersBatch(1, count))).not.toThrow()
      })

      it.each([
        {count: 0, desc: 'empty', errorMatch: /Mindst én/},
        {count: ORDER_BATCH_SIZE + 1, desc: 'exceeds max', errorMatch: /Maksimalt/}
      ])('GIVEN $desc batch WHEN parsing THEN throws', ({count, errorMatch}) => {
        expect(() => OrdersBatchSchema.parse(OrderFactory.createOrdersBatch(1, count))).toThrow(errorMatch)
      })

      it('GIVEN batch with same householdId WHEN parsing THEN succeeds', () => {
        expect(() => OrdersBatchSchema.parse(OrderFactory.createOrdersBatch(42, 3))).not.toThrow()
      })

      it('GIVEN batch with different householdIds WHEN parsing THEN throws', () => {
        const mixedBatch = [
          OrderFactory.defaultOrderCreateWithPrice(1),
          OrderFactory.defaultOrderCreateWithPrice(2)
        ]
        expect(() => OrdersBatchSchema.parse(mixedBatch)).toThrow(/samme husstand/)
      })
    })

    describe('CreateOrdersResultSchema', () => {
      it.each([
        {result: OrderFactory.defaultCreateOrdersResult(), desc: 'with ids'},
        {result: OrderFactory.defaultCreateOrdersResult({createdIds: []}), desc: 'empty ids'}
      ])('GIVEN valid result $desc WHEN parsing THEN succeeds', ({result}) => {
        expect(() => CreateOrdersResultSchema.parse(result)).not.toThrow()
      })

      it.each([
        {override: {householdId: 0}, desc: 'zero householdId'},
        {override: {householdId: -1}, desc: 'negative householdId'},
        {override: {createdIds: [0]}, desc: 'zero in createdIds'},
        {override: {createdIds: [-1]}, desc: 'negative in createdIds'}
      ])('GIVEN $desc WHEN parsing THEN throws', ({override}) => {
        expect(() => CreateOrdersResultSchema.parse(OrderFactory.defaultCreateOrdersResult(override))).toThrow()
      })
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

    describe('deserializeDinnerEvent', () => {
      it('GIVEN allergens as join table WHEN deserializing THEN flattens to array', () => {
        const prismaEvent = {
          id: 1,
          allergens: [
            {allergyType: {id: 1, name: 'Gluten'}},
            {allergyType: {id: 2, name: 'Dairy'}}
          ]
        }
        const result = deserializeDinnerEvent(prismaEvent)
        expect(result.allergens).toHaveLength(2)
        expect(result.allergens[0]).toEqual({id: 1, name: 'Gluten'})
      })

      it('GIVEN null allergens WHEN deserializing THEN returns empty array', () => {
        const result = deserializeDinnerEvent({id: 1, allergens: null})
        expect(result.allergens).toEqual([])
      })
    })

    describe('deserializeDinnerEventDetail', () => {
      // Use real serialize methods to generate test data (ADR-010)
      const {serializeWeekDayMap, createDefaultWeekdayMap} = useCoreValidation()
      const {serializeWeekDayMap: serializeAffinity, createDefaultWeekdayMap: createDefaultAffinity} = useWeekDayMapValidation()

      const SERIALIZED_PREFERENCES = serializeWeekDayMap(createDefaultWeekdayMap())
      const SERIALIZED_AFFINITY = serializeAffinity(createDefaultAffinity())

      // This parametrized test would have caught the bug: JSON string not deserialized to object
      it.each([
        {
          desc: 'chef with dinnerPreferences JSON string',
          input: () => DinnerEventFactory.defaultSerializedDinnerEventDetail({
            chef: DinnerEventFactory.serializedInhabitant(SERIALIZED_PREFERENCES)
          }),
          assertion: (result: Record<string, unknown>) => {
            expect(typeof (result.chef as Record<string, unknown>).dinnerPreferences).toBe('object')
            expect((result.chef as Record<string, unknown>).dinnerPreferences).toHaveProperty('mandag')
          }
        },
        {
          desc: 'chef with null dinnerPreferences',
          input: () => DinnerEventFactory.defaultSerializedDinnerEventDetail({
            chef: DinnerEventFactory.serializedInhabitant(null)
          }),
          assertion: (result: Record<string, unknown>) => {
            expect((result.chef as Record<string, unknown>).dinnerPreferences).toBeNull()
          }
        },
        {
          desc: 'null chef',
          input: () => DinnerEventFactory.defaultSerializedDinnerEventDetail({chef: null}),
          assertion: (result: Record<string, unknown>) => {
            expect(result.chef).toBeNull()
          }
        },
        {
          desc: 'cookingTeam with affinity JSON string',
          input: () => DinnerEventFactory.defaultSerializedDinnerEventDetail({
            cookingTeam: DinnerEventFactory.serializedCookingTeam(SERIALIZED_AFFINITY)
          }),
          assertion: (result: Record<string, unknown>) => {
            expect(typeof (result.cookingTeam as Record<string, unknown>).affinity).toBe('object')
            expect((result.cookingTeam as Record<string, unknown>).affinity).toHaveProperty('mandag')
          }
        },
        {
          desc: 'ticket inhabitant with dinnerPreferences JSON string',
          input: () => DinnerEventFactory.defaultSerializedDinnerEventDetail({
            tickets: [{id: 1, inhabitant: DinnerEventFactory.serializedInhabitant(SERIALIZED_PREFERENCES)}]
          }),
          assertion: (result: Record<string, unknown>) => {
            const tickets = result.tickets as Array<Record<string, unknown>>
            const inhabitant = tickets[0].inhabitant as Record<string, unknown>
            expect(typeof inhabitant.dinnerPreferences).toBe('object')
            expect(inhabitant.dinnerPreferences).toHaveProperty('mandag')
          }
        }
      ])('GIVEN $desc WHEN deserializing THEN converts JSON strings to objects', ({input, assertion}) => {
        const result = deserializeDinnerEventDetail(input())
        assertion(result)
      })
    })
  })
})
