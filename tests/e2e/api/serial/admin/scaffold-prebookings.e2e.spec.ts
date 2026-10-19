import {test, expect} from '@playwright/test'
import {useCoreValidation} from '~~/app/composables/useCoreValidation'
import {useBookingValidation} from '~~/app/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~~/app/composables/useWeekDayMapValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useBookingValidation as useActionValidation} from '~/composables/useBookingValidation'
const Action = useActionValidation().BookingActionSchema.enum

const {DinnerModeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap: createDefaultDinnerModeMap} = useCoreValidation()
const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, salt, temporaryAndRandom, assertNoOrdersWithOrphanPrices, daysFromNow} = testHelpers
const {createDefaultWeekdayMap: createBooleanWeekdayMap} = useWeekDayMapValidation()

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
    const createdInhabitantIds: number[] = []
    const allDaysCooking = createBooleanWeekdayMap([true, true, true, true, true, true, true])

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const inhabitantId of createdInhabitantIds) await HouseholdFactory.deleteInhabitant(context, inhabitantId)
        for (const householdId of createdHouseholdIds) {
            await HouseholdFactory.deleteHousehold(context, householdId)
        }
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('should create orders for inhabitants with preferences, and be idempotent', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Use ticketIsCancellableDaysBefore: 0 so scaffold can create orders for near-future dinners
        // Default is 8 days, but test season has dinners 1-7 days away
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
        expect(scaffoldResult.totals[Action.BOOK], 'First scaffold books').toBeGreaterThan(0)

        const ordersAfterFirst = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
        const inhabitantOrdersAfterFirst = ordersAfterFirst.filter(o => o.inhabitantId === inhabitant.id)
        expect(inhabitantOrdersAfterFirst.length, `Expected ${dinnerEvents.length} orders for inhabitant ${inhabitant.id}`).toBe(dinnerEvents.length)
        assertNoOrdersWithOrphanPrices(inhabitantOrdersAfterFirst, 'after scaffolding')

        // Second scaffold should be idempotent for THIS test's inhabitant
        // Note: Other parallel tests may create households, so we check our inhabitant's orders, not global created count
        await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)
        const ordersAfterSecond = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
        const inhabitantOrdersAfterSecond = ordersAfterSecond.filter(o => o.inhabitantId === inhabitant.id)

        // Verify idempotency: same orders, same count, no duplicates
        expect(inhabitantOrdersAfterSecond.length, `Second scaffold: expected ${dinnerEvents.length} orders`).toBe(dinnerEvents.length)
        expect(inhabitantOrdersAfterSecond.map(o => o.id).sort()).toEqual(inhabitantOrdersAfterFirst.map(o => o.id).sort())

        // Verify all orders have valid ticketPriceId (no orphans after re-scaffold)
        assertNoOrdersWithOrphanPrices(inhabitantOrdersAfterSecond, 'after re-scaffold')
    })

    test('should return 404 for a removed season', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const removedSeason = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(temporaryAndRandom()))
        await SeasonFactory.deleteSeason(context, removedSeason.id!, 200)
        await SeasonFactory.scaffoldPrebookingsForSeason(context, removedSeason.id!, 404)
    })

    test('should skip inhabitants with NONE preferences', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // An open deadline, so the scaffold would book these dinners; only the NONE preference keeps them empty
        const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
            ticketIsCancellableDaysBefore: 0
        })
        createdSeasonIds.push(season.id!)

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context, HouseholdFactory.defaultHouseholdData(testSalt), 1
        )
        createdHouseholdIds.push(household.id)

        const allDaysNone = createDefaultDinnerModeMap(DinnerMode.NONE)
        await HouseholdFactory.updateInhabitant(context, inhabitants[0]!.id, {dinnerPreferences: allDaysNone}, 200, season.id!)

        await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

        const orders = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
        const inhabitantOrders = orders.filter(o => o.inhabitantId === inhabitants[0]!.id)
        expect(inhabitantOrders.length).toBe(0)
    })

    test.describe('scaffold respects move-in and move-out dates', () => {
        // --- GIVEN household with residency dates WHEN scaffold runs THEN only eligible events get orders ---

        const scaffoldCases = [
            {desc: 'past moveOutDate → zero orders (all events after moveOutDate)',
                moveOutDaysFromNow: -1, moveOutAtEvent: undefined as number | undefined, movedInAtEvent: undefined as number | undefined, eligibleIndices: [] as number[]},
            {desc: 'moveOutDate mid-season → orders only on/before moveOutDate',
                moveOutDaysFromNow: undefined as number | undefined, moveOutAtEvent: 2, movedInAtEvent: undefined as number | undefined, eligibleIndices: [0, 1, 2]},
            {desc: 'movedInDate mid-season → orders only on/after movedInDate',
                moveOutDaysFromNow: undefined as number | undefined, moveOutAtEvent: undefined as number | undefined, movedInAtEvent: 4, eligibleIndices: [4, 5, 6, 7]},
        ]

        for (const {desc, moveOutDaysFromNow, moveOutAtEvent, movedInAtEvent, eligibleIndices} of scaffoldCases) {
            test(desc, async ({browser}) => {
                const context = await validatedBrowserContext(browser)
                const testSalt = temporaryAndRandom()

                // GIVEN: Season with all-days cooking (7 predictable events)
                const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
                    cookingDays: allDaysCooking,
                    ticketIsCancellableDaysBefore: 0
                })
                createdSeasonIds.push(season.id!)
                expect(dinnerEvents.length, 'all-days cooking over 8-day window').toBe(8)

                // GIVEN: Household with specific residency dates
                const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                    context, HouseholdFactory.defaultHouseholdData(testSalt), 1
                )
                createdHouseholdIds.push(household.id)

                const updates: Record<string, Date> = {}
                if (moveOutDaysFromNow !== undefined) updates.moveOutDate = daysFromNow(moveOutDaysFromNow)
                if (moveOutAtEvent !== undefined) updates.moveOutDate = new Date(dinnerEvents[moveOutAtEvent]!.date)
                if (movedInAtEvent !== undefined) updates.movedInDate = new Date(dinnerEvents[movedInAtEvent]!.date)
                if (Object.keys(updates).length > 0) {
                    await HouseholdFactory.updateHousehold(context, household.id, updates)
                }

                // WHEN: Preferences set and scaffold runs
                const allDaysDineIn = createDefaultDinnerModeMap(DinnerMode.DINEIN)
                await HouseholdFactory.updateInhabitant(context, inhabitants[0]!.id, {dinnerPreferences: allDaysDineIn}, 200, season.id!)
                await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

                // THEN: Only eligible events have orders
                const orders = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
                const inhabitantOrders = orders.filter(o => o.inhabitantId === inhabitants[0]!.id)

                expect(inhabitantOrders.length, `${desc}: order count`).toBe(eligibleIndices.length)

                if (eligibleIndices.length > 0) {
                    const eligibleEventIds = eligibleIndices.map(i => dinnerEvents[i]!.id)
                    const orderEventIds = inhabitantOrders.map(o => o.dinnerEventId)
                    expect(orderEventIds.sort()).toEqual(eligibleEventIds.sort())
                }
            })
        }

    })

    test.describe('update household triggers re-scaffold respecting dates', () => {
        // A moveOutDate set to the past is the set step of 'clear moveOutDate → orders re-scaffolded' below
        const rescaffoldCases = [
            {desc: 'moveOutDate mid-season → only eligible orders remain',
                moveOutAtEvent: 2 as number | undefined, moveOutDaysFromNow: undefined as number | undefined, eligibleIndices: [0, 1, 2]},
        ]

        for (const {desc, moveOutAtEvent, moveOutDaysFromNow, eligibleIndices} of rescaffoldCases) {
            test(desc, async ({browser}) => {
                const context = await validatedBrowserContext(browser)
                const testSalt = temporaryAndRandom()

                // GIVEN: Season with all-days cooking (7 predictable events)
                const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
                    cookingDays: allDaysCooking,
                    ticketIsCancellableDaysBefore: 0
                })
                createdSeasonIds.push(season.id!)
                expect(dinnerEvents.length, 'all-days cooking over 8-day window').toBe(8)
                await SeasonFactory.activateSeason(context, season.id!)

                // GIVEN: Active household with orders for ALL dinner events
                const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                    context, HouseholdFactory.defaultHouseholdData(testSalt), 1
                )
                createdHouseholdIds.push(household.id)
                const inhabitant = inhabitants[0]!

                const allDaysDineIn = createDefaultDinnerModeMap(DinnerMode.DINEIN)
                await HouseholdFactory.updateInhabitant(context, inhabitant.id, {dinnerPreferences: allDaysDineIn}, 200, season.id!)
                await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

                const ordersBefore = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
                const inhabitantOrdersBefore = ordersBefore.filter(o => o.inhabitantId === inhabitant.id)
                expect(inhabitantOrdersBefore.length, 'should have orders for all events').toBe(dinnerEvents.length)

                // WHEN: Admin updates moveOutDate via POST /api/admin/household/[id] → triggers re-scaffold
                const moveOutDate = moveOutAtEvent !== undefined
                    ? new Date(dinnerEvents[moveOutAtEvent]!.date)
                    : daysFromNow(moveOutDaysFromNow!)
                const updateResult = await HouseholdFactory.updateHousehold(context, household.id, {moveOutDate})

                // THEN: Response contains scaffoldResult with correct counts
                expect(updateResult, 'should return HouseholdUpdateResponse').not.toBeNull()
                const deletedCount = inhabitantOrdersBefore.length - eligibleIndices.length
                expect(updateResult!.scaffoldResult.totals[Action.CANCEL], 'scaffoldResult.totals[Action.CANCEL] matches removed orders').toBe(deletedCount)
                expect(updateResult!.household.moveOutDate, 'response household has moveOutDate set').not.toBeNull()

                // Verify moveOutDate persisted via separate GET
                const updatedHousehold = await HouseholdFactory.getHouseholdById(context, household.id)
                expect(updatedHousehold!.moveOutDate, 'moveOutDate should be set').not.toBeNull()

                // THEN: Only eligible events have orders after re-scaffold
                const ordersAfter = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
                const inhabitantOrdersAfter = ordersAfter.filter(o => o.inhabitantId === inhabitant.id)

                expect(inhabitantOrdersAfter.length, `${desc}: order count after re-scaffold`).toBe(eligibleIndices.length)
                expect(inhabitantOrdersAfter.length, 'fewer orders than before').toBeLessThan(inhabitantOrdersBefore.length)

                if (eligibleIndices.length > 0) {
                    const eligibleEventIds = eligibleIndices.map(i => dinnerEvents[i]!.id)
                    const orderEventIds = inhabitantOrdersAfter.map(o => o.dinnerEventId)
                    expect(orderEventIds.sort()).toEqual(eligibleEventIds.sort())
                }
            })
        }

        test('moveOutDate with real deadline → all orders deleted (family is gone)', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // GIVEN: Season with 8-day deadline, 20-day window → both before/after deadline events
            const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
                cookingDays: allDaysCooking,
                ticketIsCancellableDaysBefore: 8,
                seasonDates: {start: daysFromNow(1), end: daysFromNow(20)}
            })
            createdSeasonIds.push(season.id!)
            await SeasonFactory.activateSeason(context, season.id!)

            const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                context, HouseholdFactory.defaultHouseholdData(testSalt), 1
            )
            createdHouseholdIds.push(household.id)

            const allDaysDineIn = createDefaultDinnerModeMap(DinnerMode.DINEIN)
            await HouseholdFactory.updateInhabitant(context, inhabitants[0]!.id, {dinnerPreferences: allDaysDineIn}, 200, season.id!)
            await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

            const ordersBefore = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
            const inhabitantOrdersBefore = ordersBefore.filter(o => o.inhabitantId === inhabitants[0]!.id)
            expect(inhabitantOrdersBefore.length, 'should have orders before').toBeGreaterThan(0)

            // WHEN: moveOutDate set to yesterday → family is gone, all events ineligible
            const updateResult = await HouseholdFactory.updateHousehold(context, household.id, {moveOutDate: daysFromNow(-1)})

            // THEN: scaffoldResult reflects all orders deleted
            expect(updateResult, 'should return HouseholdUpdateResponse').not.toBeNull()
            expect(updateResult!.scaffoldResult.totals[Action.CANCEL], 'scaffoldResult.totals[Action.CANCEL] matches all removed orders').toBe(inhabitantOrdersBefore.length)

            // THEN: ALL orders deleted — deadline doesn't protect moved-out households
            const ordersAfter = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
            const inhabitantOrdersAfter = ordersAfter.filter(o => o.inhabitantId === inhabitants[0]!.id)
            expect(inhabitantOrdersAfter.length, 'all orders deleted for moved-out household').toBe(0)
        })

        test('clear moveOutDate → orders re-scaffolded (created)', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // GIVEN: Season with no deadline, all-days cooking
            const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
                cookingDays: allDaysCooking,
                ticketIsCancellableDaysBefore: 0
            })
            createdSeasonIds.push(season.id!)
            await SeasonFactory.activateSeason(context, season.id!)

            // GIVEN: Household with DINEIN preferences and scaffold
            const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                context, HouseholdFactory.defaultHouseholdData(testSalt), 1
            )
            createdHouseholdIds.push(household.id)

            const allDaysDineIn = createDefaultDinnerModeMap(DinnerMode.DINEIN)
            await HouseholdFactory.updateInhabitant(context, inhabitants[0]!.id, {dinnerPreferences: allDaysDineIn}, 200, season.id!)
            await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

            const ordersBeforeMoveOut = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
            const inhabitantOrdersBeforeMoveOut = ordersBeforeMoveOut.filter(o => o.inhabitantId === inhabitants[0]!.id)
            expect(inhabitantOrdersBeforeMoveOut.length, 'should have orders for all events').toBe(dinnerEvents.length)

            // GIVEN: Set moveOutDate to past → all orders deleted
            const setResult = await HouseholdFactory.updateHousehold(context, household.id, {moveOutDate: daysFromNow(-1)})
            expect(setResult!.scaffoldResult.totals[Action.CANCEL], 'set: all orders deleted').toBe(dinnerEvents.length)

            const ordersAfterMoveOut = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
            expect(ordersAfterMoveOut.filter(o => o.inhabitantId === inhabitants[0]!.id).length, 'zero orders after moveOut').toBe(0)

            // WHEN: Clear moveOutDate (set to null) → orders should be re-scaffolded
            const clearResult = await HouseholdFactory.updateHousehold(context, household.id, {moveOutDate: null as unknown as Date})

            // THEN: scaffoldResult reflects orders re-created
            expect(clearResult, 'should return HouseholdUpdateResponse').not.toBeNull()
            // Debug: log full scaffold result to understand what happened
            const sr = clearResult!.scaffoldResult
            expect(sr.seasonId, `clear: scaffold ran with season (full: created=${sr.totals[Action.BOOK]} deleted=${sr.totals[Action.CANCEL]} released=${sr.totals[Action.RELEASE]} unchanged=${sr.unchanged} errored=${sr.errored} households=${sr.households})`).not.toBeNull()
            expect(clearResult!.household.moveOutDate, 'response household has moveOutDate cleared').toBeNull()
            expect(sr.households, `clear: scaffold processed the household`).toBe(1)
            expect(sr.totals[Action.BOOK], 'clear: orders re-created').toBe(dinnerEvents.length)

            // THEN: Orders are back
            const ordersAfterClear = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
            const inhabitantOrdersAfterClear = ordersAfterClear.filter(o => o.inhabitantId === inhabitants[0]!.id)
            expect(inhabitantOrdersAfterClear.length, 'orders restored after clearing moveOutDate').toBe(dinnerEvents.length)
        })
    })

    test.describe('daily maintenance respects move-in and move-out dates', () => {
        test('past moveOutDate → daily maintenance creates no orders', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // GIVEN: Season with all-days cooking, activated for daily maintenance
            const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
                cookingDays: allDaysCooking,
                ticketIsCancellableDaysBefore: 0
            })
            createdSeasonIds.push(season.id!)
            await SeasonFactory.activateSeason(context, season.id!)

            // GIVEN: Household with past moveOutDate (moved out yesterday)
            const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                context, HouseholdFactory.defaultHouseholdData(testSalt), 1
            )
            createdHouseholdIds.push(household.id)

            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            await HouseholdFactory.updateHousehold(context, household.id, {moveOutDate: yesterday})

            const allDaysDineIn = createDefaultDinnerModeMap(DinnerMode.DINEIN)
            await HouseholdFactory.updateInhabitant(context, inhabitants[0]!.id, {dinnerPreferences: allDaysDineIn}, 200, season.id!)

            // WHEN: Daily maintenance runs (calls scaffoldPrebookings for active season)
            await SeasonFactory.runDailyMaintenance(context)

            // THEN: No orders for moved-out household
            const orders = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
            const inhabitantOrders = orders.filter(o => o.inhabitantId === inhabitants[0]!.id)
            expect(inhabitantOrders.length, 'daily maintenance: past moveOutDate → zero orders').toBe(0)
        })

        test('future movedInDate → daily maintenance creates no orders for events before movedInDate', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // GIVEN: Season with all-days cooking, activated for daily maintenance
            const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
                cookingDays: allDaysCooking,
                ticketIsCancellableDaysBefore: 0
            })
            createdSeasonIds.push(season.id!)
            expect(dinnerEvents.length, 'all-days cooking over 8-day window').toBe(8)
            await SeasonFactory.activateSeason(context, season.id!)

            // GIVEN: Household with movedInDate mid-season (5th event)
            const movedInDate = new Date(dinnerEvents[4]!.date)
            const householdData = {...HouseholdFactory.defaultHouseholdData(testSalt), movedInDate}
            const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                context, householdData, 1
            )
            createdHouseholdIds.push(household.id)

            const allDaysDineIn = createDefaultDinnerModeMap(DinnerMode.DINEIN)
            await HouseholdFactory.updateInhabitant(context, inhabitants[0]!.id, {dinnerPreferences: allDaysDineIn}, 200, season.id!)

            // WHEN: Daily maintenance runs
            await SeasonFactory.runDailyMaintenance(context)

            // THEN: Orders only for events on/after movedInDate (last 4 of 8)
            const orders = await OrderFactory.getAllOrdersForEvents(context, dinnerEvents.map(e => e.id))
            const inhabitantOrders = orders.filter(o => o.inhabitantId === inhabitants[0]!.id)
            expect(inhabitantOrders.length, 'daily maintenance: orders only on/after movedInDate').toBe(4)

            const eligibleEventIds = dinnerEvents.slice(4).map(e => e.id)
            const orderEventIds = inhabitantOrders.map(o => o.dinnerEventId)
            expect(orderEventIds.sort()).toEqual(eligibleEventIds.sort())
        })
    })

    test.describe('user intent respected by system scaffold', () => {
        const {OrderStateSchema, OrderAuditActionSchema} = useBookingValidation()
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
                    const cancelledEntry = orderWithHistory?.history?.find(h => h.action === OrderAuditActionSchema.enum.USER_CANCELLED)
                    expect(cancelledEntry, 'USER_CANCELLED audit entry should exist').toBeDefined()
                    expect(cancelledEntry?.inhabitantId, 'Audit should have inhabitantId').toBe(inhabitant.id)
                    expect(cancelledEntry?.dinnerEventId, 'Audit should have dinnerEventId').toBe(dinnerEvent.id)
                    expect(cancelledEntry?.seasonId, 'Audit should have seasonId').toBe(season.id)
                }

                await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

                if (action === 'delete') {
                    // Deleted orders should not be recreated
                    const ordersAfterRescaffold = await OrderFactory.getAllOrdersForEvents(context, dinnerEvent.id)
                    const userOrder = ordersAfterRescaffold.find(o => o.inhabitantId === inhabitant.id)
                    expect(userOrder, 'Deleted order should NOT be recreated').toBeUndefined()
                } else {
                    // User cancelled - scaffolder should NOT re-book them
                    // (another inhabitant claiming the released ticket is valid marketplace behavior)
                    const ordersAfterRescaffold = await OrderFactory.getAllOrdersForEvents(context, dinnerEvent.id)
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
                const ordersAfterUserBook = await OrderFactory.getAllOrdersForEvents(context, dinnerEvent.id)
                const userOrder = ordersAfterUserBook.find(o => o.inhabitantId === inhabitantId)
                expect(userOrder, 'User order should exist after booking').toBeDefined()
                expect(userOrder?.dinnerMode, 'User booked mode').toBe(bookedMode)

                // STEP 2: Set preferences (may differ from booking)
                // This triggers scaffold but confirmedKeys should prevent overwrite
                const prefs = createDefaultDinnerModeMap(prefsMode)
                await HouseholdFactory.updateInhabitant(context, inhabitantId, {dinnerPreferences: prefs}, 200, season.id!)

                // STEP 3: System scaffold should PRESERVE user-booked order
                await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

                const ordersAfter = await OrderFactory.getAllOrdersForEvents(context, dinnerEvent.id)
                const preserved = ordersAfter.find(o => o.inhabitantId === inhabitantId)

                expect(preserved, 'User-booked order preserved').toBeDefined()
                expect(preserved?.dinnerMode, 'Mode unchanged').toBe(bookedMode)
                expect(preserved?.state, 'State=BOOKED').toBe(OrderState.BOOKED)
                expect(preserved?.id, 'Same order ID').toBe(userOrder!.id)
            })
        }
    })

    // A member's Ingen is a cancellation whatever the person holds: on a dinner the scaffold has not reached, with nothing
    // booked, it is recorded alone and the scaffold that reaches the dinner books nothing there
    test('GIVEN a dinner beyond the scaffold window WHEN a member sets it to Ingen THEN the reply counts one cancellation, and the scaffold that reaches the dinner books no order on it', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const {householdId} = await getSessionUserInfo(memberContext)
        const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {ticketIsCancellableDaysBefore: 0})
        createdSeasonIds.push(season.id!)
        const inhabitant = await HouseholdFactory.createInhabitantWithConfig(context, householdId, {
            name: salt('Anders', testSalt), lastName: 'Ingen', dinnerPreferences: createDefaultDinnerModeMap(DinnerMode.DINEIN)
        })
        createdInhabitantIds.push(inhabitant.id)
        // The dinner moves later through the chef route, which answers its team's chef only
        const {inhabitantId: adminInhabitantId} = await getSessionUserInfo(context)
        const {dinner: beyondWindow} = await SeasonFactory.createCookingTeamWithChefAndDinner(context, season, adminInhabitantId, {
            teamName: salt('Beyond', testSalt), dinner: {date: daysFromNow(70), menuTitle: salt('Beyond the window', testSalt)}
        })
        const adultPriceId = season.ticketPrices.find(price => price.ticketType === useBookingValidation().TicketTypeSchema.enum.ADULT)!.id!

        const cancelled = await OrderFactory.scaffoldOrders(memberContext, {
            householdId, seasonId: season.id!, dinnerEventIds: [beyondWindow.id],
            orders: [OrderFactory.createBookingOrder(inhabitant.id, beyondWindow.id, adultPriceId, DinnerMode.NONE)]
        })

        expect(cancelled!.scaffoldResult.results).toEqual([expect.objectContaining({inhabitantId: inhabitant.id, dinnerEventId: beyondWindow.id, action: Action.CANCEL})])

        // The dinner moves into the window, where the scaffold reaches it beside the season's other dinners
        await DinnerEventFactory.updateDinnerEvent(context, beyondWindow.id, {date: daysFromNow(5)})
        await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

        const orders = (await OrderFactory.getAllOrdersForEvents(context, [...dinnerEvents.map(de => de.id), beyondWindow.id]))
            .filter(order => order.inhabitantId === inhabitant.id)
        expect(orders.map(order => order.dinnerEventId).sort()).toEqual(dinnerEvents.map(de => de.id).sort())
    })

    // Nothing lands on a cancelled dinner: the run reads the dinner's state and leaves it, orders and all
    test.describe('a cancelled dinner', () => {
        const {DinnerStateSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
        // A dinner of the admin's own team in the season: the chef's route, which cancels it, answers the team's chef
        const teamDinnerOf = async (context: Parameters<typeof DinnerEventFactory.updateDinnerEvent>[0], season: Parameters<typeof SeasonFactory.createCookingTeamWithChefAndDinner>[1], days: number, testSalt: string) => {
            const {inhabitantId: adminInhabitantId} = await getSessionUserInfo(context)
            const {dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(context, season, adminInhabitantId, {
                teamName: salt('Cancelled', testSalt), dinner: {date: daysFromNow(days), menuTitle: salt('Test Cancelled', testSalt)}
            })
            return dinner
        }
        const cancel = (context: Parameters<typeof DinnerEventFactory.updateDinnerEvent>[0], dinnerEventId: number) =>
            DinnerEventFactory.updateDinnerEvent(context, dinnerEventId, {state: DinnerStateSchema.enum.CANCELLED})

        test('GIVEN a dinner the chef cancelled in the window and a person whose preferences eat every day WHEN the run goes THEN it books the season\'s other dinners and nothing on the cancelled one', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()
            const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {ticketIsCancellableDaysBefore: 0})
            createdSeasonIds.push(season.id!)
            const cancelled = await teamDinnerOf(context, season, 4, testSalt)
            await cancel(context, cancelled.id)
            const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(context, HouseholdFactory.defaultHouseholdData(testSalt), 1)
            createdHouseholdIds.push(household.id)
            const inhabitant = inhabitants[0]!

            await HouseholdFactory.updateInhabitant(context, inhabitant.id, {dinnerPreferences: createDefaultDinnerModeMap(DinnerMode.DINEIN)}, 200, season.id!)
            await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

            const orders = (await OrderFactory.getAllOrdersForEvents(context, [...dinnerEvents.map(de => de.id), cancelled.id]))
                .filter(order => order.inhabitantId === inhabitant.id)
            expect(orders.map(order => order.dinnerEventId).sort()).toEqual(dinnerEvents.map(de => de.id).sort())
        })

        // The ticket for sale stays where it is: a sale on a cancelled dinner would charge the buyer for a dinner nobody cooks
        test('GIVEN a released ticket on a dinner the chef cancelled and a person whose preferences eat every day WHEN the run goes THEN the ticket stays for sale with its holder', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()
            // The season's booking deadline lies past the dinner two days ahead: a release keeps the ticket, a wish to eat buys it
            const {season} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {ticketIsCancellableDaysBefore: SeasonFactory.DEFAULT_BOOKING_DEADLINE_DAYS})
            createdSeasonIds.push(season.id!)
            const dinner = await teamDinnerOf(context, season, 2, testSalt)
            // Both eat every day by default: the holder's release is the holder's own act, the buyer's preference speaks alone.
            // They live in the admin's household: the release is a member's act under the season's deadline
            const {householdId} = await getSessionUserInfo(context)
            const [holder, buyer] = await Promise.all(['Holder', 'Buyer'].map(lastName =>
                HouseholdFactory.createInhabitantWithConfig(context, householdId, {name: salt('Anders', testSalt), lastName})))
            createdInhabitantIds.push(holder!.id, buyer!.id)
            const adultPriceId = season.ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.ADULT)!.id!
            const created = await OrderFactory.createOrder(context, {
                householdId, dinnerEventId: dinner.id,
                orders: [OrderFactory.defaultOrderItem({inhabitantId: holder!.id, ticketPriceId: adultPriceId})]
            })
            const ticketId = created!.createdIds[0]!
            const released = await OrderFactory.updateOrder(context, ticketId, {dinnerMode: DinnerMode.NONE})
            expect(released?.state).toBe(OrderStateSchema.enum.RELEASED)
            await cancel(context, dinner.id)

            await SeasonFactory.scaffoldPrebookingsForSeason(context, season.id!)

            const orders = await OrderFactory.getAllOrdersForEvents(context, dinner.id)
            expect(orders).toEqual([expect.objectContaining({id: ticketId, inhabitantId: holder!.id, state: OrderStateSchema.enum.RELEASED})])
            expect(orders.some(order => order.inhabitantId === buyer!.id)).toBe(false)
        })
    })
})
