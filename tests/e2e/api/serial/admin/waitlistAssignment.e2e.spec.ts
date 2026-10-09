import {test, expect} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {InhabitantDisplay} from '~/composables/useCoreValidation'

const {validatedBrowserContext, salt, temporaryAndRandom, getSessionUserInfo, daysFromNow} = testHelpers
const {TicketTypeSchema} = useTicketPriceValidation()
const TicketType = TicketTypeSchema.enum
const {TeamRoleSchema} = useCookingTeamValidation()

/**
 * The chef releases portions on a sold-out dinner of the active season: the queue is served in strict FIFO, each
 * entry's order lands at the price written at join, a second release assigns the rest, and a consumed dinner's
 * queue is cleared by the daily maintenance. Serial: it books on the active season and runs the maintenance job.
 */
test.describe('Waiting list assignment', () => {
    let teamId: number
    let dinnerEventId: number
    let activeSeasonId: number
    let adminInhabitantId: number
    const dinnerIds: number[] = []
    let householdId: number
    let inhabitants: InhabitantDisplay[]
    let adultPrice: TicketPrice
    let childPrice: TicketPrice
    const entryIds: number[] = []
    // The admin acts for the test household, which is not its own
    const join = (context: Parameters<typeof WaitlistFactory.join>[0], request: Parameters<typeof WaitlistFactory.join>[1], expectedStatus = 201) =>
        WaitlistFactory.join(context, request, expectedStatus, true)
    const householdEntries = (context: Parameters<typeof WaitlistFactory.entriesForHousehold>[0]) =>
        WaitlistFactory.entriesForHousehold(context, householdId, [dinnerEventId], true)
    const orderIds: number[] = []

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const activeSeason = await SeasonFactory.createActiveSeason(context)
        adultPrice = activeSeason.ticketPrices.find(price => price.ticketType === TicketType.ADULT)!
        childPrice = activeSeason.ticketPrices.find(price => price.ticketType === TicketType.CHILD)!
        activeSeasonId = activeSeason.id!
        adminInhabitantId = (await getSessionUserInfo(context)).inhabitantId
        const team = await SeasonFactory.createCookingTeamForSeason(context, activeSeason.id!, salt('Ventelistehold', testSalt))
        teamId = team.id!
        await SeasonFactory.assignMemberToTeam(context, teamId, adminInhabitantId, TeamRoleSchema.enum.CHEF)
        const dinners = await DinnerEventFactory.getDinnerEventsForSeason(context, activeSeason.id!)
        const futureDinner = dinners.find(dinner => new Date(dinner.date) > new Date())
        expect(futureDinner, 'the active season has a future dinner').toBeDefined()
        const dinner = await DinnerEventFactory.createDinnerEvent(context, {
            date: new Date(futureDinner!.date), menuTitle: salt('Ventelistemiddag', testSalt), seasonId: activeSeason.id!, cookingTeamId: teamId, chefId: adminInhabitantId
        })
        dinnerEventId = dinner.id!
        dinnerIds.push(dinnerEventId)
        const created = await HouseholdFactory.createHouseholdWithInhabitants(context, {address: salt('Ventelistevej 2', testSalt)}, 4)
        householdId = created.household.id
        inhabitants = created.inhabitants
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await WaitlistFactory.cleanupEntries(context, entryIds)
        await OrderFactory.cleanupOrders(context, orderIds)
        await HouseholdFactory.deleteHousehold(context, householdId).catch(() => undefined)
        for (const id of dinnerIds) await DinnerEventFactory.deleteDinnerEvent(context, id).catch(() => undefined)
        await SeasonFactory.deleteCookingTeam(context, teamId).catch(() => undefined)
    })

    test('GIVEN voksen, barn, voksen, barn in the queue WHEN the chef releases 2.5 portions THEN the first three get their tickets and the last barn waits', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const types = [adultPrice, childPrice, adultPrice, childPrice]
        for (const [index, price] of types.entries()) {
            const joined = await join(context, WaitlistFactory.defaultJoinRequest({
                householdId, dinnerEventId, inhabitantId: inhabitants[index]!.id!, ticketPriceId: price.id!
            }))
            entryIds.push(joined!.id)
            expect(joined!.position).toBe(index + 1)
        }

        const result = await WaitlistFactory.releasePortions(context, dinnerEventId, 2.5)
        orderIds.push(...result!.assigned.map(assigned => assigned.orderId))

        expect(result!.assigned.map(assigned => assigned.inhabitantId)).toEqual(inhabitants.slice(0, 3).map(inhabitant => inhabitant.id))
        expect(result!.assigned.map(assigned => assigned.portions)).toEqual([1, 0.5, 1])
        expect(result!.portionsUsed).toBe(2.5)
        expect(result!.waiting).toBe(1)

        // The orders carry the price written at join
        const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, dinnerEventId)
        const placed = orders.filter(order => inhabitants.slice(0, 3).some(inhabitant => inhabitant.id === order.inhabitantId))
        expect(placed.map(order => order.priceAtBooking).sort()).toEqual([adultPrice.price, childPrice.price, adultPrice.price].sort())

        const waiting = await householdEntries(context)
        expect(waiting.map(entry => [entry.inhabitantId, entry.position])).toEqual([[inhabitants[3]!.id, 1]])
    })

    test('GIVEN one barn waiting WHEN the chef releases half a portion THEN it gets its ticket and a further release assigns nothing', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const first = await WaitlistFactory.releasePortions(context, dinnerEventId, 0.5)
        orderIds.push(...first!.assigned.map(assigned => assigned.orderId))
        expect(first!.assigned.map(assigned => assigned.inhabitantId)).toEqual([inhabitants[3]!.id])
        expect(first!.waiting).toBe(0)

        const again = await WaitlistFactory.releasePortions(context, dinnerEventId, 1)
        expect(again!.assigned).toEqual([])
        expect(again!.portionsUsed).toBe(0)
    })

    test('GIVEN an inhabitant with a ticket WHEN joining the queue again THEN the Order unique index refuses the assignment path too', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // The queue accepts the entry; the release cannot place a second regular order for the inhabitant
        const joined = await join(context, WaitlistFactory.defaultJoinRequest({
            householdId, dinnerEventId, inhabitantId: inhabitants[0]!.id!, ticketPriceId: adultPrice.id!
        }))
        entryIds.push(joined!.id)

        await WaitlistFactory.releasePortions(context, dinnerEventId, 1, 409)

        const waiting = await householdEntries(context)
        expect(waiting.map(entry => entry.id)).toEqual([joined!.id])
        await WaitlistFactory.leave(context, joined!.id, 200, true)
    })

    test('GIVEN a queue on a dinner of yesterday WHEN the daily maintenance consumes it THEN the queue is gone', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // The maintenance consumes a past dinner of the active season, and a consumed dinner has no queue
        const pastDinner = await DinnerEventFactory.createDinnerEvent(context, {
            date: daysFromNow(-1), menuTitle: salt('Gårsdagens middag', temporaryAndRandom()), seasonId: activeSeasonId, cookingTeamId: teamId, chefId: adminInhabitantId
        })
        dinnerIds.push(pastDinner.id!)
        const joined = await join(context, WaitlistFactory.defaultJoinRequest({
            householdId, dinnerEventId: pastDinner.id!, inhabitantId: inhabitants[3]!.id!, ticketPriceId: childPrice.id!, isGuestTicket: true
        }))
        entryIds.push(joined!.id)

        const maintenance = await SeasonFactory.runDailyMaintenance(context)
        expect(maintenance.consume.consumed).toBeGreaterThanOrEqual(1)

        const waiting = await WaitlistFactory.entriesForHousehold(context, householdId, [pastDinner.id!], true)
        expect(waiting).toEqual([])
    })
})
