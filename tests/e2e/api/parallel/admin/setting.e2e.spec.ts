import {test, expect} from '@playwright/test'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SettingFactory} from '~~/tests/e2e/testDataFactories/settingFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {SETTING_REGISTRY} from '~/composables/useSettingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'

const {
    validatedBrowserContext,
    memberValidatedBrowserContext,
    freshMemberContext,
    getSessionUserInfo,
    salt,
    temporaryAndRandom
} = testHelpers
const {SystemRoleSchema} = useCoreValidation()

const NOTES_KEY = 'allergy-poster-notes'
const DEFAULT_NOTES = SETTING_REGISTRY[NOTES_KEY].defaultValue

/**
 * Settings are global: one row per registered key, shared by every surface that reads it.
 * The suite restores the registry default in `afterAll`, so the app is left with the text
 * it ships with.
 *
 * A registered key never answers 404 - without a row the endpoint answers with the registry
 * default, so the poster renders before anyone has edited anything.
 */
test.describe('/api/admin/setting/[key]', () => {
    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SettingFactory.restoreDefault(context, NOTES_KEY)
    })

    test('GIVEN a registered key WHEN reading it THEN it answers with a value, never 404', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const setting = await SettingFactory.getSetting(context, NOTES_KEY)

        expect(setting).not.toBeNull()
        expect(setting!.key).toBe(NOTES_KEY)
        expect(setting!.value.length).toBeGreaterThan(0)
    })

    test('GIVEN the registry default WHEN it is written THEN the key reads the shipped text back', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        await SettingFactory.restoreDefault(context, NOTES_KEY)

        const setting = await SettingFactory.getSetting(context, NOTES_KEY)
        expect(setting!.value).toBe(DEFAULT_NOTES)
    })

    test('GIVEN an admin WHEN writing the notes THEN the row is stored and read back', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const {userId} = await getSessionUserInfo(context)
        const value = salt('Glutenfri boller findes i fryseren', temporaryAndRandom())

        const written = await SettingFactory.updateSetting(context, NOTES_KEY, value)

        expect(written!.value).toBe(value)
        expect(written!.updatedByUserId).toBe(userId)
        expect(written!.updatedAt).not.toBeNull()

        const readBack = await SettingFactory.getSetting(context, NOTES_KEY)
        expect(readBack!.value).toBe(value)
    })

    /**
     * Any authenticated user reaches the endpoint; the key's own writer predicate decides.
     * The test states the role it needs rather than depending on what the environment granted.
     */
    test('GIVEN a member WHEN the allergy role is taken and given THEN 403 then 200', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberSession = await memberValidatedBrowserContext(browser)
        const {userId} = await getSessionUserInfo(memberSession)

        await UserFactory.withSystemRoles(adminContext, userId, [], async () => {
            const memberContext = await freshMemberContext(browser)

            await SettingFactory.updateSetting(memberContext, NOTES_KEY, 'Min egen bemærkning', 403)
        })

        await UserFactory.withSystemRoles(adminContext, userId, [SystemRoleSchema.enum.ALLERGYMANAGER], async () => {
            const managerContext = await freshMemberContext(browser)

            const written = await SettingFactory.updateSetting(
                managerContext,
                NOTES_KEY,
                salt('Allergiansvarlig skrev', temporaryAndRandom())
            )

            expect(written!.updatedByUserId).toBe(userId)
        })
    })

    test.describe('validation', () => {
        test('GIVEN an unknown key WHEN reading it THEN 400', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            await SettingFactory.getSetting(context, 'not-a-setting', 400)
        })

        test('GIVEN an unknown key WHEN writing it THEN 400', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            await SettingFactory.updateSetting(context, 'not-a-setting', 'noget', 400)
        })

        const rejectedValues = [
            {label: 'an empty value', value: '   '},
            {label: 'a value of the wrong type', value: {bullets: ['A']}},
            {label: 'a value over 2000 characters', value: 'x'.repeat(2001)}
        ]

        for (const {label, value} of rejectedValues) {
            test(`GIVEN ${label} WHEN writing the notes THEN 400`, async ({browser}) => {
                const context = await validatedBrowserContext(browser)

                await SettingFactory.updateSetting(context, NOTES_KEY, value, 400)
            })
        }
    })
})
