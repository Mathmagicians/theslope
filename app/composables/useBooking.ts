import {useBookingValidation, type DinnerEventDetail, type DinnerEventDisplay, type HeynaboEventCreate, type OrderForTransaction, type OrderDetail, type OrderSnapshot, type OrderDisplay, type DinnerMode, type DesiredOrder, type OrderState, type DinnerState} from '~/composables/useBookingValidation'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useSeason, type SeasonDeadlines} from '~/composables/useSeason'
import {useHousehold} from '~/composables/useHousehold'
import {useTicket} from '~/composables/useTicket'
import type {InhabitantDisplay, HouseholdDisplay} from '~/composables/useCoreValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import type {Season} from '~/composables/useSeasonValidation'
import type {PruneAndCreateResult} from '~/utils/batchUtils'
import {calculateCountdown} from '~/utils/date'
import {dateToWeekDay} from '~/utils/season'
import {ICONS} from '~/composables/useTheSlopeDesignSystem'
import {chunkArray} from '~/utils/batchUtils'
import type {TransactionCreateData} from '~~/server/data/financesRepository'

// ============================================================================
// Order Decision - Pure function for categorizing booking intent
// ============================================================================

/**
 * Bucket types for order decisions.
 * Extends standard CRUD buckets with 'claim' for marketplace claiming.
 */
export type OrderBucket = 'create' | 'update' | 'delete' | 'idempotent' | 'claim'

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
 * Extends PruneAndCreateResult with 'claim' bucket for marketplace claiming.
 */
export type OrderBucketResult<T = DesiredOrder> = PruneAndCreateResult<T> & {
    claim: T[]
}

/**
 * Input for order decision: the desired order plus context for deadline enforcement
 */
export type OrderDecisionInput = {
    desired: DesiredOrder
    existing: OrderDisplay | null
    beforeCancellationDeadline: boolean
    canEditMode: boolean
    /** Released tickets available for this event+price (for claim past deadline) */
    hasReleasedTickets: boolean
}

/**
 * Determine action for new booking (no existing order).
 * Shared logic used by both getBookingOptions (UI) and decideOrderAction (generator).
 *
 * @param canModifyOrders - Before booking deadline (can create new orders)
 * @param hasReleasedTickets - Released tickets available to claim
 * @returns 'process' (create), 'claim', or null (no capacity)
 */
export const getNewOrderAction = (
    canModifyOrders: boolean,
    hasReleasedTickets: boolean
): 'process' | 'claim' | null => {
    if (canModifyOrders) return 'process'
    if (hasReleasedTickets) return 'claim'
    return null
}

/**
 * Pure decision function for categorizing user booking intent into buckets.
 * Generator decides bucket AND sets state. Scaffolder just executes.
 *
 * Decision matrix:
 * - No orderId + NONE → null (skip)
 * - No orderId + eating + before deadline → create (state: BOOKED)
 * - No orderId + eating + after deadline + released available → claim (state: BOOKED)
 * - No orderId + eating + after deadline + no released → null (no capacity)
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
    const { desired, existing, beforeCancellationDeadline, canEditMode, hasReleasedTickets } = input
    const isNone = desired.dinnerMode === DinnerMode.NONE

    // No orderId = new order intent
    if (!desired.orderId) {
        if (isNone) return null // Skip: no order to create for NONE

        const action = getNewOrderAction(beforeCancellationDeadline, hasReleasedTickets)
        if (action === 'process') return { bucket: 'create', order: { ...desired, state: OrderState.BOOKED } }
        if (action === 'claim') return { bucket: 'claim', order: { ...desired, state: OrderState.BOOKED } }
        return null
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
 * Resolve desired orders into C/U/D/I/claim buckets with expected states.
 * Uses decideOrderAction for each order to determine bucket and state.
 *
 * @param desiredOrders - Orders with intent (may or may not have orderId)
 * @param existingOrders - Current orders from DB (have id)
 * @param dinnerEventById - Lookup for dinner event dates
 * @param canModifyOrders - Deadline check for cancellation
 * @param canEditDiningMode - Deadline check for mode changes
 * @param releasedByEventAndPrice - Set of "eventId-priceId" keys where released tickets exist
 */
