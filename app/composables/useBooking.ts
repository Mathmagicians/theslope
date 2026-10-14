import {useBookingValidation, type TicketType, type BookingRowAction, type DinnerEventDetail, type DinnerEventDisplay, type DinnerEventUpdate, type HeynaboEventCreate, type OrderForTransaction, type OrderDetail, type OrderSnapshot, type OrderDisplay, type DinnerMode, type DesiredOrder, type OrderState, type DinnerState, type ScaffoldResult, type OrderHistoryDisplay, type TicketChange, type TicketCounts, type AuditTicket, type OrderAuditAction} from '~/composables/useBookingValidation'
import {useBillingValidation, type TransactionCreateData} from '~/composables/useBillingValidation'
import {useBilling} from '~/composables/useBilling'
import {useSeason, type SeasonDeadlines} from '~/composables/useSeason'
import {useHousehold} from '~/composables/useHousehold'
import {useTicket} from '~/composables/useTicket'
import type {InhabitantDisplay, HouseholdDisplay} from '~/composables/useCoreValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {Season} from '~/composables/useSeasonValidation'
import type {TicketWaitlistDisplay} from '~/composables/useWaitlistValidation'
import {byTimeThenId} from '~/composables/useWaitlist'
import type {PruneAndCreateResult} from '~/utils/batchUtils'
import {calculateCountdown, formatDate, DATE_SETTINGS} from '~/utils/date'
import {dateToWeekDay} from '~/utils/season'
import {chunkArray, groupBy} from '~/utils/batchUtils'
import {sumBy} from '~/utils/ledger'
import {getPortionsForTicketType} from '~/utils/portions'
import {differenceInCalendarDays} from 'date-fns'

const ROW_ACTION = useBookingValidation().BookingRowActionSchema.enum

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
 * Bucket types for order decisions.
 * Extends standard CRUD buckets with 'claim' (a released ticket, else a queue entry) and the queue entry's 'leave' and 'requeue'.
 */
export type OrderBucket = 'create' | 'update' | 'delete' | 'idempotent' | 'claim' | 'leave' | 'requeue'

/**
 * Result of order decision: which bucket and the order with state set.
 * null = skip (no action needed, e.g., no orderId + NONE, or no capacity)
 */
export type OrderDecision = {
    bucket: OrderBucket
    order: DesiredOrder
} | null

/**
 * Extended bucket result for order resolution.
 * Extends PruneAndCreateResult with the claim bucket and the queue entry buckets.
 */
export type OrderBucketResult<T = DesiredOrder> = PruneAndCreateResult<T> & {
    claim: T[]
    leave: T[]
    requeue: T[]
}

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

/** What executing a bucket does: book, buy a released ticket, queue, leave or requeue the entry, or nothing */
export type BookingOutcome = 'book' | 'buy' | 'queue' | 'leave' | 'requeue' | 'none'

/**
 * The outcome of a bucket at the instant it executes. The claim bucket settles by supply: a released ticket at the
 * price is bought, none queues the wish. Buckets that change no supply (update, delete, idempotent, skip) are none.
 */
