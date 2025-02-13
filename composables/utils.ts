import {addDays,  setISOWeek, startOfISOWeekYear} from 'date-fns'

export function maskPassword(password: string): string {
    if (password.length <= 1) return password;
    return password[0] + '*'.repeat(password.length - 1);
}

// Finds a date corresponding to a weekday in given week in a given year
export function calculateDayFromWeekNumber(weekday: number, weekNumber: number, year: number): Date {
    const firstDay =  setISOWeek(startOfISOWeekYear(new Date(year, 0, 4)), weekNumber)
    const nextDay = addDays(firstDay, weekday)
    return nextDay
}
