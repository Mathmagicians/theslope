import {test, expect, type BrowserContext} from '~~/tests/e2e/uiTest'
import {authFiles} from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {getHouseholdUrl} from '~/utils/household'

const {adminUIFile} = authFiles
const {openContext, validatedBrowserContext, getSessionUserInfo, pollUntil, doScreenshot, gotoHydrated, temporaryAndRandom, salt} = testHelpers
const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum
const {createDefaultWeekdayMap: createDinnerModeWeekdayMap} = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.NONE
})

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
    let householdPbsId: number
    let householdEconomyUrl: string
    const testSalt = temporaryAndRandom()
    const createdSeasonIds: number[] = []

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        adminContext = await validatedBrowserContext(browser)
        const {householdId} = await getSessionUserInfo(adminContext)
        testHouseholdId = householdId
        // The order to correct belongs to a person of the admin's household who books nothing by preference, so the
        // season's activation leaves the dinner free for it; the create stores no preferences, the update after it does
        const person = await HouseholdFactory.createInhabitantWithConfig(adminContext, testHouseholdId, {
            name: salt('Anders', testSalt), lastName: 'Korrektion'
        })
        testInhabitantId = person.id
        await HouseholdFactory.updateInhabitant(adminContext, testInhabitantId, {dinnerPreferences: createDinnerModeWeekdayMap(DinnerMode.NONE)})

        // The spec's own season, open at activation: its cases correct an upcoming order and read no deadline
        testSeason = await SeasonFactory.createActiveSeasonFromTomorrow(adminContext, testSalt, {days: 14, deadline: 0})
        createdSeasonIds.push(testSeason.season.id!)

        expect(testSeason.dinnerEvents.length, 'Test season should have dinner events').toBeGreaterThan(0)

        // Get first future dinner event
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const futureDinners = testSeason.dinnerEvents
            .filter(e => new Date(e.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        expect(futureDinners.length).toBeGreaterThan(0)
        testDinnerEventId = futureDinners[0]!.id
        const testTicketPriceId = testSeason.season.ticketPrices!.find(tp => tp.ticketType === TicketTypeSchema.enum.ADULT)!.id!

        const household = (await HouseholdFactory.getAllHouseholds(adminContext)).find(h => h.id === testHouseholdId)!
        householdAddress = household.address
        householdPbsId = household.pbsId
        householdEconomyUrl = getHouseholdUrl(household.shortName, household.pbsId, 'economy')

        const result = await OrderFactory.createOrder(adminContext, {
            householdId: testHouseholdId,
            dinnerEventId: testDinnerEventId,
            orders: [OrderFactory.defaultOrderItem({
                inhabitantId: testInhabitantId,
                ticketPriceId: testTicketPriceId,
                dinnerMode: DinnerMode.DINEIN
            })]
        })
        testOrderId = result!.createdIds[0]!
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await HouseholdFactory.deleteInhabitant(context, testInhabitantId)
        // Deleting the season cascades its dinners and the order on them
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('GIVEN an upcoming order WHEN /admin/economy is server-rendered THEN the future orders table shows its loading state, and once hydrated the order row appears', async ({browser, page}) => {
        // The economy data loads in the browser only: a context without JavaScript sees the page as the server sent it
        const serverContext = await openContext(browser, {storageState: adminUIFile, javaScriptEnabled: false})
        const serverPage = await serverContext.newPage()
        await serverPage.goto('/admin/economy')
        const serverTable = serverPage.getByTestId('future-orders-table')
        await expect(serverPage.getByTestId('admin-economy')).not.toContainText('Ingen fremtidige bestillinger')
        await expect(serverTable.locator('[data-slot="loading"]')).toHaveCount(1)
        await serverContext.close()

        await gotoHydrated(page, '/admin/economy')
        await pollUntil(() => page.getByTestId(`future-orders-expand-${testDinnerEventId}`).count(), count => count === 1)
    })

    test('GIVEN an order of the household WHEN its economy page is server-rendered THEN its HTML carries the billing and the upcoming orders', async () => {
        const html = await adminContext.request.get(householdEconomyUrl).then(r => r.text())

        expect(html).toContain('data-testid="household-economy"')
        expect(html).toContain('Faktureringsperioder')
        expect(html).not.toContain('Ingen kommende bestillinger')
    })

    test('GIVEN order exists WHEN admin uses correction UI THEN order mode is updated', async ({page}) => {
        // Verify order exists before UI test
        const orderBefore = await OrderFactory.getOrder(adminContext, testOrderId)
        expect(orderBefore).toBeDefined()
        expect(orderBefore!.dinnerMode).toBe(DinnerMode.DINEIN)

        // Navigate and select the test season (UI shows selected season's dinner events)
        await gotoHydrated(page, '/admin/planning')
        await page.waitForSelector('[data-testid="season-selector"]')

        // Select test season from dropdown
        await page.getByTestId('season-selector').click()
        await page.getByRole('option', {name: new RegExp(testSalt)}).click()
        await doScreenshot(page, 'admin-planning-season-selected')

        // Use tab navigation (client-side) to preserve season selection
        // Wait for the upcoming orders the economy tab requests for the season
        const orderFetchPromise = page.waitForResponse(
            (r) => r.url().includes('/api/order') && r.url().includes('upcomingForSeason')
        )
        await page.getByRole('tab', {name: 'Økonomi'}).click()
        await expect(page.getByTestId('admin-economy')).toBeVisible()

        // Wait for the upcoming orders to arrive
        await orderFetchPromise
        await doScreenshot(page, 'admin-economy-after-order-fetch')

        const expandBtn = page.getByTestId(`future-orders-expand-${testDinnerEventId}`)
        await expect(expandBtn).toBeVisible()

        await doScreenshot(page, 'admin-economy-after-poll')

        await expandBtn.click()

        // DangerButton: first click transitions to confirm, second click confirms
        const correctionBtn = page.getByTestId('admin-correction-btn')
        await expect(correctionBtn).toBeVisible()
        await correctionBtn.click()
        // Wait for button to show confirm state (text changes to "Klik igen for at rette")
        await expect(correctionBtn).toContainText('Klik igen')
        await correctionBtn.click()

        const householdSelect = page.getByTestId('admin-correction-household-select')
        await expect(householdSelect).toBeVisible()

        await householdSelect.click()
        // The options read "{address} · PBS {pbsId}"; households at one address share the address
        await page.getByRole('option', {name: `${householdAddress} · PBS ${householdPbsId}`, exact: true}).click()

        const inhabitantToggle = page.getByTestId(`inhabitant-${testInhabitantId}-toggle`)
        await expect(inhabitantToggle).toBeVisible()
        await inhabitantToggle.click()

        const takeawayBtn = page.getByTestId(`inhabitant-${testInhabitantId}-mode-edit-${DinnerMode.TAKEAWAY}`)
        await expect(takeawayBtn).toBeVisible()
        await takeawayBtn.click()

        const saveButton = page.getByTestId(`inhabitant-${testInhabitantId}-save`)
        await saveButton.click()

        // Poll until order is updated to TAKEAWAY via API verification
        const updatedOrder = await pollUntil(
            async () => await OrderFactory.getOrder(adminContext, testOrderId),
            (order) => order?.dinnerMode === DinnerMode.TAKEAWAY,
            6
        )
        expect(updatedOrder!.dinnerMode).toBe(DinnerMode.TAKEAWAY)
        expect(updatedOrder!.state).toBe(OrderState.BOOKED)
    })
})
