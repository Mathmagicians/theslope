import {test, expect, type Page} from '@playwright/test'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import testHelpers from '../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, temporaryAndRandom, gotoHydrated} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()

/**
 * The chef calendar's open default follows the viewport the layout measures after mount: desktop lands on
 * view=calendar:open, a phone on view=calendar:closed, and a URL that names the view keeps it.
 */
test.describe('Chef calendar default', () => {
    const DESKTOP = {width: 1280, height: 900}
    const PHONE = {width: 375, height: 812}
    let teamId: number
    let dinnerId: number

    const chefUrl = (view?: string) => `/chef?team=${teamId}${view ? `&view=${view}` : ''}`
    const calendarContent = (page: Page) => page.getByTestId('chef-calendar-content')
    const viewParam = (page: Page) => new URL(page.url()).searchParams.get('view')

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const activeSeason = await SeasonFactory.createActiveSeason(adminContext)
        const {inhabitantId} = await getSessionUserInfo(memberContext)

        // The member chefs one team with one dinner of its own, alone on a free day, so the calendar has content
        const team = await SeasonFactory.createCookingTeamForSeason(adminContext, activeSeason.id!, `CalendarDefault-${temporaryAndRandom()}`)
        teamId = team.id!
        await SeasonFactory.assignMemberToTeam(adminContext, teamId, inhabitantId, TeamRoleSchema.enum.CHEF)
        const dinner = await DinnerEventFactory.createDinnerEventOnFreeDay(adminContext, activeSeason, {cookingTeamId: teamId, chefId: inhabitantId})
        dinnerId = dinner.id!
    })

    test.afterAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        // The dinner goes before its team; another spec's season cleanup can cascade either away first
        if (dinnerId) await DinnerEventFactory.deleteDinnerEvent(adminContext, dinnerId).catch(() => undefined)
        if (teamId) await SeasonFactory.deleteCookingTeam(adminContext, teamId).catch(() => undefined)
    })

    for (const {face, viewport, expected} of [
        {face: 'desktop', viewport: DESKTOP, expected: 'calendar:open'},
        {face: 'phone', viewport: PHONE, expected: 'calendar:closed'}
    ]) {
        test(`GIVEN ${face} WHEN /chef loads without a view THEN the URL settles on view=${expected}`, async ({browser}) => {
            const context = await memberValidatedBrowserContext(browser)
            const page = await context.newPage()
            await page.setViewportSize(viewport)

            await page.goto(chefUrl())

            await expect.poll(() => viewParam(page)).toBe(expected)
            if (expected === 'calendar:open') await expect(calendarContent(page)).toBeVisible()
            else await expect(calendarContent(page)).toBeHidden()
        })
    }

    for (const {face, viewport, given} of [
        {face: 'desktop', viewport: DESKTOP, given: 'calendar:closed'},
        {face: 'phone', viewport: PHONE, given: 'calendar:open'}
    ]) {
        test(`GIVEN ${face} WHEN /chef loads with view=${given} THEN the URL keeps it`, async ({browser}) => {
            const context = await memberValidatedBrowserContext(browser)
            const page = await context.newPage()
            await page.setViewportSize(viewport)

            await gotoHydrated(page, chefUrl(given))

            if (given === 'calendar:open') await expect(calendarContent(page)).toBeVisible()
            else await expect(calendarContent(page)).toBeHidden()
            expect(viewParam(page)).toBe(given)
        })
    }
})
