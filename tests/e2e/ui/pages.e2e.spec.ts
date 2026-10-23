import {test, expect} from '~~/tests/e2e/uiTest'
import testHelpers from '~~/tests/e2e/testHelpers'
//import {adminFile} from './auth.setup'
const adminFile = 'playwright/.auth/admin.json'

const {doScreenshot, pollUntil} = testHelpers

const publicPages = ['', 'login']
const protectedPages = ['admin', 'household', 'chef']

publicPages.forEach(pageName => {
    test(`All public pages can load - /${pageName}`, async ({page}) => {
        for (const pageName of publicPages) {
            const response = await page.goto(`/${pageName}`);
            expect(response?.status()).toBe(200)
        }
    })
})

protectedPages.forEach(pageName => {
    test(`All protected pages redirect to login when not logged in - /${pageName}`, async ({page}) => {
        for (const pageName of protectedPages) {
            // Navigate to protected page without following redirects
            const response = await page.goto(`/${pageName}`)

            // Should redirect to /login (Playwright automatically follows redirects)
            // So we check the final URL is /login and status is 200
            expect(page.url()).toContain('/login')
            expect(response?.status()).toBe(200)
        }
    })
})


test.describe('Pages with logged in user can load', () => {
    test.use({ storageState: adminFile })

    test('Dashboard is shown after login with action cards', async ({page}) => {
        await page.goto('/login')

        // Wait for dashboard to load (shown when logged in)
        await pollUntil(() => page.getByText('Hvad vil du lave i dag?').isVisible(), visible => visible)

        // Verify action cards are visible (use .first() to avoid strict mode violations)
        await expect(page.getByRole('heading', {name: 'Fællesspisning'})).toBeVisible()
        await expect(page.getByRole('heading', {name: 'Min husstand'})).toBeVisible()
        await expect(page.getByRole('heading', {name: 'Mit madhold'})).toBeVisible()

        // Documentation screenshot: User dashboard after login
        await doScreenshot(page, 'user/dashboard', true)
    })
})
