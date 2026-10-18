import {fetchOrders, createOrders, deleteOrder, updateOrdersBatch, claimOrder, countReleasedTickets, type OrderBatchUpdate, fetchUserIntentKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchSeason, fetchActiveSeasonId} from "~~/server/data/prismaRepository"
import {useSeason, type BookingDeadlines} from "~/composables/useSeason"
import {useBookingValidation, type ScaffoldResult, type DesiredOrder, type DinnerMode, type OrderAuditAction, type QueuePosition, type BookingOutcomes, type BookingAction, type BookingResult, OrderAuditAction as AuditActions, BookingFailure} from "~/composables/useBookingValidation"
import type {WeekDayMap} from "~/types/dateTypes"
import {resolveOrdersFromPreferencesToBuckets, resolveDesiredOrdersToBuckets, bookingOutcomes, actionOfUpdate, countTotals} from "~/composables/useBooking"
import {writeBatchOrEach} from "~/utils/batchUtils"
import {sellTicketsToWaitlist, joinWaitlist} from "~~/server/utils/waitlistAssignment"
import {fetchWaitlistForHousehold, fetchWaitlistForDinners, deleteWaitlistEntry, updateWaitlistEntryOrder} from "~~/server/data/waitlistRepository"
import {useWaitlist} from "~/composables/useWaitlist"
import {isHouseholdActiveOnDay} from "~/composables/useHousehold"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getSystemUserId} from "~~/server/utils/systemUser"

const LOG = '🎟️ > SEASON > [SCAFFOLD_PREBOOKINGS]'
// Each lost race re-reads the supply; past this many rounds the wish queues
const CLAIM_ROUNDS = 3

const {BookingActionSchema, OrderBucketSchema, OrderAuditSourceSchema} = useBookingValidation()
const Action = BookingActionSchema.enum
const Bucket = OrderBucketSchema.enum
const Source = OrderAuditSourceSchema.enum

/**
 * The audit action of a booking action. A user who cancels or releases signals "I don't want to eat"
 * (USER_CANCELLED); every other user action books (USER_BOOKED); a system run records what it did to the row.
 */
const getAuditAction = (isUserTriggered: boolean, action: BookingAction): OrderAuditAction => {
    const cancels = action === Action.CANCEL || action === Action.RELEASE
    if (isUserTriggered) return cancels ? AuditActions.USER_CANCELLED : AuditActions.USER_BOOKED
    if (action === Action.BOOK) return AuditActions.SYSTEM_CREATED
    if (action === Action.CANCEL) return AuditActions.SYSTEM_DELETED
    return AuditActions.SYSTEM_UPDATED
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
    /** The deadlines user mode decides by; the season's when absent */
    deadlines?: BookingDeadlines
    /** System mode on one inhabitant's draft preferences: the run decides as the save would and writes nothing */
    dryRun?: {inhabitantId: number, dinnerPreferences: WeekDayMap<DinnerMode>}
}

/**
 * Result when no season available (seasonId: null)
 */
