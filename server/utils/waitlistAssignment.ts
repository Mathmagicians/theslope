import {useWaitlist} from '~/composables/useWaitlist'
import {createError} from 'h3'
import {useBookingValidation, CLOSED_DINNER_STATES, type CreateOrdersResult, type DinnerEventDetail, type DinnerEventDisplay, type DinnerState, type TicketSale, type TicketType} from '~/composables/useBookingValidation'
import type {Season} from '~/composables/useSeasonValidation'
import {
    PlacementRecovery, type GrabbedWaitlistEntry, type TicketWaitlistCreate, type TicketWaitlistDisplay, type WaitlistAssigned,
    type WaitlistAssignmentResult, type WaitlistAuditContext, type WaitlistPlacementOutcomes
} from '~/composables/useWaitlistValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {createOrders, claimReleasedOrder, findReleasedOrderId, type ClaimedOrder} from '~~/server/data/financesRepository'
import {groupBy} from '~/utils/batchUtils'
import {sumBy} from '~/utils/ledger'
import {fetchSeason} from '~~/server/data/prismaRepository'
import {
    fetchWaitlistForDinners, createWaitlistEntries, fetchOrdersServingEntry, grabWaitlistEntry, recordWaitlistPlacingOrder, releaseWaitlistEntry,
    removePlacedWaitlistEntry, type WaitlistJoin
} from '~~/server/data/waitlistRepository'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import type {WaitlistDinnerContext} from '~~/server/utils/sender/events/waitlist'

const LOG = '⏳ > WAITLIST > [ASSIGN]'

export interface DinnerForWaitlist {
    context: WaitlistDinnerContext
    seasonId: number
    ticketPrices: TicketPrice[]
    chefId: number | null
    state: DinnerState
}

// One step of a placement walk: the line stops when another run holds the entry or nothing is for sale
type PlacementStep<T> = {stop: boolean, placed: T | null}
const STOP = {stop: true, placed: null} as const
const MOVE_ON = {stop: false, placed: null} as const

const placingLease = () => useWaitlist().placingLease(new Date(), useAppConfig().theslope.waitlistPlacingLeaseMinutes)

/** The dinner, its season's ticket prices and the label the mails use; a dinner outside a season it was read with has none */
export const dinnerForWaitlist = (dinner: DinnerEventDisplay, season: Season | null | undefined): DinnerForWaitlist => {
    if (!dinner.seasonId || season?.id !== dinner.seasonId) throw new Error(`${LOG} Season ${dinner.seasonId} of dinner ${dinner.id} not found`)
    return {
        context: {dinnerEventId: dinner.id, date: dinner.date, menuTitle: dinner.menuTitle, cookingTeamId: dinner.cookingTeamId},
        seasonId: season.id,
        ticketPrices: season.ticketPrices,
        chefId: dinner.chefId,
        state: dinner.state
    }
}

/** A cancelled or consumed dinner takes no booking: no order, no place on its waiting list, no sale */
export const isClosedDinner = (state: DinnerState): boolean => CLOSED_DINNER_STATES.includes(state)

// A wish joins the queue of a dinner still to come, booked by a member
const assertJoinable = (request: TicketWaitlistCreate, dinnerState: DinnerState): void => {
    if (isClosedDinner(dinnerState)) {
        throw createError({statusCode: 400, message: `Dinner event ${request.dinnerEventId} is ${dinnerState}`})
    }
    if (!request.order.bookedByUserId) {
        throw createError({statusCode: 400, message: `A waiting entry on dinner ${request.dinnerEventId} needs its booking member`})
    }
}

/** The claims of a dinner that found no ticket for sale: the wishes join its queue at their frozen prices in one write, in join order */
export async function joinWaitlist(
    d1Client: D1Database, joins: WaitlistJoin[], dinnerState: DinnerState, audit: WaitlistAuditContext
): Promise<TicketWaitlistDisplay[]> {
    for (const {entry} of joins) assertJoinable(entry, dinnerState)
    return createWaitlistEntries(d1Client, joins, audit)
}

