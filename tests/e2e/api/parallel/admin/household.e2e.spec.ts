import {test, expect} from '@playwright/test'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import type {HouseholdDisplay, InhabitantDisplay} from '~/composables/useCoreValidation'

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, temporaryAndRandom, saltedId, salt} = testHelpers

// Variables to store IDs for cleanup
const testHouseholdIds: number[] = []
// Seeded households renamed by a test; the cleanup puts the original name back
const renamedHouseholds: {id: number, name: string}[] = []

/**
 * Helper: Verify household response structure
 * Server validates against HouseholdDetail schema - we verify key fields
 */
function verifyHouseholdStructure(household: HouseholdDisplay, context: string) {
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
function verifyLightweightInhabitant(inhabitant: InhabitantDisplay, context: string) {
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

    // Heavy fields should NOT be included - use type assertion for checking absence
    expect((inhabitant as Record<string, unknown>).allergies, `${context}: allergies should be undefined`).toBeUndefined()
    expect((inhabitant as Record<string, unknown>).orders, `${context}: orders should be undefined`).toBeUndefined()
}

test.describe('Household /api/admin/household CRUD operations', () => {

    // POST /api/household/[id]/update — self-service with optional admin bypass
    const updateCases = [
        {desc: 'member updates own household', actor: 'member' as const, ownHousehold: true, adminBypass: false, expected: 200},
        {desc: 'admin with bypass updates other household', actor: 'admin' as const, ownHousehold: false, adminBypass: true, expected: 200},
        {desc: 'member cannot update other household', actor: 'member' as const, ownHousehold: false, adminBypass: false, expected: 403},
    ]

    updateCases.forEach(({desc, actor, ownHousehold, adminBypass, expected}) => {
        test(`POST update: ${desc} → ${expected}`, async ({browser}) => {
            const adminContext = await validatedBrowserContext(browser)
            const memberContext = await memberValidatedBrowserContext(browser)
            const actorContext = actor === 'member' ? memberContext : adminContext

            const householdId = ownHousehold
                ? (await getSessionUserInfo(memberContext)).householdId
                : (await HouseholdFactory.createHousehold(adminContext, HouseholdFactory.defaultHouseholdData(temporaryAndRandom())).then(h => { testHouseholdIds.push(h.id); return h })).id
            if (ownHousehold) {
                const current = await HouseholdFactory.getHouseholdById(adminContext, householdId)
                renamedHouseholds.push({id: householdId, name: current!.name})
            }

            const result = await HouseholdFactory.updateHousehold(actorContext, householdId, {name: `Updated-${desc}`}, expected, adminBypass)

            if (expected === 200) {
                expect(result).not.toBeNull()
                verifyHouseholdStructure(result!.household, desc)
                expect(result!.scaffoldResult).toBeDefined()
                expect(result!.household.name).toBe(`Updated-${desc}`)
            }
        })
    })

    test('DELETE can remove household with valid structure, and a removed household answers 404', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household
        const household = await HouseholdFactory.createHousehold(context)
        testHouseholdIds.push(household.id)

        // Delete household
        const [deletedHousehold] = await HouseholdFactory.deleteHousehold(context, household.id, 200)

        // Verify response structure (server validates against HouseholdDetail schema)
        expect(deletedHousehold).toBeDefined()
        verifyHouseholdStructure(deletedHousehold!, 'DELETE household')

        expect(deletedHousehold!.id).toBe(household.id)

        // Verify household is deleted - GET and DELETE answer 404
        await HouseholdFactory.getHouseholdById(context, household.id, 404)
        await HouseholdFactory.deleteHousehold(context, household.id, 404)
    })

    test('PUT can create household with inhabitants', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create household with inhabitants (with unique data for parallel execution)
        const testSalt = temporaryAndRandom()
        const {household} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            HouseholdFactory.defaultHouseholdData(testSalt),
            2
        )
        testHouseholdIds.push(household.id)

        // Verify response structure (server validates against HouseholdDetail schema)
        verifyHouseholdStructure(household, 'PUT household with inhabitants')

        // Verify inhabitants array structure
        expect(household.inhabitants.length).toBe(2)
        household.inhabitants.forEach((inhabitant) => {
            expect(inhabitant.householdId).toBe(household.id)
        })
    })

    test('GET /api/admin/household (index) returns households with lightweight inhabitant data (ADR-009)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with inhabitants (with unique data for parallel execution)
        const testSalt = temporaryAndRandom()
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
        const fetchedHousehold = households.find((h: HouseholdDisplay) => h.id === household.id)
        expect(fetchedHousehold).toBeDefined()

        // Verify lightweight structure (ADR-009: index endpoints return lightweight data)
        verifyHouseholdStructure(fetchedHousehold!, 'GET /api/admin/household (index)')
        expect(fetchedHousehold!.inhabitants.length).toBe(2)

        // Verify each inhabitant has lightweight fields only
        fetchedHousehold!.inhabitants.forEach((inhabitant: InhabitantDisplay, index: number) => {
            verifyLightweightInhabitant(inhabitant, `Inhabitant[${index}]`)
        })
    })

    test('GET /api/admin/household/[id] (detail) returns household with comprehensive data (ADR-009)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with inhabitants (with unique data for parallel execution)
        const testSalt = temporaryAndRandom()
        const {household} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            HouseholdFactory.defaultHouseholdData(testSalt),
            2
        )
        testHouseholdIds.push(household.id)

        // WHEN: Fetch household by ID (detail endpoint) - THEN: Response is valid HouseholdDetail (the factory parses it)
        const fetchedHousehold = (await HouseholdFactory.getHouseholdById(context, household.id))!

        // Verify response structure
        verifyHouseholdStructure(fetchedHousehold, 'GET /api/admin/household/[id]')

        // Verify data integrity
        expect(fetchedHousehold.id).toBe(household.id)
        expect(fetchedHousehold.inhabitants.length).toBe(2)
    })

    test('DELETE cascades to inhabitants (strong relation - ADR-005)', async ({browser}) => {
        // GIVEN: A household with inhabitants (with unique data for parallel execution)
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const result = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            HouseholdFactory.defaultHouseholdData(testSalt),
            2
        )
        testHouseholdIds.push(result.household.id)

        // Verify inhabitants were created
        expect(result.inhabitants.length).toBe(2)

        const inhabitantIds = result.inhabitants.map(i => i.id)

        // WHEN: Household is deleted
        await HouseholdFactory.deleteHousehold(context, result.household.id, 200)

        // THEN: All inhabitants should be cascade deleted
        await Promise.all(inhabitantIds.map(id => HouseholdFactory.getInhabitantById(context, id, 404)))
    })

    test('createAtExistingAddress copies heynaboId + name from sibling (Phase 4 frontend flow)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // GIVEN: a seed household at an address
        const seed = await HouseholdFactory.createHousehold(context, {
            ...HouseholdFactory.defaultHouseholdData(testSalt),
            name: salt('Test Leaving', testSalt),
            address: salt('Shared Lane 7', testSalt),
            moveOutDate: new Date('2026-09-01')
        })
        testHouseholdIds.push(seed.id)

        // WHEN: admin creates a second household at the same address (new family moving in).
        // The factory mirrors the frontend HouseholdCreateForm: copies heynaboId + name from sibling.
        const sibling = await HouseholdFactory.createAtExistingAddress(context, seed, {
            pbsId: saltedId(900010, testSalt),
            movedInDate: new Date('2026-08-15')
        })
        testHouseholdIds.push(sibling.id)

        // THEN: both persist, share heynaboId + name + address, have distinct ids + pbs
        expect(sibling.heynaboId).toBe(seed.heynaboId)
        expect(sibling.name).toBe(seed.name)
        expect(sibling.address).toBe(seed.address)
        expect(sibling.id).not.toBe(seed.id)
        expect(sibling.pbsId).not.toBe(seed.pbsId)
        expect(sibling.moveOutDate).toBeNull()

        // THEN: each is fetchable by its own id
        const fetchedSibling = await HouseholdFactory.getHouseholdById(context, sibling.id)
        expect(fetchedSibling!.heynaboId).toBe(seed.heynaboId)

        // THEN: index returns both
        const all = await HouseholdFactory.getAllHouseholds(context)
        const siblingsAtAddress = all.filter(h => h.heynaboId === seed.heynaboId)
        expect(siblingsAtAddress.map(h => h.id).sort()).toEqual([seed.id, sibling.id].sort())
    })

    test('create with duplicate pbsId is rejected (unique constraint)', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const seed = await HouseholdFactory.createHousehold(context, HouseholdFactory.defaultHouseholdData(testSalt))
        testHouseholdIds.push(seed.id)

        // A second household with the same pbsId conflicts with the unique constraint
        await HouseholdFactory.createAtExistingAddress(
            context,
            seed,
            {pbsId: seed.pbsId, movedInDate: new Date('2026-08-15')},
            409
        )
    })

    // Cleanup after all tests
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Seeded households get their name back
        await Promise.all(renamedHouseholds.map(({id, name}) => HouseholdFactory.updateHousehold(context, id, {name}, 200, true)))

        // Clean up all created households
        await HouseholdFactory.deleteHousehold(context, testHouseholdIds)
    })
})
