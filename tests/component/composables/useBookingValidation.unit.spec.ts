import {describe, it, expect} from 'vitest'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {DinnerStateSchema, DinnerModeSchema, OrderStateSchema, TicketTypeSchema, OrderAuditActionSchema} from '~~/prisma/generated/zod'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
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
    OrderHistoryDisplaySchema,
    OrderHistoryDetailSchema,
    OrderHistoryCreateSchema,
    OrderSnapshotSchema,
    createOrderAuditData,
    serializeOrder,
    deserializeOrder,
    serializeOrderHistoryDisplay,
    deserializeOrderHistoryDisplay,
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

    describe.each([
      {name: 'OrderHistoryDisplaySchema', schema: OrderHistoryDisplaySchema, factory: () => OrderFactory.defaultOrderHistoryDisplay()},
      {name: 'OrderHistoryDetailSchema', schema: OrderHistoryDetailSchema, factory: () => OrderFactory.defaultOrderHistoryDetail()},
      {name: 'OrderHistoryCreateSchema', schema: OrderHistoryCreateSchema, factory: () => OrderFactory.defaultOrderHistoryCreate()}
    ])('$name', ({schema, factory}) => {
      it('GIVEN valid data WHEN parsing THEN succeeds', () => {
        const result = schema.safeParse(factory())
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it.each(OrderAuditActionSchema.options.map(action => ({action})))(
        'GIVEN action $action WHEN parsing THEN succeeds',
        ({action}) => {
          const result = schema.safeParse({...factory(), action})
          expect(result.success, getValidationError(result)).toBe(true)
        }
      )
    })

    describe('OrderHistoryDetailSchema nullable order', () => {
      it('GIVEN null order WHEN parsing THEN succeeds', () => {
        const result = OrderHistoryDetailSchema.safeParse(OrderFactory.defaultOrderHistoryDetail(undefined, {order: null}))
        expect(result.success, getValidationError(result)).toBe(true)
      })
    })

    describe('OrderSnapshotSchema', () => {
      it('GIVEN valid snapshot WHEN parsing THEN succeeds', () => {
        const result = OrderSnapshotSchema.safeParse(OrderFactory.defaultOrderSnapshot())
        expect(result.success, getValidationError(result)).toBe(true)
      })

      it.each(OrderStateSchema.options.map(state => ({state})))(
        'GIVEN state $state WHEN parsing THEN succeeds',
        ({state}) => {
          const result = OrderSnapshotSchema.safeParse(OrderFactory.defaultOrderSnapshot({state}))
          expect(result.success, getValidationError(result)).toBe(true)
        }
      )
    })

    describe('createOrderAuditData', () => {
      it('GIVEN snapshot WHEN creating audit data THEN returns valid JSON string', () => {
        const snapshot = OrderFactory.defaultOrderSnapshot()
        const auditData = createOrderAuditData(snapshot)
        expect(typeof auditData).toBe('string')
        const parsed = JSON.parse(auditData)
        expect(parsed.orderSnapshot).toEqual(snapshot)
      })
    })
  })

  describe('Orders Creation (Batch)', () => {
    const {
      OrderAuditActionSchema,
      AuditContextSchema,
      OrderCreateWithPriceSchema,
      OrdersBatchSchema,
      CreateOrdersResultSchema,
      ORDER_BATCH_SIZE
    } = useBookingValidation()

    describe('OrderAuditActionSchema', () => {
      it.each(OrderAuditActionSchema.options.map(a => ({action: a})))(
        'GIVEN $action WHEN parsing THEN succeeds',
        ({action}) => expect(() => OrderAuditActionSchema.parse(action)).not.toThrow()
      )

      it('GIVEN invalid action WHEN parsing THEN throws', () => {
        expect(() => OrderAuditActionSchema.parse('INVALID')).toThrow()
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

    describe('serializeOrderHistoryDisplay / deserializeOrderHistoryDisplay', () => {
      it('GIVEN history WHEN round-tripping THEN preserves data', () => {
        const originalHistory = OrderFactory.defaultOrderHistoryDisplay()
        const serialized = serializeOrderHistoryDisplay(originalHistory)
        const deserialized = deserializeOrderHistoryDisplay(serialized)
        expect(deserialized).toEqual(originalHistory)
      })

      it('GIVEN history WHEN serializing THEN converts timestamp to string', () => {
        const history = OrderFactory.defaultOrderHistoryDisplay()
        const serialized = serializeOrderHistoryDisplay(history)
        expect(typeof serialized.timestamp).toBe('string')
      })

      it('GIVEN serialized history WHEN deserializing THEN converts to Date', () => {
        const history = OrderFactory.defaultOrderHistoryDisplay()
        const serialized = serializeOrderHistoryDisplay(history)
        const deserialized = deserializeOrderHistoryDisplay(serialized)
        expect(deserialized.timestamp).toBeInstanceOf(Date)
      })
    })

    describe('deserializeDinnerEvent', () => {
      it('GIVEN allergens as join table WHEN deserializing THEN flattens to array', () => {
        const mockAllergyTypes = AllergyFactory.createMockAllergyTypes()
        const prismaEvent = {
          ...DinnerEventFactory.defaultDinnerEventDisplay(),
          allergens: mockAllergyTypes.map(at => ({allergyType: at}))
        }
        const result = deserializeDinnerEvent(prismaEvent)
        expect(result.allergens).toBeDefined()
        expect(result.allergens).toHaveLength(2)
        expect(result.allergens![0]).toEqual(mockAllergyTypes[0])
      })

      it('GIVEN null allergens WHEN deserializing THEN returns empty array', () => {
        const prismaEvent = {
          ...DinnerEventFactory.defaultDinnerEventDisplay(),
          allergens: null
        }
        const result = deserializeDinnerEvent(prismaEvent)
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
            expect(tickets[0]).toBeDefined()
            const inhabitant = tickets[0]!.inhabitant as Record<string, unknown>
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

  describe('Daily Maintenance Result Schemas', () => {
    const {
      ConsumeResultSchema,
      CloseOrdersResultSchema,
      CreateTransactionsResultSchema,
      DailyMaintenanceResultSchema,
      ScaffoldResultSchema
    } = useBookingValidation()

    describe('ConsumeResultSchema', () => {
      it.each([
        {consumed: 0},
        {consumed: 5},
        {consumed: 100}
      ])('GIVEN valid consumed count $consumed WHEN parsing THEN succeeds', (data) => {
        expect(() => ConsumeResultSchema.parse(data)).not.toThrow()
      })

      it.each([
        {desc: 'negative consumed', data: {consumed: -1}},
        {desc: 'missing consumed', data: {}},
        {desc: 'non-integer consumed', data: {consumed: 1.5}},
        {desc: 'string consumed', data: {consumed: 'five'}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({data}) => {
        expect(() => ConsumeResultSchema.parse(data)).toThrow()
      })
    })

    describe('CloseOrdersResultSchema', () => {
      it.each([
        {closed: 0},
        {closed: 10},
        {closed: 500}
      ])('GIVEN valid closed count $closed WHEN parsing THEN succeeds', (data) => {
        expect(() => CloseOrdersResultSchema.parse(data)).not.toThrow()
      })

      it.each([
        {desc: 'negative closed', data: {closed: -5}},
        {desc: 'missing closed', data: {}},
        {desc: 'non-integer closed', data: {closed: 2.5}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({data}) => {
        expect(() => CloseOrdersResultSchema.parse(data)).toThrow()
      })
    })

    describe('CreateTransactionsResultSchema', () => {
      it.each([
        {created: 0},
        {created: 25},
        {created: 1000}
      ])('GIVEN valid created count $created WHEN parsing THEN succeeds', (data) => {
        expect(() => CreateTransactionsResultSchema.parse(data)).not.toThrow()
      })

      it.each([
        {desc: 'negative created', data: {created: -10}},
        {desc: 'missing created', data: {}},
        {desc: 'non-integer created', data: {created: 3.7}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({data}) => {
        expect(() => CreateTransactionsResultSchema.parse(data)).toThrow()
      })
    })

    describe('ScaffoldResultSchema', () => {
      const validScaffoldResult = {
        seasonId: 1,
        created: 10,
        deleted: 2,
        released: 1,
        unchanged: 50,
        households: 5
      }

      it('GIVEN valid scaffold result WHEN parsing THEN succeeds', () => {
        expect(() => ScaffoldResultSchema.parse(validScaffoldResult)).not.toThrow()
      })

      it.each([
        {desc: 'zero counts', data: {seasonId: 1, created: 0, deleted: 0, released: 0, unchanged: 0, households: 0}},
        {desc: 'large counts', data: {seasonId: 99, created: 1000, deleted: 500, released: 200, unchanged: 2000, households: 100}}
      ])('GIVEN $desc WHEN parsing THEN succeeds', ({data}) => {
        expect(() => ScaffoldResultSchema.parse(data)).not.toThrow()
      })

      it.each([
        {desc: 'missing seasonId', data: {created: 10, deleted: 2, unchanged: 50, households: 5}},
        {desc: 'negative created', data: {...validScaffoldResult, created: -1}},
        {desc: 'non-integer deleted', data: {...validScaffoldResult, deleted: 1.5}},
        {desc: 'zero seasonId', data: {...validScaffoldResult, seasonId: 0}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({data}) => {
        expect(() => ScaffoldResultSchema.parse(data)).toThrow()
      })
    })

    describe('DailyMaintenanceResultSchema', () => {
      const validResult = {
        jobRunId: 42,
        consume: {consumed: 5},
        close: {closed: 10},
        transact: {created: 8},
        scaffold: {seasonId: 1, created: 20, deleted: 0, released: 0, unchanged: 100, households: 10}
      }

      it('GIVEN valid maintenance result WHEN parsing THEN succeeds', () => {
        const result = DailyMaintenanceResultSchema.parse(validResult)
        expect(result.jobRunId).toBe(42)
        expect(result.consume.consumed).toBe(5)
        expect(result.close.closed).toBe(10)
        expect(result.transact.created).toBe(8)
        expect(result.scaffold?.seasonId).toBe(1)
      })

      it('GIVEN null scaffold (no active season) WHEN parsing THEN succeeds', () => {
        const resultWithNullScaffold = {...validResult, scaffold: null}
        const result = DailyMaintenanceResultSchema.parse(resultWithNullScaffold)
        expect(result.scaffold).toBeNull()
      })

      it('GIVEN all zero counts WHEN parsing THEN succeeds (idempotent run)', () => {
        const idempotentResult = {
          jobRunId: 99,
          consume: {consumed: 0},
          close: {closed: 0},
          transact: {created: 0},
          scaffold: {seasonId: 1, created: 0, deleted: 0, released: 0, unchanged: 150, households: 15}
        }
        expect(() => DailyMaintenanceResultSchema.parse(idempotentResult)).not.toThrow()
      })

      it.each([
        {desc: 'missing jobRunId', data: {consume: {consumed: 0}, close: {closed: 0}, transact: {created: 0}, scaffold: null}},
        {desc: 'missing consume', data: {jobRunId: 1, close: {closed: 0}, transact: {created: 0}, scaffold: null}},
        {desc: 'missing close', data: {jobRunId: 1, consume: {consumed: 0}, transact: {created: 0}, scaffold: null}},
        {desc: 'missing transact', data: {jobRunId: 1, consume: {consumed: 0}, close: {closed: 0}, scaffold: null}},
        {desc: 'invalid jobRunId', data: {...validResult, jobRunId: 0}},
        {desc: 'invalid consume', data: {...validResult, consume: {consumed: -1}}},
        {desc: 'invalid scaffold', data: {...validResult, scaffold: {seasonId: 0}}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({data}) => {
        expect(() => DailyMaintenanceResultSchema.parse(data)).toThrow()
      })
    })
  })

  // ============================================================================
  // Query Parameter Normalization
  // ============================================================================

  describe('IdOrIdsSchema', () => {
    const {IdOrIdsSchema} = useBookingValidation()

    it.each([
      {input: undefined, expected: [], desc: 'undefined'},
      {input: 5, expected: [5], desc: 'single number'},
      {input: '5', expected: [5], desc: 'single string'},
      {input: [1, 2, 3], expected: [1, 2, 3], desc: 'array of numbers'},
      {input: ['1', '2'], expected: [1, 2], desc: 'array of strings'}
    ])('GIVEN $desc WHEN parsing THEN returns $expected', ({input, expected}) => {
      expect(IdOrIdsSchema.parse(input)).toEqual(expected)
    })

    it.each([
      {input: 0, desc: 'zero'},
      {input: -1, desc: 'negative'},
      {input: 'abc', desc: 'non-numeric string'},
      {input: [0, 1], desc: 'array with zero'}
    ])('GIVEN invalid $desc WHEN parsing THEN throws', ({input}) => {
      expect(() => IdOrIdsSchema.parse(input)).toThrow()
    })
  })

  // ============================================================================
  // ADR-016: Unified Booking Scaffold
  // ============================================================================

  describe('Unified Booking Scaffold (ADR-016)', () => {
    const {
      DesiredOrderSchema,
      ScaffoldOrdersRequestSchema,
      ScaffoldOrdersResponseSchema,
      convertDesiredToOrderCreate,
      OrderStateSchema,
      DinnerModeSchema
    } = useBookingValidation()

    const OrderState = OrderStateSchema.enum
    const DinnerMode = DinnerModeSchema.enum

    describe('DesiredOrderSchema', () => {
      const validDesiredOrder = {
        inhabitantId: 1,
        dinnerEventId: 10,
        dinnerMode: DinnerMode.DINEIN,
        isGuestTicket: false,
        ticketPriceId: 5
      }

      it('GIVEN valid desired order WHEN parsing THEN succeeds', () => {
        expect(() => DesiredOrderSchema.parse(validDesiredOrder)).not.toThrow()
      })

      it.each([
        {desc: 'guest ticket with allergies', data: {...validDesiredOrder, isGuestTicket: true, allergyTypeIds: [1, 2]}},
        {desc: 'guest ticket without allergies', data: {...validDesiredOrder, isGuestTicket: true}},
        {desc: 'TAKEAWAY mode', data: {...validDesiredOrder, dinnerMode: DinnerMode.TAKEAWAY}},
        {desc: 'NONE mode', data: {...validDesiredOrder, dinnerMode: DinnerMode.NONE}}
      ])('GIVEN $desc WHEN parsing THEN succeeds', ({data}) => {
        expect(() => DesiredOrderSchema.parse(data)).not.toThrow()
      })

      it.each([
        {desc: 'missing inhabitantId', data: {dinnerEventId: 10, dinnerMode: DinnerMode.DINEIN, ticketPriceId: 5}},
        {desc: 'missing dinnerEventId', data: {inhabitantId: 1, dinnerMode: DinnerMode.DINEIN, ticketPriceId: 5}},
        {desc: 'missing dinnerMode', data: {inhabitantId: 1, dinnerEventId: 10, ticketPriceId: 5}},
        {desc: 'missing ticketPriceId', data: {inhabitantId: 1, dinnerEventId: 10, dinnerMode: DinnerMode.DINEIN}},
        {desc: 'invalid dinnerMode', data: {...validDesiredOrder, dinnerMode: 'INVALID'}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({data}) => {
        expect(() => DesiredOrderSchema.parse(data)).toThrow()
      })
    })

    describe('ScaffoldOrdersRequestSchema', () => {
      const validRequest = {
        householdId: 1,
        dinnerEventIds: [10, 11],
        orders: [{
          inhabitantId: 1,
          dinnerEventId: 10,
          dinnerMode: DinnerMode.DINEIN,
          isGuestTicket: false,
          ticketPriceId: 5
        }]
      }

      it('GIVEN valid request WHEN parsing THEN succeeds', () => {
        expect(() => ScaffoldOrdersRequestSchema.parse(validRequest)).not.toThrow()
      })

      it('GIVEN empty orders array WHEN parsing THEN succeeds', () => {
        expect(() => ScaffoldOrdersRequestSchema.parse({...validRequest, orders: []})).not.toThrow()
      })

      it.each([
        {desc: 'missing householdId', data: {dinnerEventIds: [10], orders: []}},
        {desc: 'missing dinnerEventIds', data: {householdId: 1, orders: []}},
        {desc: 'empty dinnerEventIds', data: {householdId: 1, dinnerEventIds: [], orders: []}}
      ])('GIVEN $desc WHEN parsing THEN throws', ({data}) => {
        expect(() => ScaffoldOrdersRequestSchema.parse(data)).toThrow()
      })
    })

    describe('ScaffoldOrdersResponseSchema', () => {
      const validResponse = {
        result: {seasonId: 1, created: 2, deleted: 0, released: 0, unchanged: 5, households: 1},
        orders: []
      }

      it('GIVEN valid response WHEN parsing THEN succeeds', () => {
        expect(() => ScaffoldOrdersResponseSchema.parse(validResponse)).not.toThrow()
      })
    })

    describe('convertDesiredToOrderCreate', () => {
      const desired = {
        inhabitantId: 1,
        dinnerEventId: 10,
        dinnerMode: DinnerMode.DINEIN,
        isGuestTicket: false,
        ticketPriceId: 5
      }

      it('GIVEN desired order WHEN converting THEN returns OrderCreateWithPrice', () => {
        const result = convertDesiredToOrderCreate(desired, 100, 42, 55, OrderState.BOOKED)

        expect(result.inhabitantId).toBe(1)
        expect(result.dinnerEventId).toBe(10)
        expect(result.dinnerMode).toBe(DinnerMode.DINEIN)
        expect(result.ticketPriceId).toBe(5)
        expect(result.householdId).toBe(100)
        expect(result.bookedByUserId).toBe(42)
        expect(result.priceAtBooking).toBe(55)
        expect(result.state).toBe(OrderState.BOOKED)
      })

      it.each([
        {state: OrderState.BOOKED, desc: 'before deadline'},
        {state: OrderState.RELEASED, desc: 'after deadline with NONE'}
      ])('GIVEN $desc WHEN converting THEN uses provided state', ({state}) => {
        const result = convertDesiredToOrderCreate(desired, 100, 42, 55, state)
        expect(result.state).toBe(state)
      })
    })
  })
})
