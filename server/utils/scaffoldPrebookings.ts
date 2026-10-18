import {fetchOrders, createOrders, deleteOrder, recordCancellation, updateOrdersBatch, claimOrder, countReleasedTickets, type Cancellation, type OrderBatchUpdate, fetchUserIntentKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchHouseholdsByInhabitantIds, fetchSeason, fetchActiveSeasonId} from "~~/server/data/prismaRepository"
import {useSeason, type BookingDeadlines} from "~/composables/useSeason"
import {useBookingValidation, OrderState, type ScaffoldResult, type DesiredOrder, type DinnerMode, type OrderAuditAction, type QueuePosition, type BookingOutcomes, type BookingAction, type BookingResult, type OrderDisplay, type TicketType, type WaitlistJoined, OrderAuditAction as AuditActions, BookingFailure} from "~/composables/useBookingValidation"
import type {HouseholdDisplay} from "~/composables/useCoreValidation"
import type {TicketPrice} from "~/composables/useTicketPriceValidation"
import type {TicketWaitlistCreate, TicketWaitlistDisplay, WaitlistAuditContext, WaitlistOrder, WaitlistPlacementOutcomes} from "~/composables/useWaitlistValidation"
import type {WeekDayMap} from "~/types/dateTypes"
import {resolveOrdersFromPreferencesToBuckets, resolveDesiredOrdersToBuckets, bookingOutcomes, actionOfUpdate, countTotals} from "~/composables/useBooking"
import {partition, writeBatchOrEach} from "~/utils/batchUtils"
import {sellTicketsToWaitlist, joinWaitlist, previewJoinWaitlist, type DinnerForWaitlist} from "~~/server/utils/waitlistAssignment"
import {fetchWaitlistForHousehold, fetchWaitlistForDinners, deleteWaitlistEntry, updateWaitlistEntryOrder} from "~~/server/data/waitlistRepository"
import {useWaitlist, byTimeThenId, type TicketForSale} from "~/composables/useWaitlist"
import {isHouseholdActiveOnDay, useHousehold} from "~/composables/useHousehold"
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
    /** Inhabitants' draft preferences, decided in place of the stored ones */
    preferences?: {inhabitantId: number, dinnerPreferences: WeekDayMap<DinnerMode>}[]
    /** Decides and settles the supply by reading and writes nothing: the result is the one the run would give */
    preview?: boolean
}

/** A ticket a claim bought: the price row it keeps and the household that sold it */
type BoughtTicket = {ticketPriceId: number, sellerHouseholdId: number}

/**
 * What a run's claims settle against and where its tickets for sale go. A save reads and writes the database; a preview
 * reads it and applies the run's own writes as they would land, so it settles as the save would
 */
type Supply = {
    queueOf: (dinnerEventIds: number[]) => Promise<TicketWaitlistDisplay[]>
    forSale: (dinnerEventId: number, ticketType: TicketType) => Promise<number>
    buy: (claim: DesiredOrder, ticketType: TicketType) => Promise<BoughtTicket | null>
    join: (request: TicketWaitlistCreate, dinner: Pick<DinnerForWaitlist, 'state' | 'ticketPrices'>, audit: WaitlistAuditContext) => Promise<{position: number, joined: WaitlistJoined}>
    /** The ticket an order leaves for sale after the run's write to it, null when it leaves none */
    orderWritten: (orderId: number, forSale: TicketForSale | null) => void
    entryLeft: (entryId: number) => void
    entryRequeued: (entryId: number, order: WaitlistOrder) => void
    sell: (dinnerEventIds: number[]) => Promise<WaitlistPlacementOutcomes>
}

