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
    return weekDay ? cookingDays[weekDay] : false
}

export const findFirstCookingDayInDates = (cookingDays: WeekDayMap, dates: Date[]): Date | undefined => {
    const ourDates = dates.filter(date => isThisACookingDay(date, cookingDays))
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
 * Check if a given date is a cooking day based on the WeekDayMap.
 * If a team already has an affinity, then the affinity is not modified.
 * @param teams
 * @param cookingDays
 * @param consecutiveCookingDays
 * @param firstDay is suppoed to be a cooking day
 * @returns Cooking teams with computed affinities, i.e., preferred cooking weekdays, based on rotation, or unchanged if conditions are not met
 */
export const computeAffinitiesForTeams = (teams: CookingTeam[], cookingDays: WeekDayMap, consecutiveCookingDays: number, firstDay: Date): CookingTeam[] => {
    const firstAsIsoDay = getISODay(firstDay)
    const startDay = WEEKDAYS[firstAsIsoDay - 1]
    if (!startDay) return teams
    const weekdaysForRotation = Object.entries(cookingDays).filter(([_, isOn]) => isOn).map(([day, _]) => day as WeekDay)
    const rotationStartIndex = weekdaysForRotation.indexOf(startDay)
    if (rotationStartIndex === -1) return teams // firstDay is not a cooking day

    const teamsWithoutAffinities = teams.filter(team => !team.affinity) || []
    if (teamsWithoutAffinities.length === 0) return teams // all teams already have affinities

    const wdfCount = weekdaysForRotation.length
    if (wdfCount === 0) return teams

    const affinitiesForTeams = teams.filter(team => !team.affinity && team.id).map(team => team.id!).reduce<Record<number, WeekDay[]>>((acc, teamId, i) => {
        const rotationIndex = rotationStartIndex + i * consecutiveCookingDays
        acc[teamId] = Array.from({length: consecutiveCookingDays}, (_, k) => weekdaysForRotation[(rotationIndex + k) % wdfCount]!)
        return acc
    }, {})
    return teams.map(team => {
        const computedAffinity = team.id && affinitiesForTeams[team.id] ? createWeekDayMapFromSelection(affinitiesForTeams[team.id]!) : undefined
        return {
            ...team,
            affinity: team.affinity ?? computedAffinity
        }
    })
}

const getFirstTrueDay = (affinity: NullableWeekDayMap): WeekDay | null => {
    if (!affinity) return null
    for (const day of WEEKDAYS) {
        if (affinity[day]) return day
    }
    return null
}

type NullableWeekDayMap = WeekDayMap | null | undefined
export const compareAffinities = (startDay: WeekDay) => (affinity1: NullableWeekDayMap, affinity2: NullableWeekDayMap): number => {
    const day1 = getFirstTrueDay(affinity1)
    const day2 = getFirstTrueDay(affinity2)

    if (!day1 && !day2) return 0
    if (!day1) return 1
    if (!day2) return -1

    const startIndex = WEEKDAYS.indexOf(startDay)
    const index1 = WEEKDAYS.indexOf(day1)
    const index2 = WEEKDAYS.indexOf(day2)

    const distance1 = (index1 - startIndex + 7) % 7
    const distance2 = (index2 - startIndex + 7) % 7

    return Math.sign(distance1 - distance2)
}

export const compareTeams = (startDay: WeekDay) => (team1: CookingTeam, team2: CookingTeam): number => {
    const compareTeamsByName = team1.name.localeCompare(team2.name)
    if (!team1.affinity && !team2.affinity) return compareTeamsByName
    if (!team1.affinity) return 1
    if (!team2.affinity) return -1
    const affinityComparator = compareAffinities(startDay)
    const affinityComparatorResult = affinityComparator(team1.affinity, team2.affinity)
    return affinityComparatorResult === 0 ? compareTeamsByName : affinityComparatorResult
}


export const createSortedAffinitiesToTeamsMap = (teams: CookingTeam[], weekDay: WeekDay = WEEKDAYS[0]): Map<WeekDay, CookingTeam[]> => {
    const sortedKeys: WeekDay[] = teams.map(t => t.affinity)
        .toSorted(compareAffinities(weekDay)).map(a => getFirstTrueDay(a)).filter((d): d is WeekDay => !!d)
    const grouped = sortedKeys.reduce<Map<WeekDay, CookingTeam[]>>((acc, key, _) => {
        if (!key) return acc
        const teamsWithThisFirstDayAffinity = teams.filter(t => getFirstTrueDay(t.affinity) === key)
            .toSorted((a, b) => a.name.localeCompare(b.name))
        acc.set(key, teamsWithThisFirstDayAffinity)
        return acc
    }, new Map<WeekDay, CookingTeam[]>())
    return grouped
}

export const createTeamRoster = (startDay: WeekDay, teams: CookingTeam[]): CookingTeam[] => {
    const bucketWithTeams = createSortedAffinitiesToTeamsMap(teams.filter(t => t.affinity))
    const buckets = Array.from( bucketWithTeams.values(bucketWithTeams))

    const maxRounds = Math.max(...buckets.map(t => t.length)) //we have as many rounds, as the size of the largest bucket
    const zigzagRoster = Array.from(
        {length: maxRounds},
        (_, i) => buckets.flatMap(bucket => bucket[i] ? [bucket[i]] : []) // for each bucket spit out an array with the ith element if exists, or empty array
    ).flat() // pluck out these teams from  [t] arrays
    return zigzagRoster
}

/* Returns an array of DinnerEvents, with computed team ids assigned to them */
export const computeTeamAssignmentsForEvents = (teams: CookingTeam[], cookingDays: WeekDayMap,
                                                dates: DateRange, consecutiveCookingDays: number, events: DinnerEvent[]): DinnerEvent[] => {
    if (teams.length === 0 || events.length === 0) return events
    return events
}
