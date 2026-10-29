import {test, expect, type BrowserContext, type Page} from '~~/tests/e2e/uiTest'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {useBookingValidation, type ScaffoldOrdersResponse} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {formatDate} from '~/utils/date'
import {BookingViewSchema} from '~/composables/useBookingView'

const {memberUIFile, adminUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, doScreenshot, getSessionUserInfo, gotoHydrated, selectDropdownOption, temporaryAndRandom, salt, isScaffoldSave, isExpectedRead, expectApiError, PAST_THE_SCAFFOLD_WINDOW_DAYS} = testHelpers
const {DinnerModeSchema, OrderStateSchema, BookingActionSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum
const {createDefaultWeekdayMap: createDinnerModeWeekdayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.NONE
})

/**
 * E2E UI Tests for DinnerBookingForm
 *
 * SERIAL TEST: Creates its own active season with short deadline (ticketIsCancellableDaysBefore: 0)
 * to ensure booking is enabled for all dinner events.
 *
 * Tests user booking interactions:
 * - Single inhabitant mode change
 * - Power mode (family) change
 * - Guest ticket addition
 * - View switching (week/month)
 * - An expected row past the scaffold window cancelled with Ingen
 */
test.describe.serial('DinnerBookingForm - User Booking Interactions', () => {
    let householdId: number
    let inhabitantId: number
    let householdShortname: string
    let householdPbsId: number
    let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>
    let adminContext: BrowserContext
    const testSalt = temporaryAndRandom()
    const createdSeasonIds: number[] = []
    const createdInhabitantIds: number[] = []

    test.use({storageState: memberUIFile})

    test.beforeAll(async ({browser}) => {
        adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)

        // Get member's household info
        const sessionInfo = await getSessionUserInfo(memberContext)
        householdId = sessionInfo.householdId
        inhabitantId = sessionInfo.inhabitantId
        householdShortname = sessionInfo.householdShortname
        householdPbsId = sessionInfo.householdPbsId

        // Create dedicated season with SHORT deadline so all events are bookable
        testSeason = await SeasonFactory.createActiveSeasonFromTomorrow(adminContext, testSalt, {days: 14, deadline: 0})
        createdSeasonIds.push(testSeason.season.id!)

        // Verify dinner events were created
        expect(testSeason.dinnerEvents.length, 'Test season should have dinner events').toBeGreaterThan(0)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // The member's household stays; the spec's inhabitants go, with their orders. Cleanup accepts a 404
        await Promise.all(createdInhabitantIds.map(id => HouseholdFactory.deleteInhabitant(context, id)))
        // Cleanup accepts a season already gone (the admin case deletes its own)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    const getFutureDinnerEvent = async (eventIndex: number = 0) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(adminContext, testSeason.season.id!)
        const futureEvents = dinnerEvents
            .filter(e => new Date(e.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        expect(futureEvents.length).toBeGreaterThan(eventIndex)
        return {id: futureEvents[eventIndex]!.id, date: new Date(futureEvents[eventIndex]!.date)}
    }

    const goToBookingsPage = async (page: import('@playwright/test').Page, date: Date) => {
        const dateParam = formatDate(date)
        await gotoHydrated(page, `/household/${householdShortname}/bookings?pbs=${householdPbsId}&date=${dateParam}`)

        // Wait for booking table - past the transient "no season" state during store init
        await expect(page.getByTestId('booking-table')).toBeVisible()
    }

    test('GIVEN inhabitant row WHEN user changes mode to TAKEAWAY THEN order is updated', async ({page}) => {
        const testDinnerEvent = await getFutureDinnerEvent(0)
        await goToBookingsPage(page, testDinnerEvent.date)

        // Expand inhabitant row
        const toggleButton = page.getByTestId(`inhabitant-${inhabitantId}-toggle`)
        await expect(toggleButton).toBeVisible()
        await toggleButton.click()

        // Select TAKEAWAY
        const modeSelector = page.getByTestId(`inhabitant-${inhabitantId}-mode-edit-${DinnerMode.TAKEAWAY}`)
        await expect(modeSelector).toBeVisible()
        await modeSelector.click()

        // Save
        await page.getByTestId(`inhabitant-${inhabitantId}-save`).click()

        // Verify via API
        const orders = await pollUntil(
            async () => await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, testDinnerEvent.id),
            (orders) => orders.some(o => o.inhabitantId === inhabitantId && o.dinnerMode === DinnerMode.TAKEAWAY)
        )

        const order = orders.find(o => o.inhabitantId === inhabitantId)
        expect(order).toBeDefined()
        expect(order!.dinnerMode).toBe(DinnerMode.TAKEAWAY)
        expect(order!.state).toBe(OrderState.BOOKED)

        await doScreenshot(page, 'dinner/booking-form-after-save', true)
    })

    test('GIVEN power mode row WHEN user selects DINEIN THEN all inhabitants get orders', async ({page}) => {
        const testDinnerEvent = await getFutureDinnerEvent(1)

        const household = await HouseholdFactory.getHouseholdById(adminContext, householdId)
        const inhabitantCount = household?.inhabitants?.length ?? 0
        expect(inhabitantCount).toBeGreaterThan(0)

        // GIVEN: the household's orders on the dinner in TAKEAWAY - activating the season booked DINEIN for the
        // inhabitants without preferences, so only the save brings every order to DINEIN
        const householdOrdersOnDinner = async () => (await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, testDinnerEvent.id))
            .filter(o => o.inhabitant?.householdId === householdId && !o.isGuestTicket)
        for (const order of await householdOrdersOnDinner()) {
            await OrderFactory.updateOrder(adminContext, order.id, {dinnerMode: DinnerMode.TAKEAWAY}, 200, true)
        }
        expect((await householdOrdersOnDinner()).map(o => o.dinnerMode), 'no household order starts in DINEIN').not.toContain(DinnerMode.DINEIN)

        await goToBookingsPage(page, testDinnerEvent.date)

        // Expand power mode row
        const powerToggle = page.getByTestId('power-power-mode-toggle')
        await expect(powerToggle).toBeVisible()
        await powerToggle.click()

        // Select DINEIN
        const modeSelector = page.getByTestId(`power-power-mode-mode-edit-${DinnerMode.DINEIN}`)
        await expect(modeSelector).toBeVisible()
        await modeSelector.click()

        // Save
        await page.getByTestId('power-power-mode-save').click()

        // Verify via API
        const householdOrders = await pollUntil(
            householdOrdersOnDinner,
            (orders) => orders.length === inhabitantCount && orders.every(o => o.dinnerMode === DinnerMode.DINEIN)
        )

        expect(householdOrders).toHaveLength(inhabitantCount)
        householdOrders.forEach(o => {
            expect(o.dinnerMode).toBe(DinnerMode.DINEIN)
            expect(o.state).toBe(OrderState.BOOKED)
        })
    })

    test('GIVEN guest row WHEN user adds guest ticket THEN guest order is created', async ({page}) => {
        const testDinnerEvent = await getFutureDinnerEvent(2)
        await goToBookingsPage(page, testDinnerEvent.date)

        // Expand guest row
        const guestToggle = page.getByTestId('guest-add-guest-toggle')
        await expect(guestToggle).toBeVisible()
        await guestToggle.click()

        // Wait for guest form and select ticket type
        const ticketSelect = page.getByTestId('guest-ticket-type-select')
        await expect(ticketSelect).toBeVisible()
        await ticketSelect.click()
        await page.getByRole('option', {name: /Voksen/}).click()

        // Save
        await page.getByTestId('guest-form-save').click()

        // Verify via API
        const orders = await pollUntil(
            async () => await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, testDinnerEvent.id),
            (orders) => orders.some(o => o.inhabitantId === inhabitantId && o.isGuestTicket)
        )

        const guestOrder = orders.find(o => o.inhabitantId === inhabitantId && o.isGuestTicket)
        expect(guestOrder).toBeDefined()
        expect(guestOrder!.isGuestTicket).toBe(true)
        expect(guestOrder!.state).toBe(OrderState.BOOKED)

        await doScreenshot(page, 'dinner/booking-form-guest-added', true)
    })

    for (const view of [BookingViewSchema.enum.week, BookingViewSchema.enum.month]) {
        test(`GIVEN bookings page WHEN user switches to ${view} view THEN grid displays`, async ({page}) => {
            const testDinnerEvent = await getFutureDinnerEvent(0)
            await goToBookingsPage(page, testDinnerEvent.date)

            // Click view button
            const viewButton = page.getByTestId(`booking-view-${view}`)
            await expect(viewButton).toBeVisible()
            await viewButton.click()

            // Verify grid view
            await expect(page.getByTestId('booking-grid-view')).toBeVisible()

            await doScreenshot(page, `dinner/booking-grid-${view}`, true)
        })
    }

    // Deletes dinners of the test season, so it runs after every test that indexes them
    test.describe('a selection that no longer exists on the server', () => {
        const dinnerResponse = (page: Page, id: number) =>
            page.waitForResponse(r => r.url().endsWith(`/api/admin/dinner-event/${id}`))
        const expectNoApiErrorToast = async (page: Page) => {
            await expect(page.getByText('No message')).toHaveCount(0)
            await expect(page.getByText(/^\d{3}: Uh, åh, fejl kan ske/)).toHaveCount(0)
        }

        // The error page for a dinner that no longer exists is the bookings store spec's (the dinner on the selected date)
        test('GIVEN /dinner on a dinner WHEN that dinner is deleted and the page navigates THEN the next dinner shows without a reload', async ({page}) => {
            const gone = await getFutureDinnerEvent(3)
            const next = await getFutureDinnerEvent(4)
            const dateParam = () => new URL(page.url()).searchParams.get('date')
            await gotoHydrated(page, `/dinner?date=${formatDate(gone.date)}`)
            await expect(page.getByTestId('dinner-detail-header')).toBeVisible()
            await page.evaluate(() => Object.assign(window, {sameDocument: true}))

            await DinnerEventFactory.deleteDinnerEvent(adminContext, gone.id, 200)
            const nextShown = dinnerResponse(page, next.id)
            await page.getByTestId('date-nav-next').click()

            expect((await nextShown).status()).toBe(200)
            await expect.poll(dateParam).toBe(formatDate(next.date))
            await expect(page.getByTestId('dinner-detail-header')).toBeVisible()
            expect(await page.evaluate(() => 'sameDocument' in window)).toBe(true)
            await expectNoApiErrorToast(page)
        })

        test.describe('as admin', () => {
            test.use({storageState: adminUIFile})

            test('GIVEN /admin/planning WHEN a listed season is deleted and then chosen THEN a toast names it and the default season loads', async ({page}) => {
                const goneSeason = await SeasonFactory.createSeason(adminContext, SeasonFactory.defaultSeason(temporaryAndRandom()))
                createdSeasonIds.push(goneSeason.id!)
                await gotoHydrated(page, '/admin/planning')
                await expect(page.getByTestId('season-selector')).toContainText(testSeason.season.shortName)

                await SeasonFactory.deleteSeason(adminContext, goneSeason.id!, 200)
                const goneUrl = `/api/admin/season/${goneSeason.id}`
                expectApiError(page.context(), 404, goneUrl)
                const goneRequested = page.waitForResponse(r => r.url().endsWith(goneUrl))
                await selectDropdownOption(page, 'season-selector', goneSeason.shortName)

                expect((await goneRequested).status()).toBe(404)
                // exact: the toaster's screen-reader announcement prefixes the same text
                const goneToast = page.getByText(`Kan ikke finde sæsonen ${goneSeason.shortName}`, {exact: true})
                await expect(goneToast).toHaveCount(1)
                await expect(goneToast).toBeVisible()
                await expect(page.getByTestId('season-selector')).toContainText(testSeason.season.shortName)
                await expect(page.getByText('FEJL 404')).toHaveCount(0)
                await expectNoApiErrorToast(page)
                await doScreenshot(page, 'admin/season-gone-toast')
            })
        })
    })

    // Activates a season of its own past the scaffold window, which displaces the spec's season, so it runs last
    test.describe('a dinner past the scaffold window', () => {
        let pastWindowSeason: Awaited<ReturnType<typeof SeasonFactory.createActiveSeasonFromTomorrow>>

        test.beforeAll(async () => {
            pastWindowSeason = await SeasonFactory.createActiveSeasonFromTomorrow(adminContext, temporaryAndRandom(), {days: 14, cookingDays: 'weekdays', startInDays: PAST_THE_SCAFFOLD_WINDOW_DAYS})
            createdSeasonIds.push(pastWindowSeason.season.id!)
        })

        test('GIVEN a member whose preferences expect Takeaway on a dinner beyond the scaffold window WHEN the day view sets the row to Ingen and saves THEN the save answers CANCEL for the member and the re-read expects nothing on the row', async ({page}) => {
            // GIVEN: a dinner of the season past the scaffold window, where only the preferences speak for it, and a person of
            // the member's household eating Takeaway every weekday; the create stores no preferences, the update after it does.
            // The second dinner: the scaffold the update runs always books the next dinner, past the window or not
            const dinnerEvent = [...pastWindowSeason.dinnerEvents].sort((a, b) => a.date.getTime() - b.date.getTime())[1]!
            const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, householdId, {
                name: salt('Anders', testSalt), lastName: 'Cancelled'
            })
            createdInhabitantIds.push(inhabitant.id)
            await HouseholdFactory.updateInhabitant(adminContext, inhabitant.id, {dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.TAKEAWAY)})
            const theInhabitantOn = {inhabitantId: inhabitant.id, dinnerEventId: dinnerEvent.id}

            // The day view opens once its read of the expected bookings has answered
            const expectedRead = page.waitForResponse(isExpectedRead)
            await gotoHydrated(page, `/dinner?date=${formatDate(dinnerEvent.date)}`)
            const {scaffoldResult: expected} = await (await expectedRead).json() as ScaffoldOrdersResponse
            expect(expected.results).toContainEqual(expect.objectContaining({...theInhabitantOn, dinnerMode: DinnerMode.TAKEAWAY}))

            // WHEN: the member opens the row, picks Ingen and saves
            await page.getByTestId(`inhabitant-${inhabitant.id}-toggle`).click()
            await page.getByTestId(`inhabitant-${inhabitant.id}-mode-edit-${DinnerMode.NONE}`).click()
            const saved = page.waitForResponse(isScaffoldSave)
            const reRead = page.waitForResponse(isExpectedRead)
            await page.getByTestId(`inhabitant-${inhabitant.id}-save`).click()

            // THEN: the save cancels the expected booking, and the re-read after it expects nothing on the row
            const {scaffoldResult: result} = await (await saved).json() as ScaffoldOrdersResponse
            expect(result.results).toContainEqual(expect.objectContaining({...theInhabitantOn, action: BookingActionSchema.enum.CANCEL}))
            const {scaffoldResult: after} = await (await reRead).json() as ScaffoldOrdersResponse
            expect(after.results).not.toContainEqual(expect.objectContaining(theInhabitantOn))
        })
    })
})
