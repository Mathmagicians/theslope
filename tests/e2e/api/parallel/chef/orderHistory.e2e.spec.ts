import {test, expect} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation, type TicketChangeKind} from '~/composables/useBookingValidation'
import {useTicketPriceValidation, type TicketPrice} from '~/composables/useTicketPriceValidation'
import {useHousehold} from '~/composables/useHousehold'
import testHelpers from '~~/tests/e2e/testHelpers'

/**
 * `/api/chef/dinner/[id]/order-history`: the dinner's ticket changes replayed from its order history, newest first.
 * The member's household books an adult and a guest child, releases the child after the booking deadline and the
 * admin's household buys it: the tickets, kuverter and revenue paid for stand still through the release and the sale,
 * and each line carries its actor and its ticket events; `since` keeps the changes from a moment and counts the older
 * ones. The setup books through the admin's bypass, so its bookings read as the admin's correction.
 */
const {validatedBrowserContext, memberValidatedBrowserContext, temporaryAndRandom, getSessionUserInfo, daysFromNow} = testHelpers
const {TicketChangeKindSchema, OrderStateSchema, DinnerModeSchema, OrderAuditSourceSchema} = useBookingValidation()
const {TicketTypeSchema} = useTicketPriceValidation()
const {formatNameWithInitials} = useHousehold()
const Kind = TicketChangeKindSchema.enum
const CORRECTION = OrderAuditSourceSchema.enum['admin-correction']
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
        // One actor's rows in one minute are one line, so the admin's booking and purchase may share a line: the tickets
        // per event add up across the lines, whichever minute each row fell in
        const ticketsOf = (kind: TicketChangeKind) => response.changes.flatMap(change => change.events)
            .filter(event => event.change === kind)
            .reduce((sum, event) => ticketCounts(...TicketTypeSchema.options.map(type => sum[type] + event.tickets[type]) as [number, number, number]), ticketCounts(0, 0, 0))
        expect(ticketsOf(Kind.BOOK)).toEqual(ticketCounts(1, 1, 0))
        expect(ticketsOf(Kind.RELEASE)).toEqual(ticketCounts(0, 1, 0))
        expect(ticketsOf(Kind.BUY)).toEqual(ticketCounts(0, 1, 0))
        // The release and the sale leave the tickets, kuverter and revenue paid for unchanged
        for (const change of response.changes) {
            expect(change).toMatchObject({counts: ticketCounts(1, 1, 0), portions: adultPortions + childPortions, revenue})
        }
        // The release names the seller's household, the sale the buyer's; the admin's booking and purchase may share a line
        const lineOf = (kind: TicketChangeKind) => response.changes.find(change => change.events.some(event => event.change === kind))!
        const member = await getSessionUserInfo(memberContext)
        expect(lineOf(Kind.RELEASE).households).toEqual([member.householdShortname])
        // The member released on their own: the line names them as the booking page names a person
        expect(lineOf(Kind.RELEASE).performedByName).toBe(formatNameWithInitials(released!.inhabitant))
        expect(lineOf(Kind.BUY).households).toContain(admin.householdShortname)
        // The sale names the household it bought from
        expect(lineOf(Kind.BUY).events.find(event => event.change === Kind.BUY)!.seller).toBe(member.householdShortname)

        const release = lineOf(Kind.RELEASE)
        const sinceRelease = (await OrderFactory.getTicketChanges(memberContext, dinnerEventId, release.timestamp))!
        expect(sinceRelease.changes.map(change => change.id)).toContain(release.id)
        expect(sinceRelease.changes.length + sinceRelease.olderCount).toBe(response.changes.length)
    })

    test('GIVEN the admin\'s booking past the deadline and the member\'s release of its child ticket WHEN the admin deletes the ticket THEN the booking and the deletion read as the admin\'s correction, the release as the member\'s own, and the newest line holds one child ticket fewer', async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const member = await getSessionUserInfo(memberContext)
        // Its own dinner tomorrow, past the booking deadline: the first case expects every line at one adult and one child
        const dinner = await DinnerEventFactory.createDinnerEvent(adminContext, {
            ...DinnerEventFactory.defaultDinnerEvent(temporaryAndRandom()), seasonId, date: daysFromNow(1)
        })
        const result = await OrderFactory.createOrder(adminContext, {
            householdId: member.householdId, dinnerEventId: dinner.id!,
            orders: [
                {inhabitantId: member.inhabitantId, ticketPriceId: adultPrice.id, dinnerMode: DinnerModeSchema.enum.DINEIN, isGuestTicket: false},
                {inhabitantId: member.inhabitantId, ticketPriceId: childPrice.id, dinnerMode: DinnerModeSchema.enum.DINEIN, isGuestTicket: true}
            ]
        })
        orderIds.push(...result!.createdIds)
        const childOrderId = result!.createdIds[1]!

        const released = await OrderFactory.updateOrder(memberContext, childOrderId, {dinnerMode: DinnerModeSchema.enum.NONE})
        expect(released!.state).toBe(OrderStateSchema.enum.RELEASED)
        await OrderFactory.deleteOrder(adminContext, childOrderId)

        const {changes} = (await OrderFactory.getTicketChanges(memberContext, dinner.id!))!
        // The admin's booking and deletion may share a line within one minute; the newest line ends with the deletion
        expect(changes[0]!.events).toContainEqual({change: Kind.CANCEL, tickets: ticketCounts(0, 1, 0), reason: CORRECTION})
        expect(changes[0]!.counts).toEqual(ticketCounts(1, 0, 0))
        expect(changes.flatMap(change => change.events)).toContainEqual({change: Kind.BOOK, tickets: ticketCounts(1, 1, 0), reason: CORRECTION})
        const releaseLine = changes.find(change => change.events.some(event => event.change === Kind.RELEASE))!
        expect(releaseLine.counts).toEqual(ticketCounts(1, 1, 0))
        expect(releaseLine.events.find(event => event.change === Kind.RELEASE)!.reason).toBeUndefined()
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
