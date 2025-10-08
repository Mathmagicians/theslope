export interface DateRange {
    start: Date
    end: Date
}
export const WEEKDAYS = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'] as const
export type WeekDay = typeof WEEKDAYS[number]
export type WeekDayMap = Record<WeekDay, boolean>
