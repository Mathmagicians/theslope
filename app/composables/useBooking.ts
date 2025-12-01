import {useBookingValidation, type DinnerEventDisplay, type HeynaboEventCreate} from '~/composables/useBookingValidation'
import {useSeason} from '~/composables/useSeason'
import {calculateCountdown} from '~/utils/date'

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
        icon: 'i-heroicons-pencil-square',
        text: 'Menu planlægges',
        getDeadline: (countdown, isPastMenuDeadline, thresholds) => {
            if (isPastMenuDeadline) return { description: 'Deadline overskredet', alarm: 2 }
            if (countdown.hours < thresholds.critical) return { description: `Om ${countdown.formatted.toLowerCase()}`, alarm: 2 }
            if (countdown.hours < thresholds.warning) return { description: `Om ${countdown.formatted.toLowerCase()}`, alarm: 1 }
            return { description: 'Menu planlægges', alarm: 0 }
        }
    },
    [DinnerStepState.ANNOUNCED]: {
        step: 1,
        title: 'Annonceret',
        icon: 'i-heroicons-megaphone',
        text: 'Tilmelding åben',
        getDeadline: countdownDeadline('Tilmelding lukker om', 'Booking åben')
    },
    [DinnerStepState.BOOKING_CLOSED]: {
        step: 2,
        title: 'Tilmelding lukket',
        icon: 'i-heroicons-lock-closed',
        text: 'Lukket for nye tilmeldinger',
        getDeadline: staticDeadline('Bestillinger låst')
    },
    [DinnerStepState.GROCERIES_DONE]: {
        step: 3,
        title: 'Madbestilling klar',
        icon: 'i-heroicons-shopping-cart',
        text: 'Chefkokken har bestilt madvarer',
        getDeadline: countdownDeadline('Middag om', 'Klar til madlavning')
    },
    [DinnerStepState.CONSUMED]: {
        step: 4,
        title: 'Afholdt',
        icon: 'i-heroicons-face-smile',
        text: 'Fællesspisning gennemført',
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
     * Event description template for Heynabo sync
     */
    const HEYNABO_EVENT_TEMPLATE = {
        WARNING_HEADER: '🤖 Denne begivenhed synkroniseres fra skraaningen.dk\n⚠️ Ret ikke her - ændringer overskrives!\n\n',
        BOOKING_LINK_PREFIX: '\n\n📅 Book din billet: ',
        COOKING_TEAM_PREFIX: '\n\nMadhold: '
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
     * @param dinnerEvent - The dinner event to transform
     * @param baseUrl - Base URL for building dinner link (e.g., 'https://skraaningen.dk')
     * @param cookingTeamName - Optional cooking team name
     * @returns Heynabo event create payload
     */
    const createHeynaboEventPayload = (
        dinnerEvent: { date: Date; menuTitle: string; menuDescription: string | null },
        baseUrl: string,
        cookingTeamName?: string | null
    ): HeynaboEventCreate => {
        const dinnerUrl = buildDinnerUrl(baseUrl, dinnerEvent.date)

        // Build description with template
        let description = HEYNABO_EVENT_TEMPLATE.WARNING_HEADER
        description += dinnerEvent.menuDescription || dinnerEvent.menuTitle
        description += HEYNABO_EVENT_TEMPLATE.BOOKING_LINK_PREFIX + dinnerUrl
        if (cookingTeamName) {
            description += HEYNABO_EVENT_TEMPLATE.COOKING_TEAM_PREFIX + cookingTeamName
        }

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

    return {
        // Dinner step workflow
        getDinnerStepState,
        getStepConfig,
        getStepDeadline,
        canAnnounceDinner,
        canCancelDinner,
        // Heynabo sync
        buildDinnerUrl,
        createHeynaboEventPayload,
        HEYNABO_EVENT_TEMPLATE
    }
}