const skippedResult = (): ScaffoldResult => ({
    seasonId: null,
    totals: countTotals([]),
    positions: [],
    unchanged: 0,
    households: 0,
    errored: 0,
    results: [],
    failed: [],
    outcomes: {joined: [], ticketsSold: [], waitlistTicketsSold: [], waitlistPortionsAssigned: []}
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
    const {OrderStateSchema, DinnerModeSchema, ScaffoldResultSchema, chunkFetchIds, chunkOrderBatch, chunkDeleteBatch} = useBookingValidation()
    const {waitingLines, ticketTypeOfEntry} = useWaitlist()

    const isUserTriggered = options.userId !== undefined
    const isUserMode = options.desiredOrders !== undefined
    const {dryRun} = options

    if (isUserMode && (!options.householdId || !options.userId)) {
        throw new Error(`${LOG} User mode (desiredOrders provided) requires both householdId and userId`)
    }
    // User mode claims and queues, which a dry run has no stand-in for
    if (isUserMode && dryRun) {
        throw new Error(`${LOG} A dry run decides from preferences: user mode (desiredOrders provided) takes none`)
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

    const storedHouseholds = await fetchHouseholds(d1Client, options.householdId)
    // A dry run decides with its inhabitant's draft in place of the stored preferences
    const households = dryRun
        ? storedHouseholds.map(household => ({...household, inhabitants: household.inhabitants.map(inhabitant =>
            inhabitant.id === dryRun.inhabitantId ? {...inhabitant, dinnerPreferences: dryRun.dinnerPreferences} : inhabitant)}))
        : storedHouseholds
    // A dry run lands each write it would make without touching a row
    const execute: typeof writeBatchOrEach = dryRun ? async (items, _write, onDone) => onDone(items) : writeBatchOrEach

    // Fetch orders (chunked), user intent keys and, in user mode, the household's queue entries in parallel
    const [orderBatches, userIntentKeys, existingEntries] = await Promise.all([
        Promise.all(chunkFetchIds(dinnerEventIds).map(batch => fetchOrders(d1Client, batch))),
        fetchUserIntentKeys(d1Client, effectiveSeasonId),
        isUserMode ? fetchWaitlistForHousehold(d1Client, options.householdId!, dinnerEventIds) : Promise.resolve([])
    ])
    const existingOrders = orderBatches.flat()
    const {confirmedKeys, cancelledKeys} = userIntentKeys
    const entryById = new Map(existingEntries.map(entry => [entry.id, entry]))
    // The season's prices: the frozen price of a booking, the ticket type of a claim and of a waiting entry
    const ticketPriceById = new Map(season.ticketPrices.map(tp => [tp.id, tp]))
    const ticketTypeOf = ticketTypeOfEntry(season.ticketPrices)

    console.info(`${LOG} ${isUserMode ? 'User' : 'System'} mode${dryRun ? ' (dry run)' : ''}: ${households.length} household(s), ${dinnerEvents.length} events, ${existingEntries.length} queue entries`)

    // Process each household and accumulate one result per order that landed or failed
    const landed: BookingResult[] = []
    const failed: BookingResult[] = []
    const positions: QueuePosition[] = []
    // What happened that the caller notifies about after the run; a household that fails later keeps what already happened
    const outcomes: BookingOutcomes = {joined: [], ticketsSold: [], waitlistTicketsSold: [], waitlistPortionsAssigned: []}
    let totalUnchanged = 0
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
            // One result per order; a failed one is logged with the person and the dinner
            const nameOf = (inhabitantId: number): string => household.inhabitants.find(inhabitant => inhabitant.id === inhabitantId)?.name ?? ''
            const resultOf = (desired: DesiredOrder, action: BookingAction): BookingResult => ({
                inhabitantId: desired.inhabitantId, inhabitantName: nameOf(desired.inhabitantId), isGuestTicket: desired.isGuestTicket,
                ticketType: ticketPriceById.get(desired.ticketPriceId)?.ticketType ?? null,
                dinnerEventId: desired.dinnerEventId, dinnerMode: desired.dinnerMode, action
            })
            // The generator skips an order the household no longer holds (bought by another household, or deleted); the save lists it as failed
            const staleOrders = isUserMode ? options.desiredOrders!.filter(desired => desired.orderId !== undefined && !orderById.has(desired.orderId)) : []
            failed.push(...staleOrders.map(stale => resultOf(stale, actionOfUpdate(stale, undefined))))
            const landedAs = (action: BookingAction) => (orders: {desired: DesiredOrder}[]) => landed.push(...orders.map(({desired}) => resultOf(desired, action)))
            const failedAs = (actionOf: (desired: DesiredOrder) => BookingAction) => ({desired}: {desired: DesiredOrder}, error: unknown) => {
                failed.push({...resultOf(desired, actionOf(desired)), reason: eventHandlerHelper.isConflict(error) ? BookingFailure.CONFLICT : undefined})
                eventHandlerHelper.logNuxtError(eventHandlerHelper.nuxtErrorFromCatch(
                    `${LOG} Household ${household.id} (${household.shortName}): ${actionOf(desired)} for inhabitant ${desired.inhabitantId} on dinner ${desired.dinnerEventId} failed`,
                    error
                ), error)
            }

            // Create new orders; a failed batch is written order by order
            const creates = result.create.map(desired => ({desired, order: toOrderCreate(desired)}))
            for (const batch of chunkOrderBatch(creates)) {
                await execute(batch, orders => createOrders(d1Client, household.id, orders.map(({order}) => order), {
                    action: getAuditAction(isUserTriggered, Action.BOOK),
                    performedByUserId: effectiveUserId,
                    source: isUserMode ? Source['user-booking'] : (options.householdId ? Source['preference-update'] : Source['scaffold-prebookings']),
                    seasonId: season.id ?? null
                }), landedAs(Action.BOOK), failedAs(() => Action.BOOK))
            }

            // Updates: each carries its action (release, reclaim, price, mode); ADR-014 groups them by signature
            const updates: {desired: DesiredOrder, update: OrderBatchUpdate, action: BookingAction}[] = []
            for (const incoming of result.update) {
                // Generator contract: an update names an order among the household's
                const existing = incoming.orderId ? orderById.get(incoming.orderId) : undefined
                if (!incoming.orderId || !existing) {
                    throw new Error(`${LOG} Data integrity: update bucket order ${incoming.orderId} not among the household's orders for inhabitant ${incoming.inhabitantId} dinnerEvent ${incoming.dinnerEventId}`)
                }
                const action = actionOfUpdate(incoming, existing)
                const priceChanged = existing.ticketPriceId !== incoming.ticketPriceId
                const newTicketPrice = priceChanged ? ticketPriceById.get(incoming.ticketPriceId) : undefined
                if (priceChanged && !newTicketPrice) {
                    throw new Error(`${LOG} Ticket price ${incoming.ticketPriceId} not found in season`)
                }
                updates.push({desired: incoming, action, update: {
                    orderId: incoming.orderId,
                    state: incoming.state,
                    dinnerMode: incoming.dinnerMode,
                    ticketPriceId: priceChanged ? incoming.ticketPriceId : null,
                    priceAtBooking: newTicketPrice?.price ?? null,
                    isNewRelease: action === Action.RELEASE,
                    audit: {
                        action: getAuditAction(isUserTriggered, action),
                        performedByUserId: effectiveUserId,
                        inhabitantId: incoming.inhabitantId,
                        dinnerEventId: incoming.dinnerEventId,
                        seasonId: season.id ?? null
                    }
                }})
            }
            const executeBatchUpdates = updateOrdersBatch(90)
            const actionOf = (desired: DesiredOrder) => updates.find(entry => entry.desired === desired)!.action
            await execute(updates, entries => executeBatchUpdates(d1Client, entries.map(({update}) => update)),
                entries => {
                    for (const {desired, action} of entries) landed.push(resultOf(desired, action))
                },
                failedAs(actionOf))
            // Cancel orders before the deadline, chunked to respect D1's 100 param limit (ADR-014); a failed chunk is cancelled order by order
            const cancels = result.delete.map(desired => {
                if (!desired.orderId) {
                    throw new Error(`${LOG} Data integrity violation: delete bucket order missing orderId for inhabitant ${desired.inhabitantId} dinnerEvent ${desired.dinnerEventId}`)
                }
                return {desired, orderId: desired.orderId}
            })
            for (const chunk of chunkDeleteBatch(cancels)) {
                // Pass null for system-triggered deletes → SYSTEM_DELETED audit (deleteOrder contract: null = system)
                // Pass effectiveUserId for user-triggered deletes → USER_CANCELLED audit (respected by scaffolder)
                await execute(chunk, entries => deleteOrder(d1Client, entries.map(({orderId}) => orderId), isUserTriggered ? effectiveUserId : null),
                    landedAs(Action.CANCEL), failedAs(() => Action.CANCEL))
            }

            // Claims act on bookingOutcomes over the supply read at this instant: a ticket of the claim's type is bought
            // while nobody waits in its line, else the wish joins the line
            for (const toClaim of result.claim) {
                let bought = false
                try {
                    const ticketType = ticketPriceById.get(toClaim.ticketPriceId)?.ticketType
                    if (!ticketType) throw new Error(`${LOG} Missing ticket price ${toClaim.ticketPriceId} for claim`)
                    const nobodyWaits = !waitingLines(await fetchWaitlistForDinners(d1Client, [toClaim.dinnerEventId]), ticketTypeOf).has(ticketType)
                    for (let round = 0; nobodyWaits && round < CLAIM_ROUNDS && !bought; round++) {
                        const ticketsForSale = await countReleasedTickets(d1Client, toClaim.dinnerEventId, ticketType)
                        if (bookingOutcomes(Bucket.claim, toClaim, () => ({ticketsForSale}))[0]?.outcome !== Action.BUY) break
                        const claimed = await claimOrder(
                            d1Client,
                            toClaim.dinnerEventId,
                            ticketType,
                            toClaim.inhabitantId,
                            effectiveUserId,
                            toClaim.dinnerMode,
                            toClaim.isGuestTicket
                        )
                        if (claimed) {
                            outcomes.ticketsSold.push({
                                dinnerEventId: toClaim.dinnerEventId, ticketPriceId: claimed.ticketPriceId,
                                buyerInhabitantId: toClaim.inhabitantId, buyerHouseholdId: household.id, sellerHouseholdId: claimed.sellerHouseholdId
                            })
                            bought = true
                        }
                    }
                    if (bought) {
                        landed.push(resultOf(toClaim, Action.BUY))
                        continue
                    }
                    const order = {...toOrderCreate(toClaim), state: OrderStateSchema.enum.BOOKED, allergyTypeIds: toClaim.allergyTypeIds}
                    try {
                        const {position, joined} = await joinWaitlist(d1Client, {
                            dinnerEventId: toClaim.dinnerEventId,
                            inhabitantId: toClaim.inhabitantId,
                            isGuestTicket: toClaim.isGuestTicket,
                            order
                        }, {state: dinnerEventById.get(toClaim.dinnerEventId)!.state, ticketPrices: season.ticketPrices})
                        outcomes.joined.push(joined)
                        landed.push(resultOf(toClaim, Action.QUEUE))
                        positions.push({inhabitantId: toClaim.inhabitantId, dinnerEventId: toClaim.dinnerEventId, isGuestTicket: toClaim.isGuestTicket, position, ticketType: joined.ticketType})
                    } catch (error) {
                        // The partial unique index holds one regular entry per inhabitant per dinner: a concurrent join already queued it
                        if (!eventHandlerHelper.isConflict(error)) throw error
                        console.info(`${LOG} Inhabitant ${toClaim.inhabitantId} already queues for dinner ${toClaim.dinnerEventId}`)
                        totalUnchanged++
                    }
                } catch (error) {
                    failedAs(() => bought ? Action.BUY : Action.QUEUE)({desired: toClaim}, error)
                }
            }

            for (const toLeave of result.leave) {
                try {
                    await deleteWaitlistEntry(d1Client, toLeave.waitlistEntryId!)
                    landed.push(resultOf(toLeave, Action.LEAVE))
                } catch (error) {
                    failedAs(() => Action.LEAVE)({desired: toLeave}, error)
                }
            }

            for (const toRequeue of result.requeue) {
                const entry = entryById.get(toRequeue.waitlistEntryId!)
                const ticketPrice = ticketPriceById.get(toRequeue.ticketPriceId)
                if (!entry || !ticketPrice) {
                    throw new Error(`${LOG} Data integrity: requeue of entry ${toRequeue.waitlistEntryId} at ticket price ${toRequeue.ticketPriceId}`)
                }
                try {
                    await updateWaitlistEntryOrder(d1Client, entry.id, {
                        ...entry.order,
                        dinnerMode: toRequeue.dinnerMode,
                        ticketPriceId: toRequeue.ticketPriceId,
                        priceAtBooking: ticketPrice.price,
                        allergyTypeIds: toRequeue.allergyTypeIds ?? entry.order.allergyTypeIds
                    })
                    landed.push(resultOf(toRequeue, Action.REQUEUE))
                } catch (error) {
                    failedAs(() => Action.REQUEUE)({desired: toRequeue}, error)
                }
            }

            totalUnchanged += result.idempotent.length
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

    // The tickets for sale go to the first in their type's line, once per run; the extra portions it finishes for a
    // stopped run go to the caller with them. A dry run leaves the sale to the save
    if (!dryRun) {
        try {
            const {waitlistTicketsSold, waitlistPortionsAssigned} = await sellTicketsToWaitlist(d1Client, dinnerEventIds, season.ticketPrices)
            outcomes.waitlistTicketsSold.push(...waitlistTicketsSold)
            outcomes.waitlistPortionsAssigned.push(...waitlistPortionsAssigned)
        } catch (error) {
            eventHandlerHelper.logNuxtError(eventHandlerHelper.nuxtErrorFromCatch(
                `${LOG} The tickets for sale on ${dinnerEventIds.length} dinner(s) did not reach the waiting list`, error
            ), error)
        }
    }

    const totals = countTotals(landed)
    console.info(`${LOG} Complete: ${Object.entries(totals).filter(([, count]) => count > 0).map(([action, count]) => `${action}=${count}`).join(', ') || 'no changes'}, unchanged=${totalUnchanged}, failed=${failed.length}, households=${processedHouseholds}, errored households=${erroredHouseholds}`)

    return ScaffoldResultSchema.parse({
        seasonId: effectiveSeasonId,
        totals,
        positions,
        unchanged: totalUnchanged,
        households: processedHouseholds,
        errored: failed.length + erroredHouseholds,
        // A run scoped to one household names each order; a season-wide run names only the failures
        results: options.householdId !== undefined ? landed : [],
        failed,
        outcomes
    })
}
