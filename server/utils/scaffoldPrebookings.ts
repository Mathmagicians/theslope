import type {D1Database} from "@cloudflare/workers-types"
import {fetchOrders, createOrders, deleteOrder, updateOrder, fetchUserCancellationKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchSeason, fetchActiveSeasonId} from "~~/server/data/prismaRepository"
import {useSeason} from "~/composables/useSeason"
import {useBookingValidation, type ScaffoldResult, type DesiredOrder, type OrderAuditAction, OrderAuditAction as AuditActions} from "~/composables/useBookingValidation"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const LOG = '🎟️ > SEASON > [SCAFFOLD_PREBOOKINGS]'

/**
 * Determine audit action based on user vs system trigger
 */
const getAuditAction = (
    isUserTriggered: boolean,
    actionType: 'create' | 'update' | 'delete'
): OrderAuditAction => {
    if (isUserTriggered) {
        return actionType === 'delete' ? AuditActions.USER_CANCELLED : AuditActions.USER_BOOKED
    }
    switch (actionType) {
        case 'create': return AuditActions.SYSTEM_CREATED
        case 'delete': return AuditActions.SYSTEM_DELETED
        case 'update': return AuditActions.SYSTEM_UPDATED
    }
}

/**
 * Options for scaffolding pre-bookings
 *
 * System mode (cron/preference change): uses preferences, rolling window
 * User mode (booking): uses desiredOrders, specific dinnerEventIds, USER audit
 */
