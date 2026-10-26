import {expect, type BrowserContext, type Page} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {Given, When, Then, fromScene, contextOfActor, ACTOR, REQUEST, type Actor, type Scene} from '~~/tests/e2e/fixtures'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {SenderFactory} from '~~/tests/e2e/testDataFactories/senderFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {PREF_TEST_IDS} from '~~/tests/component/components/user/userPreferencesTestIds'
import {
    useUserPreferenceValidation, type Appearance, type NotificationChannel, type Palette, type TextScale, type UserPreferencesUpdate
} from '~/composables/useUserPreferenceValidation'
import type {UserDetail} from '~/composables/useCoreValidation'
import type {NotificationKind} from '~/config/notificationTemplates'

const {gotoHydrated, openPreferences, savePreferences} = testHelpers
const {NotificationChannelSchema, PaletteSchema, TextScaleSchema, DEFAULT_APPEARANCE} = useUserPreferenceValidation()

/** The settings by their words in a feature: a text scale, a palette, a channel; "channel none" is no channel at all */
const SETTING = {TEXT_SCALE: 'text scale', PALETTE: 'palette', CHANNEL: 'channel'} as const
const NO_CHANNEL = 'none'
type Setting =
    | {kind: typeof SETTING.TEXT_SCALE, value: TextScale}
    | {kind: typeof SETTING.PALETTE, value: Palette}
    | {kind: typeof SETTING.CHANNEL, value: NotificationChannel[]}

const settingOf = (words: string): Setting => {
    const valueAfter = (kind: string) => words.slice(kind.length + 1)
    if (words.startsWith(SETTING.TEXT_SCALE)) return {kind: SETTING.TEXT_SCALE, value: TextScaleSchema.parse(valueAfter(SETTING.TEXT_SCALE))}
    if (words.startsWith(SETTING.PALETTE)) return {kind: SETTING.PALETTE, value: PaletteSchema.parse(valueAfter(SETTING.PALETTE))}
    const channel = valueAfter(SETTING.CHANNEL)
    return {kind: SETTING.CHANNEL, value: channel === NO_CHANNEL ? [] : [NotificationChannelSchema.parse(channel)]}
}

defineParameterType({
    name: 'setting',
    regexp: [
        ...TextScaleSchema.options.map(textScale => `${SETTING.TEXT_SCALE} ${textScale}`),
        ...PaletteSchema.options.map(palette => `${SETTING.PALETTE} ${palette}`),
        ...[...NotificationChannelSchema.options, NO_CHANNEL].map(channel => `${SETTING.CHANNEL} ${channel}`)
    ],
    transformer: settingOf
})

/** How the text looks after a save, by its words in a feature */
const TEXT_CHANGE = {LARGER: 'larger', SMALLER: 'smaller'} as const
type TextChange = typeof TEXT_CHANGE[keyof typeof TEXT_CHANGE]
defineParameterType({name: 'textChange', regexp: Object.values(TEXT_CHANGE)})

// The UI scenarios save through "Mine indstillinger"; the API scenarios through the preference endpoint
const UI_SCENARIOS = '@e2e-parallel or @e2e-serial'

/** The save a setting makes: the appearance is saved whole, so its other field keeps the user's value */
const updateOf = (setting: Setting, {appearance}: {appearance: Appearance}): UserPreferencesUpdate => {
    switch (setting.kind) {
        case SETTING.TEXT_SCALE:
            return {appearance: {...appearance, textScale: setting.value}}
        case SETTING.PALETTE:
            return {appearance: {...appearance, palette: setting.value}}
        case SETTING.CHANNEL:
            return {notificationChannels: setting.value}
    }
}

/** The signed-in user's context: the scene puts back the user's settings alone */
const memberOf = (scene: Scene, actor: Actor): BrowserContext => {
    if (actor !== ACTOR.USER) throw new Error(`The scene puts back the user's settings, not those of ${actor}`)
    return contextOfActor(scene, actor)
}

/** The user as the session carries it; the first read keeps the settings the scenario found, put back after it */
const keepMemberSettings = async (scene: Scene, member: BrowserContext): Promise<UserDetail> => {
    const user = await UserFactory.getSessionUser(member)
    scene.memberSettings ??= {userId: user.id, notificationChannels: user.notificationChannels, appearance: user.appearance, phone: user.phone ?? null}
    return user
}

/** The root font size in px: the text scale sets it on <html> */
const rootTextSizeOf = (page: Page): Promise<number> =>
    page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize))

