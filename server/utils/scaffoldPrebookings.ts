import {fetchOrders, createOrders, deleteOrder, recordCancellation, updateOrdersBatch, claimOrder, countReleasedTicketsByType, orderSnapshotOf, type Cancellation, type OrderBatchUpdate, fetchUserIntentKeys} from "~~/server/data/financesRepository"
import {fetchHouseholds, fetchHouseholdsByInhabitantIds, fetchSeason, fetchActiveSeasonId} from "~~/server/data/prismaRepository"
import {useSeason, type BookingDeadlines} from "~/composables/useSeason"
import {useBookingValidation, OrderState, type ScaffoldResult, type DesiredOrder, type DinnerMode, type OrderAuditAction, type OrderSnapshot, type QueuePosition, type BookingOutcomes, type BookingAction, type BookingResult, type OrderDisplay, type TicketType, OrderAuditAction as AuditActions, BookingFailure} from "~/composables/useBookingValidation"
import type {HouseholdDisplay} from "~/composables/useCoreValidation"
import type {TicketPrice} from "~/composables/useTicketPriceValidation"
import type {TicketWaitlistDisplay, WaitlistAuditContext, WaitlistOrder, WaitlistPlacementOutcomes} from "~/composables/useWaitlistValidation"
import type {WeekDay, WeekDayMap} from "~/types/dateTypes"
import {dateToWeekDay} from "~/utils/season"
import {resolveOrdersFromPreferencesToBuckets, resolveDesiredOrdersToBuckets, bookingOutcomes, actionOfUpdate, countTotals} from "~/composables/useBooking"
import {groupBy, partition, writeBatchOnce, writeBatchOrEach} from "~/utils/batchUtils"
import {sellTicketsToWaitlist, joinWaitlist, previewJoinWaitlist, isClosedDinner, type DinnerForWaitlist} from "~~/server/utils/waitlistAssignment"
import {fetchWaitlistForDinners, deleteWaitlistEntries, updateWaitlistEntryOrders, type WaitlistJoin} from "~~/server/data/waitlistRepository"
import {useWaitlist, byTimeThenId, type TicketForSale} from "~/composables/useWaitlist"
import {isHouseholdActiveOnDay} from "~/composables/useHousehold"
import {useTicket} from "~/composables/useTicket"
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"
import {getSystemUserId} from "~~/server/utils/systemUser"

const LOG = '🎟️ > SEASON > [SCAFFOLD_PREBOOKINGS]'

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
    /** If provided, the rolling window's dinners on these weekdays */
    weekdays?: WeekDay[]
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
    /** An admin's correction (`?adminBypass=true`): every order row the run writes names it as its source */
    adminCorrection?: boolean
}

/** A ticket a claim bought: the order, the price row it keeps and the household and the inhabitant that sold it */
type BoughtTicket = {orderId: number, ticketPriceId: number, sellerHouseholdId: number, sellerInhabitantId: number}

// The key a written queue entry pairs with its join by: its person, its dinner and its guest flag
const entryKeyOf = ({inhabitantId, dinnerEventId, isGuestTicket}: Pick<TicketWaitlistDisplay, 'inhabitantId' | 'dinnerEventId' | 'isGuestTicket'>): string =>
    `${inhabitantId}-${dinnerEventId}-${isGuestTicket}`

/**
 * What a run's claims settle against and where its tickets for sale go. A save reads and writes the database; a preview
 * reads it and applies the run's own writes as they would land, so it settles as the save would
 */
type Supply = {
    queueOf: (dinnerEventIds: number[]) => Promise<TicketWaitlistDisplay[]>
    /** The dinner's tickets for sale per ticket type */
    forSale: (dinnerEventId: number) => Promise<Map<TicketType, number>>
    buy: (claim: DesiredOrder, ticketType: TicketType) => Promise<BoughtTicket | null>
    /** The joins of a dinner in one write; the entries in join order */
    join: (joins: WaitlistJoin[], dinner: Pick<DinnerForWaitlist, 'state'>, audit: WaitlistAuditContext) => Promise<TicketWaitlistDisplay[]>
    /** The ticket an order leaves for sale after the run's write to it, null when it leaves none */
    orderWritten: (orderId: number, forSale: TicketForSale | null) => void
    entryLeft: (entryId: number) => void
    entryRequeued: (entryId: number, order: WaitlistOrder) => void
    sell: (dinnerEventIds: number[]) => Promise<WaitlistPlacementOutcomes>
}

