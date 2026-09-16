import {test, expect, type Page} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import testHelpers from '../testHelpers'
import {formatDate, parseDate, getEachDayOfIntervalWithSelectedWeekdays, excludeDatesFromInterval} from '~/utils/date'
import type {Season} from '~/composables/useSeasonValidation'
import {addDays} from 'date-fns/addDays'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, waitForHydration} = testHelpers

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

    // Second holiday starting BEFORE the first one (season start, 1 day duration) - no overlap
    const earlierHolidayDate1 = date1
    const earlierHolidayDate2 = addDays(date1, 1)

    // Search pattern based on start date: MM/yy
    const searchPattern = `${String(date1.getMonth() + 1).padStart(2, '0')}/${String(date1.getFullYear()).slice(-2)}`

    return {
        startDate: formatDate(date1),
        endDate: formatDate(date2),
        holidayStart: formatDate(holidayDate1),
        holidayEnd: formatDate(holidayDate2),
        earlierHolidayStart: formatDate(earlierHolidayDate1),
        earlierHolidayEnd: formatDate(earlierHolidayDate2),
        seasonStartDate: date1,  // Raw Date for API
        seasonEndDate: date2,    // Raw Date for API
        holidayPeriod: {start: holidayDate1, end: holidayDate2}, // Single-day holiday on start
        searchPattern
    }
}

/**
 * Start dates (as timestamps) of the holiday rows, in DOM order.
 * Editable rows are CalendarDateRangePickers named `holidayRangeList-<index>`, each with
 * its own `start` / `end` input holding DATE_SETTINGS.DATE_MASK text.
 */
const holidayRowStartDates = async (page: Page): Promise<number[]> => {
    const rowInputs = await page.locator('[name^="holidayRangeList-"] input[name="start"]').all()
    const rowValues = await Promise.all(rowInputs.map(input => input.inputValue()))
    return rowValues.map(value => parseDate(value).getTime())
}

