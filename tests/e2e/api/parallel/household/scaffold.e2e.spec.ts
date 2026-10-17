import { test, expect } from '@playwright/test'
import { OrderFactory } from '~~/tests/e2e/testDataFactories/orderFactory'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { DinnerEventFactory } from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import { WaitlistFactory } from '~~/tests/e2e/testDataFactories/waitlistFactory'
import { AllergyFactory } from '~~/tests/e2e/testDataFactories/allergyFactory'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import testHelpers from '~~/tests/e2e/testHelpers'
import type { TicketPrice } from '~/composables/useTicketPriceValidation'
import type { Season } from '~/composables/useSeasonValidation'
import type { ScaffoldOrdersRequest, DinnerMode as DinnerModeType } from '~/composables/useBookingValidation'
const Action = useBookingValidation().BookingActionSchema.enum

const { validatedBrowserContext, memberValidatedBrowserContext, temporaryAndRandom, salt, getSessionUserInfo, daysFromNow } = testHelpers
const { TicketTypeSchema, DinnerModeSchema, OrderStateSchema } = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const { createDefaultWeekdayMap } = useWeekDayMapValidation({ valueSchema: DinnerModeSchema, defaultValue: DinnerMode.NONE })

/**
 * E2E tests for POST /api/household/order/scaffold
 * ADR-016: Unified booking mutation endpoint
 *
 * Tests cover:
 * - Authorization (user must belong to household)
 * - Single event booking flow
 * - Multi-event grid booking
 * - Guest ticket creation
 * - After the deadline: claim a released ticket, else queue; leave and requeue an entry
 * - Error cases
 */
