import {expect, type BrowserContext, type Page, type TestInfo} from '@playwright/test'
import {defineParameterType, type DataTable} from 'playwright-bdd'
import {Given, When, Then, ACTOR, fromScene, contextOfActor, teamOf, type Actor, type Scene, type WorkerTeams} from '~~/tests/e2e/fixtures'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useCookingTeamValidation, type CookingTeamDetail, type TeamRole} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {TEAM_WORDS} from '~/config/teamWords'
import {SEASON_CONFIG} from '~/config/season'
import {computeCookingDates, getDinnerOnDate, splitDinnerEvents} from '~/utils/season'
import {formatDanishWeekdayDate, formatDate, parseDate} from '~/utils/date'

const {getSessionUserInfo, gotoHydrated, collectHydrationWarnings, salt, pageCalendarToMonth, doScreenshot, waitForApi} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const {getTeamShortName} = useCookingTeam()

const CHEF_PAGE = '/chef'
const DATE_PARAM = 'date'
const ROLE_BUTTONS = ['volunteer-cook', 'volunteer-helper', 'swap-shift']
const nextDinnerOf = splitDinnerEvents(SEASON_CONFIG.defaultDinnerStartTime, SEASON_CONFIG.defaultDinnerDurationMinutes)

defineParameterType({name: 'teamRole', regexp: [...TeamRoleSchema.options]})

/** The chef of a dinner by the words of a feature: the actor whose inhabitant cooks it, or none */
const DINNER_CHEFS = {'without a chef': null, 'with the admin as its chef': ACTOR.ADMIN} as const
defineParameterType({name: 'dinnerChef', regexp: Object.keys(DINNER_CHEFS), transformer: (words: string) => DINNER_CHEFS[words as keyof typeof DINNER_CHEFS]})

/** The pages that show a dinner's chef duty, on the dinner; the dinner page's views go to the docs */
type DutyPage = {path: string, url: (dinner: DinnerEventDisplay) => string, documents: boolean}
const DUTY_PAGES: DutyPage[] = [
    {path: CHEF_PAGE, url: dinner => `${CHEF_PAGE}?team=${dinner.cookingTeamId}&${DATE_PARAM}=${formatDate(dinner.date)}`, documents: false},
    {path: '/dinner', url: dinner => `/dinner?${DATE_PARAM}=${formatDate(dinner.date)}`, documents: true}
]
defineParameterType({
    name: 'dutyPage',
    regexp: DUTY_PAGES.map(dutyPage => dutyPage.path),
    transformer: (path: string): DutyPage => DUTY_PAGES.find(dutyPage => dutyPage.path === path)!
})

const CHEF_WANTED = 'chef-wanted'
/** Whether the page on view documents the duty */
const documents = (page: Page): boolean => DUTY_PAGES.some(dutyPage => dutyPage.documents && dutyPage.path === new URL(page.url()).pathname)
const resignButtonOf = (page: Page) => page.getByTestId('role-assignment-resign').first().locator('button')

// The trigger toggles the form: an open form stays open
const openRoleForm = async (page: Page) => {
    const cancel = page.getByTestId('role-assignment-cancel').first()
    if (!await cancel.isVisible()) await page.getByTestId('role-assignment-trigger').first().click()
    await expect(cancel, 'the role form opens').toBeVisible()
}

/** The role cell of a team the actor is not on */
const NOT_ON_TEAM = 'none'

/**
 * The teams come in one team creation per worker (it rewrites every team of the shared season), the actor's inhabitant
 * on each in its role, or not on it for a null role; team n lands at index n - 1 of the scene's teams. The creation runs in
 * the worker's first scenario, which keeps its own time on top
 */
