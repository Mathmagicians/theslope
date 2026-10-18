import {expect} from '@playwright/test'
import {Given, Then, fromScene} from '~~/tests/e2e/fixtures'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

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
