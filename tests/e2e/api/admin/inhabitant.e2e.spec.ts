import {test, expect} from '@playwright/test'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import testHelpers from '~~/tests/e2e/testHelpers'

const {headers, validatedBrowserContext, pollUntil, salt, temporaryAndRandom} = testHelpers

// Variables to store IDs for cleanup
// Only track household - CASCADE will delete all inhabitants (ADR-005)
// BUT users have SET NULL relationship - must track and cleanup separately
let testHouseholdId: number
const createdSeasonIds: number[] = []
const createdUserIds: number[] = []

test.describe('Admin Inhabitant API', () => {

    // Setup test household before all tests
    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const created = await HouseholdFactory.createHousehold(context, {
            name: salt('Test-Household-for-Inhabitant-Tests', testSalt)
        })
        testHouseholdId = created.id as number
        console.info(`Created test household ${created.name} with ID ${testHouseholdId}`)
    })

    test.describe('Inhabitant CRUD Operations', () => {

        test('PUT /api/admin/inhabitant should create a new inhabitant and GET should retrieve it', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testInhabitant = await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId)
            expect(testInhabitant.id).toBeDefined()

            // Verify response structure
            expect(testInhabitant.id).toBeGreaterThanOrEqual(0)
            expect(testInhabitant.householdId).toEqual(testHouseholdId)

            const retrievedInhabitant = await HouseholdFactory.getInhabitantById(context, testInhabitant.id)
            expect(retrievedInhabitant).not.toBeNull()
            expect(retrievedInhabitant!.id).toBe(testInhabitant.id)
            expect(retrievedInhabitant!.name).toBe(testInhabitant.name)
            expect(retrievedInhabitant!.householdId).toBe(testInhabitant.householdId)
        })

        test('GET /api/admin/inhabitant should list all inhabitants', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testInhabitant = await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, 'List-Test-Inhabitant')
            expect(testInhabitant.id).toBeDefined()

            const inhabitants = await HouseholdFactory.getAllInhabitants(context)
            expect(Array.isArray(inhabitants)).toBe(true)

            // Find our created inhabitant
            const foundInhabitant = inhabitants.find(i => i.name.includes(testInhabitant.name) && i.id === testInhabitant.id)
            expect(foundInhabitant).toBeTruthy()
        })

        test('GET /api/admin/inhabitant/[id] should get specific inhabitant details', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const createdInhabitant = await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, 'Details-Test-Inhabitant')
            expect(createdInhabitant.id).toBeDefined()

            // Get inhabitant details
            const inhabitantDetails = await HouseholdFactory.getInhabitantById(context, createdInhabitant.id)
            expect(inhabitantDetails).not.toBeNull()
            expect(inhabitantDetails!.id).toBe(createdInhabitant.id)
            expect(inhabitantDetails!.name).toBe(createdInhabitant.name)
            expect(inhabitantDetails!.householdId).toBe(testHouseholdId)
        })

        test('DELETE /api/admin/inhabitant/[id] should delete the inhabitant', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const createdInhabitant = await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, 'Delete-Test-Inhabitant')
            expect(createdInhabitant.id).toBeDefined()
            // Do not add to cleanup, we are deleting it here

            // Delete the inhabitant
            await HouseholdFactory.deleteInhabitant(context, createdInhabitant.id)

            // Verify inhabitant is deleted
            await HouseholdFactory.getInhabitantById(context, createdInhabitant.id, 404)
        })
    })

    test.describe('Inhabitant with User Account', () => {

        test('PUT /api/admin/inhabitant should create inhabitant with user account', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()
            const testEmail = UserFactory.defaultUser(testSalt).email
            const testInhabitant = await HouseholdFactory.createInhabitantWithUser(context, testHouseholdId, 'User-Test-Inhabitant', testEmail)
            expect(testInhabitant.id).toBeDefined()

            // Verify inhabitant has user association
            expect(testInhabitant.userId).toBeDefined()

            // Track user for cleanup (SET NULL means user survives inhabitant deletion)
            createdUserIds.push(testInhabitant.userId!)
        })

        test('DELETE inhabitant should clear weak association with user account', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()
            const testEmail = UserFactory.defaultUser(testSalt).email
            const testInhabitant = await HouseholdFactory.createInhabitantWithUser(context, testHouseholdId, 'User-Delete-Test-Inhabitant', testEmail)

            const userId = testInhabitant.userId
            expect(userId).toBeDefined()

            // Track user for cleanup (SET NULL means user survives inhabitant deletion)
            createdUserIds.push(userId!)

            // Delete the inhabitant
            await HouseholdFactory.deleteInhabitant(context, testInhabitant.id)

            // Verify inhabitant is deleted
            await HouseholdFactory.getInhabitantById(context, testInhabitant.id, 404)

            // Verify user still exists (weak association)
            const user = await HouseholdFactory.getUserByEmail(context, testEmail)
            expect(user.id).toBe(userId)
            // User should still exist but Inhabitant relation should be null/undefined
            expect(user.Inhabitant).toBeFalsy() // Reference should be cleared
        })
    })

    test.describe('Inhabitant with CookingTeamAssignments', () => {

        test('DELETE should cascade delete cooking team assignments (strong relation)', async ({browser}) => {
            // GIVEN: An inhabitant assigned to a cooking team
            const context = await validatedBrowserContext(browser)

            // Create a season for the team
            const season = await SeasonFactory.createSeason(context)
            createdSeasonIds.push(season.id as number)

            // Create a cooking team with 1 member (creates its own household + inhabitant)
            const team = await SeasonFactory.createCookingTeamWithMembersForSeason(
                context,
                season.id as number,
                salt('Team-For-Cascade-Test'),  // Salted to prevent race conditions
                1  // Single member
            )

            // Verify the team and assignment exist
            expect(team.id).toBeDefined()
            expect(team.assignments.length).toBe(1)
            const assignmentId = team.assignments[0]!.id
            const inhabitantId = team.assignments[0]!.inhabitantId
            expect(assignmentId).toBeDefined()
            expect(inhabitantId).toBeDefined()

            // Verify assignment exists via GET
            const assignmentResponse = await context.request.get(`/api/admin/team/assignment/${assignmentId}`)
            expect(assignmentResponse.status()).toBe(200)

            // WHEN: Inhabitant is deleted
            await HouseholdFactory.deleteInhabitant(context, inhabitantId)

            // THEN: Inhabitant should be deleted
            await HouseholdFactory.getInhabitantById(context, inhabitantId, 404)

            // AND: Cooking team assignment should be cascade deleted (poll for DB cascade)
            await pollUntil(
                async () => {
                    const response = await context.request.get(`/api/admin/team/assignment/${assignmentId}`)
                    return response.status()
                },
                (status) => status === 404,
                10
            )
            const assignmentAfterDelete = await context.request.get(`/api/admin/team/assignment/${assignmentId}`)
            expect(assignmentAfterDelete.status()).toBe(404)

            // Cleanup: Delete season (cascades to team), then household
            await SeasonFactory.deleteSeason(context, season.id as number)
            await HouseholdFactory.deleteHousehold(context, team.householdId)
        })
    })

    test.describe('POST /api/admin/inhabitant/[id]', () => {

        test('GIVEN inhabitant exists WHEN updating dinner preferences THEN preferences are updated and other fields unchanged', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            const {DinnerModeSchema} = useBookingValidation()
            const {createDefaultWeekdayMap} = useWeekDayMapValidation({
                valueSchema: DinnerModeSchema,
                defaultValue: 'NONE'
            })

            const createdInhabitant = await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, 'DinnerPref-Test-Inhabitant')
            expect(createdInhabitant.id).toBeDefined()

            const newPreferences = createDefaultWeekdayMap(['DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN', 'TAKEAWAY', 'NONE', 'NONE'])

            const response = await context.request.post(`/api/admin/household/inhabitants/${createdInhabitant.id}`, {
                headers,
                data: {dinnerPreferences: newPreferences}
            })

            expect(response.status()).toBe(200)
            const updated = await response.json()

            // Response is InhabitantUpdateResponse: { inhabitant, scaffoldResult }
            expect(updated.inhabitant.dinnerPreferences).toEqual(newPreferences)
            expect(updated.inhabitant.name).toBe(createdInhabitant.name)
            expect(updated.inhabitant.birthDate).toBe(createdInhabitant.birthDate)
            expect(updated.inhabitant.householdId).toBe(createdInhabitant.householdId)
            expect(updated.scaffoldResult).toBeDefined()
        })
    })

    test.describe('Preference Re-scaffolding', () => {
        // Each test creates its own season with explicit seasonId for parallel-safe execution
        // Cleanup tracked via scaffoldTestHouseholdIds array, deleted in afterAll

        const scaffoldTestHouseholdIds: number[] = []
        const scaffoldTestSeasonIds: number[] = []

        // Shared setup helpers
        const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
        const DinnerMode = DinnerModeSchema.enum
        const OrderState = OrderStateSchema.enum
        const {createDefaultWeekdayMap} = useWeekDayMapValidation({
            valueSchema: DinnerModeSchema,
            defaultValue: DinnerMode.NONE
        })
        const ALL_DINEIN = createDefaultWeekdayMap([DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN])
        const ALL_NONE = createDefaultWeekdayMap([DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE])

        // Cancel period longer than season span so dinners are past deadline → RELEASED
        // ADR-015: Before deadline → DELETE (user not charged), After deadline → RELEASE (user charged)
        // Season spans 7 days from tomorrow (day +1 to +8), so 9-day deadline ensures all dinners
        // are past deadline even when test runs before dinner time (18:00) on day 0
        // (8-day deadline for day +8 dinner = today at 18:00, still deletable if test runs earlier)
        const LONG_CANCEL_PERIOD = 9

        test.afterAll(async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            await HouseholdFactory.deleteHousehold(context, scaffoldTestHouseholdIds)
            await SeasonFactory.cleanupSeasons(context, scaffoldTestSeasonIds)
        })

        // Parametrized test for create/delete preference changes
        const preferenceChangeTests = [
            {name: 'NONE→DINEIN creates orders', from: ALL_NONE, to: ALL_DINEIN, expectCreated: true},
            {name: 'DINEIN→NONE removes orders (deleted or released)', from: ALL_DINEIN, to: ALL_NONE, expectCreated: false}
        ] as const

        preferenceChangeTests.forEach(({name, from, to, expectCreated}) => {
            test(`GIVEN season WHEN preference changes ${name}`, async ({browser}) => {
                const context = await validatedBrowserContext(browser)
                const testSalt = temporaryAndRandom()

                // GIVEN: Season with LONG_CANCEL_PERIOD to observe RELEASE behavior
                // ADR-015: Before deadline → DELETE, After deadline → RELEASE
                const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
                    ticketIsCancellableDaysBefore: LONG_CANCEL_PERIOD
                })
                scaffoldTestSeasonIds.push(season.id as number)

                const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                    context, {name: salt('Pref-Change-Test', testSalt)}, 1
                )
                scaffoldTestHouseholdIds.push(household.id)
                const inhabitant = inhabitants[0]!

                // Set initial preferences
                await HouseholdFactory.updateInhabitant(context, inhabitant.id, {dinnerPreferences: from}, 200, season.id)

                const ordersBefore = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
                const inhabitantOrdersBefore = ordersBefore.filter(o => o.inhabitantId === inhabitant.id)

                // Verify setup: dinner events exist, orders match initial preferences
                expect(dinnerEvents.length, 'Season should have dinner events').toBeGreaterThan(0)
                if (expectCreated) {
                    // NONE→DINEIN: Starting with NONE preferences means no initial orders
                    expect(inhabitantOrdersBefore.length, 'Starting with NONE should have no orders').toBe(0)
                } else {
                    // DINEIN→NONE: Starting with DINEIN preferences creates orders for all dinners
                    expect(inhabitantOrdersBefore.length, 'Starting with DINEIN should have orders for all dinners').toBe(dinnerEvents.length)
                }

                // WHEN: Change preferences
                await HouseholdFactory.updateInhabitant(
                    context, inhabitant.id, {dinnerPreferences: to}, 200, season.id,
                    ({scaffoldResult}) => {
                        expect(scaffoldResult.seasonId).toBe(season.id)
                        if (expectCreated) {
                            expect(scaffoldResult.created).toBeGreaterThan(0)
                        } else {
                            // ADR-015: With LONG_CANCEL_PERIOD all dinners are past deadline → all RELEASED
                            expect(scaffoldResult.deleted, `No orders should be deleted (released=${scaffoldResult.released}, deleted=${scaffoldResult.deleted}, unchanged=${scaffoldResult.unchanged})`).toBe(0)
                            expect(scaffoldResult.unchanged, `No orders should be unchanged (released=${scaffoldResult.released}, deleted=${scaffoldResult.deleted}, unchanged=${scaffoldResult.unchanged})`).toBe(0)
                            expect(scaffoldResult.released, `Expected ${inhabitantOrdersBefore.length} orders released`).toBe(inhabitantOrdersBefore.length)
                        }
                    }
                )

                // THEN: Verify orders state
                const ordersAfter = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
                const inhabitantOrdersAfter = ordersAfter.filter(o => o.inhabitantId === inhabitant.id)

                if (expectCreated) {
                    expect(inhabitantOrdersAfter.length).toBeGreaterThan(0)
                } else {
                    // ADR-015: RELEASED orders remain in DB (user charged), no BOOKED orders remain
                    const releasedOrdersAfter = inhabitantOrdersAfter.filter(o => o.state === OrderState.RELEASED)
                    expect(releasedOrdersAfter.length, 'All orders should be released').toBe(inhabitantOrdersBefore.length)
                    const bookedOrdersAfter = inhabitantOrdersAfter.filter(o => o.state === OrderState.BOOKED)
                    expect(bookedOrdersAfter.length, 'No BOOKED orders should remain').toBe(0)
                }
            })
        })

        test('GIVEN USER_CANCELLED order WHEN preferences re-saved THEN cancelled order NOT recreated', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // GIVEN: Season + household + scaffolded orders
            const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt)
            scaffoldTestSeasonIds.push(season.id as number)

            const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                context, {name: salt('Cancel-Respect-Test', testSalt)}, 1
            )
            scaffoldTestHouseholdIds.push(household.id)
            const inhabitant = inhabitants[0]!

            // Scaffold initial orders
            await HouseholdFactory.updateInhabitant(context, inhabitant.id, {dinnerPreferences: ALL_DINEIN}, 200, season.id)

            const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
            const inhabitantOrders = orders.filter(o => o.inhabitantId === inhabitant.id)
            expect(inhabitantOrders.length).toBeGreaterThan(0)

            // User cancels one specific order (creates USER_CANCELLED audit)
            const orderToCancel = inhabitantOrders[0]!
            await OrderFactory.deleteOrder(context, orderToCancel.id)

            // WHEN: Re-save same preferences
            await HouseholdFactory.updateInhabitant(context, inhabitant.id, {dinnerPreferences: ALL_DINEIN}, 200, season.id)

            // THEN: Cancelled order NOT recreated
            const ordersAfter = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
            const inhabitantOrdersAfter = ordersAfter.filter(o => o.inhabitantId === inhabitant.id)
            expect(inhabitantOrdersAfter.length).toBe(inhabitantOrders.length - 1)

            const cancelledDinnerOrders = ordersAfter.filter(
                o => o.dinnerEventId === orderToCancel.dinnerEventId && o.inhabitantId === inhabitant.id
            )
            expect(cancelledDinnerOrders.length).toBe(0)
        })

        // Real-world scenario: Admin adds/corrects a child's birthdate after initial household setup.
        // Without birthdate, inhabitant is treated as ADULT (unknown age = adult pricing).
        // When birthdate is added and shows they're a child, existing orders must update to CHILD pricing.
        // This triggers re-scaffolding via inhabitant POST endpoint when birthDate field changes.
        test('GIVEN adult inhabitant with orders WHEN birthdate added (becomes child) THEN orders updated with CHILD price', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()
            const {TicketTypeSchema} = useBookingValidation()
            const TicketType = TicketTypeSchema.enum

            // GIVEN: Season + household with adult inhabitant (no birthdate = unknown age = ADULT pricing)
            const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt)
            scaffoldTestSeasonIds.push(season.id as number)

            // Create inhabitant WITHOUT birthdate (will be adult by default)
            const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                context, {name: salt('Price-Category-Test', testSalt)}, 1
            )
            scaffoldTestHouseholdIds.push(household.id)
            const inhabitant = inhabitants[0]!

            // Scaffold initial orders as adult
            await HouseholdFactory.updateInhabitant(context, inhabitant.id, {dinnerPreferences: ALL_DINEIN}, 200, season.id)

            const ordersBefore = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
            const inhabitantOrdersBefore = ordersBefore.filter(o => o.inhabitantId === inhabitant.id)
            expect(inhabitantOrdersBefore.length).toBeGreaterThan(0)

            // Verify all orders have ADULT ticket type
            inhabitantOrdersBefore.forEach(order => {
                expect(order.ticketType, `Order ${order.id} should have ADULT ticket`).toBe(TicketType.ADULT)
            })

            // WHEN: Add birthdate that makes inhabitant a child (e.g., 8 years old)
            const childBirthdate = new Date()
            childBirthdate.setFullYear(childBirthdate.getFullYear() - 8)
            await HouseholdFactory.updateInhabitant(
                context, inhabitant.id, {birthDate: childBirthdate}, 200, season.id,
                ({scaffoldResult}) => {
                    expect(scaffoldResult.priceUpdated, 'Should have price updates').toBeGreaterThan(0)
                    expect(scaffoldResult.released, 'No releases expected').toBe(0)
                }
            )

            // THEN: All orders should have CHILD ticket type
            const ordersAfter = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
            const inhabitantOrdersAfter = ordersAfter.filter(o => o.inhabitantId === inhabitant.id && o.state === OrderState.BOOKED)
            expect(inhabitantOrdersAfter.length, 'Same number of booked orders').toBe(inhabitantOrdersBefore.length)

            inhabitantOrdersAfter.forEach(order => {
                expect(order.ticketType, `Order ${order.id} should now have CHILD ticket`).toBe(TicketType.CHILD)
            })
        })

        test('GIVEN two households WHEN household A updates preferences THEN only household A gets orders (householdId filter works)', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // GIVEN: Season + two households (both with DINEIN preferences set at creation)
            const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt)
            scaffoldTestSeasonIds.push(season.id as number)

            const households = await Promise.all([
                HouseholdFactory.createHouseholdWithInhabitants(context, {name: salt('HouseholdA', testSalt)}, 1),
                HouseholdFactory.createHouseholdWithInhabitants(context, {name: salt('HouseholdB', testSalt)}, 1)
            ])
            households.forEach(h => scaffoldTestHouseholdIds.push(h.household.id))

            const [inhabitantA, inhabitantB] = households.map(h => h.inhabitants[0]!)
            expect(inhabitantA).toBeDefined()
            expect(inhabitantB).toBeDefined()

            // Verify no orders exist yet
            const ordersBefore = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
            expect(ordersBefore.filter(o => o.inhabitantId === inhabitantA!.id).length).toBe(0)
            expect(ordersBefore.filter(o => o.inhabitantId === inhabitantB!.id).length).toBe(0)

            // WHEN: A updates preferences (scaffolds only for A, householdId filter applied)
            await HouseholdFactory.updateInhabitant(context, inhabitantA!.id, {dinnerPreferences: ALL_DINEIN}, 200, season.id,
                ({scaffoldResult}) => expect(scaffoldResult.households).toBe(1)
            )

            // THEN: Only A has orders - B should still have 0 (householdId filter worked)
            const ordersAfter = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvents.map(e => e.id))
            expect(ordersAfter.filter(o => o.inhabitantId === inhabitantA!.id).length).toBeGreaterThan(0)
            expect(ordersAfter.filter(o => o.inhabitantId === inhabitantB!.id).length).toBe(0)
        })

        test('GIVEN no seasonId provided WHEN preferences updated THEN active season used', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testSalt = temporaryAndRandom()

            // Ensure active season exists
            const activeSeason = await SeasonFactory.createActiveSeason(context)

            const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
                context, {name: salt('Active-Season-Test', testSalt)}, 1
            )
            scaffoldTestHouseholdIds.push(household.id)
            const inhabitant = inhabitants[0]!

            // WHEN: Update preferences WITHOUT seasonId - endpoint uses active season
            await HouseholdFactory.updateInhabitant(
                context, inhabitant.id, {dinnerPreferences: ALL_DINEIN}, 200, undefined,
                ({inhabitant, scaffoldResult}) => {
                    expect(inhabitant).toBeDefined()
                    expect(scaffoldResult.seasonId).toBe(activeSeason.id)
                }
            )
        })
    })

    test.describe('Validation and Error Handling', () => {

        test('PUT /api/admin/inhabitant should reject invalid inhabitant data', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to create inhabitant without householdId - should fail
            await HouseholdFactory.createInhabitantForHousehold(context, 0, 'Invalid-Test-Inhabitant', null, 400)
        })

        test('PUT /api/admin/inhabitant should reject empty name', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to create inhabitant with empty name - should fail
            await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, '', null, 400)
        })

        test('GET /api/admin/inhabitant/[id] should return 404 for non-existent inhabitant', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to get non-existent inhabitant - should return 404
            await HouseholdFactory.getInhabitantById(context, 99999, 404)
        })

        test('DELETE /api/admin/inhabitant/[id] should return 404 for non-existent inhabitant', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to delete non-existent inhabitant - should return 404
            await HouseholdFactory.deleteInhabitant(context, 99999, 404)
        })
    })

    // Cleanup after all tests
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Clean up seasons created in individual tests (CASCADE deletes teams and assignments per ADR-005)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)

        // Clean up the test household (CASCADE deletes all inhabitants automatically per ADR-005)
        if (testHouseholdId) {
            try {
                await HouseholdFactory.deleteHousehold(context, testHouseholdId)
                console.info(`Cleaned up test household ${testHouseholdId} (cascade deleted all inhabitants)`)
            } catch (error) {
                console.warn(`Failed to cleanup test household ${testHouseholdId}:`, error)
            }
        }

        // Clean up users created via createInhabitantWithUser (SET NULL means they survive inhabitant deletion)
        if (createdUserIds.length > 0) {
            await UserFactory.cleanupUsers(context, createdUserIds)
            console.info(`Cleaned up ${createdUserIds.length} test user(s)`)
        }
    })
})
