import {z} from 'zod'
import {
    WEEKDAYS,
    type WeekDayMap,
    type WeekDay,
    createWeekDayMapFromSelection,
    createDefaultWeekdayMap
} from '~/types/dateTypes'

/**
 * Validation schemas and serialization for WeekDayMap objects
 */
export const useWeekDayMapValidation = () => {
    // Base schema - validates structure (all 7 weekdays present)
    const WeekDayMapSchema: z.ZodType<WeekDayMap> = z.object(
        Object.fromEntries(WEEKDAYS.map(day => [day, z.boolean()])) as Record<string, z.ZodBoolean>
    ) as any as z.ZodType<WeekDayMap>

    // With "at least one day selected" validation (for Season)
    const WeekDayMapSchemaRequired = WeekDayMapSchema.refine(
        (map) => Object.values(map).some(v => v),
        {message: "Man skal lave mad mindst en dag om ugen"}
    )

    // No days required (for CookingTeam/Inhabitant affinity)
    const WeekDayMapSchemaOptional = WeekDayMapSchema

    // Serialization for database storage
    const serializeWeekDayMap = (map: WeekDayMap): string => JSON.stringify(map)
    const deserializeWeekDayMap = (serialized: string): WeekDayMap | null => {
        // Handle "[]" (empty array string) which represents null affinity
        if (serialized === "[]") {
            return null
        }
        return JSON.parse(serialized)
    }

    return {
        WeekDayMapSchema,
        WeekDayMapSchemaRequired,
        WeekDayMapSchemaOptional,
        createWeekDayMapFromSelection,
        createDefaultWeekdayMap,
        serializeWeekDayMap,
        deserializeWeekDayMap
    }
}