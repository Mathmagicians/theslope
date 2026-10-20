import {Prisma} from '~~/prisma/generated/client/client'
import {createError} from 'h3'
import {getPrismaClientConnection} from '~~/server/utils/database'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {
    useWaitlistValidation, type GrabbedWaitlistEntry, type PlacementOrder, type TicketWaitlistCreate, type TicketWaitlistDisplay,
    type WaitlistAuditContext, type WaitlistOrder
} from '~/composables/useWaitlistValidation'
import {useBookingValidation, OrderAuditAction, type ClearWaitlistResult, type OrderAuditChange, type OrderSnapshot} from '~/composables/useBookingValidation'
import {recordCancellation} from '~~/server/data/financesRepository'
import {readByIds} from '~~/server/data/prismaRepository'
import {byTimeThenId} from '~/composables/useWaitlist'
import {groupBy} from '~/utils/batchUtils'

const {throwH3Error, isPrismaNotFound} = eventHandlerHelper
const LOG = '⏳ > WAITLIST'

// The conflict a leave or a change meets on an entry a run holds or has placed
const beingPlaced = (ids: number[]) => createError({statusCode: 409, message: `Queue entry ${ids.join(', ')} is being placed`})

// The history row of a write to an entry: no order, the person and the dinner its snapshot names
const entryHistoryRow = (audit: WaitlistAuditContext, change: OrderAuditChange) => (snapshot: OrderSnapshot) => ({
    orderId: null, ...audit, inhabitantId: snapshot.inhabitantId, dinnerEventId: snapshot.dinnerEventId,
    auditData: useBookingValidation().createOrderAuditData(change, snapshot)
})

/** A wish that joins a queue, and the order its history row keeps, built from the household the caller holds */
export type WaitlistJoin = {entry: TicketWaitlistCreate, snapshot: OrderSnapshot}

/** A place that leaves its queue, and the order its LEAVE row keeps, built from the household the caller holds */
export type WaitlistLeave = {id: number, snapshot: OrderSnapshot}

/** A place with a new wish, and the order its REQUEUE row keeps, built from the household the caller holds */
export type WaitlistRequeue = {id: number, order: WaitlistOrder, snapshot: OrderSnapshot}

/**
 * The waiting list rows: an entry per unplaced order, read FIFO by `createdAt`. The `order` column carries the
 * order-create shape as JSON (ADR-010); the partial unique index on (dinnerEventId, inhabitantId) for regular
 * entries answers a second regular entry with the unique-violation code, which the error floor maps to 409.
 * Each write to an entry writes its OrderHistory row with no order after the write (ADR-011), which
 * fetchUserIntentKeys reads as the person's act.
 * The joins write their entries in one insert and their QUEUE rows in another (ADR-014); returns the entries in insert
 * order, and the caller pairs each with its join by the entry's person, dinner and guest flag.
 */
export async function createWaitlistEntries(d1Client: D1Database, joins: WaitlistJoin[], audit: WaitlistAuditContext): Promise<TicketWaitlistDisplay[]> {
    if (joins.length === 0) return []
    const {serializeTicketWaitlist, deserializeTicketWaitlist} = useWaitlistValidation()
    const {OrderAuditChangeSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    const dinners = [...new Set(joins.map(({entry}) => entry.dinnerEventId))].join(', ')
    console.info(`${LOG} > [JOIN] ${joins.length} wish(es) join the queue of dinner ${dinners}`)
    try {
        const rows = await prisma.ticketWaitlist.createManyAndReturn({data: joins.map(({entry}) => serializeTicketWaitlist(entry))})
        await prisma.orderHistory.createMany({data: joins.map(({snapshot}) => entryHistoryRow(audit, OrderAuditChangeSchema.enum.QUEUE)(snapshot))})
        // SQLite's RETURNING hands the rows back in no set order; the ids count up in insert order
        return rows.map(deserializeTicketWaitlist).sort((a, b) => a.id - b.id)
    } catch (error) {
        return throwH3Error(`${LOG} > [JOIN] Error adding ${joins.length} wish(es) to the queue of dinner ${dinners}`, error)
    }
}

// The queues of the dinners, first joined first; the entries of the dinners interleave by join time. The dinner ids read
// in chunks, one after another (ADR-014)
export async function fetchWaitlistForDinners(d1Client: D1Database, dinnerEventIds: number[]): Promise<TicketWaitlistDisplay[]> {
    const {deserializeTicketWaitlist} = useWaitlistValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const rows = await readByIds(dinnerEventIds, batch => prisma.ticketWaitlist.findMany({
            where: {dinnerEventId: {in: batch}},
            orderBy: [{createdAt: 'asc'}, {id: 'asc'}]
        }))
        return rows.map(deserializeTicketWaitlist).sort(byTimeThenId(entry => entry.createdAt.getTime()))
    } catch (error) {
        return throwH3Error(`${LOG} > [GET] Error fetching the queues of dinners ${dinnerEventIds.join(', ')}`, error)
    }
}

