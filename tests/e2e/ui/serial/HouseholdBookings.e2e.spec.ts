import {test, expect} from '@playwright/test'
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
 * Scope: behaviours of the bookings-tab shell itself — the week-grid save and the
 * server-rendered grid. The date arrows are HouseholdBookings.nuxt.spec.ts; day-view
 * booking form lives in `DinnerBookingForm.e2e.spec.ts`; visitor/cross-household flow in
 * `HouseholdBookingsCrossHousehold.e2e.spec.ts`.
 *
 * File-level lifecycle: one `beforeAll` / `afterAll` for the whole file, no nested
 * describes. Season spans 14 days with Mon–Fri cooking: inside the 60-day prebooking
 * window (ADR-015), and its last two dinners sit past the cancel deadline's reach, open to book.
 */

const {adminUIFile} = authFiles
const {validatedBrowserContext, salt, temporaryAndRandom, gotoHydrated, expectHydratedWithoutMismatch, waitForApi} = testHelpers
const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum
const {createDefaultWeekdayMap: createDinnerModeWeekdayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.NONE
})

const testSalt = temporaryAndRandom()
const createdSeasonIds: number[] = []
const createdHouseholdIds: number[] = []
let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>
let householdId: number
let shortName: string
let pbsId: number

test.use({storageState: adminUIFile})

test.beforeAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Mon–Fri cooking gives predictable density regardless of which weekday the test starts on.
    testSeason = await SeasonFactory.createActiveSeasonFromTomorrow(context, testSalt, {days: 14, cookingDays: 'weekdays'})
    createdSeasonIds.push(testSeason.season.id!)

    const household = await HouseholdFactory.createHousehold(context, {name: salt('HouseholdBookings', testSalt)})
    householdId = household.id
    createdHouseholdIds.push(householdId)
    shortName = household.shortName
    pbsId = household.pbsId
})

test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    // Deleting a household cascades its inhabitants and their orders; cleanup accepts a 404
    await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
})

// ---- Helpers (file-scope, DRY) ----

const buildBookingsUrl = (view: BookingView, date?: Date): string =>
    `/household/${encodeURIComponent(shortName)}/bookings?pbs=${pbsId}&view=${view}${date ? `&date=${formatDate(date)}` : ''}`

// ---- Tests ----

test('GIVEN an inhabitant holding only a guest ticket on a dinner WHEN the week grid power mode books the family THEN a regular order is booked and the guest ticket carries the family\'s mode', async ({page, browser}) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: NONE preferences, so the only order on the dinner is the guest ticket
    const inhabitant = await HouseholdFactory.createInhabitantWithConfig(context, householdId, {
        name: salt('GuestHost', testSalt),
        dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.NONE)
    })
    // The season's last dinner lies ~50 days out, before its cancellation deadline
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
