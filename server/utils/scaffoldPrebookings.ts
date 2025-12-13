import type {D1Database} from "@cloudflare/workers-types"
import {fetchOrders, createOrders, deleteOrder, fetchUserCancellationKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchSeason} from "~~/server/data/prismaRepository"
import {useSeason} from "~/composables/useSeason"
import {useBookingValidation} from "~/composables/useBookingValidation"
import type {DinnerEventDisplay} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const LOG = '🎟️ > SEASON > [SCAFFOLD_PREBOOKINGS]'

export type ScaffoldResult = {
    seasonId: number
    created: number
    deleted: number
    unchanged: number
    households: number
    errored: number
}

const noOpResult = (seasonId: number): ScaffoldResult => ({
    seasonId, created: 0, deleted: 0, unchanged: 0, households: 0, errored: 0
})

/**
 * Scaffolds pre-bookings for season's dinner events based on inhabitant preferences.
 * Core business logic shared between endpoints and activation workflow.
 * @returns ScaffoldResult or null if season not found
 */
export async function scaffoldPrebookings(d1Client: D1Database, seasonId: number): Promise<ScaffoldResult | null> {
    const {createHouseholdOrderScaffold, chunkOrderBatch, getNextDinnerDate, getDefaultDinnerStartTime, splitDinnerEvents, getPrebookingWindowDays} = useSeason()
    const {OrderAuditActionSchema, chunkIds} = useBookingValidation()

    // 1. Fetch season with dinner events and ticket prices
    const season = await fetchSeason(d1Client, seasonId)
    if (!season) {
        return null
    }

    const allDinnerEvents = season.dinnerEvents ?? []
    if (allDinnerEvents.length === 0) {
        console.info(`${LOG} No dinner events for season ${seasonId}`)
        return noOpResult(seasonId)
    }

    // Filter to future dinner events within prebooking window (today to today + N days)
    // NOTE: splitDinnerEvents separates nextDinner from futureDinnerDates, so we need to include both
    const dinnerDates = allDinnerEvents.map(d => d.date)
    const nextDinnerRange = getNextDinnerDate(dinnerDates, getDefaultDinnerStartTime())
    const prebookingWindow = getPrebookingWindowDays()
    const {nextDinner, futureDinnerDates} = splitDinnerEvents(allDinnerEvents, nextDinnerRange, prebookingWindow)

    // Build set of all scaffoldable dates: nextDinner + futureDinnerDates
    const scaffoldableDates = [...futureDinnerDates]
    if (nextDinner) {
        scaffoldableDates.push(nextDinner.date)
    }
    const scaffoldableDateSet = new Set(scaffoldableDates.map(d => d.getTime()))
    const dinnerEvents = allDinnerEvents.filter((de: DinnerEventDisplay) => scaffoldableDateSet.has(de.date.getTime()))

    if (dinnerEvents.length === 0) {
        console.info(`${LOG} No future dinner events within ${prebookingWindow}-day window for season ${seasonId}`)
        return noOpResult(seasonId)
    }

    const dinnerEventIds = dinnerEvents.map(e => e.id)

    // 2. Fetch all data in parallel
    const [households, existingOrders, cancelledKeys] = await Promise.all([
        fetchHouseholds(d1Client),
        fetchOrders(d1Client, dinnerEventIds),
        fetchUserCancellationKeys(d1Client, seasonId)
    ])

    console.info(`${LOG} Processing ${households.length} households for ${dinnerEvents.length} events`)

    // 3. Create scaffolder configured for this season
    const scaffolder = createHouseholdOrderScaffold(season.ticketPrices, dinnerEvents)

    // 4. Process each household
    let totalCreated = 0
    let totalDeleted = 0
    let totalUnchanged = 0
    let skippedHouseholds = 0

    for (const household of households) {
        try {
            const householdInhabitantIds = new Set(household.inhabitants.map(i => i.id))
            const householdOrders = existingOrders.filter(o => householdInhabitantIds.has(o.inhabitantId))

            const result = scaffolder(household, householdOrders, cancelledKeys)

            // Create new orders in batches
            if (result.create.length > 0) {
                const batches = chunkOrderBatch(result.create)
                for (const batch of batches) {
                    await createOrders(d1Client, household.id, batch, {
                        action: OrderAuditActionSchema.enum.SYSTEM_SCAFFOLD,
                        performedByUserId: null,
                        source: 'scaffold-prebookings'
                    })
                }
                totalCreated += result.create.length
            }

            // Delete obsolete orders in batches (result.delete is OrderDisplay[] with id)
            if (result.delete.length > 0) {
                const deleteIds = result.delete.map(o => o.id)
                const deleteBatches = chunkIds(deleteIds)
                for (const batch of deleteBatches) {
                    await deleteOrder(d1Client, batch, null)
                }
                totalDeleted += deleteIds.length
            }

            totalUnchanged += result.idempotent.length
        } catch (error) {
            // Household may have been deleted during scaffolding (FK constraint error)
            // Log and continue with remaining households - don't fail entire operation
            const h3e = eventHandlerHelper.h3eFromCatch(
                `${LOG} Skipping household ${household.id} (${household.name})`,
                error
            )
            eventHandlerHelper.logH3Error(h3e, error)
            skippedHouseholds++
        }
    }

    if (skippedHouseholds > 0) {
        console.warn(`${LOG} Complete: created=${totalCreated}, deleted=${totalDeleted}, unchanged=${totalUnchanged}, errored=${skippedHouseholds}`)
    } else {
        console.info(`${LOG} Complete: created=${totalCreated}, deleted=${totalDeleted}, unchanged=${totalUnchanged}`)
    }

    return {
        seasonId,
        created: totalCreated,
        deleted: totalDeleted,
        unchanged: totalUnchanged,
        households: households.length - skippedHouseholds,
        errored: skippedHouseholds
    }
}
