import type {DateRange} from '~/types/dateTypes'
import type {DateValue} from '@internationalized/date'
import {isSameDay, isWithinInterval} from "date-fns"
import {type Season, useSeasonValidation} from '~/composables/useSeasonValidation'
import {type DinnerEventCreate, type DinnerEventDisplay, useBookingValidation} from '~/composables/useBookingValidation'
import type {CookingTeamDisplay as CookingTeam} from '~/composables/useCookingTeamValidation'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import { calculateDeadlineUrgency, computeAffinitiesForTeams, computeCookingDates, computeTeamAssignmentsForEvents,
    findFirstCookingDayInDates, getNextDinnerDate, getDinnerTimeRange, splitDinnerEvents, sortDinnerEventsByTemporal,
    isPast, isFuture, distanceToToday, canSeasonBeActive, getSeasonStatus, sortSeasonsByActivePriority,
    selectMostAppropriateActiveSeason} from "~/utils/season"
import {getEachDayOfIntervalWithSelectedWeekdays} from "~/utils/date"

/**
 * Deadline urgency levels for dinner events
 * 0 = On track, 1 = Warning, 2 = Critical
 */
export type DeadlineUrgency = 0 | 1 | 2

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
    const {createTicketPrice, TicketTypeSchema} = useTicketPriceValidation()
    const TicketType = TicketTypeSchema.enum

    /**
     * Create a default season based on app configuration.
     * Returns empty holidays - component should calculate holidays reactively using getDefaultHolidays()
     */
    const getDefaultSeason = (): Season => {
        const thisYear = new Date().getFullYear()
        const dateRange = {
            start: calculateDayFromWeekNumber(0, theslope.defaultSeason.startWeek, thisYear),
            end: calculateDayFromWeekNumber(4, theslope.defaultSeason.endWeek, thisYear + 1)
        }

        const ticketPrices = theslope.defaultSeason.ticketPrices?.map(({
                                                                           ticketType,
                                                                           price,
                                                                           description,
                                                                           maximumAgeLimit
                                                                       }) => createTicketPrice(
                ticketType, price, undefined, description, maximumAgeLimit)) ??
            [createTicketPrice(TicketType.ADULT, 4000)]

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
     * Merge a partial season with defaults
     */
    const coalesceSeason = (season?: Partial<Season> | null, defaultSeason: Season = getDefaultSeason()): Season => {
        // If season is falsy (null, undefined, etc.), just return the default season
        if (!season) return defaultSeason;

        return <Season>{
            ...defaultSeason,
            ...season,
            seasonDates: copyPartialDateRange(season.seasonDates ?? defaultSeason.seasonDates),
            cookingDays: {...(season.cookingDays ?? defaultSeason.cookingDays)},
            holidays: season.holidays?.map(copyPartialDateRange) ?? defaultSeason.holidays
        }
    }


    /**
     * Generate dinner event data for a season
     *
     * Interprets season configuration (dates, cooking days, holidays) to determine
     * which dates should have dinner events. Returns data structures ready for persistence.
     *
     * @param season - Season configuration (must be deserialized with Date objects)
     * @returns Array of DinnerEventCreate objects for each valid dinner date
     */
    const generateDinnerEventDataForSeason = (season: Season): DinnerEventCreate[] => {
        if (!SeasonSchema.safeParse(season).success) return []
        const cookingDates = computeCookingDates(
            season.cookingDays,
            season.seasonDates,
            season.holidays
        )
        const now = new Date()
        return cookingDates.map(date => ({
            date,
            menuTitle: 'TBD',
            menuDescription: null,
            menuPictureUrl: null,
            state: DinnerState.SCHEDULED,
            totalCost: 0,
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


    const getHolidaysForSeason = (season: Season): Date[] =>getHolidayDatesFromDateRangeList(season.holidays)
    const getHolidayDatesFromDateRangeList = (ranges: DateRange[]): Date[] => eachDayOfManyIntervals(ranges)

    /**
     * Get the default dinner start time (hour) from app configuration
     * @returns Hour (0-23) for dinner start time
     */
    const getDefaultDinnerStartTime = (): number => theslope.defaultDinnerStartTime

    /**
     * Check if a calendar day is the next upcoming dinner event
     * @param day - Calendar day to check
     * @param nextDinner - Next dinner event (or null if none)
     * @returns True if the day matches the next dinner date
     */
    const isNextDinnerDate = (day: DateValue, nextDinner: { date: Date } | null): boolean => {
        if (!nextDinner) return false
        const dayAsDate = toDate(day)
        const nextDinnerDate = new Date(nextDinner.date)
        return isSameDay(dayAsDate, nextDinnerDate)
    }

    // Configure getNextDinnerDate with default 60 minute duration
    const configuredGetNextDinnerDate = getNextDinnerDate(60)

    /**
     * Check if orders can be created/cancelled for a dinner event
     * Configured with app config ticketIsCancellableDaysBefore
     */
    const canModifyOrders = (dinnerEventDate: Date): boolean => {
        const dinnerStartHour = getDefaultDinnerStartTime()
        const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, dinnerStartHour, 0).start
        return isBeforeDeadline(theslope.defaultSeason.ticketIsCancellableDaysBefore, 0)(dinnerStartTime)
    }

    /**
     * Check if dining mode can be edited for a dinner event
     * Configured with app config diningModeIsEditableMinutesBefore
     */
    const canEditDiningMode = (dinnerEventDate: Date): boolean => {
        const dinnerStartHour = getDefaultDinnerStartTime()
        const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, dinnerStartHour, 0).start
        return isBeforeDeadline(0, theslope.defaultSeason.diningModeIsEditableMinutesBefore)(dinnerStartTime)
    }

    /**
     * Check if menu announcement deadline has passed for a dinner event
     * Menu must be announced before booking deadline (members need menu to book)
     * @param dinnerEventDate - Date of the dinner event
     * @returns True if deadline has passed (can no longer announce)
     */
    const isAnnounceMenuPastDeadline = (dinnerEventDate: Date): boolean => {
        const dinnerStartHour = getDefaultDinnerStartTime()
        const dinnerStartTime = getDinnerTimeRange(dinnerEventDate, dinnerStartHour, 0).start
        // Menu deadline is same as booking deadline (ticketIsCancellableDaysBefore before dinner)
        return !isBeforeDeadline(theslope.defaultSeason.ticketIsCancellableDaysBefore, 0)(dinnerStartTime)
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
     * Get all cooking teams that an inhabitant is assigned to in a season
     * @param inhabitantId - ID of the inhabitant
     * @param season - Season containing cooking teams
     * @returns Array of teams the inhabitant is assigned to (empty if none)
     */
    const getTeamsForInhabitant = (inhabitantId: number, season: Season | null): CookingTeam[] => {
        if (!season) return []
        const teams = season.CookingTeams ?? []
        return teams.filter((team: CookingTeam) => hasAssignment(inhabitantId, team))
    }

    /**
     * Check if an inhabitant is on a specific team (any role)
     * @param inhabitantId - ID of the inhabitant to check
     * @param team - Cooking team with assignments
     * @returns True if inhabitant is assigned to this team in any role
     */
    const isOnTeam = (inhabitantId: number, team: CookingTeam | null): boolean => {
        if (!team) return false
        return hasAssignment(inhabitantId, team)
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
     * Calculate deadline urgency for cooking tasks using thresholds from app.config.ts
     * @param dinnerStartTime - The dinner event start time
     * @returns 0 (on track) | 1 (warning) | 2 (critical)
     */
    const getDeadlineUrgency = (dinnerStartTime: Date): DeadlineUrgency => {
        const { criticalHours, warningHours } = theslope.cookingDeadlines
        return calculateDeadlineUrgency(dinnerStartTime, criticalHours, warningHours)
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
        coalesceSeason,
        serializeSeason,
        deserializeSeason,
        generateDinnerEventDataForSeason,
        assignAffinitiesToTeams,
        assignTeamsToEvents,
        getHolidaysForSeason,
        getHolidayDatesFromDateRangeList,
        computeCookingDates,
        getDefaultDinnerStartTime,
        isNextDinnerDate,
        getDinnerTimeRange,
        getNextDinnerDate: configuredGetNextDinnerDate,
        splitDinnerEvents,
        sortDinnerEventsByTemporal,
        canModifyOrders,
        canEditDiningMode,
        isAnnounceMenuPastDeadline,
        getTeamsForInhabitant,
        isOnTeam,
        isChefFor,
        getDeadlineUrgency,
        getBillingCutoffDay,

        // Active season management - pure functions
        isPast,
        isFuture,
        distanceToToday,
        canSeasonBeActive,
        getSeasonStatus,
        sortSeasonsByActivePriority,
        selectMostAppropriateActiveSeason
    }
}

