import {test, expect} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'

const {validatedBrowserContext, memberValidatedBrowserContext, salt, temporaryAndRandom, daysFromNow, getSessionUserInfo} = testHelpers
const {TicketTypeSchema} = useTicketPriceValidation()
const TicketType = TicketTypeSchema.enum

/**
 * GET /api/order/waitlist: every entry of the asked dinners in queue order, readable by every member. Two inhabitants
 * of the admin's household join through the scaffold on a dinner past its booking deadline (scaffold.e2e.spec.ts
 * covers the queue writes and the order they read in).
 */
test.describe('Waiting list entries API', () => {
    const createdSeasonIds: number[] = []
    const inhabitantIds: number[] = []
    let seasonId: number
    let dinnerEventId: number

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const season = await SeasonFactory.createSeason(context)
        createdSeasonIds.push(season.id!)
        seasonId = season.id!
        const adultPrice = season.ticketPrices.find(price => price.ticketType === TicketType.ADULT)!
        const childPrice = season.ticketPrices.find(price => price.ticketType === TicketType.CHILD)!
        // Two days ahead: past the booking deadline, so a wish without a ticket for sale queues
        const dinner = await DinnerEventFactory.createDinnerEvent(context, {
            date: daysFromNow(2), menuTitle: salt('Ventelistemiddag', testSalt), seasonId
        })
        dinnerEventId = dinner.id!
        const householdId = (await getSessionUserInfo(context)).householdId
        for (const [lastName, price] of [['Venter Et', adultPrice], ['Venter To', childPrice]] as const) {
            const inhabitant = await HouseholdFactory.createInhabitantWithConfig(context, householdId, {
                name: salt('Anders', testSalt), lastName, birthDate: null
            })
            inhabitantIds.push(inhabitant.id)
            await WaitlistFactory.queue(context, householdId, seasonId, OrderFactory.createBookingOrder(inhabitant.id, dinnerEventId, price.id!))
        }
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const id of inhabitantIds) await HouseholdFactory.deleteInhabitant(context, id)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('GIVEN a member of another household WHEN reading the dinner\'s queue THEN the entries are readable', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)

        const entries = await WaitlistFactory.entries(memberContext, [dinnerEventId])

        expect(entries.map(entry => entry.inhabitantId)).toEqual(inhabitantIds)
    })

    test('GIVEN a dinner without a queue WHEN reading it beside one with a queue THEN only the queued dinner has entries', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const emptyDinner = await DinnerEventFactory.createDinnerEvent(context, {
            date: daysFromNow(3), menuTitle: salt('Tom venteliste', temporaryAndRandom()), seasonId
        })

        const entries = await WaitlistFactory.entries(context, [dinnerEventId, emptyDinner.id!])

        expect(new Set(entries.map(entry => entry.dinnerEventId))).toEqual(new Set([dinnerEventId]))
    })

    test('GIVEN no dinner id WHEN reading the queue THEN no entries', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        expect(await WaitlistFactory.entries(context, [])).toEqual([])
    })
})
