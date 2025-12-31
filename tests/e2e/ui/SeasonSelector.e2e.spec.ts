import {test, expect, type Page} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'
import type {Season} from '~/composables/useSeasonValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, selectDropdownOption, doScreenshot, salt, temporaryAndRandom} = testHelpers

test.describe('SeasonSelector UI - Status Indicators', () => {
    const adminPlanningUrl = '/admin/planning'
    // Unique salt per worker to avoid parallel test conflicts
    const testSalt = temporaryAndRandom()
    const createdSeasonIds: number[] = []

    // Shared test data - created once in beforeAll
    let activeSeason: Season
    let futureSeason: Season
    let pastSeason: Season

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create singleton active season (cleaned up by global teardown)
        activeSeason = await SeasonFactory.createActiveSeason(context)

        // Create test-specific future season
        const futureYear = new Date().getFullYear() + 1
        futureSeason = await SeasonFactory.createSeason(context, {
            shortName: salt('Future', testSalt),
            seasonDates: {
                start: new Date(futureYear, 0, 1),
                end: new Date(futureYear, 5, 30)
            },
            isActive: false,
            holidays: []
        })
        createdSeasonIds.push(futureSeason.id!)

        // Create test-specific past season
        const pastYear = new Date().getFullYear() - 1
        pastSeason = await SeasonFactory.createSeason(context, {
            shortName: salt('Past', testSalt),
            seasonDates: {
                start: new Date(pastYear, 0, 1),
                end: new Date(pastYear, 5, 30)
            },
            isActive: false,
            holidays: []
        })
        createdSeasonIds.push(pastSeason.id!)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Clean up test-specific seasons (NOT the singleton active season)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    /**
     * Helper: Navigate to planning page and wait for store to be ready
     */
    const navigateToPlanning = async (page: Page, seasonShortName?: string, mode?: string) => {
        // Build URL with optional season and mode params
        const params = new URLSearchParams()
        if (seasonShortName) params.set('season', seasonShortName)
        if (mode) params.set('mode', mode)
        const url = params.toString() ? `${adminPlanningUrl}?${params}` : adminPlanningUrl

        await page.goto(url)
        await doScreenshot(page, 'season-selector-after-goto')

        // Wait for Loader to disappear
        await pollUntil(
            async () => await page.locator('text=Vi venter på data').isVisible(),
            (isVisible) => !isVisible,
            10
        )

        // Wait for season selector to be visible
        await pollUntil(
            async () => await page.getByTestId('season-selector').isVisible(),
            (isVisible) => isVisible,
            10
        )
    }

    test('GIVEN no season parameter WHEN navigating to admin/planning THEN auto-selects active season', async ({page}) => {
        // WHEN: Navigate WITHOUT season parameter - tests auto-selection behavior
        await navigateToPlanning(page)

        // THEN: Active season should be auto-selected (shows green circle)
        const seasonSelector = page.getByTestId('season-selector')
        await expect(seasonSelector).toContainText(activeSeason.shortName)
        await expect(seasonSelector).toContainText('🟢')

        // Verify URL was updated with active season
        expect(page.url()).toContain(`season=${encodeURIComponent(activeSeason.shortName)}`)

        // Take screenshot showing auto-selection
        await doScreenshot(page, 'admin/season-selector-auto-select-active', true)
    })

    test('GIVEN active season selected WHEN opening dropdown THEN shows all seasons with status indicators', async ({page}) => {
        // Navigate with explicit active season
        await navigateToPlanning(page, activeSeason.shortName)

        const seasonSelector = page.getByTestId('season-selector')
        await expect(seasonSelector).toContainText('🟢')

        // Take screenshot showing season selector with active season
        await doScreenshot(page, 'admin/season-selector-with-active-season', true)

        // Click to open dropdown
        await seasonSelector.click()

        // Wait for dropdown options to be visible
        await pollUntil(
            async () => await page.locator('[role="option"]', {hasText: futureSeason.shortName}).isVisible(),
            (isVisible) => isVisible,
            10
        )

        // Take screenshot of dropdown with all status indicators
        await doScreenshot(page, 'admin/season-selector-dropdown-status-indicators', true)

        // Verify all seasons appear in dropdown
        await expect(page.locator('[role="option"]', {hasText: activeSeason.shortName})).toBeVisible()
        await expect(page.locator('[role="option"]', {hasText: futureSeason.shortName})).toBeVisible()
        await expect(page.locator('[role="option"]', {hasText: pastSeason.shortName})).toBeVisible()
    })

    test('GIVEN active season selected WHEN switching to future season THEN selection and URL update', async ({page}) => {
        // Navigate with explicit active season
        await navigateToPlanning(page, activeSeason.shortName)

        const seasonSelector = page.getByTestId('season-selector')
        await expect(seasonSelector).toContainText('🟢')

        // WHEN: Switch to future season
        await selectDropdownOption(page, 'season-selector', futureSeason.shortName)

        // Wait for selection to update (poll for seedling emoji)
        await pollUntil(
            async () => {
                const text = await seasonSelector.textContent()
                return text?.includes('🌱') || false
            },
            (hasEmoji) => hasEmoji,
            10
        )

        // THEN: Future season should be selected
        await expect(seasonSelector).toContainText(futureSeason.shortName)
        await expect(seasonSelector).toContainText('🌱')

        // Take screenshot showing future season selected
        await doScreenshot(page, 'admin/season-selector-future-season-selected', true)

        // Verify URL updated
        expect(page.url()).toContain(`season=${encodeURIComponent(futureSeason.shortName)}`)
    })

    test('GIVEN future season WHEN viewing status display THEN shows activation controls', async ({page}) => {
        // Navigate directly to future season in EDIT mode (activation button only visible in edit mode)
        await navigateToPlanning(page, futureSeason.shortName, 'edit')

        // Debug: screenshot before waiting for button
        await doScreenshot(page, 'season-status-before-button-wait')

        // Wait for activation button to load
        await pollUntil(
            async () => await page.getByTestId('activate-season').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // THEN: Should show enabled activation button
        const activateButton = page.getByTestId('activate-season')
        await expect(activateButton).toBeVisible()
        await expect(activateButton).not.toBeDisabled()
        await expect(activateButton).toContainText('Aktiver Sæson')

        // Verify status text
        await expect(page.getByText('Fremtidig sæson 🌱')).toBeVisible()

        // Take screenshot
        await doScreenshot(page, 'admin/season-status-display-future-season', true)
    })

    test('GIVEN active season WHEN viewing status display THEN shows deactivation controls', async ({page}) => {
        // Navigate directly to active season in EDIT mode (deactivation button only visible in edit mode)
        await navigateToPlanning(page, activeSeason.shortName, 'edit')

        // Wait for deactivation button to load (active seasons show deactivate, not activate)
        await pollUntil(
            async () => await page.getByTestId('deactivate-season').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // THEN: Should show enabled deactivation button
        const deactivateButton = page.getByTestId('deactivate-season')
        await expect(deactivateButton).toBeVisible()
        await expect(deactivateButton).not.toBeDisabled()
        await expect(deactivateButton).toContainText('Deaktiver Sæson')

        // Verify status text
        await expect(page.getByText('Aktiv sæson 🟢')).toBeVisible()

        // Take screenshot
        await doScreenshot(page, 'admin/season-status-display-active-season', true)
    })
})
