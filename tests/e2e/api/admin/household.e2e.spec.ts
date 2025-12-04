import {test, expect} from '@playwright/test'
import {HouseholdFactory} from '../../testDataFactories/householdFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext, salt} = testHelpers

// Variables to store IDs for cleanup
const testHouseholdIds: number[] = []

/**
 * Helper: Verify household response structure
 * Server validates against HouseholdDetail schema - we verify key fields
 */
function verifyHouseholdStructure(household: unknown, context: string) {
    expect(household.id, `${context}: missing id`).toBeDefined()
    expect(household.name, `${context}: missing name`).toBeDefined()
    expect(household.address, `${context}: missing address`).toBeDefined()
    expect(household.heynaboId, `${context}: missing heynaboId`).toBeDefined()
    expect(household.pbsId, `${context}: missing pbsId`).toBeDefined()
    expect(household.inhabitants, `${context}: missing inhabitants`).toBeDefined()
    expect(Array.isArray(household.inhabitants), `${context}: inhabitants not array`).toBe(true)
}

/**
 * Helper: Verify lightweight inhabitant data (ADR-009 index endpoint)
 */
function verifyLightweightInhabitant(inhabitant: unknown, context: string) {
    // Required fields
    expect(inhabitant.id, `${context}: missing id`).toBeDefined()
    expect(inhabitant.heynaboId, `${context}: missing heynaboId`).toBeDefined()
    expect(inhabitant.name, `${context}: missing name`).toBeDefined()
    expect(inhabitant.lastName, `${context}: missing lastName`).toBeDefined()
    expect(inhabitant.pictureUrl, `${context}: missing pictureUrl`).toBeDefined()
    expect(inhabitant.birthDate, `${context}: missing birthDate`).toBeDefined()

    // dinnerPreferences should be included (nullable string - lightweight data)
    expect(inhabitant.dinnerPreferences !== undefined, `${context}: dinnerPreferences is undefined`).toBe(true)
    expect(
        inhabitant.dinnerPreferences === null || typeof inhabitant.dinnerPreferences === 'string',
        `${context}: dinnerPreferences wrong type`
    ).toBe(true)

    // Heavy fields should NOT be included
    expect(inhabitant.allergies, `${context}: allergies should be undefined`).toBeUndefined()
    expect(inhabitant.orders, `${context}: orders should be undefined`).toBeUndefined()
}

