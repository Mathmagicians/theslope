import {test, expect, type Page} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useBookingValidation, type DinnerEventDisplay, type ScaffoldOrdersResponse} from '~/composables/useBookingValidation'
import {formatDate} from '~/utils/date'

/**
 * HouseholdBookings — tests for the `/household/[shortname]/bookings` tab.
 *
 * SERIAL: activates its own multi-week / multi-month season (only one season can be
 * active at a time, so this conflicts with parallel tests using the singleton season).
 * Each Playwright project that depends on the parallel suite guarantees the singleton
 * is restored by global teardown after this file runs.
 *
 * Scope: behaviours of the bookings-tab shell itself — arrow navigation across
 * week/month views and the week-grid save. Day-view booking form lives in
 * `DinnerBookingForm.e2e.spec.ts`; visitor/cross-household flow in
 * `HouseholdBookingsCrossHousehold.e2e.spec.ts`.
 *
 * File-level lifecycle: one `beforeAll` / `afterAll` for the whole file, no nested
 * describes. Season spans ~50 days with Mon–Fri cooking:
 *   - Well within the 60-day prebooking window (ADR-015)
 *   - Guarantees ≥ 7 weeks of dinners → week nav has somewhere to go
 *   - Guarantees ≥ 2 calendar months of dinners → month nav has somewhere to go
 *   - 5 cooking days/week → dense enough for the "hide at last dinner" loop to
 *     terminate well inside the 12-click cap
 */

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, salt, temporaryAndRandom, getSessionUserInfo, waitForHydration} = testHelpers
const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum
const {createDefaultWeekdayMap: createBooleanWeekdayMap} = useWeekDayMapValidation()
const {createDefaultWeekdayMap: createDinnerModeWeekdayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.NONE
})

const testSalt = temporaryAndRandom()
const createdSeasonIds: number[] = []
let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>
let householdId: number
let shortName: string
let pbsId: number

test.use({storageState: adminUIFile})

test.beforeAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Mon–Fri cooking gives predictable density regardless of which weekday the test starts on.
    const weekdaysCooking = createBooleanWeekdayMap([true, true, true, true, true, false, false])

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const fiftyDaysLater = new Date(tomorrow)
    fiftyDaysLater.setDate(fiftyDaysLater.getDate() + 50)

    testSeason = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
        cookingDays: weekdaysCooking,
        seasonDates: {start: tomorrow, end: fiftyDaysLater},
        holidays: []
    })
    createdSeasonIds.push(testSeason.season.id!)

    await SeasonFactory.activateSeason(context, testSeason.season.id!)

    const household = await HouseholdFactory.createHousehold(context, {name: salt('HouseholdBookings', testSalt)})
    householdId = household.id
    shortName = household.shortName
    pbsId = household.pbsId
})

test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    if (householdId) {
        await HouseholdFactory.deleteHousehold(context, householdId).catch(() => {})
    }
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
})

// ---- Helpers (file-scope, DRY) ----

type BookingView = 'day' | 'week' | 'month'

const buildBookingsUrl = (view: BookingView, date?: Date): string =>
    `/household/${encodeURIComponent(shortName)}/bookings?pbs=${pbsId}&view=${view}${date ? `&date=${formatDate(date)}` : ''}`

/**
 * Parse `?date=DD/MM/YYYY` from a URL to a local-midnight Date.
 * Relative `.getTime()` comparisons stay consistent across TZs — both the URL-derived
 * value and comparators constructed the same way shift identically.
 */
const getDateFromUrl = (url: string): Date | null => {
    const match = url.match(/[?&]date=([^&]+)/)
    if (!match) return null
    const [day, month, year] = decodeURIComponent(match[1]!).split('/').map(Number)
    if (!day || !month || !year) return null
    return new Date(year, month - 1, day)
}

