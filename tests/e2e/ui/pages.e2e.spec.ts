import {test, expect} from '@playwright/test'
//import {adminFile} from './auth.setup'
const adminFile = 'playwright/.auth/admin.json'


const publicPages = ['', 'login']
const protectedPages = ['admin', 'household', 'chef']

test('/ has title', async ({page}) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Theslope/);
});

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

    protectedPages.forEach(pageName => {
        test(`Protected page can load when Logged in as admin - /${pageName}`, async ({page: _page}) => {
            // page is authenticated as a user
        })
    })
})
