import {type DateRange, type WeekDayMap} from '~/types/dateTypes'
import {
    calculateDayFromWeekNumber,
    copyPartialDateRange,
    formatDateRange,
    DATE_SETTINGS,
    selectWeekNumbersFromListThatFitInsideDateRange, getEachDayOfIntervalWithSelectedWeekdays, eachDayOfManyIntervals,
    isCalendarDateInDateList
} from '~/utils/date'
import {isWithinInterval} from "date-fns"
import {useSeasonValidation, type Season} from './useSeasonValidation'
import {useTicketPriceValidation} from "~/composables/useTicketPriceValidation"
import type {DinnerEventCreate} from './useDinnerEventValidation'
import {useDinnerEventValidation} from './useDinnerEventValidation'
import {
    computeAffinitiesForTeams,
    computeCookingDates,
    computeTeamAssignmentsForEvents,
    findFirstCookingDayInDates
} from "~/utils/season"

/**
 * Business logic for working with seasons
 */
export const useSeason = () => {
    // Get validation utilities (including createWeekDayMapFromSelection configured for Season)
    const {
        holidaysSchema,
        SeasonSchema,
        serializeSeason,
        deserializeSeason,
        createWeekDayMapFromSelection
    } = useSeasonValidation()

    // Get DinnerMode enum from generated schema
    const {DinnerModeSchema} = useDinnerEventValidation()
    const DinnerMode = DinnerModeSchema.enum

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
        return cookingDates.map(date => ({
            date,
            menuTitle: 'TBD',
            menuDescription: null,
            menuPictureUrl: null,
            dinnerMode: DinnerMode.DINEIN,
            chefId: null,
            cookingTeamId: null,
            seasonId: season.id!
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

    const assignTeamsToEvents = (season: Season): DinnerEvent[] => {
        // check inputs, and fail early
        if (!SeasonSchema.safeParse(season).success) return []
        const {
            dinnerEvents = [],
            CookingTeams: teams = [],
            consecutiveCookingDays,
            cookingDays
        } = season
        return computeTeamAssignmentsForEvents( teams, cookingDays, consecutiveCookingDays, dinnerEvents)
    }


    const getHolidaysForSeason = (season: Season): Date[] =>getHolidayDatesFromDateRangeList(season.holidays)
    const getHolidayDatesFromDateRangeList = (ranges: DateRange[]): Date[] => eachDayOfManyIntervals(ranges)

    /**
     * Determine season status relative to today (MOCK - TODO: Implement)
     * Pure function - accepts referenceDate for testing
     *
     * @param season - Season to check
     * @param referenceDate - Date to compare against (defaults to today)
     * @returns 'active' | 'future' | 'past'
     */
    const getSeasonStatus = (season: Season, referenceDate: Date = new Date()): 'active' | 'future' | 'past' => {
        // MOCK: Always return 'active' for now
        // TODO: Implement proper logic in feature-active-season-management
        return 'active'
    }

    /**
     * Check if a season can be activated (MOCK - TODO: Implement)
     * Seasons in the past cannot be activated
     *
     * @param season - Season to check
     * @param referenceDate - Date to compare against (defaults to today)
     * @returns true if season can be activated
     */
    const canSeasonBeActive = (season: Season, referenceDate: Date = new Date()): boolean => {
        // MOCK: Always return true for now
        // TODO: Implement proper logic - season.seasonDates.end >= referenceDate
        return true
    }

    return {
        holidaysSchema,
        SeasonSchema,
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
        getSeasonStatus,
        canSeasonBeActive
    }
}
