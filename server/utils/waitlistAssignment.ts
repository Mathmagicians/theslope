import {useWaitlist} from '~/composables/useWaitlist'
import {createError} from 'h3'
import {useBookingValidation, type CreateOrdersResult, type DinnerEventDetail, type TicketSale, type WaitlistJoined} from '~/composables/useBookingValidation'
import type {TicketWaitlistCreate, TicketWaitlistDisplay, WaitlistAssigned, WaitlistAssignmentResult} from '~/composables/useWaitlistValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {createOrders, claimOrder, fetchDinnerEvent, type ClaimedOrder} from '~~/server/data/financesRepository'
import {groupBy} from '~/utils/batchUtils'
import {fetchSeason} from '~~/server/data/prismaRepository'
import {fetchWaitlistForDinners, deleteWaitlistEntry, createWaitlistEntry} from '~~/server/data/waitlistRepository'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import type {WaitlistDinnerContext} from '~~/server/utils/sender/events/waitlist'

const LOG = '⏳ > WAITLIST > [ASSIGN]'

export interface DinnerForWaitlist {
    context: WaitlistDinnerContext
    seasonId: number
    ticketPrices: TicketPrice[]
    chefId: number | null
    state: DinnerEventDetail['state']
}

// The dinner, its season's ticket prices and the label the mails use
const forWaitlist = async (d1Client: D1Database, dinner: DinnerEventDetail | null, dinnerEventId: number): Promise<DinnerForWaitlist> => {
    if (!dinner?.seasonId) throw new Error(`${LOG} Dinner ${dinnerEventId} not found in a season`)
    const season = await fetchSeason(d1Client, dinner.seasonId)
    if (!season) throw new Error(`${LOG} Season ${dinner.seasonId} of dinner ${dinnerEventId} not found`)
    return {
        context: {dinnerEventId, date: dinner.date, menuTitle: dinner.menuTitle},
        seasonId: season.id!,
        ticketPrices: season.ticketPrices,
        chefId: dinner.chefId ?? null,
        state: dinner.state
    }
}

export const loadDinner = async (d1Client: D1Database, dinnerEventId: number): Promise<DinnerForWaitlist> =>
    forWaitlist(d1Client, await fetchDinnerEvent(d1Client, dinnerEventId), dinnerEventId)

/** A claim that found no ticket for sale: the wish joins the dinner's queue at its frozen price */
export async function joinWaitlist(
    d1Client: D1Database, request: TicketWaitlistCreate, dinner: Pick<DinnerForWaitlist, 'state' | 'ticketPrices'>
): Promise<{entry: TicketWaitlistDisplay, position: number, joined: WaitlistJoined}> {
    const {positionOf, portionNeed, portionsOfEntryFor, ticketTypeOfEntry} = useWaitlist()
    const {DinnerStateSchema} = useBookingValidation()
    // A queue exists for a dinner still to come
    if (dinner.state === DinnerStateSchema.enum.CONSUMED || dinner.state === DinnerStateSchema.enum.CANCELLED) {
        throw createError({statusCode: 400, message: `Dinner event ${request.dinnerEventId} is ${dinner.state}`})
    }
    const bookedByUserId = request.order.bookedByUserId
    if (!bookedByUserId) {
        throw createError({statusCode: 400, message: `A waiting entry on dinner ${request.dinnerEventId} needs its booking member`})
    }
    const entry = await createWaitlistEntry(d1Client, request)
    const queue = await fetchWaitlistForDinners(d1Client, [request.dinnerEventId])
    const position = positionOf(queue, entry.id, ticketTypeOfEntry(dinner.ticketPrices)) ?? queue.length

    console.info(`${LOG} Inhabitant ${request.inhabitantId} is #${position} in its ticket type's line on dinner ${request.dinnerEventId}`)
    const joined: WaitlistJoined = {
        dinnerEventId: request.dinnerEventId, inhabitantId: request.inhabitantId, bookedByUserId,
        position, ticketType: ticketTypeOfEntry(dinner.ticketPrices)(entry) ?? null,
        queueSize: queue.length, portionNeed: portionNeed(queue, portionsOfEntryFor(dinner.ticketPrices))
    }
    return {entry, position, joined}
}

// The order is written before the entry is removed, so the unique index on regular orders answers an entry whose
// order already landed with a conflict: that entry leaves the queue; any other failure propagates
const leaveWhenAlreadyPlaced = async (d1Client: D1Database, entry: TicketWaitlistDisplay, error: unknown): Promise<void> => {
    if (!eventHandlerHelper.isConflict(error)) throw error
    console.info(`${LOG} Inhabitant ${entry.inhabitantId} already holds a regular order on dinner ${entry.dinnerEventId}: queue entry ${entry.id} leaves the queue`)
    await deleteWaitlistEntry(d1Client, entry.id)
}

