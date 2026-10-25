import {test, expect} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'

const {validatedBrowserContext, memberValidatedBrowserContext, salt, temporaryAndRandom, daysFromNow, getSessionUserInfo} = testHelpers
const {TicketTypeSchema} = useTicketPriceValidation()
const TicketType = TicketTypeSchema.enum
const {BookingActionSchema, DinnerModeSchema} = useBookingValidation()
const Action = BookingActionSchema.enum
const DinnerMode = DinnerModeSchema.enum

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

/**
 * Hele familien Ingen on a closed dinner through POST /api/household/order/scaffold: the save the power row sends releases
 * the household's ticket and leaves its guest's place in one run, so the run's closing sale serves the next household
 * in the ticket type's line.
 */
test.describe('Power mode Ingen on a dinner where the household waits for a guest', () => {
    const createdSeasonIds: number[] = []
    const inhabitantIds: number[] = []

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const id of inhabitantIds) await HouseholdFactory.deleteInhabitant(context, id)
        await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
    })

    test('GIVEN a household holding an adult ticket with its adult guest first in line and another household behind WHEN power mode saves Ingen THEN the guest leaves the line, the ticket is released and the other household buys it', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const season = await SeasonFactory.createSeason(context)
        createdSeasonIds.push(season.id!)
        const adultPriceId = season.ticketPrices.find(price => price.ticketType === TicketType.ADULT)!.id!
        // Two days ahead: past the booking deadline, so the wishes queue and Ingen releases
        const dinnerEventId = (await DinnerEventFactory.createDinnerEvent(context, {
            date: daysFromNow(2), menuTitle: salt('Hele familien Ingen', testSalt), seasonId: season.id!
        })).id!
        const householdId = (await getSessionUserInfo(context)).householdId
        const holder = await HouseholdFactory.createInhabitantWithConfig(context, householdId, {
            name: salt('Anders', testSalt), lastName: 'Billetholder', birthDate: null
        })
        inhabitantIds.push(holder.id)
        const created = await OrderFactory.createOrder(context, {
            householdId, dinnerEventId, orders: [OrderFactory.defaultOrderItem({inhabitantId: holder.id, ticketPriceId: adultPriceId})]
        })
        const ticketId = created!.createdIds[0]!
        await WaitlistFactory.queue(context, householdId, season.id!, OrderFactory.createGuestOrder(holder.id, dinnerEventId, adultPriceId))
        const member = await getSessionUserInfo(memberContext)
        await WaitlistFactory.queue(memberContext, member.householdId, season.id!, OrderFactory.createBookingOrder(member.inhabitantId, dinnerEventId, adultPriceId))
        const [guestEntry, memberEntry] = await WaitlistFactory.entries(context, [dinnerEventId])
        expect([guestEntry?.isGuestTicket, memberEntry?.inhabitantId]).toEqual([true, member.inhabitantId])

        // The power row's Ingen: the holder's ticket released and the guest's place named to leave
        const response = await OrderFactory.scaffoldOrders(context, {
            householdId, seasonId: season.id!, dinnerEventIds: [dinnerEventId], orders: [
                OrderFactory.createBookingOrder(holder.id, dinnerEventId, adultPriceId, DinnerMode.NONE, ticketId),
                WaitlistFactory.wishOf(guestEntry!, {dinnerMode: DinnerMode.NONE})
            ]
        })
        const result = response!.scaffoldResult

        expect(result.totals).toMatchObject({[Action.RELEASE]: 1, [Action.LEAVE]: 1})
        expect(result.outcomes.waitlistTicketsSold).toEqual([{
            dinnerEventId, ticketPriceId: adultPriceId, orderId: ticketId, dinnerMode: memberEntry!.order.dinnerMode, isGuestTicket: false,
            buyerInhabitantId: member.inhabitantId, buyerHouseholdId: member.householdId, sellerHouseholdId: householdId, sellerInhabitantId: holder.id
        }])
        expect((await OrderFactory.getOrder(context, ticketId))?.inhabitantId).toBe(member.inhabitantId)
        expect(await WaitlistFactory.entries(context, [dinnerEventId])).toEqual([])
    })
})
