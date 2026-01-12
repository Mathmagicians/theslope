import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {DinnerEventFactory} from '../testDataFactories/dinnerEventFactory'
import {OrderFactory} from '../testDataFactories/orderFactory'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
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
 * Tests user booking interactions:
 * - Single inhabitant mode change
 * - Power mode (family) change
 * - Guest ticket addition
 */
test.describe('DinnerBookingForm - User Booking Interactions', () => {
    let householdId: number
    let inhabitantId: number
    let activeSeason: Awaited<ReturnType<typeof SeasonFactory.createActiveSeason>>
    let testDinnerEvent: {id: number, date: Date}

    test.use({storageState: memberUIFile})

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)

        // Get member's household info
        const sessionInfo = await getSessionUserInfo(memberContext)
        householdId = sessionInfo.householdId
        inhabitantId = sessionInfo.inhabitantId

        // Use singleton active season
        activeSeason = await SeasonFactory.createActiveSeason(adminContext)

        // Get first future dinner event
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dinnerEvents = await DinnerEventFactory.getDinnerEventsForSeason(adminContext, activeSeason.id!)
        const futureEvents = dinnerEvents
            .filter(e => new Date(e.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        expect(futureEvents.length, 'Should have future dinner events').toBeGreaterThan(0)
        testDinnerEvent = {id: futureEvents[0]!.id, date: new Date(futureEvents[0]!.date)}
    })

    // Helper to navigate to dinner page for specific date
    const goToDinnerPage = async (page: import('@playwright/test').Page, date: Date) => {
        const dateParam = formatDate(date)
        await page.goto(`/dinner?date=${dateParam}`)

        // Wait for booking form to load
        await pollUntil(
            async () => {
                const table = page.locator('table')
                return await table.isVisible().catch(() => false)
            },
            (isVisible) => isVisible,
            10
        )
    }

    test.afterEach(async ({browser}) => {
        // Clean up any orders created during test
        const adminContext = await validatedBrowserContext(browser)
        const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, testDinnerEvent.id)
        const householdOrders = orders.filter(o => o.inhabitant?.householdId === householdId)
        await OrderFactory.cleanupOrders(adminContext, householdOrders.map(o => o.id))
    })

    test('GIVEN inhabitant row WHEN user changes mode to TAKEAWAY THEN order is updated', async ({page, browser}) => {
        const adminContext = await validatedBrowserContext(browser)

        // GIVEN: Navigate to dinner page
        const dateParam = formatDate(testDinnerEvent.date)
        await page.goto(`/dinner?date=${dateParam}`)

        // Wait for table to be visible
        await expect(page.locator('table')).toBeVisible({timeout: 15000})

        // Debug: collect testids for assertion message
        const allTestIds = await page.locator('[data-testid]').evaluateAll(
            els => els.map(el => el.getAttribute('data-testid'))
        )
        const relevantIds = allTestIds.filter(id => id?.includes('inhabitant') || id?.includes('toggle') || id?.includes('power'))

        // GIVEN: Find and expand the inhabitant row
        const toggleTestId = `inhabitant-${inhabitantId}-toggle`
        const toggleButton = page.getByTestId(toggleTestId)

        await expect(toggleButton, `Expected testid="${toggleTestId}" (inhabitantId=${inhabitantId}). Found: [${relevantIds.join(', ')}]`).toBeVisible({timeout: 5000})
        await toggleButton.click()

        // WHEN: Wait for mode selector to appear and select TAKEAWAY
        const modeSelector = page.getByTestId(`inhabitant-${inhabitantId}-mode-edit-TAKEAWAY`)
        await pollUntil(
            async () => await modeSelector.isVisible().catch(() => false),
            (isVisible) => isVisible,
            5
        )
        await modeSelector.click()

        // WHEN: Save the booking
        const saveButton = page.getByTestId(`inhabitant-${inhabitantId}-save`)
        await saveButton.click()

        // THEN: Verify order was created/updated via API
        const orders = await pollUntil(
            async () => await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, testDinnerEvent.id),
            (orders) => orders.some(o => o.inhabitantId === inhabitantId && o.dinnerMode === DinnerMode.TAKEAWAY),
            10
        )

        const order = orders.find(o => o.inhabitantId === inhabitantId)
        expect(order, 'Order should exist for inhabitant').toBeDefined()
        expect(order!.dinnerMode).toBe(DinnerMode.TAKEAWAY)
        expect(order!.state).toBe(OrderState.BOOKED)

        // Documentation screenshot
        await doScreenshot(page, 'dinner/booking-form-after-save', true)
    })

    test('GIVEN power mode row WHEN user selects DINEIN THEN all inhabitants get orders', async ({page, browser}) => {
        const adminContext = await validatedBrowserContext(browser)

        // Get household details to know how many inhabitants
        const household = await HouseholdFactory.getHouseholdById(adminContext, householdId)
        const inhabitantCount = household?.inhabitants?.length ?? 0
        expect(inhabitantCount, 'Household should have inhabitants').toBeGreaterThan(0)

        // GIVEN: Navigate to dinner page
        await goToDinnerPage(page, testDinnerEvent.date)

        // GIVEN: Find and expand the power mode row
        const powerToggle = page.getByTestId('power-power-mode-toggle')
        await pollUntil(
            async () => await powerToggle.isVisible().catch(() => false),
            (isVisible) => isVisible,
            10
        )
        await powerToggle.click()

        // WHEN: Wait for mode selector and select DINEIN
        const modeSelector = page.getByTestId('power-power-mode-mode-edit-DINEIN')
        await pollUntil(
            async () => await modeSelector.isVisible().catch(() => false),
            (isVisible) => isVisible,
            5
        )
        await modeSelector.click()

        // WHEN: Save
        const saveButton = page.getByTestId('power-power-mode-save')
        await saveButton.click()

        // THEN: Verify orders created for all inhabitants
        const orders = await pollUntil(
            async () => await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, testDinnerEvent.id),
            (orders) => {
                const householdOrders = orders.filter(o => o.inhabitant?.householdId === householdId && !o.isGuestTicket)
                return householdOrders.length === inhabitantCount
            },
            15
        )

        const householdOrders = orders.filter(o => o.inhabitant?.householdId === householdId && !o.isGuestTicket)
        expect(householdOrders).toHaveLength(inhabitantCount)
        householdOrders.forEach(o => {
            expect(o.dinnerMode).toBe(DinnerMode.DINEIN)
            expect(o.state).toBe(OrderState.BOOKED)
        })

        // Documentation screenshot
        await doScreenshot(page, 'dinner/booking-form-power-mode', true)
    })

    test('GIVEN guest row WHEN user adds guest ticket THEN guest order is created', async ({page, browser}) => {
        const adminContext = await validatedBrowserContext(browser)

        // GIVEN: Navigate to dinner page
        await goToDinnerPage(page, testDinnerEvent.date)

        // GIVEN: Find and expand the add guest row
        const guestToggle = page.getByTestId('guest-add-guest-toggle')
        await pollUntil(
            async () => await guestToggle.isVisible().catch(() => false),
            (isVisible) => isVisible,
            10
        )
        await guestToggle.click()

        // WHEN: Wait for guest form and select ticket type
        const ticketSelect = page.getByTestId('guest-ticket-type-select')
        await pollUntil(
            async () => await ticketSelect.isVisible().catch(() => false),
            (isVisible) => isVisible,
            5
        )
        await ticketSelect.click()

        // Select first available ticket type (ADULT)
        const adultOption = page.getByRole('option', {name: /voksen/i}).first()
        await adultOption.click()

        // WHEN: Save the guest booking
        const saveButton = page.getByTestId('guest-add-guest-save')
        await saveButton.click()

        // THEN: Verify guest order was created
        const orders = await pollUntil(
            async () => await OrderFactory.getOrdersForDinnerEventsViaAdmin(adminContext, testDinnerEvent.id),
            (orders) => orders.some(o => o.inhabitantId === inhabitantId && o.isGuestTicket),
            10
        )

        const guestOrder = orders.find(o => o.inhabitantId === inhabitantId && o.isGuestTicket)
        expect(guestOrder, 'Guest order should exist').toBeDefined()
        expect(guestOrder!.isGuestTicket).toBe(true)
        expect(guestOrder!.state).toBe(OrderState.BOOKED)

        // Documentation screenshot
        await doScreenshot(page, 'dinner/booking-form-guest-added', true)
    })
})
