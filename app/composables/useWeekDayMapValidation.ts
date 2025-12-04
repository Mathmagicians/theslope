import type { ZodType} from 'zod';
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
export interface UseWeekDayMapValidationOptions<T> {
    valueSchema: z.ZodType<T>
    defaultValue: T
    isRequired?: (map: WeekDayMap<T>) => boolean
    requiredMessage?: string
}

export interface UseWeekDayMapValidationReturn<T> {
    WeekDayMapSchema: ZodType<WeekDayMap<T>>
    WeekDayMapSchemaRequired: ZodType<WeekDayMap<T>> | undefined
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
}

const DEFAULT_BOOLEAN_OPTIONS: UseWeekDayMapValidationOptions<boolean> = {
    valueSchema: z.boolean(),
    defaultValue: false,
    isRequired: (map: WeekDayMap<boolean>) => Object.values(map).some(v => v),
    requiredMessage: "Man skal lave mad mindst en dag om ugen"
}

export const useWeekDayMapValidation = <T = boolean>(
    options: {
        valueSchema: z.ZodType<T>,
        defaultValue: T,
        isRequired?: (map: WeekDayMap<T>) => boolean,
        requiredMessage?: string
    } = DEFAULT_BOOLEAN_OPTIONS as unknown as UseWeekDayMapValidationOptions<T>): UseWeekDayMapValidationReturn<T> => {
    const {defaultValue, valueSchema, isRequired, requiredMessage} = options
    // Base schema - validates structure (all 7 weekdays present)
    const WeekDayMapSchema: z.ZodType<WeekDayMap<T>> = z.object(
        Object.fromEntries(WEEKDAYS.map(day => [day, valueSchema]))
    ) as unknown as z.ZodType<WeekDayMap<T>>

    // With "at least one day selected" validation (for Season)
    const WeekDayMapSchemaRequired = isRequired
        ? WeekDayMapSchema.refine(isRequired, {message: requiredMessage || "Invalid selection"})
        : undefined

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
        serializeWeekDayMapNullable,
        deserializeWeekDayMap
    }
}
