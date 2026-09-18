import {test, expect} from '@playwright/test'
import testHelpers from '../testHelpers'
import {SettingFactory} from '../testDataFactories/settingFactory'

const {memberValidatedBrowserContext} = testHelpers

const NOTES_KEY = 'allergy-poster-notes'

// Render smoke only - age-category logic is unit tested (useTicket), markers and
// counts are component tested (admin-allergies-pdf.nuxt.spec.ts)
test.describe('Allergy poster', () => {
    test('renders for a logged-in member', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()

        await page.goto('/admin/allergies/pdf')

        await expect(page.locator('h1')).toContainText('ALLERGI-LISTE')
        await expect(page.getByTestId('allergy-table')).toBeVisible()
        await expect(page.getByTestId('allergy-notes')).toContainText('Vigtige bemærkninger')
        await expect(page.getByTestId('qr-code')).toBeVisible()
    })

    // The poster prints the stored notes, not a copy in the page - read-only, no pencil
    test('prints the notes from the setting', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const stored = await SettingFactory.getSetting(context, NOTES_KEY)
        const page = await context.newPage()

        await page.goto('/admin/allergies/pdf')

        const firstNote = stored!.value.split('\n').map(line => line.trim()).filter(Boolean)[0]!
        await expect(page.getByTestId('allergy-notes')).toContainText(firstNote)
        await expect(page.getByTestId('edit-allergy-notes')).toHaveCount(0)
    })
})
