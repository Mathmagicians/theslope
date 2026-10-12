import {test, expect} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

const {validatedBrowserContext, memberValidatedBrowserContext, salt, temporaryAndRandom, daysFromNow, getSessionUserInfo} = testHelpers
const {TicketTypeSchema} = useTicketPriceValidation()
const TicketType = TicketTypeSchema.enum

/**
 * GET /api/order/waitlist: every entry of the asked dinners in queue order, readable by every member. Two inhabitants
 * of the admin's household join through the scaffold on a dinner past its booking deadline (scaffold.e2e.spec.ts
 * covers the queue writes).
 */
test.describe('Waiting list entries API', () => {
    let seasonId: number
    let dinnerEventId: number
    let householdId: number
    let inhabitants: InhabitantDisplay[]
    let adultPrice: TicketPrice
    let childPrice: TicketPrice

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const season = await SeasonFactory.createSeason(context)
        seasonId = season.id!
        adultPrice = season.ticketPrices.find(price => price.ticketType === TicketType.ADULT)!
        childPrice = season.ticketPrices.find(price => price.ticketType === TicketType.CHILD)!
        // Two days ahead: past the booking deadline, so a wish without a ticket for sale queues
        const dinner = await DinnerEventFactory.createDinnerEvent(context, {
            date: daysFromNow(2), menuTitle: salt('Ventelistemiddag', testSalt), seasonId
        })
        dinnerEventId = dinner.id!
        householdId = (await getSessionUserInfo(context)).householdId
        inhabitants = [
            await HouseholdFactory.createInhabitantForHousehold(context, householdId, salt('Venter Et', testSalt)),
            await HouseholdFactory.createInhabitantForHousehold(context, householdId, salt('Venter To', testSalt))
        ]
        for (const [index, price] of [adultPrice, childPrice].entries()) {
            await WaitlistFactory.queue(context, householdId, seasonId, OrderFactory.createBookingOrder(inhabitants[index]!.id!, dinnerEventId, price.id!))
        }
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const inhabitant of inhabitants) await HouseholdFactory.deleteInhabitant(context, inhabitant.id!)
        await SeasonFactory.deleteSeason(context, seasonId).catch(() => undefined)
    })

    test('GIVEN two entries WHEN reading the dinner\'s queue THEN both read in join order with the household and the frozen price', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const entries = await WaitlistFactory.entries(context, [dinnerEventId])

        expect(entries.map(entry => [entry.inhabitantId, entry.order.householdId, entry.order.priceAtBooking])).toEqual([
            [inhabitants[0]!.id, householdId, adultPrice.price],
            [inhabitants[1]!.id, householdId, childPrice.price]
        ])
    })

    test('GIVEN a member of another household WHEN reading the dinner\'s queue THEN the entries are readable', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)

        const entries = await WaitlistFactory.entries(memberContext, [dinnerEventId])

        expect(entries.map(entry => entry.inhabitantId)).toEqual(inhabitants.map(inhabitant => inhabitant.id))
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
