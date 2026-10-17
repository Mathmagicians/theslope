import {test, expect, type Page, type BrowserContext} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {formatDate} from '~/utils/date'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, getSessionUserInfo, temporaryAndRandom, doScreenshot, gotoHydrated} = testHelpers
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

    // Opens the role form on a hydrated page
    const openForm = async (page: Page) => {
        await page.locator(ROLE_TRIGGER).first().click()
        await expect(page.locator(ROLE_CANCEL).first(), 'the role form opens').toBeVisible()
    }

    const expectDinnerChef = (ctx: BrowserContext, dinnerId: number, expected: number | null) =>
        pollUntil(
            async () => (await DinnerEventFactory.getDinnerEvent(ctx, dinnerId))?.chefId,
            chefId => chefId === expected,
            5
        )

    // A team with the member as chef and a vacant dinner, alone on a free day of the season; afterEach empties the calendar again
    const createVacantDinner = async (ctx: BrowserContext) => {
        const season = await SeasonFactory.createActiveSeason(ctx)
        const {team, dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(ctx, season, memberInhabitantId, {
            teamName: `SwapTeam-${temporaryAndRandom()}`,
            dinner: {menuTitle: `VacantDinner-${temporaryAndRandom()}`, chefId: null},
            day: 'free'
        })
        teamId = team.id!
        createdTeamIds.push(teamId)
        createdDinnerIds.push(dinner.id!)
        return {id: dinner.id!, date: new Date(dinner.date)}
    }

    test.beforeAll(async ({browser}) => {
        const memberCtx = await memberValidatedBrowserContext(browser)
        memberInhabitantId = (await getSessionUserInfo(memberCtx)).inhabitantId
    })

    // Runs on failure too — the shared date must be free before the next test; cleanup accepts a dinner already gone
    test.afterEach(async ({browser}) => {
        const adminCtx = await validatedBrowserContext(browser)
        for (const id of createdDinnerIds.splice(0)) {
            await DinnerEventFactory.deleteDinnerEvent(adminCtx, id)
        }
    })

    test.afterAll(async ({browser}) => {
        const adminCtx = await validatedBrowserContext(browser)
        for (const id of createdTeamIds) await SeasonFactory.deleteCookingTeam(adminCtx, id)
    })

    const mounts = [
        {label: '/chef',   url: (date: Date) => `/chef?team=${teamId}&date=${formatDate(date)}`},
        {label: '/dinner', url: (date: Date) => `/dinner?date=${formatDate(date)}`}
    ]

    mounts.forEach(({label, url}) => {
        test(`${label}: chef lifecycle — volunteer then Meld afbud returns the dinner to vacant`, async ({browser}) => {
            const adminCtx = await validatedBrowserContext(browser)
            const dinner = await createVacantDinner(adminCtx)

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
            await gotoHydrated(page, url(dinner.date))
            await expect(page.locator(CHEF_WANTED).first(), 'precondition: WANTED placeholder').toBeVisible()
            if (label === '/dinner') await doScreenshot(page, 'chef/role-wanted', true)
            await openForm(page)
            await page.locator(ROLE_SAVE).first().click()

            const assignResult = await pollUntil(async () => assignRole, (r) => r !== null, 6)
            expect(assignResult!.url, 'assign-role must target the test dinner').toContain(`/cooking/${dinner.id}/`)
            expect(assignResult!.status, 'assign-role must succeed').toBe(200)
            await expectDinnerChef(memberCtx, dinner.id, memberInhabitantId)

            // Meld afbud: chef resigns → dinner back to vacant. Reload for a deterministic
            // chef-mode render — mid-session re-rendering is component-test territory.
            await gotoHydrated(page, url(dinner.date))
            if (label === '/dinner') await doScreenshot(page, 'chef/role-assigned', true)
            await openForm(page)
            const resignBtn = page.locator(ROLE_RESIGN).first()
            await resignBtn.click()  // DangerButton: first click arms, second commits
            await expect(resignBtn).toContainText('Tryk igen')
            await resignBtn.click()

            const removeResult = await pollUntil(async () => removeRole, (r) => r !== null, 6)
            expect(removeResult!.status, 'remove-role must succeed').toBe(200)
            await expectDinnerChef(memberCtx, dinner.id, null)

            await expect(page.locator(CHEF_WANTED).first(), 'dinner vacant again after Meld afbud').toBeVisible()
        })

        test(`${label}: takeover — member takes over the chefkok duty from the current chef`, async ({browser}) => {
            const adminCtx = await validatedBrowserContext(browser)
            const dinner = await createVacantDinner(adminCtx)
            const adminInhabitantId = (await getSessionUserInfo(adminCtx)).inhabitantId
            await DinnerEventFactory.assignRoleToDinnerEvent(adminCtx, dinner.id, adminInhabitantId, TeamRole.CHEF)

            const memberCtx = await memberValidatedBrowserContext(browser)
            const page = await memberCtx.newPage()
            let assignRole: {status: number} | null = null
            page.on('response', (r) => {
                if (/\/api\/team\/cooking\/\d+\/assign-role$/.test(r.url())) assignRole = {status: r.status()}
            })

            await gotoHydrated(page, url(dinner.date))
            await expect(page.locator(ROLE_TRIGGER).first(), 'occupied duty shows the edit trigger').toContainText('Rediger chefkokketjans')
            await openForm(page)
            const save = page.locator(ROLE_SAVE).first()
            await expect(save, 'takeover commit is active').toBeEnabled()
            await save.click()

            const result = await pollUntil(async () => assignRole, r => r !== null, 6)
            expect(result!.status, 'assign-role must succeed').toBe(200)
            await expectDinnerChef(memberCtx, dinner.id, memberInhabitantId)
        })

        test(`${label}: cancelling the volunteer form leaves the dinner without a chef if there was no chef before`, async ({browser}) => {
            const adminCtx = await validatedBrowserContext(browser)
            const dinner = await createVacantDinner(adminCtx)

            const memberCtx = await memberValidatedBrowserContext(browser)
            const page = await memberCtx.newPage()

            const before = await DinnerEventFactory.getDinnerEvent(adminCtx, dinner.id)
            expect(before?.chefId, 'precondition: dinner is vacant').toBeNull()

            await gotoHydrated(page, url(dinner.date))
            await openForm(page)
            // The role writes the cancel sends; a claim is an assign-role request
            const roleWrites: string[] = []
            page.on('request', (request) => {
                if (/\/api\/team\/cooking\/\d+\/assign-role$/.test(request.url())) roleWrites.push(request.url())
            })
            await page.locator(ROLE_CANCEL).first().click()

            await expect(page.locator(ROLE_SAVE).first()).not.toBeVisible()
            expect(roleWrites, 'cancel sent no assign-role request').toEqual([])
            const after = await DinnerEventFactory.getDinnerEvent(adminCtx, dinner.id)
            expect(after?.chefId, 'cancel did not claim').toBeNull()
        })
    })
})
