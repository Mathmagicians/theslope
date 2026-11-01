export interface DateRange {
    start: Date
    end: Date
}

export const WEEKDAYS = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'] as const
export type WeekDay = typeof WEEKDAYS[number]
export type WeekDayMap<T = boolean> = Record<WeekDay, T>

// The weekdays named from WEEKDAYS: a map spelled out with them has every day, and the compiler checks it
const [mandag, tirsdag, onsdag, torsdag, fredag, lørdag, søndag] = WEEKDAYS

/** A map with each weekday's value from the day */
export const weekDayMapOf = <T>(valueOf: (day: WeekDay) => T): WeekDayMap<T> => ({
    [mandag]: valueOf(mandag),
    [tirsdag]: valueOf(tirsdag),
    [onsdag]: valueOf(onsdag),
    [torsdag]: valueOf(torsdag),
    [fredag]: valueOf(fredag),
    [lørdag]: valueOf(lørdag),
    [søndag]: valueOf(søndag)
})

/** The calendar periods a view shows and navigation steps through */
export const PERIOD_VIEWS = ['day', 'week', 'month'] as const
export type PeriodView = typeof PERIOD_VIEWS[number]

/** The weekdays on which a draft differs from any of the stored maps; every weekday when one of them stores nothing */
export const changedWeekdays = <T>(stored: (Partial<WeekDayMap<T>> | null | undefined)[], draft: WeekDayMap<T>): WeekDay[] =>
    WEEKDAYS.filter(day => stored.some(map => !map || map[day] !== draft[day]))

/**
 * Create WeekDayMap from array of selected weekdays; a string that names no weekday selects nothing
 * @param selectedDays - Array of weekday strings
 * @returns WeekDayMap with true for selected days, false for others
 */
export const createWeekDayMapFromSelection = (selectedDays: string[]): WeekDayMap =>
    weekDayMapOf(day => selectedDays.includes(day))

/**
 * Create WeekDayMap with default values (for tests and utilities)
 * @param value - Boolean or array of booleans for each weekday (Mon-Sun); a short array leaves the rest false
 * @returns WeekDayMap with specified values
 */
export const createDefaultWeekdayMap = (value: boolean | boolean[] = false): WeekDayMap =>
    weekDayMapOf(day => Array.isArray(value) ? value[WEEKDAYS.indexOf(day)] ?? false : value)