// Places one entry's order and removes the entry; null when the entry's order was already placed
const placeEntry = async (
    d1Client: D1Database, dinner: DinnerForWaitlist, entry: TicketWaitlistDisplay, portions: number, performedByUserId: number | null
): Promise<WaitlistAssigned | null> => {
    const {OrderAuditActionSchema, OrderAuditSourceSchema} = useBookingValidation()
    const {allergyTypeIds: _allergies, ...order} = entry.order
    let created: CreateOrdersResult
    try {
        created = await createOrders(d1Client, order.householdId, [order], {
            action: OrderAuditActionSchema.enum.SYSTEM_CREATED,
            performedByUserId,
            source: OrderAuditSourceSchema.enum['waitlist-assignment'],
            seasonId: dinner.seasonId
        })
    } catch (error) {
        await leaveWhenAlreadyPlaced(d1Client, entry, error)
        return null
    }
    await deleteWaitlistEntry(d1Client, entry.id)
    return {
        entryId: entry.id, inhabitantId: entry.inhabitantId, isGuestTicket: entry.isGuestTicket, portions,
        orderId: created.createdIds[0]!, ticketPriceId: entry.order.ticketPriceId
    }
}

/**
 * The chef releases N portions: the resolver walks the queue in strict FIFO and the entries that fit get their
 * orders at the price written at join. Idempotent: an entry placed once is gone from the queue, and the Order
 * unique index refuses a second regular order for the same inhabitant and dinner (ADR-015).
 */
export async function assignWaitlistPortions(
    d1Client: D1Database, dinnerEvent: DinnerEventDetail, supplyPortions: number, performedByUserId: number | null
): Promise<WaitlistAssignmentResult> {
    const {resolveWaitlistAssignment, portionsOfEntryFor} = useWaitlist()
    const dinnerEventId = dinnerEvent.id
    const dinner = await forWaitlist(d1Client, dinnerEvent, dinnerEventId)
    const entries = await fetchWaitlistForDinners(d1Client, [dinnerEventId])
    const plan = resolveWaitlistAssignment(entries, supplyPortions, portionsOfEntryFor(dinner.ticketPrices))
    console.info(`${LOG} Dinner ${dinnerEventId}: ${supplyPortions} portions released, ${plan.take.length} of ${entries.length} entries fit`)
    const assigned: WaitlistAssigned[] = []
    for (const {entry, portions} of plan.take) {
        const placed = await placeEntry(d1Client, dinner, entry, portions, performedByUserId)
        if (placed) assigned.push(placed)
    }
    return {dinnerEventId, supplyPortions, assigned, portionsUsed: plan.portionsUsed, waiting: plan.waiting.length}
}

/**
 * The tickets for sale go to the waiting list: each ticket type's line, in join order, buys the oldest released tickets
 * of its type until the line or that supply runs out. A sold ticket keeps its price row. Idempotent: a placed entry
 * leaves its line, and a line without supply stops at its first miss (ADR-015).
 */
export async function sellTicketsToWaitlist(
    d1Client: D1Database, dinnerEventIds: number[], ticketPrices: Pick<TicketPrice, 'id' | 'ticketType'>[]
): Promise<TicketSale[]> {
    const {waitingLines, ticketTypeOfEntry} = useWaitlist()
    if (dinnerEventIds.length === 0) return []
    const ticketTypeOf = ticketTypeOfEntry(ticketPrices)
    const sales: TicketSale[] = []
    const queues = groupBy<TicketWaitlistDisplay, number>(entry => entry.dinnerEventId)(await fetchWaitlistForDinners(d1Client, dinnerEventIds))
    for (const [dinnerEventId, queue] of queues) {
        for (const [ticketType, line] of waitingLines(queue, ticketTypeOf)) {
            for (const entry of line) {
                let claimed: ClaimedOrder | null
                try {
                    claimed = await claimOrder(d1Client, dinnerEventId, ticketType, entry.inhabitantId, entry.order.bookedByUserId ?? null, entry.order.dinnerMode, entry.isGuestTicket)
                } catch (error) {
                    await leaveWhenAlreadyPlaced(d1Client, entry, error)
                    continue
                }
                if (!claimed) break
                await deleteWaitlistEntry(d1Client, entry.id)
                console.info(`${LOG} Dinner ${dinnerEventId}: a released ${ticketType} ticket went to the first in its line (inhabitant ${entry.inhabitantId})`)
                sales.push({
                    dinnerEventId, ticketPriceId: claimed.ticketPriceId,
                    buyerInhabitantId: entry.inhabitantId, buyerHouseholdId: entry.order.householdId, sellerHouseholdId: claimed.sellerHouseholdId
                })
            }
        }
    }
    return sales
}
