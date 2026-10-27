import type {DateRange, WeekDayMap} from '~/types/dateTypes'
import {WEEKDAYS} from '~/types/dateTypes'
import {isWithinInterval, isBefore, subDays, subMinutes, getYear} from "date-fns"
import {type Season, useSeasonValidation} from '~/composables/useSeasonValidation'
import {type DinnerEventCreate, type DinnerEventDisplay, type DinnerMode, type OrderAuditAction, OrderAuditAction as OrderAuditActionEnum, type OrderState as OrderStateEnum, useBookingValidation} from '~/composables/useBookingValidation'
import {useCookingTeamValidation, type CookingTeamDisplay as CookingTeam} from '~/composables/useCookingTeamValidation'
import {useTicketPriceValidation, type TicketPrice} from '~/composables/useTicketPriceValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import { calculateDeadlineUrgency, computeAffinitiesForTeams, computeCookingDates, computeTeamAssignmentsForEvents,
    findFirstCookingDayInDates, getNextDinnerDate, getAdjacentDinner, getDinnerTimeRange, getDinnerOnDate, splitDinnerEvents, sortDinnerEventsByTemporal,
    isPast, isFuture, distanceToToday, canSeasonBeActive, getSeasonStatus, sortSeasonsByActivePriority,
    selectMostAppropriateActiveSeason, isBeforeDeadline} from "~/utils/season"
import {getEachDayOfIntervalWithSelectedWeekdays, formatDate, calculateDayFromWeekNumber, formatDateRange, DATE_SETTINGS,
    selectWeekNumbersFromListThatFitInsideDateRange, eachDayOfManyIntervals} from "~/utils/date"
import {chunkArray, pruneAndCreate} from '~/utils/batchUtils'

/**
 * Deadline urgency levels for dinner events
 * 0 = On track, 1 = Warning, 2 = Critical
 */
export type DeadlineUrgency = 0 | 1 | 2

/** The two predicates the booking generator decides by */
export type BookingDeadlines = Pick<SeasonDeadlines, 'canModifyOrders' | 'canEditDiningMode'>

/** Every dinner books, cancels and changes mode as if before its deadlines: an admin's correction */
export const OPEN_DEADLINES: BookingDeadlines = {canModifyOrders: () => true, canEditDiningMode: () => true}

/**
 * Season-configured deadline functions.
 * Time getters are ROOT, predicates derive via isBefore(now, timeGetter).
 */
export type SeasonDeadlines = {
    // Time getters (ROOT)
    getDinnerStartTime: (dinnerEventDate: Date) => Date
    getMenuDeadlineTime: (dinnerEventDate: Date) => Date
    getBookingDeadlineTime: (dinnerEventDate: Date) => Date
    getDiningModeDeadlineTime: (dinnerEventDate: Date) => Date

    // Predicates (DERIVED)
    canModifyOrders: (dinnerEventDate: Date) => boolean
    canEditDiningMode: (dinnerEventDate: Date) => boolean
    isAnnounceMenuPastDeadline: (dinnerEventDate: Date) => boolean
    getOrderCancellationAction: (dinnerEventDate: Date) => {
        updates: { dinnerMode: DinnerMode, state: typeof OrderStateEnum.RELEASED, releasedAt: Date }
        auditAction: OrderAuditAction
    } | null
}

/**
 * Preference update for batch inhabitant preference clipping
 */
export type PreferenceUpdate = { inhabitantId: number, dinnerPreferences: WeekDayMap<DinnerMode> }

/**
 * Temporal category for dinner events relative to current time
 */
export type TemporalCategory = 'next' | 'future' | 'past'

/**
 * Business logic for working with seasons
 */
