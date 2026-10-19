import {test, expect, type Browser} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {addDays, startOfDay} from 'date-fns'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useBookingValidation, type DinnerEventDisplay, type ScaffoldOrdersResponse} from '~/composables/useBookingValidation'
import {formatDate} from '~/utils/date'
import {groupBy} from '~/utils/batchUtils'
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
 * sits before its cancel deadline, open to book. The guest-after-the-deadline case adds its own dinner on tomorrow, past
 * the season's booking deadline.
 */

const {adminUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, getSessionUserInfo, salt, temporaryAndRandom, gotoHydrated, expectHydratedWithoutMismatch, waitForApi, isScaffoldSave, isExpectedRead, PAST_THE_SCAFFOLD_WINDOW_DAYS, PHONE_VIEWPORT} = testHelpers
const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema, BookingActionSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum
const {createDefaultWeekdayMap: createDinnerModeWeekdayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.NONE
})

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
    testSeason = await SeasonFactory.createActiveSeasonFromTomorrow(context, testSalt, {days: 14, cookingDays: 'weekdays', startInDays: PAST_THE_SCAFFOLD_WINDOW_DAYS})
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

const dinnersByDate = (): DinnerEventDisplay[] => [...testSeason.dinnerEvents].sort((a, b) => a.date.getTime() - b.date.getTime())

// The dinners of the month holding most of the season's, in date order: the month grid with the most columns
const fullestMonth = (): DinnerEventDisplay[] =>
    [...groupBy<DinnerEventDisplay, string>(d => `${d.date.getFullYear()}-${d.date.getMonth()}`)(dinnersByDate()).values()]
        .sort((a, b) => b.length - a.length)[0]!

// ---- Tests ----

test('GIVEN an inhabitant holding only a guest ticket on a dinner WHEN the week grid power mode books the family THEN a regular order is booked and the guest ticket carries the family\'s mode', async ({page, browser}) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: NONE preferences, so the only order on the dinner is the guest ticket
    const inhabitant = await HouseholdFactory.createInhabitantWithConfig(context, householdId, {
        name: salt('GuestHost', testSalt),
        dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.NONE)
    })
    // The season's last dinner lies past the prebooking window, before its cancellation deadline
    const dinnerEvent = dinnersByDate().at(-1)!
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
    const dinnerEvent = dinnersByDate().at(-2)!
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

// A person of the member's household eating in the dining hall every weekday, and the member's page on a week past
// the scaffold window, open once the grid's read of it has answered; the week has a fraction of the month's cells to
// re-render on each change
const openExpectedWeek = async (browser: Browser, lastName: string) => {
    const adminContext = await validatedBrowserContext(browser)
    const memberContext = await memberValidatedBrowserContext(browser)
    const {householdId: memberHouseholdId, householdShortname, householdPbsId} = await getSessionUserInfo(memberContext)
    const inhabitant = await HouseholdFactory.createInhabitantWithConfig(adminContext, memberHouseholdId, {
        name: salt('Anders', testSalt),
        lastName,
        dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.DINEIN)
    })
    createdInhabitantIds.push(inhabitant.id)
    const dinnerEvent = dinnersByDate()[0]!
    const page = await memberContext.newPage()
    const expectedRead = page.waitForResponse(isExpectedRead)
    await gotoHydrated(page, buildBookingsUrl(BookingViewSchema.enum.week, dinnerEvent.date, {shortName: householdShortname, pbsId: householdPbsId}))
    const {scaffoldResult: expected} = await (await expectedRead).json() as ScaffoldOrdersResponse
    return {page, inhabitant, dinnerEvent, expected, theInhabitantOn: {inhabitantId: inhabitant.id, dinnerEventId: dinnerEvent.id}}
}

test('GIVEN a member whose preferences book Spisesal on a week past the scaffold window WHEN the week opens THEN the dry run expects the member on its dinners and the grid explains the expected cells', async ({browser}) => {
    const {page, expected, theInhabitantOn} = await openExpectedWeek(browser, 'Expected')

    expect(expected.results).toContainEqual(expect.objectContaining({...theInhabitantOn, dinnerMode: DinnerMode.DINEIN}))
    await expect(page.getByTestId('dinner-mode-legend-expected')).toBeVisible()
    await page.close()
})

test('GIVEN an expected cell on a week past the scaffold window WHEN the member adopts the plan, turns it to Ingen and saves THEN the save cancels it and the re-read expects nothing there', async ({browser}) => {
    const {page, inhabitant, dinnerEvent, theInhabitantOn} = await openExpectedWeek(browser, 'Cancelled')

    // WHEN: the first click adopts the planned Spisesal as the member's draft, the next ones turn the cell through the
    // modes to Ingen, and the member saves; the save sends the draft, the preview plays no part
    await page.getByTestId('grid-edit').click()
    for (const _mode of [DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.TAKEAWAY, DinnerMode.NONE]) {
        await page.getByTestId(`cell-${inhabitant.id}-${dinnerEvent.id}`).click()
    }
    const saved = page.waitForResponse(isScaffoldSave)
    const reRead = page.waitForResponse(isExpectedRead)
    await page.getByTestId('grid-save').click()

    // THEN: the save cancels the expected booking, and the re-read after it expects nothing on the cell
    const {scaffoldResult: result} = await (await saved).json() as ScaffoldOrdersResponse
    expect(result.results).toContainEqual(expect.objectContaining({...theInhabitantOn, action: BookingActionSchema.enum.CANCEL}))
    const {scaffoldResult: after} = await (await reRead).json() as ScaffoldOrdersResponse
    expect(after.results).not.toContainEqual(expect.objectContaining(theInhabitantOn))
    await page.close()
})

