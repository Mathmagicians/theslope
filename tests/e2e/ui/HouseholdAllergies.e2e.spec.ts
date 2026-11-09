import {test, expect} from '~~/tests/e2e/uiTest'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {AllergyFactory} from '../testDataFactories/allergyFactory'
import {SeasonFactory} from '../testDataFactories/seasonFactory'

const {memberUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, temporaryAndRandom, getSessionUserInfo, gotoHydrated} = testHelpers

/**
 * E2E UI Tests for HouseholdAllergies
 *
 * Tests allergy CRUD operations via the UI:
 * - Add allergy via dropdown
 * - Remove allergy via trash button
 * - Update allergy comment
 *
 * Uses member's own household (canEdit=true).
 * Each test creates its own allergy type with unique salt for parallel isolation.
 * Allergy types use Peanuts-{salt} pattern for d1-nuke-allergytypes cleanup.
 */
test.describe('HouseholdAllergies - CRUD Operations', () => {
    // Shared session info only (immutable, safe for parallel)
    let inhabitantId: number
    let shortName: string
    let pbsId: number
    const createdAllergyTypeIds: number[] = []

    test.use({storageState: memberUIFile})

    test.beforeAll(async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const adminContext = await validatedBrowserContext(browser)

        // Get member's household info (immutable, safe to share)
        const sessionInfo = await getSessionUserInfo(memberContext)
        inhabitantId = sessionInfo.inhabitantId
        shortName = sessionInfo.householdShortname
        pbsId = sessionInfo.householdPbsId

        // Create active season (required for page to load)
        await SeasonFactory.createActiveSeason(adminContext)
    })

    test.afterAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        // Deleting an allergy type cascades the allergies the tests added
        await AllergyFactory.cleanupAllergyTypes(adminContext, createdAllergyTypeIds)
    })

    /**
     * Helper to navigate to allergies tab and wait for content
     */
    const navigateToAllergiesTab = async (page: import('@playwright/test').Page) => {
        await gotoHydrated(page, `/household/${encodeURIComponent(shortName)}/allergies?pbs=${pbsId}`)
        await expect(page.locator('[data-testid="household-allergies"]')).toBeVisible()
    }

    /**
     * Helper to expand inhabitant row for editing
     */
    const expandInhabitantRow = async (page: import('@playwright/test').Page) => {
        const toggleTestId = `inhabitant-${inhabitantId}-allergy-toggle`
        const pencilButton = page.getByTestId(toggleTestId)
        await expect(pencilButton).toBeVisible()
        await pencilButton.click()

        // Wait for AllergyEditor dropdown to appear
        await expect(page.getByTestId('allergy-editor-select')).toBeVisible()
    }

    test('GIVEN inhabitant row expanded WHEN selecting allergy from dropdown THEN allergy is added', async ({page, browser}) => {
        // Each test has its own salt and allergy type for isolation
        const testSalt = temporaryAndRandom()
        const adminContext = await validatedBrowserContext(browser)

        // Create unique allergy type for this test
        const allergyTypeData = {name: `Peanuts-${testSalt}-Add`, icon: '🥜', description: 'Test add allergy'}
        const allergyType = await AllergyFactory.createAllergyType(adminContext, allergyTypeData)
        createdAllergyTypeIds.push(allergyType.id)

        await navigateToAllergiesTab(page)
        await expandInhabitantRow(page)

        // WHEN: Select allergy from dropdown
        const dropdown = page.getByTestId('allergy-editor-select')
        await dropdown.click()

        // Wait for dropdown options and select the allergy type by unique name
        const option = page.getByRole('option', {name: allergyType.name})
        await expect(option).toBeVisible()
        await option.click()

        // THEN: Verify allergy appears in the list (via API)
        await pollUntil(
            async () => AllergyFactory.getAllergiesForInhabitant(adminContext, inhabitantId),
            (allergies) => allergies.some(a => a.allergyTypeId === allergyType.id),
            6
        )
    })

    test('GIVEN inhabitant has allergy WHEN clicking trash button THEN allergy is removed', async ({page, browser}) => {
        // Each test has its own salt and allergy type for isolation
        const testSalt = temporaryAndRandom()
        const adminContext = await validatedBrowserContext(browser)

        // Create unique allergy type for this test
        const allergyTypeData = {name: `Peanuts-${testSalt}-Remove`, icon: '🗑️', description: 'Test remove allergy'}
        const allergyType = await AllergyFactory.createAllergyType(adminContext, allergyTypeData)
        createdAllergyTypeIds.push(allergyType.id)

        // Setup: Create allergy via API first
        await AllergyFactory.createAllergy(adminContext, {
            inhabitantId,
            allergyTypeId: allergyType.id,
            inhabitantComment: null
        }, 201, true)

        await navigateToAllergiesTab(page)
        await expandInhabitantRow(page)

        // WHEN: Click trash button to remove allergy
        const trashButton = page.getByTestId(`allergy-${allergyType.id}-remove`)
        await expect(trashButton).toBeVisible()
        await trashButton.click()

        // THEN: Verify allergy is removed (via API)
        await pollUntil(
            async () => AllergyFactory.getAllergiesForInhabitant(adminContext, inhabitantId),
            (allergies) => !allergies.some(a => a.allergyTypeId === allergyType.id),
            6
        )
    })

    test('GIVEN inhabitant has allergy WHEN updating comment THEN comment is persisted', async ({page, browser}) => {
        // Each test has its own salt and allergy type for isolation
        const testSalt = temporaryAndRandom()
        const adminContext = await validatedBrowserContext(browser)
        const testComment = `Test kommentar ${testSalt}`

        // Create unique allergy type for this test
        const allergyTypeData = {name: `Peanuts-${testSalt}-Comment`, icon: '💬', description: 'Test comment allergy'}
        const allergyType = await AllergyFactory.createAllergyType(adminContext, allergyTypeData)
        createdAllergyTypeIds.push(allergyType.id)

        // Setup: Create allergy via API
        await AllergyFactory.createAllergy(adminContext, {
            inhabitantId,
            allergyTypeId: allergyType.id,
            inhabitantComment: null
        }, 201, true)

        await navigateToAllergiesTab(page)
        await expandInhabitantRow(page)

        // WHEN: Type comment and save - use specific placeholder for our test allergy
        const commentInput = page.locator(`input[placeholder*="${allergyTypeData.name}"]`)
        await expect(commentInput).toBeVisible()
        await commentInput.fill(testComment)

        // Click the save button
        const saveButton = page.getByTestId(`allergy-${allergyType.id}-save-comment`)
        await expect(saveButton).toBeVisible()
        await saveButton.click()

        // THEN: Verify comment is persisted (via API)
        const allergies = await pollUntil(
            async () => AllergyFactory.getAllergiesForInhabitant(adminContext, inhabitantId),
            (allergies) => {
                const allergy = allergies.find(a => a.allergyTypeId === allergyType.id)
                return allergy?.inhabitantComment === testComment
            },
            6
        )
        const updatedAllergy = allergies.find(a => a.allergyTypeId === allergyType.id)
        expect(updatedAllergy?.inhabitantComment).toBe(testComment)
    })
})
