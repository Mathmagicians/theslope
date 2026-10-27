import {expect} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {Given, When, Then, fromScene, contextOfActor, ACTOR, type Actor, type Scene} from '~~/tests/e2e/fixtures'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useCookingTeamValidation, type CookingTeamDetail, type TeamRole} from '~/composables/useCookingTeamValidation'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {TEAM_WORDS} from '~/config/teamWords'
import {SEASON_CONFIG} from '~/config/season'
import {splitDinnerEvents} from '~/utils/season'
import {formatDanishWeekdayDate} from '~/utils/date'

const {getSessionUserInfo, gotoHydrated, collectHydrationWarnings, salt, temporaryAndRandom} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const {getTeamShortName} = useCookingTeam()

const CHEF_PAGE = '/chef'
const nextDinnerOf = splitDinnerEvents(SEASON_CONFIG.defaultDinnerStartTime, SEASON_CONFIG.defaultDinnerDurationMinutes)

defineParameterType({name: 'teamRole', regexp: [...TeamRoleSchema.options]})

/** The user's team by its number in a feature, counted from 1 in the order a GIVEN created the teams */
const teamOf = (scene: Scene, number: number): CookingTeamDetail => {
    const team = scene.teams[number - 1]
    if (!team) throw new Error(`The scene holds no team ${number}: a GIVEN creates the user's teams`)
    return team
}

// Team n cooks on the nth day from tomorrow that holds a dinner: the chef page selects among the team's dinners, so the
// free days stay with the specs that select across the season
Given('the user\'s inhabitant is a CHEF on {int} teams with a dinner each', async ({adminContext: admin, contextOf, scene}, count: number) => {
    const {inhabitantId} = await getSessionUserInfo(await contextOf(ACTOR.USER))
    const season = fromScene(scene, 'activeSeason')
    const takenDays = await DinnerEventFactory.takenDaysOf(admin, season)
    expect(takenDays.length, `season ${season.shortName} has ${count} days with a dinner ahead`).toBeGreaterThanOrEqual(count)
    const testSalt = temporaryAndRandom()
    for (const number of Array.from({length: count}, (_, index) => index + 1)) {
        const {team, dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(admin, season, inhabitantId, {
            teamName: salt(`ChefTeam${number}`, testSalt), dinner: {menuTitle: salt(`Team${number}Dinner`, testSalt), date: takenDays[number - 1]}
        })
        scene.teams.push(team)
        scene.created.teamIds.push(team.id!)
        scene.created.dinnerEventIds.push(dinner.id!)
    }
})

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
