import {z} from 'zod'
import {type DateRange} from '~/types/dateTypes'
import {dateRangeSchema} from '~/composables/useDateRangeValidation'
import {formatDate, parseDate, isDateRangeInside, areRangesOverlapping} from '~/utils/date'
import {useDinnerEventValidation} from '~/composables/useDinnerEventValidation'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'

/**
 * Validation schemas and serialization functions for Season objects
 */
export const useSeasonValidation = () => {
    // Get validation schemas
    const {WeekDayMapSchemaRequired, serializeWeekDayMap, deserializeWeekDayMap} = useWeekDayMapValidation()
    const {DinnerEventDisplaySchema} = useDinnerEventValidation()
    const {TicketPricesArraySchema} = useTicketPriceValidation()

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
        cookingDays: WeekDayMapSchemaRequired,
        holidays: holidaysSchema,
        ticketIsCancellableDaysBefore: z.number().min(0).max(31),
        diningModeIsEditableMinutesBefore: z.number().min(0).max(1440),
        consecutiveCookingDays: z.number().int().min(1).max(7).default(1),
        // Optional relations (from server)
        dinnerEvents: z.array(DinnerEventDisplaySchema).optional(),
        CookingTeams: z.array(z.any()).optional(),
        ticketPrices: TicketPricesArraySchema
    })

    const SeasonSchema = BaseSeasonSchema.refine(
        (data) => data.holidays.every(holiday => isDateRangeInside(data.seasonDates, holiday)),
        {
            message: "Ferieperioder skal være inden for fællesspisningssæsonen",
            path: ["holidays"]
        }
    )

    // Type definition
    type Season = z.infer<typeof SeasonSchema>

    // Serialization schema for transforming to database format
    const SerializedSeasonSchema = SeasonSchema.transform((season: Season) => ({
        ...season,
        cookingDays: serializeWeekDayMap(season.cookingDays),
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

    const deserializeSeason = (serialized: SerializedSeason | any): Season => {
        const parsedSeasonDates = JSON.parse(serialized.seasonDates)

        const baseSeason = {
            ...serialized,
            cookingDays: deserializeWeekDayMap(serialized.cookingDays),
            holidays: JSON.parse(serialized.holidays).map((holiday: any) => ({
                start: parseDate(holiday.start),
                end: parseDate(holiday.end)
            })),
            seasonDates: {
                start: parseDate(parsedSeasonDates.start),
                end: parseDate(parsedSeasonDates.end)
            }
        }

        // If relations exist, deserialize them
        if (serialized.dinnerEvents || serialized.CookingTeams || serialized.ticketPrices) {
            return {
                ...baseSeason,
                dinnerEvents: serialized.dinnerEvents,
                CookingTeams: serialized.CookingTeams,
                ticketPrices: serialized.ticketPrices
            }
        }
        return baseSeason
    }

    // Return all schemas and utility functions
    return {
        holidaysSchema,
        BaseSeasonSchema,
        SeasonSchema,
        SerializedSeasonSchema,
        serializeSeason,
        deserializeSeason
    }
}

// Re-export the Season and serializedSeason types
export type Season = z.infer<ReturnType<typeof useSeasonValidation>['SeasonSchema']>
export type SerializedSeason = z.infer<ReturnType<typeof useSeasonValidation>['SerializedSeasonSchema']>