/**
 * The household's places with a new wish: one update per place, one after another, each writing its own `order`, then
 * their REQUEUE rows in one insert (ADR-011). `createdAt` stays, so each keeps its place in its line. A place a run holds
 * or has placed refuses the write with a conflict; the places before it keep their new wish and no row is written
 */
export async function updateWaitlistEntryOrders(d1Client: D1Database, requeues: WaitlistRequeue[], audit: WaitlistAuditContext): Promise<number> {
    if (requeues.length === 0) return 0
    const {serializeTicketWaitlist} = useWaitlistValidation()
    const {OrderAuditChangeSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    const ids = requeues.map(({id}) => id)
    console.info(`${LOG} > [REQUEUE] Queue entries ${ids.join(', ')} get their new wishes`)
    try {
        for (const {id, order} of requeues) {
            try {
                await prisma.ticketWaitlist.update({where: {id, placingAt: null}, data: serializeTicketWaitlist({order})})
            } catch (error) {
                throw isPrismaNotFound(error) ? beingPlaced([id]) : error
            }
        }
        await prisma.orderHistory.createMany({data: requeues.map(({snapshot}) => entryHistoryRow(audit, OrderAuditChangeSchema.enum.REQUEUE)(snapshot))})
        return requeues.length
    } catch (error) {
        return throwH3Error(`${LOG} > [REQUEUE] Error rewriting queue entries ${ids.join(', ')}`, error)
    }
}

/**
 * The household's places leave their queues in one delete, then their cancellations (recordCancellation) whose change is
 * LEAVE (ADR-011). The caller hands at most 90 places, D1's bound parameters. A place a run holds or has placed stays,
 * and the batch answers 409 with no row
 */
export async function deleteWaitlistEntries(d1Client: D1Database, leaves: WaitlistLeave[], audit: WaitlistAuditContext): Promise<number> {
    if (leaves.length === 0) return 0
    const {OrderAuditChangeSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    const ids = leaves.map(({id}) => id)
    console.info(`${LOG} > [LEAVE] Removing queue entries ${ids.join(', ')}`)
    try {
        const {count} = await prisma.ticketWaitlist.deleteMany({where: {id: {in: ids}, placingAt: null}})
        if (count < ids.length) throw beingPlaced(ids)
        await recordCancellation(d1Client, leaves.map(({snapshot}) => ({
            orderId: null, inhabitantId: snapshot.inhabitantId, dinnerEventId: snapshot.dinnerEventId, seasonId: audit.seasonId,
            // A cancellation names its member; the system's carries none
            performedByUserId: audit.action === OrderAuditAction.USER_CANCELLED ? audit.performedByUserId : null,
            snapshot
        })), OrderAuditChangeSchema.enum.LEAVE)
        return count
    } catch (error) {
        return throwH3Error(`${LOG} > [LEAVE] Error removing queue entries ${ids.join(', ')}`, error)
    }
}

/**
 * A placement runs grab, write, record, remove without a transaction; the entry's placing columns carry the state a
 * stopped run leaves for the recovery. The grab takes the entry when no run holds it: false when another run does.
 * A sale grabs with the released order it claims; an extra portion records its new order once written.
 */
export async function grabWaitlistEntry(d1Client: D1Database, id: number, placingAt: Date, placingOrderId?: number): Promise<boolean> {
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const {count} = await prisma.ticketWaitlist.updateMany({
            where: {id, placingAt: null},
            data: {placingAt, placingOrderId: placingOrderId === undefined ? Prisma.skip : placingOrderId}
        })
        console.info(`${LOG} > [GRAB] Queue entry ${id} ${count === 1 ? 'grabbed' : 'held by another run'}`)
        return count === 1
    } catch (error) {
        return throwH3Error(`${LOG} > [GRAB] Error grabbing queue entry ${id}`, error)
    }
}

// The entry waits at its place again: its join time is unchanged
export async function releaseWaitlistEntry(d1Client: D1Database, id: number): Promise<number> {
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [RELEASE] Queue entry ${id} waits at its place again`)
    try {
        const {count} = await prisma.ticketWaitlist.updateMany({where: {id}, data: {placingAt: null, placingOrderId: null}})
        return count
    } catch (error) {
        return throwH3Error(`${LOG} > [RELEASE] Error releasing queue entry ${id}`, error)
    }
}

export async function recordWaitlistPlacingOrder(d1Client: D1Database, id: number, placingOrderId: number): Promise<number> {
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [RECORD] Order ${placingOrderId} serves queue entry ${id}`)
    try {
        const {count} = await prisma.ticketWaitlist.updateMany({where: {id}, data: {placingOrderId}})
        return count
    } catch (error) {
        return throwH3Error(`${LOG} > [RECORD] Error recording order ${placingOrderId} on queue entry ${id}`, error)
    }
}

