import {WEEKDAYS, type DateRange} from '@/types/dateTypes'
import {calculateDayFromWeekNumber, createDefaultWeekdayMap, copyPartialDateRange, formatDateRange, DATE_SETTINGS} from '@/utils/date'
import {isWithinInterval} from "date-fns"
import {useSeasonValidation, type Season} from './useSeasonValidation'

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

    return {
        holidaysSchema,
        SeasonSchema,
        getDefaultSeason,
        createSeasonName,
        isActive,
        coalesceSeason,
        serializeSeason,
        deserializeSeason
    }
}
