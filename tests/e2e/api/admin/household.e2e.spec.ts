import {test, expect} from '@playwright/test'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers

// Variables to store IDs for cleanup
let testHouseholdIds: number[] = []

test.describe('Household /api/admin/household CRUD operations', () => {

    test('PUT can create and GET can retrieve with status 200', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household
        const household = await HouseholdFactory.createHousehold(context, 'Test Household Creation')
        expect(household.id).toBeDefined()
        testHouseholdIds.push(household.id)

        // Verify response structure
        expect(household.id).toBeGreaterThanOrEqual(0)
        expect(household.name).toBe('Test Household Creation')
        expect(household.address).toContain('123 Andeby')
        expect(household.heynaboId).toBeDefined()
        expect(household.pbsId).toBeDefined()
    })

    test('POST can update existing household with status 200', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household first
        const household = await HouseholdFactory.createHousehold(context, 'Original Name')
        testHouseholdIds.push(household.id)

        // Update household
        const updatedData = {
            name: 'Updated Household Name',
            address: 'Updated Address 456'
        }

        const response = await context.request.post(`/api/admin/household/${household.id}`, {
            headers: {'Content-Type': 'application/json'},
            data: updatedData
        })

        expect(response.status()).toBe(200)
        const updatedHousehold = await response.json()
        expect(updatedHousehold.name).toBe(updatedData.name)
        expect(updatedHousehold.address).toBe(updatedData.address)
        expect(updatedHousehold.id).toBe(household.id)
    })

    test('DELETE can remove existing household with status 200', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household
        const household = await HouseholdFactory.createHousehold(context, 'Household To Delete')

        // Delete household
        const deletedHousehold = await HouseholdFactory.deleteHousehold(context, household.id)
        expect(deletedHousehold.id).toBe(household.id)

        // Verify household is deleted - should get 404
        const response = await context.request.get(`/api/admin/household/${household.id}`)
        expect(response.status()).toBe(404)
    })

    test('PUT can create household with inhabitants', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household with inhabitants
        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            'Household With Inhabitants',
            3
        )
        testHouseholdIds.push(household.id)

        expect(household.id).toBeDefined()
        expect(inhabitants.length).toBe(3)
        inhabitants.forEach(inhabitant => {
            expect(inhabitant.id).toBeDefined()
            expect(inhabitant.householdId).toBe(household.id)
            expect(inhabitant.name).toBeDefined()
            expect(inhabitant.lastName).toBeDefined()
        })
    })

    test('DELETE should cascade delete inhabitants (strong relation)', async ({browser}) => {
        // GIVEN: A household with inhabitants
        const context = await validatedBrowserContext(browser)
        const result = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            'Household For Cascade Delete',
            3
        )
        // Don't add to cleanup - we're testing deletion

        // Verify inhabitants were created (returned IDs prove creation succeeded)
        expect(result.household.id).toBeGreaterThan(0)
        expect(result.inhabitants.length).toBe(3)

        const inhabitantIds = result.inhabitants.map(i => i.id)
        expect(inhabitantIds[0]).toBeGreaterThan(0)
        expect(inhabitantIds[1]).toBeGreaterThan(0)
        expect(inhabitantIds[2]).toBeGreaterThan(0)

        // WHEN: Household is deleted
        await HouseholdFactory.deleteHousehold(context, result.household.id)

        // THEN: All inhabitants should be cascade deleted
        const checksAfter = await Promise.all(
            inhabitantIds.map(id => context.request.get(`/api/admin/inhabitant/${id}`))
        )
        checksAfter.forEach(response => {
            expect(response.status()).toBe(404)
        })
    })

    test('GET /api/admin/household/[id] should return 404 for non-existent household', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const response = await context.request.get('/api/admin/household/99999')
        expect(response.status()).toBe(404)
    })

    test('DELETE /api/admin/household/[id] should return 404 for non-existent household', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        await HouseholdFactory.deleteHousehold(context, 99999, 404)
    })

    // Cleanup after all tests
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Clean up all created households
        await Promise.all(testHouseholdIds.map(id => HouseholdFactory.deleteHousehold(context, id).catch(error => {
            // Ignore cleanup errors
            console.warn(`Failed to cleanup household ${id}:`, error)
        })))
    })
})
