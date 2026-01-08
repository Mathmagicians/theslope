import {test, expect} from '@playwright/test'
import {SeasonFactory} from '../../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../../testDataFactories/dinnerEventFactory'
import {AllergyFactory} from '../../testDataFactories/allergyFactory'
import testHelpers from '../../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, temporaryAndRandom} = testHelpers

/**
 * E2E API Tests for Chef Dinner Allergens
 *
 * Uses consolidated endpoint: POST /api/chef/dinner/[id] with {allergenIds: [...]}
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
    // Unique salt for this test file run
    const testSalt = temporaryAndRandom()

    // Test-specific resources
    let testSeasonId: number
    const createdAllergyTypeIds: number[] = []

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
        test('GIVEN dinner event WHEN member sets allergens THEN returns allergens with id property (bug fix verification)', async ({browser}) => {
            const adminContext = await validatedBrowserContext(browser)
            const memberContext = await memberValidatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(adminContext)
            const allergyTypes = await createTestAllergyTypes(adminContext)
            const allergyTypeIds = allergyTypes.map(a => a.id)

            // WHEN: Member sets allergens on dinner event (chef operation)
            const updatedDinner = await DinnerEventFactory.updateDinnerEventAllergens(
                memberContext,
                dinnerEvent.id,
                allergyTypeIds
            )

            // THEN: Response should contain allergens array with exact count
            expect(updatedDinner.allergens).toBeDefined()
            expect(updatedDinner.allergens!.length).toBe(allergyTypeIds.length)

            // CRITICAL: Verify allergens have `id` NOT `allergyTypeId` (bug fix verification)
            updatedDinner.allergens!.forEach((allergen: Record<string, unknown>, index: number) => {
                expect(allergen.id, `Allergen ${index} should have id`).toBeDefined()
                expect(typeof allergen.id).toBe('number')
                expect(allergen.allergyTypeId, `Allergen ${index} should NOT have allergyTypeId`).toBeUndefined()
                expect(allergen.name, `Allergen ${index} should have name`).toBeDefined()
            })
        })

        test('GIVEN single allergen WHEN member sets THEN returns correct allergen', async ({browser}) => {
            const adminContext = await validatedBrowserContext(browser)
            const memberContext = await memberValidatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(adminContext)
            const allergyTypes = await createTestAllergyTypes(adminContext, 1)
            const singleAllergenId = allergyTypes[0]!.id

            const updatedDinner = await DinnerEventFactory.updateDinnerEventAllergens(
                memberContext,
                dinnerEvent.id,
                [singleAllergenId]
            )

            expect(updatedDinner.allergens).toBeDefined()
            expect(updatedDinner.allergens!.length).toBe(1)
            expect(updatedDinner.allergens![0]!.id).toBe(singleAllergenId)
        })

        test('GIVEN allergens WHEN member clears THEN returns empty array', async ({browser}) => {
            const adminContext = await validatedBrowserContext(browser)
            const memberContext = await memberValidatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(adminContext)
            const allergyTypes = await createTestAllergyTypes(adminContext, 2)

            // Set allergens first (member operation)
            await DinnerEventFactory.updateDinnerEventAllergens(
                memberContext,
                dinnerEvent.id,
                allergyTypes.map(a => a.id)
            )

            // Clear them (member operation)
            const updatedDinner = await DinnerEventFactory.updateDinnerEventAllergens(
                memberContext,
                dinnerEvent.id,
                []
            )

            expect(updatedDinner.allergens).toBeDefined()
            expect(updatedDinner.allergens!.length).toBe(0)
        })
    })

    test.describe('Validation', () => {
        test('GIVEN non-existent dinner event WHEN member sets allergens THEN returns 404', async ({browser}) => {
            const memberContext = await memberValidatedBrowserContext(browser)

            // Use factory with expected error status
            await DinnerEventFactory.updateDinnerEventAllergens(memberContext, 999999, [1], 404)
        })

        test('GIVEN non-existent allergen IDs WHEN member sets allergens THEN returns 404', async ({browser}) => {
            const adminContext = await validatedBrowserContext(browser)
            const memberContext = await memberValidatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(adminContext)

            // Allergen IDs that don't exist - validated before FK constraint
            await DinnerEventFactory.updateDinnerEventAllergens(memberContext, dinnerEvent.id, [999998, 999999], 404)
        })
    })

    test.describe('Data Persistence', () => {
        test('GIVEN member sets allergens WHEN fetching dinner event THEN allergens persist with id property', async ({browser}) => {
            const adminContext = await validatedBrowserContext(browser)
            const memberContext = await memberValidatedBrowserContext(browser)
            const dinnerEvent = await createTestDinnerEvent(adminContext)
            const allergyTypes = await createTestAllergyTypes(adminContext, 2)
            const allergyTypeIds = allergyTypes.map(a => a.id)

            // Set allergens (member/chef operation)
            await DinnerEventFactory.updateDinnerEventAllergens(
                memberContext,
                dinnerEvent.id,
                allergyTypeIds
            )

            // Fetch dinner event (can use either context)
            const fetchedDinner = await DinnerEventFactory.getDinnerEvent(memberContext, dinnerEvent.id)

            // Verify allergens persist with correct structure
            expect(fetchedDinner).not.toBeNull()
            expect(fetchedDinner!.allergens).toBeDefined()
            expect(fetchedDinner!.allergens!.length).toBe(2)
            fetchedDinner!.allergens!.forEach((allergen: Record<string, unknown>) => {
                expect(allergen.id, 'Should have id').toBeDefined()
                expect(allergen.allergyTypeId, 'Should NOT have allergyTypeId').toBeUndefined()
            })
        })
    })
})
