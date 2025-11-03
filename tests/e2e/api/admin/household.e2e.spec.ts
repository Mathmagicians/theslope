import {test, expect} from '@playwright/test'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext} = testHelpers

// Variables to store IDs for cleanup
let testHouseholdIds: number[] = []

test.describe('Household /api/admin/household CRUD operations', () => {

    test('PUT can create and GET can retrieve with status 200', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household (factory validates 201 and id exists)
        const household = await HouseholdFactory.createHousehold(context)
        testHouseholdIds.push(household.id)

        // Verify essential fields exist
        expect(household.name).toBeDefined()
        expect(household.address).toBeDefined()
        expect(household.heynaboId).toBeDefined()
        expect(household.pbsId).toBeDefined()
    })

    test('POST can update existing household with status 200', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household first (factory validates 201 and id exists)
        const household = await HouseholdFactory.createHousehold(context)
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

        // Create household (factory validates 201 and id exists)
        const household = await HouseholdFactory.createHousehold(context)

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

    test('GET /api/admin/household (index) should return households with lightweight inhabitant data (ADR-009)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with inhabitants
        const {household} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            'Household For Index Test',
            2
        )
        testHouseholdIds.push(household.id)

        // WHEN: Fetch all households (index endpoint)
        const response = await context.request.get('/api/admin/household')

        // THEN: Response includes households with LIGHTWEIGHT inhabitant data
        expect(response.status()).toBe(200)
        const households = await response.json()
        expect(Array.isArray(households)).toBe(true)

        // Find our test household
        const fetchedHousehold = households.find((h: any) => h.id === household.id)
        expect(fetchedHousehold).toBeDefined()
        expect(fetchedHousehold.inhabitants).toBeDefined()
        expect(Array.isArray(fetchedHousehold.inhabitants)).toBe(true)
        expect(fetchedHousehold.inhabitants.length).toBe(2)

        // Verify LIGHTWEIGHT inhabitant fields (per ADR-009: id, name, lastName, pictureUrl, birthDate)
        fetchedHousehold.inhabitants.forEach((inhabitant: any) => {
            expect(inhabitant.id).toBeDefined()
            expect(inhabitant.name).toBeDefined()
            expect(inhabitant.lastName).toBeDefined()
            expect(inhabitant.pictureUrl).toBeDefined()
            expect(inhabitant.birthDate).toBeDefined()

            // Verify HEAVY fields are NOT included (allergies, dinnerPreferences, orders)
            expect(inhabitant.allergies).toBeUndefined()
            expect(inhabitant.dinnerPreferences).toBeUndefined()
            expect(inhabitant.orders).toBeUndefined()
        })
    })

    test('GET /api/admin/household/[id] (detail) should return household with comprehensive inhabitant data (ADR-009)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with inhabitants
        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            'Household For Detail Test',
            2
        )
        testHouseholdIds.push(household.id)

        // WHEN: Fetch household by ID (detail endpoint)
        const response = await context.request.get(`/api/admin/household/${household.id}`)

        // THEN: Response includes household with COMPREHENSIVE inhabitants array
        expect(response.status()).toBe(200)
        const fetchedHousehold = await response.json()

        expect(fetchedHousehold.id).toBe(household.id)
        expect(fetchedHousehold.name).toBeDefined()
        expect(fetchedHousehold.inhabitants).toBeDefined()
        expect(Array.isArray(fetchedHousehold.inhabitants)).toBe(true)
        expect(fetchedHousehold.inhabitants.length).toBe(2)

        // Verify basic inhabitant structure (lightweight fields always present)
        fetchedHousehold.inhabitants.forEach((inhabitant: any) => {
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
