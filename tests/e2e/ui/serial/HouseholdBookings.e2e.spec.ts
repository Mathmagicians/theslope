import {test, expect, type Response} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useBookingValidation, type DinnerEventDisplay, type ScaffoldOrdersResponse} from '~/composables/useBookingValidation'
import {formatDate} from '~/utils/date'
import {BookingViewSchema, type BookingView} from '~/composables/useBookingView'

/**
 * HouseholdBookings — tests for the `/household/[shortname]/bookings` tab.
 *
 * SERIAL: activates its own multi-week / multi-month season (only one season can be
 * active at a time, so this conflicts with parallel tests using the singleton season).
 * Each Playwright project that depends on the parallel suite guarantees the singleton
 * is restored by global teardown after this file runs.
 *
 * Scope: behaviours of the bookings-tab shell itself — the week-grid save, the expected bookings beyond the
 * scaffold window and the server-rendered grid. The date arrows are HouseholdBookings.nuxt.spec.ts; day-view
 * booking form lives in `DinnerBookingForm.e2e.spec.ts`; visitor/cross-household flow in
 * `HouseholdBookingsCrossHousehold.e2e.spec.ts`.
 *
 * File-level lifecycle: one `beforeAll` / `afterAll` for the whole file, no nested
 * describes. Season spans 14 days with Mon–Fri cooking, starting past the 60-day prebooking window (ADR-015): no
 * run has booked its dinners, so a cell without an order shows the booking the preferences give it, and every dinner
 * sits before its cancel deadline, open to book.
 */

const {adminUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, salt, temporaryAndRandom, gotoHydrated, expectHydratedWithoutMismatch, waitForApi} = testHelpers
const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema, BookingActionSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum
const {createDefaultWeekdayMap: createDinnerModeWeekdayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.NONE
})

// Hardcoded beside app.config.ts prebookingWindowDays (60; Nuxt auto-imports not available in Playwright): a day past it
const PAST_THE_WINDOW_DAYS = 62
const testSalt = temporaryAndRandom()
const createdSeasonIds: number[] = []
const createdHouseholdIds: number[] = []
const createdInhabitantIds: number[] = []
let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>
let householdId: number
let shortName: string
let pbsId: number

test.use({storageState: adminUIFile})

test.beforeAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Mon–Fri cooking gives predictable density regardless of which weekday the test starts on; the season starts
    // past the prebooking window, where only the preferences speak for a dinner
    testSeason = await SeasonFactory.createActiveSeasonFromTomorrow(context, testSalt, {days: 14, cookingDays: 'weekdays', startInDays: PAST_THE_WINDOW_DAYS})
    createdSeasonIds.push(testSeason.season.id!)

    const household = await HouseholdFactory.createHousehold(context, {name: salt('HouseholdBookings', testSalt)})
    householdId = household.id
    createdHouseholdIds.push(householdId)
    shortName = household.shortName
    pbsId = household.pbsId
})

test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    // The member's household stays; its test inhabitant goes, with its orders. Cleanup accepts a 404
    await Promise.all(createdInhabitantIds.map(id => HouseholdFactory.deleteInhabitant(context, id)))
    // Deleting a household cascades its inhabitants and their orders; cleanup accepts a 404
    await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
})

// ---- Helpers (file-scope, DRY) ----

const buildBookingsUrl = (view: BookingView, date?: Date, household: {shortName: string, pbsId: number} = {shortName, pbsId}): string =>
    `/household/${encodeURIComponent(household.shortName)}/bookings?pbs=${household.pbsId}&view=${view}${date ? `&date=${formatDate(date)}` : ''}`

// ---- Tests ----