test.describe('Household /api/admin/household CRUD operations', () => {

    test('PUT can create household with valid structure', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household (factory validates 201 and id exists)
        const household = await HouseholdFactory.createHousehold(context)
        testHouseholdIds.push(household.id)

        // Verify response structure (server validates against HouseholdDetail schema)
        verifyHouseholdStructure(household, 'PUT household')
    })

    test('POST can update household with valid structure', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household first
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

        const errorBody = response.status() !== 200 ? await response.text() : ''
        expect(response.status(), `Expected 200 but got ${response.status()}. Error: ${errorBody}`).toBe(200)

        const updatedHousehold = await response.json()

        // Verify response structure (server validates against HouseholdDetail schema)
        verifyHouseholdStructure(updatedHousehold, 'POST household')

        // Verify updates applied
        expect(updatedHousehold.name).toBe(updatedData.name)
        expect(updatedHousehold.address).toBe(updatedData.address)
        expect(updatedHousehold.id).toBe(household.id)
    })

    test('DELETE can remove household with valid structure', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household
        const household = await HouseholdFactory.createHousehold(context)

        // Delete household
        const deletedHousehold = await HouseholdFactory.deleteHousehold(context, household.id)

        // Verify response structure (server validates against HouseholdDetail schema)
        verifyHouseholdStructure(deletedHousehold, 'DELETE household')

        expect(deletedHousehold.id).toBe(household.id)

        // Verify household is deleted - should get 404
        const response = await context.request.get(`/api/admin/household/${household.id}`)
        expect(response.status()).toBe(404)
    })

    test('PUT can create household with inhabitants', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household with inhabitants (with unique data for parallel execution)
        const testSalt = Date.now().toString()
        const {household} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            {name: salt('Household With Inhabitants', testSalt)},
            2
        )
        testHouseholdIds.push(household.id)

        // Verify response structure (server validates against HouseholdDetail schema)
        verifyHouseholdStructure(household, 'PUT household with inhabitants')

        // Verify inhabitants array structure
        expect(household.inhabitants.length).toBe(2)
        household.inhabitants.forEach((inhabitant: unknown) => {
            expect(inhabitant.householdId).toBe(household.id)
        })
    })

    test('GET /api/admin/household (index) returns households with lightweight inhabitant data (ADR-009)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with inhabitants (with unique data for parallel execution)
        const testSalt = Date.now().toString()
        const {household} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            HouseholdFactory.defaultHouseholdData(testSalt),
            2
        )
        testHouseholdIds.push(household.id)

        // WHEN: Fetch all households (index endpoint)
        const response = await context.request.get('/api/admin/household')

        // THEN: Response is valid array of HouseholdDisplay (server validates against schema)
        expect(response.status()).toBe(200)
        const households = await response.json()
        expect(Array.isArray(households)).toBe(true)

        // Find our test household
        const fetchedHousehold = households.find((h: unknown) => h.id === household.id)
        expect(fetchedHousehold).toBeDefined()

        // Verify lightweight structure (ADR-009: index endpoints return lightweight data)
        verifyHouseholdStructure(fetchedHousehold, 'GET /api/admin/household (index)')
        expect(fetchedHousehold.inhabitants.length).toBe(2)

        // Verify each inhabitant has lightweight fields only
        fetchedHousehold.inhabitants.forEach((inhabitant: unknown, index: number) => {
            verifyLightweightInhabitant(inhabitant, `Inhabitant[${index}]`)
        })
    })

    test('GET /api/admin/household/[id] (detail) returns household with comprehensive data (ADR-009)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with inhabitants (with unique data for parallel execution)
        const testSalt = Date.now().toString()
        const {household} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            {name: salt('Household For Detail Test', testSalt)},
            2
        )
        testHouseholdIds.push(household.id)

        // WHEN: Fetch household by ID (detail endpoint)
        const response = await context.request.get(`/api/admin/household/${household.id}`)

        // THEN: Response is valid HouseholdDetail (server validates against schema)
        expect(response.status()).toBe(200)
        const fetchedHousehold = await response.json()

        // Verify response structure
        verifyHouseholdStructure(fetchedHousehold, 'GET /api/admin/household/[id]')

        // Verify data integrity
        expect(fetchedHousehold.id).toBe(household.id)
        expect(fetchedHousehold.inhabitants.length).toBe(2)
    })

    test('DELETE cascades to inhabitants (strong relation - ADR-005)', async ({browser}) => {
        // GIVEN: A household with inhabitants (with unique data for parallel execution)
        const context = await validatedBrowserContext(browser)
        const testSalt = Date.now().toString()
        const result = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            {name: salt('Household For Cascade Delete', testSalt)},
            2
        )
        // Don't add to cleanup - we're testing deletion

        // Verify inhabitants were created
        expect(result.household.id).toBeGreaterThan(0)
        expect(result.inhabitants.length).toBe(2)

        const inhabitantIds = result.inhabitants.map(i => i.id)

        // WHEN: Household is deleted
        await HouseholdFactory.deleteHousehold(context, result.household.id)

        // THEN: All inhabitants should be cascade deleted
        const checksAfter = await Promise.all(
            inhabitantIds.map(id => context.request.get(`/api/admin/household/inhabitants/${id}`))
        )
        checksAfter.forEach(response => {
            expect(response.status()).toBe(404)
        })
    })

    // Parametrized 404 tests
    test.describe('404 error handling', () => {
        const nonExistentId = 99999

        const testCases = [
            {method: 'GET', description: 'GET detail'},
            {method: 'DELETE', description: 'DELETE'}
        ]

        testCases.forEach(({method, description}) => {
            test(`${description} returns 404 for non-existent household`, async ({browser}) => {
                const context = await validatedBrowserContext(browser)

                if (method === 'DELETE') {
                    await HouseholdFactory.deleteHousehold(context, nonExistentId, 404)
                } else {
                    const response = await context.request.get(`/api/admin/household/${nonExistentId}`)
                    expect(response.status()).toBe(404)
                }
            })
        })
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
