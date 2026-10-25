import {test, expect, type Page, type BrowserContext} from '~~/tests/e2e/uiTest'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {formatDate} from '~/utils/date'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, salt, temporaryAndRandom, doScreenshot, gotoHydrated, waitForApi} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

test.describe('Chef Swap — volunteer flow', () => {
    const testSalt = temporaryAndRandom()
    let season: Awaited<ReturnType<typeof SeasonFactory.createActiveSeason>>
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

    // The member is the chef when the role form offers Meld afbud; the dinner's chefId is the role API specs'
    const expectMemberIsChef = async (page: Page) => {
        await openForm(page)
        await expect(page.locator(ROLE_RESIGN).first(), 'the member is the dinner\'s chef').toBeVisible()
    }

    // A team with the member as chef and its dinner, vacant (chefId null) or with the member as chef, alone on a free day
    // of the season; afterEach empties the calendar again
    const createDinner = async (ctx: BrowserContext, chefId: number | null) => {
        const {team, dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(ctx, season, memberInhabitantId, {
            teamName: salt('SwapTeam', testSalt),
            dinner: {menuTitle: salt('SwapDinner', testSalt), chefId},
            day: 'free'
        })
        teamId = team.id!
        createdTeamIds.push(teamId)
        createdDinnerIds.push(dinner.id!)
        return {id: dinner.id!, date: new Date(dinner.date)}
    }
    const createVacantDinner = (ctx: BrowserContext) => createDinner(ctx, null)

    // The active season resolves here: creating it activates it, which scaffolds every household
    test.beforeAll(async ({browser}) => {
        const memberCtx = await memberValidatedBrowserContext(browser)
        memberInhabitantId = (await getSessionUserInfo(memberCtx)).inhabitantId
        season = await SeasonFactory.createActiveSeason(await validatedBrowserContext(browser))
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
        test(`${label}: volunteer — the member takes the vacant chef duty`, async ({browser}) => {
            const adminCtx = await validatedBrowserContext(browser)
            const dinner = await createVacantDinner(adminCtx)
            const page = await (await memberValidatedBrowserContext(browser)).newPage()

            await gotoHydrated(page, url(dinner.date))
            await expect(page.locator(CHEF_WANTED).first(), 'precondition: WANTED placeholder').toBeVisible()
            if (label === '/dinner') await doScreenshot(page, 'chef/role-wanted', true)
            await openForm(page)
            const assigned = waitForApi(page, '/assign-role', 'POST')
            await page.locator(ROLE_SAVE).first().click()

            const response = await assigned
            expect(response.url(), 'assign-role must target the test dinner').toContain(`/cooking/${dinner.id}/`)
            expect(response.status(), 'assign-role must succeed').toBe(200)
            // Reload for a deterministic chef-mode render — mid-session re-rendering is component-test territory
            await gotoHydrated(page, url(dinner.date))
            await expectMemberIsChef(page)
        })

        test(`${label}: Meld afbud — the chef resigns and the dinner is vacant again`, async ({browser}) => {
            const adminCtx = await validatedBrowserContext(browser)
            const dinner = await createDinner(adminCtx, memberInhabitantId)
            const page = await (await memberValidatedBrowserContext(browser)).newPage()

            await gotoHydrated(page, url(dinner.date))
            if (label === '/dinner') await doScreenshot(page, 'chef/role-assigned', true)
            await openForm(page)
            const resignBtn = page.locator(ROLE_RESIGN).first()
            await resignBtn.click()  // DangerButton: first click arms, second commits
            await expect(resignBtn).toContainText('Tryk igen')
            const removed = waitForApi(page, '/remove-role', 'POST')
            await resignBtn.click()

            expect((await removed).status(), 'remove-role must succeed').toBe(200)
            await expect(page.locator(CHEF_WANTED).first(), 'dinner vacant again after Meld afbud').toBeVisible()
        })

        test(`${label}: takeover — member takes over the chefkok duty from the current chef`, async ({browser}) => {
            const adminCtx = await validatedBrowserContext(browser)
            const dinner = await createVacantDinner(adminCtx)
            const adminInhabitantId = (await getSessionUserInfo(adminCtx)).inhabitantId
            await DinnerEventFactory.assignRoleToDinnerEvent(adminCtx, dinner.id, adminInhabitantId, TeamRole.CHEF)
            const page = await (await memberValidatedBrowserContext(browser)).newPage()

            await gotoHydrated(page, url(dinner.date))
            await expect(page.locator(ROLE_TRIGGER).first(), 'occupied duty shows the edit trigger').toContainText('Rediger chefkokketjans')
            await openForm(page)
            const save = page.locator(ROLE_SAVE).first()
            await expect(save, 'takeover commit is active').toBeEnabled()
            const assigned = waitForApi(page, '/assign-role', 'POST')
            await save.click()

            expect((await assigned).status(), 'assign-role must succeed').toBe(200)
            await gotoHydrated(page, url(dinner.date))
            await expectMemberIsChef(page)
        })

        test(`${label}: cancelling the volunteer form leaves the dinner without a chef if there was no chef before`, async ({browser}) => {
            const adminCtx = await validatedBrowserContext(browser)
            const dinner = await createVacantDinner(adminCtx)
            const page = await (await memberValidatedBrowserContext(browser)).newPage()

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
            await expect(page.locator(CHEF_WANTED).first(), 'the dinner is still without a chef').toBeVisible()
        })
    })
})
