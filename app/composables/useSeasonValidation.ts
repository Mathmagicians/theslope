import {z} from 'zod'
import {dateRangeSchema} from '~/composables/useDateRangeValidation'
import {formatDate, parseDate, isDateRangeInside, areRangesOverlapping, sortDateRanges, formatDateRange, DATE_SETTINGS} from '~/utils/date'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useTicketPriceValidation, type PortionTicket} from '~/composables/useTicketPriceValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import {IdSchema} from '~/composables/useCoreValidation'
import type {WeekDayMap} from '~/types/dateTypes'
import {SEASON_STATUS} from '~/config/seasonWords'

const seasonStatusValues = [SEASON_STATUS.ACTIVE, SEASON_STATUS.FUTURE, SEASON_STATUS.CURRENT, SEASON_STATUS.PAST] as const

/**
 * Validation schemas and serialization functions for Season objects
 */
export const useSeasonValidation = () => {
    // Season status enum - computed status based on dates and isActive flag
    const SeasonStatusSchema = z.enum(seasonStatusValues)

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
    const {DinnerEventDisplaySchema, SerializedDinnerEventSchema, deserializeDinnerEvent, ScaffoldResultSchema} = useBookingValidation()
    const {TicketPriceSchema, TicketPricesArraySchema} = useTicketPriceValidation()
    const {deserializeCookingTeamDisplay, CookingTeamDisplaySchema, SerializedCookingTeamDisplaySchema} = useCookingTeamValidation()

    const holidaysSchema = z.array(dateRangeSchema)
        .default([])
        .refine((holidays) => !areRangesOverlapping(holidays), {
            message: "Ferieperioder må ikke overlappe hinanden"
        })

    const BaseSeasonSchema = z.object({
        id: IdSchema.optional(),
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

    // The columns a season write stores, its JSON columns serialized, with its price rows; the dinners and the teams are
    // read-only relations a write leaves out
    const SerializedSeasonSchema = SeasonSchema.transform(({dinnerEvents: _dinnerEvents, CookingTeams: _cookingTeams, ...season}: Season) => ({
        ...season,
        cookingDays: serializeWeekDayMap(season.cookingDays),
        // Canonical chronological storage: imports and legacy rows read back ordered
        holidays: JSON.stringify(sortDateRanges(season.holidays).map(holiday => ({
            start: formatDate(holiday.start),
            end: formatDate(holiday.end)
        }))),
        seasonDates: JSON.stringify({
            start: formatDate(season.seasonDates.start),
            end: formatDate(season.seasonDates.end)
        })
    }))
    type SerializedSeason = z.infer<typeof SerializedSeasonSchema>

    // A date range as its JSON column stores it
    const StoredDateRangeSchema = z.object({start: z.string(), end: z.string()})
    type StoredDateRange = z.infer<typeof StoredDateRangeSchema>
    const readDateRange = ({start, end}: StoredDateRange) => ({start: parseDate(start), end: parseDate(end)})

    // A Season row (ADR-010): its dates, cooking days and holidays as JSON and a shortName it may lack; a read includes
    // the price rows, the detail read the dinner rows and the team rows
    const SeasonRowSchema = BaseSeasonSchema
        .omit({shortName: true, seasonDates: true, cookingDays: true, holidays: true, dinnerEvents: true, CookingTeams: true, ticketPrices: true})
        .extend({
            shortName: z.string().nullable(),
            seasonDates: z.string(),
            cookingDays: z.string(),
            holidays: z.string(),
            dinnerEvents: z.array(SerializedDinnerEventSchema).optional(),
            CookingTeams: z.array(SerializedCookingTeamDisplaySchema).optional(),
            ticketPrices: z.array(TicketPriceSchema.omit({portions: true}))
        })
    type SeasonRow = z.infer<typeof SeasonRowSchema>

    // What reconciling the season's dinner events changed (ADR-015 idempotent counts)
    const ReconciliationResultSchema = z.object({
        created: z.number().int().nonnegative(),
        idempotent: z.number().int().nonnegative(),
        deleted: z.number().int().nonnegative()
    })

    // Operation result of a season update (ADR-009): the season plus what the save
    // set in motion - dinner event reconciliation and, on the active season, re-scaffolding
    const SeasonUpdateResponseSchema = z.object({
        season: SeasonSchema,
        reconciliation: ReconciliationResultSchema,
        scaffold: ScaffoldResultSchema.nullable()
    })

    // GET /api/admin/season/active: a null id arrives as an empty body
    const ActiveSeasonIdSchema = z.preprocess(id => id || null, IdSchema.nullable())

    // Serialization and deserialization functions
    const serializeSeason = (season: Season): SerializedSeason => SerializedSeasonSchema.parse(season)

    // The price rows hold no portions; withPortions adds what a ticket at each price weighs
    const deserializeSeason = (
        {shortName, seasonDates, cookingDays, holidays, dinnerEvents, CookingTeams, ticketPrices, ...columns}: SeasonRow,
        withPortions: <T extends PortionTicket>(ticketPrice: T) => T & {portions: number}
    ): Season => {
        const dates = readDateRange(StoredDateRangeSchema.parse(JSON.parse(seasonDates)))
        return {
            ...columns,
            // A season without a stored shortName is named by its dates
            shortName: shortName || formatDateRange(dates, DATE_SETTINGS.SEASON_NAME_MASK),
            seasonDates: dates,
            cookingDays: BaseSeasonSchema.shape.cookingDays.parse(deserializeWeekDayMap(cookingDays)),
            holidays: sortDateRanges(StoredDateRangeSchema.array().parse(JSON.parse(holidays)).map(readDateRange)),
            // Dinner rows: dates become Date objects, the cost becomes the sum of the expense rows
            dinnerEvents: dinnerEvents?.map(deserializeDinnerEvent),
            // Team rows: the affinities parsed, the counts from `_count`
            CookingTeams: CookingTeams?.map(deserializeCookingTeamDisplay),
            ticketPrices: ticketPrices.map(withPortions)
        }
    }

    // Return all schemas and utility functions
    return {
        SeasonStatusSchema,
        holidaysSchema,
        BaseSeasonSchema,
        SeasonSchema,
        SerializedSeasonSchema,
        SeasonRowSchema,
        ReconciliationResultSchema,
        SeasonUpdateResponseSchema,
        ActiveSeasonIdSchema,
        serializeSeason,
        deserializeSeason,
        createWeekDayMapFromSelection,
        serializeWeekDayMap
    }
}

// Re-export the Season and serializedSeason types
export type Season = z.infer<ReturnType<typeof useSeasonValidation>['SeasonSchema']>
export type SerializedSeason = z.infer<ReturnType<typeof useSeasonValidation>['SerializedSeasonSchema']>
export type SeasonRow = z.infer<ReturnType<typeof useSeasonValidation>['SeasonRowSchema']>
export type SeasonStatus = z.infer<ReturnType<typeof useSeasonValidation>['SeasonStatusSchema']>
export type ReconciliationResult = z.infer<ReturnType<typeof useSeasonValidation>['ReconciliationResultSchema']>
export type SeasonUpdateResponse = z.infer<ReturnType<typeof useSeasonValidation>['SeasonUpdateResponseSchema']>
