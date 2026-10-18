import {useBookingValidation, DinnerMode as DinnerModeEnum, DinnerState as DinnerStateEnum, OrderState as OrderStateEnum, TicketState as TicketStateEnum, SupplyState as SupplyStateEnum, type TicketState, type SupplyState, type TicketType, type BookingRowAction, type OrderBucket, type BookingAction, type BookingOutcome, type BookingResult, type BookingTotals, type DinnerEventDetail, type DinnerEventDisplay, type DinnerEventUpdate, type HeynaboEventCreate, type OrderForTransaction, type OrderDetail, type OrderSnapshot, type OrderDisplay, type DinnerMode, type DesiredOrder, type OrderState, type DinnerState, type ScaffoldResult, type OrderHistoryDisplay, type TicketChange, type TicketEvent, type TicketCounts, type AuditTicket} from '~/composables/useBookingValidation'
import {useBillingValidation, type TransactionCreateData} from '~/composables/useBillingValidation'
import {useBilling} from '~/composables/useBilling'
import {useSeason, type SeasonDeadlines} from '~/composables/useSeason'
import {useHousehold} from '~/composables/useHousehold'
import {useTicket, ticketTypeLabel} from '~/composables/useTicket'
import type {InhabitantDisplay, HouseholdDisplay} from '~/composables/useCoreValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {Season} from '~/composables/useSeasonValidation'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {byTimeThenId} from '~/composables/useWaitlist'
import {calculateCountdown, formatDate, DATE_SETTINGS} from '~/utils/date'
import {dateToWeekDay} from '~/utils/season'
import {chunkArray, groupBy, partition} from '~/utils/batchUtils'
import {sumBy} from '~/utils/ledger'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {differenceInCalendarDays, isAfter} from 'date-fns'

const {BookingRowActionSchema, OrderBucketSchema, BookingActionSchema} = useBookingValidation()
const ROW_ACTION = BookingRowActionSchema.enum
const Bucket = OrderBucketSchema.enum
const Action = BookingActionSchema.enum

/**
 * What a ticket is now. Released wins over bought, as the ticket card shows it: a released ticket is for sale until the
 * dinner and the close keeps it with the eating mode Ingen. A person on the waiting list holds no order.
 */
export const ticketStateOf = (order: Pick<OrderDisplay, 'state' | 'dinnerMode' | 'provenanceHousehold'> | null, queued = false): TicketState => {
    switch (true) {
        case order !== null && (order.state === OrderStateEnum.RELEASED || (order.state === OrderStateEnum.CLOSED && order.dinnerMode === DinnerModeEnum.NONE)): return TicketStateEnum.released
        case order !== null && !!order.provenanceHousehold: return TicketStateEnum.claimed
        case queued: return TicketStateEnum.queued
        default: return TicketStateEnum.normal
    }
}

/**
 * Field set that reverts a dinner to a clean chef-less SCHEDULED state.
 * Allergens are cleared separately via `updateDinnerEventAllergens(d1, id, [])`;
 * Heynabo deletion is endpoint-side I/O.
 */
export const CHEF_LOSS_DINNER_UPDATES = {
    chefId: null,
    menuTitle: '',
    menuDescription: '',
    menuPictureUrl: null,
    heynaboEventId: null,
    state: useBookingValidation().DinnerStateSchema.enum.SCHEDULED
} satisfies Partial<DinnerEventUpdate>

// ============================================================================
// Order Decision - Pure function for categorizing booking intent
// ============================================================================

/**
 * Result of order decision: which bucket and the order with state set.
 * null = skip (no action needed, e.g., no orderId + NONE, or no capacity)
 */
export type OrderDecision = {
    bucket: OrderBucket
    order: DesiredOrder
} | null

/** The orders of each bucket */
export type OrderBucketResult<T = DesiredOrder> = Record<OrderBucket, T[]>

export const emptyOrderBuckets = <T = DesiredOrder>(): OrderBucketResult<T> =>
    Object.fromEntries(OrderBucketSchema.options.map(bucket => [bucket, []])) as unknown as OrderBucketResult<T>

/**
 * Input for order decision: the desired order plus context for deadline enforcement
 */
export type OrderDecisionInput = {
    desired: DesiredOrder
    existing: OrderDisplay | null
    /** The household's queue entry the desired order targets */
    existingEntry: TicketWaitlistDisplay | null
    beforeCancellationDeadline: boolean
    canEditMode: boolean
}

/**
 * Determine action for new booking (no existing order).
 * Shared logic used by both getBookingOptions (UI) and decideOrderAction (generator).
 * After the deadline the executor settles the supply: a released ticket at the price, else a queue entry.
 *
 * @param canModifyOrders - Before booking deadline (can create new orders)
 * @returns process (create) or claim
 */
export const getNewOrderAction = (canModifyOrders: boolean): BookingRowAction =>
    canModifyOrders ? ROW_ACTION.process : ROW_ACTION.claim

// The outcome of one order of a bucket at a supply: a claim buys while a ticket is for sale, else queues; a bucket
// that changes no supply (update, delete, idempotent, skip) changes the mode
const outcomeOf = (bucket: OrderBucket | null, ticketsForSale: number): BookingOutcome => {
    switch (bucket) {
        case Bucket.create: return Action.BOOK
        case Bucket.claim: return ticketsForSale > 0 ? Action.BUY : Action.QUEUE
        case Bucket.leave: return Action.LEAVE
        case Bucket.requeue: return Action.REQUEUE
        default: return Action.CHANGE_MODE
    }
}

/** What a save would find for sale for an order: the released tickets of its ticket type on its dinner */
export type PreviewSupply = (order: DesiredOrder) => {ticketsForSale: number, ticketType?: TicketType}
export const NOTHING_FOR_SALE: PreviewSupply = () => ({ticketsForSale: 0})

/** The supply a claim finds: its dinner's released tickets of the ticket type its price names */
export const supplyOfType = (
    counts: Pick<ReleasedTicketCounts, 'byType'> | null | undefined,
    ticketPrices: Pick<TicketPrice, 'id' | 'ticketType'>[],
    ticketPriceId: number
): ReturnType<PreviewSupply> => {
    const ticketType = ticketPrices.find(price => price.id === ticketPriceId)?.ticketType
    return {ticketType, ticketsForSale: ticketType ? counts?.byType[ticketType] ?? 0 : 0}
}

type SettledOrder = {order: DesiredOrder, outcome: BookingOutcome}

/**
 * The outcome of each order of a bucket, in the order given, which is the order of purchase: a claim buys while the
 * claims before it left a ticket of its type on its dinner, else queues. One order or a list.
 */
export const bookingOutcomes = (
    bucket: OrderBucket | null,
    orders: DesiredOrder | DesiredOrder[],
    supply: PreviewSupply = NOTHING_FOR_SALE
): SettledOrder[] =>
    [orders].flat().reduce<{left: Partial<Record<string, number>>, settled: SettledOrder[]}>(({left, settled}, order) => {
        const {ticketsForSale, ticketType} = supply(order)
        const pool = `${order.dinnerEventId}:${ticketType}`
        const available = left[pool] ?? ticketsForSale
        const outcome = outcomeOf(bucket, available)
        return {left: {...left, [pool]: outcome === Action.BUY ? available - 1 : available}, settled: [...settled, {order, outcome}]}
    }, {left: {}, settled: []}).settled

/** What an update does to the order it names; without the order at hand, a release or a mode change */
export const actionOfUpdate = (incoming: DesiredOrder, existing: OrderDisplay | undefined): BookingAction => {
    const releases = ticketStateOf(incoming) === TicketStateEnum.released
    const wasReleased = existing !== undefined && ticketStateOf(existing) === TicketStateEnum.released
    if (releases && !wasReleased) return Action.RELEASE
    if (!existing) return Action.CHANGE_MODE
    if (!releases && wasReleased) return Action.RECLAIM
    if (incoming.ticketPriceId !== existing.ticketPriceId) return Action.CHANGE_PRICE
    return Action.CHANGE_MODE
}

/** A place on a dinner's waiting list, in the line of its ticket type; an entry whose ticket price is gone has its number alone */
export const formatPlace = (position: number, ticketType?: TicketType | null): string =>
    `${ticketType ? `${ticketTypeLabel(ticketType)} ` : ''}#${position}`

/** A dinner's name: its menu title, else the untitled dinner's word while the chef has written no menu */
export const formatDinnerName = (dinner: Pick<DinnerEventDisplay, 'menuTitle'>): string =>
    dinner.menuTitle.trim() || BOOKING_WORDS.untitledDinner

/** The buckets whose execution has a supply outcome, in the order a preview reads them */
export const OUTCOME_BUCKETS = [Bucket.claim, Bucket.create, Bucket.leave, Bucket.requeue] as const

/** Every order of the buckets with its action, the plan the preview shows and the scaffold executes; the claims settle in order against the supply */
export const plannedActions = (
    buckets: OrderBucketResult,
    existingById: Map<number, OrderDisplay>,
    supply: PreviewSupply = NOTHING_FOR_SALE
): {order: DesiredOrder, action: BookingAction}[] => [
    ...OUTCOME_BUCKETS.flatMap(bucket => bookingOutcomes(bucket, buckets[bucket], supply).map(({order, outcome}) => ({order, action: outcome}))),
    ...buckets.delete.map(order => ({order, action: Action.CANCEL})),
    ...buckets.update.map(order => ({order, action: actionOfUpdate(order, order.orderId ? existingById.get(order.orderId) : undefined)}))
]

/** The orders of a run per action, every action present */
export const countTotals = (items: readonly BookingResult[]): BookingTotals =>
    Object.fromEntries(BookingActionSchema.options.map(action => [action, items.filter(item => item.action === action).length])) as BookingTotals

