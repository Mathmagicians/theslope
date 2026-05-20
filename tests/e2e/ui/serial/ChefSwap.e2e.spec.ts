import {test, expect, type Page, type BrowserContext} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {formatDate} from '~/utils/date'
import {isThisACookingDay} from '~/utils/season'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, getSessionUserInfo, temporaryAndRandom, doScreenshot} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

test.describe('Chef Swap — volunteer flow', () => {
    let teamId: number
    let memberInhabitantId: number
    const createdTeamIds: number[] = []
    const createdDinnerIds: number[] = []

    const ROLE_TRIGGER = '[data-testid="role-assignment-trigger"]'
    const ROLE_SAVE = '[data-testid="role-assignment-save"]'
    const ROLE_CANCEL = '[data-testid="role-assignment-cancel"]'
    const ROLE_RESIGN = '[data-testid="role-assignment-resign"] button'
    const CHEF_WANTED = '[data-testid="chef-wanted"]'
    const CHEF_DISPLAY = '[data-testid="chef-display"]'

    // Opens the role form; retries the trigger if a background re-render closes it
    // (volunteering flips /chef into chef mode, which briefly remounts the form).
    const openForm = async (page: Page) => {
        await pollUntil(
            async () => {
                if (await page.locator(ROLE_CANCEL).first().isVisible().catch(() => false)) return true
                await page.locator(ROLE_TRIGGER).first().click().catch(() => {})
                return false
            },
            isOpen => isOpen,
            12
        )
    }

    const expectDinnerChef = (ctx: BrowserContext, dinnerId: number, expected: number | null) =>
        pollUntil(
            async () => (await DinnerEventFactory.getDinnerEvent(ctx, dinnerId))?.chefId,
            chefId => chefId === expected,
            5
        )

    // Non-cooking days carry no generated event; the list is identical across
    // workers (pure season config), so index gives each test a race-free date.
    const createVacantDinner = async (ctx: BrowserContext, index: number) => {
        const season = await SeasonFactory.createActiveSeason(ctx)

        const freeDates: Date[] = []
        const cursor = new Date(season.seasonDates.start)
        const end = new Date(season.seasonDates.end)
        while (cursor <= end) {
            if (!isThisACookingDay(cursor, season.cookingDays)) freeDates.push(new Date(cursor))
            cursor.setDate(cursor.getDate() + 1)
        }
        expect(freeDates.length, 'season needs a free date per test').toBeGreaterThan(index)
        const date = freeDates[index]!
        date.setHours(12, 0, 0, 0)

        const dinner = await DinnerEventFactory.createDinnerEvent(ctx, {
            date,
            menuTitle: `VacantDinner-${temporaryAndRandom()}`,
            seasonId: season.id!,
            cookingTeamId: teamId,
            chefId: null
        })
        createdDinnerIds.push(dinner.id!)
        return {id: dinner.id!, date}
    }

    test.beforeAll(async ({browser}) => {
        const adminCtx = await validatedBrowserContext(browser)
        const memberCtx = await memberValidatedBrowserContext(browser)

        const season = await SeasonFactory.createActiveSeason(adminCtx)
        memberInhabitantId = (await getSessionUserInfo(memberCtx)).inhabitantId

        const team = await SeasonFactory.createCookingTeamForSeason(
            adminCtx, season.id!, `SwapTeam-${temporaryAndRandom()}`
        )
        teamId = team.id!
        createdTeamIds.push(teamId)
        await SeasonFactory.assignMemberToTeam(adminCtx, teamId, memberInhabitantId, TeamRole.CHEF)
    })

    test.afterAll(async ({browser}) => {
        const adminCtx = await validatedBrowserContext(browser)
        for (const id of createdDinnerIds) await DinnerEventFactory.deleteDinnerEvent(adminCtx, id).catch(() => null)
        for (const id of createdTeamIds) await SeasonFactory.deleteCookingTeam(adminCtx, id)
    })

    const mounts = [
        {label: '/chef',   url: (date: Date) => `/chef?team=${teamId}&date=${formatDate(date)}`},
        {label: '/dinner', url: (date: Date) => `/dinner?date=${formatDate(date)}`}
    ]

    mounts.forEach(({label, url}, mountIndex) => {
        test(`${label}: chef lifecycle — volunteer then Meld afbud returns the dinner to vacant`, async ({browser}) => {
            const adminCtx = await validatedBrowserContext(browser)
            const dinner = await createVacantDinner(adminCtx, mountIndex * 2)

            const memberCtx = await memberValidatedBrowserContext(browser)
            const page = await memberCtx.newPage()

            let assignRole: {status: number, url: string} | null = null
            let removeRole: {status: number} | null = null
            page.on('response', (r) => {
                if (/\/api\/team\/cooking\/\d+\/assign-role$/.test(r.url())) {
                    assignRole = {status: r.status(), url: r.url()}
                }
                if (/\/api\/team\/cooking\/\d+\/remove-role$/.test(r.url())) {
                    removeRole = {status: r.status()}
                }
            })

            // Volunteer: vacant dinner → member becomes chef
            await page.goto(url(dinner.date))
            await expect(page.locator(CHEF_WANTED).first(), 'precondition: WANTED placeholder').toBeVisible()
            if (label === '/dinner') await doScreenshot(page, 'chef/role-wanted', true)
            await openForm(page)
            await page.locator(ROLE_SAVE).first().click()

            const assignResult = await pollUntil(async () => assignRole, (r) => r !== null, 10)
            expect(assignResult!.url, 'assign-role must target the test dinner').toContain(`/cooking/${dinner.id}/`)
            expect(assignResult!.status, 'assign-role must succeed').toBe(200)
            await expectDinnerChef(memberCtx, dinner.id, memberInhabitantId)

            await expect(page.locator(ROLE_TRIGGER).first(), 'trigger becomes "Ændre tjans" once chef').toContainText('Ændre tjans')
            await expect(page.locator(CHEF_WANTED).first(), 'WANTED placeholder gone').not.toBeVisible()
            await expect(page.locator(CHEF_DISPLAY).first(), 'chef portrait renders after volunteer').toBeVisible()
            if (label === '/dinner') await doScreenshot(page, 'chef/role-assigned', true)

            // Meld afbud: chef resigns → dinner back to vacant
            await openForm(page)
            const resignBtn = page.locator(ROLE_RESIGN).first()
            await resignBtn.click()  // DangerButton: first click arms, second commits
            await expect(resignBtn, 'DangerButton armed state settled').toContainText('Tryk igen')
            await resignBtn.click()

            const removeResult = await pollUntil(async () => removeRole, (r) => r !== null, 10)
            expect(removeResult!.status, 'remove-role must succeed').toBe(200)
            await expectDinnerChef(memberCtx, dinner.id, null)

            await expect(page.locator(ROLE_TRIGGER).first(), 'trigger back to "Bliv chefkok"').toContainText('Bliv chefkok')
            await expect(page.locator(CHEF_DISPLAY).first(), 'chef portrait gone').not.toBeVisible()
            await expect(page.locator(CHEF_WANTED).first(), 'dinner vacant again after Meld afbud').toBeVisible()
        })

        test(`${label}: cancelling the volunteer form leaves the dinner without a chef if there was no chef before`, async ({browser}) => {
            const adminCtx = await validatedBrowserContext(browser)
            const dinner = await createVacantDinner(adminCtx, mountIndex * 2 + 1)

            const memberCtx = await memberValidatedBrowserContext(browser)
            const page = await memberCtx.newPage()

            const before = await DinnerEventFactory.getDinnerEvent(adminCtx, dinner.id)
            expect(before?.chefId, 'precondition: dinner is vacant').toBeNull()

            await page.goto(url(dinner.date))
            await openForm(page)
            await page.locator(ROLE_CANCEL).first().click()

            await expect(page.locator(ROLE_SAVE).first()).not.toBeVisible()
            const after = await DinnerEventFactory.getDinnerEvent(adminCtx, dinner.id)
            expect(after?.chefId, 'cancel did not claim').toBeNull()
        })
    })
})
