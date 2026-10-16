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
import type {Season} from '~/composables/useSeasonValidation'
import {useCoreValidation, type InhabitantDisplay} from '~/composables/useCoreValidation'
import {useBookingValidation, type DinnerMode} from '~/composables/useBookingValidation'
const Action = useBookingValidation().BookingActionSchema.enum

const {validatedBrowserContext, salt, temporaryAndRandom, getSessionUserInfo, daysFromNow} = testHelpers
const {TicketTypeSchema} = useTicketPriceValidation()
const TicketType = TicketTypeSchema.enum
const {TeamRoleSchema} = useCookingTeamValidation()
const {createDefaultWeekdayMap} = useCoreValidation()
const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()

/**
 * The chef releases portions on a sold-out dinner of the active season: the queue is served in strict FIFO, each
 * entry's order lands at the price written at join, a second release assigns the rest, and a consumed dinner's
 * queue is cleared by the daily maintenance. A released ticket goes to the first in the line of its ticket type.
 * Serial: it books on the active season and runs the maintenance job.
 */
test.describe('Waiting list assignment', () => {
    let teamId: number
    let dinnerEventId: number
    let activeSeasonId: number
    let activeSeason: Season
    let adminInhabitantId: number
    const dinnerIds: number[] = []
    let householdId: number
    const inhabitants: InhabitantDisplay[] = []
    const teamIds: number[] = []
    let adultPrice: TicketPrice
    let childPrice: TicketPrice
    // Four inhabitants of the admin's household queue on dinners past their booking deadline
    const queue = (context: Parameters<typeof WaitlistFactory.queue>[0], order: Parameters<typeof WaitlistFactory.queue>[3]) =>
        WaitlistFactory.queue(context, householdId, activeSeasonId, order)
    const householdEntries = async (context: Parameters<typeof WaitlistFactory.entries>[0], dinnerId = dinnerEventId) =>
        (await WaitlistFactory.entries(context, [dinnerId])).filter(entry => entry.order.householdId === householdId)
    const orderIds: number[] = []
    const sellerHouseholdIds: number[] = []
    // A dinner of the active season past its booking deadline
    const dinnerPastDeadline = async (context: Parameters<typeof WaitlistFactory.queue>[0], title: string) => {
        const dinner = await DinnerEventFactory.createDinnerEvent(context, {
            date: daysFromNow(3), menuTitle: salt(title, temporaryAndRandom()), seasonId: activeSeasonId, cookingTeamId: teamId, chefId: adminInhabitantId
        })
        dinnerIds.push(dinner.id!)
        return dinner.id!
    }
    // A ticket held on a closed dinner: the admin's bypass books it past the deadline
    const holdTicket = async (context: Parameters<typeof WaitlistFactory.queue>[0], inhabitantId: number, dinnerId: number, price: TicketPrice) => {
        const booked = await WaitlistFactory.queue(context, householdId, activeSeasonId, OrderFactory.createBookingOrder(inhabitantId, dinnerId, price.id!), true)
        expect(booked.totals[Action.BOOK]).toBe(1)
        const orders = await OrderFactory.getOrders(context, {dinnerEventIds: dinnerId, householdId})
        return orders.find(order => order.inhabitantId === inhabitantId)!
    }
    let childSaleDinnerId: number

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        activeSeason = await SeasonFactory.createActiveSeason(context)
        adultPrice = activeSeason.ticketPrices.find(price => price.ticketType === TicketType.ADULT)!
        childPrice = activeSeason.ticketPrices.find(price => price.ticketType === TicketType.CHILD)!
        activeSeasonId = activeSeason.id!
        ;({inhabitantId: adminInhabitantId, householdId} = await getSessionUserInfo(context))
        const team = await SeasonFactory.createCookingTeamForSeason(context, activeSeason.id!, salt('Ventelistehold', testSalt))
        teamIds.push(team.id!)
        teamId = team.id!
        await SeasonFactory.assignMemberToTeam(context, teamId, adminInhabitantId, TeamRoleSchema.enum.CHEF)
        const dinner = await DinnerEventFactory.createDinnerEvent(context, {
            date: daysFromNow(2), menuTitle: salt('Ventelistemiddag', testSalt), seasonId: activeSeason.id!, cookingTeamId: teamId, chefId: adminInhabitantId
        })
        dinnerEventId = dinner.id!
        dinnerIds.push(dinnerEventId)
        for (const name of ['Et', 'To', 'Tre', 'Fire']) {
            inhabitants.push(await HouseholdFactory.createInhabitantForHousehold(context, householdId, salt(`Venter ${name}`, testSalt)))
        }
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await WaitlistFactory.cleanupEntries(context, activeSeasonId, dinnerIds)
        await OrderFactory.cleanupOrders(context, orderIds)
        for (const inhabitant of inhabitants) await HouseholdFactory.deleteInhabitant(context, inhabitant.id!)
        await HouseholdFactory.deleteHousehold(context, sellerHouseholdIds)
        for (const id of dinnerIds) await DinnerEventFactory.deleteDinnerEvent(context, id)
        for (const id of teamIds) await SeasonFactory.deleteCookingTeam(context, id)
    })

    test('GIVEN voksen, barn, voksen, barn in the queue WHEN the chef releases 2.5 portions THEN the first three get their tickets and the last barn waits', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // Each ticket type waits in its own line: the place counts within it
        const joins = [{price: adultPrice, position: 1}, {price: childPrice, position: 1}, {price: adultPrice, position: 2}, {price: childPrice, position: 2}]
        for (const [index, {price, position}] of joins.entries()) {
            const result = await queue(context, OrderFactory.createBookingOrder(inhabitants[index]!.id!, dinnerEventId, price.id!))
            expect(result.positions.map(queued => queued.position)).toEqual([position])
        }

        const result = await WaitlistFactory.addExtraPortions(context, dinnerEventId, 2.5)
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
        expect(waiting.map(entry => entry.inhabitantId)).toEqual([inhabitants[3]!.id])
    })

    test('GIVEN one barn waiting WHEN the chef releases half a portion THEN it gets its ticket and a further release assigns nothing', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const first = await WaitlistFactory.addExtraPortions(context, dinnerEventId, 0.5)
        orderIds.push(...first!.assigned.map(assigned => assigned.orderId))
        expect(first!.assigned.map(assigned => assigned.inhabitantId)).toEqual([inhabitants[3]!.id])
        expect(first!.waiting).toBe(0)

        const again = await WaitlistFactory.addExtraPortions(context, dinnerEventId, 1)
        expect(again!.assigned).toEqual([])
        expect(again!.portionsUsed).toBe(0)
    })

    test('GIVEN an inhabitant with a ticket WHEN joining the queue again THEN the Order unique index refuses the assignment path too', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // The queue accepts the entry; the release cannot place a second regular order for the inhabitant
        const result = await queue(context, OrderFactory.createBookingOrder(inhabitants[0]!.id!, dinnerEventId, adultPrice.id!))
        expect(result.totals[Action.QUEUE]).toBe(1)

        await WaitlistFactory.addExtraPortions(context, dinnerEventId, 1, 409)

        const waiting = await householdEntries(context)
        expect(waiting.map(entry => entry.inhabitantId)).toEqual([inhabitants[0]!.id])
        await WaitlistFactory.leave(context, activeSeasonId, waiting[0]!, true)
    })

    test('GIVEN a queue on a dinner of yesterday WHEN the daily maintenance consumes it THEN the queue is gone', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // The maintenance consumes a past dinner of the active season, and a consumed dinner has no queue
        const pastDinner = await DinnerEventFactory.createDinnerEvent(context, {
            date: daysFromNow(-1), menuTitle: salt('Gårsdagens middag', temporaryAndRandom()), seasonId: activeSeasonId, cookingTeamId: teamId, chefId: adminInhabitantId
        })
        dinnerIds.push(pastDinner.id!)
        const result = await queue(context, OrderFactory.createGuestOrder(inhabitants[3]!.id!, pastDinner.id!, childPrice.id!))
        expect(result.totals[Action.QUEUE]).toBe(1)

        const maintenance = await SeasonFactory.runDailyMaintenance(context)
        expect(maintenance.consume.consumed).toBeGreaterThanOrEqual(1)

        expect(await householdEntries(context, pastDinner.id!)).toEqual([])
    })

    test('GIVEN an adult then a child waiting WHEN a child ticket is released THEN the child holds it and the adult still waits', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const [holder, adult, child] = inhabitants as [InhabitantDisplay, InhabitantDisplay, InhabitantDisplay]
        childSaleDinnerId = await dinnerPastDeadline(context, 'Barnebillet')
        const held = await holdTicket(context, holder.id!, childSaleDinnerId, childPrice)
        await queue(context, OrderFactory.createBookingOrder(adult.id!, childSaleDinnerId, adultPrice.id!))
        await queue(context, OrderFactory.createBookingOrder(child.id!, childSaleDinnerId, childPrice.id!))

        const released = await queue(context, OrderFactory.createBookingOrder(holder.id!, childSaleDinnerId, childPrice.id!, DinnerModeSchema.enum.NONE, held.id))

        expect(released.totals[Action.RELEASE]).toBe(1)
        expect(released.outcomes.waitlistTicketsSold).toEqual([{
            dinnerEventId: childSaleDinnerId, ticketPriceId: childPrice.id,
            buyerInhabitantId: child.id, buyerHouseholdId: householdId, sellerHouseholdId: householdId
        }])
        const bought = (await OrderFactory.getOrdersForDinnerEvent(context, childSaleDinnerId)).filter(order => order.inhabitantId === child.id)
        expect(bought.map(order => order.state)).toEqual([OrderStateSchema.enum.BOOKED])
        expect((await householdEntries(context, childSaleDinnerId)).map(entry => entry.inhabitantId)).toEqual([adult.id])
    })

    test('GIVEN that sale WHEN daily maintenance runs THEN it sells nothing more on that dinner', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const adult = inhabitants[1]!

        const maintenance = await SeasonFactory.runDailyMaintenance(context)

        expect(maintenance.scaffold?.outcomes.waitlistTicketsSold.filter(sale => sale.dinnerEventId === childSaleDinnerId)).toEqual([])
        expect((await householdEntries(context, childSaleDinnerId)).map(entry => entry.inhabitantId)).toEqual([adult.id])
    })

    test('GIVEN a child waiting WHEN a household releases one child\'s ticket and claims one for its other child in one save THEN the waiting child holds the released ticket and the claimer joins the child line', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const [, waiting, holder, claimer] = inhabitants as [InhabitantDisplay, InhabitantDisplay, InhabitantDisplay, InhabitantDisplay]
        const dinnerId = await dinnerPastDeadline(context, 'Barnekø')
        const held = await holdTicket(context, holder.id!, dinnerId, childPrice)
        await queue(context, OrderFactory.createBookingOrder(waiting.id!, dinnerId, childPrice.id!))

        const response = await OrderFactory.scaffoldOrders(context, {householdId, seasonId: activeSeasonId, dinnerEventIds: [dinnerId], orders: [
            OrderFactory.createBookingOrder(holder.id!, dinnerId, childPrice.id!, DinnerModeSchema.enum.NONE, held.id),
            OrderFactory.createBookingOrder(claimer.id!, dinnerId, childPrice.id!)
        ]})
        const result = response!.scaffoldResult

        expect(result.totals[Action.RELEASE]).toBe(1)
        expect(result.totals[Action.QUEUE]).toBe(1)
        expect(result.totals[Action.BUY]).toBe(0)
        expect(result.outcomes.waitlistTicketsSold.map(sale => sale.buyerInhabitantId)).toEqual([waiting.id])
        expect((await householdEntries(context, dinnerId)).map(entry => entry.inhabitantId)).toEqual([claimer.id])
    })

    test('GIVEN a household holding a ticket past the deadline and a waiting entry at its price WHEN an admin sets the household\'s preferences to Ingen THEN the first in the waiting list holds the ticket and the household\'s open orders are cancelled', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const dinnerAt = async (days: number, title: string) => {
            const dinner = await DinnerEventFactory.createDinnerEvent(context, {
                date: daysFromNow(days), menuTitle: salt(title, testSalt), seasonId: activeSeasonId, cookingTeamId: teamId, chefId: adminInhabitantId
            })
            dinnerIds.push(dinner.id!)
            return dinner
        }
        const closedDinner = await dinnerAt(3, 'Frigivet billet')
        const openDinner = await dinnerAt(20, 'Åben middag')
        const {household: seller, inhabitants: [sellerInhabitant]} = await HouseholdFactory.createHouseholdWithInhabitants(context, HouseholdFactory.defaultHouseholdData(testSalt), 1)
        sellerHouseholdIds.push(seller.id)
        const preferences = (mode: DinnerMode) => HouseholdFactory.updateInhabitantPreferences(
            context, sellerInhabitant!.id, createDefaultWeekdayMap(mode), 200, activeSeasonId, undefined, true
        )
        // The scaffold books the seller while both dinners are open, as the nightly run does; the season's own deadline then closes the near one
        await SeasonFactory.updateSeason(context, {...activeSeason, ticketIsCancellableDaysBefore: 0})
        await preferences(DinnerModeSchema.enum.NONE)
        await preferences(DinnerModeSchema.enum.DINEIN)
        await SeasonFactory.updateSeason(context, activeSeason)
        const waiting = inhabitants[3]!
        expect((await queue(context, OrderFactory.createBookingOrder(waiting.id!, closedDinner.id!, adultPrice.id!))).totals[Action.QUEUE]).toBe(1)

        const response = await preferences(DinnerModeSchema.enum.NONE)

        expect(response!.scaffoldResult.errored).toBe(0)
        expect(response!.scaffoldResult.failed).toEqual([])
        expect(response!.scaffoldResult.results).toEqual(expect.arrayContaining([
            expect.objectContaining({inhabitantId: sellerInhabitant!.id, dinnerEventId: closedDinner.id, action: Action.RELEASE}),
            expect.objectContaining({inhabitantId: sellerInhabitant!.id, dinnerEventId: openDinner.id, action: Action.CANCEL})
        ]))
        // The seller holds a ticket on every dinner of the season, so its release also serves the lines the earlier cases leave
        const salesOnDinner = response!.scaffoldResult.outcomes.waitlistTicketsSold.filter(sale => sale.dinnerEventId === closedDinner.id)
        expect(salesOnDinner).toEqual([{
            dinnerEventId: closedDinner.id, ticketPriceId: adultPrice.id,
            buyerInhabitantId: waiting.id, buyerHouseholdId: householdId, sellerHouseholdId: seller.id
        }])
        const bought = (await OrderFactory.getOrdersForDinnerEvent(context, closedDinner.id!)).filter(order => order.inhabitantId === waiting.id)
        expect(bought.map(order => order.state)).toEqual([OrderStateSchema.enum.BOOKED])
        expect(await householdEntries(context, closedDinner.id!)).toEqual([])
        expect(await OrderFactory.getOrders(context, {dinnerEventIds: openDinner.id!, householdId: seller.id})).toEqual([])
    })
})
