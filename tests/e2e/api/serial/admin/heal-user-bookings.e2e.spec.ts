import {test, expect} from '@playwright/test'
import {useBookingValidation} from '~~/app/composables/useBookingValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum
const {validatedBrowserContext, temporaryAndRandom} = testHelpers

/**
 * Heal User Bookings E2E Test
 *
 * Tests the healing endpoint: dry run count → execute → verify healed
 */
test.describe('POST /api/admin/maintenance/heal-user-bookings', () => {
    const createdSeasonIds: number[] = []
    const createdHouseholdIds: number[] = []

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const householdId of createdHouseholdIds) {
            await HouseholdFactory.deleteHousehold(context, householdId)
        }
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('dry run counts → heal executes → orders restored', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Setup: season + household + inhabitant
        const {season, dinnerEvents} = await SeasonFactory.createSeasonWithDinnerEvents(context, testSalt, {
            ticketIsCancellableDaysBefore: 0
        })
        createdSeasonIds.push(season.id!)
        await SeasonFactory.activateSeason(context, season.id!)

        const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
            context, HouseholdFactory.defaultHouseholdData(testSalt), 1
        )
        createdHouseholdIds.push(household.id)
        const inhabitant = inhabitants[0]!
        const dinnerEvent = dinnerEvents[0]!
        const ticketPrice = season.ticketPrices[0]!

        // 1. User books TAKEAWAY (creates USER_BOOKED audit)
        const desiredOrder = OrderFactory.createBookingOrder(
            inhabitant.id,
            dinnerEvent.id,
            ticketPrice.id!,
            DinnerMode.TAKEAWAY
        )
        await OrderFactory.scaffoldOrders(context, {
            householdId: household.id,
            seasonId: season.id!,
            dinnerEventIds: [dinnerEvent.id],
            orders: [desiredOrder]
        })

        const ordersAfterBook = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEvent.id)
        const userOrder = ordersAfterBook.find(o => o.inhabitantId === inhabitant.id)!
        expect(userOrder.dinnerMode).toBe(DinnerMode.TAKEAWAY)

        // 2. Simulate bug: scaffolder overwrote to DINEIN
        await OrderFactory.updateOrder(context, userOrder.id, {dinnerMode: DinnerMode.DINEIN})
        const buggedOrder = await OrderFactory.getOrder(context, userOrder.id)
        expect(buggedOrder?.dinnerMode).toBe(DinnerMode.DINEIN)

        // 3. DRY RUN: count how many need healing
        const dryRunResponse = await context.request.post(
            `/api/admin/maintenance/heal-user-bookings?dryRun=true&householdId=${household.id}`
        )
        expect(dryRunResponse.status()).toBe(200)
        const dryRunResult = await dryRunResponse.json()

        expect(dryRunResult.dryRun).toBe(true)
        expect(dryRunResult.toHeal.length).toBe(1)
        expect(dryRunResult.toHeal[0].issue).toBe('mode_changed')
        expect(dryRunResult.toHeal[0].originalMode).toBe(DinnerMode.TAKEAWAY)
        expect(dryRunResult.toHeal[0].currentMode).toBe(DinnerMode.DINEIN)
        expect(dryRunResult.healed).toBe(0) // Dry run doesn't heal

        // Verify order still bugged (dry run didn't change it)
        const stillBugged = await OrderFactory.getOrder(context, userOrder.id)
        expect(stillBugged?.dinnerMode).toBe(DinnerMode.DINEIN)

        // 4. EXECUTE: heal the orders
        const healResponse = await context.request.post(
            `/api/admin/maintenance/heal-user-bookings?dryRun=false&householdId=${household.id}`
        )
        expect(healResponse.status()).toBe(200)
        const healResult = await healResponse.json()

        expect(healResult.dryRun).toBe(false)
        expect(healResult.toHeal.length).toBe(1)
        expect(healResult.healed).toBeGreaterThan(0)

        // 5. VERIFY: order restored to original mode
        const healedOrder = await OrderFactory.getOrder(context, userOrder.id)
        expect(healedOrder?.dinnerMode).toBe(DinnerMode.TAKEAWAY)
        expect(healedOrder?.state).toBe(OrderState.BOOKED)

        // 6. VERIFY: dry run now shows nothing to heal
        const verifyResponse = await context.request.post(
            `/api/admin/maintenance/heal-user-bookings?dryRun=true&householdId=${household.id}`
        )
        const verifyResult = await verifyResponse.json()
        expect(verifyResult.toHeal.length).toBe(0)
    })
})