export const useSeason = () => {
    // Get validation utilities (including createWeekDayMapFromSelection configured for Season)
    const {
        SeasonStatusSchema,
        holidaysSchema,
        SeasonSchema,
        serializeSeason,
        deserializeSeason,
        createWeekDayMapFromSelection
    } = useSeasonValidation()
    const SeasonStatus = SeasonStatusSchema.enum

    // Get DinnerState enum from booking validation
    const {DinnerStateSchema} = useBookingValidation()
    const DinnerState = DinnerStateSchema.enum

    // Get app configuration
    const appConfig = useAppConfig()
    const {theslope} = appConfig
    const {createTicketPrice} = useTicketPriceValidation()

    /**
     * Create a default season based on app configuration.
     * Returns empty holidays - component should calculate holidays reactively using getDefaultHolidays()
     * @param now - The current moment; the season starts in its year
     */
    const getDefaultSeason = (now: Date): Season => {
        const thisYear = getYear(now)
        const dateRange = {
            start: calculateDayFromWeekNumber(0, theslope.defaultSeason.startWeek, thisYear),
            end: calculateDayFromWeekNumber(4, theslope.defaultSeason.endWeek, thisYear + 1)
        }

        // Explicit type: app.config types resolve to `any` under the server tsconfig
        const ticketPrices = theslope.defaultSeason.ticketPrices.map((defaultPrice: TicketPrice) => createTicketPrice(defaultPrice))

        return {
            shortName: createSeasonName(dateRange),
            seasonDates: dateRange,
            isActive: false,
            cookingDays: createWeekDayMapFromSelection(theslope.defaultSeason.cookingDays, true, false),
            holidays: [], // Empty - component calculates reactively based on seasonDates
            ticketPrices: ticketPrices,
            ticketIsCancellableDaysBefore: theslope.defaultSeason.ticketIsCancellableDaysBefore,
            diningModeIsEditableMinutesBefore: theslope.defaultSeason.diningModeIsEditableMinutesBefore,
            consecutiveCookingDays: theslope.defaultSeason.consecutiveCookingDays ?? 1
        }
    }

    /**
     * Calculate default holidays for a given date range.
     * Returns only holidays (from app config) that fit within the date range.
     * Component should call this reactively when seasonDates changes.
     */
    const getDefaultHolidays = (seasonDates: DateRange): DateRange[] => {
        return selectWeekNumbersFromListThatFitInsideDateRange(
            seasonDates,
            theslope.defaultSeason.holidays
        )
    }

    /**
     * Create a season name from a date range
     */
    const createSeasonName = (range: DateRange | undefined): string =>
        formatDateRange(range, DATE_SETTINGS.SEASON_NAME_MASK)

    /**
     * Check if a date is within a season's active period
     */
    const isActive = (today: Date, start: Date, end: Date): boolean => {
        return isWithinInterval(today, {start, end})
    }

    /**
     * Generate dinner event data for a season
     *
     * Interprets season configuration (dates, cooking days, holidays) to determine
     * which dates should have dinner events. Returns data structures ready for persistence.
     *
     * @param season - Season configuration (must be deserialized with Date objects)
     * @param now - The current moment, the events' creation stamp
     * @returns Array of DinnerEventCreate objects for each valid dinner date
     */
    const generateDinnerEventDataForSeason = (season: Season, now: Date): DinnerEventCreate[] => {
        if (!SeasonSchema.safeParse(season).success) return []
        const cookingDates = computeCookingDates(
            season.cookingDays,
            season.seasonDates,
            season.holidays
        )
        return cookingDates.map(date => ({
            date,
            menuTitle: '',
            menuDescription: null,
            menuPictureUrl: null,
            state: DinnerState.SCHEDULED,
            heynaboEventId: null,
            chefId: null,
            cookingTeamId: null,
            seasonId: season.id!,
            createdAt: now,
            updatedAt: now
        }))
    }

    const assignAffinitiesToTeams = (season: Season): CookingTeam[] => {
        // check inputs, and fail early
        if (!SeasonSchema.safeParse(season).success || !season.CookingTeams) return []
        const {
            CookingTeams: teams = [],
            dinnerEvents = [],
            consecutiveCookingDays,
            cookingDays,
            seasonDates
        } = season
        const dates = dinnerEvents.length > 0
            ? dinnerEvents.map(event => event.date)
            : getEachDayOfIntervalWithSelectedWeekdays(
                seasonDates.start,
                seasonDates.end,
                cookingDays
            )
        const first = findFirstCookingDayInDates(cookingDays, dates)
        if( !first ) return teams
        return computeAffinitiesForTeams(teams, cookingDays, consecutiveCookingDays, first)
    }

    const assignTeamsToEvents = (season: Season): DinnerEventDisplay[] => {
        // check inputs, and fail early
        if (!SeasonSchema.safeParse(season).success) return []
        const {
            dinnerEvents = [],
            CookingTeams: teams = [],
            consecutiveCookingDays,
            cookingDays,
            holidays = []
        } = season
        return computeTeamAssignmentsForEvents(teams, cookingDays, consecutiveCookingDays, dinnerEvents, holidays)
    }

    // Team assignment batching (D1 rate limit safe)
    // Update is lightweight: 2 params (dinnerEventId, cookingTeamId), batch of 50 is safe
    const TEAM_ASSIGNMENT_BATCH_SIZE = 50
    const chunkTeamAssignments = chunkArray<DinnerEventDisplay>(TEAM_ASSIGNMENT_BATCH_SIZE)

    // ========================================================================
    // PREFERENCE CLIPPING - Align inhabitant preferences to season cooking days
    // ========================================================================

    const {maskWeekDayMap} = useCoreValidation()
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum

    /**
     * Curried preference clipper factory.
     *
     * Given season cooking days, returns a function that:
     * - Takes inhabitants with optional preferences
     * - Returns PreferenceUpdate[] for only those needing updates
     *
     * Business rules:
     * - Cooking days: keep existing value or default to DINEIN
     * - Non-cooking days: always NONE
     *
     * @example
     * const clipper = createPreferenceClipper(season.cookingDays)
     * const updates = clipper(inhabitants)
     * const batches = chunkPreferenceUpdates(updates)
     */
    const createPreferenceClipper = (cookingDays: WeekDayMap<boolean>) => {
        const needsClipping = (prefs: WeekDayMap<DinnerMode> | null): boolean => {
            if (!prefs) return true
            return WEEKDAYS.some(day => !cookingDays[day] && prefs[day] !== DinnerMode.NONE)
        }

        // Return the curried function that processes inhabitants
        return <T extends { id: number, dinnerPreferences: WeekDayMap<DinnerMode> | null }>(
            inhabitants: T[]
        ): PreferenceUpdate[] =>
            inhabitants
                .filter(i => needsClipping(i.dinnerPreferences))
                .map(i => ({
                    inhabitantId: i.id,
                    dinnerPreferences: maskWeekDayMap(i.dinnerPreferences, cookingDays, DinnerMode.DINEIN, DinnerMode.NONE)
                }))
    }

    // Preference update batching (D1 rate limit safe)
    const PREFERENCE_BATCH_SIZE = 50
    const chunkPreferenceUpdates = chunkArray<PreferenceUpdate>(PREFERENCE_BATCH_SIZE)

    /**
     * Filter dinner events to those within the prebooking window (today → today + N days).
     * Pure function extracted for testability and reuse by scaffoldPrebookings.
     *
     * @param allDinnerEvents - All dinner events for a season
     * @param now - The current moment, the window's start
     * @returns Dinner events within the scaffoldable window (next dinner + future within window)
     */
    const getScaffoldableDinnerEvents = (allDinnerEvents: DinnerEventDisplay[], now: Date): DinnerEventDisplay[] => {
        if (allDinnerEvents.length === 0) return []

        const prebookingWindow = getPrebookingWindowDays()
        const {nextDinner, futureDinners} = configuredSplitDinnerEvents(allDinnerEvents, now, prebookingWindow)

        // All scaffoldable events: nextDinner + futureDinners
        return nextDinner ? [nextDinner, ...futureDinners] : futureDinners
    }

    const getHolidayDatesFromDateRangeList = (ranges: DateRange[]): Date[] => eachDayOfManyIntervals(ranges)

    // ========================================================================
    // DINNER EVENT RECONCILIATION - ADR-015 idempotent pruneAndCreate
    // ========================================================================

    const toDateKey = (date: Date): string => formatDate(date)

    const getDinnerEventDateKey = (event: DinnerEventDisplay | DinnerEventCreate): string =>
        toDateKey(event.date)

    const reconcileDinnerEvents = pruneAndCreate<DinnerEventDisplay, DinnerEventCreate, string>(
        getDinnerEventDateKey,
        (existing, incoming) => getDinnerEventDateKey(existing) === getDinnerEventDateKey(incoming)
    )

    /**
     * Compare schedule and return desired events if changed.
     * Computes cooking dates once and reuses for both check and generation.
     *
     * @returns null if no change, or desired DinnerEventCreate[] if schedule changed
     */
    const getScheduleChangeDesiredEvents = (
        oldSeason: Season,
        newSeason: Season,
        now: Date
    ): DinnerEventCreate[] | null => {
        const oldKeys = computeCookingDates(oldSeason.cookingDays, oldSeason.seasonDates, oldSeason.holidays).map(toDateKey)
        const desiredEvents = generateDinnerEventDataForSeason(newSeason, now)
        const newKeys = desiredEvents.map(e => toDateKey(e.date))

        if (oldKeys.join(',') === newKeys.join(',')) return null
        return desiredEvents
    }

    /**
     * Get the default dinner start time (hour) from app configuration
     * @returns Hour (0-23) for dinner start time
     */
    const getDefaultDinnerStartTime = (): number => theslope.defaultDinnerStartTime

    /**
     * Get the default dinner duration in minutes from app configuration
     * @returns Duration in minutes for dinner window
     */
    const getDefaultDinnerDuration = (): number => theslope.defaultDinnerDurationMinutes

    /**
     * Get the prebooking window in days from app configuration
     * @returns Number of days for the rolling prebooking window
     */
    const getPrebookingWindowDays = (): number => theslope.prebookingWindowDays

    /**
     * Get the menu announcement deadline in days from app configuration
     * This is the deadline for chefs to announce the menu (before dinner)
     * @returns Number of days before dinner when menu must be announced
     */
    const getMenuAnnouncementDeadlineDays = (): number =>
        theslope.defaultSeason?.menuIsAnnouncedDaysBefore ?? 10

    // Pre-configured with defaults from appConfig
    const configuredSplitDinnerEvents = splitDinnerEvents(getDefaultDinnerStartTime(), getDefaultDinnerDuration())
    const configuredGetNextDinnerDate = getNextDinnerDate(getDefaultDinnerStartTime(), getDefaultDinnerDuration())
    const configuredGetAdjacentDinner = getAdjacentDinner(getDefaultDinnerStartTime(), getDefaultDinnerDuration())

    /**
     * Get deadline functions configured for a specific season.
     * Menu deadline from config (10 days), booking deadline from season (8 days).
     * The predicates compare against `now`, so a caller builds the deadlines per moment (a computed over the clock, a run's start).
     */
    const deadlinesForSeason = (season: Pick<Season, 'ticketIsCancellableDaysBefore' | 'diningModeIsEditableMinutesBefore'>, now: Date): SeasonDeadlines => {
        const dinnerStartHour = getDefaultDinnerStartTime()
        const menuDeadlineDays = getMenuAnnouncementDeadlineDays()

        // ROOT: Time getters
        const getDinnerStartTime = (dinnerEventDate: Date): Date =>
            getDinnerTimeRange(dinnerEventDate, dinnerStartHour, 0).start

        const getMenuDeadlineTime = (dinnerEventDate: Date): Date =>
            subDays(getDinnerStartTime(dinnerEventDate), menuDeadlineDays)

        const getBookingDeadlineTime = (dinnerEventDate: Date): Date =>
            subDays(getDinnerStartTime(dinnerEventDate), season.ticketIsCancellableDaysBefore)

        const getDiningModeDeadlineTime = (dinnerEventDate: Date): Date =>
            subMinutes(getDinnerStartTime(dinnerEventDate), season.diningModeIsEditableMinutesBefore)

        // DERIVED: Predicates
        const canModifyOrders = (dinnerEventDate: Date): boolean =>
            isBefore(now, getBookingDeadlineTime(dinnerEventDate))

        const canEditDiningMode = (dinnerEventDate: Date): boolean =>
            isBefore(now, getDiningModeDeadlineTime(dinnerEventDate))

        const isAnnounceMenuPastDeadline = (dinnerEventDate: Date): boolean =>
            !isBefore(now, getMenuDeadlineTime(dinnerEventDate))

        const getOrderCancellationAction = (dinnerEventDate: Date): {
            updates: { dinnerMode: DinnerMode, state: typeof OrderState.RELEASED, releasedAt: Date }
            auditAction: OrderAuditAction
        } | null => {
            if (canModifyOrders(dinnerEventDate)) return null
            return {
                updates: {
                    dinnerMode: DinnerMode.NONE,
                    state: OrderState.RELEASED,
                    releasedAt: now
                },
                auditAction: OrderAuditActionEnum.USER_CANCELLED
            }
        }

        return {
            getDinnerStartTime,
            getMenuDeadlineTime,
            getBookingDeadlineTime,
            getDiningModeDeadlineTime,
            canModifyOrders,
            canEditDiningMode,
            isAnnounceMenuPastDeadline,
            getOrderCancellationAction
        }
    }

    /**
     * Check if a dinner event has started (is in the past)
     * Uses dinner start time, not end time - once dinner starts, no more booking changes
     * @param dinnerEventDate - Date of the dinner event
     * @param now - The current moment
     * @returns True if dinner has started (past)
     */
    const isDinnerPast = (dinnerEventDate: Date, now: Date): boolean => {
        const dinnerStartHour = getDefaultDinnerStartTime()
        const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, dinnerStartHour, 0).start
        return !isBeforeDeadline(0, 0, now)(dinnerStartTime)
    }

    /**
     * Helper: Check if an inhabitant has an assignment on a team (optionally with specific role)
     * @param inhabitantId - ID of the inhabitant
     * @param team - Team to check
     * @param role - Optional role to match (if not provided, any role matches)
     * @returns True if inhabitant has matching assignment
     */
    const hasAssignment = (inhabitantId: number, team: CookingTeam, role?: string): boolean => {
        return team.assignments?.some((assignment) =>
            assignment.inhabitantId === inhabitantId && (!role || assignment.role === role)
        ) ?? false
    }

    /**
     * Check if an inhabitant is a chef for a specific team
     * @param inhabitantId - ID of the inhabitant to check
     * @param team - Cooking team with assignments
     * @returns True if inhabitant is assigned as CHEF on this team
     */
    const isChefFor = (inhabitantId: number, team: CookingTeam | null): boolean => {
        if (!team) return false
        const {TeamRoleSchema} = useCookingTeamValidation()
        return hasAssignment(inhabitantId, team, TeamRoleSchema.enum.CHEF)
    }

    /**
     * Get cooking deadline thresholds from app.config.ts
     * DRY: Single source for warning/critical hours used by badges and calendar chips
     */
    const getCookingDeadlineThresholds = () => ({
        warning: theslope.cookingDeadlines.warningHours,
        critical: theslope.cookingDeadlines.criticalHours
    })

    /**
     * Calculate deadline urgency for cooking tasks using thresholds from app.config.ts
     * @param dinnerStartTime - The dinner event start time
     * @param now - The page's clock (useClock), so the server and the browser count from the same moment
     * @returns 0 (on track) | 1 (warning) | 2 (critical)
     */
    const getDeadlineUrgency = (dinnerStartTime: Date, now: Date): DeadlineUrgency => {
        const { critical: criticalHours, warning: warningHours } = getCookingDeadlineThresholds()
        return calculateDeadlineUrgency(dinnerStartTime, criticalHours, warningHours, now)
    }

    /**
     * Get the billing cutoff day from app configuration
     * This is the day of month (1-31) when billing periods close for order imports
     * @returns Day of month for billing cutoff
     */
    const getBillingCutoffDay = (): number => theslope.billing.cutoffDay

    return {
        // Validation schemas
        SeasonStatusSchema,
        SeasonStatus,
        holidaysSchema,
        SeasonSchema,

        // Business logic
        getDefaultSeason,
        getDefaultHolidays,
        createSeasonName,
        isActive,
        serializeSeason,
        deserializeSeason,
        generateDinnerEventDataForSeason,
        assignAffinitiesToTeams,
        assignTeamsToEvents,
        chunkTeamAssignments,

        // Preference clipping (season activation)
        createPreferenceClipper,
        chunkPreferenceUpdates,

        // Pre-booking scaffolding (season activation)
        getScaffoldableDinnerEvents,

        getHolidayDatesFromDateRangeList,
        computeCookingDates,
        getDefaultDinnerStartTime,
        getDefaultDinnerDuration,
        getPrebookingWindowDays,
        getMenuAnnouncementDeadlineDays,
        getDinnerTimeRange,
        getNextDinnerDate: configuredGetNextDinnerDate,
        getAdjacentDinner: configuredGetAdjacentDinner,
        splitDinnerEvents: configuredSplitDinnerEvents,
        getDinnerOnDate,
        sortDinnerEventsByTemporal,
        deadlinesForSeason,
        isDinnerPast,
        isChefFor,
        getDeadlineUrgency,
        getCookingDeadlineThresholds,
        getBillingCutoffDay,

        // Active season management - pure functions
        isPast,
        isFuture,
        distanceToToday,
        canSeasonBeActive,
        getSeasonStatus,
        sortSeasonsByActivePriority,
        selectMostAppropriateActiveSeason,

        // Dinner event reconciliation (ADR-015)
        reconcileDinnerEvents,
        getScheduleChangeDesiredEvents
    }
}

