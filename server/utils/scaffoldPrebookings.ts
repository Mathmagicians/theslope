import {fetchOrders, createOrders, deleteOrder, updateOrdersBatch, claimOrder, countReleasedTickets, type OrderBatchUpdate, fetchUserIntentKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchSeason, fetchActiveSeasonId} from "~~/server/data/prismaRepository"
import {useSeason, type BookingDeadlines} from "~/composables/useSeason"
import {useBookingValidation, type ScaffoldResult, type DesiredOrder, type OrderAuditAction, type QueuePosition, OrderAuditAction as AuditActions} from "~/composables/useBookingValidation"
import {resolveOrdersFromPreferencesToBuckets, resolveDesiredOrdersToBuckets, bookingOutcome} from "~/composables/useBooking"
import {assignReleasedTicket, joinWaitlist} from "~~/server/utils/waitlistAssignment"
import {fetchWaitlistForHousehold, deleteWaitlistEntry, updateWaitlistEntryOrder} from "~~/server/data/waitlistRepository"
import {emailChannel, type EmailChannel} from "~~/server/utils/sender/config"
import {isHouseholdActiveOnDay} from "~/composables/useHousehold"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getSystemUserId} from "~~/server/utils/systemUser"

const LOG = '🎟️ > SEASON > [SCAFFOLD_PREBOOKINGS]'
// Each lost race re-reads the supply; past this many rounds the wish queues
const CLAIM_ROUNDS = 3

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
    /** The e-mail channel for the waiting-list mails; without one they are off */
    email?: EmailChannel
    /** The deadlines user mode decides by; the season's when absent */
    deadlines?: BookingDeadlines
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
    queued: 0,
    positions: [],
    left: 0,
    requeued: 0,
    priceUpdated: 0,
    modeUpdated: 0,
    unchanged: 0,
    households: 0,
    errored: 0
})

/** Default scaffold result when no re-scaffold needed */
export const noScaffoldResult = (): ScaffoldResult => skippedResult()

/**
 * Re-scaffold a household if any of the given fields changed.
 * Shared by household update (moveOutDate/movedInDate) and inhabitant update (preferences/birthDate).
 *
 * @param d1Client - D1 database client
 * @param log - Log prefix for the calling endpoint
 * @param householdId - Household to re-scaffold
 * @param fields - Map of field name → value (re-scaffolds if any value !== undefined)
 * @param seasonId - Optional season to scope the re-scaffold
 * @returns ScaffoldResult (noScaffoldResult if nothing changed)
 */
