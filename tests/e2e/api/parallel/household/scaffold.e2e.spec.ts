import { test, expect } from '@playwright/test'
import { OrderFactory } from '~~/tests/e2e/testDataFactories/orderFactory'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { DinnerEventFactory } from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import testHelpers from '~~/tests/e2e/testHelpers'
import type { TicketPrice } from '~/composables/useTicketPriceValidation'
import type { Season } from '~/composables/useSeasonValidation'
import type { ScaffoldOrdersRequest } from '~/composables/useBookingValidation'

const { validatedBrowserContext, memberValidatedBrowserContext, temporaryAndRandom, salt, getSessionUserInfo } = testHelpers
const { TicketTypeSchema, DinnerModeSchema, OrderStateSchema } = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const { createDefaultWeekdayMap: _createDefaultWeekdayMap } = useWeekDayMapValidation({ valueSchema: DinnerModeSchema, defaultValue: DinnerMode.NONE })

/**
 * E2E tests for POST /api/household/order/scaffold
 * ADR-016: Unified booking mutation endpoint
 *
 * Tests cover:
 * - Authorization (user must belong to household)
 * - Single event booking flow
 * - Multi-event grid booking
 * - Guest ticket creation
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
    for (const id of createdInhabitantIds) {
      await HouseholdFactory.deleteInhabitant(context, id).catch(() => {})
    }
    for (const id of createdHouseholdIds) {
      await HouseholdFactory.deleteHousehold(context, id).catch(() => {})
    }
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
  })

  // ============================================================================
  // AUTHORIZATION TESTS
  // ============================================================================

  test.describe('Authorization', () => {
    test('GIVEN admin user WHEN scaffolding for own household THEN succeeds', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      const result = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [testDinnerEventIds[0]!],
        orders: [OrderFactory.createBookingOrder(testInhabitantId, testDinnerEventIds[0]!, testAdultTicketPriceId)]
      })

      expect(result).not.toBeNull()
      expect(result!.householdId).toBe(testHouseholdId)
      expect(result!.scaffoldResult.created).toBeGreaterThanOrEqual(0)
    })

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
  // ============================================================================

  test.describe('Booking Flows', () => {
    const bookingModes = [
      { mode: 'DINEIN' as const, description: 'DINEIN mode' },
      { mode: 'TAKEAWAY' as const, description: 'TAKEAWAY mode' }
    ]

    for (const { mode, description } of bookingModes) {
      test(`GIVEN single inhabitant WHEN booking with ${description} THEN order created`, async ({ browser }) => {
        const context = await validatedBrowserContext(browser)

        const result = await OrderFactory.scaffoldOrders(context, {
          householdId: testHouseholdId,
          seasonId: testSeason.id!,
          dinnerEventIds: [testDinnerEventIds[0]!],
          orders: [OrderFactory.createBookingOrder(testInhabitantId, testDinnerEventIds[0]!, testAdultTicketPriceId, mode)]
        })

        expect(result).not.toBeNull()
        expect(result!.scaffoldResult.created + result!.scaffoldResult.unchanged).toBeGreaterThanOrEqual(1)

        // Verify order exists with correct mode
        const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, testDinnerEventIds[0]!)
        const myOrder = orders.find(o => o.inhabitantId === testInhabitantId && o.dinnerMode === DinnerModeSchema.enum[mode])
        expect(myOrder, `Order with ${mode} should exist`).toBeDefined()
      })
    }

    test('GIVEN multiple dinner events WHEN grid booking THEN orders created for all events', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)
      const eventIds = testDinnerEventIds.slice(0, 2)

      // Create orders for 2 events
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
      // Should have created/unchanged orders for both events
      expect(result!.scaffoldResult.created + result!.scaffoldResult.unchanged).toBeGreaterThanOrEqual(2)
    })

    test('GIVEN guest ticket WHEN scaffolding THEN guest order created with isGuestTicket=true', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      const result = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [testDinnerEventIds[0]!],
        orders: [OrderFactory.createGuestOrder(testInhabitantId, testDinnerEventIds[0]!, testChildTicketPriceId)]
      })

      expect(result).not.toBeNull()

      // Verify guest order exists
      const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, testDinnerEventIds[0]!)
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
   * Two distinct codepaths when booking after deadline with released tickets:
   *
   * 1. CLAIM BUCKET (true claim from marketplace)
   *    ─────────────────────────────────────────────────────────────────────────
   *    • Different household (C) releases ticket via admin updateInhabitant(NONE)
   *    • Member's household scaffolds NEW booking with NO orderId
   *    • Generator routes to 'claim' bucket → claimOrder() seizes from marketplace
   *    • Ticket transfers ownership from Household C to Member's household
   *
   * 2. UPDATE BUCKET (reclaim own released ticket)
   *    ─────────────────────────────────────────────────────────────────────────
   *    • Member's inhabitant releases their own ticket (state=RELEASED)
   *    • Member scaffolds booking WITH orderId for same inhabitant
   *    • Generator routes to 'update' bucket → restores own ticket to BOOKED
   *    • Same order, same inhabitant, state changes RELEASED→BOOKED
   *
   * Key distinction: orderId present → UPDATE (reclaim), orderId absent → CLAIM
   */
  test.describe('Order Updates', () => {
    test('GIVEN existing order WHEN updating mode via scaffold THEN mode updated', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // First create an order
      await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [testDinnerEventIds[1]!],
        orders: [OrderFactory.createBookingOrder(testInhabitantId, testDinnerEventIds[1]!, testAdultTicketPriceId, 'DINEIN')]
      })

      // Get the order ID
      const ordersBefore = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, testDinnerEventIds[1]!)
      const existingOrder = ordersBefore.find(o => o.inhabitantId === testInhabitantId && !o.isGuestTicket)
      expect(existingOrder, 'Existing order should exist').toBeDefined()

      // Update to TAKEAWAY using orderId
      const result = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [testDinnerEventIds[1]!],
        orders: [OrderFactory.createBookingOrder(testInhabitantId, testDinnerEventIds[1]!, testAdultTicketPriceId, 'TAKEAWAY', existingOrder!.id)]
      })

      expect(result).not.toBeNull()
      expect(result!.scaffoldResult.modeUpdated + result!.scaffoldResult.unchanged).toBeGreaterThanOrEqual(1)

      // Verify mode changed
      const ordersAfter = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, testDinnerEventIds[1]!)
      const updatedOrder = ordersAfter.find(o => o.id === existingOrder!.id)
      expect(updatedOrder?.dinnerMode).toBe(DinnerModeSchema.enum.TAKEAWAY)
    })

    test('GIVEN existing order WHEN releasing via scaffold THEN order released', async ({ browser }) => {
      const context = await validatedBrowserContext(browser)

      // First create an order
      await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [testDinnerEventIds[2]!],
        orders: [OrderFactory.createBookingOrder(testInhabitantId, testDinnerEventIds[2]!, testAdultTicketPriceId)]
      })

      // Get the order ID
      const ordersBefore = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, testDinnerEventIds[2]!)
      const existingOrder = ordersBefore.find(o => o.inhabitantId === testInhabitantId && !o.isGuestTicket)
      expect(existingOrder, 'Existing order should exist').toBeDefined()

      // Release the order
      const result = await OrderFactory.scaffoldOrders(context, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [testDinnerEventIds[2]!],
        orders: [OrderFactory.createReleaseOrder(testInhabitantId, testDinnerEventIds[2]!, testAdultTicketPriceId, existingOrder!.id)]
      })

      expect(result).not.toBeNull()
      expect(result!.scaffoldResult.released + result!.scaffoldResult.deleted).toBeGreaterThanOrEqual(0)

      // Verify order state changed (either RELEASED or deleted depending on deadline)
      const ordersAfter = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, testDinnerEventIds[2]!)
      const releasedOrder = ordersAfter.find(o => o.id === existingOrder!.id)
      // Order may be deleted (before deadline) or released (after deadline)
      if (releasedOrder) {
        expect(releasedOrder.state).toBe(OrderStateSchema.enum.RELEASED)
        expect(releasedOrder.dinnerMode).toBe(DinnerModeSchema.enum.NONE)
      }
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
        orders: [OrderFactory.createBookingOrder(testInhabitantId, isolatedEvent.id, testAdultTicketPriceId, 'DINEIN', orderId)]
      })

      expect(reclaimResult).not.toBeNull()
      // Should NOT claim (that's different bucket) - should update existing order
      expect(reclaimResult!.scaffoldResult.claimed, 'Should NOT use claim bucket').toBe(0)

      // 4. Verify order restored to BOOKED (same order ID)
      const orderAfter = await OrderFactory.getOrder(context, orderId)
      expect(orderAfter?.state, 'Order should be BOOKED again').toBe(OrderStateSchema.enum.BOOKED)
      expect(orderAfter?.inhabitantId, 'Same inhabitant').toBe(testInhabitantId)
      expect(orderAfter?.dinnerMode, 'Mode restored to DINEIN').toBe(DinnerModeSchema.enum.DINEIN)
    })

    // -------------------------------------------------------------------------
    // CLAIM BUCKET: True claim from marketplace (different household, NO orderId)
    // -------------------------------------------------------------------------
    test('GIVEN different household released ticket WHEN scaffolding WITHOUT orderId THEN claims via CLAIM bucket', async ({ browser }) => {
      const adminContext = await validatedBrowserContext(browser)

      // Create isolated dinner event (3 days from now = after deadline for claiming scenario)
      const isolatedEvent = await DinnerEventFactory.createDinnerEvent(adminContext, {
        seasonId: testSeason.id!,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        menuTitle: salt('TrueClaimTest', temporaryAndRandom())
      })

      // Create a DIFFERENT household (Household C) with an inhabitant
      // Names use 'Test' prefix for d1-nuke discoverability
      const otherHousehold = await HouseholdFactory.createHousehold(adminContext, {
        name: salt('Test ClaimSource', temporaryAndRandom())
      })
      createdHouseholdIds.push(otherHousehold.id)

      const otherInhabitant = await HouseholdFactory.createInhabitantForHousehold(
        adminContext,
        otherHousehold.id,
        salt('Test ClaimPerson', temporaryAndRandom())
      )
      createdInhabitantIds.push(otherInhabitant.id)

      // Create order for Household C using admin order endpoint
      const createResult = await OrderFactory.createOrder(adminContext, {
        householdId: otherHousehold.id,
        dinnerEventId: isolatedEvent.id,
        orders: [OrderFactory.defaultOrderItem({
          inhabitantId: otherInhabitant.id,
          ticketPriceId: testAdultTicketPriceId
        })]
      })
      expect(createResult, 'Order creation for other household should succeed').not.toBeNull()
      const otherOrderId = createResult!.createdIds[0]!

      // Release the order (state → RELEASED)
      const releasedOrder = await OrderFactory.updateOrder(adminContext, otherOrderId, {
        dinnerMode: DinnerModeSchema.enum.NONE
      })
      expect(releasedOrder?.state, 'Order should be RELEASED').toBe(OrderStateSchema.enum.RELEASED)

      // Admin's household claims the released ticket WITHOUT orderId
      // Key: no orderId + released tickets exist → routes to CLAIM bucket
      const claimResult = await OrderFactory.scaffoldOrders(adminContext, {
        householdId: testHouseholdId,
        seasonId: testSeason.id!,
        dinnerEventIds: [isolatedEvent.id],
        orders: [OrderFactory.createBookingOrder(testInhabitantId, isolatedEvent.id, testAdultTicketPriceId)]
      })

      expect(claimResult).not.toBeNull()
      expect(claimResult!.scaffoldResult.claimed, 'Should claim ticket via CLAIM bucket').toBeGreaterThanOrEqual(1)

      // Verify ticket transferred to admin's inhabitant
      const orderAfterClaim = await OrderFactory.getOrder(adminContext, otherOrderId)
      expect(orderAfterClaim?.state, 'Order should be BOOKED after claim').toBe(OrderStateSchema.enum.BOOKED)
      expect(orderAfterClaim?.inhabitantId, 'Ticket should have transferred to admin inhabitant').toBe(testInhabitantId)
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
