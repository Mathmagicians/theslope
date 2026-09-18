import {test, expect, type Page} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {AllergyFactory} from '../testDataFactories/allergyFactory'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {SettingFactory} from '../testDataFactories/settingFactory'
import {UserFactory} from '../testDataFactories/userFactory'
import {useCoreValidation} from '~/composables/useCoreValidation'

const {adminUIFile} = authFiles
const {
    validatedBrowserContext,
    memberValidatedBrowserContext,
    freshMemberContext,
    getSessionUserInfo,
    pollUntil,
    temporaryAndRandom
} = testHelpers

const {SystemRoleSchema} = useCoreValidation()

const NOTES_KEY = 'allergy-poster-notes'

/**
 * The catalog is master/detail with a client-only desktop detail pane. The container
 * testid is in the SSR HTML before listeners exist, so the pane's content is the signal
 * that the page is hydrated and interactive.
 */
const gotoCatalog = async (page: Page) => {
    await page.goto('/admin/allergies')
    await pollUntil(
        async () => page.locator('[data-testid="admin-allergies"]').isVisible(),
        (isVisible) => isVisible,
        10
    )
    await pollUntil(
        async () => (await page.getByText('Detaljer').count()) + (await page.getByText('Vælg en allergi').count()),
        (paneCount) => paneCount > 0,
        10
    )
}

/**
 * E2E UI tests for the admin allergy catalog (/admin/allergies).
 *
 * The catalog is master/detail with a responsive detail mount point; the desktop
 * pane shows a fallback selection, so tests select their own row (by id-testid)
 * before acting - parallel tests seed other types into the same catalog.
 *
 * Allergy types use the Peanuts-{salt} pattern for d1-nuke-allergytypes cleanup.
 */
test.describe('AdminAllergies - catalog CRUD', () => {
    const createdAllergyTypeIds: number[] = []

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.createActiveSeason(context)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await AllergyFactory.cleanupAllergyTypes(context, createdAllergyTypeIds)
    })

    const selectRow = async (page: Page, allergyTypeId: number) => {
        const row = page.getByTestId(`allergy-row-${allergyTypeId}`)
        await expect(row).toBeVisible({timeout: 10000})
        await row.click()
        await expect(page.getByTestId('edit-allergy-type')).toBeVisible()
    }

    test('GIVEN the catalog WHEN creating an allergy via the form THEN it is persisted', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const name = `Peanuts-${testSalt}-Create`

        await gotoCatalog(page)
        // The card footer carries the same notes box as the poster
        await expect(page.getByTestId('allergy-notes')).toContainText('Vigtige bemærkninger')

        await page.getByTestId('create-allergy-type').click()
        await expect(page.getByTestId('allergy-type-form')).toBeVisible()

        await page.locator('input[name="allergy-name"]').fill(name)
        await page.locator('input[name="allergy-icon"]').fill('🥜')
        await page.locator('textarea[name="allergy-description"]').fill(`Beskrivelse ${testSalt}`)
        await page.getByTestId('save-allergy-type').click()

        const types = await pollUntil(
            () => AllergyFactory.getAllergyTypes(context),
            (allTypes) => allTypes.some(t => t.name === name)
        )
        const createdType = types.find(t => t.name === name)!
        createdAllergyTypeIds.push(createdType.id!)
        expect(createdType.description).toContain(testSalt)
    })

    test('GIVEN a selected allergy WHEN editing its name THEN the change is persisted', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const allergyType = await AllergyFactory.createAllergyType(context, {
            name: `Peanuts-${testSalt}-Edit`,
            description: `Original ${testSalt}`,
            icon: '🥜'
        })
        createdAllergyTypeIds.push(allergyType.id!)

        await gotoCatalog(page)
        await selectRow(page, allergyType.id!)
        await page.getByTestId('edit-allergy-type').click()
        await expect(page.getByTestId('allergy-type-form')).toBeVisible()

        const updatedName = `Peanuts-${testSalt}-Edited`
        await page.locator('input[name="allergy-name"]').fill(updatedName)
        await page.getByTestId('save-allergy-type').click()

        await pollUntil(
            () => AllergyFactory.getAllergyType(context, allergyType.id!),
            (type) => type?.name === updatedName
        )
    })

    test('GIVEN a selected allergy WHEN confirming delete THEN it is removed', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const allergyType = await AllergyFactory.createAllergyType(context, {
            name: `Peanuts-${testSalt}-Delete`,
            description: `Slettes ${testSalt}`,
            icon: '🥜'
        })

        await gotoCatalog(page)
        await selectRow(page, allergyType.id!)
        await page.getByTestId('delete-allergy-type').click()

        // The confirm panel names the cascade before anything is deleted
        const confirmPanel = page.getByTestId('delete-allergy-type-confirm')
        await expect(confirmPanel).toBeVisible()
        await expect(confirmPanel).toContainText(allergyType.name)

        await page.getByTestId('confirm-delete-allergy-type').click()

        await pollUntil(
            () => AllergyFactory.getAllergyTypes(context),
            (allTypes) => !allTypes.some(t => t.id === allergyType.id)
        )
    })
})