test('GIVEN a member on the week grid and a dinner past its booking deadline with no ticket for sale WHEN the chevron opens the guest form and it saves THEN the guest\'s place is on the dinner\'s waiting list', async ({browser}) => {
    const adminContext = await validatedBrowserContext(browser)
    const memberContext = await memberValidatedBrowserContext(browser)
    const {inhabitantId, householdShortname, householdPbsId} = await getSessionUserInfo(memberContext)
    // GIVEN: a dinner of the season alone on tomorrow, past the season's booking deadline, where nobody has released a ticket
    const dinnerEvent = await DinnerEventFactory.createDinnerEventAloneOnDay(adminContext, testSeason.season, startOfDay(addDays(new Date(), 1)))
    const page = await memberContext.newPage()
    await gotoHydrated(page, buildBookingsUrl(BookingViewSchema.enum.week, dinnerEvent.date, {shortName: householdShortname, pbsId: householdPbsId}))

    // WHEN: the member opens the dinner's guest form from its chevron and saves the form's defaults
    await page.getByTestId('grid-edit').click()
    await page.getByTestId(`guest-add-${dinnerEvent.id}`).click()
    const saved = page.waitForResponse(isScaffoldSave)
    await page.getByTestId('guest-form-save').click()

    // THEN: with nothing for sale the guest queues, and the dinner's waiting list holds the guest's place
    const theGuestOn = {inhabitantId, dinnerEventId: dinnerEvent.id, isGuestTicket: true}
    const {scaffoldResult: result} = await (await saved).json() as ScaffoldOrdersResponse
    expect(result.results).toContainEqual(expect.objectContaining({...theGuestOn, action: BookingActionSchema.enum.QUEUE}))
    expect(await WaitlistFactory.entries(adminContext, [dinnerEvent.id])).toContainEqual(expect.objectContaining(theGuestOn))
    await page.close()
})

test('GIVEN a member on a phone and a month of Mon–Fri dinners WHEN the month grid is in edit mode, scrolled to the last open dinner, and its guest chevron is tapped THEN the guest form is in the viewport and a guest booked from it lands as a guest order on that dinner', async ({browser}) => {
    const adminContext = await validatedBrowserContext(browser)
    const memberContext = await memberValidatedBrowserContext(browser)
    const {inhabitantId, householdShortname, householdPbsId} = await getSessionUserInfo(memberContext)
    // The month's last dinner: the column past the phone's first screen, open as every dinner of the season is
    const dinnerEvent = fullestMonth().at(-1)!
    const page = await memberContext.newPage()
    await page.setViewportSize(PHONE_VIEWPORT)
    await gotoHydrated(page, buildBookingsUrl(BookingViewSchema.enum.month, dinnerEvent.date, {shortName: householdShortname, pbsId: householdPbsId}))

    // WHEN: the grid's box scrolls sideways to the last dinner and its chevron opens the guest form
    await page.getByTestId('grid-edit').click()
    const chevron = page.getByTestId(`guest-add-${dinnerEvent.id}`)
    await chevron.scrollIntoViewIfNeeded()
    await chevron.click()

    // THEN: the form keeps to the part of the box in view, within the phone's width
    const form = page.locator('form').filter({has: page.getByTestId('guest-form-save')})
    await expect(form).toBeVisible()
    await expect(form).toBeInViewport()
    const box = (await form.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(PHONE_VIEWPORT.width)

    // THEN: the save books one adult guest (the form's defaults) as the member's guest order on the dinner
    const saved = page.waitForResponse(isScaffoldSave)
    await page.getByTestId('guest-form-save').click()
    const {scaffoldResult} = await (await saved).json() as ScaffoldOrdersResponse
    expect(scaffoldResult.results).toContainEqual(expect.objectContaining({inhabitantId, dinnerEventId: dinnerEvent.id, isGuestTicket: true, action: BookingActionSchema.enum.BOOK}))
    const guestOrders = (await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, dinnerEvent.id))
        .filter(o => o.inhabitantId === inhabitantId && o.isGuestTicket)
    expect(guestOrders).toEqual([expect.objectContaining({state: OrderState.BOOKED})])
    await page.close()
})

test('GIVEN a member on a phone and a month of Mon–Fri dinners WHEN the month grid is in edit mode and scrolled sideways to the last dinner THEN the Annuller and Opdater buttons stay on the phone\'s screen', async ({browser}) => {
    const memberContext = await memberValidatedBrowserContext(browser)
    const {householdShortname, householdPbsId} = await getSessionUserInfo(memberContext)
    // The month's last dinner: the column past the phone's first screen
    const dinnerEvent = fullestMonth().at(-1)!
    const page = await memberContext.newPage()
    await page.setViewportSize(PHONE_VIEWPORT)
    await gotoHydrated(page, buildBookingsUrl(BookingViewSchema.enum.month, dinnerEvent.date, {shortName: householdShortname, pbsId: householdPbsId}))

    // WHEN: the grid's box scrolls sideways to the last dinner
    await page.getByTestId('grid-edit').click()
    await page.getByTestId(`guest-add-${dinnerEvent.id}`).scrollIntoViewIfNeeded()

    // THEN: each button keeps to the part of the box in view, within the phone's width; the page scrolls down to it
    // alone, so the box keeps its sideways scroll
    for (const testId of ['grid-cancel', 'grid-save']) {
        const button = page.getByTestId(testId)
        await button.evaluate(element => window.scrollBy(0, element.getBoundingClientRect().top - window.innerHeight / 2))
        await expect(button).toBeInViewport()
        const box = (await button.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(PHONE_VIEWPORT.width)
    }
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
