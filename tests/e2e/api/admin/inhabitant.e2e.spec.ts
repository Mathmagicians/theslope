import {test, expect} from '@playwright/test'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import testHelpers from '../../testHelpers'

const {headers, validatedBrowserContext, pollUntil} = testHelpers

// Variables to store IDs for cleanup
let testHouseholdId: number
let testInhabitantIds: number[] = []

test.describe('Admin Inhabitant API', () => {

    // Setup test household before all tests
    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const created = await HouseholdFactory.createHousehold(context, 'Test-Household-for-Inhabitant-Tests')
        testHouseholdId = created.id as number
        console.info(`Created test household ${created.name} with ID ${testHouseholdId}`)
    })

    test.describe('Inhabitant CRUD Operations', () => {

        test('PUT /api/admin/inhabitant should create a new inhabitant and GET should retrieve it', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testInhabitant = await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId)
            expect(testInhabitant.id).toBeDefined()
            testInhabitantIds.push(testInhabitant.id)

            // Verify response structure
            expect(testInhabitant.id).toBeGreaterThanOrEqual(0)
            expect(testInhabitant.householdId).toEqual(testHouseholdId)

            const retrievedInhabitant = await HouseholdFactory.getInhabitantById(context, testInhabitant.id)
            expect(retrievedInhabitant.id).toBe(testInhabitant.id)
            expect(retrievedInhabitant.name).toBe(testInhabitant.name)
            expect(retrievedInhabitant.householdId).toBe(testInhabitant.householdId)
        })

        test('GET /api/admin/inhabitant should list all inhabitants', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testInhabitant = await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, 'List-Test-Inhabitant')
            expect(testInhabitant.id).toBeDefined()
            testInhabitantIds.push(testInhabitant.id)

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
            testInhabitantIds.push(createdInhabitant.id)

            // Get inhabitant details
            const inhabitantDetails = await HouseholdFactory.getInhabitantById(context, createdInhabitant.id)
            expect(inhabitantDetails.id).toBe(createdInhabitant.id)
            expect(inhabitantDetails.name).toBe(createdInhabitant.name)
            expect(inhabitantDetails.householdId).toBe(testHouseholdId)
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
            const testInhabitant = await HouseholdFactory.createInhabitantWithUser(context, testHouseholdId, 'User-Test-Inhabitant', 'usertest@example.com')
            expect(testInhabitant.id).toBeDefined()
            testInhabitantIds.push(testInhabitant.id)

            // Verify inhabitant has user association
            expect(testInhabitant.userId).toBeDefined()
        })

        test('DELETE inhabitant should clear weak association with user account', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const testEmail = 'userdelete@example.com'
            const testInhabitant = await HouseholdFactory.createInhabitantWithUser(context, testHouseholdId, 'User-Delete-Test-Inhabitant', testEmail)

            const userId = testInhabitant.userId
            expect(userId).toBeDefined()

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

            // Create a cooking team with 1 member (creates its own household + inhabitant)
            const team = await SeasonFactory.createCookingTeamWithMembersForSeason(
                context,
                season.id as number,
                'Team-For-Cascade-Test',
                1  // Single member
            )

            // Verify the team and assignment exist
            expect(team.id).toBeDefined()
            expect(team.assignments.length).toBe(1)
            const assignmentId = team.assignments[0].id
            const inhabitantId = team.assignments[0].inhabitantId
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
            const {useWeekDayMapValidation} = await import('~/composables/useWeekDayMapValidation')
            const {DinnerModeSchema} = await import('~/composables/useDinnerEventValidation')

            const {createDefaultWeekdayMap} = useWeekDayMapValidation({
                valueSchema: DinnerModeSchema,
                defaultValue: 'NONE'
            })

            const createdInhabitant = await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, 'DinnerPref-Test-Inhabitant')
            expect(createdInhabitant.id).toBeDefined()
            testInhabitantIds.push(createdInhabitant.id)

            const newPreferences = createDefaultWeekdayMap(['DINEIN', 'TAKEAWAY', 'NONE', 'DINEIN', 'TAKEAWAY', 'NONE', 'NONE'])

            const response = await context.request.post(`/api/admin/household/inhabitants/${createdInhabitant.id}`, {
                headers,
                data: {dinnerPreferences: newPreferences}
            })

            expect(response.status()).toBe(200)
            const updated = await response.json()

            expect(updated.dinnerPreferences).toEqual(newPreferences)
            expect(updated.name).toBe(createdInhabitant.name)
            expect(updated.birthDate).toBe(createdInhabitant.birthDate)
            expect(updated.householdId).toBe(createdInhabitant.householdId)
        })
    })

    test.describe('Validation and Error Handling', () => {

        test('PUT /api/admin/inhabitant should reject invalid inhabitant data', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to create inhabitant without householdId - should fail
            await HouseholdFactory.createInhabitantForHousehold(context, 0, 'Invalid-Test-Inhabitant', 400)
        })

        test('PUT /api/admin/inhabitant should reject empty name', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Try to create inhabitant with empty name - should fail
            await HouseholdFactory.createInhabitantForHousehold(context, testHouseholdId, '', 400)
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

        // Clean up all created inhabitants
        await Promise.all(testInhabitantIds.map(id => HouseholdFactory.deleteInhabitant(context, id).catch(error => {
            // Ignore cleanup errors
            console.warn(`Failed to cleanup inhabitant ${id}:`, error)
        })))

        // Clean up the test household
        if (testHouseholdId) {
            try {
                await HouseholdFactory.deleteHousehold(context, testHouseholdId)
            } catch (error) {
                console.warn(`Failed to cleanup test household ${testHouseholdId}:`, error)
            }
        }
    })
})