/**
 * Joins without the write: the entries the queue would hold at the end of their lines, in join order, on the queue as
 * the caller reads it. Each entry is the one the caller makes of its request, as the write would make it.
 */
export function previewJoinWaitlist(
    queue: TicketWaitlistDisplay[], requests: TicketWaitlistCreate[], dinnerState: DinnerState,
    entryOf: (request: TicketWaitlistCreate, index: number) => TicketWaitlistDisplay
): TicketWaitlistDisplay[] {
    return requests.reduce<TicketWaitlistDisplay[]>((entries, request, index) => {
        assertJoinable(request, dinnerState)
        // The database's unique index holds one regular entry per inhabitant and dinner
        const queued = [...queue, ...entries].some(entry => entry.dinnerEventId === request.dinnerEventId && entry.inhabitantId === request.inhabitantId && !entry.isGuestTicket)
        if (!request.isGuestTicket && queued) {
            throw createError({statusCode: 409, message: `Inhabitant ${request.inhabitantId} already queues for dinner ${request.dinnerEventId}`})
        }
        return [...entries, entryOf(request, index)]
    }, [])
}

// The unique index on regular orders answers the write of an entry whose inhabitant already holds a regular order on
// the dinner with a conflict: that entry leaves the queue. Any other failure propagates and the entry stays grabbed
// for the recovery
const leaveWhenAlreadyPlaced = async (d1Client: D1Database, entry: TicketWaitlistDisplay, error: unknown): Promise<void> => {
    if (!eventHandlerHelper.isConflict(error)) throw error
    console.info(`${LOG} Inhabitant ${entry.inhabitantId} already holds a regular order on dinner ${entry.dinnerEventId}: queue entry ${entry.id} leaves the queue`)
    await removePlacedWaitlistEntry(d1Client, entry.id)
}

/**
 * A grab past the lease is the trace of a run that stopped midway: the order that serves the entry finishes its
 * placement, anything else hands the entry back to its place in its line. The stopped run mailed nothing, so the
 * recovery reports what it finishes. Returns the queue as the recovery leaves it.
 */
const recoverPlacements = async (
    d1Client: D1Database, queue: TicketWaitlistDisplay[], isExpired: (entry: TicketWaitlistDisplay) => entry is GrabbedWaitlistEntry,
    portionsOf: (entry: TicketWaitlistDisplay) => number
): Promise<{queue: TicketWaitlistDisplay[], recovered: WaitlistPlacementOutcomes}> => {
    const {placingOrderOf, placementRecoveryOf, finishedPlacementOutcomes} = useWaitlist()
    const servingOrderIds = new Set(queue.flatMap(entry => entry.placingOrderId === null ? [] : [entry.placingOrderId]))
    const finished = new Set<number>()
    const released = new Set<number>()
    const recovered: WaitlistPlacementOutcomes = {waitlistTicketsSold: [], waitlistPortionsAssigned: []}
    for (const entry of queue.filter(isExpired)) {
        const order = placingOrderOf(entry, await fetchOrdersServingEntry(d1Client, entry), servingOrderIds)
        if (order !== null && placementRecoveryOf(entry, order) === PlacementRecovery.FINISH) {
            if (entry.placingOrderId === null) {
                await recordWaitlistPlacingOrder(d1Client, entry.id, order.id)
                servingOrderIds.add(order.id)
            }
            await removePlacedWaitlistEntry(d1Client, entry.id)
            finished.add(entry.id)
            const {waitlistTicketsSold, waitlistPortionsAssigned} = finishedPlacementOutcomes(entry, order, portionsOf)
            recovered.waitlistTicketsSold.push(...waitlistTicketsSold)
            recovered.waitlistPortionsAssigned.push(...waitlistPortionsAssigned)
            console.info(`${LOG} Dinner ${entry.dinnerEventId}: order ${order.id} serves queue entry ${entry.id}, a stopped run's placement is finished`)
        } else {
            await releaseWaitlistEntry(d1Client, entry.id)
            released.add(entry.id)
            console.info(`${LOG} Dinner ${entry.dinnerEventId}: no order serves queue entry ${entry.id}, it waits at its place again`)
        }
    }
    return {
        queue: queue
            .filter(entry => !finished.has(entry.id))
            .map(entry => released.has(entry.id) ? {...entry, placingAt: null, placingOrderId: null} : entry),
        recovered
    }
}

