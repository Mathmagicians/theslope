import {test, expect} from '~~/tests/e2e/uiTest'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {UserFactory} from '../testDataFactories/userFactory'
import {PREF_TEST_IDS} from '~~/tests/component/components/user/userPreferencesTestIds'
import {useUserPreferenceValidation, type Appearance, type NotificationChannel, type Palette, type TextScale} from '~/composables/useUserPreferenceValidation'

const {memberUIFile} = authFiles
const {waitForHydration, gotoHydrated, memberValidatedBrowserContext, openPreferences, savePreferences} = testHelpers
const {PaletteSchema, TextScaleSchema, DEFAULT_APPEARANCE} = useUserPreferenceValidation()
const PaletteKind = PaletteSchema.enum
const TextScaleKind = TextScaleSchema.enum

/**
 * "Mine indstillinger" on the dashboard: the appearance a member picks reaches <html> on every page,
 * through the layout's htmlAttrs, and survives a reload because the session carries it.
 */
test.describe('My preferences', () => {
    test.use({storageState: memberUIFile})

    let originalChannels: NotificationChannel[] = []
    let originalAppearance: Appearance = DEFAULT_APPEARANCE

    const html = (page: import('@playwright/test').Page) => page.locator('html')

    const saveAppearance = async (page: import('@playwright/test').Page, palette: Palette, textScale: TextScale) => {
        const saved = await savePreferences(page, [PREF_TEST_IDS.palette(palette), PREF_TEST_IDS.textScale(textScale)])
        expect(saved.status()).toBe(200)
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

    test('GIVEN a logged-in member on the dashboard WHEN picking Høj kontrast and Stor THEN html carries the appearance, also after reload, AND WHEN picking Glade farver and Normal THEN html carries neither attribute', async ({page}) => {
        await gotoHydrated(page, '/login')
        await openPreferences(page)

        await saveAppearance(page, PaletteKind['high-contrast'], TextScaleKind.large)

        await expect(html(page)).toHaveAttribute('data-palette', PaletteKind['high-contrast'])
        await expect(html(page)).toHaveAttribute('data-text-scale', TextScaleKind.large)

        await page.reload()
        await waitForHydration(page)

        await expect(html(page)).toHaveAttribute('data-palette', PaletteKind['high-contrast'])
        await expect(html(page)).toHaveAttribute('data-text-scale', TextScaleKind.large)

        // WHEN: back to the base palette and text size, the reload closed the card
        await openPreferences(page)
        await saveAppearance(page, PaletteKind.default, TextScaleKind.normal)

        await expect(html(page)).not.toHaveAttribute('data-palette')
        await expect(html(page)).not.toHaveAttribute('data-text-scale')
    })
})
