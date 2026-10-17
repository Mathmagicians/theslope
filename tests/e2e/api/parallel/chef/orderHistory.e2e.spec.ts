import {test, expect} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTicketPriceValidation, type TicketPrice} from '~/composables/useTicketPriceValidation'
import testHelpers from '~~/tests/e2e/testHelpers'

/**
 * `/api/chef/dinner/[id]/order-history`: the dinner's ticket changes replayed from its order history, newest first.
 * The member's household books an adult and a guest child, releases the child after the booking deadline and the
 * admin's household buys it: the tickets, kuverter and revenue paid for stand still through the release and the sale,
 * and each line carries its ticket events; `since` keeps the changes from a moment and counts the older ones.
 */
const {validatedBrowserContext, memberValidatedBrowserContext, temporaryAndRandom, getSessionUserInfo} = testHelpers
const {TicketChangeKindSchema, OrderStateSchema, DinnerModeSchema} = useBookingValidation()
const {TicketTypeSchema} = useTicketPriceValidation()
const Kind = TicketChangeKindSchema.enum
const {ticketCounts} = OrderFactory

test.describe('Chef dinner order history', () => {
    let seasonId: number
    let dinnerEventId: number
    const seasonIds: number[] = []
    const orderIds: number[] = []
    // A saved season price: its id is set
    type SavedPrice = TicketPrice & {id: number}
    const saved = (price: TicketPrice | undefined): SavedPrice => {
        if (!price?.id) throw new Error('Test setup: the season holds no saved price of that type')
        return {...price, id: price.id}
    }
    let adultPrice: SavedPrice
    let childPrice: SavedPrice

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const season = await SeasonFactory.createSeason(adminContext)
        seasonId = season.id!
        seasonIds.push(seasonId)
        adultPrice = saved(season.ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.ADULT))
        childPrice = saved(season.ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.CHILD))

        const member = await getSessionUserInfo(memberContext)
        // Tomorrow: inside the cancellation deadline, so a release keeps the ticket paid instead of deleting it
        const {dinner} = await SeasonFactory.createCookingTeamWithChefAndDinner(adminContext, season, member.inhabitantId, {teamName: 'Historikhold'})
        dinnerEventId = dinner.id!

        // The member's own household, so the member can release without a bypass; the child ticket is a guest ticket
        const result = await OrderFactory.createOrder(adminContext, {
            householdId: member.householdId, dinnerEventId,
            orders: [
                {inhabitantId: member.inhabitantId, ticketPriceId: adultPrice.id, dinnerMode: DinnerModeSchema.enum.DINEIN, isGuestTicket: false},
                {inhabitantId: member.inhabitantId, ticketPriceId: childPrice.id, dinnerMode: DinnerModeSchema.enum.DINEIN, isGuestTicket: true}
            ]
        })
        orderIds.push(...result!.createdIds)
    })

    test.afterAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        await OrderFactory.cleanupOrders(adminContext, orderIds)
        await SeasonFactory.cleanupSeasons(adminContext, seasonIds)
    })

    test('GIVEN two bookings, a release and a claim WHEN reading the changes THEN they come newest first with the tickets, kuverter and revenue after each', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const childOrderId = orderIds[1]!

        // Dining mode NONE after the cancellation deadline releases the ticket instead of deleting it
        const released = await OrderFactory.updateOrder(memberContext, childOrderId, {dinnerMode: DinnerModeSchema.enum.NONE})
        expect(released!.state, 'the dinner sits inside the deadline, so the ticket is released, not deleted').toBe(OrderStateSchema.enum.RELEASED)
        const admin = await getSessionUserInfo(adminContext)
        const claimed = await OrderFactory.scaffoldOrders(adminContext, {
            householdId: admin.householdId, seasonId, dinnerEventIds: [dinnerEventId],
            orders: [OrderFactory.createBookingOrder(admin.inhabitantId, dinnerEventId, childPrice.id)]
        })
        expect(claimed!.scaffoldResult.totals[useBookingValidation().BookingActionSchema.enum.BUY]).toBe(1)

        const response = (await OrderFactory.getTicketChanges(memberContext, dinnerEventId))!
        const adultPortions = adultPrice.portions
        const childPortions = childPrice.portions
        const revenue = adultPrice.price + childPrice.price

        expect(response.olderCount).toBe(0)
        // The two bookings by one user within one minute are one line
        expect(response.changes.map(change => change.events)).toEqual([
            [{change: Kind.BUY, tickets: ticketCounts(0, 1, 0)}],
            [{change: Kind.RELEASE, tickets: ticketCounts(0, 1, 0)}],
            [{change: Kind.BOOK, tickets: ticketCounts(1, 1, 0)}]
        ])
        for (const change of response.changes) {
            expect(change).toMatchObject({counts: ticketCounts(1, 1, 0), portions: adultPortions + childPortions, revenue})
        }
        const [claim, release] = response.changes
        expect(response.changes.every(change => change.households.length === 1)).toBe(true)

        const sinceRelease = await OrderFactory.getTicketChanges(memberContext, dinnerEventId, release!.timestamp)
        expect(sinceRelease!.changes.map(change => change.id)).toEqual([claim!.id, release!.id])
        expect(sinceRelease!.olderCount).toBe(1)
    })

    test('GIVEN a removed dinner WHEN reading the changes THEN 404', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const removed = await DinnerEventFactory.createDinnerEvent(adminContext, {
            ...DinnerEventFactory.defaultDinnerEvent(temporaryAndRandom()), seasonId
        })
        await DinnerEventFactory.deleteDinnerEvent(adminContext, removed.id!, 200)
        await OrderFactory.getTicketChanges(memberContext, removed.id!, undefined, 404)
    })
})
