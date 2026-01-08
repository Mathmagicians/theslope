import {test, expect} from '@playwright/test'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import testHelpers from '../testHelpers'
import {formatDate} from '~/utils/date'
import {addDays} from 'date-fns/addDays'

const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, doScreenshot} = testHelpers

/**
 * E2E UI Tests for Dinner Page URL-Based Navigation
 *
 * Tests dinner event display, URL navigation, and calendar interaction
 * Uses singleton active season (global setup)
 * Uses member context (non-admin) for UI navigation
 */
test.describe('Dinner Page URL Navigation', () => {
    const dinnerPageUrl = '/dinner'
    let testData: {
        events: Array<{id: number, date: Date, menuTitle: string}>,
        dates: {
            first: string,
            second: string,
            third: string
        }
    }

    test.beforeAll(async ({browser}) => {
        // Admin context for singleton season setup
        const adminContext = await validatedBrowserContext(browser)

        // Use singleton active season (factory provides it with dinner events already created)
        const season = await SeasonFactory.createActiveSeason(adminContext)

        // Poll for FUTURE dinner events - UI auto-syncs to next future dinner, not past events
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const events = await pollUntil(
            async () => {
                const allEvents = await DinnerEventFactory.getDinnerEventsForSeason(adminContext, season.id!)
                const futureEvents = allEvents
                    .filter(e => new Date(e.date) >= today)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                return futureEvents.slice(0, 3)
            },
            (events) => events.length >= 3,
            5
        )

        // Validate we have at least 3 events for testing (fail fast if not)
        expect(events.length, 'Singleton season should provide at least 3 dinner events for testing').toBeGreaterThanOrEqual(3)

        testData = {
            events: events,
            dates: {
                first: formatDate(events[0]!.date),
                second: formatDate(events[1]!.date),
                third: formatDate(events[2]!.date)
            }
        }
    })

    // NOTE: Do NOT cleanup singleton season here - global teardown handles it (ADR-003)
    // Individual test afterAll hooks must not delete singleton test data

    test('GIVEN no date in URL WHEN page loads THEN auto-syncs to next dinner date and displays event', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()

        // WHEN: Navigate to dinner page without date parameter
        await page.goto(dinnerPageUrl)

        // THEN: URL should auto-sync to a valid dinner date (component calculates "next" at runtime)
        await pollUntil(
            async () => page.url(),
            (url) => {
                const urlObj = new URL(url)
                const dateParam = urlObj.searchParams.get('date')
                return dateParam === testData.dates.first || dateParam === testData.dates.second || dateParam === testData.dates.third
            },
            10
        )

        // Wait for dinner detail panel to load (always present when event is displayed)
        await pollUntil(
            async () => {
                const panel = page.getByTestId('dinner-detail-panel')
                return await panel.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // THEN: Dinner event panel should be displayed
        const panel = page.getByTestId('dinner-detail-panel')
        await expect(panel, 'Dinner detail panel should be visible').toBeVisible()

        // Documentation screenshot: Dinner calendar overview
        await doScreenshot(page, 'dinner/dinner-calendar', true)
    })

    test('GIVEN invalid date in URL WHEN page loads THEN auto-syncs and displays valid dinner event', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()

        // WHEN: Navigate with invalid date parameter
        await page.goto(`${dinnerPageUrl}?date=99/99/9999`)

        // THEN: URL should auto-sync to a valid dinner date
        await pollUntil(
            async () => page.url(),
            (url) => {
                const urlObj = new URL(url)
                const dateParam = urlObj.searchParams.get('date')
                return dateParam === testData.dates.first || dateParam === testData.dates.second || dateParam === testData.dates.third
            },
            10
        )

        // Wait for dinner detail panel to load
        await pollUntil(
            async () => {
                const panel = page.getByTestId('dinner-detail-panel')
                return await panel.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // THEN: Dinner event should be displayed
        const panel = page.getByTestId('dinner-detail-panel')
        await expect(panel, 'Dinner detail panel should be visible after auto-sync').toBeVisible()
    })

    test('GIVEN valid date in URL WHEN page loads THEN displays correct dinner event with all details', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()
        const secondEventDate = testData.dates.second

        // WHEN: Navigate directly to second event's date (bypassing "next dinner" logic)
        await page.goto(`${dinnerPageUrl}?date=${secondEventDate}`)

        // Wait for dinner detail panel to load
        await pollUntil(
            async () => {
                const panel = page.getByTestId('dinner-detail-panel')
                return await panel.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        await doScreenshot(page, `dinner-second-event-date-${secondEventDate.replace(/\//g, '-')}`)

        // THEN: URL should stay on the selected date (not redirect to "next dinner")
        const currentUrl = page.url()
        const urlObj = new URL(currentUrl)
        const dateParam = urlObj.searchParams.get('date')
        expect(dateParam, `URL should stay on explicitly requested date ${secondEventDate}`).toBe(secondEventDate)

        // THEN: Dinner event panel should be displayed with correct date
        const panel = page.getByTestId('dinner-detail-panel')
        await expect(panel, `Dinner detail panel should be visible for ${secondEventDate}`).toBeVisible()

        // Verify the panel contains the expected date (rendered via DinnerDetailHeader inside)
        const panelText = await panel.textContent()
        expect(panelText, `Panel should contain the date ${secondEventDate}`).toContain(secondEventDate)
    })

    test('GIVEN date without dinner event WHEN page loads THEN auto-syncs to nearest dinner event', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()

        // GIVEN: Date within season but without dinner event
        const noDinnerDate = formatDate(addDays(new Date(), 10))

        // WHEN: Navigate with date that has no dinner event
        await page.goto(`${dinnerPageUrl}?date=${noDinnerDate}`)

        // THEN: URL should auto-sync to one of the valid dinner dates
        await pollUntil(
            async () => page.url(),
            (url) => {
                const urlObj = new URL(url)
                const dateParam = urlObj.searchParams.get('date')
                return dateParam === testData.dates.first || dateParam === testData.dates.second || dateParam === testData.dates.third
            },
            10
        )

        // Wait for dinner detail panel to load
        await pollUntil(
            async () => {
                const panel = page.getByTestId('dinner-detail-panel')
                return await panel.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // THEN: Synced dinner event should be displayed
        const panel = page.getByTestId('dinner-detail-panel')
        await expect(panel, 'Dinner detail panel should be visible after sync to nearest event').toBeVisible()
    })

    test('GIVEN dinner page loaded WHEN clicking calendar date THEN displays selected dinner event', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()
        const event2 = testData.events[1]!

        // GIVEN: Load page with first event's date
        await page.goto(`${dinnerPageUrl}?date=${testData.dates.first}`)

        // Wait for dinner detail panel to be visible (confirms first event is loaded)
        await pollUntil(
            async () => {
                const panel = page.getByTestId('dinner-detail-panel')
                return await panel.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // Verify first event's date is in URL
        const currentUrl = page.url()
        expect(new URL(currentUrl).searchParams.get('date'), "Should initially show first date").toBe(testData.dates.first)

        // WHEN: Click on second event's date in the calendar (calculate day from date)
        const event2Day = event2.date.getDate()
        const day2Button = page.getByTestId(`calendar-dinner-date-${event2Day}`)
        await day2Button.click({force: true})

        // THEN: URL should update to second event's date
        await pollUntil(
            async () => page.url(),
            (url) => new URL(url).searchParams.get('date') === testData.dates.second,
            10
        )

        // THEN: Panel should update to show second event's date
        const panel = page.getByTestId('dinner-detail-panel')
        await pollUntil(
            async () => await panel.textContent(),
            (text) => text?.includes(testData.dates.second) || false,
            10
        )

        const panelText = await panel.textContent()
        expect(panelText, "Panel should now show second event date").toContain(testData.dates.second)
    })
})
