import {test, expect, BrowserContext} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import testHelpers from '../testHelpers'
import {formatDate, getEachDayOfIntervalWithSelectedWeekdays, excludeDatesFromInterval} from '~/utils/date'
import {useSeasonValidation, type Season} from '~/composables/useSeasonValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, selectDropdownOption} = testHelpers
const {deserializeSeason} = useSeasonValidation()

/**
 * Calculate expected dinner event count for a season
 * Mirrors server logic in generateDinnerEventDataForSeason
 */
const calculateExpectedEventCount = (season: Season): number => {
    const allCookingDates = getEachDayOfIntervalWithSelectedWeekdays(
        season.seasonDates.start,
        season.seasonDates.end,
        season.cookingDays
    )
    const validDates = excludeDatesFromInterval(allCookingDates, season.holidays)
    return validDates.length
}

/**
 * Generate unique test data for UI form submissions
 * Used when creating seasons via UI (not via factory)
 * Creates 1-week season (7 days) with Mon/Wed/Fri cooking days = exactly 3 events
 */
const generateUniqueSeasonDates = () => {
    const date1 = SeasonFactory.generateUniqueDate()
    const date2 = new Date(date1.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days later (1 week)

    // Holiday within season range (2 days after start, 2 days duration)
    const holidayDate1 = new Date(date1.getTime() + 2 * 24 * 60 * 60 * 1000)
    const holidayDate2 = new Date(holidayDate1.getTime() + 2 * 24 * 60 * 60 * 1000)

    // Search pattern based on start date: MM/yy
    const searchPattern = `${String(date1.getMonth() + 1).padStart(2, '0')}/${String(date1.getFullYear()).slice(-2)}`

    return {
        startDate: formatDate(date1),
        endDate: formatDate(date2),
        holidayStart: formatDate(holidayDate1),
        holidayEnd: formatDate(holidayDate2),
        searchPattern
    }
}

/**
 * UI TEST STRATEGY:
 * - Focus on UI interaction (clicking, filling forms, navigation)
 * - Use API (SeasonFactory) for setup and verification
 * - Keep tests simple and focused on user workflow
 * - Data integrity verification belongs in API tests (season.e2e.spec.ts)
 */
test.describe('AdminPlanningSeason Form UI', () => {
    const adminPlanningUrl = '/admin/planning'
    let createdSeasonIds: number[] = []

    test.use({storageState: adminUIFile})

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('Can load admin planning page', async ({page}) => {
        await page.goto(adminPlanningUrl)
        await page.waitForLoadState('networkidle')

        // Verify form mode buttons are visible
        await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-edit"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-create"]')).toBeVisible()
    })

    test('GIVEN user in create mode WHEN filling and submitting form THEN season is created AND dinner events are generated', async ({
                                                                                                         page,
                                                                                                         browser
                                                                                                     }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Navigate to create mode
        await page.goto(`${adminPlanningUrl}?mode=create`)
        await page.waitForLoadState('networkidle')

        // Verify we're in create mode
        await expect(page.locator('button[name="form-mode-create"]')).toHaveClass(/ring-2/)

        // Wait for form to be visible
        await expect(page.locator('form#seasonForm')).toBeVisible()

        // WHEN: Fill basic form fields with unique test data
        const { startDate, endDate, searchPattern } = generateUniqueSeasonDates()

        await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
        await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)

        // Submit form
        const submitButton = page.locator('button[name="submit-season"]')
        await expect(submitButton).toBeVisible()
        await submitButton.click()
        await page.waitForLoadState('networkidle')

        // THEN: Form should switch to view mode (indicating success)
        await expect(page.locator('button[name="form-mode-view"]')).toHaveClass(/ring-2/)

        // Verify season was created via API (shortName format is MM/yy)
        const seasons = await SeasonFactory.getAllSeasons(context)
        const createdSeason = seasons.find(s => s.shortName?.includes(searchPattern))

        expect(createdSeason).toBeDefined()
        if (createdSeason) {
            createdSeasonIds.push(createdSeason.id!)

            // AND: Verify dinner events were auto-generated for the season
            const deserializedSeason = deserializeSeason(createdSeason)
            const expectedEventCount = calculateExpectedEventCount(deserializedSeason)

            // Wait for async dinner event generation to complete
            const dinnerEvents = await DinnerEventFactory.waitForDinnerEventsGeneration(
                context,
                createdSeason.id!,
                expectedEventCount
            )
            expect(dinnerEvents.length).toBe(expectedEventCount)
        }
    })

    test('GIVEN season exists WHEN user switches to edit mode THEN form shows season data', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season via API
        const season = await SeasonFactory.createSeason(context, { holidays: [] })
        createdSeasonIds.push(season.id!)

        // Navigate to planning page
        await page.goto(adminPlanningUrl)
        await page.waitForLoadState('networkidle')

        // USelect: Click button to open dropdown, then click option
        await page.getByTestId('season-selector').click()
        await page.getByRole('option', { name: season.shortName }).click()

        // WHEN: Switch to edit mode
        await page.locator('button[name="form-mode-edit"]').click()
        await page.waitForLoadState('networkidle')

        // THEN: Form should be in edit mode with season data
        await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
        await expect(page.locator('form#seasonForm')).toBeVisible()

        // Verify submit button is available
        await expect(page.locator('button[name="submit-season"]')).toBeVisible()
    })

    test('GIVEN user in create mode WHEN adding holiday period THEN holiday is added to list', async ({
                                                                                                          page,
                                                                                                          browser
                                                                                                      }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Navigate to create mode
        await page.goto(`${adminPlanningUrl}?mode=create`)
        await page.waitForLoadState('networkidle')
        await expect(page.locator('form#seasonForm')).toBeVisible()

        // Fill basic fields with unique test data
        const { startDate, endDate, holidayStart, holidayEnd, searchPattern } = generateUniqueSeasonDates()

        await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
        await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)

        // WHEN: Add holiday period via UI
        await page.locator('[name="holidayRangeList"] input[name="start"]').fill(holidayStart)
        await page.locator('[name="holidayRangeList"] input[name="end"]').fill(holidayEnd)

        const addHolidayButton = page.locator('button[name="holidayRangeAddToList"]')
        await expect(addHolidayButton).toBeVisible()
        await addHolidayButton.click()

        // THEN: Holiday item should appear in list
        const holidayItem = page.locator('[name^="holidayRangeList-0"]')
        await expect(holidayItem).toBeVisible()

        // Remove button should be visible for the holiday
        const removeButton = page.locator('button[name="holidayRangeRemoveFromList-0"]')
        await expect(removeButton).toBeVisible()

        // Submit and verify via API
        await page.locator('button[name="submit-season"]').click()
        await page.waitForLoadState('networkidle')

        // Verify season was created with holiday via API (shortName format is MM/yy)
        const serializedSeasons = await SeasonFactory.getAllSeasons(context)
        const serializedSeason = serializedSeasons.find(s => s.shortName?.includes(searchPattern))

        expect(serializedSeason).toBeDefined()
        const createdSeason = deserializeSeason(serializedSeason)
        expect(createdSeason.holidays.length).toBeGreaterThan(0)
        createdSeasonIds.push(createdSeason.id!)
    })

    test('GIVEN season with holiday WHEN removing holiday via UI THEN holiday is removed from list', async ({
                                                                                                                page,
                                                                                                                browser
                                                                                                            }) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with one holiday via API
        const holidayPeriod = {start: new Date(2025, 11, 24), end: new Date(2026, 0, 2)}
        const season = await SeasonFactory.createSeason(context, { holidays: [holidayPeriod] })
        createdSeasonIds.push(season.id!)

        // Navigate to planning page
        await page.goto(adminPlanningUrl)

        // Select season FIRST (so it's available when we switch to edit mode)
        await selectDropdownOption(page, 'season-selector', season.shortName, adminPlanningUrl)

        // THEN switch to edit mode (this will populate the draft with season data)
        await page.locator('button[name="form-mode-edit"]').click()

        // Wait for edit mode to be active
        await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)

        // Wait for form to be visible
        await expect(page.locator('form#seasonForm')).toBeVisible()

        // Verify holiday is shown
        const holidayItem = page.locator('[name^="holidayRangeList-0"]')
        await expect(holidayItem).toBeVisible()

        // WHEN: Remove holiday
        const removeButton = page.locator('button[name="holidayRangeRemoveFromList-0"]')
        await expect(removeButton).toBeVisible()
        await removeButton.click()

        // THEN: Holiday item should be removed from UI
        await expect(holidayItem).not.toBeVisible()

        // Submit and verify via API
        await page.locator('button[name="submit-season"]').click()
        await page.waitForLoadState('networkidle')

        // Verify holiday was removed via API
        const serializedSeason = await SeasonFactory.getSeason(context, season.id)
        const updatedSeason = deserializeSeason(serializedSeason)
        expect(updatedSeason.holidays).toHaveLength(0)
    })
})

/**
 * NOTE: Tests for dinner events and cooking teams creation belong in API tests
 */