export const rescaffoldOnFieldChange = async (
    d1Client: D1Database,
    log: string,
    householdId: number,
    fields: Record<string, unknown>,
    seasonId?: number
): Promise<ScaffoldResult> => {
    const changed = Object.entries(fields)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k)

    if (changed.length === 0) return noScaffoldResult()

    console.info(`${log} ${changed.join('+')} changed, re-scaffolding household ${householdId}`)
    return scaffoldPrebookings(d1Client, {householdId, seasonId})
}

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

    const households = await fetchHouseholds(d1Client, options.householdId)

    // Fetch orders (chunked), user intent keys and, in user mode, the household's queue entries in parallel
    const [orderBatches, userIntentKeys, existingEntries] = await Promise.all([
        Promise.all(chunkFetchIds(dinnerEventIds).map(batch => fetchOrders(d1Client, batch))),
        fetchUserIntentKeys(d1Client, effectiveSeasonId),
        isUserMode ? fetchWaitlistForHousehold(d1Client, options.householdId!, dinnerEventIds) : Promise.resolve([])
    ])
    const existingOrders = orderBatches.flat()
    const {confirmedKeys, cancelledKeys} = userIntentKeys
    const entryById = new Map(existingEntries.map(entry => [entry.id, entry]))
    const channel = options.email ?? emailChannel({})

    console.info(`${LOG} ${isUserMode ? 'User' : 'System'} mode: ${households.length} household(s), ${dinnerEvents.length} events, ${existingEntries.length} queue entries`)

    // Process each household and accumulate results
    let totalCreated = 0
    let totalDeleted = 0
    let totalReleased = 0
    let totalClaimed = 0
    let totalQueued = 0
    let totalLeft = 0
    let totalRequeued = 0
    const positions: QueuePosition[] = []
    let totalPriceUpdated = 0
    let totalModeUpdated = 0
    let totalUnchanged = 0
    let totalOrderErrors = 0
    let processedHouseholds = 0
    let erroredHouseholds = 0

    for (const household of households) {
        try {
            // Filter dinner events to household's residency period
            const isActiveOnDay = isHouseholdActiveOnDay(household.movedInDate, household.moveOutDate)
            const householdDinnerEvents = dinnerEvents.filter(de => isActiveOnDay(de.date))

            const householdInhabitantIds = new Set(household.inhabitants.map(i => i.id))
            const householdOrders = existingOrders.filter(o => householdInhabitantIds.has(o.inhabitantId))

            // Build lookup: orderId → existing order (for updates)
            const orderById = new Map(householdOrders.map(o => [o.id, o]))
            const dinnerEventById = new Map(householdDinnerEvents.map(de => [de.id, de]))
            const {canModifyOrders, canEditDiningMode} = options.deadlines ?? deadlinesForSeason(season)

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
                    existingEntries
                )
                : resolveOrdersFromPreferencesToBuckets(
                    { ...season, dinnerEvents: householdDinnerEvents },
                    household,
                    householdOrders,
                    confirmedKeys,
                    cancelledKeys
                )

            // DesiredOrder → OrderCreateWithPrice: the payer, the frozen price and the household
            const toOrderCreate = (desired: DesiredOrder) => {
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
            }
            const ordersToCreate = result.create.map(toOrderCreate)

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
            // A ticket released after the deadline goes to the head of the dinner's waiting list when it fits
            for (const released of batchUpdates.filter(update => update.isNewRelease)) {
                const existing = orderById.get(released.orderId)
                if (existing?.ticketPriceId) {
                    await assignReleasedTicket(d1Client, existing.dinnerEventId, existing.ticketPriceId, household.id, channel)
                }
            }

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
                    // Pass null for system-triggered deletes → SYSTEM_DELETED audit (deleteOrder contract: null = system)
                    // Pass effectiveUserId for user-triggered deletes → USER_CANCELLED audit (respected by scaffolder)
                    await deleteOrder(d1Client, idChunk, isUserTriggered ? effectiveUserId : null)
                }
            }

            // Claims act on bookingOutcome over the supply read at this instant: buy, or queue the wish
            let householdClaimed = 0
            let householdQueued = 0
            let householdDuplicates = 0
            for (const toClaim of result.claim) {
                let bought = false
                for (let round = 0; round < CLAIM_ROUNDS && !bought; round++) {
                    const ticketsForSale = await countReleasedTickets(d1Client, toClaim.dinnerEventId, toClaim.ticketPriceId)
                    if (bookingOutcome('claim', {ticketsForSale}) !== 'buy') break
                    bought = !!await claimOrder(
                        d1Client,
                        toClaim.dinnerEventId,
                        toClaim.ticketPriceId,
                        toClaim.inhabitantId,
                        effectiveUserId,
                        toClaim.dinnerMode,
                        toClaim.isGuestTicket
                    )
                }
                if (bought) {
                    householdClaimed++
                    continue
                }
                const order = {...toOrderCreate(toClaim), state: OrderStateSchema.enum.BOOKED, allergyTypeIds: toClaim.allergyTypeIds}
                try {
                    const {position} = await joinWaitlist(d1Client, {
                        dinnerEventId: toClaim.dinnerEventId,
                        inhabitantId: toClaim.inhabitantId,
                        isGuestTicket: toClaim.isGuestTicket,
                        order
                    }, channel)
                    householdQueued++
                    positions.push({inhabitantId: toClaim.inhabitantId, dinnerEventId: toClaim.dinnerEventId, isGuestTicket: toClaim.isGuestTicket, position})
                } catch (error) {
                    // The partial unique index holds one regular entry per inhabitant per dinner: a concurrent join already queued it
                    if (!eventHandlerHelper.isConflict(error)) throw error
                    console.info(`${LOG} Inhabitant ${toClaim.inhabitantId} already queues for dinner ${toClaim.dinnerEventId}`)
                    householdDuplicates++
                }
            }

            for (const toLeave of result.leave) {
                await deleteWaitlistEntry(d1Client, toLeave.waitlistEntryId!)
            }

            for (const toRequeue of result.requeue) {
                const entry = entryById.get(toRequeue.waitlistEntryId!)
                const ticketPrice = ticketPriceById.get(toRequeue.ticketPriceId)
                if (!entry || !ticketPrice) {
                    throw new Error(`${LOG} Data integrity: requeue of entry ${toRequeue.waitlistEntryId} at ticket price ${toRequeue.ticketPriceId}`)
                }
                await updateWaitlistEntryOrder(d1Client, entry.id, {
                    ...entry.order,
                    dinnerMode: toRequeue.dinnerMode,
                    ticketPriceId: toRequeue.ticketPriceId,
                    priceAtBooking: ticketPrice.price,
                    allergyTypeIds: toRequeue.allergyTypeIds ?? entry.order.allergyTypeIds
                })
            }

            totalCreated += result.create.length
            totalDeleted += result.delete.length
            totalReleased += householdReleased
            totalClaimed += householdClaimed
            totalQueued += householdQueued
            totalLeft += result.leave.length
            totalRequeued += result.requeue.length
            totalPriceUpdated += householdPriceUpdates
            totalModeUpdated += householdModeUpdates
            totalUnchanged += result.idempotent.length + householdDuplicates
            totalOrderErrors += householdUpdateErrors
            processedHouseholds++
        } catch (error) {
            // Household may have been deleted during scaffolding (FK constraint error)
            // Log and continue with remaining households - don't fail entire operation
            erroredHouseholds++
            const nuxtError = eventHandlerHelper.nuxtErrorFromCatch(
                `${LOG} Skipping household ${household.id} (${household.shortName})`,
                error
            )
            eventHandlerHelper.logNuxtError(nuxtError, error)
        }
    }

    console.info(`${LOG} Complete: created=${totalCreated}, deleted=${totalDeleted}, released=${totalReleased}, claimed=${totalClaimed}, queued=${totalQueued}, left=${totalLeft}, requeued=${totalRequeued}, priceUpdated=${totalPriceUpdated}, modeUpdated=${totalModeUpdated}, unchanged=${totalUnchanged}, orderErrors=${totalOrderErrors}, households=${processedHouseholds}, householdErrors=${erroredHouseholds}`)

    return ScaffoldResultSchema.parse({
        seasonId: effectiveSeasonId,
        created: totalCreated,
        deleted: totalDeleted,
        released: totalReleased,
        claimed: totalClaimed,
        queued: totalQueued,
        positions,
        left: totalLeft,
        requeued: totalRequeued,
        priceUpdated: totalPriceUpdated,
        modeUpdated: totalModeUpdated,
        unchanged: totalUnchanged,
        households: processedHouseholds,
        errored: erroredHouseholds + totalOrderErrors
    })
}
