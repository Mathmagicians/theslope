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
            async () => await page.locator('[data-testid="admin-households"]').isVisible(),
            (isVisible) => isVisible,
            10
        )
        // Wait for store to finish loading - either data rows appear OR custom empty state shows
        // Custom empty state: "Ingen er flyttet ind i appen endnu"
        await pollUntil(
            async () => {
                const hasEmptyState = await page.getByText('Ingen er flyttet ind i appen endnu').count() > 0
                const hasDataRows = await page.locator('[data-testid="admin-households"] tbody tr td').count() > 1
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

        await page.locator('[data-testid="household-search"]').fill(searchTerm)

        await pollUntil(
            async () => await page.locator(`[data-testid="household-address-${householdId}"]`).isVisible(),
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
        await expect(page.locator('[data-testid="admin-households"]')).toBeVisible()
    })

    test('admin creates a new household at an existing address via the inline form', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // GIVEN: a seed household (the address the admin will pick from the USelect)
        const seed = await HouseholdFactory.createHousehold(context, {
            ...HouseholdFactory.defaultHouseholdData(testSalt),
            address: `UI Shared Lane ${testSalt}`
        })
        createdHouseholdIds.push(seed.id)

        await navigateToHouseholds(page)

        // WHEN: admin opens the inline create form
        await page.getByTestId('open-create-household').click()
        await expect(page.locator('form')).toBeVisible()

        // WHEN: pick the seed's address (USelect offers "{address} · HN {heynaboId}")
        await page.getByTestId('create-household-address').click()
        await page.getByRole('option', {name: new RegExp(seed.address)}).first().click()

        // WHEN: fill unique PBS + move-in date + submit
        const newPbsId = 900500 + Math.floor(Math.random() * 99999)
        // Target the underlying <input> via data-testid + input selector (UInput forwards data-testid to wrapper)
        await page.getByTestId('create-household-pbs').locator('input').fill(String(newPbsId))
        await page.locator('input[name="movedInDate"]').fill('15/05/2026')
        // Blur so UForm picks up the date input value before submitting
        await page.locator('input[name="movedInDate"]').press('Tab')
        await page.getByTestId('create-household-submit').click()

        // THEN: server persists a sibling household (heynaboId + name inherited from seed)
        const newHousehold = await pollUntil(
            () => HouseholdFactory.getAllHouseholds(context).then(all =>
                all.find(h => h.pbsId === newPbsId)
            ),
            (h) => h !== undefined,
            10
        )
        expect(newHousehold).toBeDefined()
        expect(newHousehold!.heynaboId).toBe(seed.heynaboId)
        expect(newHousehold!.name).toBe(seed.name)
        expect(newHousehold!.address).toBe(seed.address)
        createdHouseholdIds.push(newHousehold!.id)

        // THEN: table row shows the new household (after the inline form closes)
        await navigateAndFindHousehold(page, newHousehold!.id, seed.address, true)
        await expect(page.locator(`[data-testid="household-address-${newHousehold!.id}"]`)).toBeVisible()
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

        // THEN: Household and all inhabitants are visible (use data-testid for exact match)
        const householdAddressCell = page.locator(`[data-testid="household-address-${householdWithInhabitants.id}"]`)
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

        // THEN: Empty household is visible (use data-testid for exact match)
        const emptyHouseholdCell = page.locator(`[data-testid="household-address-${householdEmpty.id}"]`)
        await expect(emptyHouseholdCell, 'Empty household row should be visible').toBeVisible()
    })

    test('GIVEN two households at same address WHEN admin moves inhabitant THEN inhabitant appears in target', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // GIVEN: Two households at same address with inhabitants
        const {household: source, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context, HouseholdFactory.defaultHouseholdData(testSalt), 1
        )
        createdHouseholdIds.push(source.id)

        const target = await HouseholdFactory.createHousehold(context, {
            ...HouseholdFactory.defaultHouseholdData(testSalt + '-target'),
            heynaboId: source.heynaboId,
            address: source.address
        })
        createdHouseholdIds.push(target.id)

        const inhabitant = inhabitants[0]!

        // WHEN: Navigate to households, find target, expand edit panel
        await navigateAndFindHousehold(page, target.id, target.address, true)
        const targetRow = page.locator(`[data-testid="household-address-${target.id}"]`).locator('xpath=ancestor::tr')
        await targetRow.getByRole('button').first().click()

        // WHEN: Find inhabitant in the selector and click "Flyt hertil"
        await pollUntil(
            async () => await page.getByText(inhabitant.name).first().isVisible().catch(() => false),
            (visible) => visible
        )
        const moveBtn = page.getByText('Flyt hertil').first()
        await moveBtn.click()

        // THEN: Inhabitant moved to target (verify via API)
        const moved = await pollUntil(
            () => HouseholdFactory.getInhabitantById(context, inhabitant.id),
            (i) => i?.householdId === target.id
        )
        expect(moved!.householdId).toBe(target.id)
    })

    test('GIVEN household with no inhabitants WHEN admin deletes THEN household removed', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // GIVEN: Empty household
        const household = await HouseholdFactory.createHousehold(context, HouseholdFactory.defaultHouseholdData(testSalt + '-delete'))
        // Don't add to cleanup — we're deleting it

        // WHEN: Navigate, find household, expand edit panel
        await navigateAndFindHousehold(page, household.id, household.address, true)
        const row = page.locator(`[data-testid="household-address-${household.id}"]`).locator('xpath=ancestor::tr')
        await row.getByRole('button').first().click()

        // WHEN: Click delete (DangerButton two-click)
        const deleteBtn = page.getByText(new RegExp(`Slet.*PBS ${household.pbsId}`)).first()
        await deleteBtn.click()
        // Second click (confirm)
        await page.getByText(/Tryk igen/).first().click()

        // THEN: Household no longer in list (verify via API)
        await pollUntil(
            () => HouseholdFactory.getAllHouseholds(context).then(all => all.find(h => h.id === household.id)),
            (h) => h === undefined
        )
    })
})