const ascending = (timestamps: number[]) => [...timestamps].sort((a, b) => a - b)

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

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Create singleton active season once for all tests (shared across workers)
        // NOTE: Cleaned up by global teardown, not by this test suite
        await SeasonFactory.createActiveSeason(context)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('Can load admin planning page', async ({page}) => {
        await page.goto(adminPlanningUrl)

        // Wait for the header actions to be visible (poll for store init)
        await pollUntil(
            async () => await page.getByTestId('create-season').isVisible(),
            (isVisible) => isVisible === true,
            10
        )
        await expect(page.getByTestId('season-selector')).toBeVisible()
        await expect(page.getByTestId('create-season')).toBeVisible()
        await expect(page.getByTestId('edit-season')).toBeVisible()
    })

    test('GIVEN user in create mode WHEN filling and submitting form THEN season is created AND dinner events are generated',
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

            // WHEN: Fill and submit form
            const {startDate, endDate, searchPattern} = generateUniqueSeasonDates()
            await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
            await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)
            await page.getByTestId('submit-season').click()

            // THEN: Switches to view mode
            // (the DOM after the save is covered by AdminPlanning.e2e: pencil -> Annuller -> pencil)
            await expect(page).toHaveURL(/.*mode=view/)

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

            // GIVEN: Get singleton active season (created in beforeAll, read-only test)
            const allSeasons = await SeasonFactory.getAllSeasons(context)
            const season = allSeasons.find(s => s.shortName === SeasonFactory.E2E_SINGLETON_NAME)
            expect(season, 'Singleton active season should exist').toBeDefined()

            // Navigate directly to season in edit mode (no need to test dropdown here)
            await page.goto(`${adminPlanningUrl}?season=${encodeURIComponent(season!.shortName)}&mode=edit`)

            // WHEN/THEN: Form in edit mode with season data
            // WHEN/THEN: Form in edit mode with season data
            await pollUntil(
                async () => await page.locator('form#seasonForm').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page.locator('form#seasonForm')).toBeVisible()
            await expect(page.getByTestId('season-selector')).toContainText(season!.shortName)
            await expect(page.getByTestId('submit-season')).toHaveText(/Gem/)
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
            // The picker popover only opens once Vue has attached its trigger listener
            await waitForHydration(page)

            const {
                startDate, endDate, holidayStart, holidayEnd,
                earlierHolidayStart, earlierHolidayEnd, searchPattern
            } = generateUniqueSeasonDates()
            await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
            await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)

            // THEN: the season picker grid never renders a date twice - adjacent-month days
            // are disabled and hidden by the shared COMPONENTS.calendarGrid token
            // Scope to the picker popover - the page also renders the season preview calendar.
            // Hidden leading cells are not addressable, so count only the :visible ones
            const seasonPicker = page.getByRole('dialog')
            const visibleDayCells = seasonPicker.locator('[data-slot="cellTrigger"]:visible')
            await page.locator('[name="seasonDates"] input[name="start"]').click()
            await expect(visibleDayCells.first()).toBeVisible()
            await expect(seasonPicker.locator('[data-slot="cellTrigger"][data-outside-view]:visible')).toHaveCount(0)
            expect(await visibleDayCells.count()).toBeGreaterThan(27)

            // Close the popover before touching the form again - it overlays the holiday row.
            // Escape can land before reka-ui's dismiss listener attaches, so retry until it is gone
            await pollUntil(
                async () => {
                    await page.keyboard.press('Escape')
                    return await seasonPicker.count()
                },
                (count) => count === 0,
                5
            )

            // WHEN: Add holiday period
            await page.locator('[name="holidayRangeList"] input[name="start"]').fill(holidayStart)
            await page.locator('[name="holidayRangeList"] input[name="end"]').fill(holidayEnd)
            await page.getByTestId('holiday-range-add').click()

            // THEN: Holiday appears in list (use pollUntil for reliable visibility check)
            await pollUntil(
                async () => await page.locator('[name^="holidayRangeList-0"]').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page.locator('[name^="holidayRangeList-0"]')).toBeVisible()
            await expect(page.getByTestId('holiday-range-remove-0')).toBeVisible()

            // WHEN: Add a second holiday period starting BEFORE the first one
            const rowCountBefore = (await holidayRowStartDates(page)).length
            await page.locator('[name="holidayRangeList"] input[name="start"]').fill(earlierHolidayStart)
            await page.locator('[name="holidayRangeList"] input[name="end"]').fill(earlierHolidayEnd)
            await page.getByTestId('holiday-range-add').click()

            // THEN: The list is chronological (create mode may seed default holidays, so assert order, not indexes)
            const rowStartDates = await pollUntil(
                () => holidayRowStartDates(page),
                (starts) => starts.length > rowCountBefore
            )
            expect(rowStartDates.length).toBeGreaterThanOrEqual(2)
            expect(rowStartDates).toEqual(ascending(rowStartDates))

            // Submit and verify via API
            await page.getByTestId('submit-season').click()

            const createdSeason = await pollUntil(
                () => SeasonFactory.getAllSeasons(context).then(seasons =>
                    seasons.find(s => s.shortName?.includes(searchPattern))
                ),
                (season) => season !== undefined
            )

            expect(createdSeason).toBeDefined()
            if (createdSeason) {
                expect(createdSeason.holidays.length).toBeGreaterThanOrEqual(2)
                const savedStartDates = createdSeason.holidays.map(holiday => holiday.start.getTime())
                expect(savedStartDates).toEqual(ascending(savedStartDates))
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

            // Navigate directly to season in edit mode (no need to test dropdown here)
            await page.goto(`${adminPlanningUrl}?season=${encodeURIComponent(season.shortName)}&mode=edit`)

            // WHEN: Wait for form and remove holiday
            await pollUntil(
                async () => await page.locator('form#seasonForm').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page).toHaveURL(/.*mode=edit/)
            await expect(page.locator('form#seasonForm')).toBeVisible()

            const holidayItem = page.locator('[name^="holidayRangeList-0"]')
            await pollUntil(
                async () => await holidayItem.isVisible(),
                (isVisible) => isVisible,
                10
            )

            const removeButton = page.getByTestId('holiday-range-remove-0')
            await removeButton.click()

            // THEN: Holiday removed from UI
            await pollUntil(
                async () => !(await holidayItem.isVisible()),
                (isNotVisible) => isNotVisible,
                10
            )
            await expect(holidayItem).not.toBeVisible()

            // Submit and verify via API
            await page.getByTestId('submit-season').click()
            await pollUntil(
                async () => /\bmode=view\b/.test(page.url()),
                (inViewMode) => inViewMode,
                10
            )
            await expect(page).toHaveURL(/.*mode=view/)

            const updatedSeason = await pollUntil(
                () => SeasonFactory.getSeason(context, season.id!),
                (season) => season.holidays.length === 0
            )
            expect(updatedSeason.holidays).toHaveLength(0)
        })

    test('GIVEN season with holiday WHEN editing the row dates THEN the saved season has the new range',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Season with one holiday, open in edit mode
            const {seasonStartDate, seasonEndDate, holidayPeriod} = generateUniqueSeasonDates()
            const season = await SeasonFactory.createSeason(context, {
                seasonDates: {start: seasonStartDate, end: seasonEndDate},
                holidays: [holidayPeriod]
            })
            createdSeasonIds.push(season.id!)

            await page.goto(`${adminPlanningUrl}?season=${encodeURIComponent(season.shortName)}&mode=edit`)
            await pollUntil(
                async () => await page.locator('form#seasonForm').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await waitForHydration(page)

            // WHEN: Extending the holiday by one day in the row picker
            const newHolidayEnd = addDays(holidayPeriod.end, 1)
            await page.locator('[name="holidayRangeList-0"] input[name="end"]').fill(formatDate(newHolidayEnd))
            await page.getByTestId('submit-season').click()

            // THEN: The saved season carries the edited range
            const updatedSeason = await pollUntil(
                () => SeasonFactory.getSeason(context, season.id!),
                (saved) => saved.holidays[0]?.end.getTime() === newHolidayEnd.getTime()
            )
            expect(updatedSeason.holidays).toHaveLength(1)
            expect(updatedSeason.holidays[0]!.end.getTime()).toBe(newHolidayEnd.getTime())
        })
})
