import {expect, type BrowserContext, type Page} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {da} from '@nuxt/ui/locale'
import {addMonths, differenceInCalendarMonths, isSameDay} from 'date-fns'
import {Given, When, Then, fromScene, contextOfActor, teamOf, type Actor, type Scene} from '~~/tests/e2e/fixtures'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useCookingTeamValidation, type CookingTeamDetail, type TeamRole} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {TEAM_WORDS} from '~/config/teamWords'
import {SEASON_CONFIG} from '~/config/season'
import {computeCookingDates, splitDinnerEvents} from '~/utils/season'
import {formatDanishWeekdayDate, formatDate, formatMonthYear, parseDate} from '~/utils/date'

const {getSessionUserInfo, gotoHydrated, collectHydrationWarnings, salt} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const {getTeamShortName} = useCookingTeam()

const CHEF_PAGE = '/chef'
const DATE_PARAM = 'date'
const ROLE_BUTTONS = ['volunteer-cook', 'volunteer-helper', 'swap-shift']
const nextDinnerOf = splitDinnerEvents(SEASON_CONFIG.defaultDinnerStartTime, SEASON_CONFIG.defaultDinnerDurationMinutes)

defineParameterType({name: 'teamRole', regexp: [...TeamRoleSchema.options]})

/**
 * The teams come in one team creation (it rewrites every team of the shared season), the actor's inhabitant on each in
 * its role, or not on it for a null role; team n lands at index n - 1 of the scene's teams
 */
const createTeams = async (admin: BrowserContext, actorContext: BrowserContext, scene: Scene, roleOnTeam: [number, TeamRole | null][]) => {
    const {inhabitantId} = await getSessionUserInfo(actorContext)
    const teams = await SeasonFactory.createCookingTeams(admin, fromScene(scene, 'activeSeason'), roleOnTeam.map(([number, role]) => ({
        teamName: `ChefTeam${number}`,
        assignments: role ? [SeasonFactory.defaultCookingTeamCreateAssignment({inhabitantId, role})] : []
    })))
    teams.forEach((team, index) => {
        scene.teams[roleOnTeam[index]![0] - 1] = team
        scene.created.teamIds.push(team.id!)
    })
}

/** The fields of team n's dinner: a menu and the team's CHEF as its chef, else none */
const dinnerOfTeam = (team: CookingTeamDetail, number: number) => ({
    menuTitle: salt(`Team${number}Dinner`),
    cookingTeamId: team.id!,
    chefId: team.assignments.find(assignment => assignment.role === TeamRoleSchema.enum.CHEF)?.inhabitantId ?? null
})

const placeTeamDinner = (scene: Scene, number: number, dinner: DinnerEventDisplay) => {
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

Given('{actor} is a {teamRole} on team {int} and on team {int}', async ({adminContext: admin, contextOf, scene}, actor: Actor, role: TeamRole, first: number, second: number) => {
    await createTeams(admin, await contextOf(actor), scene, [[first, role], [second, role]])
})

// A member cooks on the team
Given('{actor} is a member of team {int} and not of team {int}', async ({adminContext: admin, contextOf, scene}, actor: Actor, member: number, other: number) => {
    await createTeams(admin, await contextOf(actor), scene, [[member, TeamRoleSchema.enum.COOK], [other, null]])
})

// Team n cooks on the nth cooking day ahead, beside the season's own dinner: the chef page selects among the team's
// dinners, so the free days stay with the specs that select across the season
Given('team {int} cooks a dinner', async ({adminContext: admin, scene}, number: number) => {
    const season = fromScene(scene, 'activeSeason')
    const cookingDays = computeCookingDates(season.cookingDays, season.seasonDates, season.holidays).filter(date => date > new Date())
    expect(cookingDays.length, `season ${season.shortName} has ${number} cooking days ahead`).toBeGreaterThanOrEqual(number)
    placeTeamDinner(scene, number, await DinnerEventFactory.createDinnerEvent(admin, {
        ...dinnerOfTeam(teamOf(scene, number), number), date: cookingDays[number - 1], seasonId: season.id!
    }))
})

// A click on a day opens the team on view's dinner before another team's
Given('team {int} cooks the only dinner of its day', async ({adminContext: admin, scene}, number: number) => {
    placeTeamDinner(scene, number, await DinnerEventFactory.createDinnerEventOnFreeDay(admin, fromScene(scene, 'activeSeason'), dinnerOfTeam(teamOf(scene, number), number)))
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
    const shown = await dateInUrl(page)
    const months = differenceInCalendarMonths(dinnerDate, shown)
    const pager = calendar.getByRole('button', {name: months > 0 ? da.messages.calendar.nextMonth : da.messages.calendar.prevMonth})
    for (let month = 1; month <= Math.abs(months); month++) {
        await pager.click()
        await expect(calendar.locator('[data-slot="heading"]')).toHaveText(new RegExp(`^${formatMonthYear(addMonths(shown, Math.sign(months) * month))}$`, 'i'))
    }
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
    await expect(fromScene(scene, 'page').getByTestId('chef-next-cooking-countdown')).toContainText(formatDanishWeekdayDate(new Date(nextDinner!.date)))
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
    expect(team!.dinnerEvents.some(dinner => isSameDay(new Date(dinner.date), date)), `team ${number} cooks on ${formatDate(date)}`).toBe(true)
    await expect(page.getByTestId('chef-menu-title')).toBeVisible()
    await expect(page.getByTestId('edit-menu')).toHaveCount(0)
})

Then('{actor} sees the role buttons', async ({scene}, actor: Actor) => {
    contextOfActor(scene, actor)
    const workAssignment = fromScene(scene, 'page').getByTestId('work-assignment')
    for (const name of ROLE_BUTTONS) await expect(workAssignment.locator(`[name="${name}"]`)).toBeVisible()
})
