import {useBookingValidation, DinnerMode as DinnerModeEnum, DinnerState as DinnerStateEnum, OrderState as OrderStateEnum, TicketState as TicketStateEnum, SupplyState as SupplyStateEnum, type TicketState, type SupplyState, type TicketType, type OrderBucket, type BookingAction, type BookingOutcome, type BookingResult, type BookingTotals, type DinnerEventDetail, type DinnerEventDisplay, type DinnerEventUpdate, type HeynaboEventCreate, type OrderForTransaction, type OrderDisplay, type DinnerMode, type DesiredOrder, type OrderState, type DinnerState, type ScaffoldResult, type OrderHistoryDisplay, type TicketChange, type TicketEvent, type TicketCounts, type OrderAudit} from '~/composables/useBookingValidation'
import {useBillingValidation, type TransactionCreateData} from '~/composables/useBillingValidation'
import {useBilling} from '~/composables/useBilling'
import {useSeason, type SeasonDeadlines} from '~/composables/useSeason'
import {useHousehold, isHouseholdActiveOnDay} from '~/composables/useHousehold'
import {useTicket, ticketTypeLabel} from '~/composables/useTicket'
import type {InhabitantDisplay, HouseholdDisplay} from '~/composables/useCoreValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {Season} from '~/composables/useSeasonValidation'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {byTimeThenId} from '~/composables/useWaitlist'
import {calculateCountdown, formatDate, DATE_SETTINGS} from '~/utils/date'
import {dateToWeekDay} from '~/utils/season'
import {chunkArray, groupBy, linesBy, partition} from '~/utils/batchUtils'
import {sumBy} from '~/utils/ledger'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {differenceInCalendarDays, isAfter} from 'date-fns'

const {OrderBucketSchema, BookingActionSchema} = useBookingValidation()
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
    takesNoPortion: (ticketPriceId: number) => boolean
}

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
 * - No orderId + NONE → delete (the cancellation is recorded with no order to delete); a guest's → null (no guest to cancel)
 * - No orderId + eating + before deadline → create (state: BOOKED)
 * - No orderId + eating + after deadline → claim (state: BOOKED; DINEIN while the mode is locked)
 * - orderId of an order no longer among the existing ones (bought or deleted) → null (skip)
 * - orderId + NONE + before deadline → delete
 * - orderId + NONE + after deadline → update (state: RELEASED)
 * - orderId + RELEASED + eating mode → update (state: BOOKED, reclaim own; DINEIN while the mode is locked)
 * - orderId + eating mode + unchanged → idempotent (state: BOOKED)
 * - orderId + eating mode + changed → update (state: BOOKED)
 * - orderId + price mismatch (any state) → update (price healing)
 * - A ticket of 0 portions books and cancels as before the deadline at any time
 */
