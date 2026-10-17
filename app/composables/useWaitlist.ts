import {subMinutes} from 'date-fns'
import {
    PlacementRecovery, type GrabbedWaitlistEntry, type PlacementOrder, type TicketWaitlistDisplay, type WaitlistPlacementOutcomes
} from '~/composables/useWaitlistValidation'
import type {PricePortions, TicketPrice} from '~/composables/useTicketPriceValidation'
import {OrderState, type TicketType} from '~/composables/useBookingValidation'
import {sumBy} from '~/utils/ledger'

// Ascending by time; the id breaks a tie between rows stamped in the same instant
export const byTimeThenId = <T extends {id: number}>(getTime: (item: T) => number) => (a: T, b: T): number =>
    getTime(a) - getTime(b) || a.id - b.id

type PortionsOf = (entry: TicketWaitlistDisplay) => number
type TicketTypeOf = (entry: TicketWaitlistDisplay) => TicketType | undefined
type IsHeld = (entry: TicketWaitlistDisplay) => boolean

interface WaitlistTake {
    entry: TicketWaitlistDisplay
    portions: number
}

interface WaitlistAssignmentPlan {
    take: WaitlistTake[]
    portionsUsed: number
    waiting: TicketWaitlistDisplay[]
}

/**
 * The waiting list's pure decisions (ADR-016 shape: the generator decides, the server executes).
 * Imported by the server: explicit imports only (ADR-017).
 */
