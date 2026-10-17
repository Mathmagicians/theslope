// Factory for Order test data
import type { OrderDisplay, BookingResult, BookingTotals, OrderDetail, OrderHistoryDisplay, OrderHistoryDetail, TicketChange, TicketChangesResponse, OrderHistoryCreate, OrderSnapshot, OrderCreateWithPrice, AuditContext, CreateOrdersResult, OrderForTransaction, DesiredOrder, DinnerMode, ScaffoldOrdersRequest, ScaffoldOrdersResponse, DinnerEventDisplay, ScaffoldResult, DailyMaintenanceResult } from '~/composables/useBookingValidation'
import type { Season } from '~/composables/useSeasonValidation'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useCoreValidation } from '~/composables/useCoreValidation'
import type { BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test'
import testHelpers from '../testHelpers'

// Re-export SeasonFactory for date generation
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import { DinnerEventFactory } from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import { AllergyFactory } from '~~/tests/e2e/testDataFactories/allergyFactory'
import { TicketFactory } from '~~/tests/e2e/testDataFactories/ticketFactory'
import type { AllergyTypeDisplay } from '~/composables/useAllergyValidation'

const { headers, salt, temporaryAndRandom, getSessionUserInfo } = testHelpers

// API endpoints
const HOUSEHOLD_SCAFFOLD_ENDPOINT = '/api/household/order/scaffold'

// Get enum schemas from composable
const { OrderStateSchema, TicketTypeSchema, DinnerModeSchema, DinnerStateSchema, OrderAuditActionSchema, OrderAuditSourceSchema, BookingActionSchema, TicketChangeKindSchema } = useBookingValidation()

// API endpoints
const ORDER_ENDPOINT = '/api/order'

/** Orders a test sets up on one dinner of a household; the scaffold books them with the deadlines lifted */
export type OrderSetupRequest = {
  householdId: number
  dinnerEventId: number
  orders: Array<Pick<DesiredOrder, 'inhabitantId' | 'ticketPriceId' | 'dinnerMode'> & { isGuestTicket?: boolean }>
}

export class OrderFactory {

  /** Default order item - pass inhabitantId & ticketPriceId, rest uses defaults */
  static readonly defaultOrderItem = (overrides: Partial<OrderSetupRequest['orders'][number]>) => ({
    inhabitantId: 1,
    ticketPriceId: 1,
    dinnerMode: DinnerModeSchema.enum.DINEIN,
    isGuestTicket: false,
    ...overrides
  })
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
    isGuestTicket: false,
    releasedAt: null,
    closedAt: null,
    createdAt: SeasonFactory.generateUniqueDate(),
    updatedAt: SeasonFactory.generateUniqueDate(),
    ...overrides
  })

  /** A ticket count per type, in the order adult, child, baby */
  static readonly ticketCounts = (adult: number, child: number, baby: number) =>
    ({[TicketTypeSchema.enum.ADULT]: adult, [TicketTypeSchema.enum.CHILD]: child, [TicketTypeSchema.enum.BABY]: baby})

  /** A line of a dinner's ticket changes: user 31 of S_31 books an adult on a dinner without tickets */
  static readonly defaultTicketChange = (overrides?: Partial<TicketChange>): TicketChange => ({
    id: 1,
    timestamp: new Date('2026-04-05T08:02:00Z'),
    performedByUserId: 31,
    bySystem: false,
    households: ['S_31'],
    events: [{change: TicketChangeKindSchema.enum.BOOK, tickets: OrderFactory.ticketCounts(1, 0, 0)}],
    counts: OrderFactory.ticketCounts(1, 0, 0),
    portions: 1,
    revenue: 5000,
    ...overrides
  })

  /** An order's price row: the default row of its type, carrying the portions a ticket at it weighs */
  static readonly ticketPriceRow = (ticketType: OrderDetail['ticketType'] = TicketTypeSchema.enum.ADULT): NonNullable<OrderDetail['ticketPrice']> => {
    const row = TicketFactory.defaultTicketPricesData.find(price => price.ticketType === ticketType)!
    return {id: 1, ticketType: row.ticketType, price: 45, description: row.description ?? null, portions: row.portions}
  }

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
      name: 'Daisy',
      lastName: 'Duck',
      pictureUrl: null,
      allergies: []
    },
    bookedByUser: {
      id: 1,
      email: salt('daisy', testSalt) + '@andeby.dk'
    },
    ticketPrice: OrderFactory.ticketPriceRow(overrides?.ticketType ?? TicketTypeSchema.enum.ADULT),
    ...overrides
  })

  /** An order whose inhabitant carries one allergy per given type, the diner the allergy overviews count */
  static readonly defaultOrderDetailWithAllergies = (
    inhabitantId: number,
    name: string,
    allergyTypes: AllergyTypeDisplay[] = [],
    overrides?: Partial<OrderDetail>
  ): OrderDetail => {
    const base = OrderFactory.defaultOrderDetail(`allergy-${inhabitantId}`, {id: inhabitantId, inhabitantId, ...overrides})
    const [allergyTemplate] = AllergyFactory.createMockAllergies()
    return {
      ...base,
      inhabitant: {
        ...base.inhabitant,
        id: inhabitantId,
        name,
        allergies: allergyTypes.map(allergyType => ({
          ...allergyTemplate!,
          id: inhabitantId * 10 + allergyType.id,
          inhabitantId,
          allergyTypeId: allergyType.id,
          allergyType
        }))
      }
    }
  }

  static readonly defaultCreateOrdersRequest = (overrides?: Partial<OrderSetupRequest>): OrderSetupRequest => {
    const defaults = {
      householdId: 1,
      dinnerEventId: 5,
      orders: [this.defaultOrderItem({})]
    }

    // Merge each order with defaultOrderItem to ensure all required fields present
    if (overrides?.orders) {
      return {
        ...defaults,
        ...overrides,
        orders: overrides.orders.map(order => this.defaultOrderItem(order))
      }
    }

    return { ...defaults, ...overrides }
  }

  static readonly defaultOrderForTransaction = (testSalt: string = temporaryAndRandom()): OrderForTransaction => {
    const detail = OrderFactory.defaultOrderDetail(testSalt, {state: OrderStateSchema.enum.CLOSED, closedAt: new Date()})
    const {address, pbsId} = HouseholdFactory.defaultHouseholdData(testSalt)
    return {
      ...detail,
      inhabitant: {...detail.inhabitant, household: {id: detail.inhabitant.householdId, pbsId, address}},
      dinnerEvent: {id: detail.dinnerEvent.id, date: detail.dinnerEvent.date, menuTitle: detail.dinnerEvent.menuTitle}
    }
  }

  /**
   * OrderHistoryDisplay - lightweight for lists (ADR-009)
   */
  static readonly defaultOrderHistoryDisplay = (_testSalt: string = temporaryAndRandom(), overrides?: Partial<OrderHistoryDisplay>): OrderHistoryDisplay => ({
    id: 1,
    orderId: 1,
    action: OrderAuditActionSchema.enum.USER_BOOKED,
    performedByUserId: 1,
    performedByUser: {id: 1, email: 'test@example.com'},
    auditData: JSON.stringify({
      inhabitantId: 10,
      bookedByUserId: 1,
      ticketPriceId: 1,
      priceAtBooking: 45
    }),
    timestamp: SeasonFactory.generateUniqueDate(),
    // Denormalized fields for cancellation queries
    inhabitantId: null,
    dinnerEventId: null,
    seasonId: null,
    ...overrides
  })

  /**
   * OrderHistoryDetail - includes order relation (ADR-009)
   */
  static readonly defaultOrderHistoryDetail = (testSalt: string = temporaryAndRandom(), overrides?: Partial<OrderHistoryDetail>): OrderHistoryDetail => ({
    ...OrderFactory.defaultOrderHistoryDisplay(testSalt),
    order: OrderFactory.defaultOrder(testSalt),
    ...overrides
  })

  /**
   * OrderHistoryCreate - for input validation (no id, no timestamp)
   */
  static readonly defaultOrderHistoryCreate = (overrides?: Partial<OrderHistoryCreate>): OrderHistoryCreate => ({
    orderId: 1,
    action: OrderAuditActionSchema.enum.USER_BOOKED,
    performedByUserId: 1,
    auditData: JSON.stringify({
      inhabitantId: 10,
      bookedByUserId: 1,
      ticketPriceId: 1,
      priceAtBooking: 45
    }),
    inhabitantId: null,
    dinnerEventId: null,
    seasonId: null,
    ...overrides
  })

  /**
   * OrderSnapshot - for audit data (derived from OrderDisplaySchema + provenance)
   * Provenance fields enable "🔄 fra AR_1" display on claimed tickets
   */
  static readonly defaultOrderSnapshot = (overrides?: Partial<OrderSnapshot>): OrderSnapshot => ({
    // From OrderDisplaySchema
    id: 1,
    inhabitantId: 10,
    dinnerEventId: 5,
    ticketPriceId: 1,
    priceAtBooking: 4500,
    dinnerMode: DinnerModeSchema.enum.DINEIN,
    state: OrderStateSchema.enum.BOOKED,
    isGuestTicket: false,
    // Provenance fields (pre-formatted for immutable audit trail)
    inhabitantNameWithInitials: 'Daisy D.',
    householdShortname: 'AR_1',
    householdId: 1,
    allergies: [],
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
    isGuestTicket: overrides?.isGuestTicket ?? false,
    ...overrides
  })

  static readonly defaultAuditContext = (overrides?: Partial<AuditContext>): AuditContext => ({
    action: OrderAuditActionSchema.enum.SYSTEM_CREATED,
    performedByUserId: 1,
    source: OrderAuditSourceSchema.enum.csv_billing,
    seasonId: overrides?.seasonId ?? null,
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

  /**
   * Set up orders through the scaffold with `?adminBypass=true`: an admin books any household on any dinner,
   * the deadlines lifted; a member books its own household. createdIds are the household's new orders on the dinner.
   */
  static readonly createOrder = async (
    context: BrowserContext,
    orderData?: Partial<OrderSetupRequest>,
    expectedStatus: number = 200
  ): Promise<CreateOrdersResult | null> => {
    const data = this.defaultCreateOrdersRequest(orderData)
    const householdOrders = () => this.getOrders(context, {dinnerEventIds: data.dinnerEventId, householdId: data.householdId})
    const before = new Set((await householdOrders()).map(order => order.id))
    const dinnerEvent = await DinnerEventFactory.getDinnerEvent(context, data.dinnerEventId)
    const response = await this.scaffoldOrders(context, {
      householdId: data.householdId,
      seasonId: dinnerEvent?.seasonId ?? undefined,
      dinnerEventIds: [data.dinnerEventId],
      orders: data.orders.map(order => this.defaultDesiredOrder({...order, dinnerEventId: data.dinnerEventId, isGuestTicket: order.isGuestTicket ?? false}))
    }, expectedStatus, true)
    if (!response) return null
    expect(response.scaffoldResult.errored, 'The scaffold placed every order').toBe(0)
    const createdIds = (await householdOrders()).map(order => order.id).filter(id => !before.has(id))
    return {householdId: data.householdId, createdIds}
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

  /**
   * Change an order's mode through the scaffold under the deadlines: NONE deletes before the cancellation deadline
   * and releases after it. `withAdminBypass` lifts the deadlines (the admin correction). Returns the order after.
   */
  static readonly updateOrder = async (
    context: BrowserContext,
    orderId: number,
    updateData: { dinnerMode: DinnerMode },
    expectedStatus: number = 200,
    withAdminBypass: boolean = false
  ): Promise<OrderDetail | null> => {
    const order = await this.getOrder(context, orderId)
    await this.scaffoldOrders(context, {
      householdId: order!.inhabitant.householdId,
      seasonId: order!.dinnerEvent.seasonId ?? undefined,
      dinnerEventIds: [order!.dinnerEventId],
      orders: [this.defaultDesiredOrder({
        inhabitantId: order!.inhabitantId,
        dinnerEventId: order!.dinnerEventId,
        ticketPriceId: order!.ticketPriceId!,
        isGuestTicket: order!.isGuestTicket,
        dinnerMode: updateData.dinnerMode,
        orderId
      })]
    }, expectedStatus, withAdminBypass)
    if (expectedStatus !== 200) return null
    const response = await context.request.get(`${ORDER_ENDPOINT}/${orderId}`, { headers })
    return response.status() === 200 ? await response.json() : null
  }

  /**
   * Delete an order by ID
   * @param context - Browser context for API requests
   * @param orderId - Order ID to delete
   * @param expectedStatus - Expected HTTP status (default 200)
   * @param withAdminBypass - If true, adds ?adminBypass=true (for admin tests deleting orders from test households)
   */
  /**
   * Delete an order through the scaffold with `?adminBypass=true`: NONE with the deadlines lifted deletes it.
   * Returns the order as it was, or null when it is already gone.
   */
  static readonly deleteOrder = async (
    context: BrowserContext,
    orderId: number
  ): Promise<OrderDetail | null> => {
    const response = await context.request.get(`${ORDER_ENDPOINT}/${orderId}`, { headers })
    if (response.status() === 404) return null
    const order: OrderDetail = await response.json()
    await this.scaffoldOrders(context, {
      householdId: order.inhabitant.householdId,
      seasonId: order.dinnerEvent.seasonId ?? undefined,
      dinnerEventIds: [order.dinnerEventId],
      orders: [this.defaultDesiredOrder({
        inhabitantId: order.inhabitantId,
        dinnerEventId: order.dinnerEventId,
        ticketPriceId: order.ticketPriceId!,
        isGuestTicket: order.isGuestTicket,
        dinnerMode: DinnerModeSchema.enum.NONE,
        orderId
      })]
    }, 200, true)
    return order
  }

  /**
   * Get orders with flexible query options
   * @param context - Browser context for API requests
   * @param options - Query options (dinnerEventIds, householdId, allHouseholds, state, sortBy)
   * @param expectedStatus - Expected HTTP status (default 200)
   * @returns Array of OrderDisplay
   */
  static readonly getOrders = async (
    context: BrowserContext,
    options: {
      dinnerEventIds?: number | number[]
      upcomingForSeason?: number
      householdId?: number
      allHouseholds?: boolean
      state?: string
      sortBy?: 'createdAt' | 'releasedAt'
      includeDinnerContext?: boolean
    } = {},
    expectedStatus: number = 200
  ): Promise<OrderDisplay[]> => {
    const { OrderDisplaySchema } = useBookingValidation()
    const params = new URLSearchParams()

    if (options.dinnerEventIds !== undefined) {
      const ids = [options.dinnerEventIds].flat()
      ids.forEach(id => params.append('dinnerEventIds', String(id)))
    }
    if (options.upcomingForSeason !== undefined) params.append('upcomingForSeason', String(options.upcomingForSeason))
    if (options.householdId !== undefined) params.append('householdId', String(options.householdId))
    if (options.allHouseholds) params.append('allHouseholds', 'true')
    if (options.state) params.append('state', options.state)
    if (options.sortBy) params.append('sortBy', options.sortBy)
    if (options.includeDinnerContext) params.append('includeDinnerContext', 'true')

    const response = await context.request.get(`${ORDER_ENDPOINT}?${params.toString()}`, { headers })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      const orders = await response.json()
      return orders.map((o: unknown) => OrderDisplaySchema.parse(o))
    }

    return []
  }

  /**
   * Get orders for a dinner event
   * @param context - Browser context for API requests
   * @param dinnerEventId - Dinner event ID to fetch orders for
   * @param expectedStatus - Expected HTTP status (default 200)
   * @returns Array of OrderDisplay
   */
  static readonly getOrdersForDinnerEvent = async (
    context: BrowserContext,
    dinnerEventId: number,
    expectedStatus: number = 200
  ): Promise<OrderDisplay[]> => {
    return OrderFactory.getOrders(context, { dinnerEventIds: dinnerEventId }, expectedStatus)
  }

  /**
   * Get orders for multiple dinner events
   * @param context - Browser context for API requests
   * @param dinnerEventIds - Array of dinner event IDs
   * @returns Array of OrderDisplay for all events
   */
  static readonly getOrdersForDinnerEvents = async (
    context: BrowserContext,
    dinnerEventIds: number[]
  ): Promise<OrderDisplay[]> => {
    const allOrders: OrderDisplay[] = []
    for (const dinnerEventId of dinnerEventIds) {
      const orders = await OrderFactory.getOrdersForDinnerEvent(context, dinnerEventId)
      allOrders.push(...orders)
    }
    return allOrders
  }

  /**
   * Get all orders for dinner events across all households (single request).
   * Use in admin tests where session user is not a member of the test household.
   */
  static readonly getAllOrdersForEvents = async (
    context: BrowserContext,
    dinnerEventIds: number | number[]
  ): Promise<OrderDisplay[]> => {
    return OrderFactory.getOrders(context, {dinnerEventIds, allHouseholds: true})
  }

  /**
   * @deprecated Use getAllOrdersForEvents instead (single request vs N+1)
   */
  static readonly getOrdersForDinnerEventsViaAdmin = async (
    context: BrowserContext,
    dinnerEventIds: number | number[]
  ): Promise<OrderDetail[]> => {
    const ids = Array.isArray(dinnerEventIds) ? dinnerEventIds : [dinnerEventIds]
    const allOrders: OrderDetail[] = []
    for (const dinnerEventId of ids) {
      const dinnerEvent = await DinnerEventFactory.getDinnerEvent(context, dinnerEventId)
      if (dinnerEvent?.tickets) {
        allOrders.push(...dinnerEvent.tickets)
      }
    }
    return allOrders
  }

  /**
   * Cleanup multiple orders by ID (for test afterAll hooks)
   * Gracefully handles 404 errors for already-deleted orders
   * @param context - Browser context for API requests
   * @param orderIds - Array of order IDs to delete
   * @param withAdminBypass - If true, adds ?adminBypass=true (for admin tests deleting orders from test households)
   */
  /** Cleanup orders by ID (afterAll hooks); an order already gone counts as removed */
  static readonly cleanupOrders = async (
    context: BrowserContext,
    orderIds: number[]
  ): Promise<void> => {
    for (const id of orderIds) await this.deleteOrder(context, id)
  }

  // === SCAFFOLD ORDERS (ADR-016 Unified Booking) ===

  /**
   * Default DesiredOrder for scaffold operations
   * @param overrides - Override any field
   * @returns DesiredOrder with defaults for a BOOKED order
   */
  static readonly defaultDesiredOrder = (overrides?: Partial<DesiredOrder>): DesiredOrder => ({
    inhabitantId: 1,
    dinnerEventId: 1,
    dinnerMode: DinnerModeSchema.enum.DINEIN,
    ticketPriceId: 1,
    isGuestTicket: false,
    state: OrderStateSchema.enum.BOOKED,
    ...overrides
  })

  /**
   * Default ScaffoldOrdersRequest
   * @param overrides - Override any field
   */
  static readonly defaultScaffoldRequest = (overrides?: Partial<ScaffoldOrdersRequest>): ScaffoldOrdersRequest => ({
    householdId: 1,
    dinnerEventIds: [1],
    orders: [OrderFactory.defaultDesiredOrder()],
    ...overrides
  })

  /** One order's result in a scaffold run */
  static readonly defaultBookingResult = (overrides?: Partial<BookingResult>): BookingResult => ({
    inhabitantId: 1, inhabitantName: 'Anna', isGuestTicket: false, ticketType: TicketTypeSchema.enum.ADULT, dinnerEventId: 1,
    dinnerMode: DinnerModeSchema.enum.DINEIN, action: BookingActionSchema.enum.BOOK,
    ...overrides
  })

  /** ScaffoldResult data for component tests (no API call); totals name only the actions that differ from zero */
  static readonly defaultScaffoldResult = (
    {totals, ...overrides}: Partial<Omit<ScaffoldResult, 'totals'>> & {totals?: Partial<BookingTotals>} = {}
  ): ScaffoldResult => ({
    seasonId: 1, positions: [], unchanged: 0, households: 1, errored: 0,
    totals: {...Object.fromEntries(BookingActionSchema.options.map(action => [action, 0])) as BookingTotals, ...totals},
    results: [], failed: [],
    outcomes: {joined: [], ticketsSold: [], waitlistTicketsSold: [], waitlistPortionsAssigned: []},
    ...overrides
  })

  /** ScaffoldOrdersResponse data for component tests (no API call) */
  static readonly defaultScaffoldOrdersResponse = (scaffoldResult: Parameters<typeof OrderFactory.defaultScaffoldResult>[0] = {}, householdId: number = 1): ScaffoldOrdersResponse => ({
    householdId,
    scaffoldResult: OrderFactory.defaultScaffoldResult(scaffoldResult)
  })

  /** DailyMaintenanceResult data for component tests (no API call) */
  static readonly defaultDailyMaintenanceResult = (overrides?: Partial<DailyMaintenanceResult>): DailyMaintenanceResult => ({
    jobRunId: 1,
    consume: {consumed: 0},
    close: {closed: 0},
    transact: {created: 0},
    clearWaitlist: {cleared: 0, dinners: []},
    initPrefs: {initialized: 0},
    scaffold: null,
    ...overrides
  })

  /**
   * Scaffold orders via household endpoint (POST /api/household/order/scaffold)
   * ADR-016: Unified booking mutation - creates, updates, releases, and deletes orders
   *
   * @param context - Browser context for API requests
   * @param request - ScaffoldOrdersRequest with householdId, dinnerEventIds, orders
   * @param expectedStatus - Expected HTTP status (default 200)
   * @param adminBypass - Admin acts for a household that is not its own; omitted sends no query, a boolean is sent as given
   * @returns ScaffoldOrdersResponse with householdId and scaffoldResult
   */
  static readonly scaffoldOrders = async (
    context: BrowserContext,
    request: ScaffoldOrdersRequest,
    expectedStatus: number = 200,
    adminBypass?: boolean
  ): Promise<ScaffoldOrdersResponse | null> => {
    const { ScaffoldOrdersResponseSchema } = useBookingValidation()

    const response = await context.request.post(`${HOUSEHOLD_SCAFFOLD_ENDPOINT}${adminBypass === undefined ? '' : `?adminBypass=${adminBypass}`}`, {
      headers,
      data: request
    })

    const status = response.status()
    const responseBody = await response.text()

    expect(status, `Expected ${expectedStatus} but got ${status}: ${responseBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      const parsed = JSON.parse(responseBody)
      return ScaffoldOrdersResponseSchema.parse(parsed)
    }

    return null
  }

  /**
   * Create a DesiredOrder for booking (BOOKED state, specific mode)
   * Uses defaultDesiredOrder with booking-specific overrides
   */
  static readonly createBookingOrder = (
    inhabitantId: number,
    dinnerEventId: number,
    ticketPriceId: number,
    dinnerMode: typeof DinnerModeSchema.enum[keyof typeof DinnerModeSchema.enum] = DinnerModeSchema.enum.DINEIN,
    orderId?: number
  ): DesiredOrder => this.defaultDesiredOrder({
    inhabitantId,
    dinnerEventId,
    ticketPriceId,
    dinnerMode,
    orderId
  })

  /**
   * Create a DesiredOrder for release (RELEASED state, NONE mode)
   * Uses defaultDesiredOrder with release-specific overrides
   */
  static readonly createReleaseOrder = (
    inhabitantId: number,
    dinnerEventId: number,
    ticketPriceId: number,
    orderId: number
  ): DesiredOrder => this.defaultDesiredOrder({
    inhabitantId,
    dinnerEventId,
    ticketPriceId,
    dinnerMode: DinnerModeSchema.enum.NONE,
    state: OrderStateSchema.enum.RELEASED,
    orderId
  })

  /**
   * Create a guest DesiredOrder
   * Uses defaultDesiredOrder with guest-specific overrides
   */
  static readonly createGuestOrder = (
    inhabitantId: number,
    dinnerEventId: number,
    ticketPriceId: number,
    dinnerMode: DinnerMode = DinnerModeSchema.enum.DINEIN,
    allergyTypeIds?: number[]
  ): DesiredOrder => this.defaultDesiredOrder({
    inhabitantId,
    dinnerEventId,
    ticketPriceId,
    dinnerMode,
    isGuestTicket: true,
    allergyTypeIds
  })

  /**
   * Create complete order fixture for deadline-based tests.
   * Uses admin context throughout for simplicity.
   *
   * - Before deadline (>8 days): Creates test household, scaffold creates order
   * - After deadline (<=8 days): Uses admin's session household, creates order directly
   *
   * @param context - Admin browser context
   * @param daysFromNow - Days from today for dinner event
   *   - >8 days = BEFORE deadline (delete allowed)
   *   - <=8 days = AFTER deadline (release only)
   * @param testSalt - Unique salt for test data isolation
   * @returns Fixture data including season, event, household, inhabitant, order
   *
   * CLEANUP NOTE:
   * - Before deadline: household is test data, ADD to createdHouseholdIds
   * - After deadline: household is admin's session, do NOT add to cleanup
   */
  static readonly createOrderFixture = async (
    context: BrowserContext,
    daysFromNow: number,
    testSalt: string
  ): Promise<{
    season: Season
    dinnerEvent: DinnerEventDisplay
    household: { id: number }
    inhabitant: { id: number }
    order: OrderDisplay
    ticketPriceId: number
    isTestHousehold: boolean
  }> => {
    // Create season with ticket prices
    const season = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))

    // Create dinner event at specified days from now
    const eventDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
    const dinnerEvent = await DinnerEventFactory.createDinnerEvent(context, {
      seasonId: season.id!,
      date: eventDate,
      menuTitle: salt(`Fixture-${daysFromNow}d`, testSalt)
    })

    const ticketPriceId = season.ticketPrices?.find(tp => tp.ticketType === TicketTypeSchema.enum.ADULT)?.id
    if (!ticketPriceId) throw new Error('No ADULT ticket price found')

    let order: OrderDisplay
    let householdId: number
    let inhabitantId: number
    let isTestHousehold: boolean

    if (daysFromNow > 8) {
      // BEFORE deadline: Create isolated test household, scaffold creates order
      const created = await HouseholdFactory.createHouseholdWithInhabitants(
        context, HouseholdFactory.defaultHouseholdData(testSalt), 1
      )
      householdId = created.household.id
      inhabitantId = created.inhabitants[0]!.id
      isTestHousehold = true

      // Set DINEIN preferences so scaffold creates order
      const {createDefaultWeekdayMap} = useCoreValidation()
      const allDaysDineIn = createDefaultWeekdayMap(DinnerModeSchema.enum.DINEIN)
      await HouseholdFactory.updateInhabitant(context, inhabitantId, {dinnerPreferences: allDaysDineIn}, 200, season.id!)

      // Scaffold creates order
      await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)
      const orders = await this.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id)
      const found = orders.find(o => o.inhabitantId === inhabitantId)
      if (!found) throw new Error(`Order not created by scaffold for inhabitant ${inhabitantId}`)
      order = found
    } else {
      // AFTER deadline: Use admin's session household, create order directly
      const sessionInfo = await getSessionUserInfo(context)
      householdId = sessionInfo.householdId
      inhabitantId = sessionInfo.inhabitantId
      isTestHousehold = false

      // Create order directly (admin has access to own household)
      const createResult = await this.createOrder(context, {
        householdId,
        dinnerEventId: dinnerEvent.id,
        orders: [this.defaultOrderItem({
          inhabitantId,
          ticketPriceId,
          dinnerMode: DinnerModeSchema.enum.DINEIN
        })]
      })
      if (!createResult) throw new Error('Order creation failed')
      const fetched = await this.getOrder(context, createResult.createdIds[0]!)
      if (!fetched) throw new Error('Order fetch failed')
      order = fetched
    }

    return {
      season,
      dinnerEvent,
      household: { id: householdId },
      inhabitant: { id: inhabitantId },
      order,
      ticketPriceId,
      isTestHousehold
    }
  }

  // GET /api/chef/dinner/[id]/order-history: the dinner's ticket changes newest first, from `since` when given
  static readonly getTicketChanges = async (
    context: BrowserContext,
    dinnerEventId: number,
    since?: Date,
    expectedStatus: number = 200
  ): Promise<TicketChangesResponse | null> => {
    const { TicketChangesResponseSchema } = useBookingValidation()
    const query = since ? `?since=${encodeURIComponent(since.toISOString())}` : ''
    const response = await context.request.get(`/api/chef/dinner/${dinnerEventId}/order-history${query}`, { headers })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    return expectedStatus === 200 ? TicketChangesResponseSchema.parse(await response.json()) : null
  }
}
