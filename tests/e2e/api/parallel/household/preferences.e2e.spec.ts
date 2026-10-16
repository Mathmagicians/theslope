import {test, expect} from '@playwright/test'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import testHelpers from '~~/tests/e2e/testHelpers'
const Action = useBookingValidation().BookingActionSchema.enum

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, temporaryAndRandom, salt} = testHelpers
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const {createDefaultWeekdayMap} = useWeekDayMapValidation({valueSchema: DinnerModeSchema, defaultValue: DinnerMode.NONE})

// Cleanup tracking
const createdHouseholdIds: number[] = []
const createdInhabitantIds: number[] = []

test.describe('Household Preferences API', () => {
    // The member edits a test inhabitant of their own household, never their own row: other specs book for that household
    let ownHouseholdInhabitantId: number

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const {householdId} = await getSessionUserInfo(await memberValidatedBrowserContext(browser))
        const inhabitant = await HouseholdFactory.createInhabitantForHousehold(adminContext, householdId, salt('Preferences', temporaryAndRandom()))
        createdInhabitantIds.push(inhabitant.id)
        ownHouseholdInhabitantId = inhabitant.id
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const id of createdInhabitantIds) await HouseholdFactory.deleteInhabitant(context, id)
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    })

    // Parametrized happy path tests for different DinnerMode values
    const dinnerModes = [DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.DINEINLATE, DinnerMode.NONE] as const

    dinnerModes.forEach((mode) => {
        test(`GIVEN member WHEN updating preferences to ${mode} THEN succeeds`, async ({browser}) => {
            const memberContext = await memberValidatedBrowserContext(browser)
            const preferences = createDefaultWeekdayMap(mode)

            const result = await HouseholdFactory.updateInhabitantPreferences(memberContext, ownHouseholdInhabitantId, preferences)

            expect(result).not.toBeNull()
            expect(result!.inhabitant.id).toBe(ownHouseholdInhabitantId)
            expect(result!.inhabitant.dinnerPreferences).toEqual(preferences)
            expect(result!.scaffoldResult).toBeDefined()
        })
    })

    test('GIVEN member WHEN updating different household inhabitant THEN returns 403', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            adminContext, {name: salt('Other-Household', testSalt)}, 1
        )
        createdHouseholdIds.push(household.id)

        const memberContext = await memberValidatedBrowserContext(browser)
        await HouseholdFactory.updateInhabitantPreferences(
            memberContext, inhabitants[0]!.id, createDefaultWeekdayMap(DinnerMode.DINEIN), 403
        )
    })

    test('GIVEN removed inhabitant WHEN updating preferences THEN returns 404', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            adminContext, {name: salt('Removed-Inhabitant', temporaryAndRandom())}, 1
        )
        createdHouseholdIds.push(household.id)
        await HouseholdFactory.deleteInhabitant(adminContext, inhabitants[0]!.id, 200)

        const memberContext = await memberValidatedBrowserContext(browser)
        await HouseholdFactory.updateInhabitantPreferences(
            memberContext, inhabitants[0]!.id, createDefaultWeekdayMap(DinnerMode.DINEIN), 404
        )
    })
})

/**
 * Scaffold Result Count Verification Tests
 * Tests that preference transitions produce expected scaffold counts
 *
 * Uses dedicated season with SHORT deadline (0 days) so scaffold can CREATE orders.
 * Deadline constraint: events must be BEFORE deadline for scaffold to CREATE.
 */
