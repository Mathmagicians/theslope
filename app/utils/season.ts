import {type DateRange, type WeekDayMap, type WeekDay, WEEKDAYS, createWeekDayMapFromSelection} from '~/types/dateTypes'
import type {CookingTeam} from '~/composables/useCookingTeamValidation'
import {
    getEachDayOfIntervalWithSelectedWeekdays,
    excludeDatesFromInterval
} from '~/utils/date'
import {getISODay} from "date-fns"

export const isThisACookingDay = (date: Date, cookingDays: WeekDayMap): boolean => {
    const isoDay = getISODay(date)
    const weekDay = WEEKDAYS[isoDay - 1]
    return weekDay ? cookingDays[weekDay]  : false
}

export const findFirstCookingDayInDates = (cookingDays: WeekDayMap, dates: Date[]): Date|undefined => {
   const ourDates = dates.filter( date => isThisACookingDay(date, cookingDays))
        .toSorted((a, b) => a.getTime() - b.getTime())
    return ourDates.length > 0 ? ourDates[0] : undefined
}

/**
 * Compute actual cooking dates for a season (excluding holidays)
 * @param cookingDays - WeekDayMap indicating which weekdays are cooking days
 * @param seasonDates - DateRange for the season
 * @param excludeIntervals - Array of DateRanges to exclude (e.g., holidays)
 * @returns Array of Dates representing cooking dates
 */
export const computeCookingDates = (cookingDays: WeekDayMap, seasonDates: DateRange, excludeIntervals: DateRange[]): Date[] => {
    const allCookingDates = getEachDayOfIntervalWithSelectedWeekdays(
        seasonDates.start,
        seasonDates.end,
        cookingDays
    )
    return excludeDatesFromInterval(allCookingDates, excludeIntervals)
}

/**
 * Check if a given date is a cooking day based on the WeekDayMap
 * @param teams
 * @param cookingDays
 * @param consecutiveCookingDays
 * @param firstDay is suppoed to be a cooking day
 * @returns Cooking teams with computed affinities, i.e., preferred cooking weekdays, based on rotation, or unchanged if conditions are not met
 */7
export const computeAffinitiesForTeams = (teams: CookingTeam[], cookingDays: WeekDayMap, consecutiveCookingDays: number, firstDay: Date): CookingTeam[] => {
    const firstAsIsoDay = getISODay(firstDay)
    const startDay = WEEKDAYS[firstAsIsoDay - 1]
    if( !startDay ) return teams
    const weekdaysForRotation = Object.entries(cookingDays).filter(([_, isOn]) => isOn).map(([day, _]) => day as WeekDay)
    const rotationStartIndex = weekdaysForRotation.indexOf(startDay)
    if (rotationStartIndex === -1) return teams // firstDay is not a cooking day

    const wdfCount = weekdaysForRotation.length
    if (wdfCount === 0) return teams
    
    const affinitiesForTeams = teams.map(team => team.id!).reduce<Record<number, WeekDay[]>>((acc, teamId, i) => {
        const rotationIndex = rotationStartIndex + i * consecutiveCookingDays
        acc[teamId] = Array.from({length: consecutiveCookingDays}, (_, k) => weekdaysForRotation[(rotationIndex + k) % wdfCount]!)
        return acc
    }, {})
    return teams.map(team => ({
        ...team,
        affinity: createWeekDayMapFromSelection( affinitiesForTeams[team.id!]!)
    }))
}

/* Returns an array of DinnerEvents, with computed team ids assigned to them */
export const computeTeamAssignmentsForEvents = (teams: CookingTeam[], cookingDays: WeekDayMap,
                                                dates: DateRange, consecutiveCookingDays: number, events: DinnerEvent[]): DinnerEvent[] => {
    if (teams.length === 0 || events.length === 0) return events
    return events
}
