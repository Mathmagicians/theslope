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
     */
    const navigateToHouseholds = async (page: any) => {
        await page.goto(adminHouseholdsUrl)
        await pollUntil(
            async () => await page.locator('[data-test-id="admin-households"]').isVisible(),
            (isVisible) => isVisible,
            10
        )
    }

    /**
     * Helper: Navigate, reload, search for household and wait for it to appear
     */
    const navigateAndFindHousehold = async (page: any, householdId: number, searchTerm: string, shouldReload = true) => {
        if (shouldReload) {
            await navigateToHouseholds(page)
            await page.reload()
            await pollUntil(
                async () => await page.locator('[data-test-id="admin-households"]').isVisible(),
                (isVisible) => isVisible,
                10
            )
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
                householdRow.getByText(inhabitant.name),
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
