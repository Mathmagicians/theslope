import {z} from 'zod'
import {
    WEEKDAYS,
    type WeekDayMap,
    type WeekDay
} from '~/types/dateTypes'

/**
 * Validation schemas and serialization for WeekDayMap objects
 * useWeekDayMapValidation<T = boolean>(options ? : {
 *     valueSchema? : z.ZodType<T>      // Zod schema for each day's value
 *     defaultValue? : T                 // Default value for createDefaultWeekdayMap
 *     isRequired? : (map: WeekDayMap<T>) => boolean  // Custom "at least one" validation
 *     requiredMessage? : string         // Error message for validation
 * })
 */
const DEFAULT_BOOLEAN_OPTIONS = {
    valueSchema: z.boolean(),
    defaultValue: false,
    isRequired: (map: WeekDayMap<boolean>) => Object.values(map).some(v => v),
    requiredMessage: "Man skal lave mad mindst en dag om ugen"
} as const

export const useWeekDayMapValidation = <T = boolean>(
    options: {
        valueSchema: z.ZodType<T>,
        defaultValue: T,
        isRequired?: (map: WeekDayMap<T>) => boolean,
        requiredMessage?: string
    } = DEFAULT_BOOLEAN_OPTIONS as any) => {
    const {defaultValue, valueSchema, isRequired, requiredMessage} = options
    // Base schema - validates structure (all 7 weekdays present)
    const WeekDayMapSchema: z.ZodType<WeekDayMap<T>> = z.object(
        Object.fromEntries(WEEKDAYS.map(day => [day, valueSchema]))
    ) as any as z.ZodType<WeekDayMap<T>>

    // With "at least one day selected" validation (for Season)
    const WeekDayMapSchemaRequired = isRequired
        ? WeekDayMapSchema.refine(isRequired, {message: requiredMessage || "Invalid selection"})
        : undefined

    // No days required (for CookingTeam/Inhabitant affinity)
    const WeekDayMapSchemaOptional = WeekDayMapSchema

    // Serialization for database storage
    const serializeWeekDayMap = (map: WeekDayMap<T>): string => JSON.stringify(map)
    const deserializeWeekDayMap = (serialized: string): WeekDayMap<T> | null => {
        // Handle "[]" (empty array string) which represents null affinity
        if (serialized === "[]") {
            return null
        }
        return JSON.parse(serialized)
    }

    /**
     * Create WeekDayMap with default values (for tests and utilities)
     * @param value - Boolean or array of booleans for each weekday (Mon-Sun)
     * @returns WeekDayMap with specified values
     */
    const createDefaultWeekdayMap = (value: T | T[] = defaultValue): WeekDayMap<T> => {
        if (Array.isArray(value)) {
            return WEEKDAYS.reduce((acc, day, index) => ({
                ...acc,
                [day]: value[index] ?? defaultValue
            }), {} as WeekDayMap<T>)
        }
        return WEEKDAYS.reduce((acc, day) => ({
            ...acc,
            [day]: value
        }), {} as WeekDayMap<T>)
    }

    const createWeekDayMapFromSelection = (selectedDays: string[], selectedValue: T, unselectedValue: T): WeekDayMap<T> => {
        // Filter to only valid weekdays
        const validSelectedDays = selectedDays.filter(day =>
            WEEKDAYS.includes(day as WeekDay)
        ) as WeekDay[]

        return WEEKDAYS.reduce((acc, day) => ({
            ...acc,
            [day]: validSelectedDays.includes(day) ? selectedValue : unselectedValue
        }), {} as WeekDayMap<T>)
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
