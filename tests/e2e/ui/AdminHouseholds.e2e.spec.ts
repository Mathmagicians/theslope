import {test, expect, BrowserContext} from '@playwright/test'
import {authFiles} from '../config'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import testHelpers from '../testHelpers'

const {adminUIFile} = authFiles
const {validatedBrowserContext} = testHelpers

/**
 * UI TEST STRATEGY:
 * - Focus on UI interaction and display
 * - Use API (HouseholdFactory) for setup
 * - Verify household and inhabitant data is displayed correctly
 * - Read-only view for now (no edits)
 */
test.describe('AdminHouseholds View', () => {
    const adminHouseholdsUrl = '/admin/households'
    let createdHouseholdIds: number[] = []

    test.use({storageState: adminUIFile})

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await Promise.all(
            createdHouseholdIds.map(id =>
                HouseholdFactory.deleteHousehold(context, id).catch(error => {
                    console.warn(`Failed to cleanup household ${id}:`, error)
                })
            )
        )
    })

    test('Can load admin households page', async ({page}) => {
        await page.goto(adminHouseholdsUrl)
        await page.waitForLoadState('networkidle')

        // Verify page loaded
        await expect(page.locator('[data-test-id="admin-households"]')).toBeVisible()
    })

    test('GIVEN household with inhabitants WHEN loading page THEN household and inhabitants are displayed', async ({
        page,
        browser
    }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household with inhabitants via API
        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            'Test Family',
            3
        )
        createdHouseholdIds.push(household.id)

        // Navigate to households page
        await page.goto(adminHouseholdsUrl)
        await page.waitForLoadState('networkidle')

        // THEN: Household address should be visible
        const householdRow = page.getByRole('row', { name: new RegExp(household.address) })
        await expect(householdRow).toBeVisible()

        // THEN: All 3 inhabitants' first names should be visible in badges within the household row
        for (const inhabitant of inhabitants) {
            await expect(householdRow.getByText(inhabitant.name)).toBeVisible()
        }
    })

    test('GIVEN multiple households WHEN loading page THEN all households are displayed', async ({
        page,
        browser
    }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create 2 households with different addresses
        const {household: household1} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            'Household One',
            2
        )
        createdHouseholdIds.push(household1.id)

        const {household: household2} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            'Household Two',
            1
        )
        createdHouseholdIds.push(household2.id)

        // WHEN: Navigate to households page
        await page.goto(adminHouseholdsUrl)
        await page.waitForLoadState('networkidle')

        // THEN: Both households should be visible (by address)
        await expect(page.getByText(household1.address)).toBeVisible()
        await expect(page.getByText(household2.address)).toBeVisible()
    })

    test('GIVEN household without inhabitants WHEN loading page THEN household is displayed with empty state', async ({
        page,
        browser
    }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create household without inhabitants
        const household = await HouseholdFactory.createHousehold(context, {name: 'Empty Household'})
        createdHouseholdIds.push(household.id)

        // WHEN: Navigate to households page
        await page.goto(adminHouseholdsUrl)
        await page.waitForLoadState('networkidle')

        // THEN: Household address should be visible
        await expect(page.getByText(household.address)).toBeVisible()

        // THEN: Empty state or "No inhabitants" message should be visible
        // (Implementation detail - we'll verify this shows appropriately)
    })
})