test('GIVEN an inhabitant holding only a guest ticket on a dinner WHEN the week grid power mode books the family THEN a regular order is booked and the guest ticket carries the family\'s mode', async ({page, browser}) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: NONE preferences, so the only order on the dinner is the guest ticket
    const inhabitant = await HouseholdFactory.createInhabitantWithConfig(context, householdId, {
        name: salt('GuestHost', testSalt),
        dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.NONE)
    })
    // The season's last dinner lies past the prebooking window, before its cancellation deadline
    const dinnerEvent: DinnerEventDisplay = [...testSeason.dinnerEvents].sort((a, b) => a.date.getTime() - b.date.getTime()).at(-1)!
    const adultPrice = testSeason.season.ticketPrices.find(tp => tp.ticketType === TicketTypeSchema.enum.ADULT)!
    const guest = await OrderFactory.createOrder(context, {
        householdId,
        dinnerEventId: dinnerEvent.id,
        orders: [{inhabitantId: inhabitant.id, ticketPriceId: adultPrice.id!, dinnerMode: DinnerMode.DINEIN, isGuestTicket: true}]
    })
    const guestOrderId = guest!.createdIds[0]!

    // WHEN: admin unlocks the household, toggles the power cell for the dinner and saves
    await gotoHydrated(page, buildBookingsUrl(BookingViewSchema.enum.week, dinnerEvent.date))
    const adminOverride = page.getByTestId('admin-override-btn')
    await adminOverride.click()
    await adminOverride.click()
    await page.getByTestId('grid-edit').click()
    await page.getByTestId(`power-${dinnerEvent.id}`).click()

    const scaffoldResponse = waitForApi(page, '/api/household/order/scaffold', 'POST')
    await page.getByTestId('grid-save').click()
    const response = await scaffoldResponse
    expect(response.status()).toBe(200)
    const {scaffoldResult} = await response.json() as ScaffoldOrdersResponse
    expect(scaffoldResult.errored).toBe(0)

    // THEN
    const orders = (await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id))
        .filter(o => o.inhabitantId === inhabitant.id)
    const regularOrders = orders.filter(o => !o.isGuestTicket)
    expect(regularOrders).toEqual([expect.objectContaining({state: OrderState.BOOKED})])
    // The guest was booked DINEIN: a power mode other than DINEIN proves the guest moved with the family
    expect(regularOrders[0]!.dinnerMode).not.toBe(DinnerMode.DINEIN)
    expect(orders.find(o => o.id === guestOrderId)).toMatchObject({isGuestTicket: true, dinnerMode: regularOrders[0]!.dinnerMode, state: OrderState.BOOKED})
})

test('GIVEN a member holding a regular order and a guest ticket on a dinner WHEN the week grid changes the guest cell\'s mode and saves THEN the guest order carries the new mode and the regular order is untouched', async ({page, browser}) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: NONE preferences, so the member's orders on the dinner are exactly the two created here
    const inhabitant = await HouseholdFactory.createInhabitantWithConfig(context, householdId, {
        name: salt('GuestEditor', testSalt),
        dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.NONE)
    })
    // The season's second-to-last dinner: before its cancellation deadline, apart from the power-mode test's dinner
    const dinnerEvent: DinnerEventDisplay = [...testSeason.dinnerEvents].sort((a, b) => a.date.getTime() - b.date.getTime()).at(-2)!
    const adultPrice = testSeason.season.ticketPrices.find(tp => tp.ticketType === TicketTypeSchema.enum.ADULT)!
    const created = await OrderFactory.createOrder(context, {
        householdId,
        dinnerEventId: dinnerEvent.id,
        orders: [
            {inhabitantId: inhabitant.id, ticketPriceId: adultPrice.id!, dinnerMode: DinnerMode.DINEIN, isGuestTicket: false},
            {inhabitantId: inhabitant.id, ticketPriceId: adultPrice.id!, dinnerMode: DinnerMode.DINEIN, isGuestTicket: true}
        ]
    })
    const before = (await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id))
        .filter(o => created!.createdIds.includes(o.id))
    const regularOrder = before.find(o => !o.isGuestTicket)!
    const guestOrder = before.find(o => o.isGuestTicket)!

    // WHEN: admin unlocks the household, toggles the guest cell once (DINEIN → DINEINLATE) and saves
    await gotoHydrated(page, buildBookingsUrl(BookingViewSchema.enum.week, dinnerEvent.date))
    const adminOverride = page.getByTestId('admin-override-btn')
    await adminOverride.click()
    await adminOverride.click()
    await page.getByTestId('grid-edit').click()
    await page.locator(`[data-testid^="guest-guest-group-${inhabitant.id}-"][data-testid$="-${dinnerEvent.id}"]`).click()

    const scaffoldResponse = waitForApi(page, '/api/household/order/scaffold', 'POST')
    await page.getByTestId('grid-save').click()
    const response = await scaffoldResponse
    expect(response.status()).toBe(200)
    const {scaffoldResult} = await response.json() as ScaffoldOrdersResponse
    expect(scaffoldResult.errored).toBe(0)

    // THEN
    const after = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id)
    expect(after.find(o => o.id === guestOrder.id)).toMatchObject({isGuestTicket: true, dinnerMode: DinnerMode.DINEINLATE, state: OrderState.BOOKED})
    expect(after.find(o => o.id === regularOrder.id)).toMatchObject({isGuestTicket: false, dinnerMode: DinnerMode.DINEIN, state: OrderState.BOOKED})
})