export const bookingOutcome = (bucket: OrderBucket | null, supply: {ticketsForSale: number}): BookingOutcome => {
    switch (bucket) {
        case 'create': return 'book'
        case 'claim': return supply.ticketsForSale > 0 ? 'buy' : 'queue'
        case 'leave': return 'leave'
        case 'requeue': return 'requeue'
        default: return 'none'
    }
}

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
        if (isNone) return { bucket: 'leave', order: { ...desired, waitlistEntryId: existingEntry.id } }
        const wish = existingEntry.order
        const dinnerMode = canEditMode ? desired.dinnerMode : wish.dinnerMode
        const changed = wish.dinnerMode !== dinnerMode || wish.ticketPriceId !== desired.ticketPriceId
        return {
            bucket: changed ? 'requeue' : 'idempotent',
            order: { ...desired, dinnerMode, waitlistEntryId: existingEntry.id, state: OrderState.BOOKED }
        }
    }
    if (desired.waitlistEntryId) return null

    // No orderId = new order intent
    if (!desired.orderId) {
        if (isNone) return null // Skip: no order to create for NONE
        const bucket = getNewOrderAction(beforeCancellationDeadline) === ROW_ACTION.process ? 'create' : 'claim'
        return { bucket, order: { ...desired, state: OrderState.BOOKED } }
    }

    // Has orderId but no existing = data integrity error
    if (!existing) {
        throw new Error(`Order ${desired.orderId} not found in existing orders`)
    }

    // Universal price check - runs BEFORE state-specific logic to ensure price healing
    // This catches price mismatches on ALL existing orders (BOOKED, RELEASED, any mode)
    const priceChanged = existing.ticketPriceId !== desired.ticketPriceId

    // NONE mode = cancellation
    if (isNone) {
        if (beforeCancellationDeadline) {
            return { bucket: 'delete', order: desired }
        }
        // After deadline: release BOOKED orders, update RELEASED if price needs correction
        if (existing.state === OrderState.RELEASED) {
            if (priceChanged) {
                return { bucket: 'update', order: { ...desired, dinnerMode: DinnerMode.NONE, state: existing.state } }
            }
            return { bucket: 'idempotent', order: { ...desired, dinnerMode: DinnerMode.NONE, state: existing.state } }
        }
        return { bucket: 'update', order: { ...desired, state: OrderState.RELEASED } }
    }

    // Reclaim: existing RELEASED + eating mode → update back to BOOKED
    // Price change is handled by scaffolder since desired.ticketPriceId is correct
    if (existing.state === OrderState.RELEASED) {
        return { bucket: 'update', order: { ...desired, state: OrderState.BOOKED } }
    }

    // Eating mode on BOOKED order - check if changed
    const effectiveMode = canEditMode ? desired.dinnerMode : existing.dinnerMode
    const modeChanged = existing.dinnerMode !== effectiveMode

    if (modeChanged || priceChanged) {
        return { bucket: 'update', order: { ...desired, dinnerMode: effectiveMode, state: OrderState.BOOKED } }
    }

    // Idempotent - preserve existing state and use effectiveMode to respect deadline enforcement
    return { bucket: 'idempotent', order: { ...desired, dinnerMode: effectiveMode, state: existing.state } }
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

    const result: OrderBucketResult<DesiredOrder> = {
        create: [],
        update: [],
        delete: [],
        idempotent: [],
        claim: [],
        leave: [],
        requeue: []
    }

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

/**
 * Generate DesiredOrder[] from inhabitant preferences for system scaffolding.
 * Unified loop handles: guest preservation, user intent keys, and preference-based orders.
 *
 * User intent keys (from OrderHistory):
 * - confirmedKeys: USER_BOOKED, USER_CLAIMED → preserve order as-is
 * - cancelledKeys: USER_CANCELLED → don't recreate deleted orders
 */