const setUpTeams = async (admin: BrowserContext, actorContext: BrowserContext, scene: Scene, workerTeams: WorkerTeams, testInfo: TestInfo, actor: Actor, roleOnTeam: [number, TeamRole | null][]) => {
    const key = `${actor} ${JSON.stringify(roleOnTeam)}`
    if (!workerTeams.has(key)) {
        const started = Date.now()
        const {inhabitantId} = await getSessionUserInfo(actorContext)
        const created = await SeasonFactory.createCookingTeams(admin, fromScene(scene, 'activeSeason'), roleOnTeam.map(([number, role]) => ({
            teamName: `ChefTeam${number}`,
            assignments: role ? [SeasonFactory.defaultCookingTeamCreateAssignment({inhabitantId, role})] : []
        })))
        const teams: CookingTeamDetail[] = []
        created.forEach((team, index) => {
            teams[roleOnTeam[index]![0] - 1] = team
            scene.created.teamIds.push(team.id!)
        })
        workerTeams.set(key, {teams, teamDinners: []})
        testInfo.setTimeout(testInfo.timeout + Date.now() - started)
    }
    Object.assign(scene, workerTeams.get(key))
}

/** The fields of team n's dinner: a menu and the team's CHEF as its chef, else none */
const dinnerOfTeam = (team: CookingTeamDetail, number: number) => ({
    menuTitle: salt(`Team${number}Dinner`),
    cookingTeamId: team.id!,
    chefId: team.assignments.find(assignment => assignment.role === TeamRoleSchema.enum.CHEF)?.inhabitantId ?? null
})

/** Team n's dinner, placed once: the worker's team keeps it for the scenarios after */
const placeTeamDinner = async (scene: Scene, number: number, create: () => Promise<DinnerEventDisplay>) => {
    if (scene.teamDinners[number - 1]) return
    const dinner = await create()
    scene.teamDinners[number - 1] = dinner
    scene.created.dinnerEventIds.push(dinner.id!)
}

const teamDinnerOf = (scene: Scene, number: number): DinnerEventDisplay => {
    const dinner = scene.teamDinners[number - 1]
    if (!dinner) throw new Error(`The scene holds no dinner of team ${number}: a GIVEN places it`)
    return dinner
}

/** The dinner date in the chef page's URL, once the page has synced it */
const dateInUrl = async (page: Page): Promise<Date> => {
    await expect.poll(() => new URL(page.url()).searchParams.get(DATE_PARAM), 'the URL has the dinner on view').not.toBeNull()
    return parseDate(new URL(page.url()).searchParams.get(DATE_PARAM)!)
}

Given('{actor} is on the teams', async ({adminContext: admin, contextOf, scene, workerTeams, $testInfo}, actor: Actor, table: DataTable) => {
    const roleOnTeam = table.hashes().map(({team, role}): [number, TeamRole | null] =>
        [Number(team), role === NOT_ON_TEAM ? null : TeamRoleSchema.parse(role)])
    await setUpTeams(admin, await contextOf(actor), scene, workerTeams, $testInfo, actor, roleOnTeam)
})

// Team n cooks on the nth cooking day ahead, beside the season's own dinner: the chef page selects among the team's
// dinners, so the free days stay with the specs that select across the season
Given('team {int} cooks a dinner', async ({adminContext: admin, scene}, number: number) => {
    await placeTeamDinner(scene, number, () => {
        const season = fromScene(scene, 'activeSeason')
        const cookingDays = computeCookingDates(season.cookingDays, season.seasonDates, season.holidays).filter(date => date > new Date())
        expect(cookingDays.length, `season ${season.shortName} has ${number} cooking days ahead`).toBeGreaterThanOrEqual(number)
        return DinnerEventFactory.createDinnerEvent(admin, {
            ...dinnerOfTeam(teamOf(scene, number), number), date: cookingDays[number - 1], seasonId: season.id!
        })
    })
})

// A click on a day opens the team on view's dinner before another team's. The dinner is the scenario's: the scenario
// holds its own copy of the team dinners, so the worker's teams keep their dinners on cooking days
Given('team {int} cooks the only dinner of its day', async ({adminContext: admin, scene}, number: number) => {
    const dinner = await DinnerEventFactory.createDinnerEventOnFreeDay(admin, fromScene(scene, 'activeSeason'), dinnerOfTeam(teamOf(scene, number), number))
    scene.dayDinnerIds.push(dinner.id!)
    const teamDinners = [...scene.teamDinners]
    teamDinners[number - 1] = dinner
    scene.teamDinners = teamDinners
})

