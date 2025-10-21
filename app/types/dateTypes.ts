export interface DateRange {
    start: Date
    end: Date
}
export const WEEKDAYS = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'] as const
export type WeekDay = typeof WEEKDAYS[number]
export type WeekDayMap<T = boolean> = Record<WeekDay, T>

/**
 * Create WeekDayMap from array of selected weekdays (with validation)
 * @param selectedDays - Array of weekday strings
 * @returns WeekDayMap with true for selected days, false for others
 */
export const createWeekDayMapFromSelection = (selectedDays: string[]): WeekDayMap => {
    // Filter to only valid weekdays
    const validSelectedDays = selectedDays.filter(day =>
        WEEKDAYS.includes(day as WeekDay)
    ) as WeekDay[]

    return WEEKDAYS.reduce((acc, day) => ({
        ...acc,
        [day]: validSelectedDays.includes(day)
    }), {} as WeekDayMap)
}

/**
 * Create WeekDayMap with default values (for tests and utilities)
 * @param value - Boolean or array of booleans for each weekday (Mon-Sun)
 * @returns WeekDayMap with specified values
 */
export const createDefaultWeekdayMap = (value: boolean | boolean[] = false): WeekDayMap => {
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
