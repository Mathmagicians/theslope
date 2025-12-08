import {defineEventHandler, getValidatedRouterParams, setResponseStatus} from "h3"
import {fetchOrders, createOrders, deleteOrder, fetchUserCancellationKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchSeason} from "~~/server/data/prismaRepository"
import {useSeason} from "~/composables/useSeason"
import {useBookingValidation} from "~/composables/useBookingValidation"
import {z} from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {throwH3Error} = eventHandlerHelper

const LOG = '🎟️ > SEASON > [SCAFFOLD_PREBOOKINGS]'

const idSchema = z.object({
    id: z.coerce.number().int().positive('Season ID must be a positive integer')
})

type ScaffoldResult = {
    seasonId: number
    created: number
    deleted: number
    unchanged: number
    households: number
}

/**
 * POST /api/admin/season/[id]/scaffold-prebookings
 * Scaffolds pre-bookings for season's dinner events based on inhabitant preferences.
 * Called by: season activation (days 1-60) OR daily cron (day 61+)
 */
export default defineEventHandler(async (event): Promise<ScaffoldResult> => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation
    let seasonId: number
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        seasonId = params.id
    } catch (error) {
        return throwH3Error(`${LOG} Validation error`, error)
    }

    // Business logic
    try {
        const {createHouseholdOrderScaffold, chunkOrderBatch} = useSeason()
        const {OrderAuditActionSchema, chunkIds} = useBookingValidation()

        // 1. Fetch season with dinner events and ticket prices
        const season = await fetchSeason(d1Client, seasonId)
        if (!season) {
            return throwH3Error(`${LOG} Season ${seasonId} not found`, new Error('Not found'), 404)
        }

        const dinnerEvents = season.dinnerEvents ?? []
        if (dinnerEvents.length === 0) {
            console.info(`${LOG} No dinner events for season ${seasonId}`)
            setResponseStatus(event, 200)
            return { seasonId, created: 0, deleted: 0, unchanged: 0, households: 0 }
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

        for (const household of households) {
            const householdInhabitantIds = new Set(household.inhabitants.map(i => i.id))
            const householdOrders = existingOrders.filter(o => householdInhabitantIds.has(o.inhabitantId))

            const result = scaffolder(household, householdOrders, cancelledKeys)

            // Create new orders in batches
            if (result.create.length > 0) {
                const batches = chunkOrderBatch(result.create)
                for (const batch of batches) {
                    await createOrders(d1Client, household.id, batch, {
                        action: OrderAuditActionSchema.enum.SYSTEM_SCAFFOLDED,
                        performedByUserId: null,
                        source: 'scaffold-prebookings'
                    })
                }
                totalCreated += result.create.length
            }

            // Delete obsolete orders in batches
            const deleteIds = result.delete.filter(o => 'id' in o && o.id).map(o => (o as {id: number}).id)
            if (deleteIds.length > 0) {
                const deleteBatches = chunkIds(deleteIds)
                for (const batch of deleteBatches) {
                    await deleteOrder(d1Client, batch, null)
                }
                totalDeleted += deleteIds.length
            }

            totalUnchanged += result.idempotent.length
        }

        console.info(`${LOG} Complete: created=${totalCreated}, deleted=${totalDeleted}, unchanged=${totalUnchanged}`)

        setResponseStatus(event, 200)
        return {
            seasonId,
            created: totalCreated,
            deleted: totalDeleted,
            unchanged: totalUnchanged,
            households: households.length
        }
    } catch (error) {
        return throwH3Error(`${LOG} Error scaffolding pre-bookings`, error)
    }
})