export const useWaitlist = () => {
    // FIFO by join time
    const inQueueOrder = (entries: TicketWaitlistDisplay[]): TicketWaitlistDisplay[] =>
        [...entries].sort(byTimeThenId(entry => entry.createdAt.getTime()))

    // The ticket type an entry waits for: the type of the season price it holds
    const ticketTypeOfEntry = (ticketPrices: Pick<TicketPrice, 'id' | 'ticketType'>[]): TicketTypeOf => (entry: TicketWaitlistDisplay) =>
        ticketPrices.find(price => price.id === entry.order.ticketPriceId)?.ticketType

    // One first-come-first-served line per ticket type, each in join order
    const waitingLines = (entries: TicketWaitlistDisplay[], ticketTypeOf: TicketTypeOf): Map<TicketType, TicketWaitlistDisplay[]> => {
        const lines = new Map<TicketType, TicketWaitlistDisplay[]>()
        for (const entry of inQueueOrder(entries)) {
            const ticketType = ticketTypeOf(entry)
            if (ticketType) lines.set(ticketType, [...(lines.get(ticketType) ?? []), entry])
        }
        return lines
    }

    // A run that grabbed an entry holds it for the lease; a grab as old as the lease is the trace of a run that stopped midway
    const placingLease = (now: Date, leaseMinutes: number): {isHeld: IsHeld, isExpired: (entry: TicketWaitlistDisplay) => entry is GrabbedWaitlistEntry} => {
        const start = subMinutes(now, leaseMinutes).getTime()
        return {
            isHeld: entry => entry.placingAt !== null && entry.placingAt.getTime() > start,
            isExpired: (entry): entry is GrabbedWaitlistEntry => entry.placingAt !== null && entry.placingAt.getTime() <= start
        }
    }

    // The lines a run places from: a line stops at its first entry another run holds, so nobody overtakes it
    const placementLines = (entries: TicketWaitlistDisplay[], ticketTypeOf: TicketTypeOf, isHeld: IsHeld): Map<TicketType, TicketWaitlistDisplay[]> =>
        new Map([...waitingLines(entries, ticketTypeOf)].map(([ticketType, line]) => {
            const held = line.findIndex(isHeld)
            return [ticketType, held === -1 ? line : line.slice(0, held)]
        }))

    // 1-based place in the line of the entry's ticket type, null when the entry is not in the queue
    const positionOf = (entries: TicketWaitlistDisplay[], entryId: number, ticketTypeOf: TicketTypeOf): number | null => {
        const entry = entries.find(candidate => candidate.id === entryId)
        const ticketType = entry && ticketTypeOf(entry)
        if (!ticketType) return null
        return waitingLines(entries, ticketTypeOf).get(ticketType)!.findIndex(candidate => candidate.id === entryId) + 1
    }

    // An entry weighs on the kitchen's count what a ticket at the price it holds weighs
    const portionsOfEntryFor = (ticketPrices: PricePortions[]): PortionsOf => (entry: TicketWaitlistDisplay): number =>
        ticketPrices.find(price => price.id === entry.order.ticketPriceId)?.portions ?? 0

    const portionNeed = (entries: TicketWaitlistDisplay[], portionsOf: PortionsOf): number =>
        sumBy(entries, portionsOf)

    // Strict FIFO: the walk stops at the first entry that does not fit the remaining supply or that another run holds,
    // so nobody overtakes
    const resolveWaitlistAssignment = (
        entries: TicketWaitlistDisplay[],
        supplyPortions: number,
        portionsOf: PortionsOf,
        isHeld: IsHeld
    ): WaitlistAssignmentPlan => {
        const queue = inQueueOrder(entries)
        const take: WaitlistTake[] = []
        let remaining = supplyPortions
        let index = 0
        while (index < queue.length) {
            const entry = queue[index]!
            const portions = portionsOf(entry)
            if (isHeld(entry) || portions > remaining) break
            take.push({entry, portions})
            remaining -= portions
            index++
        }
        return {take, portionsUsed: supplyPortions - remaining, waiting: queue.slice(index)}
    }

    // An extra portion's order is written after the grab; a sold ticket was released before it
    const isWrittenAfterGrab = (entry: GrabbedWaitlistEntry, order: PlacementOrder): boolean =>
        order.createdAt.getTime() >= entry.placingAt.getTime()

    // The order that serves a grabbed entry: its recorded order, else the first order written since the grab that
    // serves no other entry
    const placingOrderOf = (entry: GrabbedWaitlistEntry, orders: PlacementOrder[], servingOrderIds: ReadonlySet<number>): PlacementOrder | null =>
        orders.find(order => entry.placingOrderId === null ? !servingOrderIds.has(order.id) : order.id === entry.placingOrderId) ?? null

    // The evidence a stopped run left decides: the order that serves the entry finishes its placement, anything else
    // hands the entry back to its line
    const placementRecoveryOf = (entry: GrabbedWaitlistEntry, order: PlacementOrder | null): PlacementRecovery => {
        if (order === null) return PlacementRecovery.RELEASE
        switch (true) {
            case isWrittenAfterGrab(entry, order): return PlacementRecovery.FINISH
            // A sale's released ticket, older than the grab, now the entry's
            case order.state === OrderState.BOOKED && order.inhabitantId === entry.inhabitantId && order.isGuestTicket === entry.isGuestTicket:
                return PlacementRecovery.FINISH
            default: return PlacementRecovery.RELEASE
        }
    }

    // What a finished placement reports for its mails: the extra portion assigned to the entry, or the ticket sold to it
    // by the household its claim names; a claim that names none reports nothing
    const finishedPlacementOutcomes = (entry: GrabbedWaitlistEntry, order: PlacementOrder, portionsOf: PortionsOf): WaitlistPlacementOutcomes => {
        const {dinnerEventId, inhabitantId, isGuestTicket} = entry
        switch (true) {
            case isWrittenAfterGrab(entry, order): return {
                waitlistTicketsSold: [],
                waitlistPortionsAssigned: [{
                    dinnerEventId, entryId: entry.id, inhabitantId, isGuestTicket, portions: portionsOf(entry), orderId: order.id,
                    ticketPriceId: entry.order.ticketPriceId
                }]
            }
            case order.ticketPriceId !== null && order.sellerHouseholdId !== null: return {
                waitlistTicketsSold: [{
                    dinnerEventId, ticketPriceId: order.ticketPriceId, buyerInhabitantId: inhabitantId,
                    buyerHouseholdId: entry.order.householdId, sellerHouseholdId: order.sellerHouseholdId
                }],
                waitlistPortionsAssigned: []
            }
            default: return {waitlistTicketsSold: [], waitlistPortionsAssigned: []}
        }
    }

    return {
        inQueueOrder, ticketTypeOfEntry, waitingLines, placementLines, positionOf, portionsOfEntryFor, portionNeed,
        resolveWaitlistAssignment, placingLease, placingOrderOf, placementRecoveryOf, finishedPlacementOutcomes
    }
}
