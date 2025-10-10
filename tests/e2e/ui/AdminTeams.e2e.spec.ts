import {test, expect, BrowserContext} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'

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

    test('GIVEN user in create mode WHEN entering team count and submitting THEN teams are created',
        async ({
                   page,
                   browser
               }) => {
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
            await selectDropdownOption(page, 'season-selector', season.shortName, url)

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

    test('GIVEN season with teams WHEN user switches to edit mode THEN teams are shown', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with teams via API
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team A')
        await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team B')

        // Navigate directly to edit mode via URL (Playwright best practice)
        const url = `${adminTeamsUrl}?mode=edit`
        await page.goto(url)

        // Wait for edit mode to be active
        await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)

        // Select the season (wait for API data to load)
        await selectDropdownOption(page, 'season-selector', season.shortName, url)

        // THEN: Verify we can see 2 team tabs in navigation (master-detail pattern shows 1 input at a time)
        const teamTabs = page.locator('[data-testid="team-tabs-list"] button[role="tab"]')
        await expect(teamTabs.first()).toBeVisible()
        await expect(teamTabs).toHaveCount(2)
    })

    test('GIVEN user in edit mode WHEN renaming team THEN team name is updated immediately', async ({
                                                                                                        page,
                                                                                                        browser
                                                                                                    }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with one team
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Teamname Update')

        // Navigate directly to edit mode via URL (Playwright best practice)
        const url = `${adminTeamsUrl}?mode=edit`
        await page.goto(url)

        // Wait for edit mode to be active
        await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)

        // Select the season (wait for API data to load)
        await selectDropdownOption(page, 'season-selector', season.shortName, url)

        // Wait for team input to be visible
        const teamInput = page.getByTestId('team-name-input').first()
        await expect(teamInput).toBeVisible()

        // WHEN: Rename team and blur (immediate save on blur)
        await teamInput.clear()
        await teamInput.fill('Renamed Team')
        await teamInput.blur() // Trigger save on blur
        await page.waitForTimeout(500) // Wait for async save

        // THEN: Team name should be updated immediately via API
        const updatedTeam = await SeasonFactory.getCookingTeamById(context, team.id)
        expect(updatedTeam.name).toBe('Renamed Team')
    })

    test('GIVEN user in edit mode WHEN adding new team THEN team is saved immediately', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with one team
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Existing Team')

        // Navigate directly to edit mode via URL (Playwright best practice)
        const url = `${adminTeamsUrl}?mode=edit`
        await page.goto(url)

        // Wait for edit mode to be active
        await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)

        // Select the season (wait for API data to load)
        await selectDropdownOption(page, 'season-selector', season.shortName, url)

        // Verify initial team count - wait for team tabs to be visible
        const teamTabs = page.locator('[data-testid="team-tabs-list"] button[role="tab"]')
        await expect(teamTabs.first()).toBeVisible()
        await expect(teamTabs).toHaveCount(1)

        // WHEN: Add new team (saves immediately)
        const addButton = page.getByTestId('add-team-button')
        await expect(addButton).toBeVisible()
        await addButton.click()
        await page.waitForTimeout(500) // Wait for async save

        // THEN: Team should be saved immediately via API
        const teams = await pollUntil(
            () => SeasonFactory.getCookingTeamsForSeason(context, season.id!),
            (teams) => teams.length === 2
        )
        expect(teams.length).toBe(2)

        // Verify 2 team tabs now exist in navigation (master-detail pattern shows 1 input at a time)
        await expect(teamTabs).toHaveCount(2)
    })

    test('GIVEN season with team WHEN deleting team via UI THEN team is removed', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with one team
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team to Delete')

        // Navigate directly to edit mode via URL (Playwright best practice)
        const url = `${adminTeamsUrl}?mode=edit`
        await page.goto(url)

        // Wait for edit mode to be active
        await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)

        // Select the season (wait for API data to load)
        await selectDropdownOption(page, 'season-selector', season.shortName, url)

        // Verify team is shown
        const teamInput = page.getByTestId('team-name-input').first()
        await expect(teamInput).toBeVisible()

        // WHEN: Delete team
        const deleteButton = page.getByTestId('delete-team-button')
        await expect(deleteButton).toBeVisible()
        await deleteButton.click()

        // Wait for deletion to complete
        await page.waitForTimeout(500)

        // THEN: Team should be removed immediately via API
        const teams = await pollUntil(
            () => SeasonFactory.getCookingTeamsForSeason(context, season.id!),
            (teams) => teams.length === 0
        )
        expect(teams.length).toBe(0)
    })

    test('GIVEN season with 3 teams WHEN clicking team tabs THEN detail panel shows selected team', async ({
                                                                                                               page,
                                                                                                               browser
                                                                                                           }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with 3 teams via API
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Alpha')
        await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Beta')
        await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team Gamma')

        // Navigate directly to edit mode via URL (Playwright best practice: no networkidle)
        const url = `${adminTeamsUrl}?mode=edit`
        await page.goto(url)

        // Wait for page to be fully interactive (explicit waits instead of networkidle)
        await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)

        // Select season (passing URL to wait for API data to load)
        await selectDropdownOption(page, 'season-selector', season.shortName, url)

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