// A dinner of its own on a day of its own, so the dinner page shows it alone; the chef takes the duty through the role
// endpoint, which also puts them on the team
Given('team {int} cooks a dinner {dinnerChef}', async ({adminContext: admin, contextOf, scene}, number: number, chef: Actor | null) => {
    const season = fromScene(scene, 'activeSeason')
    const event = await DinnerEventFactory.createDinnerEventOnFreeDay(admin, season, {...dinnerOfTeam(teamOf(scene, number), number), chefId: null})
    scene.dayDinnerIds.push(event.id!)
    const chefId = chef ? (await getSessionUserInfo(await contextOf(chef))).inhabitantId : null
    if (chefId) await DinnerEventFactory.assignRoleToDinnerEvent(admin, event.id!, chefId, TeamRoleSchema.enum.CHEF)
    scene.dinner = {season, event: {...event, chefId}}
})

// The dinner page's duty without a chef goes to the docs
When('{actor} opens {dutyPage} on the dinner', async ({scene}, actor: Actor, dutyPage: DutyPage) => {
    const {event} = fromScene(scene, 'dinner')
    const page = await contextOfActor(scene, actor).newPage()
    scene.page = page
    await gotoHydrated(page, dutyPage.url(event))
    if (dutyPage.documents && event.chefId === null) {
        await expect(page.getByTestId(CHEF_WANTED).first()).toBeVisible()
        await doScreenshot(page, 'chef/role-wanted', true)
    }
})

// A dinner without a chef takes a volunteer, a dinner with a chef a takeover: both save the role form
When('{actor} takes the chef duty', async ({scene}, actor: Actor) => {
    contextOfActor(scene, actor)
    const page = fromScene(scene, 'page')
    await openRoleForm(page)
    const assigned = waitForApi(page, `/cooking/${fromScene(scene, 'dinner').event.id}/assign-role`, 'POST')
    await page.getByTestId('role-assignment-save').first().click()
    expect((await assigned).status(), 'the role write lands on the dinner').toBe(200)
})

// Meld afbud is a DangerButton: the first click arms it, the second resigns. The resignation re-reads the season, and
// the dinner page shows its loader until that read lands
When('{actor} resigns from the chef duty', async ({scene}, actor: Actor) => {
    contextOfActor(scene, actor)
    const page = fromScene(scene, 'page')
    const {season, event} = fromScene(scene, 'dinner')
    await openRoleForm(page)
    const resign = resignButtonOf(page)
    await resign.click()
    await expect(resign).toContainText('Tryk igen')
    const removed = waitForApi(page, `/cooking/${event.id}/remove-role`, 'POST')
    const seasonRead = waitForApi(page, `/api/admin/season/${season.id}`, 'GET')
    await resign.click()
    expect((await removed).status(), 'the resignation lands on the dinner').toBe(200)
    await seasonRead
})

// The hydration warnings are collected from the start
When('{actor} opens the chef page of team {int}', async ({scene}, actor: Actor, number: number) => {
    const team = teamOf(scene, number)
    const page = await contextOfActor(scene, actor).newPage()
    scene.page = page
    scene.hydrationWarnings = collectHydrationWarnings(page)
    await gotoHydrated(page, `${CHEF_PAGE}?team=${team.id}`)
})

When('{actor} chooses the tab of team {int}', async ({scene}, actor: Actor, number: number) => {
    contextOfActor(scene, actor)
    const team = teamOf(scene, number)
    const page = fromScene(scene, 'page')
    await page.getByRole('tab', {name: getTeamShortName(team.name)}).click()
    await page.waitForURL(url => url.searchParams.get('team') === String(team.id))
})

// The calendar opens on the month of the dinner on view and pages one month a click
When('{actor} clicks the dinner of team {int} in the chef calendar', async ({scene}, actor: Actor, number: number) => {
    contextOfActor(scene, actor)
    const team = teamOf(scene, number)
    const dinnerDate = new Date(teamDinnerOf(scene, number).date)
    const page = fromScene(scene, 'page')
    const calendar = page.getByTestId('chef-calendar-content')
    await pageCalendarToMonth(calendar, await dateInUrl(page), dinnerDate)
    // The read-only calendar marks its cells disabled; the dinner's circle inside takes the click
    await calendar.getByTestId(`calendar-other-team-dinner-${dinnerDate.getDate()}`).click({force: true})
    await page.waitForURL(url => url.searchParams.get('team') === String(team.id))
})

