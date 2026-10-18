import {Prisma} from '~~/prisma/generated/client/client'
import {createError} from 'h3'
import {getPrismaClientConnection} from '~~/server/utils/database'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {
    useWaitlistValidation, type GrabbedWaitlistEntry, type PlacementOrder, type TicketWaitlistCreate, type TicketWaitlistDisplay,
    type WaitlistAuditContext, type WaitlistOrder
} from '~/composables/useWaitlistValidation'
import {useBookingValidation, OrderAuditAction, type ClearWaitlistResult, type OrderAuditChange, type OrderSnapshot} from '~/composables/useBookingValidation'
import {orderSnapshotOf, recordCancellation, snapshotInhabitantSelect} from '~~/server/data/financesRepository'
import {groupBy} from '~/utils/batchUtils'

const {throwH3Error, isPrismaNotFound} = eventHandlerHelper
const LOG = '⏳ > WAITLIST'

type PrismaClient = Awaited<ReturnType<typeof getPrismaClientConnection>>

// The conflict a leave or a change meets on an entry a run holds or has placed
const beingPlaced = (id: number) => createError({statusCode: 409, message: `Queue entry ${id} is being placed`})

// An entry's wish as the history keeps it: an order without an id, with the name and the household the history shows
const snapshotOfEntry = async (prisma: PrismaClient, entry: Pick<TicketWaitlistDisplay, 'inhabitantId' | 'dinnerEventId' | 'isGuestTicket' | 'order'>): Promise<OrderSnapshot> => {
    const inhabitant = await prisma.inhabitant.findUniqueOrThrow({where: {id: entry.inhabitantId}, select: snapshotInhabitantSelect})
    const {ticketPriceId, priceAtBooking, dinnerMode, state} = entry.order
    return orderSnapshotOf({
        id: null, inhabitantId: entry.inhabitantId, dinnerEventId: entry.dinnerEventId, ticketPriceId, priceAtBooking, dinnerMode, state,
        isGuestTicket: entry.isGuestTicket
    }, inhabitant)
}

// The history row of a join (QUEUE) or a change (REQUEUE), written before the write as deleteOrder writes its row before
// the delete
const recordEntryWrite = async (prisma: PrismaClient, entry: Parameters<typeof snapshotOfEntry>[1], audit: WaitlistAuditContext, change: OrderAuditChange): Promise<void> => {
    const {createOrderAuditData} = useBookingValidation()
    await prisma.orderHistory.create({
        data: {
            orderId: null, ...audit, inhabitantId: entry.inhabitantId, dinnerEventId: entry.dinnerEventId,
            auditData: createOrderAuditData(change, await snapshotOfEntry(prisma, entry))
        }
    })
}

// The entry a leave or a change writes to; one a run holds or has placed refuses with a conflict
const unheldEntry = async (prisma: PrismaClient, id: number): Promise<TicketWaitlistDisplay> => {
    const {deserializeTicketWaitlist} = useWaitlistValidation()
    const row = await prisma.ticketWaitlist.findFirst({where: {id, placingAt: null}})
    if (!row) throw beingPlaced(id)
    return deserializeTicketWaitlist(row)
}

/**
 * The waiting list rows: an entry per unplaced order, read FIFO by `createdAt`. The `order` column carries the
 * order-create shape as JSON (ADR-010); the partial unique index on (dinnerEventId, inhabitantId) for regular
 * entries answers a second regular entry with the unique-violation code, which the error floor maps to 409.
 * Each write to an entry writes its OrderHistory row with no order, which fetchUserIntentKeys reads as the person's act.
 */
