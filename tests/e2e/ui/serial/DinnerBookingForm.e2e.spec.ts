import {test, expect, type BrowserContext} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {formatDate} from '~/utils/date'

const {memberUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, doScreenshot, getSessionUserInfo} = testHelpers
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum

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
 */
test.describe.serial('DinnerBookingForm - User Booking Interactions', () => {
    let householdId: number
    let inhabitantId: number
    let householdShortname: string
    let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>
    let adminContext: BrowserContext
    const testSalt = `booking-form-${Date.now()}`

    test.use({storageState: memberUIFile})

    test.beforeAll(async ({browser}) => {
        adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)

        // Get member's household info
        const sessionInfo = await getSessionUserInfo(memberContext)
        householdId = sessionInfo.householdId
        inhabitantId = sessionInfo.inhabitantId
        householdShortname = sessionInfo.householdShortname

        // Create dedicated season with SHORT deadline so all events are bookable
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        const twoWeeksFromTomorrow = new Date(tomorrow)
        twoWeeksFromTomorrow.setDate(twoWeeksFromTomorrow.getDate() + 14)

        testSeason = await SeasonFactory.createSeasonWithDinnerEvents(adminContext, testSalt, {
            ticketIsCancellableDaysBefore: 0,
            seasonDates: {start: tomorrow, end: twoWeeksFromTomorrow}
        })

        // Verify dinner events were created
        expect(testSeason.dinnerEvents.length, 'Test season should have dinner events').toBeGreaterThan(0)

        // Activate the test season and verify
        const activated = await SeasonFactory.activateSeason(adminContext, testSeason.season.id!)
        expect(activated.isActive, 'Test season should be active').toBe(true)
    })

    test.afterAll(async () => {
        if (testSeason?.season?.id) {
            await SeasonFactory.deleteSeason(adminContext, testSeason.season.id)
        }
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
        await page.goto(`/household/${householdShortname}/bookings?date=${dateParam}`)

        // Wait for booking table - ignore transient "no season" state during store init
        await pollUntil(
            async () => await page.getByTestId('booking-table').isVisible().catch(() => false),
            (isVisible) => isVisible
        )
    }

    test('GIVEN inhabitant row WHEN user changes mode to TAKEAWAY THEN order is updated', async ({page}) => {
        const testDinnerEvent = await getFutureDinnerEvent(0)
        await goToBookingsPage(page, testDinnerEvent.date)

        // Expand inhabitant row
        const toggleButton = page.getByTestId(`inhabitant-${inhabitantId}-toggle`)
        await pollUntil(
            async () => await toggleButton.isVisible().catch(() => false),
            (isVisible) => isVisible
        )
        await toggleButton.click()

        // Select TAKEAWAY
        const modeSelector = page.getByTestId(`inhabitant-${inhabitantId}-mode-edit-TAKEAWAY`)
        await pollUntil(
            async () => await modeSelector.isVisible().catch(() => false),
            (isVisible) => isVisible
        )
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

        await goToBookingsPage(page, testDinnerEvent.date)

        // Expand power mode row
        const powerToggle = page.getByTestId('power-power-mode-toggle')
        await pollUntil(
            async () => await powerToggle.isVisible().catch(() => false),
            (isVisible) => isVisible
        )
        await powerToggle.click()

        // Select DINEIN
        const modeSelector = page.getByTestId('power-power-mode-mode-edit-DINEIN')
        await pollUntil(
            async () => await modeSelector.isVisible().catch(() => false),
            (isVisible) => isVisible
        )
        await modeSelector.click()

        // Save
        await page.getByTestId('power-power-mode-save').click()

        // Verify via API
        const orders = await pollUntil(
            async () => await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, testDinnerEvent.id),
            (orders) => {
                const householdOrders = orders.filter(o => o.inhabitant?.householdId === householdId && !o.isGuestTicket)
                return householdOrders.length === inhabitantCount && householdOrders.every(o => o.dinnerMode === DinnerMode.DINEIN)
            }
        )

        const householdOrders = orders.filter(o => o.inhabitant?.householdId === householdId && !o.isGuestTicket)
        expect(householdOrders).toHaveLength(inhabitantCount)
        householdOrders.forEach(o => {
            expect(o.dinnerMode).toBe(DinnerMode.DINEIN)
            expect(o.state).toBe(OrderState.BOOKED)
        })

        await doScreenshot(page, 'dinner/booking-form-power-mode', true)
    })

    test('GIVEN guest row WHEN user adds guest ticket THEN guest order is created', async ({page}) => {
        const testDinnerEvent = await getFutureDinnerEvent(2)
        await goToBookingsPage(page, testDinnerEvent.date)

        // Expand guest row
        const guestToggle = page.getByTestId('guest-add-guest-toggle')
        await pollUntil(
            async () => await guestToggle.isVisible().catch(() => false),
            (isVisible) => isVisible
        )
        await guestToggle.click()

        // Wait for guest form and select ticket type
        const ticketSelect = page.getByTestId('guest-ticket-type-select')
        await pollUntil(
            async () => await ticketSelect.isVisible().catch(() => false),
            (isVisible) => isVisible
        )
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

    for (const view of ['week', 'month'] as const) {
        test(`GIVEN bookings page WHEN user switches to ${view} view THEN grid displays`, async ({page}) => {
            const testDinnerEvent = await getFutureDinnerEvent(0)
            await goToBookingsPage(page, testDinnerEvent.date)

            // Click view button
            const viewButton = page.getByTestId(`booking-view-${view}`)
            await pollUntil(
                async () => await viewButton.isVisible().catch(() => false),
                (isVisible) => isVisible
            )
            await viewButton.click()

            // Verify grid view
            await pollUntil(
                async () => await page.getByTestId('booking-grid-view').isVisible().catch(() => false),
                (isVisible) => isVisible
            )

            await doScreenshot(page, `dinner/booking-grid-${view}`, true)
        })
    }
})