/** Open the bookings tab and wait until `useDinnerDateParam` has synced `?date=`. */
const openBookingsView = async (page: Page, view: BookingView): Promise<Date> => {
    await page.goto(buildBookingsUrl(view))
    await pollUntil(
        async () => page.locator('[data-testid="household-bookings"]').isVisible(),
        (v) => v,
        10
    )
    await pollUntil(
        async () => getDateFromUrl(page.url()) !== null,
        (present) => present,
        10
    )
    return getDateFromUrl(page.url())!
}

/** Click a nav arrow, poll until the URL `?date=` actually changes. No `waitForTimeout`. */
const clickAndAwaitDateChange = async (page: Page, testId: 'date-nav-next' | 'date-nav-prev'): Promise<Date> => {
    const before = getDateFromUrl(page.url())
    await page.getByTestId(testId).click()
    await pollUntil(
        async () => {
            const now = getDateFromUrl(page.url())
            return !!(now && before && now.getTime() !== before.getTime())
        },
        (changed) => changed,
        10
    )
    return getDateFromUrl(page.url())!
}

// ---- Tests ----

for (const view of ['week', 'month'] as const) {
    test(`${view} forward arrow advances ?date= to a later date`, async ({page}) => {
        const initial = await openBookingsView(page, view)
        const after = await clickAndAwaitDateChange(page, 'date-nav-next')
        expect(after.getTime()).toBeGreaterThan(initial.getTime())
    })

    test(`${view} backward arrow returns ?date= to an earlier date`, async ({page}) => {
        await openBookingsView(page, view)
        const advanced = await clickAndAwaitDateChange(page, 'date-nav-next')
        const after = await clickAndAwaitDateChange(page, 'date-nav-prev')
        expect(after.getTime()).toBeLessThan(advanced.getTime())
    })
}

test('week forward arrow hides at last dinner of season', async ({page}) => {
    await openBookingsView(page, 'week')

    const nextBtn = page.getByTestId('date-nav-next')
    const MAX_CLICKS = 12

    for (let i = 0; i < MAX_CLICKS; i++) {
        if (!(await nextBtn.isVisible())) break
        await clickAndAwaitDateChange(page, 'date-nav-next')
    }

    await expect(nextBtn).toBeHidden()
})

test('GIVEN an inhabitant holding only a guest ticket on a dinner WHEN the week grid power mode books the family THEN a regular order is booked and the guest ticket is untouched', async ({page, browser}) => {
    const context = await validatedBrowserContext(browser)
    const {userId} = await getSessionUserInfo(context)

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
        orders: [{inhabitantId: inhabitant.id, bookedByUserId: userId, ticketPriceId: adultPrice.id!, dinnerMode: DinnerMode.DINEIN, isGuestTicket: true}]
    }, 201, true)
    const guestOrderId = guest!.createdIds[0]!

    // WHEN: admin unlocks the household, toggles the power cell for the dinner and saves
    await page.goto(buildBookingsUrl('week', dinnerEvent.date))
    await waitForHydration(page)
    const adminOverride = page.getByTestId('admin-override-btn')
    await adminOverride.click()
    await adminOverride.click()
    await page.getByTestId('grid-edit').click()
    await page.getByTestId(`power-${dinnerEvent.id}`).click()

    const scaffoldResponse = page.waitForResponse(r =>
        r.url().includes('/api/household/order/scaffold') && r.request().method() === 'POST'
    )
    await page.getByTestId('grid-save').click()
    const response = await scaffoldResponse
    expect(response.status()).toBe(200)
    const {scaffoldResult} = await response.json() as ScaffoldOrdersResponse
    expect(scaffoldResult.errored).toBe(0)

    // THEN
    const orders = (await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id))
        .filter(o => o.inhabitantId === inhabitant.id)
    expect(orders.find(o => o.id === guestOrderId)).toMatchObject({isGuestTicket: true, dinnerMode: DinnerMode.DINEIN, state: OrderState.BOOKED})
    expect(orders.filter(o => !o.isGuestTicket)).toEqual([expect.objectContaining({state: OrderState.BOOKED})])
})
