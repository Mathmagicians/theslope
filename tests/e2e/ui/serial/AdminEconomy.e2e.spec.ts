import {test, expect, type BrowserContext} from '@playwright/test'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'

const {adminUIFile} = authFiles
const {validatedBrowserContext, getSessionUserInfo, pollUntil, doScreenshot} = testHelpers
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum

/**
 * SERIAL TEST: Creates its own active season to ensure future dinner events exist.
 * Tests admin correction UI for modifying orders.
 */
test.describe.serial('AdminEconomy - Admin Correction', () => {
    let adminContext: BrowserContext
    let testSeason: Awaited<ReturnType<typeof SeasonFactory.createSeasonWithDinnerEvents>>
    let testOrderId: number
    let testDinnerEventId: number
    let testHouseholdId: number
    let testInhabitantId: number
    let householdAddress: string
    const testSalt = `admin-economy-${Date.now()}`

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        adminContext = await validatedBrowserContext(browser)
        const {householdId, inhabitantId, userId} = await getSessionUserInfo(adminContext)
        testHouseholdId = householdId
        testInhabitantId = inhabitantId

        // Create dedicated season with future dinner events
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        const twoWeeksFromTomorrow = new Date(tomorrow)
        twoWeeksFromTomorrow.setDate(twoWeeksFromTomorrow.getDate() + 14)

        testSeason = await SeasonFactory.createSeasonWithDinnerEvents(adminContext, testSalt, {
            seasonDates: {start: tomorrow, end: twoWeeksFromTomorrow}
        })

        expect(testSeason.dinnerEvents.length, 'Test season should have dinner events').toBeGreaterThan(0)

        // Activate the test season
        const activated = await SeasonFactory.activateSeason(adminContext, testSeason.season.id!)
        expect(activated.isActive, 'Test season should be active').toBe(true)

        // Get first future dinner event
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const futureDinners = testSeason.dinnerEvents
            .filter(e => new Date(e.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        expect(futureDinners.length).toBeGreaterThan(0)
        testDinnerEventId = futureDinners[0]!.id
        const testTicketPriceId = testSeason.season.ticketPrices!.find(tp => tp.ticketType === 'ADULT')!.id!

        const households = await adminContext.request.get('/api/admin/household').then(r => r.json())
        const household = households.find((h: { id: number }) => h.id === testHouseholdId)
        householdAddress = household?.address ?? 'Unknown'

        const result = await OrderFactory.createOrder(adminContext, {
            householdId: testHouseholdId,
            dinnerEventId: testDinnerEventId,
            orders: [OrderFactory.defaultOrderItem({
                inhabitantId: testInhabitantId,
                ticketPriceId: testTicketPriceId,
                bookedByUserId: userId,
                dinnerMode: DinnerMode.DINEIN
            })]
        })
        testOrderId = result!.createdIds[0]!
    })

    test.afterAll(async () => {
        if (testSeason?.season?.id) {
            await SeasonFactory.deleteSeason(adminContext, testSeason.season.id)
        }
    })

    test('GIVEN order exists WHEN admin uses correction UI THEN order mode is updated', async ({page}) => {
        // Verify order exists before UI test
        const orderBefore = await OrderFactory.getOrder(adminContext, testOrderId)
        expect(orderBefore).toBeDefined()
        expect(orderBefore!.dinnerMode).toBe(DinnerMode.DINEIN)

        // Navigate and select the test season (UI shows selected season's dinner events)
        await page.goto('/admin/planning')
        await page.waitForSelector('[data-testid="season-selector"]')

        // Select test season from dropdown
        await page.getByTestId('season-selector').click()
        await page.getByRole('option', {name: new RegExp(testSalt)}).click()
        await doScreenshot(page, 'admin-planning-season-selected')

        // Use tab navigation (client-side) to preserve season selection
        // Wait for the order fetch that will happen when the season's dinnerEvents load
        const orderFetchPromise = page.waitForResponse(
            (r) => r.url().includes('/api/order') && r.url().includes('dinnerEventIds'),
            {timeout: 15000}
        )
        await page.getByRole('tab', {name: 'Økonomi'}).click()
        await pollUntil(
            async () => await page.getByTestId('admin-economy').isVisible().catch(() => false),
            (isVisible) => isVisible
        )

        // Wait for the order fetch to complete (happens after season dinnerEvents load)
        await orderFetchPromise
        await doScreenshot(page, 'admin-economy-after-order-fetch')

        const anyExpandBtn = page.locator('[data-testid^="future-orders-expand-"]').first()
        await pollUntil(
            async () => await anyExpandBtn.isVisible().catch(() => false),
            (isVisible) => isVisible,
            10,
            1000
        )

        await doScreenshot(page, 'admin-economy-after-poll')

        const expandBtn = page.getByTestId(`future-orders-expand-${testDinnerEventId}`)
        expect(await expandBtn.isVisible()).toBe(true)

        await expandBtn.click()

        await pollUntil(
            async () => await page.getByTestId('admin-correction-btn').isVisible().catch(() => false),
            (isVisible) => isVisible,
            10,
            500
        )

        // DangerButton: first click transitions to confirm, second click confirms
        const correctionBtn = page.getByTestId('admin-correction-btn')
        await correctionBtn.click()
        // Wait for button to show confirm state (text changes to "Klik igen for at rette")
        await pollUntil(
            async () => (await correctionBtn.textContent())?.includes('Klik igen') ?? false,
            (hasConfirmText) => hasConfirmText,
            10,
            200
        )
        await correctionBtn.click()

        const householdSelect = page.getByTestId('admin-correction-household-select')
        await pollUntil(
            async () => await householdSelect.isVisible().catch(() => false),
            (isVisible) => isVisible
        )

        await householdSelect.click()
        await page.getByRole('option', {name: new RegExp(householdAddress)}).first().click()

        const inhabitantToggle = page.getByTestId(`inhabitant-${testInhabitantId}-toggle`)
        await pollUntil(
            async () => await inhabitantToggle.isVisible().catch(() => false),
            (isVisible) => isVisible
        )
        await inhabitantToggle.click()

        const takeawayBtn = page.getByTestId(`inhabitant-${testInhabitantId}-mode-edit-TAKEAWAY`)
        await pollUntil(
            async () => await takeawayBtn.isVisible().catch(() => false),
            (isVisible) => isVisible
        )
        await takeawayBtn.click()

        const saveButton = page.getByTestId(`inhabitant-${testInhabitantId}-save`)
        await saveButton.click()

        // Poll until order is updated to TAKEAWAY via API verification
        const updatedOrder = await pollUntil(
            async () => await OrderFactory.getOrder(adminContext, testOrderId),
            (order) => order?.dinnerMode === DinnerMode.TAKEAWAY,
            15,
            1000
        )
        expect(updatedOrder!.dinnerMode).toBe(DinnerMode.TAKEAWAY)
        expect(updatedOrder!.state).toBe(OrderState.BOOKED)
    })
})