/**
 * Pure decision function for categorizing user booking intent into buckets.
 * Generator decides bucket AND sets state. Scaffolder just executes.
 *
 * Decision matrix:
 * - Queue entry + NONE → leave
 * - Queue entry + another mode or price → requeue (mode only while canEditMode)
 * - Queue entry + unchanged → idempotent
 * - waitlistEntryId of an entry no longer queued (placed or swept) → null (skip)
 * - No orderId + NONE → null (skip)
 * - No orderId + eating + before deadline → create (state: BOOKED)
 * - No orderId + eating + after deadline → claim (state: BOOKED)
 * - orderId of an order no longer among the existing ones (bought or deleted) → null (skip)
 * - orderId + NONE + before deadline → delete
 * - orderId + NONE + after deadline → update (state: RELEASED)
 * - orderId + RELEASED + eating mode → update (state: BOOKED, reclaim own)
 * - orderId + eating mode + unchanged → idempotent (state: BOOKED)
 * - orderId + eating mode + changed → update (state: BOOKED)
 * - orderId + price mismatch (any state) → update (price healing)
 */
export const decideOrderAction = (
    input: OrderDecisionInput,
    DinnerMode: { NONE: DinnerMode },
    OrderState: { BOOKED: OrderState; RELEASED: OrderState }
): OrderDecision => {
    const { desired, existing, existingEntry, beforeCancellationDeadline, canEditMode } = input
    const isNone = desired.dinnerMode === DinnerMode.NONE

    if (existingEntry) {
        if (isNone) return { bucket: Bucket.leave, order: { ...desired, waitlistEntryId: existingEntry.id } }
        const wish = existingEntry.order
        const dinnerMode = canEditMode ? desired.dinnerMode : wish.dinnerMode
        const changed = wish.dinnerMode !== dinnerMode || wish.ticketPriceId !== desired.ticketPriceId
        return {
            bucket: changed ? Bucket.requeue : Bucket.idempotent,
            order: { ...desired, dinnerMode, waitlistEntryId: existingEntry.id, state: OrderState.BOOKED }
        }
    }
    if (desired.waitlistEntryId) return null

    // No orderId = new order intent
    if (!desired.orderId) {
        if (isNone) return null // Skip: no order to create for NONE
        const bucket = getNewOrderAction(beforeCancellationDeadline) === ROW_ACTION.process ? Bucket.create : Bucket.claim
        return { bucket, order: { ...desired, state: OrderState.BOOKED } }
    }

    // An orderId among no existing orders is stale: the order was bought by another household or deleted since
    if (!existing) return null

    // Universal price check - runs BEFORE state-specific logic to ensure price healing
    // This catches price mismatches on ALL existing orders (BOOKED, RELEASED, any mode)
    const priceChanged = existing.ticketPriceId !== desired.ticketPriceId

    // NONE mode = cancellation
    if (isNone) {
        if (beforeCancellationDeadline) {
            return { bucket: Bucket.delete, order: desired }
        }
        // After deadline: release BOOKED orders, update RELEASED if price needs correction
        if (ticketStateOf(existing) === TicketStateEnum.released) {
            if (priceChanged) {
                return { bucket: Bucket.update, order: { ...desired, dinnerMode: DinnerMode.NONE, state: existing.state } }
            }
            return { bucket: Bucket.idempotent, order: { ...desired, dinnerMode: DinnerMode.NONE, state: existing.state } }
        }
        return { bucket: Bucket.update, order: { ...desired, state: OrderState.RELEASED } }
    }

    // Reclaim: existing RELEASED + eating mode → update back to BOOKED
    // Price change is handled by scaffolder since desired.ticketPriceId is correct
    if (ticketStateOf(existing) === TicketStateEnum.released) {
        return { bucket: Bucket.update, order: { ...desired, state: OrderState.BOOKED } }
    }

    // Eating mode on BOOKED order - check if changed
    const effectiveMode = canEditMode ? desired.dinnerMode : existing.dinnerMode
    const modeChanged = existing.dinnerMode !== effectiveMode

    if (modeChanged || priceChanged) {
        return { bucket: Bucket.update, order: { ...desired, dinnerMode: effectiveMode, state: OrderState.BOOKED } }
    }

    // Idempotent - preserve existing state and use effectiveMode to respect deadline enforcement
    return { bucket: Bucket.idempotent, order: { ...desired, dinnerMode: effectiveMode, state: existing.state } }
}

/**
 * Resolve desired orders into C/U/D/I/claim/leave/requeue buckets with expected states.
 * Uses decideOrderAction for each order to determine bucket and state.
 * A desired order targets the entry its waitlistEntryId names; a regular one without ids targets the inhabitant's
 * own entry, so a second regular wish for a queued inhabitant never claims (one regular entry per person per dinner).
 *
 * @param desiredOrders - Orders with intent (may or may not have orderId or waitlistEntryId)
 * @param existingOrders - Current orders from DB (have id)
 * @param dinnerEventById - Lookup for dinner event dates
 * @param canModifyOrders - Deadline check for cancellation
 * @param canEditDiningMode - Deadline check for mode changes
 * @param existingEntries - The household's queue entries on these dinners
 */
export const resolveDesiredOrdersToBuckets = (
    desiredOrders: DesiredOrder[],
    existingOrders: OrderDisplay[],
    dinnerEventById: Map<number, { date: Date }>,
    canModifyOrders: (date: Date) => boolean,
    canEditDiningMode: (date: Date) => boolean,
    DinnerMode: { NONE: DinnerMode },
    OrderState: { BOOKED: OrderState; RELEASED: OrderState },
    existingEntries: TicketWaitlistDisplay[] = []
): OrderBucketResult<DesiredOrder> => {
    const existingById = new Map(existingOrders.map(o => [o.id, o]))
    const entryById = new Map(existingEntries.map(entry => [entry.id, entry]))
    const entryFor = (desired: DesiredOrder): TicketWaitlistDisplay | null => {
        if (desired.waitlistEntryId) return entryById.get(desired.waitlistEntryId) ?? null
        if (desired.orderId || desired.isGuestTicket) return null
        return findRegularOrder(existingEntries, desired.inhabitantId, desired.dinnerEventId) ?? null
    }

    const result = emptyOrderBuckets<DesiredOrder>()

    for (const desired of desiredOrders) {
        const de = dinnerEventById.get(desired.dinnerEventId)
        if (!de) {
            throw new Error(`Dinner event ${desired.dinnerEventId} not found in season dinner events`)
        }

        const existing = desired.orderId ? existingById.get(desired.orderId) ?? null : null

        const decision = decideOrderAction(
            {
                desired,
                existing,
                existingEntry: entryFor(desired),
                beforeCancellationDeadline: canModifyOrders(de.date),
                canEditMode: canEditDiningMode(de.date)
            },
            DinnerMode,
            OrderState
        )

        if (decision) {
            result[decision.bucket].push(decision.order)
        }
    }

    return result
}

/** A user's booking change for one inhabitant at one dinner */
export type BookingIntent = Pick<DesiredOrder, 'inhabitantId' | 'dinnerEventId' | 'dinnerMode'>

/** `useTicket().resolveTicketPrice` bound to the season's ticket prices */
export type TicketPriceResolver = (
    birthDate: Date | null,
    priceAtBooking: number | null | undefined,
    referenceDate: Date | undefined
) => TicketPrice | undefined

/** The inhabitant's own order for a dinner, or own queue entry; guest tickets they booked are never it */
export const findRegularOrder = <T extends Pick<OrderDisplay, 'inhabitantId' | 'dinnerEventId' | 'isGuestTicket'>>(
    orders: T[],
    inhabitantId: number,
    dinnerEventId: number
): T | undefined =>
    orders.find(o => o.inhabitantId === inhabitantId && o.dinnerEventId === dinnerEventId && !o.isGuestTicket)

/**
 * Turn a user's booking intent for an inhabitant into a DesiredOrder.
 * The intent targets the inhabitant's regular order (findRegularOrder).
 * An existing order keeps its ticket price; a new booking is priced by age on the dinner date.
 * Returns null when no ticket price resolves.
 */
export const buildDesiredOrder = (
    intent: BookingIntent,
    existingOrders: OrderDisplay[],
    inhabitants: Pick<InhabitantDisplay, 'id' | 'birthDate'>[],
    dinnerEvents: Pick<DinnerEventDisplay, 'id' | 'date'>[],
    resolveTicketPrice: TicketPriceResolver,
    BOOKED: OrderState
): DesiredOrder | null => {
    const {inhabitantId, dinnerEventId} = intent
    const existing = findRegularOrder(existingOrders, inhabitantId, dinnerEventId)
    const birthDate = inhabitants.find(i => i.id === inhabitantId)?.birthDate ?? null
    const eventDate = dinnerEvents.find(de => de.id === dinnerEventId)?.date
    const ticketPriceId = existing?.ticketPriceId ?? resolveTicketPrice(birthDate, existing?.priceAtBooking, eventDate)?.id
    if (!ticketPriceId) return null
    return {...intent, ticketPriceId, isGuestTicket: false, orderId: existing?.id, state: BOOKED}
}

/** A user's dinner-mode change for one guest group (groupGuestOrders: one booker, ticket type and dinner) */
export type GuestBookingIntent = {guestOrders: OrderDisplay[], dinnerMode: DinnerMode}

/** The edits of a booking grid: inhabitant cells and guest cells, saved in one scaffold call */
export type BookingChanges = {intents: BookingIntent[], guestIntents: GuestBookingIntent[]}

/**
 * Turn a guest group's mode change into one DesiredOrder per guest order, each updated by its orderId.
 * The group shares one ticket type, so it is priced once from its first order; returns [] when no price resolves.
 */
export const buildGuestDesiredOrder = (
    intent: GuestBookingIntent,
    resolveTicketPrice: TicketPriceResolver,
    BOOKED: OrderState
): DesiredOrder[] => {
    const [first] = intent.guestOrders
    const ticketPriceId = first && (first.ticketPriceId ?? resolveTicketPrice(null, first.priceAtBooking, undefined)?.id)
    if (!ticketPriceId) return []
    return intent.guestOrders.map(order => ({
        inhabitantId: order.inhabitantId,
        dinnerEventId: order.dinnerEventId,
        dinnerMode: intent.dinnerMode,
        ticketPriceId,
        isGuestTicket: true,
        orderId: order.id,
        state: BOOKED
    }))
}

