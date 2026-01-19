// Factory for Order test data
import type { OrderDisplay, CreateOrdersRequest, SwapOrderRequest, OrderDetail, OrderHistoryDisplay, OrderHistoryDetail, OrderHistoryCreate, OrderSnapshot, OrderCreateWithPrice, AuditContext, CreateOrdersResult, OrderForTransaction, DesiredOrder, ScaffoldOrdersRequest, ScaffoldOrdersResponse, DinnerEventDisplay } from '~/composables/useBookingValidation'
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

const { headers, salt, temporaryAndRandom, getSessionUserInfo } = testHelpers

// API endpoints
const HOUSEHOLD_SCAFFOLD_ENDPOINT = '/api/household/order/scaffold'

// Get enum schemas from composable
const { OrderStateSchema, TicketTypeSchema, DinnerModeSchema, DinnerStateSchema, OrderAuditActionSchema } = useBookingValidation()

// API endpoints
const ORDER_ENDPOINT = '/api/order'

export class OrderFactory {

  /** Default order item - pass inhabitantId & ticketPriceId, rest uses defaults */
  static readonly defaultOrderItem = (overrides: Partial<CreateOrdersRequest['orders'][number]>) => ({
    inhabitantId: 1,
    ticketPriceId: 1,
    bookedByUserId: 1,
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
    ticketPrice: {
      id: 1,
      ticketType: TicketTypeSchema.enum.ADULT,
      price: 45,
      description: 'Adult ticket'
    },
    ...overrides
  })

