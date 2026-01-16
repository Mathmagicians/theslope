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
        // Default is 10 days, but test season has dinners 1-7 days away
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

        const userActions = [
            {action: 'delete', daysFromNow: 15, expectedStateAfterAction: null},
            {action: 'release', daysFromNow: 3, expectedStateAfterAction: OrderState.RELEASED}
        ] as const

        for (const {action, daysFromNow, expectedStateAfterAction} of userActions) {
            test(`should not reclaim user-${action}d orders`, async ({browser}) => {
                const context = await validatedBrowserContext(browser)
                const testSalt = temporaryAndRandom()

                // Fixture creates season, event, order
                // - Before deadline (delete): creates test household, scaffold creates order
                // - After deadline (release): uses admin's session household, creates order directly
                const {season, dinnerEvent, household, inhabitant, order, isTestHousehold} =
                    await OrderFactory.createOrderFixture(context, daysFromNow, testSalt)
                createdSeasonIds.push(season.id!)
                if (isTestHousehold) {
                    createdHouseholdIds.push(household.id)
                }

                // User performs action (delete before deadline, release after deadline)
                if (action === 'delete') {
                    await OrderFactory.deleteOrder(context, order.id)
                    await OrderFactory.getOrder(context, order.id, 404)
                } else {
                    const released = await OrderFactory.updateOrder(context, order.id, {dinnerMode: DinnerMode.NONE})
                    expect(released?.state).toBe(expectedStateAfterAction)
                }

                // Re-scaffold - system should respect user intent
                await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

                const ordersAfterRescaffold = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id)
                const userOrder = ordersAfterRescaffold.find(o => o.inhabitantId === inhabitant.id)

                if (action === 'delete') {
                    expect(userOrder, 'Deleted order should NOT be recreated').toBeUndefined()
                } else {
                    expect(userOrder, 'Released order should still exist').toBeDefined()
                    expect(userOrder?.state, 'Released order should remain RELEASED').toBe(OrderState.RELEASED)
                }
            })
        }
    })
})
