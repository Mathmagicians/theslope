import {test, expect} from '@playwright/test'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import testHelpers from '../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, getSessionUserInfo, temporaryAndRandom} = testHelpers
const {TeamRoleSchema} = useCookingTeamValidation()
const TeamRole = TeamRoleSchema.enum

/**
 * E2E UI Tests for Chef Page
 *
 * Uses member context (non-admin) for UI navigation
 * Uses admin context for test data setup in beforeAll
 */
test.describe('Chef Page', () => {
    const chefPageUrl = '/chef'
    let team1Id: number
    let team2Id: number
    let team1DinnerDate: Date
    let team2DinnerDate: Date
    let memberInhabitantId: number
    const createdTeamIds: number[] = []

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Get active season (creates if needed)
        const activeSeason = await SeasonFactory.createActiveSeason(adminContext)

        // Get the MEMBER user's inhabitantId
        const {inhabitantId} = await getSessionUserInfo(memberContext)
        memberInhabitantId = inhabitantId

        // Get future dinner events to find valid cooking dates
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(adminContext, activeSeason.id!)
        expect(dinnerEvents.length, 'Singleton season should have dinner events').toBeGreaterThan(1)
        const now = new Date()
        const futureDinners = dinnerEvents.filter(e => new Date(e.date) > now)
        expect(futureDinners.length, 'Should have at least 2 future dinner events').toBeGreaterThanOrEqual(2)

        // Create Team 1 with dinner on first future date
        const team1 = await SeasonFactory.createCookingTeamForSeason(adminContext, activeSeason.id!, `ChefTeam1-${testSalt}`)
        team1Id = team1.id!
        createdTeamIds.push(team1Id)
        await SeasonFactory.assignMemberToTeam(adminContext, team1Id, memberInhabitantId, TeamRole.CHEF)
        team1DinnerDate = new Date(futureDinners[0].date)
        await DinnerEventFactory.createDinnerEvent(adminContext, {
            date: team1DinnerDate,
            menuTitle: `Team1Dinner-${testSalt}`,
            seasonId: activeSeason.id!,
            cookingTeamId: team1Id,
            chefId: memberInhabitantId
        })

        // Create Team 2 with dinner on second future date
        const team2 = await SeasonFactory.createCookingTeamForSeason(adminContext, activeSeason.id!, `ChefTeam2-${testSalt}`)
        team2Id = team2.id!
        createdTeamIds.push(team2Id)
        await SeasonFactory.assignMemberToTeam(adminContext, team2Id, memberInhabitantId, TeamRole.CHEF)
        team2DinnerDate = new Date(futureDinners[1].date)
        await DinnerEventFactory.createDinnerEvent(adminContext, {
            date: team2DinnerDate,
            menuTitle: `Team2Dinner-${testSalt}`,
            seasonId: activeSeason.id!,
            cookingTeamId: team2Id,
            chefId: memberInhabitantId
        })
    })

    test.afterAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        for (const teamId of createdTeamIds) {
            await SeasonFactory.deleteCookingTeam(adminContext, teamId)
        }
    })

    test('GIVEN member chef with assigned team WHEN viewing chef page THEN sees dashboard with countdown', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const page = await memberContext.newPage()

        await page.goto(`${chefPageUrl}?team=${team1Id}`)

        await pollUntil(
            async () => await page.locator('text=Du er chefkok').first().isVisible().catch(() => false),
            (isVisible) => isVisible,
            10
        )
        await expect(page.locator('text=Du er chefkok').first()).toBeVisible()
        await expect(page.locator('text=Næste Madlavning').first()).toBeVisible()
    })

    test('GIVEN member on 2 teams WHEN switching team tabs THEN calendar updates to show correct team dinners', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const page = await memberContext.newPage()

        // Navigate with Team 1 selected
        await page.goto(`${chefPageUrl}?team=${team1Id}`)

        // Wait for countdown to load
        await pollUntil(
            async () => await page.locator('[data-testid="countdown-timer"]').first().isVisible().catch(() => false),
            (isVisible) => isVisible,
            10
        )

        // Get Team 1's countdown text
        const team1CountdownText = await page.locator('[data-testid="countdown-timer"]').first().textContent()
        expect(team1CountdownText).toBeTruthy()

        // Switch to Team 2 tab
        await page.getByRole('tab').filter({hasText: /ChefTeam2/}).click()
        await page.waitForURL(url => url.searchParams.get('team') === String(team2Id))
        await page.waitForTimeout(500)

        // Verify countdown changed
        const team2CountdownText = await page.locator('[data-testid="countdown-timer"]').first().textContent()
        expect(team2CountdownText).toBeTruthy()
        if (team1DinnerDate.toDateString() !== team2DinnerDate.toDateString()) {
            expect(team2CountdownText).not.toBe(team1CountdownText)
        }

        // Switch back to Team 1 - verify it updates again
        await page.getByRole('tab').filter({hasText: /ChefTeam1/}).click()
        await page.waitForURL(url => url.searchParams.get('team') === String(team1Id))
        await page.waitForTimeout(500)

        const team1CountdownTextAfter = await page.locator('[data-testid="countdown-timer"]').first().textContent()
        expect(team1CountdownTextAfter).toBe(team1CountdownText)
    })
})