export const resolveDesiredOrdersToBuckets = (
    desiredOrders: DesiredOrder[],
    existingOrders: OrderDisplay[],
    dinnerEventById: Map<number, { date: Date }>,
    canModifyOrders: (date: Date) => boolean,
    canEditDiningMode: (date: Date) => boolean,
    DinnerMode: { NONE: DinnerMode },
    OrderState: { BOOKED: OrderState; RELEASED: OrderState },
    releasedByEventAndPrice: Set<string> = new Set()
): OrderBucketResult<DesiredOrder> => {
    const existingById = new Map(existingOrders.map(o => [o.id, o]))

    const result: OrderBucketResult<DesiredOrder> = {
        create: [],
        update: [],
        delete: [],
        idempotent: [],
        claim: []
    }

    for (const desired of desiredOrders) {
        const de = dinnerEventById.get(desired.dinnerEventId)
        if (!de) {
            throw new Error(`Dinner event ${desired.dinnerEventId} not found in season dinner events`)
        }

        const existing = desired.orderId ? existingById.get(desired.orderId) ?? null : null
        const key = `${desired.dinnerEventId}-${desired.ticketPriceId}`

        const decision = decideOrderAction(
            {
                desired,
                existing,
                beforeCancellationDeadline: canModifyOrders(de.date),
                canEditMode: canEditDiningMode(de.date),
                hasReleasedTickets: releasedByEventAndPrice.has(key)
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
 */
export const resolveOrdersFromPreferencesToBuckets = (
    season: Season,
    household: HouseholdDisplay,
    existingOrders: OrderDisplay[],
    confirmedKeys: Set<string> = new Set(),
    cancelledKeys: Set<string> = new Set(),
    releasedByEventAndPrice: Set<string> = new Set()
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

    const result = resolveDesiredOrdersToBuckets(
        desiredOrders,
        existingOrders,
        dinnerEventById,
        canModifyOrders,
        canEditDiningMode,
        DinnerMode,
        OrderState,
        releasedByEventAndPrice
    )

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

        // User-intent orders: preserve (confirmed = user wants it, cancelled = user released it)
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

        // True orphan order (no user intent) - add to delete bucket
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
// Deadline Badge Factories - Create badge data for display
// ============================================================================

export interface DeadlineBadgeData {
    label: string
    icon: string
    color: 'success' | 'error' | 'warning' | 'neutral'
    value: string       // Badge text
    helpText: string
    step?: number       // Chef stepper: which step this badge belongs to
    alarm?: AlarmLevel  // Chef stepper: alarm level for conditional display
}

/**
 * Released ticket counts with pre-formatted breakdown
 * Used for deadline badges to show "2V 1B" format
 */
export interface ReleasedTicketCounts {
    total: number
    formatted: string  // Pre-computed by formatTicketCounts, e.g., "2V 1B"
}

/**
 * Create booking deadline badge data
 * @param isOpen - Whether booking is still open (canModifyOrders)
 * @param releasedCounts - Released ticket counts with formatted breakdown (optional)
 */
export const createBookingBadge = (isOpen: boolean, releasedCounts?: ReleasedTicketCounts): DeadlineBadgeData => {
    const hasTickets = !isOpen && releasedCounts !== undefined && releasedCounts.total > 0
    return {
        label: DEADLINE_LABELS.BOOKING_CLOSED.label,
        icon: isOpen ? ICONS.lockOpen : (hasTickets ? ICONS.released : ICONS.lockClosed),
        color: isOpen ? 'success' : (hasTickets ? 'warning' : 'error'),
        value: isOpen ? 'Åben' : (hasTickets ? `${releasedCounts!.formatted} ledig${releasedCounts!.total === 1 ? '' : 'e'}` : 'Lukket'),
        helpText: isOpen
            ? DEADLINE_LABELS.BOOKING_CLOSED.openText
            : (hasTickets ? DEADLINE_LABELS.BOOKING_CLOSED.availableText(releasedCounts!.total) : DEADLINE_LABELS.BOOKING_CLOSED.closedText)
    }
}

/**
 * Create dining mode deadline badge data.
 * Shows urgency (yellow/red) when < 24h and still open.
 */
export const createDiningModeBadge = (
    isOpen: boolean,
    countdown?: { hours: number; formatted: string }
): DeadlineBadgeData => {
    // Show urgency when open and < 24h
    if (isOpen && countdown && countdown.hours > 0 && countdown.hours < 24) {
        return {
            label: DEADLINE_LABELS.DINING_MODE.label,
            icon: ICONS.lockOpen,
            color: countdown.hours < 1 ? 'error' : 'warning',
            value: `lukker om ${countdown.formatted.toLowerCase()}`,
            helpText: DEADLINE_LABELS.DINING_MODE.openText
        }
    }
    return {
        label: DEADLINE_LABELS.DINING_MODE.label,
        icon: isOpen ? ICONS.lockOpen : ICONS.lockClosed,
        color: isOpen ? 'success' : 'error',
        value: isOpen ? 'Åben' : 'Lukket',
        helpText: isOpen ? DEADLINE_LABELS.DINING_MODE.openText : DEADLINE_LABELS.DINING_MODE.closedText
    }
}

/**
 * Create booking view badges (for DinnerBookingForm, BookingGridView)
 */
export const createBookingBadges = (
    dinnerEvent: DinnerEventDisplay,
    deadlines: SeasonDeadlines,
    releasedCounts?: ReleasedTicketCounts
): { booking: DeadlineBadgeData; diningMode: DeadlineBadgeData } => {
    const diningModeCountdown = calculateCountdown(deadlines.getDiningModeDeadlineTime(dinnerEvent.date))
    return {
        booking: createBookingBadge(deadlines.canModifyOrders(dinnerEvent.date), releasedCounts),
        diningMode: createDiningModeBadge(deadlines.canEditDiningMode(dinnerEvent.date), diningModeCountdown)
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
export const CONSUMABLE_DINNER_STATES = ['SCHEDULED', 'ANNOUNCED'] as const

/**
 * Order states eligible for closing by daily maintenance.
 * Business rule: BOOKED and RELEASED orders on CONSUMED dinners become CLOSED.
 * CANCELLED orders are excluded (dinner was cancelled, already refunded).
 */
export const CLOSABLE_ORDER_STATES = ['BOOKED', 'RELEASED'] as const

// ============================================================================
// Action Preview Types - Show users what will happen before they save
// ============================================================================

export type ActionType = 'create' | 'delete' | 'release' | 'reclaim' | 'claim' | 'updateMode'

export interface ActionPreviewItem {
    name: string
    action: ActionType
    icon: string
    color: 'primary' | 'error' | 'info' | 'neutral'
    text: string
}

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
    icon: string
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
        icon: ICONS.calendar,
        text: DEADLINE_LABELS.SCHEDULED.closedText,
        getDeadline: noDeadline()
    },
    [DinnerStepState.ANNOUNCED]: {
        step: 1,
        title: 'Publiceret',
        icon: ICONS.megaphone,
        text: DEADLINE_LABELS.ANNOUNCED.closedText,
        getDeadline: userActionDeadline(DEADLINE_LABELS.ANNOUNCED.deadlinePrefix)
    },
    [DinnerStepState.BOOKING_CLOSED]: {
        step: 2,
        title: 'Framelding',
        icon: ICONS.ticket,
        text: DEADLINE_LABELS.BOOKING_CLOSED.closedText,
        getDeadline: systemDeadline(DEADLINE_LABELS.BOOKING_CLOSED.deadlinePrefix)
    },
    [DinnerStepState.GROCERIES_DONE]: {
        step: 3,
        title: 'Madbestilling klar',
        icon: ICONS.shoppingCart,
        text: DEADLINE_LABELS.GROCERIES_DONE.closedText,
        getDeadline: userActionDeadline(DEADLINE_LABELS.GROCERIES_DONE.deadlinePrefix)
    },
    [DinnerStepState.CONSUMED]: {
        step: 4,
        title: 'Afholdt',
        icon: ICONS.checkCircle,
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
    const {formatNameWithInitials} = useHousehold()
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
     * | orderState | canModify | canEditMode | releasedAvail | enabledModes        | action    |
     * |------------|-----------|-------------|---------------|---------------------|-----------|
     * | BOOKED     | -         | true        | -             | [ALL]               | 'process' |
     * | BOOKED     | -         | false       | -             | [NONE]              | 'process' |
     * | RELEASED   | -         | true        | -             | [ALL]               | 'process' |
     * | RELEASED   | -         | false       | -             | [DINEIN, NONE]      | 'process' |
     * | null       | true      | -           | -             | [ALL]               | 'process' |
     * | null       | false     | -           | true          | [DINEIN]            | 'claim'   |
     * | null       | false     | -           | false         | []                  | null      |
     * | CANCELLED/CONSUMED dinner          | []                  | null      |
     *
     * For "add new" (guest) context: caller filters out NONE from enabledModes.
     *
     * @param orderState - Current order state (null if no order exists)
     * @param canModifyOrders - Before booking deadline
     * @param canEditDiningMode - Before dining mode deadline
     * @param dinnerState - Dinner event state (CANCELLED/CONSUMED blocks booking)
     * @param hasReleasedTickets - Released tickets available to claim
     */
    const getBookingOptions = (
        orderState: OrderState | null,
        canModifyOrders: boolean,
        canEditDiningMode: boolean,
        dinnerState: DinnerState,
        hasReleasedTickets: boolean
    ): { enabledModes: DinnerMode[], action: 'process' | 'claim' | null } => {
        const {DinnerModeSchema, DinnerStateSchema} = useBookingValidation()
        const DinnerModeEnum = DinnerModeSchema.enum
        const DinnerStateEnum = DinnerStateSchema.enum
        const {OrderStateSchema} = useBookingValidation()
        const OrderStateEnum = OrderStateSchema.enum

        const ALL_MODES: DinnerMode[] = [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY, DinnerModeEnum.NONE]

        // Cancelled/consumed dinner - no booking possible
        if (dinnerState === DinnerStateEnum.CANCELLED || dinnerState === DinnerStateEnum.CONSUMED) {
            return { enabledModes: [], action: null }
        }

        // BOOKED order
        if (orderState === OrderStateEnum.BOOKED) {
            return canEditDiningMode
                ? { enabledModes: ALL_MODES, action: 'process' }
                : { enabledModes: [DinnerModeEnum.NONE], action: 'process' }
        }

        // RELEASED order (can reclaim own)
        if (orderState === OrderStateEnum.RELEASED) {
            return canEditDiningMode
                ? { enabledModes: ALL_MODES, action: 'process' }
                : { enabledModes: [DinnerModeEnum.DINEIN, DinnerModeEnum.NONE], action: 'process' }
        }

        // No order - use shared decision logic
        const action = getNewOrderAction(canModifyOrders, hasReleasedTickets)
        if (action === 'process') return { enabledModes: ALL_MODES, action }
        if (action === 'claim') {
            // Claims respect canEditDiningMode, but exclude NONE (can't claim and immediately release)
            const EATING_MODES: DinnerMode[] = [DinnerModeEnum.DINEIN, DinnerModeEnum.DINEINLATE, DinnerModeEnum.TAKEAWAY]
            return canEditDiningMode
                ? { enabledModes: EATING_MODES, action }
                : { enabledModes: [DinnerModeEnum.DINEIN], action }
        }
        return { enabledModes: [], action: null }
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
            totalPrice: activeOrders.reduce((sum, o) => sum + o.priceAtBooking, 0)
        }
    }

    // ============================================================================
    // Booking Toast Titles - Consistent UX across pages
    // ============================================================================

    const BOOKING_TOAST_TITLES = {
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
        { key: 'claimed', symbol: '⇅', label: 'købt fra andre', pastLabel: 'købte fra andre' },
        { key: 'claimRejected', symbol: '✗', label: 'køb fra andre afvist', pastLabel: 'køb fra andre afvist' },
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
     * Only includes non-zero counts for cleaner output
     */
    const formatScaffoldResult = (
        result: ScaffoldResult,
        format: ScaffoldResultFormat = 'verbose'
    ): string => {
        const parts = SCAFFOLD_FIELDS
            .filter(f => result[f.key] > 0)
            .map(f => {
                if (format === 'compact') return `${f.symbol}${result[f.key]}`
                if (format === 'past') return `${result[f.key]} ${f.pastLabel}`
                return `${result[f.key]} ${f.label}`
            })

        if (parts.length === 0) {
            return format === 'compact' ? '(ingen)' : 'Der var ingen ændringer i dine bookinger'
        }
        return parts.join(format === 'compact' ? ' ' : ', ')
    }

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
        releasedByEventAndPrice: Set<string> = new Set()
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
            releasedByEventAndPrice
        )
    }

    // ============================================================================
    // Action Preview - Show users what will happen before they save
    // NOTE: useOrder() is called lazily inside formatActionPreview to avoid
    // server-side issues (useOrder relies on Nuxt auto-imports unavailable on server)
    // ============================================================================

    const ACTION_PREVIEW = {
        create:     { icon: ICONS.plusCircle, template: (n: string) => `${n} tilmeldes` },
        delete:     { icon: ICONS.xMark,      template: (n: string) => `${n} frameldes` },
        release:    { icon: ICONS.released,   template: (n: string) => `${n}s billet frigives` },
        reclaim:    { icon: ICONS.undo,       template: (n: string) => `${n} tilmeldes igen` },
        claim:      { icon: ICONS.claim,      template: (n: string) => `${n} køber fra andre` },
        updateMode: { icon: ICONS.edit,       template: (n: string) => `${n} opdaterer spisning` }
    } as const

    type BucketKey = keyof OrderBucketResult<DesiredOrder>

    const BUCKET_TO_ACTION: Record<Exclude<BucketKey, 'idempotent' | 'update'>, ActionType> = {
        create: 'create',
        delete: 'delete',
        claim: 'claim'
    }

    const getUpdateAction = (
        order: DesiredOrder,
        existingById: Map<number, OrderDisplay>,
        OrderState: { RELEASED: OrderState }
    ): ActionType => {
        const existing = order.orderId ? existingById.get(order.orderId) : null
        if (order.state === OrderState.RELEASED) return 'release'
        if (existing?.state === OrderState.RELEASED) return 'reclaim'
        return 'updateMode'
    }

    const formatActionPreview = (
        buckets: OrderBucketResult<DesiredOrder>,
        existingOrders: OrderDisplay[],
        getInhabitantName: (id: number) => string
    ): ActionPreviewItem[] => {
        // Lazy import: useOrder relies on Nuxt auto-imports, only available client-side
        const {orderStateConfig, formatGuestLabel} = useOrder()
        const {OrderStateSchema} = useBookingValidation()
        const OrderStateEnum = OrderStateSchema.enum
        const existingById = new Map(existingOrders.map(o => [o.id, o]))

        // Map action types to order states for color lookup
        const ACTION_TO_STATE = {
            create:     OrderStateEnum.BOOKED,
            delete:     OrderStateEnum.CANCELLED,
            release:    OrderStateEnum.RELEASED,
            reclaim:    OrderStateEnum.BOOKED,
            claim:      'claimed' as const,
            updateMode: OrderStateEnum.CLOSED
        } as const

        const getActionColor = (action: ActionType) => orderStateConfig[ACTION_TO_STATE[action]].color

        const toItem = (order: DesiredOrder, action: ActionType): ActionPreviewItem => {
            // For guests: "Gæst af {bookerName}", for regular: inhabitant name
            const bookerName = getInhabitantName(order.inhabitantId)
            const name = order.isGuestTicket ? formatGuestLabel(bookerName) : bookerName
            const config = ACTION_PREVIEW[action]
            return { name, action, icon: config.icon, color: getActionColor(action), text: config.template(name) }
        }

        const simpleItems = (Object.entries(BUCKET_TO_ACTION) as [BucketKey, ActionType][])
            .flatMap(([bucket, action]) => buckets[bucket].map(order => toItem(order, action)))

        const updateItems = buckets.update.map(order =>
            toItem(order, getUpdateAction(order, existingById, OrderStateSchema.enum))
        )

        return [...simpleItems, ...updateItems]
    }

    const hasChanges = (buckets: OrderBucketResult<DesiredOrder>): boolean =>
        buckets.create.length + buckets.delete.length + buckets.update.length + buckets.claim.length > 0

    const countChanges = (buckets: OrderBucketResult<DesiredOrder>): number =>
        buckets.create.length + buckets.delete.length + buckets.update.length + buckets.claim.length

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

    /**
     * Create chef workflow badges for a dinner event.
     * Each badge uses countdown to its specific deadline (from SeasonDeadlines time getters).
     */
    const createChefBadges = (
        dinnerEvent: DinnerEventDisplay,
        deadlines: SeasonDeadlines,
        releasedCounts?: ReleasedTicketCounts
    ): Map<number, DeadlineBadgeData> => {
        const {ALARM_TO_BADGE} = useTheSlopeDesignSystem()
        const {getCookingDeadlineThresholds} = useSeason()
        const thresholds = getCookingDeadlineThresholds()

        // Each badge counts to its specific deadline
        const menuCountdown = calculateCountdown(deadlines.getMenuDeadlineTime(dinnerEvent.date))
        const bookingCountdown = calculateCountdown(deadlines.getBookingDeadlineTime(dinnerEvent.date))
        const dinnerCountdown = calculateCountdown(deadlines.getDinnerStartTime(dinnerEvent.date))

        const menuDone = dinnerEvent.state === DinnerState.ANNOUNCED ||
            (dinnerEvent.state === DinnerState.CONSUMED && dinnerEvent.heynaboEventId !== null)

        const badge = (
            step: number,
            key: keyof typeof DEADLINE_LABELS,
            state: DinnerStepState,
            done: boolean,
            countdown: { hours: number; formatted: string }
        ): DeadlineBadgeData => {
            const labels = DEADLINE_LABELS[key]
            const result = DINNER_STEP_MAP[state].getDeadline(countdown, thresholds)
            const alarm = done ? -1 : result.alarm
            const b = ALARM_TO_BADGE[alarm]
            const text = done ? labels.closedText : labels.openText
            return {
                step, alarm,
                label: 'label' in labels ? labels.label : '',
                icon: b.icon,
                value: done ? '' : result.description,
                color: b.color as 'success' | 'error' | 'warning' | 'neutral',
                helpText: text
            }
        }

        const bookingOpen = deadlines.canModifyOrders(dinnerEvent.date)

        // Booking badge: reuse createBookingBadge (DRY) + add countdown when open
        const baseBadge = createBookingBadge(bookingOpen, releasedCounts)
        const bookingResult = DINNER_STEP_MAP[DinnerStepState.BOOKING_CLOSED].getDeadline(bookingCountdown, thresholds)
        const bookingBadge: DeadlineBadgeData = {
            ...baseBadge,
            step: 2,
            alarm: bookingOpen ? bookingResult.alarm : -1,
            value: bookingOpen ? bookingResult.description : baseBadge.value
        }

        return new Map([
            [1, badge(1, 'ANNOUNCED', DinnerStepState.ANNOUNCED, menuDone, menuCountdown)],
            [2, bookingBadge],
            [3, badge(3, 'GROCERIES_DONE', DinnerStepState.GROCERIES_DONE, dinnerEvent.totalCost > 0, dinnerCountdown)],
            [4, badge(4, 'CONSUMED', DinnerStepState.CONSUMED, dinnerEvent.state === DinnerState.CONSUMED, dinnerCountdown)]
        ])
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
        // Deadline Badge Factories
        createBookingBadges,
        createChefBadges,
        // Guest Booking
        buildGuestOrder,
        groupGuestOrders,
        partitionGuestOrders,
        // Scaffold Result Formatting
        formatScaffoldResult,
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
        ACTION_PREVIEW,
        formatActionPreview,
        hasChanges,
        countChanges
    }
}
