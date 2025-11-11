import {type DateRange, type WeekDayMap, type WeekDay, WEEKDAYS, createWeekDayMapFromSelection} from '~/types/dateTypes'
import type {CookingTeam} from '~/composables/useCookingTeamValidation'
import type {DinnerEvent} from '~/composables/useDinnerEventValidation'
import type {Season} from '~/composables/useSeasonValidation'
import {
    getEachDayOfIntervalWithSelectedWeekdays,
    excludeDatesFromInterval
} from '~/utils/date'
import {getISODay, differenceInDays, isWithinInterval, isBefore, isAfter} from "date-fns"

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

/**
 * Active Season Management - Pure Functions
 * All functions accept referenceDate parameter for testability (defaults to new Date())
 */

export type SeasonStatus = 'active' | 'future' | 'current' | 'past'

/**
 * Check if a season is in the past (ended before reference date)
 * @param season - Season to check
 * @param referenceDate - Date to compare against (defaults to now)
 * @returns true if season ended before reference date
 */
export const isPast = (season: Season, referenceDate: Date = new Date()): boolean => {
    return isBefore(season.seasonDates.end, referenceDate)
}

/**
 * Check if a season is in the future (starts after reference date)
 * @param season - Season to check
 * @param referenceDate - Date to compare against (defaults to now)
 * @returns true if season starts after reference date
 */
export const isFuture = (season: Season, referenceDate: Date = new Date()): boolean => {
    return isAfter(season.seasonDates.start, referenceDate)
}

/**
 * Calculate distance in days from reference date to season
 * @param season - Season to check
 * @param referenceDate - Date to compare against (defaults to now)
 * @returns Days until season starts (positive), days since ended (negative), or 0 if current
 */
export const distanceToToday = (season: Season, referenceDate: Date = new Date()): number => {
    // Current season (reference date within season)
    if (isWithinInterval(referenceDate, season.seasonDates)) {
        return 0
    }

    // Future season (starts after reference date)
    if (isFuture(season, referenceDate)) {
        return differenceInDays(season.seasonDates.start, referenceDate)
    }

    // Past season (ended before reference date)
    return differenceInDays(season.seasonDates.end, referenceDate)
}

/**
 * Check if a season can be set as active (not in the past)
 * @param season - Season to check
 * @param referenceDate - Date to compare against (defaults to now)
 * @returns true if season is current or future (not past)
 */
export const canSeasonBeActive = (season: Season, referenceDate: Date = new Date()): boolean => {
    return !isPast(season, referenceDate)
}

/**
 * Get the status category of a season
 * @param season - Season to categorize
 * @param referenceDate - Date to compare against (defaults to now)
 * @returns 'active' | 'future' | 'current' | 'past'
 */
export const getSeasonStatus = (season: Season, referenceDate: Date = new Date()): SeasonStatus => {
    // Active takes precedence regardless of dates
    if (season.isActive) {
        return 'active'
    }

    // Past: ended before reference date
    if (isPast(season, referenceDate)) {
        return 'past'
    }

    // Future: starts after reference date
    if (isFuture(season, referenceDate)) {
        return 'future'
    }

    // Current: reference date within season dates
    return 'current'
}

/**
 * Sort seasons by active priority: active → future (closest) → current → past (recent)
 * @param seasons - Seasons to sort
 * @param referenceDate - Date to compare against (defaults to now)
 * @returns Sorted seasons array (does not mutate input)
 */
export const sortSeasonsByActivePriority = (seasons: Season[], referenceDate: Date = new Date()): Season[] => {
    return [...seasons].sort((a, b) => {
        const statusA = getSeasonStatus(a, referenceDate)
        const statusB = getSeasonStatus(b, referenceDate)

        // Priority order: active > future > current > past
        const statusPriority: Record<SeasonStatus, number> = {
            active: 0,
            future: 1,
            current: 2,
            past: 3
        }

        const priorityDiff = statusPriority[statusA] - statusPriority[statusB]
        if (priorityDiff !== 0) return priorityDiff

        // Within same status, sort by distance to today
        const distanceA = Math.abs(distanceToToday(a, referenceDate))
        const distanceB = Math.abs(distanceToToday(b, referenceDate))

        // For future: closest first (ascending distance)
        // For past: most recent first (ascending distance from end)
        return distanceA - distanceB
    })
}

/**
 * Select the most appropriate season to activate
 * Priority: 1) Future closest to today, 2) Current
 * IMPORTANT: Past seasons cannot be activated (business rule)
 * @param seasons - Seasons to choose from
 * @param referenceDate - Date to compare against (defaults to now)
 * @returns Most appropriate eligible season, or null if no eligible seasons
 */
export const selectMostAppropriateActiveSeason = (seasons: Season[], referenceDate: Date = new Date()): Season | null => {
    if (seasons.length === 0) return null

    // Filter to only eligible (non-past, non-active) seasons
    const eligible = seasons.filter(s => !s.isActive && canSeasonBeActive(s, referenceDate))

    if (eligible.length === 0) return null

    // Sort and return first (future closest, or current if no future)
    const sorted = sortSeasonsByActivePriority(eligible, referenceDate)
    return sorted[0]!
}