/**
 * "Vigtige bemærkninger" is one Setting row read by the catalog card header and printed on
 * the poster. ADMIN and ALLERGYMANAGER edit it in place; everyone else reads it.
 *
 * The row is global and the API suite writes it too, so this suite only ever APPENDS its own
 * salted line, asserts that line, and removes that line again - never the whole row
 * (docs/testing.md Rule 3).
 */
test.describe('AdminAllergies - poster notes', () => {
    const addedLines: string[] = []

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SettingFactory.removeLines(context, NOTES_KEY, addedLines)
    })

    /** The rendered bullets - the notes the user actually reads, not the textarea they typed into */
    const renderedNotes = (page: Page) => page.getByTestId('allergy-notes-item')

    test('GIVEN an allergy manager WHEN adding a note and saving THEN the bullets, a reload and the poster show it', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberSession = await memberValidatedBrowserContext(browser)
        const {userId} = await getSessionUserInfo(memberSession)
        const newNote = `Husk allergener ${temporaryAndRandom()}`
        addedLines.push(newNote)

        await UserFactory.withSystemRoles(adminContext, userId, [SystemRoleSchema.enum.ALLERGYMANAGER], async () => {
            const context = await freshMemberContext(browser)
            const page = await context.newPage()

            await gotoCatalog(page)
            await page.getByTestId('edit-allergy-notes').click()

            const textarea = page.getByTestId('allergy-notes-textarea')
            await expect(textarea).toBeVisible()
            await textarea.fill(`${await textarea.inputValue()}\n${newNote}`)
            await page.getByTestId('save-allergy-notes').click()

            // The bullets the user reads carry the new line, and the editor is gone
            await expect(renderedNotes(page).filter({hasText: newNote})).toHaveCount(1)
            await expect(page.getByTestId('allergy-notes-textarea')).toHaveCount(0)

            // The row, not a screenful of state: it survives a reload
            await page.reload()
            await expect(renderedNotes(page).filter({hasText: newNote})).toHaveCount(1)

            // The poster prints the same row
            await page.goto('/admin/allergies/pdf')
            await expect(renderedNotes(page).filter({hasText: newNote})).toHaveCount(1)
        })
    })

    // The environment's member may hold ALLERGYMANAGER, so the test states the role it needs
    test('GIVEN a member without the allergy role WHEN viewing the catalog THEN the notes have no pencil', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberSession = await memberValidatedBrowserContext(browser)
        const {userId} = await getSessionUserInfo(memberSession)

        await UserFactory.withSystemRoles(adminContext, userId, [], async () => {
            const context = await freshMemberContext(browser)
            const page = await context.newPage()

            await gotoCatalog(page)

            await expect(page.getByTestId('allergy-notes')).toContainText('Vigtige bemærkninger')
            await expect(page.getByTestId('edit-allergy-notes')).toHaveCount(0)
        })
    })
})