export const generateDesiredOrdersFromPreferences = (
    inhabitants: InhabitantDisplay[],
    dinnerEvents: DinnerEventDisplay[],
    existingOrders: OrderDisplay[],
    confirmedKeys: Set<string>,
    cancelledKeys: Set<string>,
    ticketPrices: TicketPrice[]
): DesiredOrder[] => {
    const {resolveTicketPrice} = useTicket()
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum

    // Build lookup: composite key → existing order
    const existingByKey = new Map(
        existingOrders.map(o => [`${o.inhabitantId}-${o.dinnerEventId}`, o])
    )

    const result: DesiredOrder[] = []

    for (const inhabitant of inhabitants) {
        for (const de of dinnerEvents) {
            const key = `${inhabitant.id}-${de.id}`
            const existing = existingByKey.get(key)

            // Guest order: preserve (not managed by preferences)
            if (existing?.isGuestTicket) {
                // Resolve ticketPriceId: existing → priceAtBooking fallback → 0 (idempotent)
                const resolvedId = existing.ticketPriceId
                    ?? resolveTicketPrice(null, existing.priceAtBooking, ticketPrices)?.id
                if (!resolvedId) {
                    console.warn(`⚠️ > BOOKING > Order ${existing.id} has orphaned price (no matching ticketPrice)`)
                }
                result.push({
                    inhabitantId: existing.inhabitantId,
                    dinnerEventId: existing.dinnerEventId,
                    dinnerMode: existing.dinnerMode,
                    ticketPriceId: resolvedId ?? 0,
                    isGuestTicket: true,
                    orderId: existing.id,
                    state: existing.state
                })
                continue
            }

            // User confirmed (USER_BOOKED or USER_CLAIMED): preserve order as-is
            if (confirmedKeys.has(key) && existing) {
                result.push({
                    inhabitantId: existing.inhabitantId,
                    dinnerEventId: existing.dinnerEventId,
                    dinnerMode: existing.dinnerMode,
                    ticketPriceId: existing.ticketPriceId ?? 0,
                    isGuestTicket: false,
                    orderId: existing.id,
                    state: existing.state
                })
                continue
            }

            // User cancelled (USER_CANCELLED): respect their intent
            // - No existing order: don't recreate deleted order
            // - RELEASED order: skip here, let orphan detection preserve it
            // - BOOKED order: user re-booked after cancelling, let through (will be idempotent)
            if (cancelledKeys.has(key)) {
                if (!existing) {
                    continue  // Don't recreate deleted order
                }
                if (existing.state === OrderState.RELEASED) {
                    continue  // Let orphan detection preserve in idempotent bucket
                }
            }

            // Get preference mode (default DINEIN if no preferences set)
            const weekDay = dateToWeekDay(de.date)
            const requestedMode = inhabitant.dinnerPreferences?.[weekDay] ?? DinnerMode.DINEIN

            // Derive ticket price from age
            const ticketPrice = resolveTicketPrice(inhabitant.birthDate ?? null, null, ticketPrices, de.date)
            if (!ticketPrice?.id) {
                throw new Error(`No ticket price for inhabitant ${inhabitant.id}`)
            }

            result.push({
                inhabitantId: inhabitant.id,
                dinnerEventId: de.id,
                dinnerMode: requestedMode,
                ticketPriceId: ticketPrice.id,
                isGuestTicket: false,
                orderId: existing?.id,
                state: existing?.state ?? OrderState.BOOKED
            })
        }
    }

    return result
}

