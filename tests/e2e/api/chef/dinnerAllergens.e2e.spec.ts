import {test, expect} from '@playwright/test'
import {authFiles} from '../../config'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../../testDataFactories/dinnerEventFactory'
import {AllergyFactory} from '../../testDataFactories/allergyFactory'
import testHelpers from '../../testHelpers'

const {adminUIFile} = authFiles
const {validatedBrowserContext, headers, temporaryAndRandom} = testHelpers

/**
 * E2E API Tests for Chef Dinner Allergens Endpoint
 *
 * POST /api/chef/dinner/[id]/allergens
 *
 * Tests allergen assignment and the critical bug fix:
 * Response allergens contain AllergyType objects with `id`,
 * NOT join table objects with `allergyTypeId`
 *
 * Parallel Safety:
 * - Own isolated season created in beforeAll with unique salt
 * - Each test creates its own dinner event
 * - Cleanup in afterAll cascades via season deletion
 */
test.describe('Chef Dinner Allergens API', () => {
    test.use({storageState: adminUIFile})

    // Unique salt for this test file run
    const testSalt = temporaryAndRandom()

    // Test-specific resources
    let testSeasonId: number
    let createdAllergyTypeIds: number[] = []

    const trackAllergyType = (id: number) => createdAllergyTypeIds.push(id)

    // Setup: Create isolated season for this test file
    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create unique season for allergen tests (salted, not singleton)
        const season = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))
        testSeasonId = season.id!
    })

    // Cleanup: Delete season (cascades to dinner events) and allergy types
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Delete season - cascades to dinner events
        if (testSeasonId) {
            await SeasonFactory.deleteSeason(context, testSeasonId)
        }

        // Clean up allergy types
        await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
    })

    // Helper: Create dinner event for this test (salted)
    const createTestDinnerEvent = async (context: Awaited<ReturnType<typeof validatedBrowserContext>>) => {
        return await DinnerEventFactory.createDinnerEvent(context, {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt),
            seasonId: testSeasonId
        })
    }

    // Helper: Create unique allergy types (factory auto-salts via defaultAllergyTypeData)
    const createTestAllergyTypes = async (
        context: Awaited<ReturnType<typeof validatedBrowserContext>>,
        count: number = 3
    ) => {
        const allergyTypes = []
        for (let i = 0; i < count; i++) {
            const allergyTypeData = AllergyFactory.defaultAllergyTypeData(testSalt)
            const created = await AllergyFactory.createAllergyType(context, allergyTypeData)
            trackAllergyType(created.id)
            allergyTypes.push(created)
        }
        return allergyTypes
    }

    test.describe('Allergen Assignment', () => {
        test('GIVEN dinner event WHEN setting allergens THEN returns allergens with id property (bug fix verification)', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(context)
            const allergyTypes = await createTestAllergyTypes(context)
            const allergyTypeIds = allergyTypes.map(a => a.id)

            // WHEN: Set allergens on dinner event
            const updatedDinner = await DinnerEventFactory.updateDinnerEventAllergens(
                context,
                dinnerEvent.id,
                allergyTypeIds
            )

            // THEN: Response should contain allergens array with exact count
            expect(updatedDinner.allergens).toBeDefined()
            expect(updatedDinner.allergens.length).toBe(allergyTypeIds.length)

            // CRITICAL: Verify allergens have `id` NOT `allergyTypeId` (bug fix verification)
            updatedDinner.allergens.forEach((allergen: Record<string, unknown>, index: number) => {
                expect(allergen.id, `Allergen ${index} should have id`).toBeDefined()
                expect(typeof allergen.id).toBe('number')
                expect(allergen.allergyTypeId, `Allergen ${index} should NOT have allergyTypeId`).toBeUndefined()
                expect(allergen.name, `Allergen ${index} should have name`).toBeDefined()
            })
        })

        test('GIVEN single allergen WHEN setting THEN returns correct allergen', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(context)
            const allergyTypes = await createTestAllergyTypes(context, 1)
            const singleAllergenId = allergyTypes[0]!.id

            const updatedDinner = await DinnerEventFactory.updateDinnerEventAllergens(
                context,
                dinnerEvent.id,
                [singleAllergenId]
            )

            expect(updatedDinner.allergens.length).toBe(1)
            expect(updatedDinner.allergens[0].id).toBe(singleAllergenId)
        })

        test('GIVEN allergens WHEN clearing THEN returns empty array', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(context)
            const allergyTypes = await createTestAllergyTypes(context, 2)

            // Set allergens first
            await DinnerEventFactory.updateDinnerEventAllergens(
                context,
                dinnerEvent.id,
                allergyTypes.map(a => a.id)
            )

            // Clear them
            const updatedDinner = await DinnerEventFactory.updateDinnerEventAllergens(
                context,
                dinnerEvent.id,
                []
            )

            expect(updatedDinner.allergens.length).toBe(0)
        })
    })

    test.describe('Validation', () => {
        test('GIVEN invalid dinner event ID WHEN setting allergens THEN returns 400', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            const response = await context.request.post('/api/chef/dinner/invalid/allergens', {
                headers,
                data: {allergenIds: [1]}
            })

            expect(response.status()).toBe(400)
        })

        test('GIVEN non-existent dinner event WHEN setting allergens THEN returns error', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            const response = await context.request.post('/api/chef/dinner/999999/allergens', {
                headers,
                data: {allergenIds: [1]}
            })

            expect(response.status()).toBeGreaterThanOrEqual(400)
        })

        test('GIVEN invalid allergen IDs WHEN setting allergens THEN returns 400', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(context)

            const response = await context.request.post(`/api/chef/dinner/${dinnerEvent.id}/allergens`, {
                headers,
                data: {allergenIds: ['invalid']}
            })

            expect(response.status()).toBe(400)
        })
    })

    test.describe('Data Persistence', () => {
        test('GIVEN allergens set WHEN fetching dinner event THEN allergens persist with id property', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(context)
            const allergyTypes = await createTestAllergyTypes(context, 2)
            const allergyTypeIds = allergyTypes.map(a => a.id)

            // Set allergens
            await DinnerEventFactory.updateDinnerEventAllergens(
                context,
                dinnerEvent.id,
                allergyTypeIds
            )

            // Fetch dinner event
            const fetchedDinner = await DinnerEventFactory.getDinnerEvent(context, dinnerEvent.id)

            // Verify allergens persist with correct structure
            expect(fetchedDinner).not.toBeNull()
            expect(fetchedDinner!.allergens.length).toBe(2)
            fetchedDinner!.allergens.forEach((allergen: Record<string, unknown>) => {
                expect(allergen.id, 'Should have id').toBeDefined()
                expect(allergen.allergyTypeId, 'Should NOT have allergyTypeId').toBeUndefined()
            })
        })
    })
})
