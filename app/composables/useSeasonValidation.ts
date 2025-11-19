import {z} from 'zod'
import {dateRangeSchema} from '~/composables/useDateRangeValidation'
import {formatDate, parseDate, isDateRangeInside, areRangesOverlapping, formatDateRange, DATE_SETTINGS} from '~/utils/date'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {WeekDayMap} from '~/types/dateTypes'

// Season status constants - single source of truth
export const SEASON_STATUS = {
    ACTIVE: 'aktiv',
    FUTURE: 'kommende',
    CURRENT: 'i gang',
    PAST: 'afsluttet'
} as const

const seasonStatusValues = Object.values(SEASON_STATUS)

/**
 * Validation schemas and serialization functions for Season objects
 */
export const useSeasonValidation = () => {
    // Season status enum - computed status based on dates and isActive flag
    const SeasonStatusSchema = z.enum(seasonStatusValues as [string, ...string[]])

    // Get validation schemas with explicit boolean options for Season cookingDays
    const {
        WeekDayMapSchemaRequired,
        serializeWeekDayMap,
        deserializeWeekDayMap,
        createWeekDayMapFromSelection
    } = useWeekDayMapValidation<boolean>({
        valueSchema: z.boolean(),
        defaultValue: false,
        isRequired: (map: WeekDayMap<boolean>) => Object.values(map).some(Boolean),
        requiredMessage: "Man skal lave mad mindst en dag om ugen"
    })
    const {DinnerEventDisplaySchema} = useBookingValidation()
    const {TicketPricesArraySchema} = useTicketPriceValidation()
    const {deserializeCookingTeam, CookingTeamDisplaySchema} = useCookingTeamValidation()

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
        cookingDays: WeekDayMapSchemaRequired!,
        holidays: holidaysSchema,
        ticketIsCancellableDaysBefore: z.number().min(0).max(31),
        diningModeIsEditableMinutesBefore: z.number().min(0).max(1440),
        consecutiveCookingDays: z.number().int().min(1).max(7).default(1),
        // Optional relations (from server) - ADR-009: Lightweight Display data only
        dinnerEvents: z.array(DinnerEventDisplaySchema).optional(),
        CookingTeams:  z.array(CookingTeamDisplaySchema).optional(),
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

    const deserializeSeason = (serialized: any): Season => {
        const parsedSeasonDates = JSON.parse(serialized.seasonDates)

        const baseSeason = {
            ...serialized,
            // Compute shortName from seasonDates if not provided
            shortName: serialized.shortName || formatDateRange({
                start: parseDate(parsedSeasonDates.start),
                end: parseDate(parsedSeasonDates.end)
            }, DATE_SETTINGS.SEASON_NAME_MASK),
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
                // Deserialize nested CookingTeams (including affinity fields)
                CookingTeams: serialized.CookingTeams?.map((team: any) => deserializeCookingTeam(team)),
                ticketPrices: serialized.ticketPrices
            }
        }
        return baseSeason
    }

    // Return all schemas and utility functions
    return {
        SeasonStatusSchema,
        holidaysSchema,
        BaseSeasonSchema,
        SeasonSchema,
        SerializedSeasonSchema,
        serializeSeason,
        deserializeSeason,
        createWeekDayMapFromSelection,
        serializeWeekDayMap
    }
}

// Re-export the Season and serializedSeason types
export type Season = z.infer<ReturnType<typeof useSeasonValidation>['SeasonSchema']>
export type SerializedSeason = z.infer<ReturnType<typeof useSeasonValidation>['SerializedSeasonSchema']>
export type SeasonStatus = z.infer<ReturnType<typeof useSeasonValidation>['SeasonStatusSchema']>
