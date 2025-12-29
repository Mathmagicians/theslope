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

        // Assign the team to an existing dinner event from the singleton season
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, activeSeason.id!)
        expect(dinnerEvents.length, 'Singleton season should have dinner events').toBeGreaterThan(0)
        await DinnerEventFactory.updateDinnerEvent(context, dinnerEvents[0]!.id, {
            cookingTeamId: testTeamId,
            chefId: inhabitantId
        })
    })

    test('GIVEN chef with assigned team WHEN viewing chef page THEN sees team calendar and can select dinner', async ({page}) => {
        // WHEN: Navigate to chef page
        await page.goto(chefPageUrl)

        // THEN: Wait for chef message to appear (use locator to handle multiple matches)
        await pollUntil(
            async () => await page.locator('text=Du er chefkok').first().isVisible().catch(() => false),
            (isVisible) => isVisible,
            10
        )

        await expect(page.locator('text=Du er chefkok').first(), 'Chef role message should be visible').toBeVisible()

        // Documentation screenshot: Chef dashboard overview
        await doScreenshot(page, 'chef/chef-dashboard', true)
    })

    test('GIVEN chef page loaded WHEN dinner event exists THEN shows menu card and team info', async ({page}) => {
        // Navigate to chef page
        await page.goto(chefPageUrl)

        // Wait for chef message to appear
        await pollUntil(
            async () => await page.locator('text=Du er chefkok').first().isVisible().catch(() => false),
            (isVisible) => isVisible,
            10
        )

        // Wait for dinner event info to load (look for "Næste Madlavning")
        await pollUntil(
            async () => await page.locator('text=Næste Madlavning').first().isVisible().catch(() => false),
            (isVisible) => isVisible,
            10
        )

        await expect(page.locator('text=Næste Madlavning').first(), 'Next cooking info should be visible').toBeVisible()

        // Documentation screenshot: Chef menu card view
        await doScreenshot(page, 'chef/chef-menu-card', true)
    })
})
