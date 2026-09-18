import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {UserFactory} from '../testDataFactories/userFactory'
import {PREF_TEST_IDS} from '~~/tests/component/components/user/userPreferencesTestIds'
import type {Appearance, NotificationChannel} from '~/composables/useUserPreferenceValidation'

const {memberUIFile} = authFiles
const {waitForHydration, memberValidatedBrowserContext} = testHelpers

/**
 * "Mine indstillinger" on the dashboard: the appearance a member picks reaches <html> on every page,
 * through the layout's htmlAttrs, and survives a reload because the session carries it.
 */
test.describe('My preferences', () => {
    // Both cases save the same member's appearance, so they run in order
    test.describe.configure({mode: 'serial'})
    test.use({storageState: memberUIFile})

    let originalChannels: NotificationChannel[] = []
    let originalAppearance: Appearance = {palette: 'default', textScale: 'normal'}

    const html = (page: import('@playwright/test').Page) => page.locator('html')

    /** The card is behind the ⚙ in the profile card header (open state is component-local) */
    const openPreferences = async (page: import('@playwright/test').Page) => {
        await page.getByTestId(PREF_TEST_IDS.toggle).click()
        await expect(page.getByTestId(PREF_TEST_IDS.card)).toBeVisible()
    }

    const saveAppearance = async (page: import('@playwright/test').Page, palette: string, textScale: string) => {
        await page.getByTestId(PREF_TEST_IDS.edit).click()
        await page.getByTestId(PREF_TEST_IDS.palette(palette)).click()
        await page.getByTestId(PREF_TEST_IDS.textScale(textScale)).click()
        const saved = page.waitForResponse(
            (response) => response.url().includes('/api/user/preferences') && response.request().method() === 'POST',
            {timeout: 15000}
        )
        await page.getByTestId(PREF_TEST_IDS.save).click()
        expect((await saved).status()).toBe(200)
    }

    test.beforeAll(async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const me = await UserFactory.getSessionUser(context)
        originalChannels = me.notificationChannels
        originalAppearance = me.appearance
    })

    test.afterAll(async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        await UserFactory.updateMyPreferences(context, {
            notificationChannels: originalChannels,
            appearance: originalAppearance
        })
    })

    test.beforeEach(() => {
        // Dev server compiles each route lazily on first visit; hydration polling adds up
        test.setTimeout(90_000)
    })

    test('GIVEN a logged-in member on the dashboard WHEN picking Høj kontrast and Stor THEN html carries the appearance, also after reload', async ({page}) => {
        await page.goto('/login')
        await waitForHydration(page)
        await openPreferences(page)

        await saveAppearance(page, 'high-contrast', 'large')

        await expect(html(page)).toHaveAttribute('data-palette', 'high-contrast')
        await expect(html(page)).toHaveAttribute('data-text-scale', 'large')

        await page.reload()
        await waitForHydration(page)

        await expect(html(page)).toHaveAttribute('data-palette', 'high-contrast')
        await expect(html(page)).toHaveAttribute('data-text-scale', 'large')
    })

    test('GIVEN a member on Høj kontrast WHEN picking Glade farver and Normal THEN html carries neither attribute', async ({page}) => {
        await page.goto('/login')
        await waitForHydration(page)
        await openPreferences(page)
        await saveAppearance(page, 'high-contrast', 'large')

        await saveAppearance(page, 'default', 'normal')

        await expect(html(page)).not.toHaveAttribute('data-palette')
        await expect(html(page)).not.toHaveAttribute('data-text-scale')
    })
})
