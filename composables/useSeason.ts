import {z} from 'zod'
import {WEEKDAYS, type WeekDay, type WeekDayMap, type DateRange} from '@/types/dateTypes'
import {dateRangeSchema} from '@/composables/useDateRangeValidation'
import {formatDate, calculateDayFromWeekNumber, createDefaultWeekdayMap} from '@/utils/date'
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

    const createSeasonName = (dates: DateRange): string => {
        const startMonth = dates.start.getMonth() + 1
        const startYear = dates.start.getFullYear()
        const endMonth = dates.end.getMonth() + 1
        const endYear = dates.end.getFullYear()

        return `Sæson ${startMonth.toString().padStart(2, '0')}/${startYear}-${endMonth.toString().padStart(2, '0')}/${endYear}`
    }

    const isActive = (today: Date, start: Date, end: Date): boolean => {
        return isWithinInterval(today, {start, end})
    }

    return {
        SeasonSchema,
        getDefaultSeason,
        createSeasonName,
        isActive
    }
}