export async function createWaitlistEntry(d1Client: D1Database, entry: TicketWaitlistCreate, audit: WaitlistAuditContext): Promise<TicketWaitlistDisplay> {
    const {serializeTicketWaitlist, deserializeTicketWaitlist} = useWaitlistValidation()
    const {OrderAuditChangeSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [JOIN] Inhabitant ${entry.inhabitantId} joins the queue of dinner ${entry.dinnerEventId}${entry.isGuestTicket ? ' with a guest ticket' : ''}`)
    try {
        await recordEntryWrite(prisma, entry, audit, OrderAuditChangeSchema.enum.QUEUE)
        const row = await prisma.ticketWaitlist.create({
            data: serializeTicketWaitlist(entry)
        })
        return deserializeTicketWaitlist(row)
    } catch (error) {
        return throwH3Error(`${LOG} > [JOIN] Error adding inhabitant ${entry.inhabitantId} to the queue of dinner ${entry.dinnerEventId}`, error)
    }
}

// The queues of the dinners, first joined first; the entries of the dinners interleave by join time
export async function fetchWaitlistForDinners(d1Client: D1Database, dinnerEventIds: number[]): Promise<TicketWaitlistDisplay[]> {
    const {deserializeTicketWaitlist} = useWaitlistValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const rows = await prisma.ticketWaitlist.findMany({
            where: {dinnerEventId: {in: dinnerEventIds}},
            orderBy: [{createdAt: 'asc'}, {id: 'asc'}]
        })
        return rows.map(deserializeTicketWaitlist)
    } catch (error) {
        return throwH3Error(`${LOG} > [GET] Error fetching the queues of dinners ${dinnerEventIds.join(', ')}`, error)
    }
}

// A household's entries, across the given dinners or all of them
export async function fetchWaitlistForHousehold(d1Client: D1Database, householdId: number, dinnerEventIds?: number[]): Promise<TicketWaitlistDisplay[]> {
    const {deserializeTicketWaitlist} = useWaitlistValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const rows = await prisma.ticketWaitlist.findMany({
            where: {
                inhabitant: {householdId},
                ...(dinnerEventIds !== undefined && {dinnerEventId: {in: dinnerEventIds}})
            },
            orderBy: [{createdAt: 'asc'}, {id: 'asc'}]
        })
        return rows.map(deserializeTicketWaitlist)
    } catch (error) {
        return throwH3Error(`${LOG} > [GET] Error fetching the queue entries of household ${householdId}`, error)
    }
}

// A new wish on an entry: `createdAt` stays, so the entry keeps its place in the queue. An entry a run holds or has
// placed refuses the change with a conflict
export async function updateWaitlistEntryOrder(d1Client: D1Database, id: number, order: WaitlistOrder, audit: WaitlistAuditContext): Promise<TicketWaitlistDisplay> {
    const {serializeTicketWaitlist, deserializeTicketWaitlist} = useWaitlistValidation()
    const {OrderAuditChangeSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [REQUEUE] Queue entry ${id} now wishes ${order.dinnerMode} at ticket price ${order.ticketPriceId}`)
    try {
        await recordEntryWrite(prisma, {...await unheldEntry(prisma, id), order}, audit, OrderAuditChangeSchema.enum.REQUEUE)
        const row = await prisma.ticketWaitlist.update({where: {id, placingAt: null}, data: serializeTicketWaitlist({order})})
        return deserializeTicketWaitlist(row)
    } catch (error) {
        if (isPrismaNotFound(error)) throw beingPlaced(id)
        return throwH3Error(`${LOG} > [REQUEUE] Error rewriting queue entry ${id}`, error)
    }
}

// The member leaves the queue, a cancellation (recordCancellation) whose change is LEAVE; an entry a run holds or has
// placed refuses the leave with a conflict
export async function deleteWaitlistEntry(d1Client: D1Database, id: number, audit: WaitlistAuditContext): Promise<number> {
    const {OrderAuditChangeSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [LEAVE] Removing queue entry ${id}`)
    try {
        const entry = await unheldEntry(prisma, id)
        await recordCancellation(d1Client, {
            orderId: null, inhabitantId: entry.inhabitantId, dinnerEventId: entry.dinnerEventId, seasonId: audit.seasonId,
            // A cancellation names its member; the system's carries none
            performedByUserId: audit.action === OrderAuditAction.USER_CANCELLED ? audit.performedByUserId : null,
            snapshot: await snapshotOfEntry(prisma, entry)
        }, OrderAuditChangeSchema.enum.LEAVE)
        const deleted = await prisma.ticketWaitlist.delete({where: {id, placingAt: null}, select: {id: true}})
        return deleted.id
    } catch (error) {
        if (isPrismaNotFound(error)) throw beingPlaced(id)
        return throwH3Error(`${LOG} > [LEAVE] Error removing queue entry ${id}`, error)
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
        return orders.map(({orderHistory: [claim], ...order}) => PlacementOrderSchema.parse({
            ...order,
            sellerHouseholdId: claim ? readOrderAudit(claim)?.householdId ?? null : null
        }))
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
