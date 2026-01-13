import {useBookingValidation, type DinnerEventDetail, type DinnerEventDisplay, type HeynaboEventCreate, type OrderForTransaction, type OrderDetail, type OrderSnapshot, type OrderDisplay, type DinnerMode, type DesiredOrder, type OrderState} from '~/composables/useBookingValidation'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useSeason} from '~/composables/useSeason'
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
 * Result of order decision: which bucket and the order with state set.
 * null = skip (no action needed, e.g., no orderId + NONE)
 */
export type OrderDecision = {
    bucket: keyof PruneAndCreateResult<DesiredOrder>
    order: DesiredOrder
} | null

/**
 * Input for order decision: the desired order plus context for deadline enforcement
 */
export type OrderDecisionInput = {
    desired: DesiredOrder
    existing: OrderDisplay | null
    beforeCancellationDeadline: boolean
    canEditMode: boolean
}

/**
 * Pure decision function for categorizing user booking intent into C/U/D/I buckets.
 * Generator decides bucket AND sets state. Scaffolder just executes.
 *
 * Decision matrix:
 * - No orderId + eating mode → create (state: BOOKED)
 * - No orderId + NONE → null (skip)
 * - orderId + NONE + before deadline → delete
 * - orderId + NONE + after deadline → update (state: RELEASED)
 * - orderId + RELEASED + eating mode → update (state: BOOKED, reclaim)
 * - orderId + eating mode + unchanged → idempotent (state: BOOKED)
 * - orderId + eating mode + changed → update (state: BOOKED)
 */
export const decideOrderAction = (
    input: OrderDecisionInput,
    DinnerMode: { NONE: DinnerMode },
    OrderState: { BOOKED: OrderState; RELEASED: OrderState }
): OrderDecision => {
    const { desired, existing, beforeCancellationDeadline, canEditMode } = input
    const isNone = desired.dinnerMode === DinnerMode.NONE

    // No orderId = new order intent
    if (!desired.orderId) {
        if (isNone) return null // Skip: no order to create for NONE
        return { bucket: 'create', order: { ...desired, state: OrderState.BOOKED } }
    }

    // Has orderId but no existing = data integrity error
    if (!existing) {
        throw new Error(`Order ${desired.orderId} not found in existing orders`)
    }

    // NONE mode = cancellation
    if (isNone) {
        if (beforeCancellationDeadline) {
            return { bucket: 'delete', order: desired }
        }
        // After deadline: release BOOKED orders, idempotent for already-RELEASED
        if (existing.state === OrderState.RELEASED) {
            return { bucket: 'idempotent', order: { ...desired, dinnerMode: DinnerMode.NONE, state: existing.state } }
        }
        return { bucket: 'update', order: { ...desired, state: OrderState.RELEASED } }
    }

    // Reclaim: existing RELEASED + eating mode → update back to BOOKED
    if (existing.state === OrderState.RELEASED) {
        return { bucket: 'update', order: { ...desired, state: OrderState.BOOKED } }
    }

    // Eating mode on BOOKED order - check if changed
    const effectiveMode = canEditMode ? desired.dinnerMode : existing.dinnerMode
    const modeChanged = existing.dinnerMode !== effectiveMode
    const priceChanged = existing.ticketPriceId !== desired.ticketPriceId

    if (modeChanged || priceChanged) {
        return { bucket: 'update', order: { ...desired, dinnerMode: effectiveMode, state: OrderState.BOOKED } }
    }

    // Idempotent - preserve existing state and use effectiveMode to respect deadline enforcement
    return { bucket: 'idempotent', order: { ...desired, dinnerMode: effectiveMode, state: existing.state } }
}

/**
 * Resolve desired orders into C/U/D/I buckets with expected states.
 * Uses decideOrderAction for each order to determine bucket and state.
 *
 * @param desiredOrders - Orders with intent (may or may not have orderId)
 * @param existingOrders - Current orders from DB (have id)
 * @param dinnerEventById - Lookup for dinner event dates
 * @param canModifyOrders - Deadline check for cancellation
 * @param canEditDiningMode - Deadline check for mode changes
 */
