import {test, expect} from '@playwright/test'
import {useHouseholdValidation} from '~/composables/useHouseholdValidation'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'
import testHelpers from '../../testHelpers'

const {InhabitantResponseSchema} = useHouseholdValidation()
const {headers, validatedBrowserContext} = testHelpers

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

            // Validate the response matches our schema
            expect(() => InhabitantResponseSchema.parse(testInhabitant)).not.toThrow()

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
            const testInhabitant = await HouseholdFactory.createInhabitantWithUser(context, testHouseholdId, 'User-Delete-Test-Inhabitant', 'userdelete@example.com')

            const userId = testInhabitant.userId
            expect(userId).toBeDefined()

            // Delete the inhabitant
            await HouseholdFactory.deleteInhabitant(context, testInhabitant.id)

            // Verify inhabitant is deleted
            await HouseholdFactory.getInhabitantById(context, testInhabitant.id, 404)

            // Verify user still exists (weak association)
            const user = await HouseholdFactory.getUserById(context, userId)
            expect(user.id).toBe(userId)
            expect(user.inhabitantId).toBeNull() // Reference should be cleared
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