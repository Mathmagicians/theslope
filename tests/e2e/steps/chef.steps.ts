import {expect, type ViewportSize} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {Given, When, Then, fromScene, contextOfActor, ACTOR, type Actor, type Scene} from '~~/tests/e2e/fixtures'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useCookingTeamValidation, type CookingTeamDetail, type TeamRole} from '~/composables/useCookingTeamValidation'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {TEAM_WORDS} from '~/config/teamWords'
import {SEASON_CONFIG} from '~/config/season'
import {computeCookingDates, splitDinnerEvents} from '~/utils/season'
import {formatDanishWeekdayDate} from '~/utils/date'

const {getSessionUserInfo, gotoHydrated, collectHydrationWarnings, salt, temporaryAndRandom, PHONE_VIEWPORT} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const {getTeamShortName} = useCookingTeam()

const CHEF_PAGE = '/chef'
const nextDinnerOf = splitDinnerEvents(SEASON_CONFIG.defaultDinnerStartTime, SEASON_CONFIG.defaultDinnerDurationMinutes)

defineParameterType({name: 'teamRole', regexp: [...TeamRoleSchema.options]})

/** The screens by their words in a feature: a desktop (md and up) and a phone */
const SCREENS = {desktop: {width: 1280, height: 900}, phone: PHONE_VIEWPORT} satisfies Record<string, ViewportSize>
defineParameterType({name: 'screen', regexp: Object.keys(SCREENS), transformer: (words: string) => SCREENS[words as keyof typeof SCREENS]})

/** The chef calendar open or closed, as `?view=calendar:<state>` names it */
const CALENDAR_STATES = ['open', 'closed'] as const
type CalendarState = typeof CALENDAR_STATES[number]
defineParameterType({name: 'calendarState', regexp: [...CALENDAR_STATES]})

/** The user's team by its number in a feature, counted from 1 in the order a GIVEN created the teams */
const teamOf = (scene: Scene, number: number): CookingTeamDetail => {
    const team = scene.teams[number - 1]
    if (!team) throw new Error(`The scene holds no team ${number}: a GIVEN creates the user's teams`)
    return team
}

// Team n cooks on the nth cooking day ahead, beside the season's own dinner: the chef page selects among the team's
// dinners, so the free days stay with the specs that select across the season
Given('the user\'s inhabitant is a CHEF on {int} teams with a dinner each', async ({adminContext: admin, contextOf, scene}, count: number) => {
    const {inhabitantId} = await getSessionUserInfo(await contextOf(ACTOR.USER))
    const season = fromScene(scene, 'activeSeason')
    const cookingDays = computeCookingDates(season.cookingDays, season.seasonDates, season.holidays).filter(date => date > new Date())
    expect(cookingDays.length, `season ${season.shortName} has ${count} cooking days ahead`).toBeGreaterThanOrEqual(count)
    const testSalt = temporaryAndRandom()
    for (const number of Array.from({length: count}, (_, index) => index + 1)) {
        const {team, dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(admin, season, inhabitantId, {
            teamName: salt(`ChefTeam${number}`, testSalt), dinner: {menuTitle: salt(`Team${number}Dinner`, testSalt), date: cookingDays[number - 1]}
        })
        scene.teams.push(team)
        scene.created.teamIds.push(team.id!)
        scene.created.dinnerEventIds.push(dinner.id!)
    }
})

/** Opens the chef page of the team in the actor's context, collecting the hydration warnings from the start */
const openChefPage = async (scene: Scene, actor: Actor, number: number, viewport?: ViewportSize) => {
    const team = teamOf(scene, number)
    const page = await contextOfActor(scene, actor).newPage()
    if (viewport) await page.setViewportSize(viewport)
    scene.page = page
    scene.hydrationWarnings = collectHydrationWarnings(page)
    await gotoHydrated(page, `${CHEF_PAGE}?team=${team.id}`)
}

When('{actor} opens the chef page of team {int}', ({scene}, actor: Actor, number: number) => openChefPage(scene, actor, number))

When('{actor} opens the chef page of team {int} on a {screen}', ({scene}, actor: Actor, number: number, viewport: ViewportSize) =>
    openChefPage(scene, actor, number, viewport))

When('{actor} chooses the tab of team {int}', async ({scene}, actor: Actor, number: number) => {
    contextOfActor(scene, actor)
    const team = teamOf(scene, number)
    const page = fromScene(scene, 'page')
    await page.getByRole('tab', {name: getTeamShortName(team.name)}).click()
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
    const {nextDinner} = nextDinnerOf(team!.dinnerEvents)
    expect(nextDinner, `team ${number} has a dinner ahead`).not.toBeNull()
    await expect(fromScene(scene, 'page').getByTestId('chef-next-cooking-countdown')).toContainText(formatDanishWeekdayDate(new Date(nextDinner!.date)))
})

// The view syncs to the URL once the layout has measured the screen
Then('the chef calendar is {calendarState}', async ({scene}, state: CalendarState) => {
    const page = fromScene(scene, 'page')
    await expect.poll(() => new URL(page.url()).searchParams.get('view'), 'the address names the view').toBe(`calendar:${state}`)
    const content = page.getByTestId('chef-calendar-content')
    if (state === 'open') await expect(content).toBeVisible()
    else await expect(content).toBeHidden()
})
