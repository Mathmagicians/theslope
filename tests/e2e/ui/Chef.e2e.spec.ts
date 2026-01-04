import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import testHelpers from '../testHelpers'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot, getSessionUserInfo, temporaryAndRandom} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

/**
 * E2E UI Tests for Chef Page
 *
 * Happy day scenario: Chef views their team's dinners and manages menu
 * Assigns the test user to a cooking team in beforeAll
 */
test.describe('Chef Page - Happy Day', () => {
    const chefPageUrl = '/chef'
    let testTeamId: number

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Get active season (creates if needed)
        const activeSeason = await SeasonFactory.createActiveSeason(context)

        // Create a cooking team for the test
        const team = await SeasonFactory.createCookingTeamForSeason(context, activeSeason.id!, `ChefTestTeam-${testSalt}`)
        testTeamId = team.id!

        // Get the test user's inhabitantId and assign them to the team as CHEF
        const {inhabitantId} = await getSessionUserInfo(context)
        await SeasonFactory.assignMemberToTeam(context, testTeamId, inhabitantId, TeamRole.CHEF)

        // Get existing dinner events to find a valid cooking date within the season
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, activeSeason.id!)
        expect(dinnerEvents.length, 'Singleton season should have dinner events').toBeGreaterThan(0)
        const validCookingDate = new Date(dinnerEvents[0]!.date)

        // Create a dinner event for our test team so countdown shows "Næste Madlavning"
        await DinnerEventFactory.createDinnerEvent(context, {
            date: validCookingDate,
            menuTitle: `ChefTestDinner-${testSalt}`,
            seasonId: activeSeason.id!,
            cookingTeamId: testTeamId,
            chefId: inhabitantId
        })
    })

    test('GIVEN chef with assigned team WHEN viewing chef page THEN sees dashboard with countdown', async ({page}) => {
        await page.goto(`${chefPageUrl}?team=${testTeamId}`)

        await pollUntil(
            async () => await page.locator('text=Du er chefkok').first().isVisible().catch(() => false),
            (isVisible) => isVisible,
            10
        )
        await expect(page.locator('text=Du er chefkok').first()).toBeVisible()
        await expect(page.locator('text=Næste Madlavning').first()).toBeVisible()

        await doScreenshot(page, 'chef/chef-dashboard', true)
    })
})
