import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import testHelpers from '../testHelpers'
import {formatDate} from '~/utils/date'
import {addDays} from 'date-fns/addDays'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot} = testHelpers

/**
 * E2E UI Tests for Dinner Page URL-Based Navigation
 *
 * Tests dinner event display, URL navigation, and calendar interaction
 * Uses singleton active season (global setup)
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

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Use singleton active season (factory provides it with dinner events already created)
        const season = await SeasonFactory.createActiveSeason(context)

        // Poll for dinner events - another worker might still be creating them
        const events = await pollUntil(
            async () => {
                const allEvents = await DinnerEventFactory.getDinnerEventsForSeason(context, season.id!)
                const sortedEvents = allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                return sortedEvents.slice(0, 3)
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

    test('GIVEN no date in URL WHEN page loads THEN auto-syncs to next dinner date and displays event', async ({page}) => {
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

        // Wait for dinner data to load
        await pollUntil(
            async () => {
                const menuTitle = page.getByTestId('dinner-menu-title')
                return await menuTitle.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // THEN: A dinner event should be displayed
        const menuTitle = page.getByTestId('dinner-menu-title')
        await expect(menuTitle, 'Menu title should be visible').toBeVisible()

        const menuContent = await menuTitle.textContent()
        expect(menuContent, 'Should display a singleton test menu').toContain('Singleton Test Menu')
    })

    test('GIVEN invalid date in URL WHEN page loads THEN auto-syncs and displays valid dinner event', async ({page}) => {
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

        // Wait for dinner data to load
        await pollUntil(
            async () => {
                const menuTitle = page.getByTestId('dinner-menu-title')
                return await menuTitle.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // THEN: A dinner event should be displayed
        const menuTitle = page.getByTestId('dinner-menu-title')
        await expect(menuTitle, 'Menu title should be visible after auto-sync').toBeVisible()

        const menuContent = await menuTitle.textContent()
        expect(menuContent, 'Should display a singleton test menu').toContain('Singleton Test Menu')
    })

    test('GIVEN valid date in URL WHEN page loads THEN displays correct dinner event with all details', async ({page}) => {
        const secondEvent = testData.events[1]!
        const secondEventDate = testData.dates.second

        // WHEN: Navigate directly to second event's date (bypassing "next dinner" logic)
        await page.goto(`${dinnerPageUrl}?date=${secondEventDate}`)

        // Wait for dinner data to load - check for menu title to become visible
        await pollUntil(
            async () => {
                const menuTitle = page.getByTestId('dinner-menu-title')
                return await menuTitle.isVisible().catch(() => false)
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

        // THEN: Second event should be displayed (the one we navigated to)
        const menuTitle = page.getByTestId('dinner-menu-title')
        await expect(menuTitle, `Menu title should be visible for ${secondEventDate}`).toBeVisible()

        const titleText = await menuTitle.textContent()
        expect(titleText, `Should display second event "${secondEvent.menuTitle}" when navigating to ${secondEventDate}`).toContain(secondEvent.menuTitle)

        // THEN: Menu description should be visible (if event has a description)
        const menuDescription = page.getByTestId('dinner-menu-description')
        // Menu description is conditional (v-if), so we check if it exists for this event
        const descriptionVisible = await menuDescription.isVisible().catch(() => false)
        if (descriptionVisible) {
            await expect(menuDescription, 'Menu description should be visible when present').toBeVisible()
        }
    })

    test('GIVEN date without dinner event WHEN page loads THEN auto-syncs to nearest dinner event', async ({page}) => {
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

        // Wait for dinner data to load
        await pollUntil(
            async () => {
                const menuTitle = page.getByTestId('dinner-menu-title')
                return await menuTitle.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )

        // THEN: Synced dinner event should be displayed
        const menuTitle = page.getByTestId('dinner-menu-title')
        await expect(menuTitle, 'Menu title should be visible after sync to nearest event').toBeVisible()
    })

    test('GIVEN dinner page loaded WHEN clicking calendar date THEN displays selected dinner event', async ({page}) => {
        const event1 = testData.events[0]!
        const event2 = testData.events[1]!

        // GIVEN: Load page with first event's date
        await page.goto(`${dinnerPageUrl}?date=${testData.dates.first}`)

        // Wait for calendar to be visible
        await pollUntil(
            async () => page.locator('h3:text("Fællesspisningens kalender")').isVisible(),
            (isVisible) => isVisible,
            10
        )

        // Verify first event is displayed
        let menuTitle = page.getByTestId('dinner-menu-title')
        let titleText = await menuTitle.textContent()
        expect(titleText, "Should initially show first event").toContain(event1.menuTitle)

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

        // THEN: Second event should be displayed
        menuTitle = page.getByTestId('dinner-menu-title')
        await pollUntil(
            async () => await menuTitle.textContent(),
            (text) => text?.includes(event2.menuTitle) || false,
            10
        )

        titleText = await menuTitle.textContent()
        expect(titleText, "Should now show second event").toContain(event2.menuTitle)
    })
})
