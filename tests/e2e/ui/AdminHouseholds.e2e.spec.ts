import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import testHelpers from '../testHelpers'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil} = testHelpers

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
     * Sets up response wait BEFORE navigation to catch the API call
     */
    const navigateToHouseholds = async (page: any) => {
        // Setup wait for API response BEFORE navigation (catches the fetch triggered by store)
        const responsePromise = page.waitForResponse(
            (response: any) => response.url().includes('/api/admin/household'),
            {timeout: 10000}
        )

        await page.goto(adminHouseholdsUrl)
        const response = await responsePromise
        expect(response.status()).toBe(200)

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
    const navigateAndFindHousehold = async (page: any, householdId: number, searchTerm: string, shouldNavigate = true) => {
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

        // GIVEN: Create household with inhabitants
        const {household: householdWithInhabitants, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            {name: 'Test Family'},
            3
        )
        createdHouseholdIds.push(householdWithInhabitants.id)

        // GIVEN: Create household without inhabitants
        const householdEmpty = await HouseholdFactory.createHousehold(context, {name: 'Empty Household'})
        createdHouseholdIds.push(householdEmpty.id)

        // WHEN: Navigate and search for household with inhabitants
        await navigateAndFindHousehold(page, householdWithInhabitants.id, householdWithInhabitants.address, true)

        // THEN: Household and all inhabitants are visible
        const householdRow = page.getByRole('row').filter({ hasText: householdWithInhabitants.address })
        await expect(householdRow, 'Household row with inhabitants should be visible').toBeVisible()

        for (const inhabitant of inhabitants) {
            await expect(
                householdRow.getByText(inhabitant.name).first(),
                `Inhabitant ${inhabitant.name} should be visible in household row`
            ).toBeVisible()
        }

        // WHEN: Search for empty household (without reload, just new search)
        await navigateAndFindHousehold(page, householdEmpty.id, householdEmpty.address, false)

        // THEN: Empty household is visible
        const emptyHouseholdRow = page.getByRole('row').filter({ hasText: householdEmpty.address })
        await expect(emptyHouseholdRow, 'Empty household row should be visible').toBeVisible()
    })
})
