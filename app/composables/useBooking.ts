import {useBookingValidation, type DinnerEventDetail, type HeynaboEventCreate, type OrderForTransaction} from '~/composables/useBookingValidation'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useSeason} from '~/composables/useSeason'
import {calculateCountdown} from '~/utils/date'
import {ICONS} from '~/composables/useTheSlopeDesignSystem'
import {chunkArray} from '~/utils/batchUtils'
import type {TransactionCreateData} from '~~/server/data/financesRepository'

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
    MENU: {
        label: 'Menu',
        openText: 'Venter på chefkokken',
        closedText: 'Annonceret'
    },
    FRAMELDING: {
        label: 'Framelding',
        openText: 'Åben',
        closedText: 'Lukket'
    },
    INDKOB: {
        label: 'Indkøb',
        openText: 'Beløb mangler',
        closedText: 'Bestilt'
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

/** Alarm levels: 0=none, 1=warning, 2=critical */
export type AlarmLevel = 0 | 1 | 2

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

// Deadline helpers
const staticDeadline = (description: string): StepConfig['getDeadline'] =>
    () => ({ description, alarm: 0 })

const countdownDeadline = (prefix: string, defaultText: string): StepConfig['getDeadline'] =>
    (countdown, _, thresholds) => {
        if (countdown.hours < thresholds.critical && countdown.hours > 0) return { description: `${prefix} ${countdown.formatted.toLowerCase()}`, alarm: 2 }
        if (countdown.hours < thresholds.warning && countdown.hours > 0) return { description: `${prefix} ${countdown.formatted.toLowerCase()}`, alarm: 1 }
        return { description: defaultText, alarm: 0 }
    }

export const DINNER_STEP_MAP: Record<DinnerStepState, StepConfig> = {
    [DinnerStepState.SCHEDULED]: {
        step: 0,
        title: 'Planlagt',
        icon: ICONS.calendar,
        text: 'Fællesspisningen er i kalenderen',
        getDeadline: (countdown, isPastMenuDeadline, thresholds) => {
            if (isPastMenuDeadline) return { description: 'Deadline overskredet', alarm: 2 }
            if (countdown.hours <= 0) return { description: 'Deadline overskredet', alarm: 2 }
            if (countdown.hours < thresholds.critical) return { description: `Om ${countdown.formatted.toLowerCase()}`, alarm: 2 }
            if (countdown.hours < thresholds.warning) return { description: `Om ${countdown.formatted.toLowerCase()}`, alarm: 1 }
            return { description: 'Menu planlægges', alarm: 0 }
        }
    },
    [DinnerStepState.ANNOUNCED]: {
        step: 1,
        title: 'Publiceret',
        icon: ICONS.megaphone,
        text: 'Chefkokken har publiceret sin menu',
        getDeadline: countdownDeadline('Tilmelding lukker om', 'Booking åben')
    },
    [DinnerStepState.BOOKING_CLOSED]: {
        step: 2,
        title: 'Lukket for ændringer',
        icon: ICONS.ticket,
        text: 'Man kan ikke længere framelde sig',
        getDeadline: staticDeadline('Bestillinger låst')
    },
    [DinnerStepState.GROCERIES_DONE]: {
        step: 3,
        title: 'Madbestilling klar',
        icon: ICONS.shoppingCart,
        text: 'Chefkokken har bestilt madvarer',
        getDeadline: countdownDeadline('Middag om', 'Klar til madlavning')
    },
    [DinnerStepState.CONSUMED]: {
        step: 4,
        title: 'Afholdt',
        icon: ICONS.checkCircle,
        text: 'Vi har spist den dejlige mad',
        getDeadline: staticDeadline('Fællesspisning')
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
    const {getDefaultDinnerStartTime, getNextDinnerDate, canModifyOrders} = useSeason()
    const {DinnerStateSchema} = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum

    /**
     * Calculate the current step state for a dinner event
     *
     * Logic:
     * - CONSUMED: DB state is CONSUMED
     * - GROCERIES_DONE: Announced + booking closed + totalCost > 0
     * - BOOKING_CLOSED: Announced + booking closed
     * - ANNOUNCED: DB state is ANNOUNCED
     * - SCHEDULED: Default
     */
    const getDinnerStepState = (dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'date' | 'totalCost'>): DinnerStepState => {
        const isAnnounced = dinnerEvent.state === DinnerState.ANNOUNCED
        const isConsumed = dinnerEvent.state === DinnerState.CONSUMED
        const bookingClosed = !canModifyOrders(dinnerEvent.date)
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
    const getStepConfig = (dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'date' | 'totalCost'>): StepConfig => {
        return DINNER_STEP_MAP[getDinnerStepState(dinnerEvent)]
    }

    /**
     * Get deadline info for a dinner event's current step
     */
    const getStepDeadline = (dinnerEvent: Pick<DinnerEventDisplay, 'state' | 'date' | 'totalCost'>): StepDeadlineResult => {
        const {getDinnerTimeRange, getDefaultDinnerStartTime, isAnnounceMenuPastDeadline} = useSeason()
        const config = getStepConfig(dinnerEvent)

        const appConfig = useAppConfig()
        const thresholds = {
            warning: appConfig.theslope?.cookingDeadlines?.warningHours ?? 72,
            critical: appConfig.theslope?.cookingDeadlines?.criticalHours ?? 24
        }

        const dinnerTimeRange = getDinnerTimeRange(dinnerEvent.date, getDefaultDinnerStartTime(), 0)
        const countdown = calculateCountdown(dinnerTimeRange.start)
        const isPastMenuDeadline = isAnnounceMenuPastDeadline(dinnerEvent.date)

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
     * Event description template for Heynabo sync (HTML formatted)
     * Format: Each emoji on its own line, URL as HTML link, signature at the end
     */
    const HEYNABO_EVENT_TEMPLATE = {
        WARNING_ROBOT: '🤖 Denne begivenhed synkroniseres fra skraaningen.dk',
        WARNING_EDIT: '⚠️ Ret ikke her - ændringer overskrives!',
        BOOKING_EMOJI: '📅',
        SIGNATURE_PREFIX: 'De bedste hilsner'
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
        // Each emoji on its own line, URL as clickable link, signature at the end
        const lines = [
            HEYNABO_EVENT_TEMPLATE.WARNING_ROBOT,
            HEYNABO_EVENT_TEMPLATE.WARNING_EDIT,
            '',
            dinnerEvent.menuDescription || dinnerEvent.menuTitle,
            '',
            `${HEYNABO_EVENT_TEMPLATE.BOOKING_EMOJI} <a href="${dinnerUrl}">Book din billet</a>`,
            '',
            `${HEYNABO_EVENT_TEMPLATE.SIGNATURE_PREFIX} // ${dinnerEvent.cookingTeam?.name || 'Køkkenholdet'}`
        ]
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

    return {
        getDinnerStepState,
        getStepConfig,
        getStepDeadline,
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
        CLOSABLE_ORDER_STATES
    }
}
