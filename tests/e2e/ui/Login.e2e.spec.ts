import type {Page} from '@playwright/test'
import {test, expect} from '@playwright/test'
import testHelpers from '~~/tests/e2e/testHelpers'
import {testCredentials} from '~~/tests/e2e/config'

const {waitForHydration} = testHelpers
const {adminUserName, password} = testCredentials

const DEEP_LINK = '/admin/planning'
const DAY_SECONDS = 60 * 60 * 24

const logInThroughForm = async (page: Page) => {
    await waitForHydration(page)
    await page.locator('input[type="email"]').fill(adminUserName)
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole('button', {name: /log ind/i}).click()
}

// The return path and the session lifetime start logged out
test.use({storageState: {cookies: [], origins: []}})

test.describe('Login flow', () => {

    test('GIVEN a logged-out deep link WHEN logging in THEN the user lands on that link with a day-long session', async ({page}) => {
        // GIVEN: the guard sends the deep link to login and carries the return path
        await page.goto(DEEP_LINK)
        await page.waitForURL(`/login?redirect=${encodeURIComponent(DEEP_LINK)}`)

        // WHEN: logging in through the form
        await logInThroughForm(page)

        // THEN: the user lands on the deep link
        await page.waitForURL(new RegExp(`${DEEP_LINK}$`))

        // AND: the session cookie expires, at most a day out
        const sessionCookie = (await page.context().cookies()).find(cookie => cookie.name === 'nuxt-session')
        expect(sessionCookie, 'the session cookie exists').toBeDefined()
        const lifetime = sessionCookie!.expires - Date.now() / 1000
        expect(lifetime, 'the cookie expires').toBeGreaterThan(0)
        expect(lifetime, 'the cookie lives at most a day').toBeLessThanOrEqual(DAY_SECONDS)
    })

    test('GIVEN a plain login WHEN logging in THEN the dashboard shows', async ({page}) => {
        await page.goto('/login')
        await logInThroughForm(page)

        await expect(page.getByTestId('logout-button')).toBeVisible()
        await expect(page).toHaveURL(/\/login$/)
    })
})
