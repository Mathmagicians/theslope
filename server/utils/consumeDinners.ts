import type {D1Database} from "@cloudflare/workers-types"
import {fetchPendingDinnersInActiveSeason, updateDinnersToConsumed} from "~~/server/data/financesRepository"
import type {ConsumeResult} from "~/composables/useBookingValidation"
import {useBooking} from "~/composables/useBooking"

const LOG = '🍽️ > DAILY > [CONSUME_DINNERS]'

/**
 * Mark all past non-consumed, non-cancelled dinners in active season as CONSUMED.
 * Resilient to missed crons - processes ALL pending past dinners.
 */
export async function consumeDinners(d1Client: D1Database): Promise<ConsumeResult> {
    const {chunkDinnerIds, getPastDinnerIds} = useBooking()

    const pendingDinners = await fetchPendingDinnersInActiveSeason(d1Client)

    if (pendingDinners.length === 0) {
        console.info(`${LOG} No pending dinners found`)
        return {consumed: 0}
    }

    const pastDinnerIds = getPastDinnerIds(pendingDinners)

    if (pastDinnerIds.length === 0) {
        console.info(`${LOG} No past pending dinners to consume`)
        return {consumed: 0}
    }

    console.info(`${LOG} Found ${pastDinnerIds.length} past pending dinners to consume`)

    const batches = chunkDinnerIds(pastDinnerIds)
    let totalConsumed = 0

    for (const batch of batches) {
        const count = await updateDinnersToConsumed(d1Client, batch)
        totalConsumed += count
    }

    console.info(`${LOG} Complete: consumed=${totalConsumed}`)

    return {consumed: totalConsumed}
}
