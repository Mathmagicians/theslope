import {test, expect, type BrowserContext} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import testHelpers from '../testHelpers'
import {formatDate} from '~/utils/date'
import {addDays} from 'date-fns/addDays'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, salt, doScreenshot} = testHelpers
const {createDefaultWeekdayMap} = useWeekDayMapValidation()

/**
 * E2E UI Tests for Dinner Page URL-Based Navigation
 *
 * Tests the useQueryParam auto-sync functionality and manual date selection
 * via URL query parameters (?date=DD/MM/YYYY)
 */
test.describe('Dinner Page URL Navigation', () => {
    const dinnerPageUrl = '/dinner'

    test.use({storageState: adminUIFile})

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Cleanup active season singleton (dinner events cascade delete - ADR-005)
        await SeasonFactory.cleanupActiveSeason(context)
    })

    /**
     * Setup helper: Creates a season with multiple dinner events
     * Returns dates for testing URL navigation
     */
    const setupSeasonWithDinnerEvents = async (context: BrowserContext) => {
        const testSalt = salt('') // Use helper's temporaryAndRandom for parallel safety

        // Create active season (singleton pattern)
        const today = new Date()
        const tomorrow = addDays(today, 1)
        const dayAfter = addDays(today, 2)
        const seasonEnd = addDays(today, 7)

        const season = await SeasonFactory.createActiveSeason(context, {
            seasonDates: {start: today, end: seasonEnd},
            cookingDays: createDefaultWeekdayMap([true, true, true, true, true, true, true]) // All days enabled
        })

        // Create 3 dinner events using factory
        const event1 = await DinnerEventFactory.createDinnerEvent(context, {
            seasonId: season.id,
            date: today,
            menuTitle: salt('Menu Today', testSalt)
        })
        const event2 = await DinnerEventFactory.createDinnerEvent(context, {
            seasonId: season.id,
            date: tomorrow,
            menuTitle: salt('Menu Tomorrow', testSalt)
        })
        const event3 = await DinnerEventFactory.createDinnerEvent(context, {
            seasonId: season.id,
            date: dayAfter,
            menuTitle: salt('Menu Day After', testSalt)
        })

        return {
            season,
            events: [event1, event2, event3],
            dates: {
                today: formatDate(today),
                tomorrow: formatDate(tomorrow),
                dayAfter: formatDate(dayAfter)
            }
        }
    }

    test('GIVEN no date in URL WHEN page loads THEN auto-syncs to next dinner date', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with dinner events
        const {dates} = await setupSeasonWithDinnerEvents(context)

        // WHEN: Navigate to dinner page without date parameter
        await page.goto(dinnerPageUrl)
        await doScreenshot(page, 'dinner-page-no-date')

        // THEN: URL should auto-sync to a valid dinner date (today, tomorrow, or day after)
        await pollUntil(
            async () => page.url(),
            (url) => {
                const urlObj = new URL(url)
                const dateParam = urlObj.searchParams.get('date')
                return dateParam === dates.today || dateParam === dates.tomorrow || dateParam === dates.dayAfter
            },
            10,
            500
        )

        // Verify URL has date parameter
        const currentUrl = new URL(page.url())
        const dateParam = currentUrl.searchParams.get('date')
        expect(dateParam).toBeTruthy()
        expect([dates.today, dates.tomorrow, dates.dayAfter]).toContain(dateParam)
    })

    test('GIVEN invalid date in URL WHEN page loads THEN auto-syncs to valid dinner date', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with dinner events
        const {dates} = await setupSeasonWithDinnerEvents(context)

        // WHEN: Navigate with invalid date parameter
        await page.goto(`${dinnerPageUrl}?date=99/99/9999`)

        // THEN: URL should auto-sync to a valid dinner date
        await pollUntil(
            async () => page.url(),
            (url) => {
                const urlObj = new URL(url)
                const dateParam = urlObj.searchParams.get('date')
                return dateParam === dates.today || dateParam === dates.tomorrow || dateParam === dates.dayAfter
            },
            10,
            500
        )

        const currentUrl = new URL(page.url())
        const dateParam = currentUrl.searchParams.get('date')
        expect([dates.today, dates.tomorrow, dates.dayAfter]).toContain(dateParam)
    })

    test('GIVEN valid date in URL WHEN page loads THEN shows dinner for that date', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with dinner events
        const {dates} = await setupSeasonWithDinnerEvents(context)

        // WHEN: Navigate directly to tomorrow's dinner
        await page.goto(`${dinnerPageUrl}?date=${dates.tomorrow}`)
        await doScreenshot(page, 'dinner-valid-date-loaded')

        // THEN: URL should stay on the selected date
        await pollUntil(
            async () => page.url(),
            (url) => {
                const urlObj = new URL(url)
                return urlObj.searchParams.get('date') === dates.tomorrow
            },
            10,
            500
        )

        // Verify menu content loaded (any non-empty title)
        const menuTitle = page.getByTestId('dinner-menu-title')
        await pollUntil(
            async () => await menuTitle.textContent(),
            (text) => text?.length > 0
        )
    })

    test('GIVEN date in URL not matching dinner event WHEN page loads THEN auto-syncs to valid date', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with dinner events
        const {dates} = await setupSeasonWithDinnerEvents(context)

        // Create a date that's within the season but has no dinner event
        const noDinnerDate = formatDate(addDays(new Date(), 10))

        // WHEN: Navigate with date that has no dinner event
        await page.goto(`${dinnerPageUrl}?date=${noDinnerDate}`)

        // THEN: URL should auto-sync to a valid dinner date
        await pollUntil(
            async () => page.url(),
            (url) => {
                const urlObj = new URL(url)
                const dateParam = urlObj.searchParams.get('date')
                return dateParam === dates.today || dateParam === dates.tomorrow || dateParam === dates.dayAfter
            },
            10,
            500
        )

        const currentUrl = new URL(page.url())
        const dateParam = currentUrl.searchParams.get('date')
        expect([dates.today, dates.tomorrow, dates.dayAfter]).toContain(dateParam)
    })

    test('GIVEN page loaded WHEN clicking different date in calendar THEN URL updates and shows new dinner', async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)

        // GIVEN: Create season with dinner events and load page with today's date
        const {dates} = await setupSeasonWithDinnerEvents(context)
        await page.goto(`${dinnerPageUrl}?date=${dates.today}`)

        // Wait for calendar header to be visible
        await pollUntil(
            async () => page.locator('h3:text("Fællesspisningens kalender")').isVisible(),
            (isVisible) => isVisible
        )

        // WHEN: Click on tomorrow's date in the calendar using data-testid
        const tomorrow = addDays(new Date(), 1)
        const tomorrowDay = tomorrow.getDate()

        await doScreenshot(page, 'dinner-before-calendar-click')
        const tomorrowButton = page.getByTestId(`calendar-dinner-date-${tomorrowDay}`)
        // Force click to handle accordion being collapsed on mobile
        await tomorrowButton.click({force: true})
        await doScreenshot(page, 'dinner-after-calendar-click')

        // THEN: URL should update to tomorrow's date
        await pollUntil(
            async () => page.url(),
            (url) => {
                const urlObj = new URL(url)
                return urlObj.searchParams.get('date') === dates.tomorrow
            }
        )

        // Verify menu content loaded (any non-empty title)
        const menuTitle = page.getByTestId('dinner-menu-title')
        await pollUntil(
            async () => await menuTitle.textContent(),
            (text) => text?.length > 0
        )
    })
})
