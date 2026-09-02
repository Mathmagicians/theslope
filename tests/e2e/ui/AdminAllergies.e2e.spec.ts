import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {AllergyFactory} from '../testDataFactories/allergyFactory'
import {SeasonFactory} from '../testDataFactories/seasonFactory'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, temporaryAndRandom} = testHelpers

/**
 * E2E UI tests for the admin allergy catalog (/admin/allergies).
 *
 * The catalog is master/detail with a responsive detail mount point; the desktop
 * pane shows a fallback selection, so tests select their own row (by id-testid)
 * before acting - parallel tests seed other types into the same catalog.
 *
 * Allergy types use the Peanuts-{salt} pattern for d1-nuke-allergytypes cleanup.
 */
test.describe('AdminAllergies - catalog CRUD', () => {
    const createdAllergyTypeIds: number[] = []

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.createActiveSeason(context)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
    })

    const gotoCatalog = async (page: import('@playwright/test').Page) => {
        await page.goto('/admin/allergies')
        await pollUntil(
            async () => page.locator('[data-testid="admin-allergies"]').isVisible(),
            (isVisible) => isVisible,
            10
        )
        // The container above is in the SSR HTML before listeners exist. The desktop
        // detail pane mounts only client-side (isMd resolves after mount), so its
        // content is the signal that the page is hydrated and interactive.
        await pollUntil(
            async () => (await page.getByText('Detaljer').count()) + (await page.getByText('Vælg en allergi').count()),
            (paneCount) => paneCount > 0,
            10
        )
    }

    const selectRow = async (page: import('@playwright/test').Page, allergyTypeId: number) => {
        const row = page.getByTestId(`allergy-row-${allergyTypeId}`)
        await expect(row).toBeVisible({timeout: 10000})
        await row.click()
        await expect(page.getByTestId('edit-allergy-type')).toBeVisible()
    }

    test('GIVEN the catalog WHEN creating an allergy via the form THEN it is persisted', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const name = `Peanuts-${testSalt}-Create`

        await gotoCatalog(page)
        await page.getByTestId('create-allergy-type').click()
        await expect(page.getByTestId('allergy-type-form')).toBeVisible()

        await page.locator('input[name="allergy-name"]').fill(name)
        await page.locator('input[name="allergy-icon"]').fill('🥜')
        await page.locator('textarea[name="allergy-description"]').fill(`Beskrivelse ${testSalt}`)
        await page.getByTestId('save-allergy-type').click()

        const types = await pollUntil(
            () => AllergyFactory.getAllergyTypes(context),
            (allTypes) => allTypes.some(t => t.name === name)
        )
        const createdType = types.find(t => t.name === name)!
        createdAllergyTypeIds.push(createdType.id!)
        expect(createdType.description).toContain(testSalt)
    })

    test('GIVEN a selected allergy WHEN editing its name THEN the change is persisted', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const allergyType = await AllergyFactory.createAllergyType(context, {
            name: `Peanuts-${testSalt}-Edit`,
            description: `Original ${testSalt}`,
            icon: '🥜'
        })
        createdAllergyTypeIds.push(allergyType.id!)

        await gotoCatalog(page)
        await selectRow(page, allergyType.id!)
        await page.getByTestId('edit-allergy-type').click()
        await expect(page.getByTestId('allergy-type-form')).toBeVisible()

        const updatedName = `Peanuts-${testSalt}-Edited`
        await page.locator('input[name="allergy-name"]').fill(updatedName)
        await page.getByTestId('save-allergy-type').click()

        await pollUntil(
            () => AllergyFactory.getAllergyType(context, allergyType.id!),
            (type) => type?.name === updatedName
        )
    })

    test('GIVEN a selected allergy WHEN confirming delete THEN it is removed', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const allergyType = await AllergyFactory.createAllergyType(context, {
            name: `Peanuts-${testSalt}-Delete`,
            description: `Slettes ${testSalt}`,
            icon: '🥜'
        })

        await gotoCatalog(page)
        await selectRow(page, allergyType.id!)
        await page.getByTestId('delete-allergy-type').click()

        // The confirm panel names the cascade before anything is deleted
        const confirmPanel = page.getByTestId('delete-allergy-type-confirm')
        await expect(confirmPanel).toBeVisible()
        await expect(confirmPanel).toContainText(allergyType.name)

        await page.getByTestId('confirm-delete-allergy-type').click()

        await pollUntil(
            () => AllergyFactory.getAllergyTypes(context),
            (allTypes) => !allTypes.some(t => t.id === allergyType.id)
        )
    })
})
