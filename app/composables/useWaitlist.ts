import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'

export type PortionsOf = (entry: TicketWaitlistDisplay) => number

export interface WaitlistTake {
    entry: TicketWaitlistDisplay
    portions: number
}

export interface WaitlistAssignmentPlan {
    take: WaitlistTake[]
    portionsUsed: number
    waiting: TicketWaitlistDisplay[]
}

/**
 * The waiting list's pure decisions (ADR-016 shape: the generator decides, the server executes).
 * Imported by the server: explicit imports only (ADR-017).
 */
export const useWaitlist = () => {
    // FIFO by join time; the id breaks a tie between entries created in the same instant
    const inQueueOrder = (entries: TicketWaitlistDisplay[]): TicketWaitlistDisplay[] =>
        [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)

    // 1-based place in the queue, null when the entry is not in it
    const positionOf = (entries: TicketWaitlistDisplay[], entryId: number): number | null => {
        const index = inQueueOrder(entries).findIndex(entry => entry.id === entryId)
        return index === -1 ? null : index + 1
    }

    const portionNeed = (entries: TicketWaitlistDisplay[], portionsOf: PortionsOf): number =>
        entries.reduce((sum, entry) => sum + portionsOf(entry), 0)

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

    return {inQueueOrder, positionOf, portionNeed, resolveWaitlistAssignment}
}
