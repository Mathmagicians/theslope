import {WEEKDAYS, type DateRange} from '~/types/dateTypes'
import {calculateDayFromWeekNumber, createDefaultWeekdayMap, copyPartialDateRange, formatDateRange, DATE_SETTINGS, getEachDayOfIntervalWithSelectedWeekdays, excludeDatesFromInterval} from '~/utils/date'
import {isWithinInterval} from "date-fns"
import {useSeasonValidation, type Season} from './useSeasonValidation'
import type {DinnerEventCreate} from './useDinnerEventValidation'

/**
 * Business logic for working with seasons
 */
export const useSeason = () => {
    // Get validation utilities
    const {
        holidaysSchema, 
        SeasonSchema, 
        serializeSeason, 
        deserializeSeason
    } = useSeasonValidation()
    
    // Get app configuration
    const appConfig = useAppConfig()
    const {theslope} = appConfig
    
    /**
     * Create a default season based on app configuration
     */
    const getDefaultSeason = () => {
        const thisYear = new Date().getFullYear()
        const defaultCookingDaysArray = WEEKDAYS.map(day =>
            theslope.defaultCookingDays.includes(day)
        )
        const dateRange = {
            start: calculateDayFromWeekNumber(0, theslope.defaultSeason.startWeek, thisYear),
            end: calculateDayFromWeekNumber(4, theslope.defaultSeason.endWeek, thisYear + 1)
        }

        return {
            shortName: createSeasonName(dateRange),
            seasonDates: dateRange,
            isActive: false,
            cookingDays: createDefaultWeekdayMap(defaultCookingDaysArray),
            holidays: [] as DateRange[],
            ticketIsCancellableDaysBefore: theslope.ticketIsCancellableDaysBefore,
            diningModeIsEditableMinutesBefore: theslope.diningModeIsEditableMinutesBefore
        } satisfies Season
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
            seasonDates: copyPartialDateRange(season?.seasonDates ?? defaultSeason.seasonDates),
            cookingDays: {...(season?.cookingDays ?? defaultSeason.cookingDays)},
            holidays: season?.holidays?.map(copyPartialDateRange) ?? defaultSeason.holidays
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
        // Step 1: Generate all dates matching cooking days within season range
        const allCookingDates = getEachDayOfIntervalWithSelectedWeekdays(
            season.seasonDates.start,
            season.seasonDates.end,
            season.cookingDays
        )

        // Step 2: Exclude holiday periods
        const validDates = excludeDatesFromInterval(allCookingDates, season.holidays)

        // Step 3: Create dinner event data for each valid date
        return validDates.map(date => ({
            date,
            menuTitle: 'TBD',
            menuDescription: null,
            menuPictureUrl: null,
            dinnerMode: 'NONE',
            chefId: null,
            cookingTeamId: null,
            seasonId: season.id!
        }))
    }

    return {
        holidaysSchema,
        SeasonSchema,
        getDefaultSeason,
        createSeasonName,
        isActive,
        coalesceSeason,
        serializeSeason,
        deserializeSeason,
        generateDinnerEventDataForSeason
    }
}
