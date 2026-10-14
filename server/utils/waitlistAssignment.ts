import {useWaitlist} from '~/composables/useWaitlist'
import {createError} from 'h3'
import {useBookingValidation, type DinnerEventDetail, type TicketSale, type WaitlistJoined} from '~/composables/useBookingValidation'
import type {TicketWaitlistCreate, TicketWaitlistDisplay, WaitlistAssigned, WaitlistAssignmentResult} from '~/composables/useWaitlistValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {createOrders, claimOrder, fetchDinnerEvent} from '~~/server/data/financesRepository'
import {fetchSeason} from '~~/server/data/prismaRepository'
import {fetchWaitlistForDinners, deleteWaitlistEntry, createWaitlistEntry} from '~~/server/data/waitlistRepository'
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
    d1Client: D1Database, request: TicketWaitlistCreate
): Promise<{entry: TicketWaitlistDisplay, position: number, joined: WaitlistJoined}> {
    const {positionOf, portionNeed, portionsOfEntryFor} = useWaitlist()
    const {DinnerStateSchema} = useBookingValidation()
    const dinner = await loadDinner(d1Client, request.dinnerEventId)
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
    const position = positionOf(queue, entry.id) ?? queue.length

    console.info(`${LOG} Inhabitant ${request.inhabitantId} is #${position} in the queue of dinner ${request.dinnerEventId}`)
    const joined: WaitlistJoined = {
        dinnerEventId: request.dinnerEventId, inhabitantId: request.inhabitantId, bookedByUserId,
        position, queueSize: queue.length, portionNeed: portionNeed(queue, portionsOfEntryFor(dinner.ticketPrices))
    }
    return {entry, position, joined}
}

// Places one entry's order and removes the entry
const placeEntry = async (
    d1Client: D1Database, dinner: DinnerForWaitlist, entry: TicketWaitlistDisplay, portions: number, performedByUserId: number | null
): Promise<WaitlistAssigned> => {
    const {OrderAuditActionSchema} = useBookingValidation()
    const {allergyTypeIds: _allergies, ...order} = entry.order
    const created = await createOrders(d1Client, order.householdId, [order], {
        action: OrderAuditActionSchema.enum.SYSTEM_CREATED,
        performedByUserId,
        source: 'waitlist-assignment',
        seasonId: dinner.seasonId
    })
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
        assigned.push(await placeEntry(d1Client, dinner, entry, portions, performedByUserId))
    }
    return {dinnerEventId, supplyPortions, assigned, portionsUsed: plan.portionsUsed, waiting: plan.waiting.length}
}

/**
 * A ticket released after the deadline goes to the head of the queue when the head waits for that ticket type: the claim
 * moves the oldest released ticket at that price to the waiting inhabitant and the entry leaves the queue. A head waiting
 * for another type keeps the ticket on the marketplace; nobody overtakes.
 */
export async function assignReleasedTicket(
    d1Client: D1Database, dinnerEventId: number, ticketPriceId: number
): Promise<TicketSale | null> {
    const {inQueueOrder} = useWaitlist()
    const entries = inQueueOrder(await fetchWaitlistForDinners(d1Client, [dinnerEventId]))
    const head = entries[0]
    if (!head || head.order.ticketPriceId !== ticketPriceId) return null
    const claimed = await claimOrder(d1Client, dinnerEventId, ticketPriceId, head.inhabitantId, head.order.bookedByUserId ?? null, head.order.dinnerMode, head.isGuestTicket)
    if (!claimed) return null
    await deleteWaitlistEntry(d1Client, head.id)
    console.info(`${LOG} Dinner ${dinnerEventId}: released ticket ${ticketPriceId} went to the head of the queue (inhabitant ${head.inhabitantId})`)
    return {
        dinnerEventId, ticketPriceId,
        buyerInhabitantId: head.inhabitantId, buyerHouseholdId: head.order.householdId, sellerHouseholdId: claimed.sellerHouseholdId
    }
}
