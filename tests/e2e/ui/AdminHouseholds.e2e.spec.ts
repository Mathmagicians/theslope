import {test, expect, type Page} from '@playwright/test'
import {authFiles} from '../config'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import testHelpers from '../testHelpers'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, temporaryAndRandom, doScreenshot} = testHelpers

/**
 * UI TEST STRATEGY:
 * - Focus on UI interaction and display
 * - Use API (HouseholdFactory) for setup
 * - Verify household and inhabitant data is displayed correctly
 * - Read-only view for now (no edits)
 */
test.describe('AdminHouseholds View', () => {
    const adminHouseholdsUrl = '/admin/households'
    const createdHouseholdIds: number[] = []

    test.use({storageState: adminUIFile})

    /**
     * Helper: Navigate to households page and wait for data to load
     * Uses pollUntil with exponential backoff for robustness under load
     */
    const navigateToHouseholds = async (page: Page) => {
        await page.goto(adminHouseholdsUrl)

        // Wait for container to be visible
        await pollUntil(
            async () => await page.locator('[data-test-id="admin-households"]').isVisible(),
            (isVisible) => isVisible,
            10
        )
        // Wait for store to finish loading - either data rows appear OR custom empty state shows
        // Custom empty state: "Ingen er flyttet ind i appen endnu"
        await pollUntil(
            async () => {
                const hasEmptyState = await page.getByText('Ingen er flyttet ind i appen endnu').count() > 0
                const hasDataRows = await page.locator('[data-test-id="admin-households"] tbody tr td').count() > 1
                return hasEmptyState || hasDataRows
            },
            (ready) => ready,
            10
        )
    }

    /**
     * Helper: Navigate to households page, search, and wait for specific household
     * No reload needed - fresh navigation after API data creation will fetch current data
     */
    const navigateAndFindHousehold = async (page: Page, householdId: number, searchTerm: string, shouldNavigate = true) => {
        if (shouldNavigate) {
            await navigateToHouseholds(page)
        }

        await page.locator('[data-test-id="household-search"]').fill(searchTerm)

        await pollUntil(
            async () => await page.locator(`[data-test-id="household-address-${householdId}"]`).isVisible(),
            (isVisible) => isVisible,
            10
        )
    }

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    })

    test('Can load admin households page', async ({page}) => {
        await navigateToHouseholds(page)
        await expect(page.locator('[data-test-id="admin-households"]')).toBeVisible()
    })

    test('GIVEN households with/without inhabitants WHEN searching THEN correct households are displayed', async ({
        page,
        browser
    }) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // GIVEN: Create household with inhabitants
        const {household: householdWithInhabitants, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            HouseholdFactory.defaultHouseholdData(testSalt),
            3
        )
        createdHouseholdIds.push(householdWithInhabitants.id)

        // GIVEN: Create household without inhabitants
        const householdEmpty = await HouseholdFactory.createHousehold(context, HouseholdFactory.defaultHouseholdData(testSalt + '-empty'))
        createdHouseholdIds.push(householdEmpty.id)

        // WHEN: Navigate and search for household with inhabitants
        await navigateAndFindHousehold(page, householdWithInhabitants.id, householdWithInhabitants.address, true)

        // THEN: Household and all inhabitants are visible (use data-test-id for exact match)
        const householdAddressCell = page.locator(`[data-test-id="household-address-${householdWithInhabitants.id}"]`)
        await expect(householdAddressCell, 'Household with inhabitants should be visible').toBeVisible()

        // Find the row containing this household for inhabitant checks
        const householdRow = householdAddressCell.locator('xpath=ancestor::tr')
        for (const inhabitant of inhabitants) {
            await expect(
                householdRow.getByText(inhabitant.name).first(),
                `Inhabitant ${inhabitant.name} should be visible in household row`
            ).toBeVisible()
        }

        // Documentation screenshot: Admin Households list with inhabitants
        await doScreenshot(page, 'admin/admin-households-list', true)

        // WHEN: Search for empty household (without reload, just new search)
        await navigateAndFindHousehold(page, householdEmpty.id, householdEmpty.address, false)

        // THEN: Empty household is visible (use data-test-id for exact match)
        const emptyHouseholdCell = page.locator(`[data-test-id="household-address-${householdEmpty.id}"]`)
        await expect(emptyHouseholdCell, 'Empty household row should be visible').toBeVisible()
    })
})
