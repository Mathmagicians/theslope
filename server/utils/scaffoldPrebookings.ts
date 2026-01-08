import type {D1Database} from "@cloudflare/workers-types"
import {fetchOrders, createOrders, deleteOrder, updateOrdersToState, fetchUserCancellationKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchSeason, fetchActiveSeasonId} from "~~/server/data/prismaRepository"
import {useSeason} from "~/composables/useSeason"
import {useBookingValidation, type ScaffoldResult} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const LOG = '🎟️ > SEASON > [SCAFFOLD_PREBOOKINGS]'

/**
 * Options for scaffolding pre-bookings
 */
export type ScaffoldOptions = {
    /** If provided, scaffold for this season. Otherwise uses active season. */
    seasonId?: number
    /** If provided, filter to this household. Otherwise process all households. */
    householdId?: number
}

/**
 * Result when no season available (seasonId: null)
 */
const skippedResult = (): ScaffoldResult => ({
    seasonId: null,
    created: 0,
    deleted: 0,
    released: 0,
    unchanged: 0,
    households: 0,
    errored: 0
})

/**
 * Scaffolds pre-bookings for season's dinner events based on inhabitant preferences.
 * Core business logic shared between endpoints, activation workflow, and preference updates.
 *
 * @param d1Client - D1 database client
 * @param options - Scaffold options (seasonId, householdId)
 * @returns ScaffoldResult with seasonId=null if no season available
 */
export async function scaffoldPrebookings(
    d1Client: D1Database,
    options: ScaffoldOptions = {}
): Promise<ScaffoldResult> {
    const {createHouseholdOrderScaffold, getScaffoldableDinnerEvents, chunkOrderBatch} = useSeason()
    const {OrderAuditActionSchema, OrderStateSchema, chunkIds, chunkFetchIds} = useBookingValidation()

    // Resolve season ID - use provided or fall back to active season
    const effectiveSeasonId = options.seasonId ?? await fetchActiveSeasonId(d1Client)
    if (!effectiveSeasonId) {
        console.info(`${LOG} No season provided and no active season - skipping`)
        return skippedResult()
    }

    // Fetch season with dinner events and ticket prices
    const season = await fetchSeason(d1Client, effectiveSeasonId)
    if (!season) {
        console.warn(`${LOG} Season ${effectiveSeasonId} not found`)
        return skippedResult()
    }

    // Filter to scaffoldable dinner events (within prebooking window)
    const dinnerEvents = getScaffoldableDinnerEvents(season.dinnerEvents ?? [])
    const dinnerEventIds = dinnerEvents.map(e => e.id)

    // Fetch households - optionally filtered to single household
    const households = await fetchHouseholds(d1Client, options.householdId)

    // Fetch orders (chunked) and cancellation keys in parallel
    const [orderBatches, cancelledKeys] = await Promise.all([
        Promise.all(chunkFetchIds(dinnerEventIds).map(batch => fetchOrders(d1Client, batch))),
        fetchUserCancellationKeys(d1Client, effectiveSeasonId)
    ])
    const existingOrders = orderBatches.flat()

    console.info(`${LOG} Processing ${households.length} household(s) for ${dinnerEvents.length} events`)

    // Create scaffolder configured for this season (with filtered dinner events)
    const scaffolder = createHouseholdOrderScaffold({ ...season, dinnerEvents })

    // Process each household and accumulate results
    let totalCreated = 0
    let totalDeleted = 0
    let totalReleased = 0
    let totalUnchanged = 0
    let processedHouseholds = 0
    let erroredHouseholds = 0

    for (const household of households) {
        try {
            const householdInhabitantIds = new Set(household.inhabitants.map(i => i.id))
            const householdOrders = existingOrders.filter(o => householdInhabitantIds.has(o.inhabitantId))

            // Build lookup: key → existing order id (for release updates)
            const orderIdByKey = new Map(
                householdOrders.map(o => [`${o.inhabitantId}-${o.dinnerEventId}`, o.id])
            )

            const result = scaffolder(household, householdOrders, cancelledKeys)

            const releaseIds = result.update
                .map(o => orderIdByKey.get(`${o.inhabitantId}-${o.dinnerEventId}`))
                .filter((id): id is number => id !== undefined)
            const deleteIds = result.delete.map(o => o.id)

            // Create new orders
            for (const batch of chunkOrderBatch(result.create)) {
                await createOrders(d1Client, household.id, batch, {
                    action: OrderAuditActionSchema.enum.SYSTEM_CREATED,
                    performedByUserId: null,
                    source: options.householdId ? 'preference-update' : 'scaffold-prebookings'
                })
            }

            // Release and delete orders
            for (const batch of chunkIds(releaseIds)) {
                await updateOrdersToState(d1Client, batch, OrderStateSchema.enum.RELEASED)
            }
            for (const batch of chunkIds(deleteIds)) {
                await deleteOrder(d1Client, batch, null)
            }

            totalCreated += result.create.length
            totalReleased += releaseIds.length
            totalDeleted += deleteIds.length

            totalUnchanged += result.idempotent.length
            processedHouseholds++
        } catch (error) {
            // Household may have been deleted during scaffolding (FK constraint error)
            // Log and continue with remaining households - don't fail entire operation
            erroredHouseholds++
            const h3e = eventHandlerHelper.h3eFromCatch(
                `${LOG} Skipping household ${household.id} (${household.name})`,
                error
            )
            eventHandlerHelper.logH3Error(h3e, error)
        }
    }

    console.info(`${LOG} Complete: created=${totalCreated}, deleted=${totalDeleted}, released=${totalReleased}, unchanged=${totalUnchanged}, households=${processedHouseholds}, errored=${erroredHouseholds}`)

    return {
        seasonId: effectiveSeasonId,
        created: totalCreated,
        deleted: totalDeleted,
        released: totalReleased,
        unchanged: totalUnchanged,
        households: processedHouseholds,
        errored: erroredHouseholds
    }
}