// One entry's extra portion: grab the entry, write its order, record the order on the entry, remove the entry
const placeEntry = async (
    d1Client: D1Database, dinner: DinnerForWaitlist, entry: TicketWaitlistDisplay, portions: number, performedByUserId: number | null
): Promise<PlacementStep<WaitlistAssigned>> => {
    const {OrderAuditActionSchema, OrderAuditSourceSchema} = useBookingValidation()
    if (!await grabWaitlistEntry(d1Client, entry.id, new Date())) return STOP
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
        return MOVE_ON
    }
    const orderId = created.createdIds[0]!
    await recordWaitlistPlacingOrder(d1Client, entry.id, orderId)
    await removePlacedWaitlistEntry(d1Client, entry.id)
    return {
        stop: false,
        placed: {
            entryId: entry.id, inhabitantId: entry.inhabitantId, isGuestTicket: entry.isGuestTicket, portions, orderId, ticketPriceId: entry.order.ticketPriceId,
            dinnerMode: entry.order.dinnerMode
        }
    }
}

/**
 * The chef releases N portions: the resolver walks the queue in strict FIFO and the entries that fit get their
 * orders at the price written at join. Idempotent: a placed entry is gone from the queue, a grabbed entry belongs to
 * one run, and the recovery settles the grabs of a run that stopped midway (ADR-015). A cancelled or consumed dinner
 * places nobody: its queue keeps its places.
 */
export async function assignWaitlistPortions(
    d1Client: D1Database, dinnerEvent: DinnerEventDetail, supplyPortions: number, performedByUserId: number | null
): Promise<WaitlistAssignmentResult> {
    const {resolveWaitlistAssignment, portionsOfEntryFor} = useWaitlist()
    const dinnerEventId = dinnerEvent.id
    if (isClosedDinner(dinnerEvent.state)) {
        const waiting = (await fetchWaitlistForDinners(d1Client, [dinnerEventId])).length
        console.info(`${LOG} Dinner ${dinnerEventId} is ${dinnerEvent.state}: ${supplyPortions} portions place nobody, ${waiting} entries keep their place`)
        return {dinnerEventId, supplyPortions, assigned: [], portionsUsed: 0, waiting, waitlistTicketsSold: []}
    }
    const dinner = dinnerForWaitlist(dinnerEvent, dinnerEvent.seasonId ? await fetchSeason(d1Client, dinnerEvent.seasonId) : null)
    const portionsOf = portionsOfEntryFor(dinner.ticketPrices)
    const {isHeld, isExpired} = placingLease()
    const {queue: entries, recovered} = await recoverPlacements(d1Client, await fetchWaitlistForDinners(d1Client, [dinnerEventId]), isExpired, portionsOf)
    const plan = resolveWaitlistAssignment(entries, supplyPortions, portionsOf, isHeld)
    console.info(`${LOG} Dinner ${dinnerEventId}: ${supplyPortions} portions released, ${plan.take.length} of ${entries.length} entries fit`)
    const assigned: WaitlistAssigned[] = []
    let stoppedAt = plan.take.length
    for (const [index, {entry, portions}] of plan.take.entries()) {
        const {stop, placed} = await placeEntry(d1Client, dinner, entry, portions, performedByUserId)
        if (stop) {
            console.info(`${LOG} Dinner ${dinnerEventId}: another run holds queue entry ${entry.id}, the walk stops there`)
            stoppedAt = index
            break
        }
        if (placed) assigned.push(placed)
    }
    const unplaced = plan.take.slice(stoppedAt)
    return {
        dinnerEventId, supplyPortions,
        assigned: [...recovered.waitlistPortionsAssigned.map(({dinnerEventId: _dinnerEventId, ...placed}) => placed), ...assigned],
        portionsUsed: plan.portionsUsed - sumBy(unplaced, take => take.portions),
        waiting: plan.waiting.length + unplaced.length,
        waitlistTicketsSold: recovered.waitlistTicketsSold
    }
}

