import {test, expect} from '@playwright/test'
import testHelpers from '../testHelpers'

const {memberValidatedBrowserContext} = testHelpers

// Render smoke only - age-category logic is unit tested (useTicket), markers and
// counts are component tested (admin-allergies-pdf.nuxt.spec.ts)
test.describe('Allergy poster', () => {
    test('renders for a logged-in member', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()

        await page.goto('/admin/allergies/pdf')

        await expect(page.locator('h1')).toContainText('ALLERGI-LISTE')
        await expect(page.locator('table.allergy-table')).toBeVisible()
    })
})
