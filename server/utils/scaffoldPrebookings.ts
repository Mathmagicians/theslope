import type {D1Database} from "@cloudflare/workers-types"
import {fetchOrders, createOrders, deleteOrder, updateOrder, fetchUserCancellationKeys} from "~~/server/data/financesRepository"
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
    priceUpdated: 0,
    modeUpdated: 0,
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
    const {OrderAuditActionSchema, OrderStateSchema, DinnerModeSchema, ScaffoldResultSchema, chunkFetchIds} = useBookingValidation()

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

    // Build lookup for deadline checks: dinnerEventId → date
    const dinnerEventDateById = new Map(dinnerEvents.map(de => [de.id, de.date]))
    const { canModifyOrders } = useSeason().deadlinesForSeason(season)

    // Process each household and accumulate results
    let totalCreated = 0
    let totalDeleted = 0
    let totalReleased = 0
    let totalPriceUpdated = 0
    let totalModeUpdated = 0
    let totalUnchanged = 0
    let processedHouseholds = 0
    let erroredHouseholds = 0

    for (const household of households) {
        try {
            const householdInhabitantIds = new Set(household.inhabitants.map(i => i.id))
            const householdOrders = existingOrders.filter(o => householdInhabitantIds.has(o.inhabitantId))

            // Build lookup: key → existing order (for updates)
            const orderByKey = new Map(
                householdOrders.map(o => [`${o.inhabitantId}-${o.dinnerEventId}`, o])
            )

            const result = scaffolder(household, householdOrders, cancelledKeys)

            // Create new orders
            for (const batch of chunkOrderBatch(result.create)) {
                await createOrders(d1Client, household.id, batch, {
                    action: OrderAuditActionSchema.enum.SYSTEM_CREATED,
                    performedByUserId: null,
                    source: options.householdId ? 'preference-update' : 'scaffold-prebookings'
                })
            }

            // Update changed orders: price changes, mode changes, or releases (NONE after deadline)
            let householdPriceUpdates = 0
            let householdModeUpdates = 0
            let householdUpdateReleased = 0
            for (const incoming of result.update) {
                const key = `${incoming.inhabitantId}-${incoming.dinnerEventId}`
                const existing = orderByKey.get(key)
                if (!existing) continue

                const isPriceChange = existing.ticketPriceId !== incoming.ticketPriceId
                const isReleaseIntent = incoming.dinnerMode === DinnerModeSchema.enum.NONE

                if (isPriceChange) {
                    // Price category changed (birthdate added/changed) - update fields, keep BOOKED
                    householdPriceUpdates++
                    await updateOrder(d1Client, existing.id, {
                        dinnerMode: incoming.dinnerMode,
                        ticketPriceId: incoming.ticketPriceId,
                        priceAtBooking: incoming.priceAtBooking
                    }, {
                        action: OrderAuditActionSchema.enum.SYSTEM_UPDATED,
                        performedByUserId: null
                    })
                } else if (isReleaseIntent) {
                    // NONE preference after deadline - release order (user charged, ticket claimable)
                    householdUpdateReleased++
                    await updateOrder(d1Client, existing.id, {
                        dinnerMode: incoming.dinnerMode,
                        state: OrderStateSchema.enum.RELEASED,
                        releasedAt: new Date()
                    }, {
                        action: OrderAuditActionSchema.enum.SYSTEM_UPDATED,
                        performedByUserId: null
                    })
                } else {
                    // Mode change between eating modes (DINEIN/TAKEAWAY/DINEINLATE) - update mode, keep BOOKED
                    householdModeUpdates++
                    await updateOrder(d1Client, existing.id, {
                        dinnerMode: incoming.dinnerMode
                    }, {
                        action: OrderAuditActionSchema.enum.SYSTEM_UPDATED,
                        performedByUserId: null
                    })
                }
            }

            // Delete or release orders based on cancellation deadline
            let householdDeleted = 0
            let householdReleased = 0
            for (const toDelete of result.delete) {
                const dinnerDate = dinnerEventDateById.get(toDelete.dinnerEventId)
                if (!dinnerDate) continue

                if (canModifyOrders(dinnerDate)) {
                    // Before cancellation deadline - delete order (no charge)
                    householdDeleted++
                    await deleteOrder(d1Client, [toDelete.id], null)
                } else {
                    // After cancellation deadline - release order (user charged, ticket claimable)
                    householdReleased++
                    await updateOrder(d1Client, toDelete.id, {
                        state: OrderStateSchema.enum.RELEASED,
                        releasedAt: new Date()
                    }, {
                        action: OrderAuditActionSchema.enum.SYSTEM_UPDATED,
                        performedByUserId: null
                    })
                }
            }

            totalCreated += result.create.length
            totalDeleted += householdDeleted
            totalReleased += householdReleased + householdUpdateReleased
            totalPriceUpdated += householdPriceUpdates
            totalModeUpdated += householdModeUpdates
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

    console.info(`${LOG} Complete: created=${totalCreated}, deleted=${totalDeleted}, released=${totalReleased}, priceUpdated=${totalPriceUpdated}, modeUpdated=${totalModeUpdated}, unchanged=${totalUnchanged}, households=${processedHouseholds}, errored=${erroredHouseholds}`)

    return ScaffoldResultSchema.parse({
        seasonId: effectiveSeasonId,
        created: totalCreated,
        deleted: totalDeleted,
        released: totalReleased,
        priceUpdated: totalPriceUpdated,
        modeUpdated: totalModeUpdated,
        unchanged: totalUnchanged,
        households: processedHouseholds,
        errored: erroredHouseholds
    })
}