Then('the page hydrates without a mismatch', ({scene}) => {
    expect(fromScene(scene, 'hydrationWarnings')).toEqual([])
})

Then('{actor} sees the chef calendar and one footer', async ({scene}, actor: Actor) => {
    contextOfActor(scene, actor)
    const page = fromScene(scene, 'page')
    await expect(page.getByTestId('chef-calendar-header')).toBeVisible()
    await expect(page.locator('footer')).toHaveCount(1)
})

Then('{actor} sees the role line of a {teamRole} on team {int}', async ({scene}, actor: Actor, role: TeamRole, number: number) => {
    contextOfActor(scene, actor)
    const shortName = getTeamShortName(teamOf(scene, number).name)
    await expect(fromScene(scene, 'page').getByTestId('team-role-status')).toContainText(TEAM_WORDS.roles[role].description(shortName))
})

// The team is read again: a team created after it can take its dinners by affinity
Then('{actor} sees the next cooking day of team {int}', async ({adminContext: admin, scene}, actor: Actor, number: number) => {
    contextOfActor(scene, actor)
    const team = await SeasonFactory.getCookingTeamById(admin, teamOf(scene, number).id!)
    const {nextDinner} = nextDinnerOf(team!.dinnerEvents, new Date())
    expect(nextDinner, `team ${number} has a dinner ahead`).not.toBeNull()
    await expect(fromScene(scene, 'page').getByTestId('chef-next-cooking-countdown')).toContainText(formatDanishWeekdayDate(nextDinner!.date))
})

Then('{actor} sees the visiting tab and the visitor line of team {int}', async ({scene}, actor: Actor, number: number) => {
    contextOfActor(scene, actor)
    const page = fromScene(scene, 'page')
    const shortName = getTeamShortName(teamOf(scene, number).name)
    const selector = page.getByTestId('my-team-selector')
    await expect(selector.getByRole('tab', {name: shortName, selected: true})).toBeVisible()
    await expect(selector.getByTestId('my-team-visit-badge')).toBeVisible()
    await expect(page.getByTestId('team-role-status')).toContainText(TEAM_WORDS.visit.line(shortName))
})

// The team is read again: the dinner on view is the team's own or one it took by affinity
Then('{actor} reads the menu card of team {int} without edit controls', async ({adminContext: admin, scene}, actor: Actor, number: number) => {
    contextOfActor(scene, actor)
    const page = fromScene(scene, 'page')
    const team = await SeasonFactory.getCookingTeamById(admin, teamOf(scene, number).id!)
    const date = await dateInUrl(page)
    expect(getDinnerOnDate(team!.dinnerEvents)(date), `team ${number} cooks on ${formatDate(date)}`).toBeDefined()
    await expect(page.getByTestId('chef-menu-title')).toBeVisible()
    await expect(page.getByTestId('edit-menu')).toHaveCount(0)
})

Then('{actor} sees the role buttons', async ({scene}, actor: Actor) => {
    contextOfActor(scene, actor)
    const workAssignment = fromScene(scene, 'page').getByTestId('work-assignment')
    for (const name of ROLE_BUTTONS) await expect(workAssignment.locator(`[name="${name}"]`)).toBeVisible()
})

// The page is read again: the duty renders from the dinner the server holds
Then('{actor} is the chef of the dinner', async ({scene}, actor: Actor) => {
    contextOfActor(scene, actor)
    const page = fromScene(scene, 'page')
    await gotoHydrated(page, page.url())
    if (documents(page)) await doScreenshot(page, 'chef/role-assigned', true)
    await openRoleForm(page)
    await expect(resignButtonOf(page), `${actor} can resign: the duty is theirs`).toBeVisible()
})

// The page shows the duty wanted again once the resignation lands
Then('the dinner has no chef', async ({scene}) => {
    await expect(fromScene(scene, 'page').getByTestId(CHEF_WANTED).first()).toBeVisible()
})
