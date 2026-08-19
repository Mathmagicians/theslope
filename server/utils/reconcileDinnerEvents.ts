import type {D1Database} from '@cloudflare/workers-types'
import type {Season} from '~/composables/useSeasonValidation'
import {useSeason} from '~/composables/useSeason'
import {saveDinnerEvents, fetchDinnerEvents, deleteDinnerEvent} from '~~/server/data/financesRepository'

export type ReconciliationResult = {
    created: number
    idempotent: number
    deleted: number
}

/**
 * Reconcile dinner events for a season against its current config.
 * Generates desired events from season (respects holidays, cooking days, date range),
 * compares with actual DB events, and creates/deletes to bring them in sync.
 *
 * Idempotent (ADR-015): safe to call multiple times.
 */
export async function reconcileDinnerEventsForSeason(
    d1Client: D1Database,
    season: Season,
    log: string
): Promise<ReconciliationResult> {
    const {generateDinnerEventDataForSeason, reconcileDinnerEvents} = useSeason()

    const existingEvents = await fetchDinnerEvents(d1Client, {seasonId: season.id!})
    const desiredEvents = generateDinnerEventDataForSeason(season)
    const reconciliation = reconcileDinnerEvents(existingEvents)(desiredEvents)

    console.info(`${log} Reconciliation: create=${reconciliation.create.length}, idempotent=${reconciliation.idempotent.length}, delete=${reconciliation.delete.length}`)

    if (reconciliation.create.length > 0) {
        await saveDinnerEvents(d1Client, reconciliation.create)
        console.info(`${log} Created ${reconciliation.create.length} dinner events`)
    }

    if (reconciliation.delete.length > 0) {
        const idsToDelete = reconciliation.delete.map(e => e.id)
        await deleteDinnerEvent(d1Client, idsToDelete)
        console.info(`${log} Deleted ${reconciliation.delete.length} dinner events`)
    }

    return {
        created: reconciliation.create.length,
        idempotent: reconciliation.idempotent.length,
        deleted: reconciliation.delete.length
    }
}
