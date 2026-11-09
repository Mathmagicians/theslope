import {z, type ZodType} from 'zod'
import {WEEKDAYS, weekDayMapOf, type WeekDayMap} from '~/types/dateTypes'

/**
 * Validation schemas and serialization for WeekDayMap objects
 * useWeekDayMapValidation()                            // a map of booleans, false by default
 * useWeekDayMapValidation({valueSchema, defaultValue}) // a map of T: each day's schema, the value createDefaultWeekdayMap fills
 */
export interface UseWeekDayMapValidationOptions<T> {
    valueSchema: z.ZodType<T>
    defaultValue: T
}

export interface UseWeekDayMapValidationReturn<T> {
    WeekDayMapSchema: ZodType<WeekDayMap<T>>
    WeekDayMapSchemaOptional: ZodType<WeekDayMap<T>>
    serializeWeekDayMap: (map: WeekDayMap<T>) => string
    serializeWeekDayMapNullable: (map: WeekDayMap<T> | null) => string | null
    deserializeWeekDayMap: (serialized: string) => WeekDayMap<T> | null
    createWeekDayMapFromSelection: (
        selectedDays: string[],
        selectedValue: T,
        unselectedValue: T
    ) => WeekDayMap<T>
    createDefaultWeekdayMap: (value?: T | T[]) => WeekDayMap<T>
    maskWeekDayMap: (
        source: WeekDayMap<T> | null,
        mask: WeekDayMap<boolean>,
        defaultValue: T,
        maskedValue: T
    ) => WeekDayMap<T>
}

const BOOLEAN_OPTIONS: UseWeekDayMapValidationOptions<boolean> = {
    valueSchema: z.boolean(),
    defaultValue: false
}

const weekDayMapValidation = <T>({valueSchema, defaultValue}: UseWeekDayMapValidationOptions<T>): UseWeekDayMapValidationReturn<T> => {
    // Base schema - validates structure (all 7 weekdays present)
    const WeekDayMapSchema: ZodType<WeekDayMap<T>> = z.object(weekDayMapOf(() => valueSchema))

    // No days required (for CookingTeam/Inhabitant affinity)
    const WeekDayMapSchemaOptional = WeekDayMapSchema

    // Serialization for database storage
    const serializeWeekDayMap = (map: WeekDayMap<T>): string => JSON.stringify(map)
    const serializeWeekDayMapNullable = (map: WeekDayMap<T> | null): string | null => map ? JSON.stringify(map) : null
    const deserializeWeekDayMap = (serialized: string): WeekDayMap<T> | null => {
        // Handle "[]" (empty array string) which represents null affinity
        if (serialized === "[]") {
            return null
        }
        return JSON.parse(serialized)
    }

    /**
     * Create WeekDayMap with default values (for tests and utilities)
     * @param value - One value for every weekday, or one per weekday (Mon-Sun); a short array leaves the rest at the default
     * @returns WeekDayMap with specified values
     */
    const createDefaultWeekdayMap = (value: T | T[] = defaultValue): WeekDayMap<T> =>
        weekDayMapOf(day => Array.isArray(value) ? value[WEEKDAYS.indexOf(day)] ?? defaultValue : value)

    // A string that names no weekday selects nothing
    const createWeekDayMapFromSelection = (selectedDays: string[], selectedValue: T, unselectedValue: T): WeekDayMap<T> =>
        weekDayMapOf(day => selectedDays.includes(day) ? selectedValue : unselectedValue)

    /**
     * Apply a boolean mask to transform a WeekDayMap.
     * Masked days (true) keep source value or get defaultValue if source is null.
     * Unmasked days (false) get maskedValue.
     */
    const maskWeekDayMap = (
        source: WeekDayMap<T> | null,
        mask: WeekDayMap<boolean>,
        defaultValue: T,
        maskedValue: T
    ): WeekDayMap<T> =>
        weekDayMapOf(day => mask[day] ? (source?.[day] ?? defaultValue) : maskedValue)

    return {
        WeekDayMapSchema,
        WeekDayMapSchemaOptional,
        createWeekDayMapFromSelection,
        createDefaultWeekdayMap,
        maskWeekDayMap,
        serializeWeekDayMap,
        serializeWeekDayMapNullable,
        deserializeWeekDayMap
    }
}

export function useWeekDayMapValidation(): UseWeekDayMapValidationReturn<boolean>
export function useWeekDayMapValidation<T>(options: UseWeekDayMapValidationOptions<T>): UseWeekDayMapValidationReturn<T>
export function useWeekDayMapValidation<T>(options?: UseWeekDayMapValidationOptions<T>): UseWeekDayMapValidationReturn<T> | UseWeekDayMapValidationReturn<boolean> {
    return options ? weekDayMapValidation(options) : weekDayMapValidation(BOOLEAN_OPTIONS)
}
