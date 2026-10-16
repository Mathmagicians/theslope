import {test, expect, type Page} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import testHelpers from '../testHelpers'
import {formatDate} from '~/utils/date'
import {addDays} from 'date-fns/addDays'
import {useSeasonValidation} from '~/composables/useSeasonValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, gotoHydrated, fillDateField, readDateField, waitForApi} = testHelpers
const {SeasonSchema} = useSeasonValidation()

/** Submits the season form and returns the season the create request saved; attach before the click lands */
const submitNewSeason = async (page: Page, createdSeasonIds: number[]) => {
    const saved = waitForApi(page, '/api/admin/season', 'PUT')
    await page.getByTestId('submit-season').click()
    const response = await saved
    const season = SeasonSchema.parse(await response.json())
    createdSeasonIds.push(season.id!)
    expect(response.status()).toBe(201)
    return season
}

/**
 * Start dates (as timestamps) of the holiday rows, in DOM order.
 * The picker names both its wrapper and the field it injects into, so the locators pin the wrapper (`div[name=…]`).
 * Editable rows are CalendarDateRangePickers named `holidayRangeList-<index>`, each with
 * typed `start` / `end` date-segment fields.
 */
const holidayRowStartDates = async (page: Page): Promise<number[]> => {
    const rows = await page.locator('div[name^="holidayRangeList-"]').all()
    const rowDates = await Promise.all(rows.map(row => readDateField(row, 'start')))
    return rowDates.map(date => date.getTime())
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

    test('GIVEN user in create mode WHEN filling and submitting form THEN season is created AND dinner events are generated',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Navigate to create mode
            await gotoHydrated(page, `${adminPlanningUrl}?mode=create`)
            await pollUntil(
                async () => await page.locator('form#seasonForm').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page.locator('form#seasonForm')).toBeVisible()

            // WHEN: Fill and submit form
            const {seasonDates} = SeasonFactory.generateUniqueSeasonDates()
            await fillDateField(page.locator('[name="seasonDates"]'), 'start', formatDate(seasonDates.start))
            await fillDateField(page.locator('[name="seasonDates"]'), 'end', formatDate(seasonDates.end))
            const createdSeason = await submitNewSeason(page, createdSeasonIds)

            // THEN: Switches to view mode
            // (the DOM after the save is covered by AdminPlanning.e2e: pencil -> Annuller -> pencil)
            await expect(page).toHaveURL(/.*mode=view/)

            // Verify dinner events auto-generated
            const expectedEventCount = SeasonFactory.calculateExpectedEventCount(createdSeason)
            const dinnerEvents = await DinnerEventFactory.waitForDinnerEventsGeneration(
                context,
                createdSeason.id!,
                expectedEventCount
            )
            expect(dinnerEvents.length).toBe(expectedEventCount)
        })

    test('GIVEN user in create mode WHEN adding holiday period THEN holiday is added to list',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Navigate to create mode
            await gotoHydrated(page, `${adminPlanningUrl}?mode=create`)
            await pollUntil(
                async () => await page.locator('form#seasonForm').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page.locator('form#seasonForm')).toBeVisible()

            const {seasonDates, holiday} = SeasonFactory.generateUniqueSeasonDates()
            // The second holiday is the season's first day, before the first holiday - no overlap
            const earlierHoliday = {start: seasonDates.start, end: seasonDates.start}
            await fillDateField(page.locator('[name="seasonDates"]'), 'start', formatDate(seasonDates.start))
            await fillDateField(page.locator('[name="seasonDates"]'), 'end', formatDate(seasonDates.end))

            // THEN: the season picker grid never renders a date twice - adjacent-month days
            // are disabled and hidden by the shared COMPONENTS.calendarGrid token
            // Scope to the picker popover - the page also renders the season preview calendar.
            // Hidden leading cells are not addressable, so count only the :visible ones
            const seasonPicker = page.getByRole('dialog')
            const visibleDayCells = seasonPicker.locator('[data-slot="cellTrigger"]:visible')
            await page.locator('[name="seasonDates"]').getByRole('button', {name: /Åbn kalender/}).first().click()
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
            await fillDateField(page.locator('div[name="holidayRangeList"]'), 'start', formatDate(holiday.start))
            await fillDateField(page.locator('div[name="holidayRangeList"]'), 'end', formatDate(holiday.end))
            await page.getByTestId('holiday-range-add').click()

            // THEN: Holiday appears in list (use pollUntil for reliable visibility check)
            await pollUntil(
                async () => await page.locator('div[name^="holidayRangeList-0"]').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page.locator('div[name^="holidayRangeList-0"]')).toBeVisible()
            await expect(page.getByTestId('holiday-range-remove-0')).toBeVisible()

            // WHEN: Add a second holiday period starting BEFORE the first one
            const rowCountBefore = (await holidayRowStartDates(page)).length
            await fillDateField(page.locator('div[name="holidayRangeList"]'), 'start', formatDate(earlierHoliday.start))
            await fillDateField(page.locator('div[name="holidayRangeList"]'), 'end', formatDate(earlierHoliday.end))
            await page.getByTestId('holiday-range-add').click()

            // THEN: The list is chronological (create mode may seed default holidays, so assert order, not indexes)
            const rowStartDates = await pollUntil(
                () => holidayRowStartDates(page),
                (starts) => starts.length > rowCountBefore
            )
            expect(rowStartDates.length).toBeGreaterThanOrEqual(2)
            expect(rowStartDates).toEqual(ascending(rowStartDates))

            // Submit and verify via API
            const createdSeason = await submitNewSeason(page, createdSeasonIds)
            const savedSeason = await SeasonFactory.getSeason(context, createdSeason.id!)

            expect(savedSeason.holidays.length).toBeGreaterThanOrEqual(2)
            const savedStartDates = savedSeason.holidays.map(holiday => holiday.start.getTime())
            expect(savedStartDates).toEqual(ascending(savedStartDates))
        })

    test('GIVEN season with holiday WHEN removing holiday via UI THEN holiday is removed from list',
        async ({page, browser}) => {
            const context = await validatedBrowserContext(browser)

            // GIVEN: Create season with holiday
            const {seasonDates, holiday} = SeasonFactory.generateUniqueSeasonDates()
            const season = await SeasonFactory.createSeason(context, {seasonDates, holidays: [holiday]})
            createdSeasonIds.push(season.id!)

            // Navigate directly to season in edit mode (no need to test dropdown here)
            await gotoHydrated(page, `${adminPlanningUrl}?season=${encodeURIComponent(season.shortName)}&mode=edit`)

            // WHEN: Wait for form and remove holiday
            await pollUntil(
                async () => await page.locator('form#seasonForm').isVisible(),
                (isVisible) => isVisible,
                10
            )
            await expect(page).toHaveURL(/.*mode=edit/)
            await expect(page.locator('form#seasonForm')).toBeVisible()
            await expect(page.getByTestId('season-selector')).toContainText(season.shortName)
            await expect(page.getByTestId('submit-season')).toHaveText(/Gem/)

            const holidayItem = page.locator('div[name^="holidayRangeList-0"]')
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
            const {seasonDates, holiday} = SeasonFactory.generateUniqueSeasonDates()
            const season = await SeasonFactory.createSeason(context, {seasonDates, holidays: [holiday]})
            createdSeasonIds.push(season.id!)

            await gotoHydrated(page, `${adminPlanningUrl}?season=${encodeURIComponent(season.shortName)}&mode=edit`)
            await pollUntil(
                async () => await page.locator('form#seasonForm').isVisible(),
                (isVisible) => isVisible,
                10
            )

            // WHEN: Extending the holiday by one day in the row picker. Inside the season, not on its last day: the
            // picker commits UTC midnight like the Workers server, while the local dev server returns local midnight
            const newHolidayEnd = addDays(holiday.end, 1)
            await fillDateField(page.locator('div[name="holidayRangeList-0"]'), 'end', formatDate(newHolidayEnd))
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