/**
 * Resolve orders from inhabitant preferences to buckets.
 * Generates DesiredOrder[] from preferences, then resolves to buckets.
 * Also detects orphan orders (existing orders not matched by any desired order).
 * System mode never claims: buying a ticket or queueing after the deadline is a member's act.
 */
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

    const desiredOrders = generateDesiredOrdersFromPreferences(
        household.inhabitants,
        dinnerEvents,
        existingOrders,
        confirmedKeys,
        cancelledKeys,
        season.ticketPrices
    )

    const result = {
        ...resolveDesiredOrdersToBuckets(desiredOrders, existingOrders, dinnerEventById, canModifyOrders, canEditDiningMode, DinnerMode, OrderState),
        claim: []
    }

    // Detect orphan orders: existing orders not matched by any desired order
    const processedOrderIds = new Set([
        ...result.create.map(o => o.orderId).filter(Boolean),
        ...result.update.map(o => o.orderId).filter(Boolean),
        ...result.delete.map(o => o.orderId).filter(Boolean),
        ...result.idempotent.map(o => o.orderId).filter(Boolean)
    ])

    for (const existing of existingOrders) {
        if (processedOrderIds.has(existing.id)) continue

        const key = `${existing.inhabitantId}-${existing.dinnerEventId}`

        // Residency enforcement: orders for events outside the eligible set (e.g. after moveOutDate)
        // are force-deleted regardless of user intent
        const isInEligibleEvents = dinnerEventById.has(existing.dinnerEventId)
        if (!isInEligibleEvents) {
            console.info(`🏠 > RESIDENCY_CHECK > Order ${existing.id} (key=${key}) DELETED (event ${existing.dinnerEventId} outside residency period)`)
            result.delete.push({
                inhabitantId: existing.inhabitantId,
                dinnerEventId: existing.dinnerEventId,
                dinnerMode: existing.dinnerMode,
                ticketPriceId: existing.ticketPriceId ?? 0,
                isGuestTicket: existing.isGuestTicket ?? false,
                orderId: existing.id,
                state: existing.state
            })
            continue
        }

        // User-intent orders within eligible events: preserve (confirmed = user wants it, cancelled = user released it)
        if (confirmedKeys.has(key) || cancelledKeys.has(key)) {
            console.info(`🔒 > ORPHAN_CHECK > Order ${existing.id} (key=${key}) PRESERVED (in confirmedKeys=${confirmedKeys.has(key)}, cancelledKeys=${cancelledKeys.has(key)})`)
            result.idempotent.push({
                inhabitantId: existing.inhabitantId,
                dinnerEventId: existing.dinnerEventId,
                dinnerMode: existing.dinnerMode,
                ticketPriceId: existing.ticketPriceId ?? 0,
                isGuestTicket: existing.isGuestTicket ?? false,
                orderId: existing.id,
                state: existing.state
            })
            continue
        }

        // True orphan order (no user intent, within eligible events) - add to delete bucket
        console.info(`🗑️ > ORPHAN_CHECK > Order ${existing.id} (key=${key}) DELETED (orphan - not in confirmedKeys or cancelledKeys)`)
        result.delete.push({
            inhabitantId: existing.inhabitantId,
            dinnerEventId: existing.dinnerEventId,
            dinnerMode: existing.dinnerMode,
            ticketPriceId: existing.ticketPriceId ?? 0,
            isGuestTicket: existing.isGuestTicket ?? false,
            orderId: existing.id,
            state: existing.state
        })
    }

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
        closedText: 'Booking kan ikke ændres',
        deadlinePrefix: 'åben de næste',
        availableText: (count: number) => `Lukket for ændringer, men der er ${count} billetter til salg`
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
 * Released ticket counts with pre-formatted breakdown
 * Used for deadline badges to show "2V 1B" format
 */
export interface ReleasedTicketCounts {
    total: number
    formatted: string  // Pre-computed by formatTicketCounts, e.g., "2V 1B"
}

// ============================================================================
// Daily Maintenance - State Constants (ADR-015: Idempotent operations)
// ============================================================================

/**
 * Dinner states eligible for consumption by daily maintenance.
 * Business rule: Only SCHEDULED and ANNOUNCED dinners can be consumed.
 * CANCELLED dinners are excluded (refunded), CONSUMED is already processed.
 */
export const CONSUMABLE_DINNER_STATES = ['SCHEDULED', 'ANNOUNCED'] as const

/**
 * Order states eligible for closing by daily maintenance.
 * Business rule: BOOKED and RELEASED orders on CONSUMED dinners become CLOSED.
 * CANCELLED orders are excluded (dinner was cancelled, already refunded).
 */
