import {test, expect} from '@playwright/test'
import {useCoreValidation} from '~~/app/composables/useCoreValidation'
import {useBookingValidation} from '~~/app/composables/useBookingValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap: createDefaultDinnerModeMap} = useCoreValidation()
const {validatedBrowserContext, temporaryAndRandom, assertNoOrdersWithOrphanPrices} = testHelpers

/**
 * Admin Scaffold Pre-bookings API Tests
 * Endpoint: POST /api/admin/season/[id]/scaffold-prebookings
 *
 * These tests are in the SERIAL folder because:
 * - This endpoint processes ALL households in the system
 * - When parallel tests create many households, this endpoint becomes slow
 * - Running serially after parallel tests ensures consistent performance
 *
 * For user-facing (household-scoped) scaffold tests, see:
 * tests/e2e/api/household/scaffold.e2e.spec.ts (ADR-016)
 */
test.describe('POST /api/admin/season/[id]/scaffold-prebookings', () => {
    const createdSeasonIds: number[] = []
    const createdHouseholdIds: number[] = []

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const householdId of createdHouseholdIds) {
            await HouseholdFactory.deleteHousehold(context, householdId)
        }
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('should create orders for inhabitants with preferences', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Use ticketIsCancellableDaysBefore: 0 so scaffold can create orders for near-future dinners
        // Default is 8 days, but test season has dinners 1-7 days away
        const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
            ticketIsCancellableDaysBefore: 0
        })
        createdSeasonIds.push(season.id!)

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context, HouseholdFactory.defaultHouseholdData(testSalt), 2
        )
        createdHouseholdIds.push(household.id)

        const allDaysDineIn = createDefaultDinnerModeMap(DinnerMode.DINEIN)
        for (const inhabitant of inhabitants) {
            await HouseholdFactory.updateInhabitant(context, inhabitant.id, {dinnerPreferences: allDaysDineIn}, 200, season.id!)
        }

        const result = await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

        expect(result.seasonId).toBe(season.id)
        expect(result.created).toBeGreaterThan(0)

        // Use admin endpoint (dinner event detail includes tickets) - user-facing /api/order filters by session household
        const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
        const householdOrders = orders.filter(o => inhabitants.some(i => i.id === o.inhabitantId))
        expect(householdOrders.length).toBeGreaterThan(0)

        // Verify all orders have valid ticketPriceId (no orphans)
        assertNoOrdersWithOrphanPrices(householdOrders, 'after scaffolding')
    })

    test('should be idempotent', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Use ticketIsCancellableDaysBefore: 0 so scaffold can create orders for near-future dinners
        const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
            ticketIsCancellableDaysBefore: 0
        })
        createdSeasonIds.push(season.id!)

        // Season uses default Mon/Wed/Fri cooking days, 7-day window has 3-4 events depending on start day
        expect(dinnerEvents.length, 'Season should have 3-4 dinner events').toBeGreaterThanOrEqual(3)
        expect(dinnerEvents.length, 'Season should have 3-4 dinner events').toBeLessThanOrEqual(4)

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context, HouseholdFactory.defaultHouseholdData(testSalt), 1
        )
        createdHouseholdIds.push(household.id)
        const inhabitant = inhabitants[0]!

        // Set DINEIN for all days - even if clipped to Mon/Wed/Fri by parallel tests,
        // the cooking days will still have DINEIN which is what matters for scaffolding
        const allDaysDineIn = createDefaultDinnerModeMap(DinnerMode.DINEIN)
        await HouseholdFactory.updateInhabitant(context, inhabitant.id, {dinnerPreferences: allDaysDineIn}, 200, season.id!)

        const scaffoldResult = await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)
        expect(scaffoldResult.seasonId, 'Scaffold should return correct seasonId').toBe(season.id)

        // Use admin endpoint (dinner event detail includes tickets) - user-facing /api/order filters by session household
        const ordersAfterFirst = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
        const inhabitantOrdersAfterFirst = ordersAfterFirst.filter(o => o.inhabitantId === inhabitant.id)
        expect(inhabitantOrdersAfterFirst.length, `Expected ${dinnerEvents.length} orders for inhabitant ${inhabitant.id}`).toBe(dinnerEvents.length)

        // Second scaffold should be idempotent for THIS test's inhabitant
        // Note: Other parallel tests may create households, so we check our inhabitant's orders, not global created count
        await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)
        const ordersAfterSecond = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
        const inhabitantOrdersAfterSecond = ordersAfterSecond.filter(o => o.inhabitantId === inhabitant.id)

        // Verify idempotency: same orders, same count, no duplicates
        expect(inhabitantOrdersAfterSecond.length, `Second scaffold: expected ${dinnerEvents.length} orders`).toBe(dinnerEvents.length)
        expect(inhabitantOrdersAfterSecond.map(o => o.id).sort()).toEqual(inhabitantOrdersAfterFirst.map(o => o.id).sort())

        // Verify all orders have valid ticketPriceId (no orphans after re-scaffold)
        assertNoOrdersWithOrphanPrices(inhabitantOrdersAfterSecond, 'after re-scaffold')
    })

    test('should return 404 for non-existent season', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.scaffoldPrebookingsForSeason(context, 9999999, 404)
    })

    test('should skip inhabitants with NONE preferences', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt)
        createdSeasonIds.push(season.id!)

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context, HouseholdFactory.defaultHouseholdData(testSalt), 1
        )
        createdHouseholdIds.push(household.id)

        const allDaysNone = createDefaultDinnerModeMap(DinnerMode.NONE)
        await HouseholdFactory.updateInhabitant(context, inhabitants[0]!.id, {dinnerPreferences: allDaysNone}, 200, season.id!)

        await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

        // Use admin endpoint - user-facing /api/order filters by session household
        const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
        const inhabitantOrders = orders.filter(o => o.inhabitantId === inhabitants[0]!.id)
        expect(inhabitantOrders.length).toBe(0)
    })

    test.describe('user intent respected by system scaffold', () => {
        const {OrderStateSchema} = useBookingValidation()
        const OrderState = OrderStateSchema.enum

        // USER_CANCELLED scenarios (negative intent)
        const cancelledScenarios = [
            {action: 'delete', daysFromNow: 15, expectedStateAfterAction: null},
            {action: 'release', daysFromNow: 3, expectedStateAfterAction: OrderState.RELEASED}
        ] as const

        for (const {action, daysFromNow, expectedStateAfterAction} of cancelledScenarios) {
            test(`USER_CANCELLED: should not reclaim user-${action}d orders`, async ({browser}) => {
                const context = await validatedBrowserContext(browser)
                const testSalt = temporaryAndRandom()

                const {season, dinnerEvent, household, inhabitant, order, isTestHousehold} =
                    await OrderFactory.createOrderFixture(context, daysFromNow, testSalt)
                createdSeasonIds.push(season.id!)
                if (isTestHousehold) {
                    createdHouseholdIds.push(household.id)
                }

                if (action === 'delete') {
                    await OrderFactory.deleteOrder(context, order.id)
                    await OrderFactory.getOrder(context, order.id, 404)
                } else {
                    const released = await OrderFactory.updateOrder(context, order.id, {dinnerMode: DinnerMode.NONE})
                    expect(released?.state).toBe(expectedStateAfterAction)

                    // Verify USER_CANCELLED audit entry was created with denormalized fields
                    const orderWithHistory = await OrderFactory.getOrder(context, order.id)
                    const cancelledEntry = orderWithHistory?.history?.find(h => h.action === 'USER_CANCELLED')
                    expect(cancelledEntry, 'USER_CANCELLED audit entry should exist').toBeDefined()
                    expect(cancelledEntry?.inhabitantId, 'Audit should have inhabitantId').toBe(inhabitant.id)
                    expect(cancelledEntry?.dinnerEventId, 'Audit should have dinnerEventId').toBe(dinnerEvent.id)
                    expect(cancelledEntry?.seasonId, 'Audit should have seasonId').toBe(season.id)
                }

                await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

                if (action === 'delete') {
                    // Deleted orders should not be recreated
                    const ordersAfterRescaffold = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id)
                    const userOrder = ordersAfterRescaffold.find(o => o.inhabitantId === inhabitant.id)
                    expect(userOrder, 'Deleted order should NOT be recreated').toBeUndefined()
                } else {
                    // User cancelled - scaffolder should NOT re-book them
                    // (another inhabitant claiming the released ticket is valid marketplace behavior)
                    const ordersAfterRescaffold = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id)
                    const userOrderAfter = ordersAfterRescaffold.find(o => o.inhabitantId === inhabitant.id)

                    if (userOrderAfter) {
                        // If order still belongs to original user, it must remain RELEASED
                        expect(userOrderAfter.state, 'User who cancelled should not be re-booked').toBe(OrderState.RELEASED)
                    } else {
                        // Order no longer belongs to original user - verify it was claimed by someone else
                        const claimedOrder = ordersAfterRescaffold.find(o => o.id === order.id)
                        expect(claimedOrder, 'Released ticket should have been claimed by another inhabitant').toBeDefined()
                        expect(claimedOrder?.inhabitantId, 'Claimed order should belong to different inhabitant').not.toBe(inhabitant.id)
                        expect(claimedOrder?.state, 'Claimed order should be BOOKED').toBe(OrderState.BOOKED)
                    }
                }
            })
        }

        // USER_BOOKED scenarios (positive intent - preserves order despite prefs)
        const bookedScenarios = [
            // Prefs DIFFER from booking - confirmedKeys prevents overwrite/delete
            {desc: 'prefs=NONE, user booked DINEIN', prefsMode: DinnerMode.NONE, bookedMode: DinnerMode.DINEIN},
            {desc: 'prefs=DINEIN, user booked TAKEAWAY', prefsMode: DinnerMode.DINEIN, bookedMode: DinnerMode.TAKEAWAY},
            {desc: 'prefs=TAKEAWAY, user booked DINEINLATE', prefsMode: DinnerMode.TAKEAWAY, bookedMode: DinnerMode.DINEINLATE},
            // Prefs MATCH booking - confirmedKeys ensures idempotent via intent, not coincidence
            {desc: 'prefs=DINEIN, user booked DINEIN', prefsMode: DinnerMode.DINEIN, bookedMode: DinnerMode.DINEIN}
        ] as const

        for (const {desc, prefsMode, bookedMode} of bookedScenarios) {
            test(`USER_BOOKED: ${desc} → PRESERVE`, async ({browser}) => {
                const context = await validatedBrowserContext(browser)
                const testSalt = temporaryAndRandom()

                const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
                    ticketIsCancellableDaysBefore: 0
                })
                createdSeasonIds.push(season.id!)
                const dinnerEvent = dinnerEvents[0]!

                // Use session user's household (user has access to their own household)
                const {householdId, inhabitantId} = await testHelpers.getSessionUserInfo(context)

                // STEP 1: User explicitly books FIRST (creates USER_BOOKED audit)
                // This happens BEFORE preferences are set to avoid scaffold-on-preference-change
                const desiredOrder = OrderFactory.createBookingOrder(
                    inhabitantId,
                    dinnerEvent.id,
                    season.ticketPrices[0]!.id!,
                    bookedMode
                )
                await OrderFactory.scaffoldOrders(context, {
                    householdId,
                    seasonId: season.id!,
                    dinnerEventIds: [dinnerEvent.id],
                    orders: [desiredOrder]
                })

                // Get the user-booked order
                const ordersAfterUserBook = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id)
                const userOrder = ordersAfterUserBook.find(o => o.inhabitantId === inhabitantId)
                expect(userOrder, 'User order should exist after booking').toBeDefined()
                expect(userOrder?.dinnerMode, 'User booked mode').toBe(bookedMode)

                // STEP 2: Set preferences (may differ from booking)
                // This triggers scaffold but confirmedKeys should prevent overwrite
                const prefs = createDefaultDinnerModeMap(prefsMode)
                await HouseholdFactory.updateInhabitant(context, inhabitantId, {dinnerPreferences: prefs}, 200, season.id!)

                // STEP 3: System scaffold should PRESERVE user-booked order
                await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

                const ordersAfter = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id)
                const preserved = ordersAfter.find(o => o.inhabitantId === inhabitantId)

                expect(preserved, 'User-booked order preserved').toBeDefined()
                expect(preserved?.dinnerMode, 'Mode unchanged').toBe(bookedMode)
                expect(preserved?.state, 'State=BOOKED').toBe(OrderState.BOOKED)
                expect(preserved?.id, 'Same order ID').toBe(userOrder!.id)
            })
        }
    })
})
