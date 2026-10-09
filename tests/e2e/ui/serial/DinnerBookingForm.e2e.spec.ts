import {test, expect, type BrowserContext, type Page} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {formatDate} from '~/utils/date'
import {EMPTY_STATE_MESSAGES} from '~/composables/useTheSlopeDesignSystem'

const {memberUIFile, adminUIFile} = authFiles
const {validatedBrowserContext, memberValidatedBrowserContext, pollUntil, doScreenshot, getSessionUserInfo, waitForHydration, selectDropdownOption} = testHelpers
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
    let householdPbsId: number
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
        householdPbsId = sessionInfo.householdPbsId

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
        await page.goto(`/household/${householdShortname}/bookings?pbs=${householdPbsId}&date=${dateParam}`)
        await waitForHydration(page)

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

    // Deletes dinners of the test season, so it runs after every test that indexes them
    test.describe('a selection that no longer exists on the server', () => {
        const dinnerResponse = (page: Page, id: number) =>
            page.waitForResponse(r => r.url().endsWith(`/api/admin/dinner-event/${id}`))
        const goneLines = (context: keyof typeof EMPTY_STATE_MESSAGES) =>
            EMPTY_STATE_MESSAGES[context].map(({emoji, text}) => `${emoji} ${text}`)
        const expectNoApiErrorToast = async (page: Page) => {
            await expect(page.getByText('No message')).toHaveCount(0)
            await expect(page.getByText(/^\d{3}: Uh, åh, fejl kan ske/)).toHaveCount(0)
        }

        test('GIVEN /dinner on a dinner WHEN that dinner is deleted and the page navigates THEN the next dinner shows without a reload, and returning to it shows the error page', async ({page}) => {
            const gone = await getFutureDinnerEvent(3)
            const next = await getFutureDinnerEvent(4)
            const dateParam = () => new URL(page.url()).searchParams.get('date')
            await page.goto(`/dinner?date=${formatDate(gone.date)}`)
            await waitForHydration(page)
            await expect(page.getByTestId('dinner-detail-header')).toBeVisible()
            await page.evaluate(() => Object.assign(window, {sameDocument: true}))

            await DinnerEventFactory.deleteDinnerEvent(adminContext, gone.id)
            const nextShown = dinnerResponse(page, next.id)
            await page.getByTestId('date-nav-next').click()

            expect((await nextShown).status()).toBe(200)
            await expect.poll(dateParam).toBe(formatDate(next.date))
            await expect(page.getByTestId('dinner-detail-header')).toBeVisible()
            expect(await page.evaluate(() => 'sameDocument' in window)).toBe(true)
            await expectNoApiErrorToast(page)

            const goneRequested = dinnerResponse(page, gone.id)
            await page.getByTestId('date-nav-prev').click()

            expect((await goneRequested).status()).toBe(404)
            await expect(page.getByText('FEJL 404')).toBeVisible()
            const pageText = await page.locator('body').innerText()
            expect(goneLines('dinnerGone').some(line => pageText.includes(line))).toBe(true)
            await doScreenshot(page, 'dinner/dinner-gone-error-page')

            await page.getByRole('link', {name: /starte forfra/}).click()
            await expect(page.getByText('FEJL 404')).toHaveCount(0)
            await expect(page).toHaveURL(/\/($|\?)/)
        })

        test.describe('as admin', () => {
            test.use({storageState: adminUIFile})

            test('GIVEN /admin/planning WHEN a listed season is deleted and then chosen THEN a toast names it and the default season loads', async ({page}) => {
                const goneSeason = await SeasonFactory.createSeason(adminContext, SeasonFactory.defaultSeason(`${testSalt}-gone`))
                await page.goto('/admin/planning')
                await waitForHydration(page)
                await expect(page.getByTestId('season-selector')).toContainText(testSeason.season.shortName)

                await SeasonFactory.deleteSeason(adminContext, goneSeason.id!)
                const goneRequested = page.waitForResponse(r => r.url().endsWith(`/api/admin/season/${goneSeason.id}`))
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
})