export type ScaffoldOptions = {
    /** If provided, scaffold for this season. Otherwise uses active season. */
    seasonId?: number
    /** If provided, filter to this household. Otherwise process all households. */
    householdId?: number
    /** If provided, filter to these dinner events. Otherwise uses rolling window. */
    dinnerEventIds?: number[]
    /** If provided, use these instead of generating from preferences. */
    desiredOrders?: DesiredOrder[]
    /** If provided, use USER_* audit actions. Otherwise SYSTEM_*. */
    userId?: number
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
 * Two modes:
 * - System mode: desiredOrders undefined → generates from inhabitant preferences
 * - User mode: desiredOrders provided → uses explicit user intent (requires householdId, userId)
 *
 * @param d1Client - D1 database client
 * @param options - Scaffold options (seasonId, householdId, dinnerEventIds, desiredOrders, userId)
 * @returns ScaffoldResult with seasonId=null if no season available
 */
export async function scaffoldPrebookings(
    d1Client: D1Database,
    options: ScaffoldOptions = {}
): Promise<ScaffoldResult> {
    const {createOrderGeneratorFactory, createHouseholdOrderScaffold, getScaffoldableDinnerEvents, chunkOrderBatch, reconcilePreBookings} = useSeason()
    const {OrderStateSchema, DinnerModeSchema, ScaffoldResultSchema, chunkFetchIds} = useBookingValidation()

    const isUserTriggered = options.userId !== undefined
    const isUserMode = options.desiredOrders !== undefined

    // User mode validation: desiredOrders requires householdId and userId
    if (isUserMode && (!options.householdId || !options.userId)) {
        throw new Error(`${LOG} User mode (desiredOrders provided) requires both householdId and userId`)
    }

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

    // Filter dinner events: user mode uses IDs from desiredOrders, system uses rolling window
    const allDinnerEvents = season.dinnerEvents ?? []
    const dinnerEventIds = isUserMode
        ? [...new Set(options.desiredOrders!.map(o => o.dinnerEventId))]
        : (options.dinnerEventIds
            ? options.dinnerEventIds
            : getScaffoldableDinnerEvents(allDinnerEvents).map(e => e.id))
    const dinnerEvents = allDinnerEvents.filter(de => dinnerEventIds.includes(de.id))

    // Fetch households - user mode is always single household
    const households = await fetchHouseholds(d1Client, options.householdId)

    // Fetch orders (chunked) and cancellation keys in parallel
    const [orderBatches, cancelledKeys] = await Promise.all([
        Promise.all(chunkFetchIds(dinnerEventIds).map(batch => fetchOrders(d1Client, batch))),
        fetchUserCancellationKeys(d1Client, effectiveSeasonId)
    ])
    const existingOrders = orderBatches.flat()

    console.info(`${LOG} ${isUserMode ? 'User' : 'System'} mode: ${households.length} household(s), ${dinnerEvents.length} events`)

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

            // Build lookup: key → existing order (for updates and mode deadline enforcement)
            const orderByKey = new Map(
                householdOrders.map(o => [`${o.inhabitantId}-${o.dinnerEventId}`, o])
            )
            const existingOrdersByKey = new Map(
                householdOrders.map(o => [`${o.inhabitantId}-${o.dinnerEventId}`, { dinnerMode: o.dinnerMode }])
            )

            // Generate desired orders using the appropriate generator
            let result: ReturnType<ReturnType<typeof reconcilePreBookings>>
            if (isUserMode) {
                // User mode: use factory.fromDesiredOrders()
                const factory = createOrderGeneratorFactory({ ...season, dinnerEvents }, household.id, existingOrdersByKey)
                const desiredOrders = factory.fromDesiredOrders(options.desiredOrders!, options.userId!)
                result = reconcilePreBookings(householdOrders)(desiredOrders)
            } else {
                // System mode: use createHouseholdOrderScaffold (which uses factory.fromPreferences internally)
                const scaffolder = createHouseholdOrderScaffold({ ...season, dinnerEvents })
                result = scaffolder(household, householdOrders, cancelledKeys)
            }

            // Create new orders
            for (const batch of chunkOrderBatch(result.create)) {
                await createOrders(d1Client, household.id, batch, {
                    action: getAuditAction(isUserTriggered, 'create'),
                    performedByUserId: options.userId ?? null,
                    source: isUserMode ? 'user-booking' : (options.householdId ? 'preference-update' : 'scaffold-prebookings')
                })
            }

            // Update changed orders: price changes, mode changes, or releases (NONE after deadline)
            let householdPriceUpdates = 0
            let householdModeUpdates = 0
            let householdReleased = 0
            for (const incoming of result.update) {
                const key = `${incoming.inhabitantId}-${incoming.dinnerEventId}`
                const existing = orderByKey.get(key)
                if (!existing) continue

                const isPriceChange = existing.ticketPriceId !== incoming.ticketPriceId
                const isReleaseIntent = incoming.state === OrderStateSchema.enum.RELEASED

                // Fail-early: generator must set dinnerMode=NONE for released orders
                if (isReleaseIntent && incoming.dinnerMode !== DinnerModeSchema.enum.NONE) {
                    throw new Error(`${LOG} Data integrity violation: released order must have dinnerMode=NONE, got ${incoming.dinnerMode} for inhabitant ${incoming.inhabitantId} dinnerEvent ${incoming.dinnerEventId}`)
                }

                if (isPriceChange) {
                    // Price category changed (birthdate added/changed) - update fields, keep BOOKED
                    householdPriceUpdates++
                    await updateOrder(d1Client, existing.id, {
                        dinnerMode: incoming.dinnerMode,
                        ticketPriceId: incoming.ticketPriceId,
                        priceAtBooking: incoming.priceAtBooking
                    }, {
                        action: getAuditAction(isUserTriggered, 'update'),
                        performedByUserId: options.userId ?? null
                    })
                } else if (isReleaseIntent) {
                    // NONE after deadline - release order (user charged, ticket claimable)
                    householdReleased++
                    await updateOrder(d1Client, existing.id, {
                        dinnerMode: incoming.dinnerMode,
                        state: OrderStateSchema.enum.RELEASED,
                        releasedAt: new Date()
                    }, {
                        action: getAuditAction(isUserTriggered, 'update'),
                        performedByUserId: options.userId ?? null
                    })
                } else {
                    // Mode change between eating modes (DINEIN/TAKEAWAY/DINEINLATE) - update mode, keep BOOKED
                    householdModeUpdates++
                    await updateOrder(d1Client, existing.id, {
                        dinnerMode: incoming.dinnerMode
                    }, {
                        action: getAuditAction(isUserTriggered, 'update'),
                        performedByUserId: options.userId ?? null
                    })
                }
            }

            // Delete orders (only before-deadline NONE orders - generator returns them in delete bucket)
            for (const toDelete of result.delete) {
                await deleteOrder(d1Client, [toDelete.id], options.userId ?? null)
            }

            totalCreated += result.create.length
            totalDeleted += result.delete.length
            totalReleased += householdReleased
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