const databaseSupply = (d1Client: D1Database, payerUserId: number, ticketPrices: TicketPrice[]): Supply => ({
    queueOf: dinnerEventIds => fetchWaitlistForDinners(d1Client, dinnerEventIds),
    forSale: dinnerEventId => countReleasedTicketsByType(d1Client, dinnerEventId),
    buy: async (claim, ticketType) => {
        const claimed = await claimOrder(d1Client, claim.dinnerEventId, ticketType, claim.inhabitantId, payerUserId, claim.dinnerMode, claim.isGuestTicket)
        return claimed && {orderId: claimed.order.id, ticketPriceId: claimed.ticketPriceId, sellerHouseholdId: claimed.sellerHouseholdId, sellerInhabitantId: claimed.sellerInhabitantId}
    },
    join: (joins, dinner, audit) => joinWaitlist(d1Client, joins, dinner, audit),
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
    const typeOfPrice = (ticketPriceId: number | null) => ticketPrices.find(price => price.id === ticketPriceId)?.ticketType
    const onDinner = (dinnerEventId: number) => [...tickets.values()].filter(ticket => ticket.dinnerEventId === dinnerEventId)
    // The type's tickets on a dinner in the order a claim buys them: first released first
    const ofType = (dinnerEventId: number, ticketType: TicketType) => onDinner(dinnerEventId)
        .filter(ticket => typeOfPrice(ticket.ticketPriceId) === ticketType)
        .sort(byTimeThenId(ticket => ticket.releasedAt?.getTime() ?? 0))
    const queueOf = async (dinnerEventIds: number[]) => [
        ...(await fetchWaitlistForDinners(d1Client, dinnerEventIds))
            .filter(entry => !left.has(entry.id))
            .map(entry => ({...entry, order: requeued.get(entry.id) ?? entry.order})),
        ...joined.filter(entry => dinnerEventIds.includes(entry.dinnerEventId))
    ]
    return {
        queueOf,
        forSale: async dinnerEventId => onDinner(dinnerEventId).reduce((counts, ticket) => {
            const ticketType = typeOfPrice(ticket.ticketPriceId)
            return ticketType ? counts.set(ticketType, (counts.get(ticketType) ?? 0) + 1) : counts
        }, new Map<TicketType, number>()),
        buy: async (claim, ticketType) => {
            const [oldest] = ofType(claim.dinnerEventId, ticketType)
            if (!oldest?.ticketPriceId) return null
            tickets.delete(oldest.id)
            return {orderId: oldest.id, ticketPriceId: oldest.ticketPriceId, sellerHouseholdId: oldest.householdId, sellerInhabitantId: oldest.inhabitantId}
        },
        // The entries the preview joins line up after the stored ones, in the order they join
        join: async (joins, dinner) => {
            const requests = joins.map(({entry}) => entry)
            const entries = previewJoinWaitlist(await queueOf([...new Set(requests.map(request => request.dinnerEventId))]), requests, dinner, index => ({
                id: -(joined.length + index + 1), createdAt: new Date(runStart.getTime() + joined.length + index)
            }))
            joined.push(...entries)
            return entries
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
        return householdId === undefined ? [] : [{id, dinnerEventId, ticketPriceId, releasedAt, inhabitantId, householdId}]
    })
}

/**
 * Result when no season available (seasonId: null)
 */
const skippedResult = (): ScaffoldResult => ({
    seasonId: null,
    dinners: [],
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
 * @param options - Scaffold options (seasonId, householdId, dinnerEventIds, desiredOrders, userId, preferences, preview, adminCorrection)
 * @returns ScaffoldResult with seasonId=null if no season available
 */
export async function scaffoldPrebookings(
    d1Client: D1Database,
    options: ScaffoldOptions = {}
): Promise<ScaffoldResult> {
    const {getScaffoldableDinnerEvents, deadlinesForSeason} = useSeason()
    const {OrderStateSchema, DinnerModeSchema, DinnerStateSchema, ScaffoldResultSchema, chunkOrderBatch, chunkDeleteBatch} = useBookingValidation()
    const {ticketTypeOfEntry, joinedOf} = useWaitlist()

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

    // Filter dinner events: user mode uses IDs from desiredOrders, system uses rolling window. A cancelled dinner is
    // closed to every run, a consumed one to every run but an admin's correction; the run leaves a closed dinner's
    // orders and waiting list as they stand, and sells on open dinners only
    const onWeekdays = (dinnerEvent: {date: Date}) => !options.weekdays || options.weekdays.includes(dateToWeekDay(dinnerEvent.date))
    const allDinnerEvents = season.dinnerEvents ?? []
    const stateOf = new Map(allDinnerEvents.map(de => [de.id, de.state]))
    const isOpen = (dinnerEventId: number) => {
        const state = stateOf.get(dinnerEventId)
        return state === undefined || !isClosedDinner({state})
    }
    const isBookable = (dinnerEventId: number) => isOpen(dinnerEventId)
        || (options.adminCorrection === true && stateOf.get(dinnerEventId) === DinnerStateSchema.enum.CONSUMED)
    const desiredOrders = options.desiredOrders?.filter(desired => isBookable(desired.dinnerEventId))
    const dinnerEventIds = (isUserMode
        ? [...new Set(desiredOrders!.map(o => o.dinnerEventId))]
        : (options.dinnerEventIds
            ? options.dinnerEventIds
            : getScaffoldableDinnerEvents(allDinnerEvents).filter(onWeekdays).map(e => e.id)))
        .filter(isBookable)
    const dinnerEvents = allDinnerEvents.filter(de => dinnerEventIds.includes(de.id))

    const draftOf = new Map((options.preferences ?? []).map(({inhabitantId, dinnerPreferences}) => [inhabitantId, dinnerPreferences]))
    const households = (await fetchHouseholds(d1Client, options.householdId)).map(household => ({
        ...household,
        inhabitants: household.inhabitants.map(inhabitant => ({...inhabitant, dinnerPreferences: draftOf.get(inhabitant.id) ?? inhabitant.dinnerPreferences}))
    }))
    // A preview lands each write it would make without touching a row. A save retries a refused batch item by item, and
    // writes a household's leaves from the waiting list in one attempt
    const landsUnwritten: typeof writeBatchOrEach = async (items, _write, onDone) => onDone(items)
    const execute = preview ? landsUnwritten : writeBatchOrEach
    const executeOnce = preview ? landsUnwritten : writeBatchOnce

    // The dinners' orders and queue entries and the user intent keys, one read after another (ADR-014); the repositories
    // chunk the dinner ids
    const existingOrders = await fetchOrders(d1Client, dinnerEventIds)
    const existingEntries = await fetchWaitlistForDinners(d1Client, dinnerEventIds)
    const {confirmedKeys, cancelledKeys} = await fetchUserIntentKeys(d1Client, effectiveSeasonId)
    const supply = preview
        ? previewSupply(d1Client, season.ticketPrices, await ticketsForSaleOf(d1Client, existingOrders, households))
        : databaseSupply(d1Client, effectiveUserId, season.ticketPrices)
    const entryById = new Map(existingEntries.map(entry => [entry.id, entry]))
    // The season's prices: the frozen price of a booking, the ticket type of a claim and of a waiting entry
    const ticketPriceById = new Map(season.ticketPrices.map(tp => [tp.id, tp]))
    const ticketTypeOf = ticketTypeOfEntry(season.ticketPrices)

    const takesNoPortion = useTicket().takesNoPortionOf(season.ticketPrices)

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
    // What wrote the run's order rows: an admin's correction, a member's booking, a preference change, the DAILY_MAINTENANCE job
    const source = options.adminCorrection
        ? Source['admin-correction']
        : isUserMode ? Source['user-booking'] : (options.householdId ? Source['preference-update'] : Source['scaffold-prebookings'])

    // A household's writes name its people and the household: the order it books, the history row of a wish, the result
    // line and the log of a failure
    const householdRunOf = (household: HouseholdDisplay) => {
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
        // The person a history row without an order names (orderSnapshotOf), with the household the run holds; none for a
        // person outside the household
        const holderOf = (inhabitantId: number) => {
            const inhabitant = household.inhabitants.find(candidate => candidate.id === inhabitantId)
            return inhabitant && {...inhabitant, householdId: household.id, household: {address: household.address}}
        }
        // A place on the waiting list as its history row keeps it: its person, its dinner and the wish it holds
        const placeSnapshotOf = (entry: TicketWaitlistDisplay, order: WaitlistOrder): OrderSnapshot => {
            const holder = holderOf(entry.inhabitantId)
            if (!holder) throw new Error(`${LOG} Data integrity: queue entry ${entry.id} of inhabitant ${entry.inhabitantId} outside household ${household.id}`)
            return orderSnapshotOf({...order, id: null, inhabitantId: entry.inhabitantId, dinnerEventId: entry.dinnerEventId, isGuestTicket: entry.isGuestTicket}, holder)
        }
        // One result per order; a failed one is logged with the person and the dinner
        const nameOf = (inhabitantId: number): string => household.inhabitants.find(inhabitant => inhabitant.id === inhabitantId)?.name ?? ''
        const resultOf = (desired: DesiredOrder, action: BookingAction): BookingResult => ({
            inhabitantId: desired.inhabitantId, inhabitantName: nameOf(desired.inhabitantId), isGuestTicket: desired.isGuestTicket,
            ticketType: ticketPriceById.get(desired.ticketPriceId)?.ticketType ?? null,
            dinnerEventId: desired.dinnerEventId, dinnerMode: desired.dinnerMode, action
        })
        const landedAs = (action: BookingAction) => (orders: {desired: DesiredOrder}[]) => landed.push(...orders.map(({desired}) => resultOf(desired, action)))
        const failedAs = (actionOf: (desired: DesiredOrder) => BookingAction) => ({desired}: {desired: DesiredOrder}, error: unknown) => {
            failed.push({...resultOf(desired, actionOf(desired)), reason: eventHandlerHelper.isConflict(error) ? BookingFailure.CONFLICT : undefined})
            eventHandlerHelper.logNuxtError(eventHandlerHelper.nuxtErrorFromCatch(
                `${LOG} Household ${household.id} (${household.shortName}): ${actionOf(desired)} for inhabitant ${desired.inhabitantId} on dinner ${desired.dinnerEventId} failed`,
                error
            ), error)
        }
        return {household, toOrderCreate, holderOf, placeSnapshotOf, resultOf, landedAs, failedAs}
    }
    // A claim settles after every household's run, with the run of the household it belongs to
    type PendingClaim = {claim: DesiredOrder, ticketType: TicketType, run: ReturnType<typeof householdRunOf>}
    const pendingClaims: PendingClaim[] = []

    for (const household of households) {
        try {
            // Filter dinner events to household's residency period
            const isActiveOnDay = isHouseholdActiveOnDay(household.movedInDate, household.moveOutDate)
            const householdDinnerEvents = dinnerEvents.filter(de => isActiveOnDay(de.date))

            const householdInhabitantIds = new Set(household.inhabitants.map(i => i.id))
            const householdOrders = existingOrders.filter(o => householdInhabitantIds.has(o.inhabitantId))
            const householdEntries = existingEntries.filter(entry => householdInhabitantIds.has(entry.inhabitantId))

            // Build lookup: orderId → existing order (for updates)
            const orderById = new Map(householdOrders.map(o => [o.id, o]))
            const dinnerEventById = new Map(householdDinnerEvents.map(de => [de.id, de]))
            const {canModifyOrders, canEditDiningMode} = options.deadlines ?? deadlinesForSeason(season)
            const run = householdRunOf(household)
            const {toOrderCreate, holderOf, placeSnapshotOf, resultOf, landedAs, failedAs} = run


            // Resolve desired orders to buckets
            const result = isUserMode
                ? resolveDesiredOrdersToBuckets(
                    desiredOrders!,
                    householdOrders,
                    dinnerEventById,
                    canModifyOrders,
                    canEditDiningMode,
                    takesNoPortion,
                    DinnerModeSchema.enum,
                    OrderStateSchema.enum,
                    householdEntries
                )
                : resolveOrdersFromPreferencesToBuckets(
                    { ...season, dinnerEvents: householdDinnerEvents },
                    household,
                    householdOrders,
                    confirmedKeys,
                    cancelledKeys,
                    householdEntries
                )

            // The generator skips an order the household no longer holds (bought by another household, or deleted); the save lists it as failed
            const staleOrders = isUserMode ? desiredOrders!.filter(desired => desired.orderId !== undefined && !orderById.has(desired.orderId)) : []
            failed.push(...staleOrders.map(stale => resultOf(stale, actionOfUpdate(stale, undefined))))

            // Create new orders; a failed batch is written order by order
            const creates = result.create.map(desired => ({desired, order: toOrderCreate(desired)}))
            for (const batch of chunkOrderBatch(creates)) {
                await execute(batch, orders => createOrders(d1Client, household.id, orders.map(({order}) => order), {
                    action: getAuditAction(isUserTriggered, Action.BOOK),
                    performedByUserId: effectiveUserId,
                    source,
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
                        source,
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
                    ? {id: existing.id, dinnerEventId: existing.dinnerEventId, ticketPriceId: desired.ticketPriceId, releasedAt: action === Action.RELEASE ? new Date() : existing.releasedAt, inhabitantId: existing.inhabitantId, householdId: household.id}
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
                await execute(chunk, entries => deleteOrder(d1Client, entries.map(({orderId}) => orderId), cancelledBy, source),
                    entries => {
                        landedAs(Action.CANCEL)(entries)
                        for (const {orderId} of entries) supply.orderWritten(orderId, null)
                    }, failedAs(() => Action.CANCEL))
            }
            // A cancellation of nothing booked names a person of the household; any other fails alone
            const nothingCancels = nothingBooked.flatMap(desired => {
                const holder = holderOf(desired.inhabitantId)
                if (holder) {
                    const cancellation: Cancellation = {
                        orderId: null, inhabitantId: desired.inhabitantId, dinnerEventId: desired.dinnerEventId, seasonId: effectiveSeasonId, performedByUserId: cancelledBy, source,
                        snapshot: orderSnapshotOf({...toOrderCreate(desired), id: null}, holder)
                    }
                    return [{desired, cancellation}]
                }
                failedAs(() => Action.CANCEL)({desired}, new Error(`${LOG} Cancellation for inhabitant ${desired.inhabitantId} outside household ${household.id}`))
                return []
            })
            await execute(nothingCancels, entries => recordCancellation(d1Client, entries.map(({cancellation}) => cancellation)),
                landedAs(Action.CANCEL), failedAs(() => Action.CANCEL))

            // The claims settle after every household's run, on the supply the runs leave
            for (const claim of result.claim) {
                const ticketType = ticketPriceById.get(claim.ticketPriceId)?.ticketType
                if (ticketType) pendingClaims.push({claim, ticketType, run})
                else failedAs(() => Action.QUEUE)({desired: claim}, new Error(`${LOG} Missing ticket price ${claim.ticketPriceId} for claim`))
            }

            // The household's places on the waiting list: the leaves are one write per chunk within D1's parameters (ADR-014)
            // in one attempt, the new wishes one write retried place by place; each place's history row names the person
            // and the household the run holds
            const placeOf = (desired: DesiredOrder): TicketWaitlistDisplay => {
                const entry = entryById.get(desired.waitlistEntryId!)
                if (!entry) throw new Error(`${LOG} Data integrity: queue entry ${desired.waitlistEntryId} of inhabitant ${desired.inhabitantId} not read`)
                return entry
            }
            const leaves = result.leave.map(desired => {
                const entry = placeOf(desired)
                return {desired, leave: {id: entry.id, snapshot: placeSnapshotOf(entry, entry.order)}}
            })
            for (const chunk of chunkDeleteBatch(leaves)) {
                await executeOnce(chunk, batch => deleteWaitlistEntries(d1Client, batch.map(({leave}) => leave), auditOf(Action.CANCEL)), batch => {
                    landedAs(Action.LEAVE)(batch)
                    for (const {leave} of batch) supply.entryLeft(leave.id)
                }, failedAs(() => Action.LEAVE))
            }

            const requeues = result.requeue.map(desired => {
                const entry = placeOf(desired)
                const ticketPrice = ticketPriceById.get(desired.ticketPriceId)
                if (!ticketPrice) {
                    throw new Error(`${LOG} Data integrity: requeue of entry ${entry.id} at ticket price ${desired.ticketPriceId}`)
                }
                const order: WaitlistOrder = {
                    ...entry.order,
                    dinnerMode: desired.dinnerMode,
                    ticketPriceId: desired.ticketPriceId,
                    priceAtBooking: ticketPrice.price,
                    allergyTypeIds: desired.allergyTypeIds ?? entry.order.allergyTypeIds
                }
                return {desired, requeue: {id: entry.id, order, snapshot: placeSnapshotOf(entry, order)}}
            })
            await execute(requeues, batch => updateWaitlistEntryOrders(d1Client, batch.map(({requeue}) => requeue), auditOf(Action.CHANGE_MODE)), batch => {
                landedAs(Action.REQUEUE)(batch)
                for (const {requeue} of batch) supply.entryRequeued(requeue.id, requeue.order)
            }, failedAs(() => Action.REQUEUE))

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

    // Every household's claims settle per dinner on the supply the households' runs left, so a claim sees every release the
    // run made: one read of the line, then one of the dinner's tickets for sale unless every claimed ticket type has a line
    const readSupply = async (dinnerEventId: number, claims: PendingClaim[]) => {
        const line = await supply.queueOf([dinnerEventId])
        const waiting = new Set(line.map(ticketTypeOf))
        const released = claims.some(({ticketType}) => !waiting.has(ticketType)) ? await supply.forSale(dinnerEventId) : new Map<TicketType, number>()
        // A ticket type with a line sells nothing to a claim
        const forSaleOf = (ticketType: TicketType): number => waiting.has(ticketType) ? 0 : released.get(ticketType) ?? 0
        const typeOf = new Map(claims.map(({claim, ticketType}) => [claim, ticketType]))
        const settled = bookingOutcomes(Bucket.claim, claims.map(({claim}) => claim), claim => ({ticketType: typeOf.get(claim), ticketsForSale: forSaleOf(typeOf.get(claim)!)}))
        return {line, settled: settled.map(({outcome}, index) => ({pending: claims[index]!, outcome}))}
    }
    for (const [dinnerEventId, claims] of groupBy<PendingClaim, number>(({claim}) => claim.dinnerEventId)(pendingClaims)) {
        const read = await readSupply(dinnerEventId, claims).catch((error: unknown) => {
            for (const {claim, run} of claims) run.failedAs(() => Action.QUEUE)({desired: claim}, error)
            return null
        })
        if (!read) continue

        // A claim buys while the claims before it left a ticket of its type, else the wish joins the line. A purchase that
        // lost its race queues its claim, and the claims of its ticket type after it join behind it
        const lineTypes = new Set<TicketType>()
        const toJoin: PendingClaim[] = []
        for (const {pending, outcome} of read.settled) {
            const {claim, ticketType, run} = pending
            try {
                const bought = outcome === Action.BUY && !lineTypes.has(ticketType) ? await supply.buy(claim, ticketType) : null
                if (bought) {
                    outcomes.ticketsSold.push({
                        dinnerEventId, ticketPriceId: bought.ticketPriceId, orderId: bought.orderId, dinnerMode: claim.dinnerMode, isGuestTicket: claim.isGuestTicket,
                        buyerInhabitantId: claim.inhabitantId, buyerHouseholdId: run.household.id, sellerHouseholdId: bought.sellerHouseholdId,
                        sellerInhabitantId: bought.sellerInhabitantId
                    })
                    landed.push(run.resultOf(claim, Action.BUY))
                } else {
                    lineTypes.add(ticketType)
                    toJoin.push(pending)
                }
            } catch (error) {
                run.failedAs(() => Action.QUEUE)({desired: claim}, error)
            }
        }

        // The joins of a dinner are one write across the households (ADR-014) in one attempt: a refused write lists each of
        // its joins failed. A join's history row keeps the name and the household its run holds; any other person's claim
        // fails alone
        const joins = toJoin.flatMap(pending => {
            const {claim, run} = pending
            const holder = run.holderOf(claim.inhabitantId)
            if (holder) {
                const order = {...run.toOrderCreate(claim), state: OrderStateSchema.enum.BOOKED, allergyTypeIds: claim.allergyTypeIds}
                const entry = {dinnerEventId, inhabitantId: claim.inhabitantId, isGuestTicket: claim.isGuestTicket, order}
                return [{pending, join: {entry, snapshot: orderSnapshotOf({...order, id: null}, holder)}}]
            }
            run.failedAs(() => Action.QUEUE)({desired: claim}, new Error(`${LOG} Claim for inhabitant ${claim.inhabitantId} outside household ${run.household.id}`))
            return []
        })
        const joined: {pending: PendingClaim, entry: TicketWaitlistDisplay}[] = []
        const dinner = {state: dinnerEvents.find(dinnerEvent => dinnerEvent.id === dinnerEventId)!.state}
        await writeBatchOnce(joins, async batch => {
            const entries = await supply.join(batch.map(({join}) => join), dinner, auditOf(Action.BOOK))
            // Each join takes the first entry written for its person, dinner and guest flag: two guest tickets of one person
            // pair in insert order
            const written = groupBy<TicketWaitlistDisplay, string>(entryKeyOf)(entries)
            joined.push(...batch.map(({pending, join}) => {
                const entry = written.get(entryKeyOf(join.entry))?.shift()
                if (!entry) throw new Error(`${LOG} No queue entry written for inhabitant ${join.entry.inhabitantId} on dinner ${dinnerEventId}`)
                return {pending, entry}
            }))
        }, () => undefined, ({pending: {claim, run}}, error) => run.failedAs(() => Action.QUEUE)({desired: claim}, error))

        // The places count the line as read, then the joins in join order
        const places = joinedOf(read.line, joined.map(({entry}) => entry), season.ticketPrices, effectiveUserId)
        for (const [index, {pending: {claim, run}}] of joined.entries()) {
            const {position, joined: event} = places[index]!
            outcomes.joined.push(event)
            landed.push(run.resultOf(claim, Action.QUEUE))
            positions.push({inhabitantId: claim.inhabitantId, dinnerEventId, isGuestTicket: claim.isGuestTicket, position, ticketType: event.ticketType})
        }
    }

    // The tickets for sale go to the first in their type's line, once per run; the extra portions a save finishes for a
    // stopped run go to the caller with them
    try {
        const {waitlistTicketsSold, waitlistPortionsAssigned} = await supply.sell(dinnerEventIds.filter(isOpen))
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
        dinners: dinnerEvents.map(({id, date}) => ({id, date})),
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
