import type {D1Database} from "@cloudflare/workers-types"
import {fetchOrders, createOrders, deleteOrder, updateOrdersBatch, claimOrder, type OrderBatchUpdate, fetchUserIntentKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchSeason, fetchActiveSeasonId} from "~~/server/data/prismaRepository"
import {useSeason} from "~/composables/useSeason"
import {useBookingValidation, type ScaffoldResult, type DesiredOrder, type OrderAuditAction, OrderAuditAction as AuditActions} from "~/composables/useBookingValidation"
import {resolveOrdersFromPreferencesToBuckets, resolveDesiredOrdersToBuckets} from "~/composables/useBooking"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getSystemUserId} from "~~/server/utils/systemUser"

const LOG = '🎟️ > SEASON > [SCAFFOLD_PREBOOKINGS]'

/**
 * Determine audit action based on user vs system trigger
 *
 * Intent model:
 * - USER_CANCELLED = user signals "I don't want to eat" (delete before deadline, release after)
 * - USER_BOOKED = user books/reclaims a ticket
 * - SYSTEM_* = automated scaffold operations
 */
const getAuditAction = (
    isUserTriggered: boolean,
    actionType: 'create' | 'update' | 'delete' | 'release'
): OrderAuditAction => {
    if (isUserTriggered) {
        // User cancellation intent (delete or release) → USER_CANCELLED
        // User booking intent (create or reclaim) → USER_BOOKED
        if (actionType === 'delete' || actionType === 'release') {
            return AuditActions.USER_CANCELLED
        }
        return AuditActions.USER_BOOKED
    }
    switch (actionType) {
        case 'create': return AuditActions.SYSTEM_CREATED
        case 'delete': return AuditActions.SYSTEM_DELETED
        case 'update': return AuditActions.SYSTEM_UPDATED
        case 'release': return AuditActions.SYSTEM_UPDATED
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
    claimed: 0,
    claimRejected: 0,
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
    const {getScaffoldableDinnerEvents, deadlinesForSeason} = useSeason()
    const {OrderStateSchema, DinnerModeSchema, ScaffoldResultSchema, chunkFetchIds, chunkOrderBatch, chunkIds} = useBookingValidation()

    const isUserTriggered = options.userId !== undefined
    const isUserMode = options.desiredOrders !== undefined

    // TODO: REVERT after healing is complete - restore userId requirement
    // User mode validation: desiredOrders requires householdId and userId
    // if (isUserMode && (!options.householdId || !options.userId)) {
    //     throw new Error(`${LOG} User mode (desiredOrders provided) requires both householdId and userId`)
    // }
    // TEMPORARY: Allow desiredOrders without userId for healing (creates SYSTEM_* audit)
    if (isUserMode && !options.householdId) {
        throw new Error(`${LOG} User mode (desiredOrders provided) requires householdId`)
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

    // Get effective user ID for audit trail: use provided userId or fall back to system admin
    // ADR-013: System operations use getSystemUserId() (cached) to ensure valid FK
    const effectiveUserId = options.userId ?? await getSystemUserId(d1Client)

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

    // Fetch orders (chunked) and user intent keys in parallel
    const [orderBatches, userIntentKeys] = await Promise.all([
        Promise.all(chunkFetchIds(dinnerEventIds).map(batch => fetchOrders(d1Client, batch))),
        fetchUserIntentKeys(d1Client, effectiveSeasonId)
    ])
    const existingOrders = orderBatches.flat()
    const {confirmedKeys, cancelledKeys} = userIntentKeys

    // Build set of "eventId-priceId" keys where released tickets exist (for claim decisions)
    const releasedByEventAndPrice = new Set<string>()
    for (const order of existingOrders) {
        if (order.state === OrderStateSchema.enum.RELEASED && order.ticketPriceId) {
            releasedByEventAndPrice.add(`${order.dinnerEventId}-${order.ticketPriceId}`)
        }
    }

    console.info(`${LOG} ${isUserMode ? 'User' : 'System'} mode: ${households.length} household(s), ${dinnerEvents.length} events, ${releasedByEventAndPrice.size} event-price combos with released tickets`)

    // Process each household and accumulate results
    let totalCreated = 0
    let totalDeleted = 0
    let totalReleased = 0
    let totalClaimed = 0
    let totalClaimRejected = 0
    let totalPriceUpdated = 0
    let totalModeUpdated = 0
    let totalUnchanged = 0
    let totalOrderErrors = 0
    let processedHouseholds = 0
    let erroredHouseholds = 0

    for (const household of households) {
        try {
            const householdInhabitantIds = new Set(household.inhabitants.map(i => i.id))
            const householdOrders = existingOrders.filter(o => householdInhabitantIds.has(o.inhabitantId))

            // Build lookup: orderId → existing order (for updates)
            const orderById = new Map(householdOrders.map(o => [o.id, o]))
            const dinnerEventById = new Map(dinnerEvents.map(de => [de.id, de]))
            const {canModifyOrders, canEditDiningMode} = deadlinesForSeason(season)

            // Build ticket price lookup (needed for creates and price change detection)
            const ticketPriceById = new Map(season.ticketPrices.map(tp => [tp.id, tp]))

            // Resolve desired orders to buckets
            const result = isUserMode
                ? resolveDesiredOrdersToBuckets(
                    options.desiredOrders!,
                    householdOrders,
                    dinnerEventById,
                    canModifyOrders,
                    canEditDiningMode,
                    DinnerModeSchema.enum,
                    OrderStateSchema.enum,
                    releasedByEventAndPrice
                )
                : resolveOrdersFromPreferencesToBuckets(
                    { ...season, dinnerEvents },
                    household,
                    householdOrders,
                    confirmedKeys,
                    cancelledKeys,
                    releasedByEventAndPrice
                )

            // Transform DesiredOrder[] to OrderCreateWithPrice[] for create
            const ordersToCreate = result.create.map(desired => {
                const ticketPrice = ticketPriceById.get(desired.ticketPriceId)
                if (!ticketPrice) {
                    throw new Error(`${LOG} Missing ticket price ${desired.ticketPriceId} for order`)
                }
                return {
                    dinnerEventId: desired.dinnerEventId,
                    inhabitantId: desired.inhabitantId,
                    bookedByUserId: effectiveUserId,
                    ticketPriceId: desired.ticketPriceId,
                    priceAtBooking: ticketPrice.price,
                    dinnerMode: desired.dinnerMode,
                    state: desired.state,
                    isGuestTicket: desired.isGuestTicket,
                    householdId: household.id
                }
            })

            // Create new orders
            for (const batch of chunkOrderBatch(ordersToCreate)) {
                await createOrders(d1Client, household.id, batch, {
                    action: getAuditAction(isUserTriggered, 'create'),
                    performedByUserId: effectiveUserId,
                    source: isUserMode ? 'user-booking' : (options.householdId ? 'preference-update' : 'scaffold-prebookings'),
                    seasonId: season.id ?? null
                })
            }

            // Build batch updates - collect all updates for efficient batching
            // ADR-014: Groups by (state, dinnerMode, ticketPriceId) to minimize queries
            let householdPriceUpdates = 0
            let householdModeUpdates = 0
            let householdReleased = 0
            let householdUpdateErrors = 0
            const batchUpdates: OrderBatchUpdate[] = []

            for (const incoming of result.update) {
                // Validate orderId present (generator contract)
                if (!incoming.orderId) {
                    throw new Error(`${LOG} Data integrity: update bucket order missing orderId for inhabitant ${incoming.inhabitantId} dinnerEvent ${incoming.dinnerEventId}`)
                }
                const existing = orderById.get(incoming.orderId)
                if (!existing) {
                    console.warn(`${LOG} Order ${incoming.orderId} not found (deleted during processing?) - skipping`)
                    householdUpdateErrors++
                    continue
                }

                // Categorize for stats
                const isPriceChange = existing.ticketPriceId !== incoming.ticketPriceId
                const isNewRelease = incoming.state === OrderStateSchema.enum.RELEASED && existing.state !== OrderStateSchema.enum.RELEASED

                // Determine audit action: release → USER_CANCELLED (or SYSTEM_UPDATED), other → USER_BOOKED (or SYSTEM_UPDATED)
                const auditAction = getAuditAction(isUserTriggered, isNewRelease ? 'release' : 'update')
                const audit = {
                    action: auditAction,
                    performedByUserId: effectiveUserId,
                    inhabitantId: incoming.inhabitantId,
                    dinnerEventId: incoming.dinnerEventId,
                    seasonId: season.id ?? null
                }

                if (isPriceChange) {
                    const newTicketPrice = ticketPriceById.get(incoming.ticketPriceId)
                    if (!newTicketPrice) {
                        throw new Error(`${LOG} Ticket price ${incoming.ticketPriceId} not found in season`)
                    }
                    householdPriceUpdates++
                    batchUpdates.push({
                        orderId: incoming.orderId,
                        state: incoming.state,
                        dinnerMode: incoming.dinnerMode,
                        ticketPriceId: incoming.ticketPriceId,
                        priceAtBooking: newTicketPrice.price,
                        isNewRelease,
                        audit
                    })
                } else {
                    if (isNewRelease) householdReleased++
                    else householdModeUpdates++
                    batchUpdates.push({
                        orderId: incoming.orderId,
                        state: incoming.state,
                        dinnerMode: incoming.dinnerMode,
                        ticketPriceId: null,
                        priceAtBooking: null,
                        isNewRelease,
                        audit
                    })
                }
            }

            // Execute batch updates (grouped by signature, chunked within groups)
            const executeBatchUpdates = updateOrdersBatch(90)
            await executeBatchUpdates(d1Client, batchUpdates)

            // Batch delete orders - chunk to respect D1's 100 param limit (ADR-014)
            const deleteIds = result.delete
                .map(toDelete => {
                    if (!toDelete.orderId) {
                        throw new Error(`${LOG} Data integrity violation: delete bucket order missing orderId for inhabitant ${toDelete.inhabitantId} dinnerEvent ${toDelete.dinnerEventId}`)
                    }
                    return toDelete.orderId
                })
            if (deleteIds.length > 0) {
                for (const idChunk of chunkIds(deleteIds)) {
                    await deleteOrder(d1Client, idChunk, effectiveUserId)
                }
            }

            // Process claims (try to claim released tickets from marketplace)
            let householdClaimed = 0
            let householdClaimRejected = 0
            for (const toClaim of result.claim) {
                const claimed = await claimOrder(
                    d1Client,
                    toClaim.dinnerEventId,
                    toClaim.ticketPriceId,
                    toClaim.inhabitantId,
                    effectiveUserId,
                    toClaim.dinnerMode,
                    toClaim.isGuestTicket
                )
                if (claimed) {
                    householdClaimed++
                } else {
                    householdClaimRejected++
                }
            }

            totalCreated += result.create.length
            totalDeleted += result.delete.length
            totalReleased += householdReleased
            totalClaimed += householdClaimed
            totalClaimRejected += householdClaimRejected
            totalPriceUpdated += householdPriceUpdates
            totalModeUpdated += householdModeUpdates
            totalUnchanged += result.idempotent.length
            totalOrderErrors += householdUpdateErrors
            processedHouseholds++
        } catch (error) {
            // Household may have been deleted during scaffolding (FK constraint error)
            // Log and continue with remaining households - don't fail entire operation
            erroredHouseholds++
            const h3e = eventHandlerHelper.h3eFromCatch(
                `${LOG} Skipping household ${household.id} (${household.shortName})`,
                error
            )
            eventHandlerHelper.logH3Error(h3e, error)
        }
    }

    console.info(`${LOG} Complete: created=${totalCreated}, deleted=${totalDeleted}, released=${totalReleased}, claimed=${totalClaimed}, claimRejected=${totalClaimRejected}, priceUpdated=${totalPriceUpdated}, modeUpdated=${totalModeUpdated}, unchanged=${totalUnchanged}, orderErrors=${totalOrderErrors}, households=${processedHouseholds}, householdErrors=${erroredHouseholds}`)

    return ScaffoldResultSchema.parse({
        seasonId: effectiveSeasonId,
        created: totalCreated,
        deleted: totalDeleted,
        released: totalReleased,
        claimed: totalClaimed,
        claimRejected: totalClaimRejected,
        priceUpdated: totalPriceUpdated,
        modeUpdated: totalModeUpdated,
        unchanged: totalUnchanged,
        households: processedHouseholds,
        errored: erroredHouseholds + totalOrderErrors
    })
}
