import {type DateRange, type WeekDayMap, type WeekDay, WEEKDAYS, createWeekDayMapFromSelection} from '~/types/dateTypes'
import type {CookingTeam} from '~/composables/useCookingTeamValidation'
import type {DinnerEvent} from '~/composables/useDinnerEventValidation'
import type {Season} from '~/composables/useSeasonValidation'
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

function weekDayMapToDays(cookingDays: WeekDayMap) {
    return Object.entries(cookingDays).filter(([_, isOn]) => isOn).map(([day, _]) => day as WeekDay)
}

function dateToWeekDay(firstDay: Date) {
    const firstAsIsoDay = getISODay(firstDay)
    return WEEKDAYS[firstAsIsoDay - 1]
}

/**
 * Computes affinities (preferred cooking weekdays) for teams based on rotation.
 * If a team already has an affinity, it is preserved (idempotent).
 * @param teams - Array of cooking teams
 * @param cookingDays - WeekDayMap indicating which weekdays are cooking days
 * @param consecutiveCookingDays - Number of consecutive cooking days per team
 * @param firstDay - Starting date (should be a cooking day)
 * @returns Cooking teams with computed affinities, or unchanged if conditions are not met
 */
export const computeAffinitiesForTeams = (teams: CookingTeam[], cookingDays: WeekDayMap, consecutiveCookingDays: number, firstDay: Date): CookingTeam[] => {
    const startDay = dateToWeekDay(firstDay)
    if (!startDay) return teams
    const weekdaysForRotation = weekDayMapToDays(cookingDays)
    const wdfCount = weekdaysForRotation.length
    if (wdfCount === 0) return teams

    const rotationStartIndex = weekdaysForRotation.indexOf(startDay)
    if (rotationStartIndex === -1) return teams // firstDay is not a cooking day

    const teamsWithoutAffinities = teams.filter(team => !team.affinity)
    if (teamsWithoutAffinities.length === 0) return teams // all teams already have affinities

    const affinitiesForTeams = teams
        .filter(team => !team.affinity && team.id)
        .map(team => team.id!)
        .reduce<Record<number, WeekDay[]>>((acc, teamId, i) => {
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
    const sortedKeys: WeekDay[] = teams
        .map(t => t.affinity)
        .toSorted(compareAffinities(weekDay))
        .map(a => getFirstTrueDay(a))
        .filter((d): d is WeekDay => !!d)

    return sortedKeys.reduce<Map<WeekDay, CookingTeam[]>>((acc, key) => {
        const teamsWithThisFirstDayAffinity = teams
            .filter(t => getFirstTrueDay(t.affinity) === key)
            .toSorted((a, b) => a.name.localeCompare(b.name))
        acc.set(key, teamsWithThisFirstDayAffinity)
        return acc
    }, new Map<WeekDay, CookingTeam[]>())
}

export const createTeamRoster = (startDay: WeekDay, teams: CookingTeam[]): CookingTeam[] => {
    const bucketWithTeams = createSortedAffinitiesToTeamsMap(teams.filter(t => t.affinity), startDay)
    const buckets = Array.from(bucketWithTeams.values())

    const maxRounds = Math.max(...buckets.map(t => t.length))
    // zigzag roster
    return Array.from(
        {length: maxRounds},
        (_, i) => buckets.flatMap(bucket => bucket[i] ? [bucket[i]] : [])
    ).flat()
}

/**
 * Assigns cooking teams to dinner events using round-robin with quota tracking.
 * Handles pre-assigned events and holidays (ghost assignments for fair distribution).
 * @param teams - Array of cooking teams with affinities
 * @param cookingDays - WeekDayMap indicating which weekdays are cooking days
 * @param consecutiveCookingDays - Number of consecutive cooking days per team
 * @param events - Array of dinner events to assign teams to
 * @returns Array of DinnerEvents with computed team IDs assigned
 */
export const computeTeamAssignmentsForEvents = (teams: CookingTeam[], cookingDays: WeekDayMap, consecutiveCookingDays: number, events: DinnerEvent[]): DinnerEvent[] => {
    if (teams.length === 0 || events.length === 0 || consecutiveCookingDays < 1) return events

    const needsAssignment = events
        .filter(event => !event.cookingTeamId)
        .toSorted((a, b) => a.date.getTime() - b.date.getTime())
    if (needsAssignment.length === 0) return events

    const teamsWithAffinity = teams.filter(team => team.affinity)
    if (teamsWithAffinity.length === 0) return events

    const firstDay = dateToWeekDay(needsAssignment[0]!.date)
    const roster = createTeamRoster(firstDay!, teamsWithAffinity)

    const wouldBeCookingDays = getEachDayOfIntervalWithSelectedWeekdays(
        needsAssignment[0]!.date,
        needsAssignment.at(-1)!.date,
        cookingDays
    )
    const assignmentsMap = new Map<number, number>(
        wouldBeCookingDays.flatMap((cookingDate, i) => {
            const rosterIndex = Math.floor(i / consecutiveCookingDays) % roster.length
            const assignedTeam = roster[rosterIndex]!
            const isActualEvent = needsAssignment.find(e => e.date.getTime() === cookingDate.getTime())
            return isActualEvent ? [[isActualEvent.id, assignedTeam.id] as [number, number]] : []
        })
    )

    return events.map(event =>
        event.id && assignmentsMap.has(event.id)
            ? {...event, cookingTeamId: assignmentsMap.get(event.id)!}
            : event
    )
}