/** Desired orders from inhabitant preferences; only the orders preferences manage come in */
export const generateDesiredOrdersFromPreferences = (
    inhabitants: InhabitantDisplay[],
    dinnerEvents: DinnerEventDisplay[],
    managedOrders: OrderDisplay[],
    userIntentKeys: Set<string>,
    ticketPrices: TicketPrice[]
): DesiredOrder[] => {
    const {resolveTicketPrice} = useTicket()
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum
    const orderByKey = new Map(managedOrders.map(o => [`${o.inhabitantId}-${o.dinnerEventId}`, o]))

    return inhabitants.flatMap(inhabitant => dinnerEvents.flatMap((de): DesiredOrder[] => {
        const key = `${inhabitant.id}-${de.id}`
        if (userIntentKeys.has(key)) return []
        const existing = orderByKey.get(key)

        const requestedMode = inhabitant.dinnerPreferences?.[dateToWeekDay(de.date)] ?? DinnerMode.DINEIN
        if (!existing && requestedMode === DinnerMode.NONE) return []

        const ticketPrice = resolveTicketPrice(inhabitant.birthDate ?? null, null, ticketPrices, de.date)
        if (!ticketPrice?.id) {
            throw new Error(`No ticket price for inhabitant ${inhabitant.id}`)
        }

        return [{
            inhabitantId: inhabitant.id,
            dinnerEventId: de.id,
            dinnerMode: requestedMode,
            ticketPriceId: ticketPrice.id,
            isGuestTicket: false,
            orderId: existing?.id,
            state: existing?.state ?? OrderState.BOOKED
        }]
    }))
}

const asBucketEntry = (order: OrderDisplay): DesiredOrder => ({
    inhabitantId: order.inhabitantId,
    dinnerEventId: order.dinnerEventId,
    dinnerMode: order.dinnerMode,
    ticketPriceId: order.ticketPriceId ?? 0,
    isGuestTicket: order.isGuestTicket,
    orderId: order.id,
    state: order.state
})

/** System mode never claims: buying a ticket or queueing after the deadline is a user's act */
export const resolveOrdersFromPreferencesToBuckets = (
    season: Season,
    household: HouseholdDisplay,
    existingOrders: OrderDisplay[],
    confirmedKeys: Set<string> = new Set(),
    cancelledKeys: Set<string> = new Set()
): OrderBucketResult<DesiredOrder> => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const {deadlinesForSeason} = useSeason()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum
    const dinnerEvents = season.dinnerEvents ?? []
    const dinnerEventById = new Map(dinnerEvents.map(de => [de.id, de]))
    const {canModifyOrders, canEditDiningMode} = deadlinesForSeason(season)

    const keyOf = (order: OrderDisplay) => `${order.inhabitantId}-${order.dinnerEventId}`
    // A user's own act outranks the preference: a guest ticket, an explicit booking, an explicit release
    const isManagedByPreferences = (order: OrderDisplay) =>
        !order.isGuestTicket && !confirmedKeys.has(keyOf(order)) && !(cancelledKeys.has(keyOf(order)) && ticketStateOf(order) === TicketStateEnum.released)

    const [managedOrders, unmanagedOrders] = partition(isManagedByPreferences)(existingOrders)
    const [unchangedOrders, outsideResidency] = partition((order: OrderDisplay) => dinnerEventById.has(order.dinnerEventId))(unmanagedOrders)

    const managedKeys = new Set(managedOrders.map(keyOf))
    const userIntentKeys = new Set([
        ...unmanagedOrders.filter(order => !order.isGuestTicket).map(keyOf),
        ...[...cancelledKeys].filter(key => !managedKeys.has(key))
    ])
    const desiredOrders = generateDesiredOrdersFromPreferences(household.inhabitants, dinnerEvents, managedOrders, userIntentKeys, season.ticketPrices)

    // System mode never claims
    const result = {
        ...resolveDesiredOrdersToBuckets(desiredOrders, managedOrders, dinnerEventById, canModifyOrders, canEditDiningMode, DinnerMode, OrderState),
        [Bucket.claim]: []
    }

    const decidedOrderIds = new Set([...result.update, ...result.delete, ...result.idempotent].map(order => order.orderId))
    const orphans = managedOrders.filter(order => !decidedOrderIds.has(order.id))
    const deleted = [...outsideResidency, ...orphans]
    if (deleted.length > 0) {
        console.info(`🗑️ > ORPHAN_CHECK > Household ${household.id}: deleting orders ${deleted.map(order => order.id).join(', ')} (outside residency, or no preference wants them)`)
    }

    result.idempotent.push(...unchangedOrders.map(asBucketEntry))
    result.delete.push(...deleted.map(asBucketEntry))
    return result
}

// ============================================================================
// Deadline Labels - Consistent wording across chef and household views
// ============================================================================

/**
 * Centralized deadline badge labels for UI consistency.
 *
 * Note: "Framelding" (not "Tilmelding") because system auto-signs up via
 * preferences (ADR-015 scaffolding). Deadline is for CANCELLING, not signing up.
 */
export const DEADLINE_LABELS = {
    SCHEDULED: {
        openText: 'Fællesspisningen er i kalenderen',
        closedText: 'Fællesspisningen er i kalenderen'
    },
    ANNOUNCED: {
        label: 'Menu',
        openText: 'Chefkokken publicerer sin menu',
        closedText: 'Chefkokken har publiceret sin menu',
        deadlinePrefix: 'om'
    },
    BOOKING_CLOSED: {
        label: 'Framelding',
        openText: 'Booking kan ændres',
        closedText: 'Lukket for framelding',
        deadlinePrefix: 'åben de næste'
    },
    GROCERIES_DONE: {
        label: 'Indkøb',
        openText: 'Chefkokken bestiller madvarer',
        closedText: 'Chefkokken har bestilt madvarer',
        deadlinePrefix: 'om'
    },
    CONSUMED: {
        label: 'Spisning',
        openText: 'Fællesspisning forude',
        closedText: 'Vi har spist den dejlige mad',
        deadlinePrefix: 'om'
    },
    // Booking view labels (reused by DinnerBookingForm and GuestBookingForm)
    DINING_MODE: {
        label: 'Hvordan spiser I',
        openText: 'Vælg mellem spisesal, sen eller takeaway',
        closedText: 'Du kan ikke længere ændre, hvordan I spiser'
    }
} as const

// ============================================================================
// Released tickets (badge factories live in useBookingUi)
// ============================================================================

/**
 * A locked dinner's supply: the released tickets and the waiting list, each with its pre-formatted breakdown
 * ("2V 1B") for the deadline badges and the booking form's bar
 */
export interface ReleasedTicketCounts {
    total: number
    formatted: string  // Pre-computed by formatTicketCounts, e.g., "2V 1B"
    byType: Partial<Record<TicketType, number>>  // A claim buys from its own ticket type
    queued: number
    queuedFormatted: string  // The waiting list by ticket type, in the style of formatted
    queuedByType: Partial<Record<TicketType, number>>  // The waiting list per ticket type
}

/** A locked dinner's waiting list: its size and its breakdown by ticket type */
export type WaitlistCounts = Pick<ReleasedTicketCounts, 'queued' | 'queuedFormatted' | 'queuedByType'>

/** A locked dinner with nothing for sale and nobody on its waiting list */
export const EMPTY_RELEASED_TICKET_COUNTS: ReleasedTicketCounts = {total: 0, formatted: '-', byType: {}, queued: 0, queuedFormatted: '-', queuedByType: {}}

/** A locked dinner's supply: its tickets for sale, its waiting list, both or neither */
export const supplyStateOf = (counts: Pick<ReleasedTicketCounts, 'total' | 'queued'>): SupplyState => {
    switch (true) {
        case counts.total > 0 && counts.queued > 0: return SupplyStateEnum.FOR_SALE_AND_WAITLIST
        case counts.total > 0: return SupplyStateEnum.FOR_SALE
        case counts.queued > 0: return SupplyStateEnum.WAITLIST
        default: return SupplyStateEnum.NONE
    }
}

// ============================================================================
// Daily Maintenance - State Constants (ADR-015: Idempotent operations)
// ============================================================================

/**
 * Dinner states eligible for consumption by daily maintenance.
 * Business rule: Only SCHEDULED and ANNOUNCED dinners can be consumed.
 * CANCELLED dinners are excluded (refunded), CONSUMED is already processed.
 */
export const CONSUMABLE_DINNER_STATES = [DinnerStateEnum.SCHEDULED, DinnerStateEnum.ANNOUNCED] as const

/**
 * Order states eligible for closing by daily maintenance.
 * Business rule: BOOKED and RELEASED orders on CONSUMED dinners become CLOSED.
 * CANCELLED orders are excluded (dinner was cancelled, already refunded).
 */
export const CLOSABLE_ORDER_STATES = [OrderStateEnum.BOOKED, OrderStateEnum.RELEASED] as const

/** Booked or released: the order waits for the close */
export const isPendingOrder = (order: Pick<OrderDisplay, 'state'>): boolean =>
    CLOSABLE_ORDER_STATES.some(state => state === order.state)

/**
 * Dinner preparation step states (5-step workflow)
 */
export enum DinnerStepState {
    SCHEDULED,
    ANNOUNCED,
    BOOKING_CLOSED,
    GROCERIES_DONE,
    CONSUMED
}

/**
 * Deadline status levels for step indicators
 * -1 = neutral (completed, or past deadline for non-user actions)
 *  0 = success/green (on track, well before deadline)
 *  1 = warning/yellow (approaching deadline)
 *  2 = critical/red (very close to deadline)
 *  3 = overdue/💀 (past deadline, not completed - user action required)
 */
export type AlarmLevel = -1 | 0 | 1 | 2 | 3