export const CLOSABLE_ORDER_STATES = ['BOOKED', 'RELEASED'] as const

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
     * ADR-010: Preserves isGuestTicket in snapshot for billing display
     */
    const prepareTransactionData = (closedOrders: OrderForTransaction[]): TransactionCreateData[] => {
        const {serializeTransaction} = useBillingValidation()

        return closedOrders.map(order => ({
            orderId: order.id,
            orderSnapshot: serializeTransaction({
                dinnerEvent: order.dinnerEvent,
                inhabitant: order.inhabitant,
                ticketType: order.ticketType,
                isGuestTicket: order.isGuestTicket
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
     * Group guest orders by (booker, ticketType, dinnerEventId, allergies, provenance)
     * Returns a map from group key to array of orders
     *
     * Guests with different allergies or claimed tickets (provenanceHousehold) are separate rows.
     */
    const groupGuestOrders = <T extends {
        inhabitantId: number | null
        ticketType?: string | null
        dinnerEventId: number
        provenanceHousehold?: string | null
        provenanceAllergies?: string[] | null
    }>(
        orders: T[]
    ): Record<string, T[]> => {
        return orders.reduce((acc, order) => {
            const allergiesKey = order.provenanceAllergies?.slice().sort().join(',') ?? ''
            const provenanceKey = order.provenanceHousehold ?? ''
            const key = `${order.inhabitantId}-${order.ticketType ?? 'unknown'}-${order.dinnerEventId}-${allergiesKey}-${provenanceKey}`
            if (!acc[key]) acc[key] = []
            acc[key].push(order)
            return acc
        }, {} as Record<string, T[]>)
    }

    /**
     * Partition orders into guest and regular (inhabitant) orders
     */
    const partitionGuestOrders = <T extends { isGuestTicket?: boolean }>(
        orders: T[]
    ): { guestOrders: T[], regularOrders: T[] } => {
        return orders.reduce((acc, order) => {
            (order.isGuestTicket ? acc.guestOrders : acc.regularOrders).push(order)
            return acc
        }, { guestOrders: [] as T[], regularOrders: [] as T[] })
    }

    /**
     * Get booking options: enabled dinner modes and which action to take.
     * UI counterpart to decideOrderAction - determines available paths of action.
     *
     * Decision matrix:
     * | orderState | canModify | canEditMode | enabledModes        | action    |
     * |------------|-----------|-------------|---------------------|-----------|
     * | BOOKED     | -         | true        | [ALL]               | 'process' |
     * | BOOKED     | -         | false       | [NONE]              | 'process' |
     * | RELEASED   | -         | true        | [ALL]               | 'process' |
     * | RELEASED   | -         | false       | [DINEIN, NONE]      | 'process' |
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
     * @param orderState - Current order state (null if no order exists)
     * @param canModifyOrders - Before booking deadline
     * @param canEditDiningMode - Before dining mode deadline
     * @param dinnerState - Dinner event state (CANCELLED/CONSUMED blocks booking)
     * @param isHouseholdInResidency - Whether household is active on the dinner date
     */
    const getBookingOptions = (
        orderState: OrderState | null,
        canModifyOrders: boolean,
        canEditDiningMode: boolean,
        dinnerState: DinnerState,
        isHouseholdInResidency: boolean
    ): { enabledModes: DinnerMode[], action: BookingRowAction | null } => {
        const {DinnerModeSchema, DinnerStateSchema} = useBookingValidation()
        const DinnerModeEnum = DinnerModeSchema.enum
        const DinnerStateEnum = DinnerStateSchema.enum
        const {OrderStateSchema} = useBookingValidation()
        const OrderStateEnum = OrderStateSchema.enum

        const ALL_MODES: DinnerMode[] = [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY, DinnerModeEnum.NONE]

        // Outside residency period - no booking possible
        if (!isHouseholdInResidency) return { enabledModes: [], action: null }

        // Cancelled/consumed dinner - no booking possible
        if (dinnerState === DinnerStateEnum.CANCELLED || dinnerState === DinnerStateEnum.CONSUMED) {
            return { enabledModes: [], action: null }
        }

        // BOOKED order
        if (orderState === OrderStateEnum.BOOKED) {
            return canEditDiningMode
                ? { enabledModes: ALL_MODES, action: ROW_ACTION.process }
                : { enabledModes: [DinnerModeEnum.NONE], action: ROW_ACTION.process }
        }

        // RELEASED order (can reclaim own)
        if (orderState === OrderStateEnum.RELEASED) {
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
        const {OrderStateSchema} = useBookingValidation()

        const activeOrders = orders.filter(o =>
            o.state === OrderStateSchema.enum.BOOKED || o.state === OrderStateSchema.enum.RELEASED
        )
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
    // Scaffold Result Formatting - Consistent display across UI and logs
    // ============================================================================

    const SCAFFOLD_FIELDS = [
        { key: 'created', symbol: '+', label: 'oprettet', pastLabel: 'blev tilmeldt' },
        { key: 'deleted', symbol: '-', label: 'slettet', pastLabel: 'blev frameldt' },
        { key: 'released', symbol: '↑', label: 'frigivet', pastLabel: 'blev frigivet' },
        { key: 'claimed', symbol: '⇅', label: 'købt fra andre', pastLabel: 'købt fra andre' },
        { key: 'queued', symbol: 'w', label: 'på venteliste', pastLabel: 'kom på ventelisten' },
        { key: 'left', symbol: 'l', label: 'forlader ventelisten', pastLabel: 'forlod ventelisten' },
        { key: 'requeued', symbol: 'r', label: 'ønske på ventelisten opdateret', pastLabel: 'fik ønsket på ventelisten opdateret' },
        { key: 'priceUpdated', symbol: '$', label: 'pris opdateret', pastLabel: 'fik pris opdateret' },
        { key: 'modeUpdated', symbol: 'm', label: 'spisemåde opdateret', pastLabel: 'fik spisemåde opdateret' },
        { key: 'unchanged', symbol: '=', label: 'uændret', pastLabel: 'uændret' },
        { key: 'errored', symbol: '!', label: 'fejlet', pastLabel: 'fejlede' },
    ] as const

    type ScaffoldResultFormat = 'compact' | 'verbose' | 'past'

    /**
     * Format scaffold result for display (toast, logs)
     * - 'verbose' (default): Danish labels for user toasts - "7 oprettet, 179 uændret"
     * - 'compact': Technical symbols for admin/logs - "+7 =179"
     * - 'past': Past tense for confirmation toasts - "7 blev tilmeldt, 2 blev frameldt"
     * Only includes non-zero counts for cleaner output; queued entries carry their places in the queue in words
     */
    const formatScaffoldResult = (
        result: ScaffoldResult,
        format: ScaffoldResultFormat = 'verbose'
    ): string => {
        const places = result.positions.map(p => p.position).sort((a, b) => a - b)
        const placesSuffix = places.length > 0 ? ` (nr. ${places.join(', ')})` : ''
        const parts = SCAFFOLD_FIELDS
            .filter(f => result[f.key] > 0)
            .map(f => {
                if (format === 'compact') return `${f.symbol}${result[f.key]}`
                const suffix = f.key === 'queued' ? placesSuffix : ''
                if (format === 'past') return `${result[f.key]} ${f.pastLabel}${suffix}`
                return `${result[f.key]} ${f.label}${suffix}`
            })

        if (parts.length === 0) {
            return format === 'compact' ? '(ingen)' : 'Der var ingen ændringer i dine bookinger'
        }
        return parts.join(format === 'compact' ? ' ' : ', ')
    }

    // Sums the results of several scaffold runs; the season is the last run's
    const sumScaffoldResults = (results: readonly ScaffoldResult[]): ScaffoldResult => ({
        seasonId: results.at(-1)?.seasonId ?? null,
        ...Object.fromEntries(SCAFFOLD_FIELDS.map(({key}) => [key, sumBy(results, result => result[key])])) as Record<typeof SCAFFOLD_FIELDS[number]['key'], number>,
        positions: results.flatMap(result => result.positions),
        households: sumBy(results, result => result.households),
        outcomes: {
            joined: results.flatMap(result => result.outcomes.joined),
            ticketsSold: results.flatMap(result => result.outcomes.ticketsSold),
            waitlistTicketsSold: results.flatMap(result => result.outcomes.waitlistTicketsSold)
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
        guestGroups: Object.values(groupGuestOrders(orders.filter(o => o.isGuestTicket && o.dinnerEventId === dinnerEventId)))
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
        const {OrderStateSchema} = useBookingValidation()
        const counts = new Map<number, number>()
        for (const order of orders) {
            if (order.state === OrderStateSchema.enum.RELEASED) {
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
     * @returns Map of dinner ID → released ticket counts (null = not locked, {total:0} = locked no tickets)
     */
    const computeLockStatus = (
        dinnerEvents: Array<{ id: number; date: Date }>,
        deadlines: { canModifyOrders: (date: Date) => boolean },
        releasedCountsByDinnerId?: Map<number, ReleasedTicketCounts>
    ): Map<number, ReleasedTicketCounts | null> => {
        const result = new Map<number, ReleasedTicketCounts | null>()
        const emptyCount: ReleasedTicketCounts = { total: 0, formatted: '-' }

        for (const dinner of dinnerEvents) {
            const isLocked = !deadlines.canModifyOrders(dinner.date)
            if (isLocked) {
                result.set(dinner.id, releasedCountsByDinnerId?.get(dinner.id) ?? emptyCount)
            }
        }

        return result
    }

    // ============================================================================
    // Ticket changes (Billetændringer) and the cooking round
    // ============================================================================

    const {TicketTypeSchema} = useBookingValidation()
    const countsBy = (count: (type: TicketType) => number): TicketCounts =>
        Object.fromEntries(TicketTypeSchema.options.map(type => [type, count(type)])) as TicketCounts
    const emptyCounts = (): TicketCounts => countsBy(() => 0)
    const foldCounts = (op: (a: number, b: number) => number) => (a: TicketCounts, b: TicketCounts): TicketCounts =>
        countsBy(type => op(a[type], b[type]))

    // The tickets a dinner holds after a history row; counts, kuverter and revenue are read off this set
    type HeldTicket = Readonly<{key: number, inhabitantId: number | null, type: TicketType | null, price: number, eating: boolean, householdId: number | null, householdShortname: string | null}>
    type HeldTickets = ReadonlyMap<number, HeldTicket>

    const sumOver = (held: HeldTickets, weigh: (ticket: HeldTicket) => number): number => sumBy([...held.values()], weigh)
    const countsOf = (held: HeldTickets): TicketCounts =>
        [...held.values()].reduce((counts, ticket) => ticket.type ? {...counts, [ticket.type]: counts[ticket.type] + 1} : counts, emptyCounts())
    // A ticket released after the booking deadline stays paid and leaves the table: revenue keeps it, kuverter drop it
    const portionsOf = (held: HeldTickets): number =>
        sumOver(held, ticket => ticket.eating && ticket.type ? getPortionsForTicketType(ticket.type) : 0)
    const revenueOf = (held: HeldTickets): number => sumOver(held, ticket => ticket.price)
    const countsPlus = foldCounts((a, b) => a + b)
    const countsMinus = foldCounts((a, b) => a - b)

    const withTicket = (held: HeldTickets, ticket: HeldTicket): HeldTickets => new Map(held).set(ticket.key, ticket)
    const withoutTicket = (held: HeldTickets, key: number): HeldTickets => new Map([...held].filter(([heldKey]) => heldKey !== key))
    const withEating = (held: HeldTickets, ticket: HeldTicket, eating: boolean): HeldTickets => withTicket(held, {...ticket, eating})
    // A creation row whose order is gone keys by its own negative row id and is found by inhabitant
    const findHeld = (held: HeldTickets, orderId: number | null, inhabitantId: number | null): HeldTicket | undefined =>
        (orderId !== null ? held.get(orderId) : undefined)
        ?? [...held.values()].find(ticket => ticket.key < 0 && ticket.inhabitantId === inhabitantId)

    const byTime = byTimeThenId<OrderHistoryDisplay>(row => row.timestamp.getTime())

    /**
     * Replays a dinner's order history in time order into one change per event: the tickets moved by type, the
     * composition after it, the kuverter and the revenue. A change is the difference between the tickets held before
     * and after its row. A ticket price the season no longer names leaves the change without a type. Consecutive
     * changes with the same rendered moment, household and event collect into one change carrying the summed delta.
     */
    const replayTicketChanges = (
        history: OrderHistoryDisplay[],
        ticketTypeOf: (ticketPriceId: number) => TicketType | null,
        householdShortnameOf: (householdId: number) => string | null = () => null
    ): TicketChange[] => {
        const {readAuditTicket, OrderAuditActionSchema, OrderStateSchema} = useBookingValidation()
        const Action = OrderAuditActionSchema.enum
        const typeOf = (ticket: AuditTicket): TicketType | null => ticket.ticketPriceId === null ? null : ticketTypeOf(ticket.ticketPriceId)

        const step = (held: HeldTickets, action: OrderAuditAction, rowId: number, ticket: AuditTicket): HeldTickets => {
            const current = findHeld(held, ticket.orderId, ticket.inhabitantId)
            switch (action) {
                case Action.USER_BOOKED:
                case Action.SYSTEM_CREATED:
                    return current
                        ? withEating(held, current, true)
                        : withTicket(held, {key: ticket.orderId ?? -rowId, inhabitantId: ticket.inhabitantId, type: typeOf(ticket), price: ticket.priceAtBooking, eating: true, householdId: ticket.householdId, householdShortname: ticket.householdShortname})
                case Action.USER_CANCELLED:
                    if (!current) return held
                    return ticket.state === OrderStateSchema.enum.RELEASED ? withEating(held, current, false) : withoutTicket(held, current.key)
                case Action.SYSTEM_DELETED:
                    return current ? withoutTicket(held, current.key) : held
                case Action.USER_CLAIMED:
                    return current ? withEating(held, current, true) : held
                default:
                    return held
            }
        }

        // A batch update's row carries the new scalars only; the ticket it moves names the type and the household
        const toChange = (row: OrderHistoryDisplay, ticket: AuditTicket, before: HeldTickets, after: HeldTickets): TicketChange => {
            const moved = findHeld(before, ticket.orderId, ticket.inhabitantId)
            const householdId = ticket.householdId ?? moved?.householdId ?? null
            return {
                id: row.id,
                timestamp: row.timestamp,
                action: row.action,
                householdShortname: ticket.householdShortname ?? moved?.householdShortname ?? (householdId === null ? null : householdShortnameOf(householdId)),
                ticketType: typeOf(ticket) ?? moved?.type ?? null,
                delta: countsMinus(countsOf(after), countsOf(before)),
                counts: countsOf(after),
                portions: portionsOf(after),
                revenue: revenueOf(after)
            }
        }

        const {changes} = [...history].sort(byTime)
            .map(row => ({row, ticket: readAuditTicket(row)}))
            .filter((entry): entry is {row: OrderHistoryDisplay, ticket: AuditTicket} => entry.ticket !== null && entry.row.action !== Action.SYSTEM_UPDATED)
            .reduce(({held, changes}, {row, ticket}) => {
                const after = step(held, row.action, row.id, ticket)
                return {held: after, changes: [...changes, toChange(row, ticket, held, after)]}
            }, {held: new Map() as HeldTickets, changes: [] as TicketChange[]})
        return collapseByKey(changes)
    }

    /** A moment as the chef reads it: the date mask and the hour */
    const formatMoment = (date: Date): string => formatDate(date, `${DATE_SETTINGS.DATE_MASK} HH:mm`)
    // Every change with the same rendered moment, household and event collects into one: the deltas add up, the last row gives the rest
    const changeKey = (change: TicketChange): string => `${formatMoment(change.timestamp)}|${change.householdShortname ?? ''}|${change.action}`
    const collapseByKey = (changes: TicketChange[]): TicketChange[] =>
        [...groupBy(changeKey)(changes).values()].map(group => ({
            ...group.at(-1)!,
            ticketType: group.every(change => change.ticketType === group[0]!.ticketType) ? group[0]!.ticketType : null,
            delta: group.reduce((sum, change) => countsPlus(sum, change.delta), emptyCounts())
        }))

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
        partitionGuestOrders,
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
