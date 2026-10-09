import {getPrismaClientConnection} from '~~/server/utils/database'
import eventHandlerHelper from '~~/server/utils/eventHandlerHelper'
import {useWaitlistValidation, type TicketWaitlistDisplay, type WaitlistOrder} from '~/composables/useWaitlistValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'

const {throwH3Error} = eventHandlerHelper
const LOG = '⏳ > WAITLIST'

export interface WaitlistEntryCreate {
    dinnerEventId: number
    inhabitantId: number
    isGuestTicket: boolean
    order: WaitlistOrder
}

/**
 * The waiting list rows: an entry per unplaced order, read FIFO by `createdAt`. The `order` column carries the
 * order-create shape as JSON (ADR-010); the partial unique index on (dinnerEventId, inhabitantId) for regular
 * entries answers a second regular entry with the unique-violation code, which the error floor maps to 409.
 */
export async function createWaitlistEntry(d1Client: D1Database, entry: WaitlistEntryCreate): Promise<TicketWaitlistDisplay> {
    const {serializeWaitlistOrder, deserializeTicketWaitlist} = useWaitlistValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(`${LOG} > [JOIN] Inhabitant ${entry.inhabitantId} joins the queue of dinner ${entry.dinnerEventId}${entry.isGuestTicket ? ' with a guest ticket' : ''}`)
    try {
        const row = await prisma.ticketWaitlist.create({
            data: {
                dinnerEventId: entry.dinnerEventId,
                inhabitantId: entry.inhabitantId,
                isGuestTicket: entry.isGuestTicket,
                order: serializeWaitlistOrder(entry.order)
            }
        })
        return deserializeTicketWaitlist(row)
    } catch (error) {
        return throwH3Error(`${LOG} > [JOIN] Error adding inhabitant ${entry.inhabitantId} to the queue of dinner ${entry.dinnerEventId}`, error)
    }
}

export async function fetchWaitlistEntry(d1Client: D1Database, id: number): Promise<(TicketWaitlistDisplay & {householdId: number}) | null> {
    const {deserializeTicketWaitlist} = useWaitlistValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const row = await prisma.ticketWaitlist.findUnique({
            where: {id},
            include: {inhabitant: {select: {householdId: true}}}
        })
        if (!row) return null
        const {inhabitant, ...entry} = row
        return {...deserializeTicketWaitlist(entry), householdId: inhabitant.householdId}
    } catch (error) {
        return throwH3Error(`${LOG} > [GET] Error fetching queue entry ${id}`, error)
    }
}

// The queue of a dinner, first joined first
export async function fetchWaitlistForDinner(d1Client: D1Database, dinnerEventId: number): Promise<TicketWaitlistDisplay[]> {
    const {deserializeTicketWaitlist} = useWaitlistValidation()
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const rows = await prisma.ticketWaitlist.findMany({
            where: {dinnerEventId},
            orderBy: [{createdAt: 'asc'}, {id: 'asc'}]
        })
        return rows.map(deserializeTicketWaitlist)
    } catch (error) {
        return throwH3Error(`${LOG} > [GET] Error fetching the queue of dinner ${dinnerEventId}`, error)
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
