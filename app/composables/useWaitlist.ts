import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {getPortionsForTicketType} from '~/utils/portions'
import {sumBy} from '~/utils/ledger'

// Ascending by time; the id breaks a tie between rows stamped in the same instant
export const byTimeThenId = <T extends {id: number}>(getTime: (item: T) => number) => (a: T, b: T): number =>
    getTime(a) - getTime(b) || a.id - b.id

type PortionsOf = (entry: TicketWaitlistDisplay) => number

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

    // 1-based place in the queue, null when the entry is not in it
    const positionOf = (entries: TicketWaitlistDisplay[], entryId: number): number | null => {
        const index = inQueueOrder(entries).findIndex(entry => entry.id === entryId)
        return index === -1 ? null : index + 1
    }

    // An entry weighs what its ticket type weighs on the kitchen's count; the price the entry holds names the type
    const portionsOfEntryFor = (ticketPrices: Pick<TicketPrice, 'id' | 'ticketType'>[]): PortionsOf => (entry: TicketWaitlistDisplay): number => {
        const ticketPrice = ticketPrices.find(price => price.id === entry.order.ticketPriceId)
        return ticketPrice ? getPortionsForTicketType(ticketPrice.ticketType) : 0
    }

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

    return {inQueueOrder, positionOf, portionsOfEntryFor, portionNeed, resolveWaitlistAssignment}
}
