import {test, expect, BrowserContext} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil} = testHelpers

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
        await page.waitForLoadState('networkidle')

        // Verify form mode buttons are visible
        await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-edit"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-create"]')).toBeVisible()
    })

    test('GIVEN user in create mode WHEN entering team count and submitting THEN teams are created', async ({
                                                                                                                 page,
                                                                                                                 browser
                                                                                                             }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create a season to add teams to
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        // Navigate to teams page in create mode
        await page.goto(`${adminTeamsUrl}?mode=create`)
        await page.waitForLoadState('networkidle')

        // Select the season
        await page.getByTestId('season-selector').click()
        await page.getByRole('option', {name: season.shortName}).click()

        // Verify we're in create mode
        await expect(page.locator('button[name="form-mode-create"]')).toHaveClass(/ring-2/)

        // WHEN: Enter team count
        const teamCountInput = page.locator('input#team-count')
        await expect(teamCountInput).toBeVisible()
        await teamCountInput.fill('3')

        // Submit form
        const submitButton = page.getByRole('button', {name: /Opret madhold/i})
        await expect(submitButton).toBeVisible()
        await submitButton.click()
        await page.waitForLoadState('networkidle')

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

        // Navigate to teams page
        await page.goto(adminTeamsUrl)
        await page.waitForLoadState('networkidle')

        // Select the season
        await page.getByTestId('season-selector').click()
        await page.getByRole('option', {name: season.shortName}).click()

        // WHEN: Switch to edit mode
        await page.locator('button[name="form-mode-edit"]').click()
        await page.waitForLoadState('networkidle')

        // THEN: Edit mode should show teams with editable inputs
        await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)

        // Verify we can see team inputs
        const teamInputs = page.locator('input[type="text"][placeholder="Madhold navn"]')
        await expect(teamInputs.first()).toBeVisible()
        await expect(teamInputs).toHaveCount(2)
    })

    test('GIVEN user in edit mode WHEN renaming team and saving THEN team name is updated', async ({
                                                                                                        page,
                                                                                                        browser
                                                                                                    }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with one team
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Original Name')

        // Navigate and select season
        await page.goto(adminTeamsUrl)
        await page.waitForLoadState('networkidle')

        await page.getByTestId('season-selector').click()
        await page.getByRole('option', {name: season.shortName}).click()

        // Switch to edit mode
        await page.locator('button[name="form-mode-edit"]').click()
        await page.waitForLoadState('networkidle')

        // WHEN: Rename team
        const teamInput = page.locator('input[type="text"][placeholder="Madhold navn"]').first()
        await teamInput.clear()
        await teamInput.fill('Renamed Team')

        // Save changes
        const saveButton = page.getByRole('button', {name: /Gem ændringer/i})
        await saveButton.click()
        await page.waitForLoadState('networkidle')

        // THEN: Team name should be updated via API
        const updatedTeam = await SeasonFactory.getCookingTeamById(context, team.id)
        expect(updatedTeam.name).toBe('Renamed Team')
    })

    test('GIVEN user in edit mode WHEN adding new team THEN team is added to list', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with one team
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Existing Team')

        // Navigate and select season
        await page.goto(adminTeamsUrl)
        await page.waitForLoadState('networkidle')

        await page.getByTestId('season-selector').click()
        await page.getByRole('option', {name: season.shortName}).click()

        // Switch to edit mode
        await page.locator('button[name="form-mode-edit"]').click()
        await page.waitForLoadState('networkidle')

        // Verify initial team count
        let teamInputs = page.locator('input[type="text"][placeholder="Madhold navn"]')
        await expect(teamInputs).toHaveCount(1)

        // WHEN: Add new team
        const addButton = page.getByRole('button', {name: /Tilføj madhold/i})
        await addButton.click()

        // THEN: New team input should appear
        teamInputs = page.locator('input[type="text"][placeholder="Madhold navn"]')
        await expect(teamInputs).toHaveCount(2)

        // New team should have default name
        const newTeamInput = teamInputs.nth(1)
        await expect(newTeamInput).toHaveValue(/Madhold 2/)

        // Save to persist
        const saveButton = page.getByRole('button', {name: /Gem ændringer/i})
        await saveButton.click()
        await page.waitForLoadState('networkidle')

        // Verify via API
        const teams = await SeasonFactory.getCookingTeamsForSeason(context, season.id!)
        expect(teams.length).toBe(2)
    })

    test('GIVEN season with team WHEN deleting team via UI THEN team is removed', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with one team
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        const team = await SeasonFactory.createCookingTeamForSeason(context, season.id!, 'Team to Delete')

        // Navigate and select season
        await page.goto(adminTeamsUrl)
        await page.waitForLoadState('networkidle')

        await page.getByTestId('season-selector').click()
        await page.getByRole('option', {name: season.shortName}).click()

        // Switch to edit mode
        await page.locator('button[name="form-mode-edit"]').click()
        await page.waitForLoadState('networkidle')

        // Verify team is shown
        const teamInput = page.locator('input[type="text"][placeholder="Madhold navn"]').first()
        await expect(teamInput).toBeVisible()

        // WHEN: Delete team
        const deleteButton = page.locator('button[icon="i-heroicons-trash"]').first()
        await expect(deleteButton).toBeVisible()
        await deleteButton.click()

        // Wait for deletion to complete
        await page.waitForTimeout(500)

        // THEN: Team should be removed via API (immediate delete)
        const teams = await SeasonFactory.getCookingTeamsForSeason(context, season.id!)
        expect(teams.length).toBe(0)
    })

    test('GIVEN no teams for season WHEN in view mode THEN empty state is shown', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season without teams
        const season = await SeasonFactory.createSeason(context, {holidays: []})
        createdSeasonIds.push(season.id!)

        // Navigate to teams page
        await page.goto(adminTeamsUrl)
        await page.waitForLoadState('networkidle')

        // Select the season
        await page.getByTestId('season-selector').click()
        await page.getByRole('option', {name: season.shortName}).click()

        // THEN: Empty state should be shown
        await expect(page.getByText(/Her ser lidt tomt ud/i)).toBeVisible()
        await expect(page.getByRole('button', {name: /Opret madhold/i})).toBeVisible()
    })
})