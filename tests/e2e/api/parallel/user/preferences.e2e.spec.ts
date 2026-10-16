import {test, expect} from '@playwright/test'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useUserPreferenceValidation, type Appearance, type NotificationChannel} from '~/composables/useUserPreferenceValidation'

const {validatedBrowserContext, memberValidatedBrowserContext} = testHelpers
const {NotificationChannelSchema, PaletteSchema, TextScaleSchema, DEFAULT_APPEARANCE} = useUserPreferenceValidation()
const Channel = NotificationChannelSchema.enum
const Palette = PaletteSchema.enum
const TextScale = TextScaleSchema.enum

/**
 * POST /api/user/preferences and POST /api/user/notifications/test - the member's own settings.
 *
 * Both write the session user only, so there is no id in the path and no cross-user case to test.
 * The member's saved values are read once and restored in afterAll.
 */
test.describe('User preferences', () => {
    // Every case writes the same member row (channels, appearance, phone), so they run in order
    test.describe.configure({mode: 'serial'})

    let originalChannels: NotificationChannel[] = []
    let originalAppearance: Appearance = {...DEFAULT_APPEARANCE}
    let originalPhone: string | null = null
    let memberUserId = 0

    test.beforeAll(async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const me = await UserFactory.getSessionUser(memberContext)
        memberUserId = me.id
        originalChannels = me.notificationChannels
        originalAppearance = me.appearance
        originalPhone = me.phone ?? null
    })

    test.afterAll(async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const adminContext = await validatedBrowserContext(browser)
        await UserFactory.setPhone(adminContext, memberUserId, originalPhone)
        await UserFactory.updateMyPreferences(memberContext, {
            notificationChannels: originalChannels,
            appearance: originalAppearance
        })
    })

    test('GIVEN a member WHEN saving channels and appearance THEN the response and the session both carry them', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const preferences: {notificationChannels: NotificationChannel[], appearance: Appearance} = {
            notificationChannels: [Channel.EMAIL],
            appearance: {palette: Palette['high-contrast'], textScale: TextScale.large}
        }

        const updated = await UserFactory.updateMyPreferences(context, preferences)

        expect(updated!.notificationChannels).toEqual(preferences.notificationChannels)
        expect(updated!.appearance).toEqual(preferences.appearance)

        const sessionUser = await UserFactory.getSessionUser(context)
        expect(sessionUser.notificationChannels).toEqual(preferences.notificationChannels)
        expect(sessionUser.appearance).toEqual(preferences.appearance)
    })

    test('GIVEN a member WHEN saving only the appearance THEN the channels are untouched', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        await UserFactory.updateMyPreferences(context, {notificationChannels: [Channel.EMAIL]})

        const appearance = {palette: Palette.default, textScale: TextScale.larger}
        const updated = await UserFactory.updateMyPreferences(context, {appearance})

        expect(updated!.notificationChannels).toEqual([Channel.EMAIL])
        expect(updated!.appearance).toEqual(appearance)
    })

    // The endpoint's 400: a business rule, not a field rule (an unlisted palette is the useUserPreferenceValidation unit spec's)
    test('GIVEN a member without a phone WHEN asking for SMS THEN 400', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const adminContext = await validatedBrowserContext(browser)

        await UserFactory.setPhone(adminContext, memberUserId, null)
        try {
            await UserFactory.updateMyPreferences(memberContext, {notificationChannels: [Channel.EMAIL, Channel.SMS]}, 400)
        } finally {
            await UserFactory.setPhone(adminContext, memberUserId, originalPhone)
        }
    })

    test('GIVEN no session WHEN saving preferences THEN 401', async ({browser}) => {
        const anonymous = await browser.newContext()

        const response = await anonymous.request.post('/api/user/preferences', {
            headers: testHelpers.headers,
            data: {notificationChannels: [Channel.EMAIL]}
        })

        expect(response.status()).toBe(401)
    })

    test('GIVEN a member WHEN asking for a test message THEN it is queued to the member', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)

        const result = await UserFactory.sendTestNotification(context)

        expect(result!.dedupeKey).toMatch(/^TEST:EMAIL:/)
    })
})
