import {test, expect, type Page} from '~~/tests/e2e/uiTest'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import {AllergyFactory} from '../testDataFactories/allergyFactory'
import {OrderFactory} from '../testDataFactories/orderFactory'
import testHelpers from '../testHelpers'
import {formatDate} from '~/utils/date'
import {dateToWeekDay} from '~/utils/season'
import {addDays} from 'date-fns/addDays'
import {isSameDay} from 'date-fns'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTicket} from '~/composables/useTicket'

const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, doScreenshot, expectHydratedWithoutMismatch, getSessionUserInfo, gotoHydrated, salt, temporaryAndRandom, waitForApi, pageCalendarToMonth} = testHelpers
const {DinnerModeSchema, TicketTypeSchema} = useBookingValidation()
const {findTicketPriceByType} = useTicket()

/**
 * E2E UI Tests for Dinner Page URL-Based Navigation
 *
 * Tests dinner event display, URL navigation, and calendar interaction
 * Uses singleton active season (global setup)
 * Uses member context (non-admin) for UI navigation
 */
test.describe('Dinner Page URL Navigation', () => {
    const dinnerPageUrl = '/dinner'
    let seasonId: number
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
        seasonId = season.id!

        // Poll for FUTURE dinner events - UI auto-syncs to next future dinner, not past events.
        // The season's own dinners only: parallel specs add and remove dinners on its free days (createDinnerEventOnFreeDay),
        // and a chef spec's team cooks on its cooking days; the page shows the first dinner of a day
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const events = await pollUntil(
            async () => {
                const allEvents = await DinnerEventFactory.getDinnerEventsForSeason(adminContext, season.id!)
                const futureEvents = allEvents
                    .filter(e => new Date(e.date) >= today && season.cookingDays[dateToWeekDay(new Date(e.date))])
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .filter((e, index, sorted) => index === 0 || !isSameDay(new Date(e.date), new Date(sorted[index - 1]!.date)))
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

    // The URL names one of the season's first three future dinners
    const onOneOfTheFirstDates = (url: URL) =>
        [testData.dates.first, testData.dates.second, testData.dates.third].includes(url.searchParams.get('date') ?? '')

    test('GIVEN no date in URL WHEN page loads THEN auto-syncs to next dinner date and displays event', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()

        // WHEN: Navigate to dinner page without date parameter
        await gotoHydrated(page, dinnerPageUrl)

        // THEN: URL should auto-sync to a valid dinner date (component calculates "next" at runtime);
        // checked against the season's dinners now, since a parallel spec's dinner may be the next one
        await expect(page).toHaveURL(url => url.searchParams.has('date'))
        const syncedDate = new URL(page.url()).searchParams.get('date')
        const dinners = await DinnerEventFactory.getDinnerEventsForSeason(await validatedBrowserContext(browser), seasonId)
        expect(dinners.map(dinner => formatDate(dinner.date)), 'the synced date is one of the season\'s dinners').toContain(syncedDate)

        // THEN: Dinner event panel should be displayed (always present when event is displayed)
        const panel = page.getByTestId('dinner-detail-panel')
        await expect(panel, 'Dinner detail panel should be visible').toBeVisible()
    })

    test('GIVEN invalid date in URL WHEN page loads THEN auto-syncs and displays valid dinner event', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()

        // WHEN: Navigate with invalid date parameter
        await gotoHydrated(page, `${dinnerPageUrl}?date=99/99/9999`)

        // THEN: URL should auto-sync to a valid dinner date
        await expect(page).toHaveURL(onOneOfTheFirstDates)

        // THEN: Dinner event should be displayed
        const panel = page.getByTestId('dinner-detail-panel')
        await expect(panel, 'Dinner detail panel should be visible after auto-sync').toBeVisible()
    })

    test('GIVEN a dinner date in the URL WHEN the page loads THEN the client hydrates the server-rendered dinner without a mismatch', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()
        await expectHydratedWithoutMismatch(page, `${dinnerPageUrl}?date=${testData.dates.second}`)

        await expect(page.getByTestId('dinner-detail-panel')).toContainText(testData.dates.second)
        // THEN: URL should stay on the selected date (not redirect to "next dinner")
        expect(new URL(page.url()).searchParams.get('date'), `URL should stay on explicitly requested date ${testData.dates.second}`).toBe(testData.dates.second)
    })

    test('GIVEN date without dinner event WHEN page loads THEN auto-syncs to nearest dinner event', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()

        // GIVEN: Date within season but without dinner event
        const noDinnerDate = formatDate(addDays(new Date(), 10))

        // WHEN: Navigate with date that has no dinner event
        await gotoHydrated(page, `${dinnerPageUrl}?date=${noDinnerDate}`)

        // THEN: URL should auto-sync to one of the valid dinner dates
        await expect(page).toHaveURL(onOneOfTheFirstDates)

        // THEN: Synced dinner event should be displayed
        const panel = page.getByTestId('dinner-detail-panel')
        await expect(panel, 'Dinner detail panel should be visible after sync to nearest event').toBeVisible()
    })

    test('GIVEN dinner page loaded WHEN clicking calendar date THEN displays selected dinner event', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        const page = await context.newPage()
        const event2 = testData.events[1]!

        // GIVEN: Load page with first event's date
        await gotoHydrated(page, `${dinnerPageUrl}?date=${testData.dates.first}`)

        // Wait for dinner detail panel to be visible (confirms first event is loaded)
        const panel = page.getByTestId('dinner-detail-panel')
        await expect(panel).toBeVisible()

        // Verify first event's date is in URL
        const currentUrl = page.url()
        expect(new URL(currentUrl).searchParams.get('date'), "Should initially show first date").toBe(testData.dates.first)

        // WHEN: Click on second event's date in the calendar, a month on when the two dinners straddle a month's end
        await pageCalendarToMonth(page, testData.events[0]!.date, event2.date)
        const event2Day = event2.date.getDate()
        const day2Button = page.getByTestId(`calendar-dinner-date-${event2Day}`)
        // The panel fills from the selected dinner's detail, fetched on the click
        const event2Loaded = waitForApi(page, `/api/admin/dinner-event/${event2.id}`, 'GET')
        await day2Button.click({force: true})

        // THEN: URL should update to second event's date
        await expect(page).toHaveURL(url => url.searchParams.get('date') === testData.dates.second)

        // THEN: Panel should update to show second event's date
        await event2Loaded
        await expect(panel, "Panel should now show second event date").toContainText(testData.dates.second)
    })

    test.describe('Ticket allergies', () => {
        const testSalt = temporaryAndRandom()
        const createdInhabitantIds: number[] = []
        const createdAllergyTypeIds: number[] = []
        let allergicId: number
        let notAllergicId: number
        let allergyType: Awaited<ReturnType<typeof AllergyFactory.createAllergyType>>
        let dinnerDate: string

        test.beforeAll(async ({browser}) => {
            const adminContext = await validatedBrowserContext(browser)
            const memberContext = await memberValidatedBrowserContext(browser)
            const {householdId} = await getSessionUserInfo(memberContext)
            const season = await SeasonFactory.createActiveSeason(adminContext)
            const adultPrice = findTicketPriceByType(TicketTypeSchema.enum.ADULT, season.ticketPrices)!
            // The second future dinner: the first may be today and already past its serving time
            const dinnerEvent = testData.events[1]!
            dinnerDate = testData.dates.second

            const adultBirthDate = addDays(new Date(), -30 * 365)
            const [allergic, notAllergic] = await Promise.all(['Allergic', 'Not Allergic'].map(async lastName => {
                const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
                    name: salt('Anders', testSalt), lastName, birthDate: adultBirthDate
                })
                createdInhabitantIds.push(inhabitant.id)
                return inhabitant
            }))
            allergicId = allergic!.id
            notAllergicId = notAllergic!.id

            allergyType = await AllergyFactory.createAllergyType(adminContext, AllergyFactory.defaultAllergyTypeData(testSalt))
            createdAllergyTypeIds.push(allergyType.id)
            await AllergyFactory.createAllergy(adminContext, {inhabitantId: allergicId, allergyTypeId: allergyType.id, inhabitantComment: null}, 201, true)

            await OrderFactory.createOrder(adminContext, {
                householdId,
                dinnerEventId: dinnerEvent.id,
                orders: [allergicId, notAllergicId].map(inhabitantId => ({
                    inhabitantId, ticketPriceId: adultPrice.id!, dinnerMode: DinnerModeSchema.enum.DINEIN, isGuestTicket: false
                }))
            })
        })

        test.afterAll(async ({browser}) => {
            const adminContext = await validatedBrowserContext(browser)
            // Deleting an inhabitant cascades its orders and allergies
            await Promise.all(createdInhabitantIds.map(id => HouseholdFactory.deleteInhabitant(adminContext, id)))
            await AllergyFactory.cleanupAllergyTypes(adminContext, createdAllergyTypeIds)
        })

        const bookingRow = (page: Page, inhabitantId: number) =>
            page.getByTestId('booking-table').locator('tr').filter({has: page.getByTestId(`inhabitant-${inhabitantId}-toggle`)})

        test('GIVEN a booked inhabitant with an allergy WHEN the dinner loads THEN the ticket shows the allergy glyph and the expanded row names the type', async ({browser}) => {
            const context = await memberValidatedBrowserContext(browser)
            const page = await context.newPage()

            await gotoHydrated(page, `${dinnerPageUrl}?date=${dinnerDate}`)
            await expect(page.getByTestId('booking-table')).toBeVisible()

            // THEN: the allergic inhabitant's ticket carries the glyph, the other's does not
            await expect(bookingRow(page, allergicId).getByTestId('ticket-allergy-icon').filter({visible: true})).toBeVisible()
            await expect(bookingRow(page, notAllergicId).getByTestId('ticket-allergy-icon')).toHaveCount(0)

            // WHEN: the allergic inhabitant's row expands THEN the allergies line names the type
            await page.getByTestId(`inhabitant-${allergicId}-toggle`).click()
            await expect(page.getByTestId(`inhabitant-${allergicId}-allergies`)).toContainText(allergyType.name)

            // WHEN: the other inhabitant's row expands THEN no allergies line shows
            await page.getByTestId(`inhabitant-${notAllergicId}-toggle`).click()
            await expect(page.getByTestId(`inhabitant-${notAllergicId}-mode-edit-${DinnerModeSchema.enum.DINEIN}`)).toBeVisible()
            await expect(page.getByTestId(`inhabitant-${notAllergicId}-allergies`)).toHaveCount(0)

            await doScreenshot(page, 'dinner/ticket-allergies', true)
        })
    })

    // The calendar's open default follows the viewport the layout measures after mount; a URL that names it keeps it
    test.describe('Calendar default', () => {
        const DESKTOP = {width: 1280, height: 900}
        const PHONE = {width: 375, height: 812}
        const calendarDays = (page: Page) => page.locator('[data-testid^="calendar-dinner-date-"]').first()

        for (const {face, viewport, expected} of [
            {face: 'desktop', viewport: DESKTOP, expected: 'open'},
            {face: 'phone', viewport: PHONE, expected: 'closed'}
        ]) {
            test(`GIVEN ${face} WHEN /dinner loads without parameters THEN the URL settles on cal=${expected}`, async ({browser}) => {
                const context = await memberValidatedBrowserContext(browser)
                const page = await context.newPage()
                await page.setViewportSize(viewport)

                await gotoHydrated(page, dinnerPageUrl)

                await expect.poll(() => new URL(page.url()).searchParams.get('cal')).toBe(expected)
                if (expected === 'open') await expect(calendarDays(page)).toBeVisible()
                else await expect(calendarDays(page)).toBeHidden()
            })
        }

        for (const {face, viewport, given} of [
            {face: 'desktop', viewport: DESKTOP, given: 'closed'},
            {face: 'phone', viewport: PHONE, given: 'open'}
        ]) {
            test(`GIVEN ${face} WHEN /dinner loads with cal=${given} THEN the URL keeps cal=${given}`, async ({browser}) => {
                const context = await memberValidatedBrowserContext(browser)
                const page = await context.newPage()
                await page.setViewportSize(viewport)

                await gotoHydrated(page, `${dinnerPageUrl}?date=${testData.dates.first}&cal=${given}`)

                if (given === 'open') await expect(calendarDays(page)).toBeVisible()
                else await expect(calendarDays(page)).toBeHidden()
                expect(new URL(page.url()).searchParams.get('cal')).toBe(given)
            })
        }
    })
})
