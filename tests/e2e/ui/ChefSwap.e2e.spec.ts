import {test, expect, type Page, type BrowserContext} from '@playwright/test'
import {isAfter} from 'date-fns'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {formatDate} from '~/utils/date'
import testHelpers from '../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, getSessionUserInfo, temporaryAndRandom} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

test.describe('Chef Swap — volunteer flow', () => {
    let teamId: number
    let dinnerEventId: number
    let dinnerDate: Date
    let memberInhabitantId: number
    const createdTeamIds: number[] = []
    const createdDinnerIds: number[] = []

    const ROLE_TRIGGER = '[data-testid="role-assignment-trigger"]'
    const ROLE_SAVE = '[data-testid="role-assignment-save"]'
    const ROLE_CANCEL = '[data-testid="role-assignment-cancel"]'
    const CHEF_WANTED = '[data-testid="chef-wanted"]'
    const CHEF_DISPLAY = '[data-testid="chef-display"]'

    const openForm = async (page: Page) => {
        const trigger = page.locator(ROLE_TRIGGER).first()
        await pollUntil(async () => await trigger.isVisible().catch(() => false), v => v, 10)
        await trigger.click()
    }

    const expectDinnerChef = (ctx: BrowserContext, dinnerId: number, expected: number | null) =>
        pollUntil(
            async () => (await DinnerEventFactory.getDinnerEvent(ctx, dinnerId))?.chefId,
            chefId => chefId === expected,
            10
        )

    const createVacantDinner = async (ctx: BrowserContext) => {
        const season = await SeasonFactory.createActiveSeason(ctx)
        const future = (await DinnerEventFactory.getDinnerEventsForSeason(ctx, season.id!))
            .filter(e => isAfter(new Date(e.date), new Date()))
        const date = new Date(future[0]!.date)
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

    test.beforeEach(async ({browser}) => {
        const adminCtx = await validatedBrowserContext(browser)
        const dinner = await createVacantDinner(adminCtx)
        dinnerEventId = dinner.id
        dinnerDate = dinner.date
    })

    test.afterAll(async ({browser}) => {
        const adminCtx = await validatedBrowserContext(browser)
        for (const id of createdDinnerIds) await DinnerEventFactory.deleteDinnerEvent(adminCtx, id).catch(() => null)
        for (const id of createdTeamIds) await SeasonFactory.deleteCookingTeam(adminCtx, id)
    })

    const mounts = [
        {label: '/chef',   url: () => `/chef?team=${teamId}&date=${formatDate(dinnerDate)}`},
        {label: '/dinner', url: () => `/dinner?date=${formatDate(dinnerDate)}`}
    ]

    for (const {label, url} of mounts) {
        test(`${label}: volunteering vacant dinner makes member the chef`, async ({browser}) => {
            const memberCtx = await memberValidatedBrowserContext(browser)
            const adminCtx = await validatedBrowserContext(browser)
            const page = await memberCtx.newPage()

            await page.goto(url())
            await doScreenshot(page, `chefswap-${label.replace('/', '')}-1-loaded`)
            await openForm(page)
            await doScreenshot(page, `chefswap-${label.replace('/', '')}-2-form-open`)

            const wantedBefore = page.locator(CHEF_WANTED).first()
            await expect(wantedBefore, 'precondition: chef portrait shows WANTED placeholder').toBeVisible()

            await page.locator(ROLE_SAVE).first().click()
            await doScreenshot(page, `chefswap-${label.replace('/', '')}-3-after-save-click`)

            await expectDinnerChef(adminCtx, dinnerEventId, memberInhabitantId)
            await doScreenshot(page, `chefswap-${label.replace('/', '')}-4-after-api-confirms-chef`)

            await expect(page.locator(ROLE_TRIGGER).first(), 'trigger should disappear once user is chef').not.toBeVisible()
            await expect(page.locator(CHEF_WANTED).first(), 'WANTED placeholder should be gone').not.toBeVisible()
            await expect(page.locator(CHEF_DISPLAY).first(), 'chef portrait should render with volunteer').toBeVisible()
        })

        test(`${label}: cancelling the volunteer form leaves the dinner without a chef if there was no chef before`, async ({browser}) => {
            const memberCtx = await memberValidatedBrowserContext(browser)
            const adminCtx = await validatedBrowserContext(browser)
            const page = await memberCtx.newPage()

            const before = await DinnerEventFactory.getDinnerEvent(adminCtx, dinnerEventId)
            expect(before?.chefId, 'precondition: dinner is vacant').toBeNull()

            await page.goto(url())
            await openForm(page)
            await page.locator(ROLE_CANCEL).first().click()

            await expect(page.locator(ROLE_SAVE).first()).not.toBeVisible()
            const after = await DinnerEventFactory.getDinnerEvent(adminCtx, dinnerEventId)
            expect(after?.chefId, 'cancel did not claim').toBeNull()
        })
    }
})