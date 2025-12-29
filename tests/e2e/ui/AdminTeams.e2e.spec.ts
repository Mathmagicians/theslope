import {test, expect, type BrowserContext, type Page, type Response} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'
import type {Season} from '~/composables/useSeasonValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil} = testHelpers

test.describe('AdminTeams Form UI', () => {
    const adminTeamsUrl = '/admin/teams'
    const createdSeasonIds: number[] = []

    test.use({storageState: adminUIFile})

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('Can load admin teams page', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const season = await SeasonFactory.createSeason(context)
        createdSeasonIds.push(season.id!)

        await page.goto(`${adminTeamsUrl}?season=${season.shortName}`)

        // Wait for page to be interactive - verify form mode buttons are visible (poll for store init)
        await pollUntil(
            async () => await page.locator('button[name="form-mode-view"]').isVisible(),
            (isVisible) => isVisible,
            10
        )
        await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-edit"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-create"]')).toBeVisible()
    })

    test.describe('Create Mode', () => {
        test('GIVEN user in create mode WHEN entering team count and submitting THEN teams are created',
            async ({page, browser}) => {
                const context = await validatedBrowserContext(browser)

                // GIVEN: Fresh season with NO teams
                const season = await SeasonFactory.createSeason(context)
                createdSeasonIds.push(season.id!)

                const initialTeams = await SeasonFactory.getCookingTeamsForSeason(context, season.id!)
                expect(initialTeams.length).toBe(0)

                await page.goto(`${adminTeamsUrl}?mode=create&season=${season.shortName}`)
                await page.waitForResponse(
                    (response) => response.url().includes('/api/admin/season') && response.status() === 200,
                    {timeout: 10000}
                )

                // WHEN: Create 2 teams
                await page.locator('input#team-count').fill('2')
                await page.getByRole('button', {name: /Opret madhold/i}).click()

                // THEN: Poll until teams are created
                const teams = await pollUntil(
                    () => SeasonFactory.getCookingTeamsForSeason(context, season.id!),
                    (teams) => teams.length === 2,
                    10
                )
                expect(teams.length).toBe(2)
                expect(teams[0]!.name).toContain('Madhold 1')
                expect(teams[0]!.name).toContain(season.shortName)
                expect(teams[1]!.name).toContain('Madhold 2')
                expect(teams[1]!.name).toContain(season.shortName)
            })
    })

    test.describe('Edit Mode', () => {
        let context: BrowserContext
        let season: Season
        let page: Page

        // Common setup for all edit mode tests
        test.beforeEach(async ({page: testPage, browser}) => {
            page = testPage
            context = await validatedBrowserContext(browser)

            // Create season via API
            season = await SeasonFactory.createSeason(context)
            createdSeasonIds.push(season.id!)

            // Navigate to edit mode with season in URL
            await page.goto(`${adminTeamsUrl}?mode=edit&season=${season.shortName}`)
            await pollUntil(
                async () => await page.locator('button[name="form-mode-edit"]').isVisible(),
                (isVisible) => isVisible === true,
                10
            )
        })

        test('GIVEN season with teams WHEN user switches to edit mode THEN teams are shown', async () => {
            // GIVEN: Create teams for the season
            await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team A')
            await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team B')

            // Navigate to see the teams
            await page.goto(`${adminTeamsUrl}?mode=edit&season=${season.shortName}`)
            await pollUntil(
                async () => await page.locator('button[name="form-mode-edit"]').isVisible(),
                (isVisible) => isVisible,
                10
            )

            // THEN: Verify we can see 2 team tabs in navigation (master-detail pattern shows 1 input at a time)
            const teamTabs = page.locator('[data-testid="team-tabs-list"] button[role="tab"]')
            await expect(teamTabs.first()).toBeVisible()
            await expect(teamTabs).toHaveCount(2)
        })

        test('GIVEN user in edit mode WHEN renaming team THEN team name is updated immediately', async () => {
            // GIVEN: Create one team
            const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Name')

            // Navigate to see the team
            await page.goto(`${adminTeamsUrl}?mode=edit&season=${season.shortName}`)
            await pollUntil(
                async () => await page.locator('button[name="form-mode-edit"]').isVisible(),
                (isVisible) => isVisible,
                10
            )

            // Wait for team input to be visible
            const teamInput = page.getByTestId('team-name-input').first()
            await expect(teamInput).toBeVisible()

            // WHEN: Append character to team name and blur (immediate save on blur)
            await teamInput.click()
            await teamInput.press('End') // Move cursor to end
            await teamInput.type('Q')

            // Wait for the API call to complete
            const responsePromise = page.waitForResponse(
                (response: Response) => response.url().includes('/api/admin/team/') && response.request().method() === 'POST',
                { timeout: 5000 }
            )
            await teamInput.blur() // Trigger save on blur
            await responsePromise

            // THEN: Team name should be updated immediately via API
            const updatedTeam = await SeasonFactory.getCookingTeamById(context, team.id!)
            expect(updatedTeam).not.toBeNull()
            expect(updatedTeam!.name).toContain('Q')
        })

        test('GIVEN user in edit mode WHEN adding new team THEN team is saved immediately', async () => {
            // GIVEN: Create one team
            await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Existing Team')

            // Navigate to see the team
            await page.goto(`${adminTeamsUrl}?mode=edit&season=${season.shortName}`)
            await pollUntil(
                async () => await page.locator('button[name="form-mode-edit"]').isVisible(),
                (isVisible) => isVisible,
                10
            )

            // Verify initial state via API (source of truth)
            const initialTeams = await SeasonFactory.getCookingTeamsForSeason(context, season.id!)
            expect(initialTeams.length).toBe(1)

            // Verify UI reflects initial state - wait for team tabs to be visible
            const teamTabs = page.locator('[data-testid="team-tabs-list"] button[role="tab"]')
            await expect(teamTabs.first()).toBeVisible()
            await expect(teamTabs).toHaveCount(1)

            // WHEN: Add new team (saves immediately)
            const addButton = page.getByTestId('add-team-button')
            await expect(addButton).toBeVisible()

            // Wait for the API call to complete
            const responsePromise = page.waitForResponse(
                (response: Response) => response.url().includes('/api/admin/team') && response.request().method() === 'PUT',
                { timeout: 5000 }
            )
            await addButton.click()
            await responsePromise

            // THEN: Team should be saved immediately via API
            const teams = await pollUntil(
                () => SeasonFactory.getCookingTeamsForSeason(context, season.id!),
                (teams) => teams.length === 2
            )
            expect(teams.length).toBe(2)

            // Verify UI reflects updated state
            await expect(teamTabs).toHaveCount(2)
        })

        test('GIVEN season with team WHEN deleting team via UI THEN team is removed', async () => {
            // GIVEN: Create one team
            const _ = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team to Delete')

            // Navigate to see the team
            await page.goto(`${adminTeamsUrl}?mode=edit&season=${season.shortName}`)
            await pollUntil(
                async () => await page.locator('button[name="form-mode-edit"]').isVisible(),
                (isVisible) => isVisible,
                10
            )

            // Verify team is shown
            const teamInput = page.getByTestId('team-name-input').first()
            await expect(teamInput).toBeVisible()

            // WHEN: Delete team
            const deleteButton = page.getByTestId('delete-team-button')
            await expect(deleteButton).toBeVisible()

            // Wait for the API call to complete
            const responsePromise = page.waitForResponse(
                (response: Response) => response.url().includes('/api/admin/team/') && response.request().method() === 'DELETE',
                { timeout: 5000 }
            )
            await deleteButton.click()
            await responsePromise

            // THEN: Team should be removed immediately via API
            const teams = await pollUntil(
                () => SeasonFactory.getCookingTeamsForSeason(context, season.id!),
                (teams) => teams.length === 0
            )
            expect(teams.length).toBe(0)
        })

        test('GIVEN season with 3 teams WHEN clicking team tabs THEN detail panel shows selected team', async () => {
            // GIVEN: Create 3 teams
            await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Alpha')
            await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Beta')
            await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Gamma')

            // Navigate to see the teams
            await page.goto(`${adminTeamsUrl}?mode=edit&season=${season.shortName}`)
            await pollUntil(
                async () => await page.locator('button[name="form-mode-edit"]').isVisible(),
                (isVisible) => isVisible,
                10
            )

            // Wait for team tabs to load
            const teamTabs = page.getByTestId('team-tabs-list').locator('button[role="tab"]')
            await expect(teamTabs.first()).toBeVisible()
            await expect(teamTabs).toHaveCount(3)

            // WHEN: Click different team tabs
            // Click second tab (Team Beta)
            await teamTabs.nth(1).click()

            // THEN: Detail panel shows Team Beta
            const teamInput = page.getByTestId('team-name-input')
            await expect(teamInput).toHaveValue(/Team Beta/)

            // Click third tab (Team Gamma)
            await teamTabs.nth(2).click()

            // THEN: Detail panel shows Team Gamma
            await expect(teamInput).toHaveValue(/Team Gamma/)

            // Click first tab (Team Alpha)
            await teamTabs.nth(0).click()

            // THEN: Detail panel shows Team Alpha
            await expect(teamInput).toHaveValue(/Team Alpha/)
        })
    })
})
