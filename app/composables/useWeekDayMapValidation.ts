import {z} from 'zod'
import {WEEKDAYS, type WeekDayMap, type WeekDay} from '~/types/dateTypes'

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

    // Create WeekDayMap from array of selected weekdays (with validation)
    const createWeekDayMapFromSelection = (selectedDays: string[]): WeekDayMap => {
        // Filter to only valid weekdays
        const validSelectedDays = selectedDays.filter(day =>
            WEEKDAYS.includes(day as WeekDay)
        ) as WeekDay[]

        return WEEKDAYS.reduce((acc, day) => ({
            ...acc,
            [day]: validSelectedDays.includes(day)
        }), {} as WeekDayMap)
    }

    // Create WeekDayMap with default values (for tests and utilities)
    const createDefaultWeekdayMap = (value: boolean | boolean[] = false): WeekDayMap => {
        if (Array.isArray(value)) {
            return WEEKDAYS.reduce((acc, day, index) => ({
                ...acc,
                [day]: value[index] ?? false
            }), {} as WeekDayMap)
        }
        return WEEKDAYS.reduce((acc, day) => ({
            ...acc,
            [day]: value
        }), {} as WeekDayMap)
    }

    // Serialization for database storage
    const serializeWeekDayMap = (map: WeekDayMap): string => JSON.stringify(map)
    const deserializeWeekDayMap = (serialized: string): WeekDayMap => JSON.parse(serialized)

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