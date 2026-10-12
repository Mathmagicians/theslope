import {getPrismaClientConnection} from '~~/server/utils/database'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {useWaitlistValidation, type TicketWaitlistCreate, type TicketWaitlistDisplay, type WaitlistOrder} from '~/composables/useWaitlistValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '⏳ > WAITLIST'

/**
 * The waiting list rows: an entry per unplaced order, read FIFO by `createdAt`. The `order` column carries the
 * order-create shape as JSON (ADR-010); the partial unique index on (dinnerEventId, inhabitantId) for regular
 * entries answers a second regular entry with the unique-violation code, which the error floor maps to 409.
 */
export async function createWaitlistEntry(d1Client: D1Database, entry: TicketWaitlistCreate): Promise<TicketWaitlistDisplay> {
    const {serializeTicketWaitlist, deserializeTicketWaitlist} = useWaitlistValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [JOIN] Inhabitant ${entry.inhabitantId} joins the queue of dinner ${entry.dinnerEventId}${entry.isGuestTicket ? ' with a guest ticket' : ''}`)
    try {
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

// A new wish on an entry: `createdAt` stays, so the entry keeps its place in the queue
export async function updateWaitlistEntryOrder(d1Client: D1Database, id: number, order: WaitlistOrder): Promise<TicketWaitlistDisplay> {
    const {serializeTicketWaitlist, deserializeTicketWaitlist} = useWaitlistValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [REQUEUE] Queue entry ${id} now wishes ${order.dinnerMode} at ticket price ${order.ticketPriceId}`)
    try {
        const row = await prisma.ticketWaitlist.update({where: {id}, data: serializeTicketWaitlist({order})})
        return deserializeTicketWaitlist(row)
    } catch (error) {
        return throwH3Error(`${LOG} > [REQUEUE] Error rewriting queue entry ${id}`, error)
    }
}

export async function deleteWaitlistEntry(d1Client: D1Database, id: number): Promise<void> {
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [LEAVE] Removing queue entry ${id}`)
    try {
        await prisma.ticketWaitlist.delete({where: {id}})
    } catch (error) {
        return throwH3Error(`${LOG} > [LEAVE] Error removing queue entry ${id}`, error)
    }
}

// Daily maintenance: a dinner that reached CONSUMED has no queue
export async function deleteWaitlistForConsumedDinners(d1Client: D1Database): Promise<number> {
    const {DinnerStateSchema} = useBookingValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const result = await prisma.ticketWaitlist.deleteMany({
            where: {dinnerEvent: {state: DinnerStateSchema.enum.CONSUMED}}
        })
        console.info(`${LOG} > [SWEEP] Cleared ${result.count} queue entries of consumed dinners`)
        return result.count
    } catch (error) {
        return throwH3Error(`${LOG} > [SWEEP] Error clearing the queues of consumed dinners`, error)
    }
}
