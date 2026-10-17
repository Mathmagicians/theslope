import {test, expect} from '@playwright/test'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import testHelpers from '../testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, temporaryAndRandom, gotoHydrated, expectHydratedWithoutMismatch} = testHelpers

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

        // Two teams with the member as chef; each receives the season's generated dinners by affinity and one dinner of
        // its own, alone on a free day, so the team cooks at least once (the page selects a dinner by date)
        const createChefTeam = async (teamName: string, menuTitle: string) => {
            const {team, dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(adminContext, activeSeason, memberInhabitantId, {
                teamName, dinner: {menuTitle}, day: 'free'
            })
            createdTeamIds.push(team.id!)
            createdDinnerIds.push(dinner.id!)
            return team.id!
        }
        team1Name = `ChefTeam1-${testSalt}`
        team1Id = await createChefTeam(team1Name, `Team1Dinner-${testSalt}`)
        team2Name = `ChefTeam2-${testSalt}`
        team2Id = await createChefTeam(team2Name, `Team2Dinner-${testSalt}`)
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

        // Countdown renders once planStore is ready and ChefCalendarDisplay mounts
        await expect(page.locator('[data-testid="chef-next-cooking-countdown"]').first()).toBeVisible({timeout: 15_000})
        // The role status title; its description also opens with the words
        await expect(page.getByText('Du er chefkok', {exact: true})).toBeVisible()

        // Get Team 1's countdown text
        const team1CountdownText = await page.locator('[data-testid="chef-next-cooking-countdown"]').first().textContent()
        expect(team1CountdownText).toBeTruthy()

        // Switch to Team 2 tab (use exact name to avoid matching leftover teams)
        await page.getByRole('tab', {name: team2Name}).click()
        await page.waitForURL(url => url.searchParams.get('team') === String(team2Id))
        // The role status names the selected team; the countdown renders from the same selection
        await expect(page.getByText(`Du er chefkok på ${team2Name}`)).toBeVisible()

        // Verify countdown changed
        const team2CountdownText = await page.locator('[data-testid="chef-next-cooking-countdown"]').first().textContent()
        expect(team2CountdownText).toBeTruthy()
        if (await nextCookingDay(team1Id) !== await nextCookingDay(team2Id)) {
            expect(team2CountdownText).not.toBe(team1CountdownText)
        }

        // Switch back to Team 1 - verify it updates again
        await page.getByRole('tab', {name: team1Name}).click()
        await page.waitForURL(url => url.searchParams.get('team') === String(team1Id))
        await expect(page.getByText(`Du er chefkok på ${team1Name}`)).toBeVisible()

        const team1CountdownTextAfter = await page.locator('[data-testid="chef-next-cooking-countdown"]').first().textContent()
        expect(team1CountdownTextAfter).toBe(team1CountdownText)
    })
})
