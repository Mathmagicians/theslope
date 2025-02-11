import {test, expect} from '@playwright/test';

const userName = process.env.HEY_NABO_USERNAME as string; //will give runtime error if env variable is undefined - this is intentional
const password = process.env.HEY_NABO_PASSWORD as string;
const newLogin = await request.post('/api/auth/login', {
    data:  {email: userName, password: password}
})

const publicPages = ['', 'login']
const protectedPages = ['admin', 'hosehold', 'chef']

test('/ has title', async ({page}) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Theslope/);
});

publicPages.forEach(pageName => {
    test(`All public pages can load - ${pageName}`, async ({page}) => {
        for (const pageName of publicPages) {
            const response = await page.goto(`/${pageName}`);
            expect(response.status()).toBe(200)
        }
    })
})

protectedPages.forEach(pageName => {
    test(`All protected pages give 401 unauthorized error when not logged in - ${pageName}`, async ({page}) => {
        for (const pageName of protectedPages) {
            const response = await page.goto(`/${pageName}`);
            expect(response.status()).toBe(401)
        }
    })
})