test.describe('Household Scaffold API (ADR-016)', () => {
  // Test data - created once, reused across tests
  let testSeason: Season
  let testHouseholdId: number
  let testInhabitantId: number
  let testAdultTicketPriceId: number
  let testChildTicketPriceId: number
  let testDinnerEventIds: number[]

  // Track resources for cleanup
  const createdSeasonIds: number[] = []
  const createdHouseholdIds: number[] = []
  const createdInhabitantIds: number[] = []
  const createdAllergyTypeIds: number[] = []

  test.beforeAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    const testSalt = temporaryAndRandom()

    // Get user's actual household from session
    const sessionInfo = await getSessionUserInfo(context)
    testHouseholdId = sessionInfo.householdId
    testInhabitantId = sessionInfo.inhabitantId

    // Create season with dinner events
    testSeason = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))
    createdSeasonIds.push(testSeason.id!)

    // Extract ticket prices
    const adultPrice = testSeason.ticketPrices?.find((tp: TicketPrice) => tp.ticketType === TicketTypeSchema.enum.ADULT)
    const childPrice = testSeason.ticketPrices?.find((tp: TicketPrice) => tp.ticketType === TicketTypeSchema.enum.CHILD)
    expect(adultPrice?.id, 'Season must have ADULT ticket price').toBeDefined()
    expect(childPrice?.id, 'Season must have CHILD ticket price').toBeDefined()
    testAdultTicketPriceId = adultPrice!.id!
    testChildTicketPriceId = childPrice!.id!

    // Get dinner event IDs (at least 2 for grid booking tests)
    testDinnerEventIds = testSeason.dinnerEvents?.slice(0, 3).map(e => e.id) ?? []
    expect(testDinnerEventIds.length, 'Season must have at least 2 dinner events').toBeGreaterThanOrEqual(2)
  })

  test.afterAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    // Cleanup in reverse order of creation
    for (const id of createdInhabitantIds) await HouseholdFactory.deleteInhabitant(context, id)
    await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
  })

  // ============================================================================
  // AUTHORIZATION TESTS
  // ============================================================================

  test.describe('Authorization', () => {
    test('GIVEN admin user WHEN scaffolding for different household THEN returns 403', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const testSalt = temporaryAndRandom()

      // Create another household
      const otherHousehold = await HouseholdFactory.createHousehold(context, { name: salt('OtherHouse', testSalt) })
      createdHouseholdIds.push(otherHousehold.id)
      const otherInhabitant = await HouseholdFactory.createInhabitantForHousehold(context, otherHousehold.id, salt('Other Person', testSalt))

      // Try to scaffold for other household - should fail
      await OrderFactory.scaffoldOrders(context, {
        householdId: otherHousehold.id,
        seasonId: testSeason.id!,
        dinnerEventIds: [testDinnerEventIds[0]!],
        orders: [OrderFactory.createBookingOrder(otherInhabitant.id, testDinnerEventIds[0]!, testAdultTicketPriceId)]
      }, 403)
    })

    test('GIVEN member user WHEN scaffolding for own household THEN succeeds', async ({ browser }) => {
      const memberContext = await memberValidatedBrowserContext(browser)
      const { householdId, inhabitantId } = await getSessionUserInfo(memberContext)

      const result = await OrderFactory.scaffoldOrders(memberContext, {
        householdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [testDinnerEventIds[0]!],
        orders: [OrderFactory.createBookingOrder(inhabitantId, testDinnerEventIds[0]!, testAdultTicketPriceId)]
      })

      expect(result).not.toBeNull()
      expect(result!.householdId).toBe(householdId)
    })
  })

  // ============================================================================
  // BOOKING FLOW TESTS (parametrized)
  // Events BEFORE deadline (>8 days) so scaffold can CREATE
  // ============================================================================

  test.describe('Booking Flows', () => {
    test('GIVEN single inhabitant WHEN booking THEN order created', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // Event 15 days from now = BEFORE 8-day deadline = scaffold can create
      const event = await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!,
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        menuTitle: salt('Test Booking', temporaryAndRandom())
      })

      const result = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [event.id],
        orders: [OrderFactory.createBookingOrder(testInhabitantId, event.id, testAdultTicketPriceId, DinnerMode.DINEIN)]
      })

      expect(result).not.toBeNull()
      expect(result!.householdId).toBe(testHouseholdId)
      expect(result!.scaffoldResult.totals[Action.BOOK]).toBeGreaterThanOrEqual(1)

      // Verify order exists with correct mode
      const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, event.id)
      const myOrder = orders.find(o => o.inhabitantId === testInhabitantId && o.dinnerMode === DinnerMode.DINEIN)
      expect(myOrder, 'Order with DINEIN should exist').toBeDefined()
    })

    test('GIVEN multiple dinner events WHEN grid booking THEN orders created for all events', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // Events 15+ days from now = BEFORE deadline
      const event1 = await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!,
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        menuTitle: salt('Test Grid1', temporaryAndRandom())
      })
      const event2 = await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!,
        date: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        menuTitle: salt('Test Grid2', temporaryAndRandom())
      })
      const eventIds = [event1.id, event2.id]

      const orders = eventIds.map(eventId =>
        OrderFactory.createBookingOrder(testInhabitantId, eventId, testAdultTicketPriceId)
      )

      const result = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: eventIds,
        orders
      })

      expect(result).not.toBeNull()
      expect(result!.scaffoldResult.totals[Action.BOOK]).toBeGreaterThanOrEqual(2)
    })

    test('GIVEN guest ticket WHEN scaffolding THEN guest order created with isGuestTicket=true', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // Event 15 days from now = BEFORE deadline
      const event = await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!,
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        menuTitle: salt('Test Guest', temporaryAndRandom())
      })

      const result = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [event.id],
        orders: [OrderFactory.createGuestOrder(testInhabitantId, event.id, testChildTicketPriceId)]
      })

      expect(result).not.toBeNull()
      expect(result!.scaffoldResult.totals[Action.BOOK]).toBeGreaterThanOrEqual(1)

      // Verify guest order exists
      const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, event.id)
      const guestOrder = orders.find(o =>
        o.inhabitantId === testInhabitantId &&
        o.isGuestTicket === true &&
        o.ticketType === TicketTypeSchema.enum.CHILD
      )
      expect(guestOrder, 'Guest order should exist').toBeDefined()
    })
  })

  // ============================================================================
  // ORDER UPDATE TESTS
  // ============================================================================

  /**
   * RELEASED TICKET TEST STRATEGY
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Deadline constraint:
   * - CREATE via scaffold: events BEFORE deadline (>8 days away)
   * - RELEASE (not delete): events AFTER deadline (<8 days away)
   *
   * Two distinct codepaths when reclaiming released tickets:
   *
   * 1. UPDATE BUCKET (reclaim own released ticket)
   *    ─────────────────────────────────────────────────────────────────────────
   *    • Inhabitant A releases their ticket (state=RELEASED)
   *    • Same inhabitant scaffolds booking WITH orderId
   *    • Generator routes to 'update' bucket → restores ticket to BOOKED
   *    • Same order, same inhabitant, state RELEASED→BOOKED
   *
   * 2. CLAIM BUCKET (claim from marketplace)
   *    ─────────────────────────────────────────────────────────────────────────
   *    • Inhabitant A releases ticket (state=RELEASED, goes to marketplace)
   *    • Inhabitant B scaffolds NEW booking WITHOUT orderId
   *    • Generator routes to 'claim' bucket → claimOrder() seizes from marketplace
   *    • Ticket transfers from A to B (same household in tests due to auth)
   *    • No ticket for sale, or the race lost: the wish joins the dinner's queue (Waiting list below)
   *
   * Key distinction: orderId present → UPDATE, orderId absent → CLAIM
   *
   * Test setup: Use OrderFactory.createOrder for initial orders (bypasses
   * deadline), isolated events 3 days away (after deadline) for release/claim.
   */
  test.describe('Order Updates', () => {
    test('GIVEN existing order WHEN updating mode via scaffold THEN mode updated', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // Event 15 days from now = BEFORE deadline (can edit mode)
      const event = await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!,
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        menuTitle: salt('Test ModeUpdate', temporaryAndRandom())
      })

      // Create order via direct API
      const createResult = await OrderFactory.createOrder(context, {
        householdId: testHouseholdId,
        dinnerEventId: event.id,
        orders: [OrderFactory.defaultOrderItem({
          inhabitantId: testInhabitantId,
          ticketPriceId: testAdultTicketPriceId,
          dinnerMode: DinnerModeSchema.enum.DINEIN
        })]
      })
      expect(createResult).not.toBeNull()
      const orderId = createResult!.createdIds[0]!

      // Update to TAKEAWAY via scaffold
      const result = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [event.id],
        orders: [OrderFactory.createBookingOrder(testInhabitantId, event.id, testAdultTicketPriceId, DinnerMode.TAKEAWAY, orderId)]
      })

      expect(result).not.toBeNull()
      expect(result!.scaffoldResult.totals[Action.CHANGE_MODE]).toBeGreaterThanOrEqual(1)

      // Verify mode changed
      const orderAfter = await OrderFactory.getOrder(context, orderId)
      expect(orderAfter?.dinnerMode).toBe(DinnerModeSchema.enum.TAKEAWAY)
    })

    test('GIVEN an admin booking its own household with adminBypass=false WHEN releasing past the cancellation deadline THEN order released', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // Event 3 days from now = AFTER deadline (release not delete)
      const event = await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        menuTitle: salt('Test Release', temporaryAndRandom())
      })

      // Create order via direct API
      const createResult = await OrderFactory.createOrder(context, {
        householdId: testHouseholdId,
        dinnerEventId: event.id,
        orders: [OrderFactory.defaultOrderItem({
          inhabitantId: testInhabitantId,
          ticketPriceId: testAdultTicketPriceId
        })]
      })
      expect(createResult).not.toBeNull()
      const orderId = createResult!.createdIds[0]!

      // Release via scaffold (dinnerMode: NONE after deadline → RELEASED); an explicit false keeps the deadlines
      const result = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [event.id],
        orders: [OrderFactory.createReleaseOrder(testInhabitantId, event.id, testAdultTicketPriceId, orderId)]
      }, 200, false)

      expect(result).not.toBeNull()
      expect(result!.scaffoldResult.totals[Action.RELEASE]).toBeGreaterThanOrEqual(1)

      // Verify order released (not deleted)
      const orderAfter = await OrderFactory.getOrder(context, orderId)
      expect(orderAfter?.state).toBe(OrderStateSchema.enum.RELEASED)
      expect(orderAfter?.dinnerMode).toBe(DinnerModeSchema.enum.NONE)
    })

    // -------------------------------------------------------------------------
    // UPDATE BUCKET: Reclaim own released ticket (same household, WITH orderId)
    // -------------------------------------------------------------------------
    test('GIVEN own released ticket WHEN scaffolding WITH orderId THEN reclaims via UPDATE bucket', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // Create isolated dinner event (3 days from now = after deadline)
      const isolatedEvent = await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        menuTitle: salt('ReclaimOwnTest', temporaryAndRandom())
      })

      // 1. Create an order
      const createResult = await OrderFactory.createOrder(context, {
        householdId: testHouseholdId,
        dinnerEventId: isolatedEvent.id,
        orders: [OrderFactory.defaultOrderItem({
          inhabitantId: testInhabitantId,
          ticketPriceId: testAdultTicketPriceId
        })]
      })
      expect(createResult, 'Order creation should succeed').not.toBeNull()
      const orderId = createResult!.createdIds[0]!

      // 2. Release the order (state → RELEASED)
      const releasedOrder = await OrderFactory.updateOrder(context, orderId, {
        dinnerMode: DinnerModeSchema.enum.NONE
      })
      expect(releasedOrder?.state, 'Order should be RELEASED').toBe(OrderStateSchema.enum.RELEASED)

      // 3. Reclaim by scaffolding WITH orderId (same inhabitant)
      // Key: orderId present + RELEASED state → routes to UPDATE bucket
      const reclaimResult = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [isolatedEvent.id],
        orders: [OrderFactory.createBookingOrder(testInhabitantId, isolatedEvent.id, testAdultTicketPriceId, DinnerMode.DINEIN, orderId)]
      })

      expect(reclaimResult).not.toBeNull()
      // Should NOT claim (that's different bucket) - should update existing order
      expect(reclaimResult!.scaffoldResult.totals[Action.BUY], 'Should NOT use claim bucket').toBe(0)

      // 4. Verify order restored to BOOKED (same order ID)
      const orderAfter = await OrderFactory.getOrder(context, orderId)
      expect(orderAfter?.state, 'Order should be BOOKED again').toBe(OrderStateSchema.enum.BOOKED)
      expect(orderAfter?.inhabitantId, 'Same inhabitant').toBe(testInhabitantId)
      expect(orderAfter?.dinnerMode, 'Mode restored to DINEIN').toBe(DinnerModeSchema.enum.DINEIN)
    })

    // -------------------------------------------------------------------------
    // CLAIM BUCKET: Claim released ticket from marketplace (NO orderId in request)
    // -------------------------------------------------------------------------
    test('GIVEN released ticket WHEN scaffolding WITHOUT orderId THEN claims via CLAIM bucket', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // Create isolated dinner event (3 days from now = after deadline)
      const isolatedEvent = await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        menuTitle: salt('Test ClaimBucket', temporaryAndRandom())
      })

      // Create second inhabitant in same household for the claim target
      const claimingInhabitant = await HouseholdFactory.createInhabitantForHousehold(
        context,
        testHouseholdId,
        salt('Test ClaimTarget', temporaryAndRandom())
      )
      createdInhabitantIds.push(claimingInhabitant.id)

      // Create order for testInhabitantId (will be released)
      const createResult = await OrderFactory.createOrder(context, {
        householdId: testHouseholdId,
        dinnerEventId: isolatedEvent.id,
        orders: [OrderFactory.defaultOrderItem({
          inhabitantId: testInhabitantId,
          ticketPriceId: testAdultTicketPriceId
        })]
      })
      expect(createResult).not.toBeNull()
      const releasedOrderId = createResult!.createdIds[0]!

      // Release the order (state → RELEASED, goes to marketplace)
      const releasedOrder = await OrderFactory.updateOrder(context, releasedOrderId, {
        dinnerMode: DinnerModeSchema.enum.NONE
      })
      expect(releasedOrder?.state).toBe(OrderStateSchema.enum.RELEASED)

      // Different inhabitant claims the released ticket WITHOUT orderId
      // Key distinction from UPDATE bucket: no orderId + released tickets exist → CLAIM bucket
      const claimResult = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [isolatedEvent.id],
        orders: [OrderFactory.createBookingOrder(claimingInhabitant.id, isolatedEvent.id, testAdultTicketPriceId)]
      })

      expect(claimResult).not.toBeNull()
      expect(claimResult!.scaffoldResult.totals[Action.BUY], 'Should claim via CLAIM bucket').toBeGreaterThanOrEqual(1)
      expect(claimResult!.scaffoldResult.totals[Action.BOOK], 'Should NOT create new order').toBe(0)
      expect(claimResult!.scaffoldResult.totals[Action.QUEUE], 'A ticket for sale is bought, never queued for').toBe(0)

      // Verify ticket transferred to claiming inhabitant
      const orderAfterClaim = await OrderFactory.getOrder(context, releasedOrderId)
      expect(orderAfterClaim?.state).toBe(OrderStateSchema.enum.BOOKED)
      expect(orderAfterClaim?.inhabitantId, 'Ticket should transfer to claiming inhabitant').toBe(claimingInhabitant.id)
      expect(orderAfterClaim?.ticketType, 'Should be ADULT price').toBe(TicketTypeSchema.enum.ADULT)
    })
  })

  // ============================================================================
  // WAITING LIST: a claim with no ticket for sale queues; NONE leaves, a new wish requeues
  // ============================================================================

  test.describe('Waiting list', () => {
    // Two days ahead: past the booking deadline, each test on its own dinner so no ticket is for sale
    const closedDinner = async (context: Parameters<typeof DinnerEventFactory.createDinnerEvent>[0], title: string) =>
      (await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!,
        date: daysFromNow(2),
        menuTitle: salt(title, temporaryAndRandom())
      })).id
    const queuedInhabitant = async (context: Parameters<typeof HouseholdFactory.createInhabitantForHousehold>[0], name: string) => {
      const inhabitant = await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, salt(name, temporaryAndRandom()))
      createdInhabitantIds.push(inhabitant.id)
      return inhabitant.id
    }
    const queue = (context: Parameters<typeof WaitlistFactory.queue>[0], householdId: number, inhabitantId: number, dinnerEventId: number, ticketPriceId = testAdultTicketPriceId) =>
      WaitlistFactory.queue(context, householdId, testSeason.id!, OrderFactory.createBookingOrder(inhabitantId, dinnerEventId, ticketPriceId))

    test('GIVEN a closed dinner without a ticket for sale WHEN two members of two households wish to eat THEN they queue at places 1 and 2 at the frozen price', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const memberContext = await memberValidatedBrowserContext(browser)
      const dinnerEventId = await closedDinner(context, 'Queue order')
      const inhabitantId = await queuedInhabitant(context, 'Queue first')
      const member = await getSessionUserInfo(memberContext)

      const first = await queue(context, testHouseholdId, inhabitantId, dinnerEventId)
      const second = await queue(memberContext, member.householdId, member.inhabitantId, dinnerEventId)

      expect(first).toMatchObject({ totals: { [Action.BOOK]: 0, [Action.BUY]: 0, [Action.QUEUE]: 1 }, positions: [{ inhabitantId, dinnerEventId, isGuestTicket: false, position: 1, ticketType: TicketTypeSchema.enum.ADULT }] })
      expect(second).toMatchObject({ totals: { [Action.QUEUE]: 1 }, positions: [{ inhabitantId: member.inhabitantId, position: 2 }] })
      const entries = await WaitlistFactory.entries(context, [dinnerEventId])
      expect(entries.map(entry => [entry.inhabitantId, entry.order.householdId, entry.order.priceAtBooking])).toEqual([
        [inhabitantId, testHouseholdId, testSeason.ticketPrices.find(price => price.id === testAdultTicketPriceId)!.price],
        [member.inhabitantId, member.householdId, testSeason.ticketPrices.find(price => price.id === testAdultTicketPriceId)!.price]
      ])
    })

    test('GIVEN a closed dinner WHEN a guest wish is sent THEN the entry holds the guest flag, the price and the allergies', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const dinnerEventId = await closedDinner(context, 'Queue guest')
      const allergyType = await AllergyFactory.createAllergyType(context)
      createdAllergyTypeIds.push(allergyType.id)

      const result = await WaitlistFactory.queue(context, testHouseholdId, testSeason.id!,
        OrderFactory.createGuestOrder(testInhabitantId, dinnerEventId, testChildTicketPriceId, DinnerMode.TAKEAWAY, [allergyType.id]))

      expect(result).toMatchObject({ totals: { [Action.QUEUE]: 1 }, positions: [{ inhabitantId: testInhabitantId, isGuestTicket: true, position: 1, ticketType: TicketTypeSchema.enum.CHILD }] })
      const [entry] = await WaitlistFactory.entries(context, [dinnerEventId])
      expect(entry).toMatchObject({
        isGuestTicket: true,
        order: { ticketPriceId: testChildTicketPriceId, dinnerMode: DinnerMode.TAKEAWAY, allergyTypeIds: [allergyType.id] }
      })
    })

    test('GIVEN a queued guest entry WHEN NONE is sent on that entry THEN the guest leaves the queue', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const dinnerEventId = await closedDinner(context, 'Queue guest leave')
      await WaitlistFactory.queue(context, testHouseholdId, testSeason.id!,
        OrderFactory.createGuestOrder(testInhabitantId, dinnerEventId, testAdultTicketPriceId))
      const [guestEntry] = await WaitlistFactory.entries(context, [dinnerEventId])
      expect(guestEntry!.isGuestTicket).toBe(true)

      const result = await WaitlistFactory.leave(context, testSeason.id!, guestEntry!)

      expect(result).toMatchObject({ totals: { [Action.LEAVE]: 1, [Action.QUEUE]: 0 } })
      expect(await WaitlistFactory.entries(context, [dinnerEventId])).toEqual([])
    })

    test('GIVEN two entries WHEN the first sends NONE on its entry THEN it leaves and the second is first in line', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const dinnerEventId = await closedDinner(context, 'Queue leave')
      const firstId = await queuedInhabitant(context, 'Queue leaver')
      const secondId = await queuedInhabitant(context, 'Queue stayer')
      await queue(context, testHouseholdId, firstId, dinnerEventId)
      await queue(context, testHouseholdId, secondId, dinnerEventId)
      const [firstEntry] = await WaitlistFactory.entries(context, [dinnerEventId])

      const result = await WaitlistFactory.leave(context, testSeason.id!, firstEntry!)

      expect(result).toMatchObject({ totals: { [Action.LEAVE]: 1, [Action.QUEUE]: 0, [Action.BUY]: 0 } })
      const entries = await WaitlistFactory.entries(context, [dinnerEventId])
      expect(entries.map(entry => entry.inhabitantId)).toEqual([secondId])
    })

    test('GIVEN two entries WHEN the first changes its wish THEN it requeues and keeps its place', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const dinnerEventId = await closedDinner(context, 'Queue requeue')
      const firstId = await queuedInhabitant(context, 'Queue changer')
      const secondId = await queuedInhabitant(context, 'Queue behind')
      await queue(context, testHouseholdId, firstId, dinnerEventId)
      await queue(context, testHouseholdId, secondId, dinnerEventId)
      const [firstEntry] = await WaitlistFactory.entries(context, [dinnerEventId])

      const result = await WaitlistFactory.queue(context, testHouseholdId, testSeason.id!,
        WaitlistFactory.wishOf(firstEntry!, { ticketPriceId: testChildTicketPriceId }))

      expect(result).toMatchObject({ totals: { [Action.REQUEUE]: 1, [Action.QUEUE]: 0, [Action.LEAVE]: 0 } })
      const entries = await WaitlistFactory.entries(context, [dinnerEventId])
      expect(entries.map(entry => [entry.id, entry.order.ticketPriceId])).toEqual([
        [firstEntry!.id, testChildTicketPriceId],
        [entries[1]!.id, testAdultTicketPriceId]
      ])
      expect(entries[1]!.inhabitantId).toBe(secondId)
    })

    test('GIVEN an inhabitant in the queue WHEN the same wish is sent again THEN nothing changes and the queue holds one entry', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const dinnerEventId = await closedDinner(context, 'Queue twice')
      const inhabitantId = await queuedInhabitant(context, 'Queue twice')
      await queue(context, testHouseholdId, inhabitantId, dinnerEventId)

      const again = await queue(context, testHouseholdId, inhabitantId, dinnerEventId)

      expect(again).toMatchObject({ totals: { [Action.QUEUE]: 0, [Action.BUY]: 0 }, unchanged: 1 })
      expect(await WaitlistFactory.entries(context, [dinnerEventId])).toHaveLength(1)
    })

    test('GIVEN a household eating every day by preference WHEN its preferences re-scaffold a closed dinner THEN nothing queues', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const dinnerEventId = await closedDinner(context, 'Queue system mode')
      const { household, inhabitants } = await HouseholdFactory.createHouseholdWithInhabitants(context, { address: salt('Systemvej 1', temporaryAndRandom()) }, 1)
      createdHouseholdIds.push(household.id)

      const updated = await HouseholdFactory.updateInhabitant(context, inhabitants[0]!.id, {
        dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
      }, 200, testSeason.id!)

      expect(updated?.scaffoldResult).toMatchObject({ totals: { [Action.QUEUE]: 0, [Action.BUY]: 0 } })
      expect(await WaitlistFactory.entries(context, [dinnerEventId])).toEqual([])
    })
  })

  // ============================================================================
  // ADMIN CORRECTION: ?adminBypass=true from an admin lifts the deadlines for that request
  // ============================================================================

  test.describe('Admin correction', () => {
    // A household the admin does not belong to, with one booked order on a dinner the given days ahead
    const bookedOrder = async (context: Parameters<typeof OrderFactory.createOrder>[0], daysAhead: number, title: string) => {
      const dinner = await DinnerEventFactory.createDinnerEvent(context, {
        seasonId: testSeason.id!, date: daysFromNow(daysAhead), menuTitle: salt(title, temporaryAndRandom())
      })
      const { household, inhabitants } = await HouseholdFactory.createHouseholdWithInhabitants(context, { address: salt('Rettevej 1', temporaryAndRandom()), movedInDate: daysFromNow(-30) }, 1)
      createdHouseholdIds.push(household.id)
      const created = await OrderFactory.createOrder(context, {
        householdId: household.id, dinnerEventId: dinner.id,
        orders: [OrderFactory.defaultOrderItem({ inhabitantId: inhabitants[0]!.id, ticketPriceId: testAdultTicketPriceId })]
      })
      return { householdId: household.id, inhabitantId: inhabitants[0]!.id, dinnerEventId: dinner.id, orderId: created!.createdIds[0]! }
    }
    const correct = (context: Parameters<typeof OrderFactory.scaffoldOrders>[0], booked: Awaited<ReturnType<typeof bookedOrder>>, dinnerMode: DinnerModeType) =>
      OrderFactory.scaffoldOrders(context, {
        householdId: booked.householdId, seasonId: testSeason.id!, dinnerEventIds: [booked.dinnerEventId],
        orders: [OrderFactory.createBookingOrder(booked.inhabitantId, booked.dinnerEventId, testAdultTicketPriceId, dinnerMode, booked.orderId)]
      }, 200, true)

    test('GIVEN a booked order past the cancellation deadline WHEN an admin corrects it to NONE THEN the order is deleted', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const booked = await bookedOrder(context, 3, 'Correction delete')

      const result = await correct(context, booked, DinnerMode.NONE)

      expect(result!.scaffoldResult).toMatchObject({ totals: { [Action.CANCEL]: 1, [Action.RELEASE]: 0 } })
      await OrderFactory.getOrder(context, booked.orderId, 404)
    })

    test('GIVEN a booked order past the dining mode deadline WHEN an admin corrects the mode THEN the mode changes', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const booked = await bookedOrder(context, -1, 'Correction mode')

      const result = await correct(context, booked, DinnerMode.TAKEAWAY)

      expect(result!.scaffoldResult.totals[Action.CHANGE_MODE]).toBe(1)
      expect((await OrderFactory.getOrder(context, booked.orderId))!.dinnerMode).toBe(DinnerMode.TAKEAWAY)
    })

    test('GIVEN a member WHEN sending a correction with adminBypass for another household THEN 403', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const memberContext = await memberValidatedBrowserContext(browser)
      const booked = await bookedOrder(context, 3, 'Correction refused')

      await OrderFactory.scaffoldOrders(memberContext, {
        householdId: booked.householdId, seasonId: testSeason.id!, dinnerEventIds: [booked.dinnerEventId],
        orders: [OrderFactory.createBookingOrder(booked.inhabitantId, booked.dinnerEventId, testAdultTicketPriceId, DinnerMode.NONE, booked.orderId)]
      }, 403, true)

      expect((await OrderFactory.getOrder(context, booked.orderId))!.state).toBe(OrderStateSchema.enum.BOOKED)
    })
  })

  // ============================================================================
  // ERROR CASES (parametrized)
  // ============================================================================

  test.describe('Error Cases', () => {
    type InvalidScaffoldRequest = { name: string; request: Partial<ScaffoldOrdersRequest> & Record<string, unknown>; expectedStatus: number }

    const errorCases: InvalidScaffoldRequest[] = [
      {
        name: 'missing householdId',
        request: { dinnerEventIds: [1], orders: [] },
        expectedStatus: 400
      },
      {
        name: 'missing dinnerEventIds',
        request: { householdId: 1, orders: [] },
        expectedStatus: 400
      },
      {
        name: 'empty dinnerEventIds array',
        request: { householdId: 1, dinnerEventIds: [], orders: [] },
        expectedStatus: 400
      },
      {
        name: 'invalid householdId type',
        request: { householdId: 'invalid' as unknown as number, dinnerEventIds: [1], orders: [] },
        expectedStatus: 400
      }
    ]

    for (const { name, request, expectedStatus } of errorCases) {
      test(`GIVEN ${name} WHEN scaffolding THEN returns ${expectedStatus}`, async ({ browser }) => {
        const context = await validatedBrowserContext(browser)
        await OrderFactory.scaffoldOrders(context, request as ScaffoldOrdersRequest, expectedStatus)
      })
    }

    test('GIVEN non-existent householdId WHEN scaffolding THEN returns 403', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // Use a valid but non-existent household ID (user doesn't belong to it)
      await OrderFactory.scaffoldOrders(context, {
        householdId: 999999,
        dinnerEventIds: [testDinnerEventIds[0]!],
        orders: []
      }, 403)
    })
  })
})
