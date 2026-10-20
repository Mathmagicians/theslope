import {test, expect, type Page} from '@playwright/test'
import {authFiles} from '../config'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import testHelpers from '../testHelpers'
import {useCoreValidation} from '~/composables/useCoreValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, temporaryAndRandom, salt, saltedId, doScreenshot, gotoHydrated, fillDateField, readDateField, waitForApi} = testHelpers
const {HouseholdDetailSchema} = useCoreValidation()

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
    const navigateToHouseholds = async (page: Page) => {
        await gotoHydrated(page, adminHouseholdsUrl)

        // Wait for container to be visible
        await expect(page.locator('[data-testid="admin-households"]')).toBeVisible()
        // Wait for store to finish loading - either data rows appear OR custom empty state shows
        // Custom empty state: "Ingen er flyttet ind i appen endnu"
        // (a data row has more than the one cell of the loading or empty row)
        const emptyState = page.getByText('Ingen er flyttet ind i appen endnu')
        const secondDataCell = page.locator('[data-testid="admin-households"] tbody tr td').nth(1)
        await expect(emptyState.or(secondDataCell).first()).toBeAttached()
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

        await expect(page.locator(`[data-testid="household-address-${householdId}"]`)).toBeVisible()
    }

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
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
        await expect(page.getByTestId('create-household-address')).toBeVisible()

        // Fill scalar fields first. Picking the address later triggers the "prevOwner" section
        // to render, which re-renders surrounding FormFields and drops any in-progress fill.
        const newPbsId = saltedId(900500, testSalt)
        const pbsInput = page.getByTestId('create-household-pbs')
        await pbsInput.fill(String(newPbsId))
        await expect(pbsInput).toHaveValue(String(newPbsId))

        // The move-in date field: the date group that holds the field's named input
        const movedInField = page.getByRole('group').filter({has: page.locator('input[name="movedInDate"]')})
        await fillDateField(movedInField, 'start', '15/05/2026')
        expect((await readDateField(movedInField, 'start')).getTime())
            .toBe(new Date(2026, 4, 15).getTime())

        // Now pick the seed's address (USelect offers "{address} · HN {heynaboId}")
        await page.getByTestId('create-household-address').click()
        const addressOption = page.getByRole('option', {name: `${seed.address} · HN ${seed.heynaboId}`, exact: true})
        await expect(addressOption).toBeVisible()
        await addressOption.click()

        const saved = waitForApi(page, '/api/admin/household', 'PUT')
        await page.getByTestId('create-household-submit').click()
        const response = await saved
        const savedHousehold = HouseholdDetailSchema.parse(await response.json())
        createdHouseholdIds.push(savedHousehold.id)
        expect(response.status()).toBe(201)

        // THEN: server persists a sibling household (heynaboId + name inherited from seed)
        const newHousehold = await HouseholdFactory.getHouseholdById(context, savedHousehold.id)
        expect(newHousehold!.pbsId).toBe(newPbsId)
        expect(newHousehold!.heynaboId).toBe(seed.heynaboId)
        expect(newHousehold!.name).toBe(seed.name)
        expect(newHousehold!.address).toBe(seed.address)

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

        // WHEN: Searching for something no household matches
        const noMatch = salt('no-such-address', testSalt)
        await page.locator('[data-testid="household-search"]').fill(noMatch)

        // THEN: The table's own empty state replaces the rows (UTable #empty slot)
        await expect(
            page.getByText(`Ingen husstande matcher søgningen "${noMatch}"`),
            'Search with no matches should render the empty state'
        ).toBeVisible()
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
        // The edit button is the row's one button
        const targetRow = page.locator(`[data-testid="household-address-${target.id}"]`).locator('xpath=ancestor::tr')
        await targetRow.getByRole('button').click()

        // WHEN: Find inhabitant in the selector and click "Flyt hertil"
        // The panel's Beboere section holds the selector; the source row's badge also shows the first name
        const moveSelector = page.locator('section').filter({has: page.getByRole('heading', {name: 'Beboere', exact: true})})
        const inhabitantRow = moveSelector.getByRole('row').filter({hasText: `${inhabitant.name} ${inhabitant.lastName}`})
        await expect(inhabitantRow).toBeVisible()
        await inhabitantRow.getByRole('button', {name: 'Flyt hertil', exact: true}).click()

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
        // Tracked in case the UI delete does not land; cleanup counts a household already gone as removed
        createdHouseholdIds.push(household.id)

        // WHEN: Navigate, find household, expand edit panel
        await navigateAndFindHousehold(page, household.id, household.address, true)
        const row = page.locator(`[data-testid="household-address-${household.id}"]`).locator('xpath=ancestor::tr')
        await row.getByRole('button').click()

        // WHEN: Click delete (DangerButton two-click)
        const deleteBtn = page.getByRole('button', {name: new RegExp(`Slet.*PBS ${household.pbsId}`)})
        await deleteBtn.click()
        // Second click (confirm): the same button, its label armed
        await page.getByRole('button', {name: new RegExp(`Tryk igen.*PBS ${household.pbsId}`)}).click()

        // THEN: Household no longer in list (verify via API)
        await pollUntil(
            () => HouseholdFactory.getAllHouseholds(context).then(all => all.find(h => h.id === household.id)),
            (h) => h === undefined
        )
    })
})