export const resolveDesiredOrdersToBuckets = (
    desiredOrders: DesiredOrder[],
    existingOrders: OrderDisplay[],
    dinnerEventById: Map<number, { date: Date }>,
    canModifyOrders: (date: Date) => boolean,
    canEditDiningMode: (date: Date) => boolean,
    DinnerMode: { NONE: DinnerMode },
    OrderState: { BOOKED: OrderState; RELEASED: OrderState }
): PruneAndCreateResult<DesiredOrder> => {
    const existingById = new Map(existingOrders.map(o => [o.id, o]))

    const result: PruneAndCreateResult<DesiredOrder> = {
        create: [],
        update: [],
        delete: [],
        idempotent: []
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

/**
 * Generate DesiredOrder[] from inhabitant preferences for system scaffolding.
 * Unified loop handles: guest preservation, excluded keys, and preference-based orders.
 */
export const generateDesiredOrdersFromPreferences = (
    inhabitants: InhabitantDisplay[],
    dinnerEvents: DinnerEventDisplay[],
    existingOrders: OrderDisplay[],
    excludedKeys: Set<string>,
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

            // Excluded key: skip new creation, but let existing flow through for update/release
            if (excludedKeys.has(key) && !existing) {
                continue
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
    cancelledKeys: Set<string> = new Set()
): PruneAndCreateResult<DesiredOrder> => {
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
        OrderState
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

        // Orphan order - add to delete bucket (ticketPriceId/state not used for deletes)
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
        openText: 'Chefkokken skal publicere sin menu',
        closedText: 'Chefkokken har publiceret sin menu',
        deadlinePrefix: 'om'
    },
    BOOKING_CLOSED: {
        label: 'Framelding',
        openText: 'Man kan ændre sin tilmelding',
        closedText: 'Man kan ikke længere framelde sig',
        deadlinePrefix: 'åben de næste'
    },
    GROCERIES_DONE: {
        label: 'Indkøb',
        openText: 'Chefkokken skal bestille madvarer',
        closedText: 'Chefkokken har bestilt madvarer',
        deadlinePrefix: 'om'
    },
    CONSUMED: {
        label: 'Spisning',
        openText: 'Fællesspisning forude',
        closedText: 'Vi har spist den dejlige mad',
        deadlinePrefix: 'om'
    }
} as const

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
    icon: string
    text: string
    getDeadline: (countdown: { hours: number; formatted: string }, isPastMenuDeadline: boolean, thresholds: { warning: number; critical: number }) => StepDeadlineResult
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

// User action deadline: g/y/r/💀 (overdue shows skull with "mangler")
const userActionDeadline = (prefix: string): StepConfig['getDeadline'] =>
    (countdown, isPastDeadline, thresholds) => {
        if (isPastDeadline || countdown.hours <= 0) return { description: 'mangler', alarm: 3 }
        const alarm = getAlarmLevel(countdown, thresholds)
        return { description: prefix ? `${prefix} ${countdown.formatted.toLowerCase()}` : '', alarm }
    }

// System deadline: g/y/r/neutral (overdue shows neutral, not skull)
const systemDeadline = (prefix: string): StepConfig['getDeadline'] =>
    (countdown, _, thresholds) => {
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
        title: 'Lukket for ændringer',
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
    // getNextDinnerDate is pre-configured with dinner duration
    const {getDefaultDinnerStartTime, getNextDinnerDate} = useSeason()
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
        deadlines: { canModifyOrders: (date: Date) => boolean, isAnnounceMenuPastDeadline: (date: Date) => boolean }
    ): StepDeadlineResult => {
        const {getDinnerTimeRange, getDefaultDinnerStartTime, getCookingDeadlineThresholds} = useSeason()
        const config = getStepConfig(dinnerEvent, deadlines)
        const thresholds = getCookingDeadlineThresholds()

        const dinnerTimeRange = getDinnerTimeRange(dinnerEvent.date, getDefaultDinnerStartTime(), 0)
        const countdown = calculateCountdown(dinnerTimeRange.start)
        const isPastMenuDeadline = deadlines.isAnnounceMenuPastDeadline(dinnerEvent.date)

        return config.getDeadline(countdown, isPastMenuDeadline, thresholds)
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
     * Reuses DINNER_STEP_MAP.getDeadline() logic from DinnerDeadlineBadges.
     *
     * @returns AlarmLevel: -1 (all done), 0 (on track), 1 (warning), 2 (critical), 3 (overdue)
     */
    const getChefDeadlineAlarm = (
        dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'date' | 'totalCost' | 'heynaboEventId'>,
        deadlines: { isAnnounceMenuPastDeadline: (date: Date) => boolean }
    ): AlarmLevel => {
        const {getDinnerTimeRange, getDefaultDinnerStartTime, getCookingDeadlineThresholds} = useSeason()
        const thresholds = getCookingDeadlineThresholds()
        const dinnerTimeRange = getDinnerTimeRange(dinnerEvent.date, getDefaultDinnerStartTime(), 0)
        const countdown = calculateCountdown(dinnerTimeRange.start)
        const isPastDeadline = deadlines.isAnnounceMenuPastDeadline(dinnerEvent.date)

        const alarms: AlarmLevel[] = []

        // Menu badge - same logic as DinnerDeadlineBadges.menuBadge
        const menuDone = dinnerEvent.state === DinnerState.ANNOUNCED ||
                        (dinnerEvent.state === DinnerState.CONSUMED && dinnerEvent.heynaboEventId !== null)
        if (!menuDone) {
            alarms.push(DINNER_STEP_MAP[DinnerStepState.ANNOUNCED].getDeadline(countdown, isPastDeadline, thresholds).alarm)
        }

        // Groceries badge - same logic as DinnerDeadlineBadges.groceriesDoneBadge
        const groceriesDone = dinnerEvent.totalCost > 0
        if (!groceriesDone) {
            alarms.push(DINNER_STEP_MAP[DinnerStepState.GROCERIES_DONE].getDeadline(countdown, isPastDeadline, thresholds).alarm)
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

        // Use pre-configured getNextDinnerDate (duration already baked in from useSeason)
        // Same pattern as DinnerCalendarDisplay line 73
        const dinnerTimeRange = getNextDinnerDate([dinnerEvent.date], getDefaultDinnerStartTime())!

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

        const {splitDinnerEvents} = useSeason()
        const dinnerDates = pendingDinners.map(d => d.date)
        const nextDinnerRange = getNextDinnerDate(dinnerDates, getDefaultDinnerStartTime())
        const {pastDinnerDates} = splitDinnerEvents(pendingDinners, nextDinnerRange)

        return pendingDinners
            .filter(d => pastDinnerDates.some(pd => pd.getTime() === d.date.getTime()))
            .map(d => d.id)
    }

    /**
     * Prepare transaction data from closed orders.
     */
    const prepareTransactionData = (closedOrders: OrderForTransaction[]): TransactionCreateData[] => {
        const {serializeTransaction} = useBillingValidation()

        return closedOrders.map(order => ({
            orderId: order.id,
            orderSnapshot: serializeTransaction({
                dinnerEvent: order.dinnerEvent,
                inhabitant: order.inhabitant,
                ticketType: order.ticketType
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

    // ============================================================================
    // Scaffold Result Formatting - Consistent display across UI and logs
    // ============================================================================

    const SCAFFOLD_FIELDS = [
        { key: 'created', symbol: '+', label: 'oprettet' },
        { key: 'deleted', symbol: '-', label: 'slettet' },
        { key: 'released', symbol: '~', label: 'frigivet' },
        { key: 'priceUpdated', symbol: '$', label: 'pris opdateret' },
        { key: 'modeUpdated', symbol: 'm', label: 'mode opdateret' },
        { key: 'unchanged', symbol: '=', label: 'uændret' },
        { key: 'errored', symbol: '!', label: 'fejlet' },
    ] as const

    type ScaffoldResultFormat = 'compact' | 'verbose'

    /**
     * Format scaffold result for display (toast, logs)
     * - 'verbose' (default): Danish labels for user toasts - "7 oprettet, 179 uændret"
     * - 'compact': Technical symbols for admin/logs - "+7 =179"
     * Only includes non-zero counts for cleaner output
     */
    const formatScaffoldResult = (
        result: Pick<ScaffoldResult, 'created' | 'deleted' | 'released' | 'priceUpdated' | 'modeUpdated' | 'unchanged' | 'errored'>,
        format: ScaffoldResultFormat = 'verbose'
    ): string => {
        const parts = SCAFFOLD_FIELDS
            .filter(f => result[f.key] > 0)
            .map(f => format === 'compact'
                ? `${f.symbol}${result[f.key]}`
                : `${result[f.key]} ${f.label}`)

        if (parts.length === 0) {
            return format === 'compact' ? '(ingen)' : 'Ingen ændringer i bookinger'
        }
        return parts.join(format === 'compact' ? ' ' : ', ')
    }

    // ============================================================================
    // Lock Status - Compute booking lock status for calendar display
    // ============================================================================

    /**
     * Compute lock status map for dinner events
     *
     * @param dinnerEvents - Dinner events to check
     * @param deadlines - Season deadlines from deadlinesForSeason()
     * @param releasedOrdersByDinnerId - Map of dinner ID → count of RELEASED orders (tickets for sale)
     * @returns Map of dinner ID → released ticket count (null = not locked, 0 = locked no tickets, >0 = locked with tickets)
     */
    const computeLockStatus = (
        dinnerEvents: Array<{ id: number; date: Date }>,
        deadlines: { canModifyOrders: (date: Date) => boolean },
        releasedOrdersByDinnerId?: Map<number, number>
    ): Map<number, number | null> => {
        const result = new Map<number, number | null>()

        for (const dinner of dinnerEvents) {
            const isLocked = !deadlines.canModifyOrders(dinner.date)
            if (isLocked) {
                result.set(dinner.id, releasedOrdersByDinnerId?.get(dinner.id) ?? 0)
            }
        }

        return result
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
        // Scaffold Result Formatting
        formatScaffoldResult,
        // Lock Status
        computeLockStatus
    }
}