test('GIVEN a member whose preferences book Spisesal on a month past the scaffold window WHEN the month opens THEN the dry run expects the member on its dinners; WHEN one is set to Ingen and saved THEN the save cancels it and the re-read expects nothing there', async ({browser}) => {
    const adminContext = await validatedBrowserContext(browser)
    const memberContext = await memberValidatedBrowserContext(browser)
    const {householdId: memberHouseholdId, householdShortname, householdPbsId} = await getSessionUserInfo(memberContext)

    // GIVEN: an inhabitant of the member's household eating in the dining hall every weekday
    const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, memberHouseholdId, {
        name: salt('Expected', testSalt),
        dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.DINEIN)
    })
    createdInhabitantIds.push(inhabitant.id)
    const dinnerEvent: DinnerEventDisplay = [...testSeason.dinnerEvents].sort((a, b) => a.date.getTime() - b.date.getTime())[0]!
    const isScaffold = (response: Response) => response.url().includes('/api/household/order/scaffold') && response.request().method() === 'POST'
    const isExpectedRead = (response: Response) => isScaffold(response) && response.url().includes('preview=true') && response.request().postDataJSON().orders.length === 0
    const theInhabitantOn = {inhabitantId: inhabitant.id, dinnerEventId: dinnerEvent.id}

    // WHEN: the member opens the month of the season
    const page = await memberContext.newPage()
    const expectedRead = page.waitForResponse(isExpectedRead)
    await gotoHydrated(page, buildBookingsUrl(BookingViewSchema.enum.month, dinnerEvent.date, {shortName: householdShortname, pbsId: householdPbsId}))

    // THEN: the dry run expects the inhabitant on the dinner, and the grid explains the expected cells
    const {scaffoldResult: expected} = await (await expectedRead).json() as ScaffoldOrdersResponse
    expect(expected.results).toContainEqual(expect.objectContaining({...theInhabitantOn, dinnerMode: DinnerMode.DINEIN}))
    await expect(page.getByTestId('dinner-mode-legend-expected')).toBeVisible()

    // WHEN: the member turns the cell through the modes to Ingen and saves once the preview has answered
    await page.getByTestId('grid-edit').click()
    const preview = page.waitForResponse(response => isScaffold(response) && response.url().includes('preview=true') && response.request().postDataJSON().orders.length > 0)
    for (const _mode of [DinnerMode.DINEINLATE, DinnerMode.TAKEAWAY, DinnerMode.NONE]) {
        await page.getByTestId(`cell-${inhabitant.id}-${dinnerEvent.id}`).click()
    }
    await preview
    const saved = page.waitForResponse(response => isScaffold(response) && !response.url().includes('preview=true'))
    const reRead = page.waitForResponse(isExpectedRead)
    await page.getByTestId('grid-save').click()

    // THEN: the save cancels the expected booking, and the re-read after it expects nothing on the cell
    const {scaffoldResult: result} = await (await saved).json() as ScaffoldOrdersResponse
    expect(result.results).toContainEqual(expect.objectContaining({...theInhabitantOn, action: BookingActionSchema.enum.CANCEL}))
    const {scaffoldResult: after} = await (await reRead).json() as ScaffoldOrdersResponse
    expect(after.results).not.toContainEqual(expect.objectContaining(theInhabitantOn))
    await page.close()
})

for (const view of BookingViewSchema.options) {
    test(`GIVEN a household of more inhabitants than the avatar row shows WHEN the ${view} view loads at desktop width THEN the client hydrates the server markup without a mismatch`, async ({page, browser}) => {
        const context = await validatedBrowserContext(browser)
        const household = await HouseholdFactory.createHousehold(context, {name: salt(`Hydration-${view}`, testSalt)})
        createdHouseholdIds.push(household.id)
        await Promise.all(Array.from({length: 6}, (_, i) => HouseholdFactory.createInhabitantWithConfig(context, household.id, {
            name: salt(`Avatar${i}`, testSalt),
            pictureUrl: `https://theslope.example/avatar-${i}.png`,
            dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.NONE)
        })))

        await page.setViewportSize({width: 1280, height: 900})
        await expectHydratedWithoutMismatch(page, `/household/${encodeURIComponent(household.shortName)}/bookings?pbs=${household.pbsId}&view=${view}`)
        await expect(page.getByTestId('household-bookings')).toBeVisible()
    })
}
