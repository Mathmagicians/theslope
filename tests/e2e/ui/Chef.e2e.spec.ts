import {test, expect} from '@playwright/test'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import testHelpers from '../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, getSessionUserInfo, temporaryAndRandom, gotoHydrated, expectHydratedWithoutMismatch} = testHelpers
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
    let team1Name: string
    let team2Name: string
    let memberInhabitantId: number
    const createdTeamIds: number[] = []
    const createdDinnerIds: number[] = []

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Get active season (creates if needed)
        const activeSeason = await SeasonFactory.createActiveSeason(adminContext)

        // Get the MEMBER user's inhabitantId
        const {inhabitantId} = await getSessionUserInfo(memberContext)
        memberInhabitantId = inhabitantId

        // Two teams; each receives the season's generated dinners by affinity and one dinner of its own, alone on a free
        // day, so the team cooks at least once (the page selects a dinner by date)
        team1Name = `ChefTeam1-${testSalt}`
        const team1 = await SeasonFactory.createCookingTeamForSeason(adminContext, activeSeason.id!, team1Name)
        team1Id = team1.id!
        createdTeamIds.push(team1Id)
        await SeasonFactory.assignMemberToTeam(adminContext, team1Id, memberInhabitantId, TeamRole.CHEF)
        const team1Dinner = await DinnerEventFactory.createDinnerEventOnFreeDay(adminContext, activeSeason, {
            menuTitle: `Team1Dinner-${testSalt}`,
            cookingTeamId: team1Id,
            chefId: memberInhabitantId
        })
        createdDinnerIds.push(team1Dinner.id!)

        team2Name = `ChefTeam2-${testSalt}`
        const team2 = await SeasonFactory.createCookingTeamForSeason(adminContext, activeSeason.id!, team2Name)
        team2Id = team2.id!
        createdTeamIds.push(team2Id)
        await SeasonFactory.assignMemberToTeam(adminContext, team2Id, memberInhabitantId, TeamRole.CHEF)
        const team2Dinner = await DinnerEventFactory.createDinnerEventOnFreeDay(adminContext, activeSeason, {
            menuTitle: `Team2Dinner-${testSalt}`,
            cookingTeamId: team2Id,
            chefId: memberInhabitantId
        })
        createdDinnerIds.push(team2Dinner.id!)
    })

    test.afterAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        // The dinners go before their teams; another spec's season cleanup can cascade either away first (cleanup accepts a 404)
        for (const dinnerId of createdDinnerIds) {
            await DinnerEventFactory.deleteDinnerEvent(adminContext, dinnerId)
        }
        for (const teamId of createdTeamIds) {
            await SeasonFactory.deleteCookingTeam(adminContext, teamId)
        }
    })

    test('GIVEN member chef with assigned team WHEN the chef page loads THEN the client hydrates the server render without a mismatch and one footer', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        const page = await memberContext.newPage()
        await expectHydratedWithoutMismatch(page, `${chefPageUrl}?team=${team1Id}`)

        await expect(page.getByTestId('chef-calendar-header')).toBeVisible()
        await expect(page.locator('footer')).toHaveCount(1)
    })

    test('GIVEN member on 2 teams WHEN switching team tabs THEN calendar updates to show correct team dinners', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const page = await memberContext.newPage()
        // The countdown reads the team's next cooking day; the affinity assignment can give both teams the same one
        const nextCookingDay = async (teamId: number) => {
            const team = (await SeasonFactory.getCookingTeamById(adminContext, teamId))!
            const upcoming = team.dinnerEvents.map(dinner => new Date(dinner.date).getTime()).filter(time => time > Date.now()).sort((a, b) => a - b)
            return upcoming[0] === undefined ? null : new Date(upcoming[0]).toDateString()
        }

        // Navigate with Team 1 selected
        await gotoHydrated(page, `${chefPageUrl}?team=${team1Id}`)

        // Countdown renders once planStore is ready and ChefCalendarDisplay mounts - poll for testid
        await pollUntil(
            async () => await page.locator('[data-testid="chef-next-cooking-countdown"]').first().isVisible().catch(() => false),
            (isVisible) => isVisible,
            10
        )
        await expect(page.locator('text=Du er chefkok').first()).toBeVisible()

        // Get Team 1's countdown text
        const team1CountdownText = await page.locator('[data-testid="chef-next-cooking-countdown"]').first().textContent()
        expect(team1CountdownText).toBeTruthy()

        // Switch to Team 2 tab (use exact name to avoid matching leftover teams)
        await page.getByRole('tab', {name: team2Name}).click()
        await page.waitForURL(url => url.searchParams.get('team') === String(team2Id))
        await page.waitForTimeout(500)

        // Verify countdown changed
        const team2CountdownText = await page.locator('[data-testid="chef-next-cooking-countdown"]').first().textContent()
        expect(team2CountdownText).toBeTruthy()
        if (await nextCookingDay(team1Id) !== await nextCookingDay(team2Id)) {
            expect(team2CountdownText).not.toBe(team1CountdownText)
        }

        // Switch back to Team 1 - verify it updates again
        await page.getByRole('tab', {name: team1Name}).click()
        await page.waitForURL(url => url.searchParams.get('team') === String(team1Id))
        await page.waitForTimeout(500)

        const team1CountdownTextAfter = await page.locator('[data-testid="chef-next-cooking-countdown"]').first().textContent()
        expect(team1CountdownTextAfter).toBe(team1CountdownText)
    })
})
