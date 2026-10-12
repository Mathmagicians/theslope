import {test, expect} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {getPortionsForTicketType} from '~/utils/portions'
import testHelpers from '~~/tests/e2e/testHelpers'

/**
 * `/api/chef/dinner/[id]/order-history`: the dinner's ticket changes replayed from its order history, newest first.
 * The member's household books an adult and a guest child, releases the child after the booking deadline and the
 * admin's household claims it: tickets and revenue stand still through release and claim while the kuverter follow the
 * eaters; `since` keeps the changes from a moment and counts the older ones.
 */
const {validatedBrowserContext, memberValidatedBrowserContext, salt, temporaryAndRandom, getSessionUserInfo} = testHelpers
const {OrderAuditActionSchema, OrderStateSchema, DinnerModeSchema} = useBookingValidation()
const {TicketTypeSchema} = useTicketPriceValidation()
const {TeamRoleSchema} = useCookingTeamValidation()
const Action = OrderAuditActionSchema.enum
const UNKNOWN_ID = 999999999

test.describe('Chef dinner order history', () => {
    let seasonId: number
    let dinnerEventId: number
    const orderIds: number[] = []
    let adultPrice: {id: number, price: number}
    let childPrice: {id: number, price: number}

    test.beforeAll(async ({browser}) => {
        const adminContext = await validatedBrowserContext(browser)
        const memberContext = await memberValidatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const season = await SeasonFactory.createSeason(adminContext)
        seasonId = season.id!
        adultPrice = season.ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.ADULT)! as {id: number, price: number}
        childPrice = season.ticketPrices.find(price => price.ticketType === TicketTypeSchema.enum.CHILD)! as {id: number, price: number}

        const member = await getSessionUserInfo(memberContext)
        const team = await SeasonFactory.createCookingTeamForSeason(adminContext, seasonId, salt('Historikhold', testSalt))
        await SeasonFactory.assignMemberToTeam(adminContext, team.id!, member.inhabitantId, TeamRoleSchema.enum.CHEF)
        // Tomorrow: inside the cancellation deadline, so a release keeps the ticket paid instead of deleting it
        const dinner = await DinnerEventFactory.createDinnerEvent(adminContext, {
            ...DinnerEventFactory.defaultDinnerEvent(testSalt), seasonId, cookingTeamId: team.id!, chefId: member.inhabitantId
        })
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
        await SeasonFactory.cleanupSeasons(adminContext, [seasonId])
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
        expect(claimed!.scaffoldResult.claimed).toBe(1)

        const response = (await OrderFactory.getTicketChanges(memberContext, dinnerEventId))!
        const adultPortions = getPortionsForTicketType(TicketTypeSchema.enum.ADULT)
        const childPortions = getPortionsForTicketType(TicketTypeSchema.enum.CHILD)
        const revenue = adultPrice.price + childPrice.price

        expect(response.olderCount).toBe(0)
        // The two bookings of one household within one minute are one row
        expect(response.changes.map(change => change.action)).toEqual([Action.USER_CLAIMED, Action.USER_CANCELLED, Action.USER_BOOKED])
        const [claim, release, booking] = response.changes
        expect(claim).toMatchObject({ticketType: TicketTypeSchema.enum.CHILD, counts: {ADULT: 1, CHILD: 1, BABY: 0}, portions: adultPortions + childPortions, revenue})
        expect(release).toMatchObject({ticketType: TicketTypeSchema.enum.CHILD, delta: {ADULT: 0, CHILD: 0, BABY: 0}, counts: {ADULT: 1, CHILD: 1, BABY: 0}, portions: adultPortions, revenue})
        expect(booking).toMatchObject({delta: {ADULT: 1, CHILD: 1, BABY: 0}, counts: {ADULT: 1, CHILD: 1, BABY: 0}})
        expect(response.changes.every(change => change.householdShortname !== null)).toBe(true)

        const sinceRelease = await OrderFactory.getTicketChanges(memberContext, dinnerEventId, release!.timestamp)
        expect(sinceRelease!.changes.map(change => change.id)).toEqual([claim!.id, release!.id])
        expect(sinceRelease!.olderCount).toBe(1)
    })

    test('GIVEN an unknown dinner WHEN reading the changes THEN 404', async ({browser}) => {
        const memberContext = await memberValidatedBrowserContext(browser)
        await OrderFactory.getTicketChanges(memberContext, UNKNOWN_ID, undefined, 404)
    })
})