test.describe('Preference Transition Scaffold Counts', () => {
    let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>['season']
    let testHouseholdId: number
    let testInhabitantId: number
    const testSalt = temporaryAndRandom()
    const scaffoldSeasonIds: number[] = []
    const scaffoldHouseholdIds: number[] = []

    // Short deadline means all events are BEFORE deadline (scaffold can create)
    const SHORT_CANCEL_PERIOD = 0

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create dedicated season with SHORT deadline so scaffold can CREATE
        const {season} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
            ticketIsCancellableDaysBefore: SHORT_CANCEL_PERIOD
        })
        testSeason = season
        scaffoldSeasonIds.push(season.id as number)

        // Create test household with 1 inhabitant starting with NONE preferences
        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            {name: salt('Test-Scaffold', testSalt)},
            1
        )
        testHouseholdId = household.id
        scaffoldHouseholdIds.push(testHouseholdId)
        testInhabitantId = inhabitants[0]!.id

        // Set initial preferences to NONE
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.NONE)
        }, 200, testSeason.id)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await HouseholdFactory.deleteHousehold(context, scaffoldHouseholdIds)
        await SeasonFactory.cleanupSeasons(context, scaffoldSeasonIds)
    })

    test('NONE → DINEIN creates orders (created > 0)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Get dinner event count for season
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, testSeason.id!)
        const cookingDayCount = dinnerEvents.length

        // Set preferences to NONE first to ensure clean state
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.NONE)
        }, 200, testSeason.id)

        // Change to DINEIN - should create orders
        const result = await HouseholdFactory.updateInhabitant(
            context,
            testInhabitantId,
            {dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)},
            200,
            testSeason.id,
            (response) => {
                expect(response.scaffoldResult.totals[Action.BOOK], 'Should create orders for each cooking day').toBe(cookingDayCount)
                expect(response.scaffoldResult.totals[Action.RELEASE], 'Should not release any orders').toBe(0)
                expect(response.scaffoldResult.totals[Action.CANCEL], 'Should not delete any orders').toBe(0)
            }
        )
        expect(result).not.toBeNull()
    })

    test('DINEIN → NONE removes orders (deleted before deadline)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Get dinner event count for season
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, testSeason.id!)
        const cookingDayCount = dinnerEvents.length

        // Set preferences to DINEIN first to create orders
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
        }, 200, testSeason.id)

        // Change to NONE - with SHORT deadline, orders are DELETED (not released)
        await HouseholdFactory.updateInhabitant(
            context,
            testInhabitantId,
            {dinnerPreferences: createDefaultWeekdayMap(DinnerMode.NONE)},
            200,
            testSeason.id,
            (response) => {
                // Before deadline = deleted, After deadline = released
                expect(response.scaffoldResult.totals[Action.CANCEL] + response.scaffoldResult.totals[Action.RELEASE], 'Should remove all orders').toBe(cookingDayCount)
                expect(response.scaffoldResult.totals[Action.BOOK], 'Should not create any orders').toBe(0)
            }
        )

        // Verify orders are removed (no more BOOKED orders for this inhabitant)
        const dinnerEventIds = dinnerEvents.map(de => de.id)
        const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEventIds)
        const bookedOrders = orders.filter(o => o.inhabitantId === testInhabitantId && o.state === OrderStateSchema.enum.BOOKED)

        expect(bookedOrders.length, 'Should have no BOOKED orders').toBe(0)
    })

    test('DINEIN → TAKEAWAY does NOT release orders (mode change only)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Set preferences to DINEIN first
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: createDefaultWeekdayMap(DinnerMode.DINEIN)
        }, 200, testSeason.id)

        // Change to TAKEAWAY - should NOT release, just update mode
        await HouseholdFactory.updateInhabitant(
            context,
            testInhabitantId,
            {dinnerPreferences: createDefaultWeekdayMap(DinnerMode.TAKEAWAY)},
            200,
            testSeason.id,
            (response) => {
                expect(response.scaffoldResult.totals[Action.RELEASE], 'Should NOT release orders for mode change').toBe(0)
                expect(response.scaffoldResult.totals[Action.BOOK], 'Should not create new orders').toBe(0)
                expect(response.scaffoldResult.totals[Action.CANCEL], 'Should not delete orders').toBe(0)
            }
        )
    })

    test('Same preference is idempotent (unchanged > 0)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const prefs = createDefaultWeekdayMap(DinnerMode.DINEIN)

        // Set preferences to DINEIN
        await HouseholdFactory.updateInhabitant(context, testInhabitantId, {
            dinnerPreferences: prefs
        }, 200, testSeason.id)

        // Set same preferences again - should be unchanged
        await HouseholdFactory.updateInhabitant(
            context,
            testInhabitantId,
            {dinnerPreferences: prefs},
            200,
            testSeason.id,
            (response) => {
                expect(response.scaffoldResult.unchanged, 'Should report unchanged orders').toBeGreaterThan(0)
                expect(response.scaffoldResult.totals[Action.BOOK], 'Should not create orders').toBe(0)
                expect(response.scaffoldResult.totals[Action.RELEASE], 'Should not release orders').toBe(0)
                expect(response.scaffoldResult.totals[Action.CANCEL], 'Should not delete orders').toBe(0)
            }
        )
    })
})
