import {z} from 'zod'
import {WEEKDAYS, type DateRange} from '@/types/dateTypes'
import {dateRangeSchema} from '@/composables/useDateRangeValidation'
import {calculateDayFromWeekNumber, createDefaultWeekdayMap, copyPartialDateRange} from '@/utils/date'
import {isWithinInterval} from "date-fns"

const WeekDayMapSchema = z.record(z.enum(WEEKDAYS), z.boolean())
    .refine((map) => Object.values(map).some(v => v), {
        message: "Man skal lave mad mindst en dag om ugen"
    })

export const holidaysSchema = z.array(dateRangeSchema)
    .default([])
    .refine((holidays) => !areRangesOverlapping(holidays), {
        message: "Ferieperioder må ikke overlappe hinanden"
    })

export const BaseSeasonSchema = z.object({
    id: z.string().optional(),
    shortName: z.string().min(4),
    seasonDates: dateRangeSchema,
    isActive: z.boolean(),
    cookingDays: WeekDayMapSchema,
    holidays: holidaysSchema,
    ticketIsCancellableDaysBefore: z.number().min(0).max(31),
    diningModeIsEditableMinutesBefore: z.number().min(0).max(1440)
})

    export const SeasonSchema = BaseSeasonSchema.refine((data) => data.holidays.every(holiday => isDateRangeInside(data.seasonDates, holiday)), {
    message: "Ferieperioder skal være inden for fællesspisningssæsonen",
    path: ["holidays"]
})

export type Season = z.infer<typeof SeasonSchema>

export const SerializedSeasonSchema = SeasonSchema.transform((season) => ({
    ...season,
    cookingDays: JSON.stringify(season.cookingDays),
    holidays: JSON.stringify(season.holidays.map(holiday => ({
        start: formatDate(holiday.start),
        end: formatDate(holiday.end)
    }))),
    seasonDates: {
        start: formatDate(season.seasonDates.start),
        end: formatDate(season.seasonDates.end)
    }
}))


export const useSeason = () => {
    const appConfig = useAppConfig()
    const {theslope} = appConfig
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

    const createSeasonName = (range: DateRange | undefined): string => formatDateRange(range, DATE_SETTINGS.SEASON_NAME_MASK)


    const isActive = (today: Date, start: Date, end: Date): boolean => {
        return isWithinInterval(today, {start, end})
    }

    //Cooalesce the data from a partial season with a default season
    const coalesceSeason = (season?: Partial<Season>, defaultSeason: Season = getDefaultSeason()): Season => {
        return <Season>{
            ...defaultSeason,
            ...season,
            seasonDates: copyPartialDateRange(season?.seasonDates ?? defaultSeason.seasonDates),
            cookingDays: {...(season?.cookingDays ?? defaultSeason.cookingDays)},
            holidays: season?.holidays?.map(copyPartialDateRange) ?? defaultSeason.holidays
        }
    }

//Used to prepare the season for storage, requieres to have the types with date ranges transformed to strings
    const serializeSeason = (season: Season) => SerializedSeasonSchema.parse(season)

    const deserializeSeason = (data: unknown) => {
        const serialized = data as Record<string, any>
        return {
            ...serialized,
            cookingDays: JSON.parse(serialized.cookingDays),
            holidays: JSON.parse(serialized.holidays).map((holiday: any) => ({
                start: parseDate(holiday.start),
                end: parseDate(holiday.end)
            })),
            seasonDates: {
                start: parseDate(serialized.seasonDates.start),
                end: parseDate(serialized.seasonDates.end)
            }
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