  static readonly defaultCreateOrdersRequest = (overrides?: Partial<CreateOrdersRequest>): CreateOrdersRequest => {
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

  static readonly defaultSwapOrderRequest = (overrides?: Partial<SwapOrderRequest>): SwapOrderRequest => ({
    inhabitantId: 10,
    ...overrides
  })

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
    action: 'SYSTEM_CREATED',
    performedByUserId: 1,
    source: 'csv_billing',
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

  static readonly createOrder = async (
    context: BrowserContext,
    orderData?: Partial<CreateOrdersRequest>,
    expectedStatus: number = 201
  ): Promise<CreateOrdersResult | null> => {
    const { CreateOrdersResultSchema } = useBookingValidation()
    const data = this.defaultCreateOrdersRequest(orderData)

    const response = await context.request.put(ORDER_ENDPOINT, {
      headers,
      data
    })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 201) {
      const responseBody = await response.json()
      return CreateOrdersResultSchema.parse(responseBody)
    }

    return null
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

  static readonly updateOrder = async (
    context: BrowserContext,
    orderId: number,
    updateData: { dinnerMode: string },
    expectedStatus: number = 200
  ): Promise<OrderDetail | null> => {
    const response = await context.request.post(`${ORDER_ENDPOINT}/${orderId}`, {
      headers,
      data: updateData
    })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return null
  }

  static readonly deleteOrder = async (
    context: BrowserContext,
    orderId: number,
    expectedStatus: number = 200
  ): Promise<OrderDisplay | null> => {
    const response = await context.request.delete(`${ORDER_ENDPOINT}/${orderId}`, { headers })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return null
  }

  static readonly releaseOrder = async (
    context: BrowserContext,
    orderId: number,
    expectedStatus: number = 200
  ): Promise<OrderDisplay | null> => {
    const response = await context.request.post(`${ORDER_ENDPOINT}/${orderId}/release`, { headers })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

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
  ): Promise<OrderDisplay | null> => {
    const data = this.defaultSwapOrderRequest(swapData)

    const response = await context.request.post(`${ORDER_ENDPOINT}/${orderId}/swap-order`, {
      headers,
      data
    })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return null
  }

  static readonly claimOrder = async (
    context: BrowserContext,
    dinnerEventId: number,
    ticketPriceId: number,
    inhabitantId: number,
    isGuestTicket: boolean = false,
    expectedStatus: number = 200
  ): Promise<OrderDetail | null> => {
    const response = await context.request.post(`${ORDER_ENDPOINT}/claim`, {
      headers,
      data: { dinnerEventId, ticketPriceId, inhabitantId, isGuestTicket }
    })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return null
  }

  static readonly getOrderHistory = async (
    context: BrowserContext,
    orderId: number,
    expectedStatus: number = 200
  ): Promise<OrderHistoryDisplay[]> => {
    const response = await context.request.get(`${ORDER_ENDPOINT}/${orderId}/history`, { headers })

    const status = response.status()
    const errorBody = status !== expectedStatus ? await response.text() : ''
    expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

    if (expectedStatus === 200) {
      return await response.json()
    }

    return []
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
      householdId?: number
      allHouseholds?: boolean
      state?: string
      sortBy?: 'createdAt' | 'releasedAt'
    } = {},
    expectedStatus: number = 200
  ): Promise<OrderDisplay[]> => {
    const { OrderDisplaySchema } = useBookingValidation()
    const params = new URLSearchParams()

    if (options.dinnerEventIds !== undefined) {
      const ids = [options.dinnerEventIds].flat()
      ids.forEach(id => params.append('dinnerEventIds', String(id)))
    }
    if (options.householdId !== undefined) params.append('householdId', String(options.householdId))
    if (options.allHouseholds) params.append('allHouseholds', 'true')
    if (options.state) params.append('state', options.state)
    if (options.sortBy) params.append('sortBy', options.sortBy)

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
   * Get orders for dinner events via admin dinner event detail endpoint.
   * Use this in E2E tests that run as admin - the user-facing /api/order endpoint
   * filters by session user's household, which won't work for admin users.
   *
   * @param context - Browser context for API requests (admin auth)
   * @param dinnerEventIds - Single ID or array of dinner event IDs
   * @returns Array of OrderDetail for all events (from tickets field)
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
   */
  static readonly cleanupOrders = async (
    context: BrowserContext,
    orderIds: number[]
  ): Promise<void> => {
    if (orderIds.length === 0) return

    await Promise.all(orderIds.map(async (id) => {
      const response = await context.request.delete(`${ORDER_ENDPOINT}/${id}`)
      if (response.status() !== 200 && response.status() !== 404) {
        console.warn(`Failed to cleanup order ${id}: status ${response.status()}`)
      }
    }))
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

  /**
   * Scaffold orders via household endpoint (POST /api/household/order/scaffold)
   * ADR-016: Unified booking mutation - creates, updates, releases, and deletes orders
   *
   * @param context - Browser context for API requests
   * @param request - ScaffoldOrdersRequest with householdId, dinnerEventIds, orders
   * @param expectedStatus - Expected HTTP status (default 200)
   * @returns ScaffoldOrdersResponse with householdId and scaffoldResult
   */
  static readonly scaffoldOrders = async (
    context: BrowserContext,
    request: ScaffoldOrdersRequest,
    expectedStatus: number = 200
  ): Promise<ScaffoldOrdersResponse | null> => {
    const { ScaffoldOrdersResponseSchema } = useBookingValidation()

    const response = await context.request.post(HOUSEHOLD_SCAFFOLD_ENDPOINT, {
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
    dinnerMode: 'DINEIN' | 'TAKEAWAY' = 'DINEIN',
    orderId?: number
  ): DesiredOrder => this.defaultDesiredOrder({
    inhabitantId,
    dinnerEventId,
    ticketPriceId,
    dinnerMode: DinnerModeSchema.enum[dinnerMode],
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
    dinnerMode: 'DINEIN' | 'TAKEAWAY' = 'DINEIN',
    allergyTypeIds?: number[]
  ): DesiredOrder => this.defaultDesiredOrder({
    inhabitantId,
    dinnerEventId,
    ticketPriceId,
    dinnerMode: DinnerModeSchema.enum[dinnerMode],
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

    const ticketPriceId = season.ticketPrices?.find(tp => tp.ticketType === 'ADULT')?.id
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
}
