import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import testHelpers from '../testHelpers'
import {formatDate, getEachDayOfIntervalWithSelectedWeekdays, excludeDatesFromInterval} from '~/utils/date'
import type {Season} from '~/composables/useSeasonValidation'
import {addDays} from 'date-fns/addDays'

const {adminUIFile} = authFiles
const {validatedBrowserContext, selectDropdownOption, pollUntil} = testHelpers

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
    const date2 = addDays(date1, 7) // 7 days later (1 week)

    // Holiday within season range (2 days after start, 2 days duration)
    const holidayDate1 = addDays(date1, 2)
    const holidayDate2 = addDays(holidayDate1, 2)

    // Search pattern based on start date: MM/yy
    const searchPattern = `${String(date1.getMonth() + 1).padStart(2, '0')}/${String(date1.getFullYear()).slice(-2)}`

    return {
        startDate: formatDate(date1),
        endDate: formatDate(date2),
        holidayStart: formatDate(holidayDate1),
        holidayEnd: formatDate(holidayDate2),
        seasonStartDate: date1,  // Raw Date for API
        seasonEndDate: date2,    // Raw Date for API
        holidayPeriod: {start: holidayDate1, end: holidayDate2}, // Single-day holiday on start
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
    const createdSeasonIds: number[] = []

    test.use({storageState: adminUIFile})

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('Can load admin planning page', async ({page}) => {
        await page.goto(adminPlanningUrl)

        // Wait for form mode buttons to be visible (poll for store init)
        await pollUntil(
            async () => await page.locator('button[name="form-mode-view"]').isVisible(),
            (isVisible) => isVisible === true,
            10
        )
        await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-edit"]')).toBeVisible()
        await expect(page.locator('button[name="form-mode-create"]')).toBeVisible()
    })

    test('GIVEN user in create mode WHEN filling and submitting form THEN season is created AND dinner events are generated',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Navigate to create mode
            await page.goto(`${adminPlanningUrl}?mode=create`)
            await pollUntil(
                async () => await page.locator('button[name="form-mode-create"]').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page.locator('button[name="form-mode-create"]')).toHaveClass(/ring-2/)
            await expect(page.locator('form#seasonForm')).toBeVisible()

            // WHEN: Fill and submit form
            const {startDate, endDate, searchPattern} = generateUniqueSeasonDates()
            await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
            await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)
            await page.locator('button[name="submit-season"]').click()

            // THEN: Switches to view mode
            await expect(page.locator('button[name="form-mode-view"]')).toHaveClass(/ring-2/)

            // Verify season created via API
            const createdSeason = await pollUntil(
                () => SeasonFactory.getAllSeasons(context).then(seasons =>
                    seasons.find(s => s.shortName?.includes(searchPattern))
                ),
                (season) => season !== undefined
            )

            expect(createdSeason).toBeDefined()
            // Track immediately for cleanup (even if test fails later)
            createdSeasonIds.push(createdSeason!.id!)

            // Verify dinner events auto-generated
            const expectedEventCount = calculateExpectedEventCount(createdSeason!)
            const dinnerEvents = await DinnerEventFactory.waitForDinnerEventsGeneration(
                context,
                createdSeason!.id!,
                expectedEventCount
            )
            expect(dinnerEvents.length).toBe(expectedEventCount)
        })

    test('GIVEN season exists WHEN user switches to edit mode THEN form shows season data',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Create season via API
            const season = await SeasonFactory.createSeason(context, {holidays: []})
            createdSeasonIds.push(season.id!)

            await page.goto(adminPlanningUrl)
            await pollUntil(
                async () => await page.getByTestId('season-selector').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await selectDropdownOption(page, 'season-selector', season.shortName)

            // WHEN: Switch to edit mode
            await page.locator('button[name="form-mode-edit"]').click()

            // THEN: Form in edit mode with season data
            await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
            await expect(page.locator('form#seasonForm')).toBeVisible()
            await expect(page.getByTestId('season-selector')).toContainText(season.shortName)
            await expect(page.locator('button[name="submit-season"]')).toBeVisible()
        })

    test('GIVEN user in create mode WHEN adding holiday period THEN holiday is added to list',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Navigate to create mode
            await page.goto(`${adminPlanningUrl}?mode=create`)
            await pollUntil(
                async () => await page.locator('form#seasonForm').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page.locator('form#seasonForm')).toBeVisible()

            const {startDate, endDate, holidayStart, holidayEnd, searchPattern} = generateUniqueSeasonDates()
            await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
            await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)

            // WHEN: Add holiday period
            await page.locator('[name="holidayRangeList"] input[name="start"]').fill(holidayStart)
            await page.locator('[name="holidayRangeList"] input[name="end"]').fill(holidayEnd)
            await page.locator('button[name="holidayRangeAddToList"]').click()

            // THEN: Holiday appears in list (use pollUntil for reliable visibility check)
            await pollUntil(
                async () => await page.locator('[name^="holidayRangeList-0"]').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page.locator('[name^="holidayRangeList-0"]')).toBeVisible()
            await expect(page.locator('button[name="holidayRangeRemoveFromList-0"]')).toBeVisible()

            // Submit and verify via API
            await page.locator('button[name="submit-season"]').click()

            const createdSeason = await pollUntil(
                () => SeasonFactory.getAllSeasons(context).then(seasons =>
                    seasons.find(s => s.shortName?.includes(searchPattern))
                ),
                (season) => season !== undefined
            )

            expect(createdSeason).toBeDefined()
            if (createdSeason) {
                expect(createdSeason.holidays.length).toBeGreaterThan(0)
                createdSeasonIds.push(createdSeason.id!)
            }
        })

    test('GIVEN season with holiday WHEN removing holiday via UI THEN holiday is removed from list',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Create season with holiday
            const {seasonStartDate, seasonEndDate, holidayPeriod} = generateUniqueSeasonDates()
            const season = await SeasonFactory.createSeason(context, {
                seasonDates: {start: seasonStartDate, end: seasonEndDate},
                holidays: [holidayPeriod]
            })
            createdSeasonIds.push(season.id!)

            await page.goto(adminPlanningUrl)
            await pollUntil(
                async () => await page.getByTestId('season-selector').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await selectDropdownOption(page, 'season-selector', season.shortName)

            // WHEN: Switch to edit mode and remove holiday
            await page.locator('button[name="form-mode-edit"]').click()
            await expect(page).toHaveURL(/.*mode=edit/)
            await expect(page.locator('form#seasonForm')).toBeVisible()

            const holidayItem = page.locator('[name^="holidayRangeList-0"]')
            await pollUntil(
                async () => await holidayItem.isVisible(),
                (isVisible) => isVisible,
                10
            )

            const removeButton = page.locator('button[name="holidayRangeRemoveFromList-0"]')
            await removeButton.click()

            // THEN: Holiday removed from UI
            await pollUntil(
                async () => !(await holidayItem.isVisible()),
                (isNotVisible) => isNotVisible,
                10
            )
            await expect(holidayItem).not.toBeVisible()

            // Submit and verify via API
            await page.locator('button[name="submit-season"]').click()
            await expect(page).toHaveURL(/.*mode=view/)

            const updatedSeason = await pollUntil(
                () => SeasonFactory.getSeason(context, season.id!),
                (season) => season.holidays.length === 0
            )
            expect(updatedSeason.holidays).toHaveLength(0)
        })
})
