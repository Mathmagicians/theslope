import {z} from 'zod'
import {WEEKDAYS, type DateRange} from '@/types/dateTypes'
import {dateRangeSchema} from '@/composables/useDateRangeValidation'
import {calculateDayFromWeekNumber, createDefaultWeekdayMap, copyPartialDateRange} from '@/utils/date'
import {isWithinInterval} from "date-fns"

const WeekDayMapSchema = z.record(z.enum(WEEKDAYS), z.boolean())
    .refine((map) => Object.values(map).some(v => v), {
        message: "At least one cooking day must be selected"
    })

export const holidaysSchema = z.array(dateRangeSchema).default([])

export const SeasonSchema = z.object({
    id: z.string().optional(),
    shortName: z.string().min(4),
    seasonDates: z.union([dateRangeSchema, z.object({
        start: z.date(),
        end: z.date()
    })]).refine((data) => data.start <= data.end, {
        message: 'Season end date must be after start date'
    }),
    isActive: z.boolean(),
    cookingDays: WeekDayMapSchema,
    holidays: holidaysSchema,
    ticketIsCancellableDaysBefore: z.number().min(0).max(31),
    diningModeIsEditableMinutesBefore: z.number().min(0).max(1440)
})

export type Season = z.infer<typeof SeasonSchema>


export const useSeason = () => {
    const getDefaultSeason = () => {
        const appConfig = useAppConfig()
        const {theslope} = appConfig
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
        } satisfies Partial<Season>
    }

    const createSeasonName = (range: DateRange): string => formatDateRange(range, DATE_SETTINGS.SEASON_NAME_MASK)


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

    // we have a different represenation of season in application, but it is not how we will serialize it (dates are not serializable in JS)

// In useSeason.ts
    const SerializedSeasonSchema = SeasonSchema.extend({
        cookingDays: z.string(),
        holidays: z.string(),
        seasonDates: z.object({
            start: z.string(),
            end: z.string()
        })
    })

    const serializeSeason = (season: Season) => {
        const serialized = {
            ...season,
            cookingDays: JSON.stringify(season.cookingDays),
            holidays: JSON.stringify(season.holidays),
            seasonDates: {
                start: formatDate(season.seasonDates.start),
                end: formatDate(season.seasonDates.end)
            }
        }
        return SerializedSeasonSchema.parse(serialized)
    }

    const deserializeSeason = (data: unknown) => {
        const parsed = SerializedSeasonSchema.parse(data)
        return SeasonSchema.parse({
            ...parsed,
            cookingDays: JSON.parse(parsed.cookingDays),
            holidays: JSON.parse(parsed.holidays),
            seasonDates: {
                start: parseDate(parsed.seasonDates.start),
                end: parseDate(parsed.seasonDates.end)
            }
        })
    }


    return {
        SeasonSchema,
        getDefaultSeason,
        createSeasonName,
        isActive,
        coalesceSeason,
        serializeSeason,
        deserializeSeason
    }
}