// Sells the oldest released ticket of the entry's type to the entry: grab the entry with the ticket, claim the ticket,
// remove the entry. A ticket another buyer took first hands the entry back to its place, and the next ticket for sale is tried
const sellToEntry = async (d1Client: D1Database, entry: TicketWaitlistDisplay, ticketType: TicketType): Promise<PlacementStep<TicketSale>> => {
    const {OrderAuditSourceSchema} = useBookingValidation()
    const releasedOrderId = await findReleasedOrderId(d1Client, entry.dinnerEventId, ticketType)
    if (releasedOrderId === null || !await grabWaitlistEntry(d1Client, entry.id, new Date(), releasedOrderId)) return STOP
    let claimed: ClaimedOrder | null
    try {
        claimed = await claimReleasedOrder(
            d1Client, releasedOrderId, entry.inhabitantId, entry.order.bookedByUserId ?? null, entry.order.dinnerMode, entry.isGuestTicket,
            OrderAuditSourceSchema.enum['waitlist-assignment']
        )
    } catch (error) {
        await leaveWhenAlreadyPlaced(d1Client, entry, error)
        return MOVE_ON
    }
    if (!claimed) {
        await releaseWaitlistEntry(d1Client, entry.id)
        return sellToEntry(d1Client, entry, ticketType)
    }
    await removePlacedWaitlistEntry(d1Client, entry.id)
    console.info(`${LOG} Dinner ${entry.dinnerEventId}: a released ${ticketType} ticket went to the first in its line (inhabitant ${entry.inhabitantId})`)
    return {
        stop: false,
        placed: {
            dinnerEventId: entry.dinnerEventId, ticketPriceId: claimed.ticketPriceId, orderId: releasedOrderId, dinnerMode: entry.order.dinnerMode,
            isGuestTicket: entry.isGuestTicket, buyerInhabitantId: entry.inhabitantId, buyerHouseholdId: entry.order.householdId, sellerHouseholdId: claimed.sellerHouseholdId,
            sellerInhabitantId: claimed.sellerInhabitantId
        }
    }
}

/**
 * The tickets for sale go to the waiting list: each ticket type's line, in join order, buys the oldest released tickets
 * of its type until the line or that supply runs out. A sold ticket keeps its price row. Idempotent: a placed entry
 * leaves its line, a line stops at its first miss and at an entry another run holds, and the recovery settles the
 * grabs of a run that stopped midway (ADR-015). Reports the tickets sold, and the extra portions the recovery finished.
 * The caller names open dinners only: the scaffold, which reads the dinners' states, drops the closed ones.
 */
export async function sellTicketsToWaitlist(
    d1Client: D1Database, dinnerEventIds: number[], ticketPrices: TicketPrice[]
): Promise<WaitlistPlacementOutcomes> {
    const {placementLines, ticketTypeOfEntry, portionsOfEntryFor} = useWaitlist()
    if (dinnerEventIds.length === 0) return {waitlistTicketsSold: [], waitlistPortionsAssigned: []}
    const ticketTypeOf = ticketTypeOfEntry(ticketPrices)
    const {isHeld, isExpired} = placingLease()
    const {queue, recovered} = await recoverPlacements(
        d1Client, await fetchWaitlistForDinners(d1Client, dinnerEventIds), isExpired, portionsOfEntryFor(ticketPrices)
    )
    const sales: TicketSale[] = [...recovered.waitlistTicketsSold]
    for (const dinnerQueue of groupBy<TicketWaitlistDisplay, number>(entry => entry.dinnerEventId)(queue).values()) {
        for (const [ticketType, line] of placementLines(dinnerQueue, ticketTypeOf, isHeld)) {
            for (const entry of line) {
                const {stop, placed} = await sellToEntry(d1Client, entry, ticketType)
                if (placed) sales.push(placed)
                if (stop) break
            }
        }
    }
    return {waitlistTicketsSold: sales, waitlistPortionsAssigned: recovered.waitlistPortionsAssigned}
}
