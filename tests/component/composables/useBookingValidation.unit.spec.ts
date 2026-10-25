import {describe, it, expect} from 'vitest'
import {useBookingValidation, type OrderAuditAction, type OrderHistoryDisplay} from '~/composables/useBookingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {useDeliveryValidation} from '~/composables/useDeliveryValidation'
import type {PortionTicket} from '~/composables/useTicketPriceValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
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
    OrderSnapshotSchema,
    OrderAuditChangeSchema,
    OrderAuditActionSchema,
    OrderAuditSourceSchema,
    OrderStateSchema,
    DinnerModeSchema,
    createOrderAuditData,
    readOrderAudit,
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
      {name: 'OrderSnapshotSchema', schema: OrderSnapshotSchema, factory: () => OrderFactory.defaultOrderSnapshot()}
    ])('$name GIVEN the factory data WHEN parsing THEN succeeds', ({schema, factory}) => {
      const result: ZodSafeParseResult<unknown> = schema.safeParse(factory())
      expect(result.success, getValidationError(result)).toBe(true)
    })

    // One auditData format written by createOrderAuditData; readOrderAudit also reads the shapes earlier writers left
    describe('order audit data', () => {
      const Change = OrderAuditChangeSchema.enum
      const Audit = OrderAuditActionSchema.enum
      const Source = OrderAuditSourceSchema.enum
      const State = OrderStateSchema.enum
      const Mode = DinnerModeSchema.enum
      const {legacyAuditData} = OrderFactory
      const snapshot = OrderFactory.defaultOrderSnapshot({id: 7, isGuestTicket: true, allergies: ['Gluten']})
      const BUYER = 20
      // A row on the snapshot's dinner by its inhabitant; the row's order id is null once the order is deleted
      const auditRow = (action: OrderAuditAction, auditData: string, overrides: Partial<OrderHistoryDisplay> = {}) =>
        OrderFactory.defaultOrderHistoryDisplay(undefined, {action, auditData, orderId: null, inhabitantId: snapshot.inhabitantId, dinnerEventId: snapshot.dinnerEventId, ...overrides})
      const tellsNothing = {
        change: null, source: null, orderId: null, inhabitantId: null, dinnerEventId: null, householdId: null, householdShortname: null,
        ticketPriceId: null, priceAtBooking: null, state: null, isGuestTicket: null, allergies: null
      }
      const ofSnapshot = {
        orderId: snapshot.id, inhabitantId: snapshot.inhabitantId, dinnerEventId: snapshot.dinnerEventId, householdId: snapshot.householdId,
        householdShortname: snapshot.householdShortname, ticketPriceId: snapshot.ticketPriceId, priceAtBooking: snapshot.priceAtBooking,
        state: snapshot.state, isGuestTicket: snapshot.isGuestTicket, allergies: snapshot.allergies
      }
      const orderData = OrderFactory.defaultOrderCreateWithPrice(snapshot.householdId, {
        inhabitantId: snapshot.inhabitantId, dinnerEventId: snapshot.dinnerEventId, ticketPriceId: 2, priceAtBooking: 2500, isGuestTicket: true
      })
      const ofOrderData = {
        inhabitantId: orderData.inhabitantId, dinnerEventId: orderData.dinnerEventId, householdId: orderData.householdId,
        ticketPriceId: orderData.ticketPriceId, priceAtBooking: orderData.priceAtBooking, state: orderData.state, isGuestTicket: orderData.isGuestTicket
      }
      // A legacy batch update's row: its order, inhabitant and dinner from the row's own fields
      const ofUpdateRow = {orderId: snapshot.id, inhabitantId: snapshot.inhabitantId, dinnerEventId: snapshot.dinnerEventId}

      it.each(OrderAuditChangeSchema.options)('GIVEN a %s written through createOrderAuditData WHEN reading the row THEN it reads the change and the order of the snapshot', (change) => {
        expect(readOrderAudit(auditRow(Audit.SYSTEM_UPDATED, createOrderAuditData(change, snapshot)))).toEqual({...tellsNothing, change, ...ofSnapshot})
      })

      it('GIVEN a creation written with its source WHEN reading the row THEN the source reads back', () => {
        const auditData = createOrderAuditData(Change.BOOK, snapshot, Source['waitlist-assignment'])
        expect(readOrderAudit(auditRow(Audit.SYSTEM_CREATED, auditData))).toEqual({...tellsNothing, change: Change.BOOK, source: Source['waitlist-assignment'], ...ofSnapshot})
      })

      it.each([
        {shape: 'a creation\'s order data and source', row: auditRow(Audit.USER_BOOKED, legacyAuditData.creation(Source['user-booking'], orderData)),
          reads: {...tellsNothing, change: Change.BOOK, source: Source['user-booking'], ...ofOrderData}},
        {shape: 'a creation whose source the enum does not name', row: auditRow(Audit.SYSTEM_CREATED, JSON.stringify({source: 'heynabo-import', orderData})),
          reads: {...tellsNothing, change: Change.BOOK, ...ofOrderData}},
        {shape: 'a release\'s new scalars', row: auditRow(Audit.USER_CANCELLED, legacyAuditData.update({state: State.RELEASED, dinnerMode: Mode.NONE, ticketPriceId: null, priceAtBooking: null}), {orderId: snapshot.id}),
          reads: {...tellsNothing, change: Change.RELEASE, ...ofUpdateRow, state: State.RELEASED}},
        {shape: 'the close\'s new scalars', row: auditRow(Audit.SYSTEM_UPDATED, legacyAuditData.update({state: State.CLOSED, dinnerMode: Mode.DINEIN, ticketPriceId: null, priceAtBooking: null}), {orderId: snapshot.id}),
          reads: {...tellsNothing, change: Change.CLOSE, ...ofUpdateRow, state: State.CLOSED}},
        {shape: 'a price row change\'s new scalars', row: auditRow(Audit.USER_BOOKED, legacyAuditData.update({state: State.BOOKED, dinnerMode: Mode.DINEIN, ticketPriceId: 2, priceAtBooking: 2500}), {orderId: snapshot.id}),
          reads: {...tellsNothing, ...ofUpdateRow, ticketPriceId: 2, priceAtBooking: 2500, state: State.BOOKED}},
        {shape: 'a claim\'s snapshot of the seller\'s order', row: auditRow(Audit.USER_CLAIMED, legacyAuditData.snapshot(snapshot), {orderId: snapshot.id, inhabitantId: BUYER}),
          reads: {...tellsNothing, change: Change.BUY, ...ofSnapshot}},
        {shape: 'a cancellation\'s snapshot', row: auditRow(Audit.USER_CANCELLED, legacyAuditData.snapshot(snapshot)),
          reads: {...tellsNothing, change: Change.CANCEL, ...ofSnapshot}},
        {shape: 'a system deletion\'s snapshot', row: auditRow(Audit.SYSTEM_DELETED, legacyAuditData.snapshot(snapshot)),
          reads: {...tellsNothing, change: Change.CANCEL, ...ofSnapshot}}
      ])('GIVEN the legacy shape of $shape WHEN reading the row THEN it reads what the row tells and null for the rest', ({row, reads}) => {
        expect(readOrderAudit(row)).toEqual(reads)
      })

      it.each(['not json', 'null', '"a text"'])('GIVEN audit data holding no object (%s) WHEN reading the row THEN it reads null', (auditData) => {
        expect(readOrderAudit(auditRow(Audit.USER_BOOKED, auditData))).toBeNull()
      })
    })
  })

  describe('Orders Creation (Batch)', () => {
    const {
      AuditContextSchema,
      OrderCreateWithPriceSchema,
      CreateOrdersResultSchema
    } = useBookingValidation()

    it.each([
      {name: 'AuditContextSchema', parse: () => AuditContextSchema.parse(OrderFactory.defaultAuditContext())},
      {name: 'OrderCreateWithPriceSchema', parse: () => OrderCreateWithPriceSchema.parse(OrderFactory.defaultOrderCreateWithPrice())},
      {name: 'CreateOrdersResultSchema', parse: () => CreateOrdersResultSchema.parse(OrderFactory.defaultCreateOrdersResult())}
    ])('$name GIVEN the factory data WHEN parsing THEN succeeds', ({parse}) => {
      expect(parse).not.toThrow()
    })
  })

  describe('Serialization (ADR-010)', () => {
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
      const validResult = () => ({
        jobRunId: 42,
        consume: {consumed: 5},
        close: {closed: 10},
        transact: {created: 8},
        clearWaitlist: {cleared: 3, dinners: [{dinnerEventId: 644, date: new Date('2026-10-12'), cleared: 3}]},
        // The emails the run sent per sender event
        notifications: {[useDeliveryValidation().SenderEventSchema.enum.BOOKING_STATUS]: {sent: 2}},
        scaffold: OrderFactory.defaultScaffoldResult({totals: {[Action.BOOK]: 20}, unchanged: 100, households: 10})
      })

      it('GIVEN valid maintenance result WHEN parsing THEN succeeds', () => {
        const given = validResult()
        const result = DailyMaintenanceResultSchema.parse(given)
        expect(result.jobRunId).toBe(42)
        expect(result.consume.consumed).toBe(5)
        expect(result.close.closed).toBe(10)
        expect(result.transact.created).toBe(8)
        expect(result.clearWaitlist.cleared).toBe(3)
        expect(result.clearWaitlist.dinners).toEqual([{dinnerEventId: 644, date: new Date('2026-10-12'), cleared: 3}])
        expect(result.notifications).toEqual(given.notifications)
        expect(result.scaffold?.seasonId).toBe(1)
      })

      // A job run recorded before a step existed reads that step as zero
      it.each([
        {step: 'clearWaitlist', zero: {cleared: 0, dinners: []}},
        {step: 'notifications', zero: {}}
      ] as const)('GIVEN a result without $step WHEN parsing THEN $step defaults to zero', ({step, zero}) => {
        const {[step]: _omitted, ...withoutStep} = validResult()
        expect(DailyMaintenanceResultSchema.parse(withoutStep)[step]).toEqual(zero)
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

    // A preview is a read (ADR-004): the draft travels in the query, one dot-separated value per desired order, in the
    // order inhabitantId.dinnerEventId.dinnerMode.ticketPriceId.isGuestTicket.state.orderId.waitlistEntryId.allergyTypeIds
    describe('the desired order in a query', () => {
      const {encodeDesiredOrder, DesiredOrderQuerySchema} = useBookingValidation()
      const bare = OrderFactory.defaultDesiredOrder({inhabitantId: 3, dinnerEventId: 41, ticketPriceId: 5})
      const {DINEIN} = DinnerMode
      const {BOOKED} = OrderState

      it.each([
        {desc: 'a bare booking', order: bare, code: `3.41.${DINEIN}.5.0.${BOOKED}...`},
        {desc: 'a change of an order', order: {...bare, orderId: 77}, code: `3.41.${DINEIN}.5.0.${BOOKED}.77..`},
        {desc: 'a place on the waiting list', order: {...bare, waitlistEntryId: 12}, code: `3.41.${DINEIN}.5.0.${BOOKED}..12.`},
        {desc: 'a guest with allergies', order: {...bare, isGuestTicket: true, allergyTypeIds: [2, 9]}, code: `3.41.${DINEIN}.5.1.${BOOKED}...2-9`},
        ...DinnerModeSchema.options.filter(dinnerMode => dinnerMode !== DINEIN).map(dinnerMode =>
          ({desc: `the mode ${dinnerMode}`, order: {...bare, dinnerMode}, code: `3.41.${dinnerMode}.5.0.${BOOKED}...`})),
        ...OrderStateSchema.options.filter(state => state !== BOOKED).map(state =>
          ({desc: `the state ${state}`, order: {...bare, state, orderId: 77}, code: `3.41.${DINEIN}.5.0.${state}.77..`}))
      ])('GIVEN $desc WHEN encoded THEN it reads $code and decodes to the same order', ({order, code}) => {
        expect(encodeDesiredOrder(order)).toBe(code)
        expect(DesiredOrderQuerySchema.parse(encodeDesiredOrder(order))).toStrictEqual(order)
      })

      it.each([
        {malformed: 'a missing segment (the ticket price)', from: (code: string) => code.split('.').filter((_, index) => index !== 3).join('.')},
        {malformed: 'a non-numeric id', from: (code: string) => ['anna', ...code.split('.').slice(1)].join('.')},
        {malformed: 'an unknown dinner mode', from: (code: string) => code.replace(DINEIN, 'BRUNCH')}
      ])('GIVEN $malformed WHEN parsed THEN the schema fails', ({from}) => {
        expect(DesiredOrderQuerySchema.safeParse(from(encodeDesiredOrder({...bare, orderId: 77}))).success).toBe(false)
      })

      // Cloudflare refuses a URL past 16 KB. The widest ids D1 hands out, the longest mode and state and an order id on
      // every cell make the month's draft as long as it gets
      it('GIVEN a month\'s draft of a family of five (5 × 22 dinners) WHEN encoded into the scaffold\'s query THEN the URL stays under 16 KB', () => {
        const LARGEST_ID = 2_147_483_647
        const family = Array.from({length: 5}, (_, person) => ({...HouseholdFactory.defaultInhabitantData(`family-${person}`), id: LARGEST_ID - person}))
        const month = Array.from({length: 22}, (_, day) => DinnerEventFactory.dinnerEventAt(LARGEST_ID - day, day + 1))
        const orders = family.flatMap(({id: inhabitantId}, person) => month.map(({id: dinnerEventId}, day) => OrderFactory.defaultDesiredOrder({
          inhabitantId, dinnerEventId, ticketPriceId: LARGEST_ID, orderId: LARGEST_ID - person * month.length - day,
          dinnerMode: DinnerMode.DINEINLATE, state: OrderState.RELEASED
        })))

        const url = OrderFactory.previewScaffoldUrl({householdId: LARGEST_ID, seasonId: LARGEST_ID, dinnerEventIds: month.map(({id}) => id), orders})

        expect(orders).toHaveLength(110)
        expect(new TextEncoder().encode(url).length).toBeLessThan(16 * 1024)
      })
    })
  })
})
