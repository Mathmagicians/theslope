import {test, expect} from '@playwright/test'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SettingFactory} from '~~/tests/e2e/testDataFactories/settingFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
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

/**
 * Settings are global: ONE row per key, shared by every spec in every project, and the UI
 * suite writes this same row. So each test appends its own salted line and asserts only that
 * line, and `afterAll` removes the lines this file added rather than resetting the row -
 * two suites never clobber each other (docs/testing.md Rule 3).
 *
 * A registered key never answers 404 - without a row the endpoint answers with the registry
 * default, so the poster renders before anyone has edited anything.
 */
test.describe('/api/admin/setting/[key]', () => {
    const addedLines: string[] = []

    const saltedLine = (base: string) => {
        const line = salt(base, temporaryAndRandom())
        addedLines.push(line)
        return line
    }

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SettingFactory.removeLines(context, NOTES_KEY, addedLines)
    })

    test('GIVEN a registered key WHEN reading it THEN it answers with a value, never 404', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const setting = await SettingFactory.getSetting(context, NOTES_KEY)

        expect(setting).not.toBeNull()
        expect(setting!.key).toBe(NOTES_KEY)
        expect(setting!.value.length).toBeGreaterThan(0)
    })

    test('GIVEN an admin WHEN adding a note THEN the row keeps it and names the author', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const {userId} = await getSessionUserInfo(context)
        const line = saltedLine('Glutenfri boller findes i fryseren')

        const written = await SettingFactory.appendLine(context, NOTES_KEY, line)

        expect(written.value).toContain(line)
        expect(written.updatedByUserId).toBe(userId)
        expect(written.updatedAt).not.toBeNull()

        const readBack = await SettingFactory.getSetting(context, NOTES_KEY)
        expect(readBack!.value).toContain(line)
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

            // A rejected write leaves the row untouched, so the value here does not matter
            await SettingFactory.updateSetting(memberContext, NOTES_KEY, 'Min egen bemærkning', 403)
        })

        await UserFactory.withSystemRoles(adminContext, userId, [SystemRoleSchema.enum.ALLERGYMANAGER], async () => {
            const managerContext = await freshMemberContext(browser)
            const line = saltedLine('Allergiansvarlig skrev')

            const written = await SettingFactory.appendLine(managerContext, NOTES_KEY, line)

            expect(written.value).toContain(line)
            expect(written.updatedByUserId).toBe(userId)
        })
    })

    // Every case here is rejected, so none of them touches the shared row
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
