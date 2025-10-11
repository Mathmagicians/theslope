import {test, expect, BrowserContext} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'
import type {Season} from '~/composables/useSeasonValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, selectDropdownOption} = testHelpers

/**
 * UI TEST STRATEGY:
 * - Focus on UI interaction (clicking, filling forms, navigation)
 * - Use API (SeasonFactory) for setup and verification
 * - Keep tests simple and focused on user workflow
 * - Data integrity verification belongs in API tests (team.e2e.spec.ts)
 */
test.describe('AdminTeams Form UI', () => {
    const adminTeamsUrl = '/admin/teams'
    let createdSeasonIds: number[] = []

    test.use({storageState: adminUIFile})

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('Can load admin teams page', async ({page}) => {
        await page.goto(adminTeamsUrl)

        // Wait for page to be interactive - verify form mode buttons are visible
        await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-edit"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-create"]')).toBeVisible()
    })

    test.describe('Create Mode', () => {
        test('GIVEN user in create mode WHEN entering team count and submitting THEN teams are created',
            async ({page, browser}) => {
                const context = await validatedBrowserContext(browser)

                // GIVEN: Create a season to add teams to
                const season = await SeasonFactory.createSeason(context, {holidays: []})
                createdSeasonIds.push(season.id!)

                // Navigate to teams page in create mode
                const url = `${adminTeamsUrl}?mode=create`
                await page.goto(url)

                // Wait for create mode to be active
                await expect(page.locator('button[name="form-mode-create"]')).toHaveClass(/ring-2/)

                // Select the season (wait for API data to load)
                await selectDropdownOption(page, 'season-selector', season.shortName, adminTeamsUrl)

                // WHEN: Enter team count
                const teamCountInput = page.locator('input#team-count')
                await expect(teamCountInput).toBeVisible()
                await teamCountInput.fill('3')

                // Submit form
                const submitButton = page.getByRole('button', {name: /Opret madhold/i})
                await expect(submitButton).toBeVisible()
                await submitButton.click()

                // THEN: Form should switch to view mode (indicating success)
                await expect(page.locator('button[name="form-mode-view"]')).toHaveClass(/ring-2/)

                // Verify teams were created via API (with polling for async creation)
                const teams = await pollUntil(
                    () => SeasonFactory.getCookingTeamsForSeason(context, season.id!),
                    (teams) => teams.length === 3
                )
                expect(teams.length).toBe(3)

                // Verify team names follow pattern "Madhold X - season name"
                expect(teams[0].name).toContain('Madhold 1')
                expect(teams[0].name).toContain(season.shortName)
                expect(teams[1].name).toContain('Madhold 2')
                expect(teams[2].name).toContain('Madhold 3')
            })
    })

    test.describe('Edit Mode', () => {
        let context: BrowserContext
        let season: Season
        let page: any

        // Common setup for all edit mode tests
        test.beforeEach(async ({page: testPage, browser}) => {
            page = testPage
            context = await validatedBrowserContext(browser)

            // Create season via API
            season = await SeasonFactory.createSeason(context, {holidays: []})
            createdSeasonIds.push(season.id!)

            // Navigate to edit mode and select season
            await page.goto(`${adminTeamsUrl}?mode=edit`)
            await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
            await selectDropdownOption(page, 'season-selector', season.shortName, adminTeamsUrl)
        })

        // Helper: Reload page and reselect season (needed after creating teams via API)
        const reloadAndReselectSeason = async (seasonShortName: string) => {
            await page.reload()
            await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
            await selectDropdownOption(page, 'season-selector', seasonShortName, adminTeamsUrl)
        }

        test('GIVEN season with teams WHEN user switches to edit mode THEN teams are shown', async () => {
            // GIVEN: Create teams for the season
            await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team A')
            await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team B')

            // Reload to see the teams
            await reloadAndReselectSeason(season.shortName)

            // THEN: Verify we can see 2 team tabs in navigation (master-detail pattern shows 1 input at a time)
            const teamTabs = page.locator('[data-testid="team-tabs-list"] button[role="tab"]')
            await expect(teamTabs.first()).toBeVisible()
            await expect(teamTabs).toHaveCount(2)
        })

        test('GIVEN user in edit mode WHEN renaming team THEN team name is updated immediately', async () => {
            // GIVEN: Create one team
            const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Name')

            // Reload to see the team
            await reloadAndReselectSeason(season.shortName)

            // Wait for team input to be visible
            const teamInput = page.getByTestId('team-name-input').first()
            await expect(teamInput).toBeVisible()

            // WHEN: Append character to team name and blur (immediate save on blur)
            await teamInput.click()
            await teamInput.press('End') // Move cursor to end
            await teamInput.type('Q')

            // Wait for the API call to complete
            const responsePromise = page.waitForResponse(
                (response) => response.url().includes('/api/admin/team/') && response.request().method() === 'POST',
                { timeout: 5000 }
            )
            await teamInput.blur() // Trigger save on blur
            await responsePromise

            // THEN: Team name should be updated immediately via API
            const updatedTeam = await SeasonFactory.getCookingTeamById(context, team.id)
            expect(updatedTeam.name).toContain('Q')
        })

        test('GIVEN user in edit mode WHEN adding new team THEN team is saved immediately', async () => {
            // GIVEN: Create one team
            await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Existing Team')

            // Reload to see the team
            await reloadAndReselectSeason(season.shortName)

            // Verify initial team count - wait for team tabs to be visible
            const teamTabs = page.locator('[data-testid="team-tabs-list"] button[role="tab"]')
            await expect(teamTabs.first()).toBeVisible()
            await expect(teamTabs).toHaveCount(1)

            // WHEN: Add new team (saves immediately)
            const addButton = page.getByTestId('add-team-button')
            await expect(addButton).toBeVisible()

            // Wait for the API call to complete
            const responsePromise = page.waitForResponse(
                (response) => response.url().includes('/api/admin/team') && response.request().method() === 'PUT',
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

            // Verify 2 team tabs now exist in navigation (master-detail pattern shows 1 input at a time)
            await expect(teamTabs).toHaveCount(2)
        })

        test('GIVEN season with team WHEN deleting team via UI THEN team is removed', async () => {
            // GIVEN: Create one team
            const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team to Delete')

            // Reload to see the team
            await reloadAndReselectSeason(season.shortName)

            // Verify team is shown
            const teamInput = page.getByTestId('team-name-input').first()
            await expect(teamInput).toBeVisible()

            // WHEN: Delete team
            const deleteButton = page.getByTestId('delete-team-button')
            await expect(deleteButton).toBeVisible()

            // Wait for the API call to complete
            const responsePromise = page.waitForResponse(
                (response) => response.url().includes('/api/admin/team/') && response.request().method() === 'DELETE',
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

            // Reload to see the teams
            await reloadAndReselectSeason(season.shortName)

            // Wait for team tabs to load after season selection
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