/** The control of "Mine indstillinger" that picks the setting */
const testIdOf = (setting: Setting): string => {
    switch (setting.kind) {
        case SETTING.TEXT_SCALE:
            return PREF_TEST_IDS.textScale(setting.value)
        case SETTING.PALETTE:
            return PREF_TEST_IDS.palette(setting.value)
        case SETTING.CHANNEL:
            throw new Error('The UI scenarios save the appearance; a channel is saved through the API')
    }
}

Given('{actor} has the setting {setting}', async ({scene}, actor: Actor, setting: Setting) => {
    const member = memberOf(scene, actor)
    await UserFactory.updateMyPreferences(member, updateOf(setting, await keepMemberSettings(scene, member)))
})

Then('{actor} has the setting {setting}', async ({scene}, actor: Actor, setting: Setting) => {
    const {appearance, notificationChannels} = await UserFactory.getSessionUser(contextOfActor(scene, actor))
    switch (setting.kind) {
        case SETTING.TEXT_SCALE:
            expect(appearance.textScale).toBe(setting.value)
            break
        case SETTING.PALETTE:
            expect(appearance.palette).toBe(setting.value)
            break
        case SETTING.CHANNEL:
            expect(notificationChannels).toEqual(setting.value)
            break
    }
})

When('{actor} saves the setting {setting}', {tags: `not (${UI_SCENARIOS})`}, async ({scene}, actor: Actor, setting: Setting) => {
    const context = contextOfActor(scene, actor)
    // A visitor has no session, so no settings to keep
    const current = actor === ACTOR.USER ? await keepMemberSettings(scene, context) : {appearance: DEFAULT_APPEARANCE}
    const {status} = await UserFactory.updateMyPreferencesRaw(context, updateOf(setting, current))
    scene.answer = {request: REQUEST.SAVE, status}
})

When('{actor} saves the setting {setting}', {tags: UI_SCENARIOS}, async ({scene}, actor: Actor, setting: Setting) => {
    const member = memberOf(scene, actor)
    await keepMemberSettings(scene, member)
    const page = await member.newPage()
    scene.page = page
    await gotoHydrated(page, '/login')
    scene.before = {textSize: await rootTextSizeOf(page), palette: await page.locator('html').getAttribute('data-palette')}
    await openPreferences(page)

    const saved = await savePreferences(page, [testIdOf(setting)])

    expect(saved.status(), 'the save answers 200').toBe(200)
})

Then('{actor} sees the text {textChange}', async ({scene}, actor: Actor, change: TextChange) => {
    // The user who saved is the one who sees it
    memberOf(scene, actor)
    const page = fromScene(scene, 'page')
    const {textSize} = fromScene(scene, 'before')
    switch (change) {
        case TEXT_CHANGE.LARGER:
            await expect.poll(() => rootTextSizeOf(page), 'the text turns larger').toBeGreaterThan(textSize)
            break
        case TEXT_CHANGE.SMALLER:
            await expect.poll(() => rootTextSizeOf(page), 'the text turns smaller').toBeLessThan(textSize)
            break
    }
})

Then('{actor} sees the colours change', async ({scene}, actor: Actor) => {
    const {appearance} = await UserFactory.getSessionUser(memberOf(scene, actor))
    const html = fromScene(scene, 'page').locator('html')
    // The default palette is the base stylesheet: <html> carries no data-palette for it
    const shown = appearance.palette === PaletteSchema.enum.default ? null : appearance.palette
    expect(shown, 'the saved palette is another than the one before').not.toBe(fromScene(scene, 'before').palette)
    if (shown === null) await expect(html).not.toHaveAttribute('data-palette')
    else await expect(html).toHaveAttribute('data-palette', shown)
})

Given('{actor} has no phone number', async ({adminContext: admin, scene}, actor: Actor) => {
    const {id} = await keepMemberSettings(scene, memberOf(scene, actor))
    await UserFactory.setPhone(admin, id, null)
})

When('{actor} asks for a test message', async ({scene}, actor: Actor) => {
    const testMessage = await UserFactory.sendTestNotification(contextOfActor(scene, actor))
    if (!testMessage) throw new Error('The test message answered nothing')
    scene.testMessage = testMessage
})

When('{actor} asks for the admin\'s test message', async ({scene}, actor: Actor) => {
    const {status} = await SenderFactory.triggerTestEventRaw(contextOfActor(scene, actor))
    scene.answer = {request: REQUEST.TEST_MESSAGE, status}
})

Then('a {notification} email is queued to the sender', async ({scene}, notification: NotificationKind) => {
    const {queued, dedupeKey} = fromScene(scene, 'testMessage')
    expect(queued, 'the sender queue takes the message').toBe(true)
    expect(dedupeKey).toMatch(new RegExp(`^${notification}:${NotificationChannelSchema.enum.EMAIL}:`))
})
