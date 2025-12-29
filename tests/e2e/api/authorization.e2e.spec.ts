import { test, expect } from '@playwright/test'
import { SeasonFactory } from '../testDataFactories/seasonFactory'
import { HouseholdFactory } from '../testDataFactories/householdFactory'
import { OrderFactory } from '../testDataFactories/orderFactory'
import testHelpers from '../testHelpers'

const { validatedBrowserContext, temporaryAndRandom, salt, getSessionUserInfo } = testHelpers

test.describe('Authorization Middleware', () => {
    // Track resources for cleanup
    const createdSeasonIds: number[] = []
    const createdOrderIds: number[] = []
    const createdHouseholdIds: number[] = []

    test.afterAll(async ({ browser }) => {
        const context = await validatedBrowserContext(browser)
        await OrderFactory.cleanupOrders(context, createdOrderIds)
        for (const id of createdHouseholdIds) {
            await HouseholdFactory.deleteHousehold(context, id).catch(() => {})
        }
        for (const id of createdSeasonIds) {
            await SeasonFactory.deleteSeason(context, id).catch(() => {})
        }
    })

    test('GIVEN admin user WHEN mutating admin endpoint THEN succeeds', async ({ browser }) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const season = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))
        createdSeasonIds.push(season.id!)
        expect(season.id).toBeDefined()
    })

    test('GIVEN admin user WHEN creating order for own household THEN succeeds', async ({ browser }) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        // Get user's actual household from session (not hardcoded)
        const { householdId, inhabitantId } = await getSessionUserInfo(context)

        const season = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))
        createdSeasonIds.push(season.id!)
        expect(season.ticketPrices.length).toBeGreaterThan(0)
        const ticketPriceId = season.ticketPrices[0]!.id!

        const dinnerEvent = await SeasonFactory.createDinnerEventForSeason(context, season.id!)

        const result = await OrderFactory.createOrder(context, {
            householdId,
            dinnerEventId: dinnerEvent.id,
            orders: [OrderFactory.defaultOrderItem({ inhabitantId, ticketPriceId })]
        }, 201)

        expect(result).not.toBeNull()
        expect(result!.createdIds.length).toBe(1)
        createdOrderIds.push(...result!.createdIds)
    })

    test('GIVEN admin user WHEN creating order for different household THEN returns 403', async ({ browser }) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const season = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))
        createdSeasonIds.push(season.id!)
        const ticketPriceId = season.ticketPrices[0]!.id!

        const dinnerEvent = await SeasonFactory.createDinnerEventForSeason(context, season.id!)

        const otherHousehold = await HouseholdFactory.createHousehold(context, {
            name: salt('OtherHousehold', testSalt)
        })
        createdHouseholdIds.push(otherHousehold.id)

        const otherInhabitant = await HouseholdFactory.createInhabitantForHousehold(
            context,
            otherHousehold.id,
            salt('OtherInhabitant', testSalt)
        )

        await OrderFactory.createOrder(context, {
            householdId: otherHousehold.id,
            dinnerEventId: dinnerEvent.id,
            orders: [OrderFactory.defaultOrderItem({ inhabitantId: otherInhabitant.id, ticketPriceId })]
        }, 403)
    })
})
