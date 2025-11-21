import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, selectDropdownOption, doScreenshot, salt} = testHelpers

test.describe('SeasonSelector UI - Status Indicators', () => {
    const adminPlanningUrl = '/admin/planning'
    const createdSeasonIds: number[] = []

    test.use({storageState: adminUIFile})

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('GIVEN multiple seasons with different statuses WHEN viewing season selector THEN shows status indicators', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Get or create active season (singleton - may be cached from parallel test)
        const _activeSeason = await SeasonFactory.createActiveSeason(context)

        // Create test-specific future and past seasons
        const testSalt = Date.now().toString()

        const futureYear = new Date().getFullYear() + 1
        const futureSeason = await SeasonFactory.createSeason(context, {
            shortName: salt('Future', testSalt),
            seasonDates: {
                start: new Date(futureYear, 0, 1),
                end: new Date(futureYear, 5, 30)
            },
            isActive: false,
            holidays: []
        })
        createdSeasonIds.push(futureSeason.id!)

        const pastYear = new Date().getFullYear() - 1
        const pastSeason = await SeasonFactory.createSeason(context, {
            shortName: salt('Past', testSalt),
            seasonDates: {
                start: new Date(pastYear, 0, 1),
                end: new Date(pastYear, 5, 30)
            },
            isActive: false,
            holidays: []
        })
        createdSeasonIds.push(pastSeason.id!)

        // WHEN: Navigate to admin planning (active season auto-selected)
        await page.goto(adminPlanningUrl)
        await pollUntil(
            async () => await page.getByTestId('season-selector').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // THEN: Season selector should show active season with green circle
        const seasonSelector = page.getByTestId('season-selector')
        await expect(seasonSelector).toBeVisible()
        await expect(seasonSelector).toContainText('🟢')

        // Take screenshot showing season selector with active season
        await doScreenshot(page, 'admin/season-selector-with-active-season', true)

        // Click to open dropdown
        await seasonSelector.click()

        // Wait for dropdown to be visible
        await page.waitForTimeout(500)

        // Take screenshot of dropdown with all status indicators
        await doScreenshot(page, 'admin/season-selector-dropdown-status-indicators', true)

        // Verify seasons appear in dropdown
        // Note: Emojis are displayed via suffixKey in separate elements, so we just check season names are visible
        await expect(page.locator('[role="option"]', { hasText: futureSeason.shortName })).toBeVisible()
        await expect(page.locator('[role="option"]', { hasText: pastSeason.shortName })).toBeVisible()
    })

    test('GIVEN active season selected WHEN switching to future season THEN selection updates', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Get or create active season (singleton)
        await SeasonFactory.createActiveSeason(context)

        // Create test-specific future season
        const testSalt = Date.now().toString()
        const futureYear = new Date().getFullYear() + 1
        const futureSeason = await SeasonFactory.createSeason(context, {
            shortName: salt('Future', testSalt),
            seasonDates: {
                start: new Date(futureYear, 0, 1),
                end: new Date(futureYear, 5, 30)
            },
            isActive: false,
            holidays: []
        })
        createdSeasonIds.push(futureSeason.id!)

        // Navigate to page (active season auto-selected)
        await page.goto(adminPlanningUrl)
        await pollUntil(
            async () => await page.getByTestId('season-selector').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // Verify active season is selected (shows green circle)
        const seasonSelector = page.getByTestId('season-selector')
        await expect(seasonSelector).toContainText('🟢')

        // WHEN: Switch to future season
        await selectDropdownOption(page, 'season-selector', futureSeason.shortName)

        // Wait for selection to update
        await page.waitForTimeout(500)

        // THEN: Future season should be selected (shows green seedling)
        await expect(seasonSelector).toContainText(futureSeason.shortName)
        await expect(seasonSelector).toContainText('🌱')

        // Take screenshot showing future season selected
        await doScreenshot(page, 'admin/season-selector-future-season-selected', true)

        // Verify URL updated
        expect(page.url()).toContain(`season=${encodeURIComponent(futureSeason.shortName)}`)
    })

    test('GIVEN future season selected WHEN viewing season status display THEN shows activation controls', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create future season
        const testSalt = Date.now().toString()
        const futureYear = new Date().getFullYear() + 1
        const futureSeason = await SeasonFactory.createSeason(context, {
            shortName: salt('Future', testSalt),
            seasonDates: {
                start: new Date(futureYear, 0, 1),
                end: new Date(futureYear, 5, 30)
            },
            isActive: false,
            holidays: []
        })
        createdSeasonIds.push(futureSeason.id!)

        // WHEN: Navigate to season in VIEW mode (status display only shows in VIEW/EDIT)
        await page.goto(`${adminPlanningUrl}?season=${encodeURIComponent(futureSeason.shortName)}&mode=view`)
        await pollUntil(
            async () => await page.getByTestId('season-selector').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // Wait for page content to load - look for activation button instead of role="alert"
        await pollUntil(
            async () => await page.locator('button[name="activate-season"]').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // THEN: Season status display should show future season with activation button
        const activateButton = page.locator('button[name="activate-season"]')
        await expect(activateButton).toBeVisible()
        await expect(activateButton).not.toBeDisabled()
        await expect(activateButton).toContainText('Aktiver Sæson')

        // Verify status text with emoji is visible (emoji appears in both selector and title, so check full text)
        await expect(page.getByText('Fremtidig sæson 🌱')).toBeVisible()

        // Take screenshot showing season status display with activation controls
        await doScreenshot(page, 'admin/season-status-display-future-season', true)
    })

    test('GIVEN active season selected WHEN viewing season status display THEN shows active status without activation controls', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Get or create active season (singleton)
        const activeSeason = await SeasonFactory.createActiveSeason(context)

        // WHEN: Navigate to active season in VIEW mode (status display only shows in VIEW/EDIT)
        await page.goto(`${adminPlanningUrl}?season=${encodeURIComponent(activeSeason.shortName)}&mode=view`)
        await pollUntil(
            async () => await page.getByTestId('season-selector').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // Wait for page content to load - look for activation button instead of role="alert"
        await pollUntil(
            async () => await page.locator('button[name="activate-season"]').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // THEN: Season status display should show active season with disabled button
        const activateButton = page.locator('button[name="activate-season"]')
        await expect(activateButton).toBeVisible()
        await expect(activateButton).toBeDisabled()
        await expect(activateButton).toContainText('Fællesspisnings sæson er i gang')

        // Verify status text with emoji is visible (emoji appears in both selector and title, so check full text)
        await expect(page.getByText('Aktiv sæson 🟢')).toBeVisible()

        // Take screenshot showing active season status
        await doScreenshot(page, 'admin/season-status-display-active-season', true)
    })
})