export const decideOrderAction = (
    input: OrderDecisionInput,
    DinnerMode: { NONE: DinnerMode; DINEIN: DinnerMode },
    OrderState: { BOOKED: OrderState; RELEASED: OrderState }
): OrderDecision => {
    const { desired, existing, existingEntry, beforeCancellationDeadline, canEditMode, takesNoPortion } = input
    const isNone = desired.dinnerMode === DinnerMode.NONE
    // A ticket of 0 portions takes nothing from the kitchen, so the deadline does not hold it
    const asBeforeDeadline = beforeCancellationDeadline || takesNoPortion(desired.ticketPriceId)

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

    // No orderId = new order intent. A guest's Ingen without a ticket cancels nothing; under a locked mode a claim lands
    // as Spisesal, as a reclaim does
    if (!desired.orderId) {
        if (isNone) return desired.isGuestTicket ? null : { bucket: Bucket.delete, order: desired }
        const bucket = asBeforeDeadline ? Bucket.create : Bucket.claim
        return { bucket, order: { ...desired, dinnerMode: canEditMode ? desired.dinnerMode : DinnerMode.DINEIN, state: OrderState.BOOKED } }
    }

    // An orderId among no existing orders is stale: the order was bought by another household or deleted since
    if (!existing) return null

    // Universal price check - runs BEFORE state-specific logic to ensure price healing
    // This catches price mismatches on ALL existing orders (BOOKED, RELEASED, any mode)
    const priceChanged = existing.ticketPriceId !== desired.ticketPriceId

    // NONE mode = cancellation
    if (isNone) {
        if (asBeforeDeadline) {
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
        return { bucket: Bucket.update, order: { ...desired, dinnerMode: canEditMode ? desired.dinnerMode : DinnerMode.DINEIN, state: OrderState.BOOKED } }
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
 * @param takesNoPortion - Whether a price row's ticket takes no portion from the kitchen
 * @param existingEntries - The household's queue entries on these dinners
 */
export const resolveDesiredOrdersToBuckets = (
    desiredOrders: DesiredOrder[],
    existingOrders: OrderDisplay[],
    dinnerEventById: Map<number, { date: Date }>,
    canModifyOrders: (date: Date) => boolean,
    canEditDiningMode: (date: Date) => boolean,
    takesNoPortion: (ticketPriceId: number) => boolean,
    DinnerMode: { NONE: DinnerMode; DINEIN: DinnerMode },
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
                canEditMode: canEditDiningMode(de.date),
                takesNoPortion
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

/** A user's booking change for one inhabitant at one dinner; a queued inhabitant's names the person's place */
export type BookingIntent = Pick<DesiredOrder, 'inhabitantId' | 'dinnerEventId' | 'dinnerMode' | 'waitlistEntryId'>

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

/** A user's dinner-mode change for one guest group (groupGuestOrders: one booker, ticket type, price and dinner) */
export type GuestBookingIntent = {guestOrders: OrderDisplay[], dinnerMode: DinnerMode}

/** A user's dinner-mode change for one place the household holds on a dinner's waiting list */
export type WaitlistEntryIntent = {entry: TicketWaitlistDisplay, dinnerMode: DinnerMode}

/** The edits of a booking grid: inhabitant cells, guest cells and places on the waiting list, saved in one scaffold call */
export type BookingChanges = {intents: BookingIntent[], guestIntents: GuestBookingIntent[], entryIntents: WaitlistEntryIntent[]}

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

/** A place's mode change as the DesiredOrder that names it, at its held price: Ingen leaves the line, another mode requeues */
export const buildEntryDesiredOrder = ({entry, dinnerMode}: WaitlistEntryIntent, BOOKED: OrderState): DesiredOrder => ({
    inhabitantId: entry.inhabitantId,
    dinnerEventId: entry.dinnerEventId,
    dinnerMode,
    ticketPriceId: entry.order.ticketPriceId,
    isGuestTicket: entry.isGuestTicket,
    allergyTypeIds: entry.order.allergyTypeIds,
    state: BOOKED,
    waitlistEntryId: entry.id
})

/** The modes in the order the app shows and cycles them */
export const DINNER_MODE_ORDER: DinnerMode[] = [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY, DinnerModeEnum.NONE]

const CLOSED_DINNER_STATES = new Set<DinnerState>([DinnerStateEnum.CANCELLED, DinnerStateEnum.CONSUMED])

/** A row of a booking view: its order, its place in the line, and the desired order the save would send for a mode */
export type BookingRow = {
    order: OrderDisplay | null
    waitlistEntry: TicketWaitlistDisplay | null
    candidate: (dinnerMode: DinnerMode) => DesiredOrder | null
}

export type BookingContext = {
    event: Pick<DinnerEventDisplay, 'date' | 'state'>
    deadlines: {canModifyOrders: (date: Date) => boolean, canEditDiningMode: (date: Date) => boolean}
    isHouseholdInResidency: (date: Date) => boolean
    takesNoPortion: (ticketPriceId: number) => boolean
    now: Date
}

// useSeason builds its schemas on every call and a grid asks once per cell: useBooking() binds its own past check once
const bookingOptionsWith = (isDinnerPast: (date: Date, now: Date) => boolean) =>
    ({order, waitlistEntry, candidate}: BookingRow, {event, deadlines, isHouseholdInResidency, takesNoPortion, now}: BookingContext): DinnerMode[] => {
        if (isDinnerPast(event.date, now) || !isHouseholdInResidency(event.date) || CLOSED_DINNER_STATES.has(event.state)) return []
        const input = {existing: order, existingEntry: waitlistEntry, beforeCancellationDeadline: deadlines.canModifyOrders(event.date), canEditMode: deadlines.canEditDiningMode(event.date), takesNoPortion}
        return DINNER_MODE_ORDER.filter(dinnerMode => {
            const desired = candidate(dinnerMode)
            const decision = desired && decideOrderAction({...input, desired}, DinnerModeEnum, OrderStateEnum)
            return decision !== null && decision.order.dinnerMode === dinnerMode
        })
    }

/** The modes a row may pick: the ones the decision matrix lands as that mode; nothing on a past, cancelled or consumed dinner or outside residency */
export const getBookingOptions = (row: BookingRow, context: BookingContext): DinnerMode[] =>
    bookingOptionsWith(useSeason().isDinnerPast)(row, context)

/** A household's booking context on each of its dinners at `now`, the moment the deadlines were built for; without a household every day counts as in residency */
export const bookingContextOf = (household: HouseholdDisplay | null, deadlines: SeasonDeadlines, ticketPrices: TicketPrice[], now: Date) => {
    const isHouseholdInResidency = household ? isHouseholdActiveOnDay(household.movedInDate, household.moveOutDate) : () => true
    const takesNoPortion = useTicket().takesNoPortionOf(ticketPrices)
    return (event: BookingContext['event']): BookingContext => ({event, deadlines, isHouseholdInResidency, takesNoPortion, now})
}

/** The household row: the modes every row may pick */
export const powerOptions = (rows: DinnerMode[][]): DinnerMode[] =>
    DINNER_MODE_ORDER.filter(dinnerMode => rows.length > 0 && rows.every(modes => modes.includes(dinnerMode)))

/**
 * Desired orders from inhabitant preferences; only the orders preferences manage come in. Ingen is a wish where the
 * inhabitant holds an order or a place of their own on the dinner's waiting list (`queueEntries`)
 */
export const generateDesiredOrdersFromPreferences = (
    inhabitants: InhabitantDisplay[],
    dinnerEvents: DinnerEventDisplay[],
    managedOrders: OrderDisplay[],
    queueEntries: TicketWaitlistDisplay[],
    userIntentKeys: Set<string>,
    ticketPrices: TicketPrice[]
): DesiredOrder[] => {
    const {resolveTicketPrice} = useTicket()
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum
    const orderByKey = new Map(managedOrders.map(o => [`${o.inhabitantId}-${o.dinnerEventId}`, o]))
    const queuedKeys = new Set(queueEntries.filter(entry => !entry.isGuestTicket).map(entry => `${entry.inhabitantId}-${entry.dinnerEventId}`))

    return inhabitants.flatMap(inhabitant => dinnerEvents.flatMap((de): DesiredOrder[] => {
        const key = `${inhabitant.id}-${de.id}`
        if (userIntentKeys.has(key)) return []
        const existing = orderByKey.get(key)

        const requestedMode = inhabitant.dinnerPreferences?.[dateToWeekDay(de.date)] ?? DinnerMode.DINEIN
        if (!existing && requestedMode === DinnerMode.NONE && !queuedKeys.has(key)) return []

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

/**
 * A household's preferences decided as a member's change: before the deadline they book and cancel, after it they buy a
 * ticket for sale or join the waiting list, release, and leave or change a place on it (`existingEntries`, the
 * household's places). A dinner the person acted on themselves stays as they left it
 */
export const resolveOrdersFromPreferencesToBuckets = (
    season: Season,
    household: HouseholdDisplay,
    existingOrders: OrderDisplay[],
    confirmedKeys: Set<string>,
    cancelledKeys: Set<string>,
    existingEntries: TicketWaitlistDisplay[],
    now: Date
): OrderBucketResult<DesiredOrder> => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const {deadlinesForSeason} = useSeason()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum
    const dinnerEvents = season.dinnerEvents ?? []
    const dinnerEventById = new Map(dinnerEvents.map(de => [de.id, de]))
    const {canModifyOrders, canEditDiningMode} = deadlinesForSeason(season, now)
    const takesNoPortion = useTicket().takesNoPortionOf(season.ticketPrices)

    const keyOf = (order: OrderDisplay) => `${order.inhabitantId}-${order.dinnerEventId}`
    // A user's own act outranks the preference: a guest ticket, an explicit booking, an explicit release
    const isManagedByPreferences = (order: OrderDisplay) =>
        !order.isGuestTicket && !confirmedKeys.has(keyOf(order)) && !(cancelledKeys.has(keyOf(order)) && ticketStateOf(order) === TicketStateEnum.released)

    const [managedOrders, unmanagedOrders] = partition(isManagedByPreferences)(existingOrders)
    const [unchangedOrders, outsideResidency] = partition((order: OrderDisplay) => dinnerEventById.has(order.dinnerEventId))(unmanagedOrders)

    const managedKeys = new Set(managedOrders.map(keyOf))
    const userIntentKeys = new Set([
        ...unmanagedOrders.filter(order => !order.isGuestTicket).map(keyOf),
        ...[...confirmedKeys, ...cancelledKeys].filter(key => !managedKeys.has(key))
    ])
    const desiredOrders = generateDesiredOrdersFromPreferences(household.inhabitants, dinnerEvents, managedOrders, existingEntries, userIntentKeys, season.ticketPrices)

    const result = resolveDesiredOrdersToBuckets(desiredOrders, managedOrders, dinnerEventById, canModifyOrders, canEditDiningMode, takesNoPortion, DinnerMode, OrderState, existingEntries)

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

/** Centralized deadline badge labels for UI consistency */
export const DEADLINE_LABELS = BOOKING_WORDS.deadlineLabels

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
        if (countdown.hours <= 0) return { description: BOOKING_WORDS.stepOverdue, alarm: 3 }
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
        title: BOOKING_WORDS.dinnerSteps.SCHEDULED,
        text: DEADLINE_LABELS.SCHEDULED.closedText,
        getDeadline: noDeadline()
    },
    [DinnerStepState.ANNOUNCED]: {
        step: 1,
        title: BOOKING_WORDS.dinnerSteps.ANNOUNCED,
        text: DEADLINE_LABELS.ANNOUNCED.closedText,
        getDeadline: userActionDeadline(DEADLINE_LABELS.ANNOUNCED.deadlinePrefix)
    },
    [DinnerStepState.BOOKING_CLOSED]: {
        step: 2,
        title: BOOKING_WORDS.dinnerSteps.BOOKING_CLOSED,
        text: DEADLINE_LABELS.BOOKING_CLOSED.closedText,
        getDeadline: systemDeadline(DEADLINE_LABELS.BOOKING_CLOSED.deadlinePrefix)
    },
    [DinnerStepState.GROCERIES_DONE]: {
        step: 3,
        title: BOOKING_WORDS.dinnerSteps.GROCERIES_DONE,
        text: DEADLINE_LABELS.GROCERIES_DONE.closedText,
        getDeadline: userActionDeadline(DEADLINE_LABELS.GROCERIES_DONE.deadlinePrefix)
    },
    [DinnerStepState.CONSUMED]: {
        step: 4,
        title: BOOKING_WORDS.dinnerSteps.CONSUMED,
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
    const {getDefaultDinnerStartTime, getDefaultDinnerDuration, getDinnerTimeRange, splitDinnerEvents, isDinnerPast} = useSeason()
    const {DinnerStateSchema} = useBookingValidation()
    const {formatNameWithInitials, computeConsensus} = useHousehold()
    const {resolveTicketPrice} = useTicket()
    const DinnerState = DinnerStateSchema.enum

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
        deadlines: Pick<SeasonDeadlines, 'getMenuDeadlineTime' | 'getDinnerStartTime'>,
        now: Date
    ): AlarmLevel => {
        const {getCookingDeadlineThresholds} = useSeason()
        const thresholds = getCookingDeadlineThresholds()

        const menuCountdown = calculateCountdown(deadlines.getMenuDeadlineTime(dinnerEvent.date), now)
        const dinnerCountdown = calculateCountdown(deadlines.getDinnerStartTime(dinnerEvent.date), now)

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
    const HEYNABO_EVENT_TEMPLATE = BOOKING_WORDS.heynaboEvent

    /** The dinner page of a date, its ?date= in the format the page reads (useBookingView) */
    const buildDinnerUrl = (baseUrl: string, dinnerDate: Date): string => `${baseUrl}/dinner?date=${formatDate(dinnerDate)}`

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
            `${HEYNABO_EVENT_TEMPLATE.SIGNATURE_PREFIX} ${dinnerEvent.cookingTeam?.name || HEYNABO_EVENT_TEMPLATE.SIGNATURE_FALLBACK}`,
            '',
            HEYNABO_EVENT_TEMPLATE.SEPARATOR,
            HEYNABO_EVENT_TEMPLATE.WARNING_ROBOT,
            HEYNABO_EVENT_TEMPLATE.WARNING_EDIT
        )

        const description = lines.join('<br>')

        const dinnerTimeRange = getDinnerTimeRange(dinnerEvent.date, getDefaultDinnerStartTime(), getDefaultDinnerDuration())

        return {
            name: HEYNABO_EVENT_TEMPLATE.NAME(dinnerEvent.menuTitle),
            type: null,
            description,
            start: dinnerTimeRange.start.toISOString(),
            end: dinnerTimeRange.end.toISOString(),
            status: 'PUBLISHED',
            groupId: null,
            price: {adult: 0, child: 0, taxIncluded: true},
            public: false,
            locationText: HEYNABO_EVENT_TEMPLATE.LOCATION,
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
    const getPastDinnerIds = (pendingDinners: {id: number, date: Date}[], now: Date): number[] => {
        if (pendingDinners.length === 0) return []
        const {pastDinners} = splitDinnerEvents(pendingDinners, now)
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
    ): DesiredOrder => ({
        inhabitantId: bookerId,
        dinnerEventId,
        dinnerMode: dinnerMode ?? DinnerModeEnum.DINEIN,
        ticketPriceId,
        isGuestTicket: true,
        allergyTypeIds,
        state: OrderStateEnum.BOOKED
    })

    /** A guest not yet added, as the guest form opens: booked by the booker at a guest's price; without a booker or a price, no candidate */
    const newGuestRow = (bookerId: number | undefined, dinnerEventId: number, ticketPrices: TicketPrice[]): BookingRow => {
        const ticketPriceId = resolveTicketPrice(null, undefined, ticketPrices)?.id
        return {
            order: null,
            waitlistEntry: null,
            candidate: dinnerMode => bookerId && ticketPriceId ? buildGuestOrder(bookerId, dinnerEventId, ticketPriceId, dinnerMode) : null
        }
    }

    /**
     * The guest tickets among the orders by group key: one booker, ticket type, price, dinner, allergies and provenance.
     * Guests at another price (a baby who tastes, a hungry baby), with other allergies or on a bought ticket
     * (provenanceHousehold) are separate rows.
     */
    const groupGuestOrders = <T extends {
        inhabitantId: number | null
        ticketType?: string | null
        priceAtBooking: number
        dinnerEventId: number
        isGuestTicket: boolean
        provenanceHousehold?: string | null
        provenanceAllergies?: string[] | null
    }>(
        orders: T[]
    ): Record<string, T[]> => Object.fromEntries(groupBy<T, string>(order => {
        const allergiesKey = order.provenanceAllergies?.slice().sort().join(',') ?? ''
        const provenanceKey = order.provenanceHousehold ?? ''
        return `${order.inhabitantId}-${order.ticketType ?? 'unknown'}-${order.priceAtBooking}-${order.dinnerEventId}-${allergiesKey}-${provenanceKey}`
    })(orders.filter(order => order.isGuestTicket)))

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

    const BOOKING_TOAST_TITLES = BOOKING_WORDS.toastTitles

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
        dinners: [...new Map(results.flatMap(result => result.dinners).map(dinner => [dinner.id, dinner])).values()],
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
    // Desired Orders - grid edits and power changes as one DesiredOrder[]
    // ============================================================================

    /** buildDesiredOrder over a list of intents, priced from the season's ticket prices; unpriced intents drop out */
    const buildDesiredOrders = (
        intents: BookingIntent[],
        existingOrders: OrderDisplay[],
        inhabitants: Pick<InhabitantDisplay, 'id' | 'birthDate'>[],
        dinnerEvents: Pick<DinnerEventDisplay, 'id' | 'date'>[],
        ticketPrices: TicketPrice[]
    ): DesiredOrder[] => {
        const resolveSeasonTicketPrice: TicketPriceResolver = (birthDate, priceAtBooking, referenceDate) =>
            resolveTicketPrice(birthDate, priceAtBooking, ticketPrices, referenceDate)
        return intents.flatMap(intent =>
            buildDesiredOrder(intent, existingOrders, inhabitants, dinnerEvents, resolveSeasonTicketPrice, OrderStateEnum.BOOKED) ?? []
        )
    }

    /** buildGuestDesiredOrder over a list of guest intents, priced from the season's ticket prices */
    const buildGuestDesiredOrders = (
        guestIntents: GuestBookingIntent[],
        ticketPrices: TicketPrice[]
    ): DesiredOrder[] => {
        const resolveSeasonTicketPrice: TicketPriceResolver = (birthDate, priceAtBooking, referenceDate) =>
            resolveTicketPrice(birthDate, priceAtBooking, ticketPrices, referenceDate)
        return guestIntents.flatMap(intent => buildGuestDesiredOrder(intent, resolveSeasonTicketPrice, OrderStateEnum.BOOKED))
    }

    /** Every grid edit as one DesiredOrder[]: inhabitant intents, guest intents and the places' intents together */
    const buildBookingChanges = (
        changes: BookingChanges,
        existingOrders: OrderDisplay[],
        inhabitants: Pick<InhabitantDisplay, 'id' | 'birthDate'>[],
        dinnerEvents: Pick<DinnerEventDisplay, 'id' | 'date'>[],
        ticketPrices: TicketPrice[]
    ): DesiredOrder[] => [
        ...buildDesiredOrders(changes.intents, existingOrders, inhabitants, dinnerEvents, ticketPrices),
        ...buildGuestDesiredOrders(changes.guestIntents, ticketPrices),
        ...changes.entryIntents.map(intent => buildEntryDesiredOrder(intent, OrderStateEnum.BOOKED))
    ]

    /**
     * Who a power change on one dinner reaches: the given inhabitants, every guest group booked on it and every place
     * the household holds on its waiting list. An inhabitant's own place goes with the inhabitant while they hold no
     * order there (an order supersedes it); the other places stand alone
     */
    const getPowerTargets = (
        inhabitantIds: number[],
        orders: OrderDisplay[],
        entries: TicketWaitlistDisplay[],
        dinnerEventId: number
    ): {
        inhabitants: {inhabitantId: number, order?: OrderDisplay, entry?: TicketWaitlistDisplay}[]
        guestGroups: OrderDisplay[][]
        entries: TicketWaitlistDisplay[]
    } => {
        const dinnerEntries = entries.filter(entry => entry.dinnerEventId === dinnerEventId)
        return {
            inhabitants: inhabitantIds.map(inhabitantId => {
                const order = findRegularOrder(orders, inhabitantId, dinnerEventId)
                return {inhabitantId, order, entry: order ? undefined : findRegularOrder(dinnerEntries, inhabitantId, dinnerEventId)}
            }),
            guestGroups: Object.values(groupGuestOrders(orders.filter(o => o.dinnerEventId === dinnerEventId))),
            entries: dinnerEntries.filter(entry => entry.isGuestTicket || !inhabitantIds.includes(entry.inhabitantId))
        }
    }

    /**
     * A power change on one dinner as BookingChanges: one intent per inhabitant, naming the person's place while queued,
     * one guest intent per guest group and one intent per other place
     */
    const getPowerChanges = (
        inhabitantIds: number[],
        orders: OrderDisplay[],
        entries: TicketWaitlistDisplay[],
        dinnerEventId: number,
        dinnerMode: DinnerMode
    ): BookingChanges => {
        const targets = getPowerTargets(inhabitantIds, orders, entries, dinnerEventId)
        return {
            intents: targets.inhabitants.map(({inhabitantId, entry}) => ({inhabitantId, dinnerEventId, dinnerMode, waitlistEntryId: entry?.id})),
            guestIntents: targets.guestGroups.map(guestOrders => ({guestOrders, dinnerMode})),
            entryIntents: targets.entries.map(entry => ({entry, dinnerMode}))
        }
    }

    /**
     * Power-row consensus on one dinner over every power target: inhabitants' regular orders or own places, guest groups
     * and the other places; a place counts its wish. A draft mode, when given, overrides the saved mode of its target.
     */
    const getPowerConsensus = (
        inhabitantIds: number[],
        orders: OrderDisplay[],
        entries: TicketWaitlistDisplay[],
        dinnerEventId: number,
        draftMode: {
            inhabitant?: (inhabitantId: number) => DinnerMode | undefined
            guestGroup?: (guestOrders: OrderDisplay[]) => DinnerMode | undefined
            entry?: (entry: TicketWaitlistDisplay) => DinnerMode | undefined
        } = {}
    ): {value: DinnerMode, consensus: boolean} => {
        const {DinnerModeSchema} = useBookingValidation()
        const targets = getPowerTargets(inhabitantIds, orders, entries, dinnerEventId)
        const modes = [
            ...targets.inhabitants.map(({inhabitantId, order, entry}) => draftMode.inhabitant?.(inhabitantId)
                ?? order?.dinnerMode
                ?? entry?.order.dinnerMode
                ?? DinnerModeSchema.enum.NONE),
            ...targets.guestGroups.map(guestOrders => draftMode.guestGroup?.(guestOrders) ?? guestOrders[0]!.dinnerMode),
            ...targets.entries.map(entry => draftMode.entry?.(entry) ?? entry.order.dinnerMode)
        ]
        return computeConsensus(modes, DinnerModeSchema.enum.DINEIN)
    }

    // ============================================================================
    // Lock Status - Compute booking lock status for calendar display
    // ============================================================================

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

    const {TicketTypeSchema, TicketChangeKindSchema, OrderAuditChangeSchema} = useBookingValidation()
    const Change = OrderAuditChangeSchema.enum
    const countsBy = (count: (type: TicketType) => number): TicketCounts =>
        Object.fromEntries(TicketTypeSchema.options.map(type => [type, count(type)])) as TicketCounts
    const emptyCounts = (): TicketCounts => countsBy(() => 0)
    const countsPlus = (a: TicketCounts, b: TicketCounts): TicketCounts => countsBy(type => a[type] + b[type])

    // A ticket the dinner is paid for after a history row: its dinner, its price row, its holder's household, whether its
    // holder eats or has released it, and whether the close has settled it
    type HeldTicket = Readonly<{key: number, inhabitantId: number | null, dinnerEventId: number | null, ticketPriceId: number | null, type: TicketType | null, price: number, portions: number, eating: boolean, closed: boolean, householdId: number | null, householdShortname: string | null}>
    type HeldTickets = ReadonlyMap<number, HeldTicket>

    const sumOver = (held: HeldTickets, weigh: (ticket: HeldTicket) => number): number => sumBy([...held.values()], weigh)
    const countsOf = (tickets: Iterable<HeldTicket>): TicketCounts =>
        [...tickets].reduce((counts, ticket) => ticket.type ? {...counts, [ticket.type]: counts[ticket.type] + 1} : counts, emptyCounts())
    // A released ticket stays paid until someone buys it: it keeps its place in the counts, the kuverter and the revenue
    const portionsOf = (held: HeldTickets): number => sumOver(held, ticket => ticket.portions)
    const revenueOf = (held: HeldTickets): number => sumOver(held, ticket => ticket.price)

    const withTicket = (held: HeldTickets, ticket: HeldTicket): HeldTickets => new Map(held).set(ticket.key, ticket)
    const withoutTicket = (held: HeldTickets, key: number): HeldTickets => new Map([...held].filter(([heldKey]) => heldKey !== key))
    // A booking row without its order's id keys its ticket by its own negative row id, until a later row names the order
    const isUnread = (ticket: HeldTicket): boolean => ticket.key < 0
    /**
     * The held ticket a row moves: the ticket of its order id. A booking without one books its own; any other row takes
     * a ticket whose order id the history never read, on the row's dinner and in its household (its person when the row
     * names no household), the same price row first, then the same person
     */
    const findHeld = (held: HeldTickets, audit: OrderAudit): HeldTicket | undefined => {
        const byOrderId = audit.orderId === null ? undefined : held.get(audit.orderId)
        if (byOrderId || audit.change === Change.BOOK) return byOrderId
        const rank = (ticket: HeldTicket): number => Number(ticket.ticketPriceId === audit.ticketPriceId) * 2 + Number(ticket.inhabitantId === audit.inhabitantId)
        return [...held.values()]
            .filter(ticket => isUnread(ticket) && ticket.dinnerEventId === audit.dinnerEventId
                && (audit.householdId === null ? ticket.inhabitantId === audit.inhabitantId : ticket.householdId === audit.householdId))
            .reduce<HeldTicket | undefined>((best, ticket) => best === undefined || rank(ticket) > rank(best) ? ticket : best, undefined)
    }

    const byTime = byTimeThenId<{id: number, timestamp: Date}>(row => row.timestamp.getTime())

    /**
     * Replays a dinner's order history in time order into the lines of Billetændringer. Each row moves one held ticket,
     * and its ticket events follow from that ticket before and after the row: booked, the chef's extra portions,
     * cancelled, released, bought, taken back, changed to another price row, or closed; a row that moves nothing, such as
     * an eating mode switch, makes no event. The events of an admin's correction carry its reason, read from the row's
     * source; a row without a source that deletes a ticket after the booking deadline is one. A line gathers the events
     * of one actor within one rendered minute, the system user acting for a row without an actor, with the actor's name
     * and the tickets, kuverter and revenue after it. A ticket price the season no longer names counts in the revenue
     * without a type or kuverter. A sale passes the ticket to the buyer, whose household its line and the ticket's later
     * lines name.
     */
    const replayTicketChanges = (
        history: OrderHistoryDisplay[],
        ticketPriceOf: (ticketPriceId: number) => Pick<TicketPrice, 'ticketType' | 'portions'> | null,
        systemUserId: number,
        householdShortnameOf: (householdId: number) => string | null = () => null,
        householdOfInhabitant: (inhabitantId: number) => Pick<HouseholdDisplay, 'id' | 'shortName'> | null = () => null,
        bookingDeadline?: Date
    ): TicketChange[] => {
        const {readOrderAudit, OrderAuditActionSchema, OrderAuditSourceSchema, OrderStateSchema} = useBookingValidation()
        const Audit = OrderAuditActionSchema.enum
        const Source = OrderAuditSourceSchema.enum
        const State = OrderStateSchema.enum
        const Kind = TicketChangeKindSchema.enum

        // Only a snapshot names its household's short name: a snapshot of no order held no ticket, as a place on the
        // waiting list or a cancellation of nothing booked
        const heldNoTicket = (audit: OrderAudit): boolean => audit.orderId === null && audit.householdShortname !== null
        // A sale's row names the buyer's inhabitant and holds the seller's snapshot: the ticket it moves is the buyer's
        const ticketOf = (row: OrderHistoryDisplay, audit: OrderAudit): OrderAudit => {
            if (row.action !== Audit.USER_CLAIMED) return audit
            const buyer = row.inhabitantId === null ? null : householdOfInhabitant(row.inhabitantId)
            return {...audit, inhabitantId: row.inhabitantId, householdId: buyer?.id ?? null, householdShortname: buyer?.shortName ?? null}
        }

        const priced = (ticketPriceId: number | null, price: number) => {
            const ticketPrice = ticketPriceId === null ? null : ticketPriceOf(ticketPriceId)
            return {ticketPriceId, type: ticketPrice?.ticketType ?? null, portions: ticketPrice?.portions ?? 0, price}
        }
        const booked = (rowId: number, ticket: OrderAudit): HeldTicket => ({
            key: ticket.orderId ?? -rowId, inhabitantId: ticket.inhabitantId, dinnerEventId: ticket.dinnerEventId,
            ...priced(ticket.ticketPriceId, ticket.priceAtBooking ?? 0),
            eating: true, closed: false, householdId: ticket.householdId, householdShortname: ticket.householdShortname
        })
        // A legacy batch update's row carries the new state, and a price row with its price only when the price row changed
        const updated = (current: HeldTicket, ticket: OrderAudit): HeldTicket => ({
            ...current,
            ...(ticket.ticketPriceId === null ? {} : priced(ticket.ticketPriceId, ticket.priceAtBooking ?? current.price)),
            eating: ticket.state === null || ticket.state === State.CLOSED ? current.eating : ticket.state !== State.RELEASED,
            closed: current.closed || ticket.state === State.CLOSED
        })

        // The row releases the ticket: a release keeps it paid, a cancellation removes it
        const releasesTicket = (ticket: OrderAudit): boolean => ticket.change !== Change.CANCEL && ticket.state === State.RELEASED
        // A cancellation keeps a released ticket held and paid, and takes a deleted one off the dinner
        const afterCancellation = (current: HeldTicket, ticket: OrderAudit): HeldTicket | undefined =>
            releasesTicket(ticket) ? updated(current, ticket) : undefined

        const afterRow = (current: HeldTicket | undefined, row: OrderHistoryDisplay, ticket: OrderAudit): HeldTicket | undefined => {
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
        // A row written before rows named their source: after the booking deadline a member releases instead of
        // deleting, so a user-mode deletion then is the admin's correction; a system run's deletion is SYSTEM_DELETED
        const isUnsourcedAdminDeletion = (row: OrderHistoryDisplay, audit: OrderAudit): boolean =>
            audit.source === null && row.action === Audit.USER_CANCELLED && isAfterBookingDeadline(row.timestamp)
        // An admin's correction names itself in its row's source
        const reasonOf = (row: OrderHistoryDisplay, audit: OrderAudit, deletes: boolean): TicketEvent['reason'] =>
            audit.source === Source['admin-correction'] || (deletes && isUnsourcedAdminDeletion(row, audit)) ? Source['admin-correction'] : undefined
        // The chef's extra portions are the orders the waiting-list assignment creates for the first in line
        const isExtraPortion = (audit: OrderAudit): boolean => audit.source === Source['waitlist-assignment']
        // A sale's row holds the seller's order as it stood before the sale: its household is the seller
        const sellerOf = (audit: OrderAudit): string | null => audit.householdShortname
        // The holder eats on the ticket again: a sale names its seller, else the holder takes back its own release
        const eatingAgain = (row: OrderHistoryDisplay, audit: OrderAudit, tickets: TicketCounts): TicketEvent =>
            row.action === Audit.USER_CLAIMED ? {change: Kind.BUY, tickets, seller: sellerOf(audit)} : {change: Kind.RECLAIM, tickets}

        const changesOf = (before: HeldTicket | undefined, after: HeldTicket | undefined, row: OrderHistoryDisplay, audit: OrderAudit): TicketEvent[] => {
            if (!after) return before ? [{change: Kind.CANCEL, tickets: countsOf([before])}] : []
            if (!before) return [{change: isExtraPortion(audit) ? Kind.EXTRA_PORTIONS : Kind.BOOK, tickets: countsOf([after])}]
            const tickets = countsOf([after])
            if (after.closed && !before.closed) return [{change: Kind.CLOSE, tickets}]
            return [
                ...(before.ticketPriceId === after.ticketPriceId ? [] : [{change: Kind.CHANGE_PRICE, tickets, from: countsOf([before])}]),
                ...(before.eating === after.eating ? [] : [after.eating ? eatingAgain(row, audit, tickets) : {change: Kind.RELEASE, tickets}])
            ]
        }
        const eventsOf = (before: HeldTicket | undefined, after: HeldTicket | undefined, row: OrderHistoryDisplay, audit: OrderAudit): TicketEvent[] => {
            const reason = reasonOf(row, audit, after === undefined)
            return changesOf(before, after, row, audit).map(event => reason ? {...event, reason} : event)
        }

        // A legacy batch update's row carries the new scalars only; the ticket it moves names the household, held as after
        // the row
        const toLine = (row: OrderHistoryDisplay, ticket: OrderAudit, moved: HeldTicket | undefined, events: TicketEvent[], held: HeldTickets): TicketChange => {
            const householdId = ticket.householdId ?? moved?.householdId ?? null
            const household = ticket.householdShortname ?? moved?.householdShortname ?? (householdId === null ? null : householdShortnameOf(householdId))
            const performedByUserId = row.performedByUserId ?? systemUserId
            const bySystem = performedByUserId === systemUserId
            return {
                id: row.id,
                timestamp: row.timestamp,
                performedByUserId,
                performedByName: formatPerformer(bySystem ? null : row.performedByUser),
                bySystem,
                households: [household ?? BOOKING_WORDS.unknownHousehold],
                events,
                counts: countsOf(held.values()),
                portions: portionsOf(held),
                revenue: revenueOf(held)
            }
        }

        const {lines} = [...history].sort(byTime)
            .flatMap(row => {
                const audit = readOrderAudit(row)
                return audit === null || heldNoTicket(audit) ? [] : [{row, audit}]
            })
            .reduce(({held, lines}, {row, audit}) => {
                const ticket = ticketOf(row, audit)
                const before = findHeld(held, audit)
                const moved = afterRow(before, row, ticket)
                // A ticket found without its order id takes the id the row reads
                const after = moved && isUnread(moved) && audit.orderId !== null ? {...moved, key: audit.orderId} : moved
                const rest = before && before.key !== after?.key ? withoutTicket(held, before.key) : held
                const next = after ? withTicket(rest, after) : rest
                const events = eventsOf(before, after, row, audit)
                return {held: next, lines: events.length > 0 ? [...lines, toLine(row, ticket, after ?? before, events, next)] : lines}
            }, {held: new Map() as HeldTickets, lines: [] as TicketChange[]})
        return collapseByKey(lines)
    }

    /** A moment as the chef reads it: the date mask and the hour */
    const formatMoment = (date: Date): string => formatDate(date, `${DATE_SETTINGS.DATE_MASK} HH:mm`)
    /**
     * Who wrote a history row, named as the booking page names a person; the system account, which holds no inhabitant,
     * and a user since deleted read System
     */
    const formatPerformer = (user: OrderHistoryDisplay['performedByUser']): string =>
        user?.Inhabitant ? formatNameWithInitials(user.Inhabitant) : BOOKING_WORDS.ticketChange.bySystem
    // One event per kind, seller and reason with the tickets added up, in the order of the kinds: sales from two
    // households stay two, and so do an admin's correction and the same act without one
    const mergeEvents = (events: TicketEvent[]): TicketEvent[] =>
        TicketChangeKindSchema.options.flatMap(change => {
            const alike = groupBy((event: TicketEvent) => `${event.seller ?? ''}|${event.reason ?? ''}`)(events.filter(event => event.change === change))
            return [...alike.values()].map(ofAlike => {
                const {seller, reason} = ofAlike[0]!
                const from = ofAlike.flatMap(event => event.from ? [event.from] : [])
                return {
                    change,
                    tickets: ofAlike.map(event => event.tickets).reduce(countsPlus),
                    ...(seller === undefined ? {} : {seller}),
                    ...(from.length === 0 ? {} : {from: from.reduce(countsPlus)}),
                    ...(reason === undefined ? {} : {reason})
                }
            })
        })
    // The rows of one actor within one rendered minute make one line: their households and events merge, the last row
    // gives the rest, and the line takes its place by its last row
    const changeKey = (change: TicketChange): string => `${formatMoment(change.timestamp)}|${change.performedByUserId}`
    const collapseByKey = linesBy<TicketChange, TicketChange, string>(changeKey, group => ({
        ...group.at(-1)!,
        households: [...new Set(group.flatMap(change => change.households))],
        events: mergeEvents(group.flatMap(change => change.events))
    }), byTime)

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
        // Dinner Step State
        getDinnerStepState,
        getStepConfig,
        getChefDeadlineAlarm,
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
        newGuestRow,
        groupGuestOrders,
        // Scaffold Result Formatting
        formatScaffoldResult,
        sumScaffoldResults,
        // Lock Status
        getLockedFutureDinnerIds,
        computeLockStatus,
        // Booking Options: the modes the decision matrix lands
        getBookingOptions: bookingOptionsWith(isDinnerPast),
        powerOptions,
        // Day Bill Summary
        getDayBillSummary,
        // Toast Titles
        BOOKING_TOAST_TITLES,
        // Action Preview (show users what will happen before save)
        buildDesiredOrders,
        buildGuestDesiredOrders,
        buildBookingChanges,
        getPowerChanges,
        getPowerConsensus,
        // Ticket changes and the cooking round
        formatMoment,
        formatPerformer,
        replayTicketChanges,
        consecutiveDinnerRun
    }
}
