import {test, expect} from '@playwright/test'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import testHelpers from '../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, doScreenshot, getSessionUserInfo, temporaryAndRandom} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

/**
 * E2E UI Tests for Chef Page
 *
 * Happy day scenario: Member chef views their team's dinners and manages menu
 * Uses member context (non-admin) for UI navigation
 * Uses admin context for test data setup in beforeAll
 */
test.describe('Chef Page - Happy Day', () => {
    const chefPageUrl = '/chef'
    let testTeamId: number
    let memberInhabitantId: number

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Get active season (creates if needed)
        const activeSeason = await SeasonFactory.createActiveSeason(adminContext)

        // Create a cooking team for the test
        const team = await SeasonFactory.createCookingTeamForSeason(adminContext, activeSeason.id!, `ChefTestTeam-${testSalt}`)
        testTeamId = team.id!

        // Get the MEMBER user's inhabitantId and assign them to the team as CHEF
        const {inhabitantId} = await getSessionUserInfo(memberContext)
        memberInhabitantId = inhabitantId
        await SeasonFactory.assignMemberToTeam(adminContext, testTeamId, memberInhabitantId, TeamRole.CHEF)

        // Get existing dinner events to find a valid FUTURE cooking date within the season
        // Note: Dinner events are now sorted chronologically (oldest first), so we find the first future date
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(adminContext, activeSeason.id!)
        expect(dinnerEvents.length, 'Singleton season should have dinner events').toBeGreaterThan(0)
        const now = new Date()
        const futureDinner = dinnerEvents.find(e => new Date(e.date) > now)
        expect(futureDinner, 'Should have at least one future dinner event').toBeDefined()
        const validCookingDate = new Date(futureDinner!.date)

        // Create a dinner event for the member's test team
        await DinnerEventFactory.createDinnerEvent(adminContext, {
            date: validCookingDate,
            menuTitle: `ChefTestDinner-${testSalt}`,
            seasonId: activeSeason.id!,
            cookingTeamId: testTeamId,
            chefId: memberInhabitantId
        })
    })

    test('GIVEN member chef with assigned team WHEN viewing chef page THEN sees dashboard with countdown', async ({browser}) => {
        // Use member context for UI navigation
        const memberContext = await memberValidatedBrowserContext(browser)
        const page = await memberContext.newPage()

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
