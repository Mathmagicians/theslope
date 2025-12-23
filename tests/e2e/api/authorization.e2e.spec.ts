import { test, expect } from '@playwright/test'
import { SeasonFactory } from '../testDataFactories/seasonFactory'
import { HouseholdFactory } from '../testDataFactories/householdFactory'
import { OrderFactory } from '../testDataFactories/orderFactory'
import testHelpers from '../testHelpers'

const { validatedBrowserContext, temporaryAndRandom, salt } = testHelpers

// Admin user belongs to household id=1 (from seed.sql)
const ADMIN_HOUSEHOLD_ID = 1
const ADMIN_INHABITANT_ID = 1

test.describe('Authorization Middleware', () => {

    test('GIVEN admin user WHEN mutating admin endpoint THEN succeeds', async ({ browser }) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const season = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))
        expect(season.id).toBeDefined()

        await SeasonFactory.deleteSeason(context, season.id!)
    })

    test('GIVEN admin user WHEN creating order for own household THEN succeeds', async ({ browser }) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const season = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))
        expect(season.ticketPrices.length).toBeGreaterThan(0)
        const ticketPriceId = season.ticketPrices[0].id!

        const dinnerEvent = await SeasonFactory.createDinnerEventForSeason(context, season.id!)

        const result = await OrderFactory.createOrder(context, {
            householdId: ADMIN_HOUSEHOLD_ID,
            dinnerEventId: dinnerEvent.id,
            orders: [{
                inhabitantId: ADMIN_INHABITANT_ID,
                ticketPriceId,
                dinnerMode: 'DINEIN'
            }]
        }, 201)

        expect(result.createdIds.length).toBe(1)

        await OrderFactory.cleanupOrders(context, result.createdIds)
        await SeasonFactory.deleteSeason(context, season.id!)
    })

    test('GIVEN admin user WHEN creating order for different household THEN returns 403', async ({ browser }) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()

        const season = await SeasonFactory.createSeason(context, SeasonFactory.defaultSeason(testSalt))
        const ticketPriceId = season.ticketPrices[0].id!

        const dinnerEvent = await SeasonFactory.createDinnerEventForSeason(context, season.id!)

        const otherHousehold = await HouseholdFactory.createHousehold(context, {
            name: salt('OtherHousehold', testSalt)
        })
        const otherInhabitant = await HouseholdFactory.createInhabitantForHousehold(
            context,
            otherHousehold.id,
            salt('OtherInhabitant', testSalt)
        )

        await OrderFactory.createOrder(context, {
            householdId: otherHousehold.id,
            dinnerEventId: dinnerEvent.id,
            orders: [{
                inhabitantId: otherInhabitant.id,
                ticketPriceId,
                dinnerMode: 'DINEIN'
            }]
        }, 403)

        await HouseholdFactory.deleteHousehold(context, otherHousehold.id)
        await SeasonFactory.deleteSeason(context, season.id!)
    })
})