const databaseSupply = (d1Client: D1Database, payerUserId: number, ticketPrices: TicketPrice[]): Supply => ({
    queueOf: dinnerEventIds => fetchWaitlistForDinners(d1Client, dinnerEventIds),
    forSale: (dinnerEventId, ticketType) => countReleasedTickets(d1Client, dinnerEventId, ticketType),
    buy: (claim, ticketType) => claimOrder(d1Client, claim.dinnerEventId, ticketType, claim.inhabitantId, payerUserId, claim.dinnerMode, claim.isGuestTicket),
    join: (request, dinner, audit) => joinWaitlist(d1Client, request, dinner, audit),
    orderWritten: () => undefined,
    entryLeft: () => undefined,
    entryRequeued: () => undefined,
    sell: dinnerEventIds => sellTicketsToWaitlist(d1Client, dinnerEventIds, ticketPrices)
})

const previewSupply = (d1Client: D1Database, ticketPrices: TicketPrice[], ticketsForSale: TicketForSale[]): Supply => {
    const {previewSale} = useWaitlist()
    const tickets = new Map(ticketsForSale.map(ticket => [ticket.id, ticket]))
    const joined: TicketWaitlistDisplay[] = []
    const left = new Set<number>()
    const requeued = new Map<number, WaitlistOrder>()
    const runStart = new Date()
    // The type's tickets on a dinner in the order a claim buys them: first released first
    const ofType = (dinnerEventId: number, ticketType: TicketType) => [...tickets.values()]
        .filter(ticket => ticket.dinnerEventId === dinnerEventId && ticketPrices.find(price => price.id === ticket.ticketPriceId)?.ticketType === ticketType)
        .sort(byTimeThenId(ticket => ticket.releasedAt?.getTime() ?? 0))
    const queueOf = async (dinnerEventIds: number[]) => [
        ...(await fetchWaitlistForDinners(d1Client, dinnerEventIds))
            .filter(entry => !left.has(entry.id))
            .map(entry => ({...entry, order: requeued.get(entry.id) ?? entry.order})),
        ...joined.filter(entry => dinnerEventIds.includes(entry.dinnerEventId))
    ]
    return {
        queueOf,
        forSale: async (dinnerEventId, ticketType) => ofType(dinnerEventId, ticketType).length,
        buy: async (claim, ticketType) => {
            const [oldest] = ofType(claim.dinnerEventId, ticketType)
            if (!oldest?.ticketPriceId) return null
            tickets.delete(oldest.id)
            return {ticketPriceId: oldest.ticketPriceId, sellerHouseholdId: oldest.householdId}
        },
        // The entries the preview joins line up after the stored ones, in the order they join
        join: async (request, dinner) => {
            const {entry, position, joined: event} = previewJoinWaitlist(
                await queueOf([request.dinnerEventId]), request, dinner, -(joined.length + 1), new Date(runStart.getTime() + joined.length)
            )
            joined.push(entry)
            return {position, joined: event}
        },
        orderWritten: (orderId, forSale) => {
            if (forSale) tickets.set(orderId, forSale)
            else tickets.delete(orderId)
        },
        entryLeft: entryId => {
            left.add(entryId)
        },
        entryRequeued: (entryId, order) => {
            requeued.set(entryId, order)
        },
        sell: async dinnerEventIds => ({...previewSale(await queueOf(dinnerEventIds), [...tickets.values()], ticketPrices), waitlistPortionsAssigned: []})
    }
}