export interface StepDeadlineResult {
    description: string
    alarm: AlarmLevel
}

export interface StepConfig {
    step: number
    title: string
    text: string
    getDeadline: (countdown: { hours: number; formatted: string }, thresholds: { warning: number; critical: number }) => StepDeadlineResult
}

// Deadline helpers - calculate alarm level based on countdown and thresholds
const getAlarmLevel = (countdown: { hours: number }, thresholds: { warning: number; critical: number }): AlarmLevel => {
    if (countdown.hours <= 0) return 3 // overdue
    if (countdown.hours < thresholds.critical) return 2 // critical/red
    if (countdown.hours < thresholds.warning) return 1 // warning/yellow
    return 0 // success/green
}

// No deadline - always neutral
const noDeadline = (): StepConfig['getDeadline'] => () => ({ description: '', alarm: -1 })

// User action deadline: g/y/r/💀 (overdue when countdown.hours <= 0)
const userActionDeadline = (prefix: string): StepConfig['getDeadline'] =>
    (countdown, thresholds) => {
        if (countdown.hours <= 0) return { description: 'mangler', alarm: 3 }
        const alarm = getAlarmLevel(countdown, thresholds)
        return { description: prefix ? `${prefix} ${countdown.formatted.toLowerCase()}` : '', alarm }
    }

// System deadline: g/y/r/neutral (overdue shows neutral, not skull)
const systemDeadline = (prefix: string): StepConfig['getDeadline'] =>
    (countdown, thresholds) => {
        const alarm = getAlarmLevel(countdown, thresholds)
        if (alarm === 3) return { description: '', alarm: -1 }
        return { description: `${prefix} ${countdown.formatted.toLowerCase()}`, alarm }
    }

// Countdown only: green before, neutral after (no warning/critical)
const countdownOnly = (prefix: string): StepConfig['getDeadline'] =>
    (countdown) => {
        if (countdown.hours <= 0) return { description: '', alarm: -1 }
        return { description: `${prefix} ${countdown.formatted.toLowerCase()}`, alarm: 0 }
    }

export const DINNER_STEP_MAP: Record<DinnerStepState, StepConfig> = {
    [DinnerStepState.SCHEDULED]: {
        step: 0,
        title: 'Planlagt',
        text: DEADLINE_LABELS.SCHEDULED.closedText,
        getDeadline: noDeadline()
    },
    [DinnerStepState.ANNOUNCED]: {
        step: 1,
        title: 'Publiceret',
        text: DEADLINE_LABELS.ANNOUNCED.closedText,
        getDeadline: userActionDeadline(DEADLINE_LABELS.ANNOUNCED.deadlinePrefix)
    },
    [DinnerStepState.BOOKING_CLOSED]: {
        step: 2,
        title: 'Framelding',
        text: DEADLINE_LABELS.BOOKING_CLOSED.closedText,
        getDeadline: systemDeadline(DEADLINE_LABELS.BOOKING_CLOSED.deadlinePrefix)
    },
    [DinnerStepState.GROCERIES_DONE]: {
        step: 3,
        title: 'Madbestilling klar',
        text: DEADLINE_LABELS.GROCERIES_DONE.closedText,
        getDeadline: userActionDeadline(DEADLINE_LABELS.GROCERIES_DONE.deadlinePrefix)
    },
    [DinnerStepState.CONSUMED]: {
        step: 4,
        title: 'Afholdt',
        text: DEADLINE_LABELS.CONSUMED.closedText,
        getDeadline: countdownOnly(DEADLINE_LABELS.CONSUMED.deadlinePrefix)
    }
}

/**
 * Business logic for Bookings domain (DinnerEvent + Order)
 *
 * ADR-001: Separated from useBookingValidation (schemas only)
 * ADR-013: Heynabo event synchronization
 */
