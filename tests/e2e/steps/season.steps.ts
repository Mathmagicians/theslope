import {expect} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {Given, Then, fromScene} from '~~/tests/e2e/fixtures'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

/** Whether a scenario's own season is activated, by its words in a feature */
const SEASON_ACTIVITY = {ACTIVE: 'active', NOT_ACTIVE: 'not active'} as const

defineParameterType({name: 'seasonActivity', regexp: Object.values(SEASON_ACTIVITY), transformer: (words: string) => words === SEASON_ACTIVITY.ACTIVE})

// The dinner step builds the season around the dinner's day; an active one displaces the singleton, so its features run serially
Given('a season of its own is {seasonActivity}', ({scene}, isActive: boolean) => {
    scene.ownSeasonIsActive = isActive
})

// Activates the e2e singleton season; under SHOULD_NOT_MUTATE it reads the deployment's active season
Given('a season is active', async ({scene}) => {
    const activeSeason = await SeasonFactory.createActiveSeason(fromScene(scene, 'context'))
    expect(activeSeason).toBeDefined()
    expect(activeSeason.id).toBeGreaterThan(0)
    expect(activeSeason.isActive).toBe(true)
    scene.activeSeason = activeSeason
})

Then('the active season has dinner events', async ({scene}) => {
    const {id} = fromScene(scene, 'activeSeason')
    const season = await SeasonFactory.getSeason(fromScene(scene, 'context'), id!)
    expect(season.dinnerEvents).toBeDefined()
    expect(season.dinnerEvents?.length).toBeGreaterThan(0)
})