// The released orders the run read, each with the household that sells it
const ticketsForSaleOf = async (d1Client: D1Database, orders: OrderDisplay[], households: HouseholdDisplay[]): Promise<TicketForSale[]> => {
    const released = orders.filter(order => order.state === OrderState.RELEASED)
    const householdOf = new Map(households.flatMap(household => household.inhabitants.map(inhabitant => [inhabitant.id, household.id] as const)))
    const sellers = [...new Set(released.map(order => order.inhabitantId).filter(inhabitantId => !householdOf.has(inhabitantId)))]
    if (sellers.length > 0) {
        for (const household of await fetchHouseholdsByInhabitantIds(d1Client, sellers)) {
            for (const inhabitant of household.inhabitants) householdOf.set(inhabitant.id, household.id)
        }
    }
    return released.flatMap(({id, dinnerEventId, ticketPriceId, releasedAt, inhabitantId}) => {
        const householdId = householdOf.get(inhabitantId)
        return householdId === undefined ? [] : [{id, dinnerEventId, ticketPriceId, releasedAt, householdId}]
    })
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
 * - System mode: desiredOrders undefined → generates from inhabitant preferences, the stored ones or the given drafts
 * - User mode: desiredOrders provided → uses explicit user intent (requires householdId, userId)
 * A preview runs either mode against the supply it reads and writes nothing.
 *
 * @param d1Client - D1 database client
 * @param options - Scaffold options (seasonId, householdId, dinnerEventIds, desiredOrders, userId, preferences, preview)
 * @returns ScaffoldResult with seasonId=null if no season available
 */
export async function scaffoldPrebookings(
    d1Client: D1Database,
    options: ScaffoldOptions = {}
): Promise<ScaffoldResult> {
    const {getScaffoldableDinnerEvents, deadlinesForSeason} = useSeason()
    const {OrderStateSchema, DinnerModeSchema, ScaffoldResultSchema, chunkFetchIds, chunkOrderBatch, chunkDeleteBatch} = useBookingValidation()
    const {waitingLines, ticketTypeOfEntry} = useWaitlist()
    const {formatNameWithInitials} = useHousehold()

    const isUserTriggered = options.userId !== undefined
    const isUserMode = options.desiredOrders !== undefined
    const {preview = false} = options

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

    // The audit's user and the payer of every order, purchase and place the run books: the given user, else the system account
    // ADR-013: System operations use getSystemUserId() (cached) to ensure valid FK
    const effectiveUserId = options.userId ?? await getSystemUserId(d1Client)
    // A write to a place on the waiting list records the act it is, by the run's user
    const auditOf = (action: BookingAction): WaitlistAuditContext => ({action: getAuditAction(isUserTriggered, action), performedByUserId: effectiveUserId, seasonId: effectiveSeasonId})

    // Filter dinner events: user mode uses IDs from desiredOrders, system uses rolling window
    const allDinnerEvents = season.dinnerEvents ?? []
    const dinnerEventIds = isUserMode
        ? [...new Set(options.desiredOrders!.map(o => o.dinnerEventId))]
        : (options.dinnerEventIds
            ? options.dinnerEventIds
            : getScaffoldableDinnerEvents(allDinnerEvents).map(e => e.id))
    const dinnerEvents = allDinnerEvents.filter(de => dinnerEventIds.includes(de.id))

    const draftOf = new Map((options.preferences ?? []).map(({inhabitantId, dinnerPreferences}) => [inhabitantId, dinnerPreferences]))
    const households = (await fetchHouseholds(d1Client, options.householdId)).map(household => ({
        ...household,
        inhabitants: household.inhabitants.map(inhabitant => ({...inhabitant, dinnerPreferences: draftOf.get(inhabitant.id) ?? inhabitant.dinnerPreferences}))
    }))
    // A preview lands each write it would make without touching a row
    const execute: typeof writeBatchOrEach = preview ? async (items, _write, onDone) => onDone(items) : writeBatchOrEach

    // Fetch orders (chunked), user intent keys and, in a household's run, its queue entries in parallel
    const [orderBatches, userIntentKeys, existingEntries] = await Promise.all([
        Promise.all(chunkFetchIds(dinnerEventIds).map(batch => fetchOrders(d1Client, batch))),
        fetchUserIntentKeys(d1Client, effectiveSeasonId),
        options.householdId !== undefined ? fetchWaitlistForHousehold(d1Client, options.householdId, dinnerEventIds) : Promise.resolve([])
    ])
    const existingOrders = orderBatches.flat()
    const supply = preview
        ? previewSupply(d1Client, season.ticketPrices, await ticketsForSaleOf(d1Client, existingOrders, households))
        : databaseSupply(d1Client, effectiveUserId, season.ticketPrices)
    const {confirmedKeys, cancelledKeys} = userIntentKeys
    const entryById = new Map(existingEntries.map(entry => [entry.id, entry]))
    // The season's prices: the frozen price of a booking, the ticket type of a claim and of a waiting entry
    const ticketPriceById = new Map(season.ticketPrices.map(tp => [tp.id, tp]))
    const ticketTypeOf = ticketTypeOfEntry(season.ticketPrices)

    console.info(`${LOG} ${isUserMode ? 'User' : 'System'} mode${preview ? ' (preview)' : ''}: ${households.length} household(s), ${dinnerEvents.length} events, ${existingEntries.length} queue entries`)

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
                    cancelledKeys,
                    existingEntries
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
                        change: action,
                        performedByUserId: effectiveUserId,
                        inhabitantId: incoming.inhabitantId,
                        dinnerEventId: incoming.dinnerEventId,
                        seasonId: season.id ?? null
                    }
                }})
            }
            const executeBatchUpdates = updateOrdersBatch(90)
            const actionOf = (desired: DesiredOrder) => updates.find(entry => entry.desired === desired)!.action
            // A released order stays for sale at its price; a new release goes on sale now
            const forSaleAfter = (desired: DesiredOrder, action: BookingAction): TicketForSale | null => {
                const existing = orderById.get(desired.orderId!)!
                return desired.state === OrderState.RELEASED
                    ? {id: existing.id, dinnerEventId: existing.dinnerEventId, ticketPriceId: desired.ticketPriceId, releasedAt: action === Action.RELEASE ? new Date() : existing.releasedAt, householdId: household.id}
                    : null
            }
            await execute(updates, entries => executeBatchUpdates(d1Client, entries.map(({update}) => update)),
                entries => {
                    for (const {desired, action} of entries) {
                        landed.push(resultOf(desired, action))
                        supply.orderWritten(desired.orderId!, forSaleAfter(desired, action))
                    }
                },
                failedAs(actionOf))
            // Cancel: an order before the deadline is deleted, chunked to respect D1's 100 param limit (ADR-014), a failed
            // chunk order by order; a cancellation of nothing booked is recorded alone. Each lands as CANCEL
            // Pass null for system-triggered cancellations → SYSTEM_DELETED audit (recordCancellation contract: null = system)
            // Pass effectiveUserId for user-triggered ones → USER_CANCELLED audit (respected by scaffolder)
            const cancelledBy = isUserTriggered ? effectiveUserId : null
            const [orderCancels, nothingBooked] = partition((desired: DesiredOrder) => desired.orderId !== undefined)(result.delete)
            for (const chunk of chunkDeleteBatch(orderCancels.map(desired => ({desired, orderId: desired.orderId!})))) {
                await execute(chunk, entries => deleteOrder(d1Client, entries.map(({orderId}) => orderId), cancelledBy),
                    entries => {
                        landedAs(Action.CANCEL)(entries)
                        for (const {orderId} of entries) supply.orderWritten(orderId, null)
                    }, failedAs(() => Action.CANCEL))
            }
            const cancellationOf = (desired: DesiredOrder, inhabitant: HouseholdDisplay['inhabitants'][number]): Cancellation => {
                const {ticketPriceId, priceAtBooking, dinnerMode, state, isGuestTicket} = toOrderCreate(desired)
                return {
                    orderId: null, inhabitantId: desired.inhabitantId, dinnerEventId: desired.dinnerEventId, seasonId: effectiveSeasonId, performedByUserId: cancelledBy,
                    snapshot: {
                        id: null, inhabitantId: desired.inhabitantId, dinnerEventId: desired.dinnerEventId, ticketPriceId, priceAtBooking, dinnerMode, state, isGuestTicket,
                        inhabitantNameWithInitials: formatNameWithInitials(inhabitant), householdShortname: household.shortName, householdId: household.id
                    }
                }
            }
            // A cancellation of nothing booked names a person of the household; any other fails alone
            const nothingCancels = nothingBooked.flatMap(desired => {
                const inhabitant = household.inhabitants.find(candidate => candidate.id === desired.inhabitantId)
                if (inhabitant) return [{desired, cancellation: cancellationOf(desired, inhabitant)}]
                failedAs(() => Action.CANCEL)({desired}, new Error(`${LOG} Cancellation for inhabitant ${desired.inhabitantId} outside household ${household.id}`))
                return []
            })
            await execute(nothingCancels, entries => recordCancellation(d1Client, entries.map(({cancellation}) => cancellation)),
                landedAs(Action.CANCEL), failedAs(() => Action.CANCEL))

            // Claims act on bookingOutcomes over the supply read at this instant: a ticket of the claim's type is bought
            // while nobody waits in its line, else the wish joins the line
            for (const toClaim of result.claim) {
                let bought = false
                try {
                    const ticketType = ticketPriceById.get(toClaim.ticketPriceId)?.ticketType
                    if (!ticketType) throw new Error(`${LOG} Missing ticket price ${toClaim.ticketPriceId} for claim`)
                    const nobodyWaits = !waitingLines(await supply.queueOf([toClaim.dinnerEventId]), ticketTypeOf).has(ticketType)
                    for (let round = 0; nobodyWaits && round < CLAIM_ROUNDS && !bought; round++) {
                        const ticketsForSale = await supply.forSale(toClaim.dinnerEventId, ticketType)
                        if (bookingOutcomes(Bucket.claim, toClaim, () => ({ticketsForSale}))[0]?.outcome !== Action.BUY) break
                        const claimed = await supply.buy(toClaim, ticketType)
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
                        const {position, joined} = await supply.join({
                            dinnerEventId: toClaim.dinnerEventId,
                            inhabitantId: toClaim.inhabitantId,
                            isGuestTicket: toClaim.isGuestTicket,
                            order
                        }, {state: dinnerEventById.get(toClaim.dinnerEventId)!.state, ticketPrices: season.ticketPrices}, auditOf(Action.BOOK))
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

            // Each place on the waiting list is written on its own
            for (const toLeave of result.leave) {
                await execute([{desired: toLeave}], () => deleteWaitlistEntry(d1Client, toLeave.waitlistEntryId!, auditOf(Action.CANCEL)), entries => {
                    landedAs(Action.LEAVE)(entries)
                    supply.entryLeft(toLeave.waitlistEntryId!)
                }, failedAs(() => Action.LEAVE))
            }

            for (const toRequeue of result.requeue) {
                const entry = entryById.get(toRequeue.waitlistEntryId!)
                const ticketPrice = ticketPriceById.get(toRequeue.ticketPriceId)
                if (!entry || !ticketPrice) {
                    throw new Error(`${LOG} Data integrity: requeue of entry ${toRequeue.waitlistEntryId} at ticket price ${toRequeue.ticketPriceId}`)
                }
                const order: WaitlistOrder = {
                    ...entry.order,
                    dinnerMode: toRequeue.dinnerMode,
                    ticketPriceId: toRequeue.ticketPriceId,
                    priceAtBooking: ticketPrice.price,
                    allergyTypeIds: toRequeue.allergyTypeIds ?? entry.order.allergyTypeIds
                }
                await execute([{desired: toRequeue}], () => updateWaitlistEntryOrder(d1Client, entry.id, order, auditOf(Action.CHANGE_MODE)), entries => {
                    landedAs(Action.REQUEUE)(entries)
                    supply.entryRequeued(entry.id, order)
                }, failedAs(() => Action.REQUEUE))
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

    // The tickets for sale go to the first in their type's line, once per run; the extra portions a save finishes for a
    // stopped run go to the caller with them
    try {
        const {waitlistTicketsSold, waitlistPortionsAssigned} = await supply.sell(dinnerEventIds)
        outcomes.waitlistTicketsSold.push(...waitlistTicketsSold)
        outcomes.waitlistPortionsAssigned.push(...waitlistPortionsAssigned)
    } catch (error) {
        eventHandlerHelper.logNuxtError(eventHandlerHelper.nuxtErrorFromCatch(
            `${LOG} The tickets for sale on ${dinnerEventIds.length} dinner(s) did not reach the waiting list`, error
        ), error)
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