export const useBooking = () => {
    // Import configured utilities from useSeason (DRY)
    const {getDefaultDinnerStartTime, getDefaultDinnerDuration, getDinnerTimeRange, splitDinnerEvents} = useSeason()
    const {DinnerStateSchema, OrderSnapshotSchema} = useBookingValidation()
    const {formatNameWithInitials, computeConsensus} = useHousehold()
    const {resolveTicketPrice} = useTicket()
    const DinnerState = DinnerStateSchema.enum

    // ============================================================================
    // Order Snapshot - Transform function for audit data
    // ============================================================================

    /**
     * Build OrderSnapshot from OrderDetail + household shortName.
     * Used by repository to create audit data with provenance fields.
     *
     * @param order - Order with inhabitant (name, lastName, householdId, optional allergies)
     * @param householdShortname - Household shortName (fetched separately, not on OrderDetail)
     */
    type OrderForSnapshot = Pick<OrderDetail, 'id' | 'inhabitantId' | 'dinnerEventId' | 'ticketPriceId' | 'priceAtBooking' | 'dinnerMode' | 'state'> & {
        inhabitant: Pick<OrderDetail['inhabitant'], 'name' | 'lastName' | 'householdId'> & {
            allergies?: OrderDetail['inhabitant']['allergies']  // Optional - captured at CREATE, omitted at UPDATE/DELETE
        }
    }
    const buildOrderSnapshot = (
        order: OrderForSnapshot,
        householdShortname: string
    ): OrderSnapshot => OrderSnapshotSchema.parse({
        // From OrderDisplaySchema
        id: order.id,
        inhabitantId: order.inhabitantId,
        dinnerEventId: order.dinnerEventId,
        ticketPriceId: order.ticketPriceId,
        priceAtBooking: order.priceAtBooking,
        dinnerMode: order.dinnerMode,
        state: order.state,
        // Provenance (derived from relations)
        inhabitantNameWithInitials: formatNameWithInitials(order.inhabitant),
        householdShortname,
        householdId: order.inhabitant.householdId,
        allergies: order.inhabitant.allergies?.map(a => a.allergyType.name) ?? []
    })

    /**
     * Calculate the current step state for a dinner event
     *
     * @param dinnerEvent - Dinner event with state, date, and totalCost
     * @param deadlines - Season-specific deadline functions from deadlinesForSeason()
     *
     * Logic:
     * - CONSUMED: DB state is CONSUMED
     * - GROCERIES_DONE: Announced + booking closed + totalCost > 0
     * - BOOKING_CLOSED: Announced + booking closed
     * - ANNOUNCED: DB state is ANNOUNCED
     * - SCHEDULED: Default
     */
    const getDinnerStepState = (
        dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'date' | 'totalCost'>,
        deadlines: { canModifyOrders: (date: Date) => boolean }
    ): DinnerStepState => {
        const isAnnounced = dinnerEvent.state === DinnerState.ANNOUNCED
        const isConsumed = dinnerEvent.state === DinnerState.CONSUMED
        const bookingClosed = !deadlines.canModifyOrders(dinnerEvent.date)
        const groceriesDone = dinnerEvent.totalCost > 0

        if (isConsumed) return DinnerStepState.CONSUMED
        if (groceriesDone && bookingClosed && isAnnounced) return DinnerStepState.GROCERIES_DONE
        if (bookingClosed && isAnnounced) return DinnerStepState.BOOKING_CLOSED
        if (isAnnounced) return DinnerStepState.ANNOUNCED
        return DinnerStepState.SCHEDULED
    }

    /**
     * Get step config for a dinner event (includes step number, title, icon, text)
     * Use .step for the step number, DINNER_STEP_MAP for all steps
     */
    const getStepConfig = (
        dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'date' | 'totalCost'>,
        deadlines: { canModifyOrders: (date: Date) => boolean }
    ): StepConfig => {
        return DINNER_STEP_MAP[getDinnerStepState(dinnerEvent, deadlines)]
    }

    /**
     * Get deadline info for a dinner event's current step
     */
    const getStepDeadline = (
        dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'date' | 'totalCost'>,
        deadlines: { canModifyOrders: (date: Date) => boolean }
    ): StepDeadlineResult => {
        const {getDinnerTimeRange, getDefaultDinnerStartTime, getCookingDeadlineThresholds} = useSeason()
        const config = getStepConfig(dinnerEvent, deadlines)
        const thresholds = getCookingDeadlineThresholds()

        const dinnerTimeRange = getDinnerTimeRange(dinnerEvent.date, getDefaultDinnerStartTime(), 0)
        const countdown = calculateCountdown(dinnerTimeRange.start)

        return config.getDeadline(countdown, thresholds)
    }

    /**
     * Check if a dinner can be announced/re-announced
     *
     * Business rules:
     * - SCHEDULED → can announce (creates Heynabo event)
     * - ANNOUNCED + no heynaboEventId → can RE-announce (creates missing Heynabo event)
     * - CANCELLED/CONSUMED → cannot announce
     */
    const canAnnounceDinner = (dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'heynaboEventId'>): boolean => {
        if (dinnerEvent.state === DinnerState.SCHEDULED) return true
        if (dinnerEvent.state === DinnerState.ANNOUNCED && !dinnerEvent.heynaboEventId) return true
        return false
    }

    /**
     * Check if a dinner can be cancelled
     *
     * Business rules:
     * - Can cancel SCHEDULED dinners (not announced yet)
     * - Can cancel ANNOUNCED dinners (will trigger refund for booked orders)
     * - Cannot cancel CONSUMED dinners (already happened)
     * - Cannot cancel already CANCELLED dinners
     */
    const canCancelDinner = (dinnerEvent: Pick<DinnerEventDisplay, 'state'>): boolean => {
        return dinnerEvent.state !== DinnerState.CANCELLED && dinnerEvent.state !== DinnerState.CONSUMED
    }

    /**
     * Get max alarm level for chef tasks (menu + groceries) - for calendar chips.
     * Each badge uses countdown to its specific deadline.
     *
     * @returns AlarmLevel: -1 (all done), 0 (on track), 1 (warning), 2 (critical), 3 (overdue)
     */
    const getChefDeadlineAlarm = (
        dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'date' | 'totalCost' | 'heynaboEventId'>,
        deadlines: Pick<SeasonDeadlines, 'getMenuDeadlineTime' | 'getDinnerStartTime'>
    ): AlarmLevel => {
        const {getCookingDeadlineThresholds} = useSeason()
        const thresholds = getCookingDeadlineThresholds()

        const menuCountdown = calculateCountdown(deadlines.getMenuDeadlineTime(dinnerEvent.date))
        const dinnerCountdown = calculateCountdown(deadlines.getDinnerStartTime(dinnerEvent.date))

        const alarms: AlarmLevel[] = []

        // Menu badge - overdue when menuCountdown.hours <= 0
        const menuDone = dinnerEvent.state === DinnerState.ANNOUNCED ||
                        (dinnerEvent.state === DinnerState.CONSUMED && dinnerEvent.heynaboEventId !== null)
        if (!menuDone) {
            alarms.push(DINNER_STEP_MAP[DinnerStepState.ANNOUNCED].getDeadline(menuCountdown, thresholds).alarm)
        }

        // Groceries badge - overdue when dinnerCountdown.hours <= 0
        const groceriesDone = dinnerEvent.totalCost > 0
        if (!groceriesDone) {
            alarms.push(DINNER_STEP_MAP[DinnerStepState.GROCERIES_DONE].getDeadline(dinnerCountdown, thresholds).alarm)
        }

        return alarms.length === 0 ? -1 : Math.max(...alarms) as AlarmLevel
    }

    /**
     * Event description template for Heynabo sync (HTML formatted)
     * Format: Title, description, chef, booking link, signature, then robot warning at bottom
     */
    const HEYNABO_EVENT_TEMPLATE = {
        CHEF_PREFIX: '👨‍🍳 Dagens chefkok:',
        BOOKING_TEXT: 'Du kan tilmelde/framelde dig middagen, ændre status til takeaway eller sen spisning, købe eller sælge billetter i Skrånerappen.',
        BOOKING_LINK_PREFIX: 'Klik her:',
        SIGNATURE_PREFIX: 'Kh',
        SEPARATOR: '🍳🥘🍳🥘🍳🥘🍳🥘🍳',
        WARNING_ROBOT: '🤖 Denne begivenhed synkroniseres automatisk fra skraaningen.dk',
        WARNING_EDIT: '⚠️ Ret ikke i Heynabo - ændringer overskrives!'
    }

    /**
     * Build dinner URL for Heynabo event description
     * Format: /dinner?date=dd/mm/yy
     */
    const buildDinnerUrl = (baseUrl: string, dinnerDate: Date): string => {
        const day = String(dinnerDate.getDate()).padStart(2, '0')
        const month = String(dinnerDate.getMonth() + 1).padStart(2, '0')
        const year = String(dinnerDate.getFullYear()).slice(-2)
        return `${baseUrl}/dinner?date=${day}/${month}/${year}`
    }

    /**
     * Transform a DinnerEvent to Heynabo event payload (ADR-013)
     *
     * @param dinnerEvent - The dinner event to transform (DinnerEventDetail with cookingTeam)
     * @param baseUrl - Base URL for building dinner link (e.g., 'https://skraaningen.dk')
     * @returns Heynabo event create payload
     */
    const createHeynaboEventPayload = (
        dinnerEvent: DinnerEventDetail,
        baseUrl: string
    ): HeynaboEventCreate => {
        const dinnerUrl = buildDinnerUrl(baseUrl, dinnerEvent.date)

        // Build description with HTML formatting
        // Format: Title, description, chef (if assigned), booking link, signature, robot warning at bottom
        const lines = [
            `<b>${dinnerEvent.menuTitle}</b>`,
            ''
        ]

        // Add menu description if present
        if (dinnerEvent.menuDescription) {
            lines.push(dinnerEvent.menuDescription, '')
        }

        // Add chef line only if chef is assigned
        if (dinnerEvent.chef) {
            lines.push(`${HEYNABO_EVENT_TEMPLATE.CHEF_PREFIX} ${formatNameWithInitials(dinnerEvent.chef)}`, '')
        }

        // Booking link and signature
        lines.push(
            HEYNABO_EVENT_TEMPLATE.BOOKING_TEXT,
            `${HEYNABO_EVENT_TEMPLATE.BOOKING_LINK_PREFIX} <a href="${dinnerUrl}">${dinnerUrl}</a>`,
            '',
            `${HEYNABO_EVENT_TEMPLATE.SIGNATURE_PREFIX} ${dinnerEvent.cookingTeam?.name || 'Madholdet'}`,
            '',
            HEYNABO_EVENT_TEMPLATE.SEPARATOR,
            HEYNABO_EVENT_TEMPLATE.WARNING_ROBOT,
            HEYNABO_EVENT_TEMPLATE.WARNING_EDIT
        )

        const description = lines.join('<br>')

        const dinnerTimeRange = getDinnerTimeRange(dinnerEvent.date, getDefaultDinnerStartTime(), getDefaultDinnerDuration())

        return {
            name: `Fællesspisning - ${dinnerEvent.menuTitle}`,
            type: null,
            description,
            start: dinnerTimeRange.start.toISOString(),
            end: dinnerTimeRange.end.toISOString(),
            status: 'PUBLISHED',
            groupId: null,
            price: {adult: 0, child: 0, taxIncluded: true},
            public: false,
            locationText: 'Fælleshuset',
            locationId: null,
            minParticipants: null,
            maxParticipants: null,
            guestsAllowed: true,
            takeAwayAllowed: true,
            vegetarian: false,
            commentsAllowed: true,
            visibleToEveryone: true
        }
    }

    // ============================================================================
    // Daily Maintenance - Batch Configuration
    // ============================================================================

    // D1 constraint: updateMany uses ~2 params per ID + filter params
    // Conservative: 40 IDs per batch for bulk state updates
    const DINNER_BATCH_SIZE = 40

    // Curried chunk function for dinner event IDs (used for bulk state updates)
    const chunkDinnerIds = chunkArray<number>(DINNER_BATCH_SIZE)

    // Transaction insert: 5 params (orderId, orderSnapshot, userSnapshot, amount, userEmailHandle)
    // D1 max params: 100 / 5 = 20 transactions per batch
    const TRANSACTION_BATCH_SIZE = 20

    // Curried chunk function for transaction create data (used for bulk inserts)
    const chunkTransactions = chunkArray<TransactionCreateData>(TRANSACTION_BATCH_SIZE)

    // ============================================================================
    // Daily Maintenance - Pure Functions
    // ============================================================================

    /**
     * Extract IDs of past dinners from a list of pending dinners.
     * Uses splitDinnerEvents to determine "past" based on dinner time.
     */
    const getPastDinnerIds = (pendingDinners: {id: number, date: Date}[]): number[] => {
        if (pendingDinners.length === 0) return []
        const {pastDinners} = splitDinnerEvents(pendingDinners)
        return pastDinners.map(d => d.id)
    }

    /**
     * Prepare transaction data from closed orders.
     * ADR-010: Preserves isGuestTicket and the eating mode in snapshot for billing display
     */
    const prepareTransactionData = (closedOrders: OrderForTransaction[]): TransactionCreateData[] => {
        const {serializeTransaction} = useBillingValidation()

        return closedOrders.map(order => ({
            orderId: order.id,
            orderSnapshot: serializeTransaction({
                dinnerEvent: order.dinnerEvent,
                inhabitant: order.inhabitant,
                ticketType: order.ticketType,
                isGuestTicket: order.isGuestTicket,
                dinnerMode: order.dinnerMode
            }),
            userSnapshot: JSON.stringify(order.bookedByUser || {id: null, email: ''}),
            amount: order.priceAtBooking,
            userEmailHandle: order.bookedByUser?.email || ''
        }))
    }

    // ============================================================================
    // Guest Booking - Build guest order for scaffold
    // ============================================================================

    /**
     * Build a DesiredOrder for a guest ticket
     */
    const buildGuestOrder = (
        bookerId: number,
        dinnerEventId: number,
        ticketPriceId: number,
        dinnerMode?: DinnerMode,
        allergyTypeIds?: number[]
    ): DesiredOrder => {
        const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
        return {
            inhabitantId: bookerId,
            dinnerEventId,
            dinnerMode: dinnerMode ?? DinnerModeSchema.enum.DINEIN,
            ticketPriceId,
            isGuestTicket: true,
            allergyTypeIds,
            state: OrderStateSchema.enum.BOOKED
        }
    }

    /**
     * Group the guest tickets among the orders by (booker, ticketType, dinnerEventId, allergies, provenance)
     * Returns a map from group key to array of orders
     *
     * Guests with different allergies or claimed tickets (provenanceHousehold) are separate rows.
     */
    const groupGuestOrders = <T extends {
        inhabitantId: number | null
        ticketType?: string | null
        dinnerEventId: number
        isGuestTicket: boolean
        provenanceHousehold?: string | null
        provenanceAllergies?: string[] | null
    }>(
        orders: T[]
    ): Record<string, T[]> => Object.fromEntries(groupBy<T, string>(order => {
        const allergiesKey = order.provenanceAllergies?.slice().sort().join(',') ?? ''
        const provenanceKey = order.provenanceHousehold ?? ''
        return `${order.inhabitantId}-${order.ticketType ?? 'unknown'}-${order.dinnerEventId}-${allergiesKey}-${provenanceKey}`
    })(orders.filter(order => order.isGuestTicket)))


    /**
     * Get booking options: enabled dinner modes and which action to take.
     * UI counterpart to decideOrderAction - determines available paths of action.
     *
     * Decision matrix:
     * | order      | canModify | canEditMode | enabledModes        | action    |
     * |------------|-----------|-------------|---------------------|-----------|
     * | BOOKED     | -         | true        | [ALL]               | 'process' |
     * | BOOKED     | -         | false       | [NONE]              | 'process' |
     * | released   | -         | true        | [ALL]               | 'process' |
     * | released   | -         | false       | [DINEIN, NONE]      | 'process' |
     * | null       | true      | -           | [ALL]               | 'process' |
     * | null       | false     | true        | [EATING]            | 'claim'   |
     * | null       | false     | false       | [DINEIN]            | 'claim'   |
     * | CANCELLED/CONSUMED dinner            | []                  | null      |
     *
     * A claim after the deadline buys a released ticket, or takes a place in the queue when none is for sale (the
     * server decides by supply); it shows [DINEIN] when the dining mode is locked, every eating mode while it is open.
     *
     * For "add new" (guest) context: caller filters out NONE from enabledModes.
     *
     * @param order - The current order (null if no order exists)
     * @param canModifyOrders - Before booking deadline
     * @param canEditDiningMode - Before dining mode deadline
     * @param dinnerState - Dinner event state (CANCELLED/CONSUMED blocks booking)
     * @param isHouseholdInResidency - Whether household is active on the dinner date
     */
    const getBookingOptions = (
        order: Pick<OrderDisplay, 'state' | 'dinnerMode'> | null,
        canModifyOrders: boolean,
        canEditDiningMode: boolean,
        dinnerState: DinnerState,
        isHouseholdInResidency: boolean
    ): { enabledModes: DinnerMode[], action: BookingRowAction | null } => {
        const {DinnerModeSchema, DinnerStateSchema, OrderStateSchema} = useBookingValidation()
        const DinnerModeEnum = DinnerModeSchema.enum
        const DinnerStateEnum = DinnerStateSchema.enum
        const OrderStateEnum = OrderStateSchema.enum

        const ALL_MODES: DinnerMode[] = [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY, DinnerModeEnum.NONE]

        // Outside residency period - no booking possible
        if (!isHouseholdInResidency) return { enabledModes: [], action: null }

        // Cancelled/consumed dinner - no booking possible
        if (dinnerState === DinnerStateEnum.CANCELLED || dinnerState === DinnerStateEnum.CONSUMED) {
            return { enabledModes: [], action: null }
        }

        // BOOKED order
        if (order?.state === OrderStateEnum.BOOKED) {
            return canEditDiningMode
                ? { enabledModes: ALL_MODES, action: ROW_ACTION.process }
                : { enabledModes: [DinnerModeEnum.NONE], action: ROW_ACTION.process }
        }

        // Released order (can reclaim own)
        if (order && ticketStateOf(order) === TicketStateEnum.released) {
            return canEditDiningMode
                ? { enabledModes: ALL_MODES, action: ROW_ACTION.process }
                : { enabledModes: [DinnerModeEnum.DINEIN, DinnerModeEnum.NONE], action: ROW_ACTION.process }
        }

        // No order - use shared decision logic; after the deadline the claim buys a ticket or queues
        const action = getNewOrderAction(canModifyOrders)
        if (action === ROW_ACTION.process) return { enabledModes: ALL_MODES, action }
        // A claim picks an eating mode, never NONE (can't claim and immediately release), and respects canEditDiningMode
        const EATING_MODES: DinnerMode[] = [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY]
        return canEditDiningMode
            ? { enabledModes: EATING_MODES, action }
            : { enabledModes: [DinnerModeEnum.DINEIN], action }
    }

    // ============================================================================
    // Day Bill Summary - Shared display format for booking views
    // ============================================================================

    /**
     * Calculate day bill summary for display
     * Filters to active orders only (BOOKED/RELEASED, not NONE mode)
     *
     * @param orders - Orders for the dinner event
     * @returns Object with ticketCounts and totalPrice (always returns object)
     */
    const getDayBillSummary = (orders: OrderDisplay[]): { ticketCounts: string; totalPrice: number } => {
        const {formatTicketCounts} = useBilling()

        const activeOrders = orders.filter(isPendingOrder)
        return {
            ticketCounts: formatTicketCounts(activeOrders),
            totalPrice: sumBy(activeOrders, o => o.priceAtBooking)
        }
    }

    // ============================================================================
    // Booking Toast Titles - Consistent UX across pages
    // ============================================================================

    const BOOKING_TOAST_TITLES = {
        day: 'Booking opdateret',
        guest: 'Du får gæster til middag',
        booking: 'Booking processeret',
        grid: 'Bookinger processeret',
        powerMode: 'Bookinger opdateret for hele husstanden'
    } as const

    // ============================================================================
    // Scaffold Result Formatting - the log line; the toast words live in useBookingUi
    // ============================================================================

    // The symbol of each total in a log line, in the enum's order
    const LOG_SYMBOLS: Record<BookingAction, string> = {
        [Action.BOOK]: '+',
        [Action.CANCEL]: '-',
        [Action.RELEASE]: '↑',
        [Action.RECLAIM]: '↓',
        [Action.BUY]: '⇅',
        [Action.QUEUE]: 'w',
        [Action.LEAVE]: 'l',
        [Action.REQUEUE]: 'r',
        [Action.CHANGE_PRICE]: '$',
        [Action.CHANGE_MODE]: 'm'
    }

    /** A scaffold result as a log line, the non-zero counts only: "+7 =179" */
    const formatScaffoldResult = (result: ScaffoldResult): string => {
        const parts = [
            ...BookingActionSchema.options.map(action => ({symbol: LOG_SYMBOLS[action], count: result.totals[action]})),
            {symbol: '=', count: result.unchanged},
            {symbol: '!', count: result.errored}
        ]
            .filter(({count}) => count > 0)
            .map(({symbol, count}) => `${symbol}${count}`)
        return parts.length > 0 ? parts.join(' ') : '(ingen)'
    }

    // Sums the results of several scaffold runs; the season is the last run's
    const sumScaffoldResults = (results: readonly ScaffoldResult[]): ScaffoldResult => ({
        seasonId: results.at(-1)?.seasonId ?? null,
        totals: Object.fromEntries(BookingActionSchema.options.map(action => [action, sumBy(results, result => result.totals[action])])) as BookingTotals,
        positions: results.flatMap(result => result.positions),
        unchanged: sumBy(results, result => result.unchanged),
        households: sumBy(results, result => result.households),
        errored: sumBy(results, result => result.errored),
        results: results.flatMap(result => result.results),
        failed: results.flatMap(result => result.failed),
        outcomes: {
            joined: results.flatMap(result => result.outcomes.joined),
            ticketsSold: results.flatMap(result => result.outcomes.ticketsSold),
            waitlistTicketsSold: results.flatMap(result => result.outcomes.waitlistTicketsSold),
            waitlistPortionsAssigned: results.flatMap(result => result.outcomes.waitlistPortionsAssigned)
        }
    })

    // ============================================================================
    // Bucket Resolution - Wrapper for UI components (mirrors server usage)
    // ============================================================================

    /**
     * Resolve desired orders to buckets for UI preview.
     * Wraps the pure resolveDesiredOrdersToBuckets with enum wiring.
     * Use this to show users exactly what the server will do.
     */
    const resolveUserBookingBuckets = (
        desiredOrders: DesiredOrder[],
        existingOrders: OrderDisplay[],
        dinnerEvents: DinnerEventDisplay[],
        deadlines: SeasonDeadlines,
        existingEntries: TicketWaitlistDisplay[] = []
    ): OrderBucketResult<DesiredOrder> => {
        const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
        const dinnerEventById = new Map(dinnerEvents.map(de => [de.id, de]))
        return resolveDesiredOrdersToBuckets(
            desiredOrders,
            existingOrders,
            dinnerEventById,
            deadlines.canModifyOrders,
            deadlines.canEditDiningMode,
            DinnerModeSchema.enum,
            OrderStateSchema.enum,
            existingEntries
        )
    }

    /** buildDesiredOrder over a list of intents, priced from the season's ticket prices; unpriced intents drop out */
    const buildDesiredOrders = (
        intents: BookingIntent[],
        existingOrders: OrderDisplay[],
        inhabitants: Pick<InhabitantDisplay, 'id' | 'birthDate'>[],
        dinnerEvents: Pick<DinnerEventDisplay, 'id' | 'date'>[],
        ticketPrices: TicketPrice[]
    ): DesiredOrder[] => {
        const {OrderStateSchema} = useBookingValidation()
        const resolveSeasonTicketPrice: TicketPriceResolver = (birthDate, priceAtBooking, referenceDate) =>
            resolveTicketPrice(birthDate, priceAtBooking, ticketPrices, referenceDate)
        return intents.flatMap(intent =>
            buildDesiredOrder(intent, existingOrders, inhabitants, dinnerEvents, resolveSeasonTicketPrice, OrderStateSchema.enum.BOOKED) ?? []
        )
    }

    /** buildGuestDesiredOrder over a list of guest intents, priced from the season's ticket prices */
    const buildGuestDesiredOrders = (
        guestIntents: GuestBookingIntent[],
        ticketPrices: TicketPrice[]
    ): DesiredOrder[] => {
        const {OrderStateSchema} = useBookingValidation()
        const resolveSeasonTicketPrice: TicketPriceResolver = (birthDate, priceAtBooking, referenceDate) =>
            resolveTicketPrice(birthDate, priceAtBooking, ticketPrices, referenceDate)
        return guestIntents.flatMap(intent => buildGuestDesiredOrder(intent, resolveSeasonTicketPrice, OrderStateSchema.enum.BOOKED))
    }

    /** Every grid edit as one DesiredOrder[]: inhabitant intents and guest intents together */
    const buildBookingChanges = (
        changes: BookingChanges,
        existingOrders: OrderDisplay[],
        inhabitants: Pick<InhabitantDisplay, 'id' | 'birthDate'>[],
        dinnerEvents: Pick<DinnerEventDisplay, 'id' | 'date'>[],
        ticketPrices: TicketPrice[]
    ): DesiredOrder[] => [
        ...buildDesiredOrders(changes.intents, existingOrders, inhabitants, dinnerEvents, ticketPrices),
        ...buildGuestDesiredOrders(changes.guestIntents, ticketPrices)
    ]

    /** Who a power change on one dinner reaches: the given inhabitants and every guest group booked on that dinner */
    const getPowerTargets = (
        inhabitantIds: number[],
        orders: OrderDisplay[],
        dinnerEventId: number
    ): {inhabitantIds: number[], guestGroups: OrderDisplay[][]} => ({
        inhabitantIds,
        guestGroups: Object.values(groupGuestOrders(orders.filter(o => o.dinnerEventId === dinnerEventId)))
    })

    /** A power change on one dinner as BookingChanges: one intent per inhabitant, one guest intent per guest group */
    const getPowerChanges = (
        inhabitantIds: number[],
        orders: OrderDisplay[],
        dinnerEventId: number,
        dinnerMode: DinnerMode
    ): BookingChanges => {
        const targets = getPowerTargets(inhabitantIds, orders, dinnerEventId)
        return {
            intents: targets.inhabitantIds.map(inhabitantId => ({inhabitantId, dinnerEventId, dinnerMode})),
            guestIntents: targets.guestGroups.map(guestOrders => ({guestOrders, dinnerMode}))
        }
    }

    /**
     * Power-row consensus on one dinner over every power target: inhabitants' regular orders and guest groups.
     * A draft mode, when given, overrides the saved mode of its inhabitant or guest group.
     */
    const getPowerConsensus = (
        inhabitantIds: number[],
        orders: OrderDisplay[],
        dinnerEventId: number,
        draftMode: {
            inhabitant?: (inhabitantId: number) => DinnerMode | undefined
            guestGroup?: (guestOrders: OrderDisplay[]) => DinnerMode | undefined
        } = {}
    ): {value: DinnerMode, consensus: boolean} => {
        const {DinnerModeSchema} = useBookingValidation()
        const targets = getPowerTargets(inhabitantIds, orders, dinnerEventId)
        const modes = [
            ...targets.inhabitantIds.map(inhabitantId => draftMode.inhabitant?.(inhabitantId)
                ?? findRegularOrder(orders, inhabitantId, dinnerEventId)?.dinnerMode
                ?? DinnerModeSchema.enum.NONE),
            ...targets.guestGroups.map(guestOrders => draftMode.guestGroup?.(guestOrders) ?? guestOrders[0]!.dinnerMode)
        ]
        return computeConsensus(modes, DinnerModeSchema.enum.DINEIN)
    }

    // ============================================================================
    // Action Preview - bucket change detection (formatting lives in useBookingUi)
    // ============================================================================

    const countChanges = (buckets: OrderBucketResult<DesiredOrder>): number =>
        buckets.create.length + buckets.delete.length + buckets.update.length + buckets.claim.length + buckets.leave.length + buckets.requeue.length

    const hasChanges = (buckets: OrderBucketResult<DesiredOrder>): boolean => countChanges(buckets) > 0

    // ============================================================================
    // Lock Status - Compute booking lock status for calendar display
    // ============================================================================

    /** Count released orders by dinner ID */
    const countReleasedOrdersByDinner = (orders: OrderDisplay[]): Map<number, number> => {
        const counts = new Map<number, number>()
        for (const order of orders) {
            if (ticketStateOf(order) === TicketStateEnum.released) {
                counts.set(order.dinnerEventId, (counts.get(order.dinnerEventId) ?? 0) + 1)
            }
        }
        return counts
    }

    /**
     * Get IDs of locked future dinners from split result
     * Takes [nextDinner, ...futureDinners], reduces until first non-locked
     */
    const getLockedFutureDinnerIds = <T extends { id: number; date: Date }>(
        nextDinner: T | null,
        futureDinners: T[],
        deadlines: { canModifyOrders: (date: Date) => boolean }
    ): number[] => [nextDinner, ...futureDinners]
        .filter((e): e is T => e !== null)
        .reduce<{ ids: number[]; done: boolean }>(
            (acc, event) => {
                if (acc.done) return acc
                if (deadlines.canModifyOrders(event.date)) return { ...acc, done: true }
                return { ids: [...acc.ids, event.id], done: false }
            },
            { ids: [], done: false }
        ).ids

    /**
     * Compute lock status map for dinner events
     *
     * @param dinnerEvents - Dinner events to check
     * @param deadlines - Season deadlines from deadlinesForSeason()
     * @param releasedCountsByDinnerId - Map of dinner ID → released ticket counts with breakdown
     * @param waitlistByDinnerId - Map of dinner ID → its waiting list: size and breakdown by ticket type
     * @returns Map of dinner ID → the dinner's supply (absent = not locked, EMPTY_RELEASED_TICKET_COUNTS = locked,
     * nothing for sale and nobody waiting)
     */
    const computeLockStatus = (
        dinnerEvents: Array<{ id: number; date: Date }>,
        deadlines: { canModifyOrders: (date: Date) => boolean },
        releasedCountsByDinnerId?: Map<number, Omit<ReleasedTicketCounts, keyof WaitlistCounts>>,
        waitlistByDinnerId?: Map<number, WaitlistCounts>
    ): Map<number, ReleasedTicketCounts | null> => {
        const result = new Map<number, ReleasedTicketCounts | null>()
        for (const dinner of dinnerEvents) {
            const isLocked = !deadlines.canModifyOrders(dinner.date)
            if (isLocked) {
                result.set(dinner.id, {
                    ...EMPTY_RELEASED_TICKET_COUNTS,
                    ...releasedCountsByDinnerId?.get(dinner.id),
                    ...waitlistByDinnerId?.get(dinner.id)
                })
            }
        }

        return result
    }

    // ============================================================================
    // Ticket changes (Billetændringer) and the cooking round
    // ============================================================================

    const {TicketTypeSchema, TicketChangeKindSchema} = useBookingValidation()
    const countsBy = (count: (type: TicketType) => number): TicketCounts =>
        Object.fromEntries(TicketTypeSchema.options.map(type => [type, count(type)])) as TicketCounts
    const emptyCounts = (): TicketCounts => countsBy(() => 0)
    const countsPlus = (a: TicketCounts, b: TicketCounts): TicketCounts => countsBy(type => a[type] + b[type])

    // A ticket the dinner is paid for after a history row: its price row, its holder's household, whether its holder eats
    // or has released it, and whether the close has settled it
    type HeldTicket = Readonly<{key: number, inhabitantId: number | null, ticketPriceId: number | null, type: TicketType | null, price: number, portions: number, eating: boolean, closed: boolean, householdId: number | null, householdShortname: string | null}>
    type HeldTickets = ReadonlyMap<number, HeldTicket>

    const sumOver = (held: HeldTickets, weigh: (ticket: HeldTicket) => number): number => sumBy([...held.values()], weigh)
    const countsOf = (tickets: Iterable<HeldTicket>): TicketCounts =>
        [...tickets].reduce((counts, ticket) => ticket.type ? {...counts, [ticket.type]: counts[ticket.type] + 1} : counts, emptyCounts())
    // A released ticket stays paid until someone buys it: it keeps its place in the counts, the kuverter and the revenue
    const portionsOf = (held: HeldTickets): number => sumOver(held, ticket => ticket.portions)
    const revenueOf = (held: HeldTickets): number => sumOver(held, ticket => ticket.price)

    const withTicket = (held: HeldTickets, ticket: HeldTicket): HeldTickets => new Map(held).set(ticket.key, ticket)
    const withoutTicket = (held: HeldTickets, key: number): HeldTickets => new Map([...held].filter(([heldKey]) => heldKey !== key))
    // A booking row whose order is gone keys by its own negative row id and is found by inhabitant
    const findHeld = (held: HeldTickets, orderId: number | null, inhabitantId: number | null): HeldTicket | undefined =>
        (orderId !== null ? held.get(orderId) : undefined)
        ?? [...held.values()].find(ticket => ticket.key < 0 && ticket.inhabitantId === inhabitantId)

    const byTime = byTimeThenId<{id: number, timestamp: Date}>(row => row.timestamp.getTime())

    /**
     * Replays a dinner's order history in time order into the lines of Billetændringer. Each row moves one held ticket,
     * and its ticket events follow from that ticket before and after the row: booked, the chef's extra portions,
     * cancelled, cancelled by the admin after the booking deadline, released, bought, taken back, changed to another
     * price row, or closed; a row that moves nothing, such as an eating mode switch, makes no event. A line gathers the
     * events of one actor within one rendered minute, the system user acting for a row without an actor, with the
     * tickets, kuverter and revenue after it. A ticket price the season no longer names counts in the revenue without a
     * type or kuverter. A sale passes the ticket to the buyer, whose household its line and the ticket's later lines name.
     */
    const replayTicketChanges = (
        history: OrderHistoryDisplay[],
        ticketPriceOf: (ticketPriceId: number) => Pick<TicketPrice, 'ticketType' | 'portions'> | null,
        systemUserId: number,
        householdShortnameOf: (householdId: number) => string | null = () => null,
        householdOfInhabitant: (inhabitantId: number) => Pick<HouseholdDisplay, 'id' | 'shortName'> | null = () => null,
        bookingDeadline?: Date
    ): TicketChange[] => {
        const {readAuditTicket, OrderAuditActionSchema, OrderAuditSourceSchema, OrderStateSchema} = useBookingValidation()
        const Audit = OrderAuditActionSchema.enum
        const Source = OrderAuditSourceSchema.enum
        const State = OrderStateSchema.enum
        const Kind = TicketChangeKindSchema.enum

        // A sale's row names the buyer's inhabitant and holds the seller's snapshot: the ticket it moves is the buyer's
        const ticketOf = (row: OrderHistoryDisplay): AuditTicket | null => {
            const ticket = readAuditTicket(row)
            if (!ticket || row.action !== Audit.USER_CLAIMED) return ticket
            const buyer = row.inhabitantId === null ? null : householdOfInhabitant(row.inhabitantId)
            return {...ticket, inhabitantId: row.inhabitantId, householdId: buyer?.id ?? null, householdShortname: buyer?.shortName ?? null}
        }

        const priced = (ticketPriceId: number | null, price: number) => {
            const ticketPrice = ticketPriceId === null ? null : ticketPriceOf(ticketPriceId)
            return {ticketPriceId, type: ticketPrice?.ticketType ?? null, portions: ticketPrice?.portions ?? 0, price}
        }
        const booked = (rowId: number, ticket: AuditTicket): HeldTicket => ({
            key: ticket.orderId ?? -rowId, inhabitantId: ticket.inhabitantId, ...priced(ticket.ticketPriceId, ticket.priceAtBooking),
            eating: true, closed: false, householdId: ticket.householdId, householdShortname: ticket.householdShortname
        })
        // A batch update's row carries the new state, and a price row with its price only when the price row changed
        const updated = (current: HeldTicket, ticket: AuditTicket): HeldTicket => ({
            ...current,
            ...(ticket.ticketPriceId === null ? {} : priced(ticket.ticketPriceId, ticket.priceAtBooking)),
            eating: ticket.state === State.CLOSED ? current.eating : ticket.state !== State.RELEASED,
            closed: current.closed || ticket.state === State.CLOSED
        })

        // The row releases the ticket: a release keeps it paid, a deletion removes it
        const releasesTicket = (ticket: AuditTicket): boolean => !ticket.deleted && ticket.state === State.RELEASED
        // A cancellation keeps a released ticket held and paid, and takes a deleted one off the dinner
        const afterCancellation = (current: HeldTicket, ticket: AuditTicket): HeldTicket | undefined =>
            releasesTicket(ticket) ? updated(current, ticket) : undefined

        const afterRow = (current: HeldTicket | undefined, row: OrderHistoryDisplay, ticket: AuditTicket): HeldTicket | undefined => {
            switch (row.action) {
                case Audit.USER_BOOKED:
                case Audit.SYSTEM_CREATED:
                    return current ? updated(current, ticket) : booked(row.id, ticket)
                case Audit.SYSTEM_UPDATED:
                    return current && updated(current, ticket)
                case Audit.USER_CANCELLED:
                    return current && afterCancellation(current, ticket)
                // The buyer holds the ticket and eats on it; it stays paid
                case Audit.USER_CLAIMED:
                    return current && {...current, eating: true, inhabitantId: ticket.inhabitantId, householdId: ticket.householdId, householdShortname: ticket.householdShortname}
                case Audit.SYSTEM_DELETED:
                    return undefined
            }
        }

        const isAfterBookingDeadline = (moment: Date): boolean => bookingDeadline !== undefined && isAfter(moment, bookingDeadline)
        // After the booking deadline a user releases instead of deleting, so a user-mode deletion then is the admin's
        // correction; a system run's deletion is SYSTEM_DELETED
        const isAdminDeletion = (row: OrderHistoryDisplay): boolean => row.action === Audit.USER_CANCELLED && isAfterBookingDeadline(row.timestamp)
        // The chef's extra portions are the orders the waiting-list assignment creates for the first in line
        const isExtraPortion = (ticket: AuditTicket): boolean => ticket.source === Source['waitlist-assignment']
        // A sale's row holds the seller's order as it stood before the sale: its household is the seller
        const sellerOf = (row: OrderHistoryDisplay): string | null => readAuditTicket(row)?.householdShortname ?? null
        // The holder eats on the ticket again: a sale names its seller, else the holder takes back its own release
        const eatingAgain = (row: OrderHistoryDisplay, tickets: TicketCounts): TicketEvent =>
            row.action === Audit.USER_CLAIMED ? {change: Kind.BUY, tickets, seller: sellerOf(row)} : {change: Kind.RECLAIM, tickets}

        const eventsOf = (before: HeldTicket | undefined, after: HeldTicket | undefined, row: OrderHistoryDisplay, ticket: AuditTicket): TicketEvent[] => {
            if (!after) return before ? [{change: isAdminDeletion(row) ? Kind.ADMIN_CANCEL : Kind.CANCEL, tickets: countsOf([before])}] : []
            if (!before) return [{change: isExtraPortion(ticket) ? Kind.EXTRA_PORTIONS : Kind.BOOK, tickets: countsOf([after])}]
            const tickets = countsOf([after])
            if (after.closed && !before.closed) return [{change: Kind.CLOSE, tickets}]
            return [
                ...(before.ticketPriceId === after.ticketPriceId ? [] : [{change: Kind.CHANGE_PRICE, tickets, from: countsOf([before])}]),
                ...(before.eating === after.eating ? [] : [after.eating ? eatingAgain(row, tickets) : {change: Kind.RELEASE, tickets}])
            ]
        }

        // A batch update's row carries the new scalars only; the ticket it moves names the household, held as after the row
        const toLine = (row: OrderHistoryDisplay, ticket: AuditTicket, moved: HeldTicket | undefined, events: TicketEvent[], held: HeldTickets): TicketChange => {
            const householdId = ticket.householdId ?? moved?.householdId ?? null
            const household = ticket.householdShortname ?? moved?.householdShortname ?? (householdId === null ? null : householdShortnameOf(householdId))
            const performedByUserId = row.performedByUserId ?? systemUserId
            return {
                id: row.id,
                timestamp: row.timestamp,
                performedByUserId,
                bySystem: performedByUserId === systemUserId,
                households: household === null ? [] : [household],
                events,
                counts: countsOf(held.values()),
                portions: portionsOf(held),
                revenue: revenueOf(held)
            }
        }

        const {lines} = [...history].sort(byTime)
            .map(row => ({row, ticket: ticketOf(row)}))
            .filter((entry): entry is {row: OrderHistoryDisplay, ticket: AuditTicket} => entry.ticket !== null)
            .reduce(({held, lines}, {row, ticket}) => {
                const before = findHeld(held, ticket.orderId, ticket.inhabitantId)
                const after = afterRow(before, row, ticket)
                const next = after ? withTicket(held, after) : before ? withoutTicket(held, before.key) : held
                const events = eventsOf(before, after, row, ticket)
                return {held: next, lines: events.length > 0 ? [...lines, toLine(row, ticket, after ?? before, events, next)] : lines}
            }, {held: new Map() as HeldTickets, lines: [] as TicketChange[]})
        return collapseByKey(lines)
    }

    /** A moment as the chef reads it: the date mask and the hour */
    const formatMoment = (date: Date): string => formatDate(date, `${DATE_SETTINGS.DATE_MASK} HH:mm`)
    // One event per kind and seller with the tickets added up, in the order of the kinds: sales from two households stay two
    const mergeEvents = (events: TicketEvent[]): TicketEvent[] =>
        TicketChangeKindSchema.options.flatMap(change => {
            const bySeller = groupBy((event: TicketEvent) => event.seller ?? '')(events.filter(event => event.change === change))
            return [...bySeller.values()].map(ofSeller => {
                const {seller} = ofSeller[0]!
                const from = ofSeller.flatMap(event => event.from ? [event.from] : [])
                return {
                    change,
                    tickets: ofSeller.map(event => event.tickets).reduce(countsPlus),
                    ...(seller === undefined ? {} : {seller}),
                    ...(from.length === 0 ? {} : {from: from.reduce(countsPlus)})
                }
            })
        })
    // The rows of one actor within one rendered minute make one line: their households and events merge, the last row
    // gives the rest, and the line takes its place by its last row
    const changeKey = (change: TicketChange): string => `${formatMoment(change.timestamp)}|${change.performedByUserId}`
    const collapseByKey = (changes: TicketChange[]): TicketChange[] =>
        [...groupBy(changeKey)(changes).values()]
            .map(group => ({
                ...group.at(-1)!,
                households: [...new Set(group.flatMap(change => change.households))],
                events: mergeEvents(group.flatMap(change => change.events))
            }))
            .sort(byTime)

    // The team's dinners on consecutive calendar days around one dinner; a day without a team dinner ends the run
    const consecutiveDinnerRun = <T extends {id: number, date: Date}>(dinners: T[], aroundId: number): T[] => {
        const sorted = [...dinners].sort((a, b) => a.date.getTime() - b.date.getTime())
        const index = sorted.findIndex(dinner => dinner.id === aroundId)
        if (index < 0) return []
        const adjacent = (earlier: Date, later: Date) => differenceInCalendarDays(later, earlier) <= 1
        let start = index
        while (start > 0 && adjacent(sorted[start - 1]!.date, sorted[start]!.date)) start--
        let end = index
        while (end < sorted.length - 1 && adjacent(sorted[end]!.date, sorted[end + 1]!.date)) end++
        return sorted.slice(start, end + 1)
    }

    return {
        // Order Snapshot
        buildOrderSnapshot,
        // Dinner Step State
        getDinnerStepState,
        getStepConfig,
        getStepDeadline,
        getChefDeadlineAlarm,
        canAnnounceDinner,
        canCancelDinner,
        buildDinnerUrl,
        createHeynaboEventPayload,
        HEYNABO_EVENT_TEMPLATE,
        chunkDinnerIds,
        chunkTransactions,
        getPastDinnerIds,
        prepareTransactionData,
        CONSUMABLE_DINNER_STATES,
        CLOSABLE_ORDER_STATES,
        DEADLINE_LABELS,
        // Guest Booking
        buildGuestOrder,
        groupGuestOrders,
        // Scaffold Result Formatting
        formatScaffoldResult,
        sumScaffoldResults,
        // Lock Status
        countReleasedOrdersByDinner,
        getLockedFutureDinnerIds,
        computeLockStatus,
        // Booking Options (UI counterpart to decideOrderAction)
        getBookingOptions,
        // Day Bill Summary
        getDayBillSummary,
        // Toast Titles
        BOOKING_TOAST_TITLES,
        // Action Preview (show users what will happen before save)
        resolveUserBookingBuckets,
        buildDesiredOrders,
        buildGuestDesiredOrders,
        buildBookingChanges,
        getPowerChanges,
        getPowerConsensus,
        hasChanges,
        countChanges,
        // Ticket changes and the cooking round
        formatMoment,
        replayTicketChanges,
        consecutiveDinnerRun
    }
}