// The placement's last step: a second remove of the entry counts 0
export async function removePlacedWaitlistEntry(d1Client: D1Database, id: number): Promise<number> {
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [PLACED] Removing queue entry ${id}`)
    try {
        const {count} = await prisma.ticketWaitlist.deleteMany({where: {id}})
        return count
    } catch (error) {
        return throwH3Error(`${LOG} > [PLACED] Error removing queue entry ${id}`, error)
    }
}

/**
 * The orders that may serve a grabbed entry: its recorded order, else the orders of the entry's inhabitant, guest flag
 * and price written on the dinner since the grab, first written first, which is what an extra portion writes before it
 * records it. A claim since the grab names the household the entry bought its ticket from.
 */
export async function fetchOrdersServingEntry(d1Client: D1Database, entry: GrabbedWaitlistEntry): Promise<PlacementOrder[]> {
    const {PlacementOrderSchema} = useWaitlistValidation()
    const {OrderAuditActionSchema, readOrderAudit} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    const select = {
        id: true, state: true, inhabitantId: true, isGuestTicket: true, ticketPriceId: true, createdAt: true,
        orderHistory: {
            where: {action: OrderAuditActionSchema.enum.USER_CLAIMED, inhabitantId: entry.inhabitantId, timestamp: {gte: entry.placingAt}},
            orderBy: {timestamp: 'desc'},
            take: 1,
            select: {action: true, auditData: true}
        }
    } satisfies Prisma.OrderSelect
    try {
        const orders = entry.placingOrderId !== null
            ? await prisma.order.findMany({where: {id: entry.placingOrderId}, select})
            : await prisma.order.findMany({
                where: {
                    dinnerEventId: entry.dinnerEventId,
                    inhabitantId: entry.inhabitantId,
                    isGuestTicket: entry.isGuestTicket,
                    ticketPriceId: entry.order.ticketPriceId,
                    createdAt: {gte: entry.placingAt}
                },
                orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
                select
            })
        return orders.map(({orderHistory: [claim], ...order}) => {
            // The claim's row keeps the order as it stood before the claim: the seller's household and inhabitant
            const sold = claim ? readOrderAudit(claim) : null
            return PlacementOrderSchema.parse({...order, sellerHouseholdId: sold?.householdId ?? null, sellerInhabitantId: sold?.inhabitantId ?? null})
        })
    } catch (error) {
        return throwH3Error(`${LOG} > [RECOVER] Error reading the orders that may serve queue entry ${entry.id}`, error)
    }
}

// Daily maintenance: a dinner that reached CONSUMED has no queue
export async function deleteWaitlistForConsumedDinners(d1Client: D1Database): Promise<ClearWaitlistResult> {
    const {DinnerStateSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const ofConsumedDinners = {dinnerEvent: {state: DinnerStateSchema.enum.CONSUMED}}
        const entries = await prisma.ticketWaitlist.findMany({
            where: ofConsumedDinners,
            select: {dinnerEventId: true, dinnerEvent: {select: {date: true}}}
        })
        const result = await prisma.ticketWaitlist.deleteMany({where: ofConsumedDinners})
        const dinners = [...groupBy((entry: typeof entries[number]) => entry.dinnerEventId)(entries).values()]
            .map(rows => ({dinnerEventId: rows[0]!.dinnerEventId, date: rows[0]!.dinnerEvent.date, cleared: rows.length}))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
        console.info(`${LOG} > [SWEEP] Cleared ${result.count} queue entries of ${dinners.length} consumed dinners`)
        return {cleared: result.count, dinners}
    } catch (error) {
        return throwH3Error(`${LOG} > [SWEEP] Error clearing the queues of consumed dinners`, error)
    }
}
