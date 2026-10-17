import {describe, it, expect} from 'vitest'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import type {PortionTicket} from '~/composables/useTicketPriceValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {ExpenseFactory} from '~~/tests/e2e/testDataFactories/expenseFactory'
import {useBillingValidation} from '~/composables/useBillingValidation'
import type {ZodSafeParseResult} from 'zod'

const {TicketTypeSchema} = useBookingValidation()

const getValidationError = <T>(result: ZodSafeParseResult<T>) =>
  !result.success ? `Validation errors: ${JSON.stringify(result.error.format())}` : ''

// Plain zod (enums, required and nullable fields, lengths, positive ids) is not restated here: the cases cover
// the factory data each schema parses, the write schemas' strictness, the refinements, defaults and the (de)serializers
describe('useBookingValidation', () => {
  const {
    DinnerEventDisplaySchema,
    DinnerEventDetailSchema,
    DinnerEventCreateSchema,
    DinnerEventUpdateSchema,
    OrderDisplaySchema,
    OrderDetailSchema,
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

  describe('DinnerEvent Schemas', () => {
    it('DinnerEventDisplaySchema (ADR-009: Minimal) GIVEN the factory display data WHEN parsing THEN succeeds', () => {
      const validDisplay = DinnerEventFactory.defaultDinnerEventDisplay()
      expect(DinnerEventDisplaySchema.parse(validDisplay)).toMatchObject(validDisplay)
    })

    it('DinnerEventDetailSchema (ADR-009: Detail extends Display) GIVEN detail with ALL scalar fields WHEN parsing THEN succeeds', () => {
      const validDetail = DinnerEventFactory.defaultDinnerEventDetail()
      expect(DinnerEventDetailSchema.parse(validDetail)).toMatchObject(validDetail)
    })

    describe('DinnerEventCreateSchema', () => {
      const baseCreate = DinnerEventFactory.defaultDinnerEventCreate()

      it('GIVEN valid create data WHEN parsing THEN succeeds', () => {
        expect(() => DinnerEventCreateSchema.parse(baseCreate)).not.toThrow()
      })

      it('GIVEN a totalCost key (the cost is computed from the expense rows) WHEN parsing THEN throws', () => {
        expect(() => DinnerEventCreateSchema.parse({...baseCreate, totalCost: 50})).toThrow()
      })
    })

    describe('DinnerEventUpdateSchema', () => {
      // Note: id comes from URL path, not body (ADR-013)
      it('GIVEN a totalCost key (the cost is computed from the expense rows) WHEN parsing THEN throws', () => {
        expect(() => DinnerEventUpdateSchema.parse({totalCost: 50000})).toThrow()
      })
    })
  })

  describe('Order Schemas', () => {
    it('OrderDisplaySchema (ADR-009: Minimal) GIVEN valid order WHEN parsing THEN succeeds', () => {
      const result = OrderDisplaySchema.safeParse(OrderFactory.defaultOrder())
      expect(result.success, getValidationError(result)).toBe(true)
    })

    it('OrderDetailSchema (ADR-009: ALL scalar relations) GIVEN detail WHEN parsing THEN succeeds and includes ALL DinnerEvent scalars', () => {
      const result = OrderDetailSchema.safeParse(OrderFactory.defaultOrderDetail())
      expect(result.success, getValidationError(result)).toBe(true)

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

    it.each([
      {name: 'OrderHistoryDisplaySchema', schema: OrderHistoryDisplaySchema, factory: () => OrderFactory.defaultOrderHistoryDisplay()},
      {name: 'OrderHistoryDetailSchema', schema: OrderHistoryDetailSchema, factory: () => OrderFactory.defaultOrderHistoryDetail()},
      {name: 'OrderHistoryCreateSchema', schema: OrderHistoryCreateSchema, factory: () => OrderFactory.defaultOrderHistoryCreate()},
      {name: 'OrderSnapshotSchema', schema: OrderSnapshotSchema, factory: () => OrderFactory.defaultOrderSnapshot()}
    ])('$name GIVEN the factory data WHEN parsing THEN succeeds', ({schema, factory}) => {
      const result: ZodSafeParseResult<unknown> = schema.safeParse(factory())
      expect(result.success, getValidationError(result)).toBe(true)
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
      AuditContextSchema,
      OrderCreateWithPriceSchema,
      OrdersBatchSchema,
      CreateOrdersResultSchema,
      ORDER_BATCH_SIZE
    } = useBookingValidation()

    it.each([
      {name: 'AuditContextSchema', parse: () => AuditContextSchema.parse(OrderFactory.defaultAuditContext())},
      {name: 'OrderCreateWithPriceSchema', parse: () => OrderCreateWithPriceSchema.parse(OrderFactory.defaultOrderCreateWithPrice())},
      {name: 'CreateOrdersResultSchema', parse: () => CreateOrdersResultSchema.parse(OrderFactory.defaultCreateOrdersResult())}
    ])('$name GIVEN the factory data WHEN parsing THEN succeeds', ({parse}) => {
      expect(parse).not.toThrow()
    })

    // The batch size is the D1 limit (ADR-014); one batch belongs to one household
    describe('OrdersBatchSchema', () => {
      it('GIVEN batch of max (ORDER_BATCH_SIZE) orders of one household WHEN parsing THEN succeeds', () => {
        expect(() => OrdersBatchSchema.parse(OrderFactory.createOrdersBatch(1, ORDER_BATCH_SIZE))).not.toThrow()
      })

      it('GIVEN a batch exceeding max WHEN parsing THEN throws', () => {
        expect(() => OrdersBatchSchema.parse(OrderFactory.createOrdersBatch(1, ORDER_BATCH_SIZE + 1))).toThrow(/Maksimalt/)
      })

      it('GIVEN batch with different householdIds WHEN parsing THEN throws', () => {
        const mixedBatch = [
          OrderFactory.defaultOrderCreateWithPrice(1),
          OrderFactory.defaultOrderCreateWithPrice(2)
        ]
        expect(() => OrdersBatchSchema.parse(mixedBatch)).toThrow(/samme husstand/)
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

      it.each([
        {desc: 'without dinnerEvent', context: undefined},
        {desc: 'with dinnerEvent', context: {id: 1, date: new Date('2025-01-15'), menuTitle: 'Test Menu'}}
      ])('GIVEN order $desc WHEN round-tripping THEN preserves data', ({context}) => {
        const order = OrderFactory.defaultOrder(undefined, {dinnerEvent: context})
        const serialized = serializeOrder(order)
        const deserialized = deserializeOrder(serialized)
        expect(deserialized.dinnerEvent?.menuTitle).toBe(context?.menuTitle)
        if (context) {
          expect(deserialized.dinnerEvent?.date).toBeInstanceOf(Date)
        }
      })
    })

    describe('serializeOrderHistoryDisplay / deserializeOrderHistoryDisplay', () => {
      it('GIVEN history WHEN serializing THEN converts timestamp to string, and the round trip preserves the data', () => {
        const originalHistory = OrderFactory.defaultOrderHistoryDisplay()
        const serialized = serializeOrderHistoryDisplay(originalHistory)
        expect(typeof serialized.timestamp).toBe('string')
        expect(deserializeOrderHistoryDisplay(serialized)).toEqual(originalHistory)
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

      // The arithmetic of the sum, an empty relation included, is sumAmounts' (utils/ledger.unit.spec.ts)
      it('GIVEN expense rows WHEN deserializing THEN the cost is their sum and the stored column is discarded', () => {
        const prismaEvent = {...DinnerEventFactory.defaultDinnerEventDisplay(), totalCost: 99, expenses: [{amount: 101200}, {amount: 29800}]}
        const result = deserializeDinnerEvent(prismaEvent)
        expect(result.totalCost).toBe(131000)
        expect(result).not.toHaveProperty('expenses')
      })
    })

    describe('deserializeDinnerEventDetail', () => {
      // The server weighs a price row through useTicket; the deserializer only places what the lookup gives
      const withPortions = <T extends PortionTicket>(ticketPrice: T) => ({...ticketPrice, portions: 0.5})

      it('GIVEN a ticket with its price row WHEN deserializing THEN the row carries the portions the lookup gives it', () => {
        const ticket = {...OrderFactory.defaultOrderDetail(), inhabitant: null}
        const result = deserializeDinnerEventDetail(DinnerEventFactory.defaultSerializedDinnerEventDetail({tickets: [ticket]}), withPortions)
        expect((result.tickets as Array<{ticketPrice: {portions: number}}>)[0]!.ticketPrice.portions).toBe(0.5)
      })

      it('GIVEN expense rows WHEN deserializing THEN the lines are domain rows, the cost is their sum and the ticket reference carries it', () => {
        const {serializeExpense} = useBillingValidation()
        const rows = [
          ExpenseFactory.defaultExpense({id: 1, amount: 101200}),
          ExpenseFactory.defaultExpense({id: 2, amount: 29800, paidByUserId: null, paidBy: {id: null, email: ''}})
        ]
        const ticket = {...OrderFactory.defaultOrderDetail(), ticketPrice: {ticketType: TicketTypeSchema.enum.ADULT}, inhabitant: null}
        const result = deserializeDinnerEventDetail({
          ...DinnerEventFactory.defaultSerializedDinnerEventDetail({tickets: [ticket]}),
          totalCost: 99,
          expenses: rows.map(serializeExpense)
        }, withPortions)
        expect(result.totalCost).toBe(131000)
        expect(result.expenses).toEqual(rows)
        expect((result.tickets as Array<{dinnerEvent: {totalCost: number}}>)[0]!.dinnerEvent.totalCost).toBe(131000)
      })

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
        const result = deserializeDinnerEventDetail(input(), withPortions)
        assertion(result)
      })

      it('GIVEN a ticket inhabitant with allergies WHEN deserializing THEN keeps each allergy with its allergy type', () => {
        const allergies = AllergyFactory.serializedAllergies(2)
        const result = deserializeDinnerEventDetail(DinnerEventFactory.defaultSerializedDinnerEventDetail({
          tickets: [{id: 1, inhabitant: {...DinnerEventFactory.serializedInhabitant(SERIALIZED_PREFERENCES), allergies}}]
        }), withPortions)
        const tickets = result.tickets as Array<{inhabitant: {allergies: Array<{allergyType: unknown}>}}>
        expect(tickets[0]!.inhabitant.allergies.map(a => a.allergyType)).toEqual(allergies.map(a => a.allergyType))
      })
    })
  })

  describe('Daily Maintenance Result Schemas', () => {
    const {
      DailyMaintenanceResultSchema,
      ScaffoldResultSchema,
      BookingActionSchema
    } = useBookingValidation()
    const Action = BookingActionSchema.enum

    describe('ScaffoldResultSchema', () => {
      const validScaffoldResult = OrderFactory.defaultScaffoldResult({totals: {[Action.BOOK]: 10, [Action.CANCEL]: 2, [Action.RELEASE]: 1}, unchanged: 50, households: 5})

      it('GIVEN a run with orders WHEN parsing THEN succeeds', () => {
        expect(() => ScaffoldResultSchema.parse(validScaffoldResult)).not.toThrow()
      })

      it('GIVEN a result without positions, errors and outcomes WHEN parsing THEN they default to none', () => {
        const {positions: _p, errored: _e, outcomes: _o, ...bare} = validScaffoldResult
        expect(ScaffoldResultSchema.parse(bare)).toMatchObject({positions: [], errored: 0, outcomes: {joined: [], ticketsSold: [], waitlistTicketsSold: []}})
      })

      // A queue place names the line of its ticket type; an entry whose ticket price is gone names none
      it.each([TicketTypeSchema.enum.ADULT, null])('GIVEN a queue place in the line of %s WHEN parsing THEN it keeps its ticket type', (ticketType) => {
        const position = {inhabitantId: 1, dinnerEventId: 1, isGuestTicket: false, position: 2, ticketType}
        expect(ScaffoldResultSchema.parse({...validScaffoldResult, positions: [position]}).positions).toEqual([position])
      })

      it('GIVEN a queue place without its ticket type WHEN parsing THEN throws', () => {
        const {ticketType: _t, ...untyped} = {inhabitantId: 1, dinnerEventId: 1, isGuestTicket: false, position: 2, ticketType: null}
        expect(() => ScaffoldResultSchema.parse({...validScaffoldResult, positions: [untyped]})).toThrow()
      })

      // An order's result names its ticket type, so the guests of one booker group by type; null when the price is gone
      it.each([TicketTypeSchema.enum.CHILD, null])('GIVEN an order\'s result of ticket type %s WHEN parsing THEN it keeps its ticket type', (ticketType) => {
        const result = OrderFactory.defaultBookingResult({isGuestTicket: true, ticketType})
        expect(ScaffoldResultSchema.parse({...validScaffoldResult, results: [result], failed: [result]})).toMatchObject({results: [{ticketType}], failed: [{ticketType}]})
      })

      it('GIVEN an order\'s result without its ticket type WHEN parsing THEN throws', () => {
        const {ticketType: _t, ...untyped} = OrderFactory.defaultBookingResult()
        expect(() => ScaffoldResultSchema.parse({...validScaffoldResult, results: [untyped]})).toThrow()
      })

      // The totals count every action, a zero included
      it('GIVEN a total missing an action WHEN parsing THEN throws', () => {
        expect(() => ScaffoldResultSchema.parse({...validScaffoldResult, totals: {[Action.BOOK]: 1}})).toThrow()
      })
    })

    describe('DailyMaintenanceResultSchema', () => {
      const validResult = {
        jobRunId: 42,
        consume: {consumed: 5},
        close: {closed: 10},
        transact: {created: 8},
        clearWaitlist: {cleared: 3, dinners: [{dinnerEventId: 644, date: new Date('2026-10-12'), cleared: 3}]},
        scaffold: OrderFactory.defaultScaffoldResult({totals: {[Action.BOOK]: 20}, unchanged: 100, households: 10})
      }

      it('GIVEN valid maintenance result WHEN parsing THEN succeeds', () => {
        const result = DailyMaintenanceResultSchema.parse(validResult)
        expect(result.jobRunId).toBe(42)
        expect(result.consume.consumed).toBe(5)
        expect(result.close.closed).toBe(10)
        expect(result.transact.created).toBe(8)
        expect(result.clearWaitlist.cleared).toBe(3)
        expect(result.clearWaitlist.dinners).toEqual([{dinnerEventId: 644, date: new Date('2026-10-12'), cleared: 3}])
        expect(result.scaffold?.seasonId).toBe(1)
      })

      it('GIVEN a result without clearWaitlist WHEN parsing THEN clearWaitlist defaults to zero', () => {
        const {clearWaitlist: _cleared, ...withoutClearWaitlist} = validResult
        expect(DailyMaintenanceResultSchema.parse(withoutClearWaitlist).clearWaitlist.cleared).toBe(0)
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
      {input: '5', expected: [5], desc: 'single string'},
      {input: ['1', '2'], expected: [1, 2], desc: 'array of strings'}
    ])('GIVEN $desc WHEN parsing THEN returns $expected', ({input, expected}) => {
      expect(IdOrIdsSchema.parse(input)).toEqual(expected)
    })

    it('GIVEN a non-numeric string WHEN parsing THEN throws', () => {
      expect(() => IdOrIdsSchema.parse('abc')).toThrow()
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
      OrderStateSchema,
      DinnerModeSchema,
      BookingActionSchema
    } = useBookingValidation()

    const OrderState = OrderStateSchema.enum
    const DinnerMode = DinnerModeSchema.enum

    const validDesiredOrder = {
      inhabitantId: 1,
      dinnerEventId: 10,
      dinnerMode: DinnerMode.DINEIN,
      isGuestTicket: false,
      ticketPriceId: 5,
      state: OrderState.BOOKED
    }

    it.each([
      {name: 'DesiredOrderSchema', parse: () => DesiredOrderSchema.parse(validDesiredOrder)},
      {name: 'ScaffoldOrdersRequestSchema', parse: () => ScaffoldOrdersRequestSchema.parse({householdId: 1, dinnerEventIds: [10, 11], orders: [validDesiredOrder]})},
      {name: 'ScaffoldOrdersResponseSchema', parse: () => ScaffoldOrdersResponseSchema.parse(OrderFactory.defaultScaffoldOrdersResponse({totals: {[BookingActionSchema.enum.BOOK]: 2}, unchanged: 5}))}
    ])('$name GIVEN valid data WHEN parsing THEN succeeds', ({parse}) => {
      expect(parse).not.toThrow()
    })
  })
})
