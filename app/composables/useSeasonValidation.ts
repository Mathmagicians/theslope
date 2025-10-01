import {z} from 'zod'
import {WEEKDAYS, type DateRange} from '@/types/dateTypes'
import {dateRangeSchema} from '@/composables/useDateRangeValidation'
import {formatDate, parseDate, isDateRangeInside, areRangesOverlapping} from '@/utils/date'

/**
 * Validation schemas and serialization functions for Season objects
 */
export const useSeasonValidation = () => {
    // Validation schemas
    const WeekDayMapSchema = z.record(z.enum(WEEKDAYS), z.boolean())
        .refine((map) => Object.values(map).some(v => v), {
            message: "Man skal lave mad mindst en dag om ugen"
        })

    const holidaysSchema = z.array(dateRangeSchema)
        .default([])
        .refine((holidays) => !areRangesOverlapping(holidays), {
            message: "Ferieperioder må ikke overlappe hinanden"
        })

    const BaseSeasonSchema = z.object({
        id: z.number().int().positive().optional(),
        shortName: z.string().min(4),
        seasonDates: dateRangeSchema,
        isActive: z.boolean(),
        cookingDays: WeekDayMapSchema,
        holidays: holidaysSchema,
        ticketIsCancellableDaysBefore: z.number().min(0).max(31),
        diningModeIsEditableMinutesBefore: z.number().min(0).max(1440)
    })

    const SeasonSchema = BaseSeasonSchema.refine(
        (data) => data.holidays.every(holiday => isDateRangeInside(data.seasonDates, holiday)),
        {
            message: "Ferieperioder skal være inden for fællesspisningssæsonen",
            path: ["holidays"]
        }
    )

    // Schema for validating already serialized season data (JSON string fields)
    const SerializedSeasonValidationSchema = BaseSeasonSchema.extend({
        seasonDates: z.string(), // JSON string instead of dateRangeSchema
        cookingDays: z.string(), // JSON string instead of WeekDayMapSchema
        holidays: z.string()     // JSON string instead of holidaysSchema
    })

    // Type definition
    type Season = z.infer<typeof SeasonSchema>

    // Serialization schema for transforming to database format
    const SerializedSeasonSchema = SeasonSchema.transform((season: Season) => ({
        ...season,
        cookingDays: JSON.stringify(season.cookingDays),
        holidays: JSON.stringify(season.holidays.map(holiday => ({
            start: formatDate(holiday.start),
            end: formatDate(holiday.end)
        }))),
        seasonDates: JSON.stringify({
            start: formatDate(season.seasonDates.start),
            end: formatDate(season.seasonDates.end)
        })
    }))
    type SerializedSeason = z.infer<typeof SerializedSeasonSchema>

    // Serialization and deserialization functions
    const serializeSeason = (season: Season): SerializedSeason => SerializedSeasonSchema.parse(season)

    const deserializeSeason = (serialized: SerializedSeason): Season => {
        try {
            const parsedSeasonDates = JSON.parse(serialized.seasonDates)

            return {
                ...serialized,
                cookingDays: JSON.parse(serialized.cookingDays),
                holidays: JSON.parse(serialized.holidays).map((holiday: any) => ({
                    start: parseDate(holiday.start),
                    end: parseDate(holiday.end)
                })),
                seasonDates: {
                    start: parseDate(parsedSeasonDates.start),
                    end: parseDate(parsedSeasonDates.end)
                }
            }
        } catch (err) {
            throw err
        }
    }

    // Return all schemas and utility functions
    return {
        WeekDayMapSchema,
        holidaysSchema,
        BaseSeasonSchema,
        SeasonSchema,
        SerializedSeasonValidationSchema,
        SerializedSeasonSchema,
        serializeSeason,
        deserializeSeason
    }
}

// Re-export the Season and serializedSeason types
export type Season = z.infer<ReturnType<typeof useSeasonValidation>['SeasonSchema']>
export type SerializedSeason = z.infer<ReturnType<typeof useSeasonValidation>['SerializedSeasonSchema']>
