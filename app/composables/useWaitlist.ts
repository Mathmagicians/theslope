import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import type {PricePortions, TicketPrice} from '~/composables/useTicketPriceValidation'
import type {TicketType} from '~/composables/useBookingValidation'
import {sumBy} from '~/utils/ledger'

// Ascending by time; the id breaks a tie between rows stamped in the same instant
export const byTimeThenId = <T extends {id: number}>(getTime: (item: T) => number) => (a: T, b: T): number =>
    getTime(a) - getTime(b) || a.id - b.id

type PortionsOf = (entry: TicketWaitlistDisplay) => number
type TicketTypeOf = (entry: TicketWaitlistDisplay) => TicketType | undefined

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

    // Strict FIFO: the walk stops at the first entry that does not fit the remaining supply, so nobody overtakes
    const resolveWaitlistAssignment = (
        entries: TicketWaitlistDisplay[],
        supplyPortions: number,
        portionsOf: PortionsOf
    ): WaitlistAssignmentPlan => {
        const queue = inQueueOrder(entries)
        const take: WaitlistTake[] = []
        let remaining = supplyPortions
        let index = 0
        while (index < queue.length) {
            const entry = queue[index]!
            const portions = portionsOf(entry)
            if (portions > remaining) break
            take.push({entry, portions})
            remaining -= portions
            index++
        }
        return {take, portionsUsed: supplyPortions - remaining, waiting: queue.slice(index)}
    }

    return {inQueueOrder, ticketTypeOfEntry, waitingLines, positionOf, portionsOfEntryFor, portionNeed, resolveWaitlistAssignment}
}
