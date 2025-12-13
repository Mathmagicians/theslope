import type {D1Database} from "@cloudflare/workers-types"
import {fetchPendingDinnersInActiveSeason, updateDinnersToConsumed} from "~~/server/data/financesRepository"
import type {ConsumeResult} from "~/composables/useBookingValidation"
import {useBooking} from "~/composables/useBooking"
import {useSeason} from "~/composables/useSeason"

const LOG = '🍽️ > DAILY > [CONSUME_DINNERS]'

/**
 * Mark all past non-consumed, non-cancelled dinners in active season as CONSUMED.
 * Resilient to missed crons - processes ALL pending past dinners.
 *
 * Uses splitDinnerEvents from useSeason for correct "past" determination
 * (accounts for dinner time window, not just calendar date)
 *
 * @returns ConsumeResult with count of consumed dinners
 */
export async function consumeDinners(d1Client: D1Database): Promise<ConsumeResult> {
    const {chunkDinnerIds} = useBooking()
    const {getNextDinnerDate, getDefaultDinnerStartTime, splitDinnerEvents} = useSeason()

    // Fetch all pending dinners from repository
    const pendingDinners = await fetchPendingDinnersInActiveSeason(d1Client)

    if (pendingDinners.length === 0) {
        console.info(`${LOG} No pending dinners found`)
        return { consumed: 0 }
    }

    // Use splitDinnerEvents to correctly identify past dinners (accounts for dinner time)
    const dinnerDates = pendingDinners.map(d => d.date)
    const nextDinnerRange = getNextDinnerDate(dinnerDates, getDefaultDinnerStartTime())
    const {pastDinnerDates} = splitDinnerEvents(pendingDinners, nextDinnerRange)

    // Map past dates back to dinner IDs
    const pastDinnerIds = pendingDinners
        .filter(d => pastDinnerDates.some(pd => pd.getTime() === d.date.getTime()))
        .map(d => d.id)

    if (pastDinnerIds.length === 0) {
        console.info(`${LOG} No past pending dinners to consume`)
        return { consumed: 0 }
    }

    console.info(`${LOG} Found ${pastDinnerIds.length} past pending dinners to consume`)

    // Batch update to CONSUMED via repository
    const batches = chunkDinnerIds(pastDinnerIds)
    let totalConsumed = 0

    for (const batch of batches) {
        const count = await updateDinnersToConsumed(d1Client, batch)
        totalConsumed += count
    }

    console.info(`${LOG} Complete: consumed=${totalConsumed}`)

    return { consumed: totalConsumed }
}
