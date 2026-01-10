import {type DateRange, type WeekDayMap, type WeekDay, WEEKDAYS, createWeekDayMapFromSelection} from '~/types/dateTypes'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {Season, SeasonStatus} from '~/composables/useSeasonValidation'
import {SEASON_STATUS} from '~/composables/useSeasonValidation'
import {
    getEachDayOfIntervalWithSelectedWeekdays,
    excludeDatesFromInterval,
    createDateInTimezone,
    areSameWeek
} from '~/utils/date'
import {getISODay, differenceInDays, isWithinInterval, isBefore, isAfter, isSameDay} from "date-fns"
import {subDays} from "date-fns/subDays"
import {subMinutes} from "date-fns/subMinutes"
import {addMinutes} from "date-fns/addMinutes"

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

export function dateToWeekDay(date: Date): WeekDay {
    return WEEKDAYS[getISODay(date) - 1]!
}

/**
 * Counts cooking days within a holiday period
 * @param holiday - The holiday DateRange
 * @param cookingDays - WeekDayMap indicating which weekdays are cooking days
 * @returns Number of cooking days within the holiday
 */
const countCookingDaysInHoliday = (holiday: DateRange, cookingDays: WeekDayMap): number =>
    getEachDayOfIntervalWithSelectedWeekdays(holiday.start, holiday.end, cookingDays).length

/**
 * Counts cooking days per week (how many weekdays are cooking days)
 * @param cookingDays - WeekDayMap indicating which weekdays are cooking days
 * @returns Number of cooking days per week (1-7)
 */
const countCookingDaysPerWeek = (cookingDays: WeekDayMap): number =>
    Object.values(cookingDays).filter(Boolean).length

/**
 * Determines if a cooking day within a holiday should count as ghost duty.
 * Full "cooking weeks" = week-off (no ghost duty)
 * Remaining cooking days beyond full weeks = ghost duty
 *
 * Example with Mon-Thu schedule (4 cooking days/week):
 * - 4 cooking days in holiday = 1 week-off, 0 ghost
 * - 5 cooking days in holiday = 1 week-off, 1 ghost
 * - 8 cooking days in holiday = 2 week-offs, 0 ghost
 *
 * @param cookingDate - The date to check (must be within a holiday and a cooking day)
 * @param holidays - Array of holiday DateRanges
 * @param cookingDays - WeekDayMap indicating which weekdays are cooking days
 * @returns true if this cooking day counts as ghost duty
 */
export const isHolidayGhostDuty = (cookingDate: Date, holidays: DateRange[], cookingDays: WeekDayMap): boolean =>
    holidays
        .filter(holiday => isWithinInterval(cookingDate, holiday))
        .some(holiday => {
            const cookingDaysInHoliday = countCookingDaysInHoliday(holiday, cookingDays)
            const cookingDaysPerWeek = countCookingDaysPerWeek(cookingDays)
            const weekOffCookingDays = Math.floor(cookingDaysInHoliday / cookingDaysPerWeek) * cookingDaysPerWeek

            // Find this cooking day's position within the holiday's cooking days
            const cookingDaysBeforeThis = getEachDayOfIntervalWithSelectedWeekdays(holiday.start, cookingDate, cookingDays)
                .filter(d => d.getTime() < cookingDate.getTime()).length

            // Ghost duty if this cooking day is beyond the week-off portion
            return cookingDaysBeforeThis >= weekOffCookingDays
        })

/**
 * Computes affinities (preferred cooking weekdays) for teams based on rotation.
 * If a team already has an affinity, it is preserved (idempotent).
 * @param teams - Array of cooking teams
 * @param cookingDays - WeekDayMap indicating which weekdays are cooking days
 * @param consecutiveCookingDays - Number of consecutive cooking days per team
 * @param firstDay - Starting date (should be a cooking day)
 * @returns Cooking teams with computed affinities, or unchanged if conditions are not met
 */
export const computeAffinitiesForTeams = (teams: CookingTeamDisplay[], cookingDays: WeekDayMap, consecutiveCookingDays: number, firstDay: Date): CookingTeamDisplay[] => {
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

export const compareTeams = (startDay: WeekDay) => (team1: CookingTeamDisplay, team2: CookingTeamDisplay): number => {
    const compareTeamsByName = team1.name.localeCompare(team2.name)
    if (!team1.affinity && !team2.affinity) return compareTeamsByName
    if (!team1.affinity) return 1
    if (!team2.affinity) return -1
    const affinityComparator = compareAffinities(startDay)
    const affinityComparatorResult = affinityComparator(team1.affinity, team2.affinity)
    return affinityComparatorResult === 0 ? compareTeamsByName : affinityComparatorResult
}


export const createSortedAffinitiesToTeamsMap = (teams: CookingTeamDisplay[], weekDay: WeekDay = WEEKDAYS[0]): Map<WeekDay, CookingTeamDisplay[]> => {
    const sortedKeys: WeekDay[] = teams
        .map(t => t.affinity)
        .toSorted(compareAffinities(weekDay))
        .map(a => getFirstTrueDay(a))
        .filter((d): d is WeekDay => !!d)

    return sortedKeys.reduce<Map<WeekDay, CookingTeamDisplay[]>>((acc, key) => {
        const teamsWithThisFirstDayAffinity = teams
            .filter(t => getFirstTrueDay(t.affinity) === key)
            .toSorted((a, b) => a.name.localeCompare(b.name))
        acc.set(key, teamsWithThisFirstDayAffinity)
        return acc
    }, new Map<WeekDay, CookingTeamDisplay[]>())
}

export const createTeamRoster = (startDay: WeekDay, teams: CookingTeamDisplay[]): CookingTeamDisplay[] => {
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
 *
 * Holiday behavior (based on cooking days, not calendar days):
 * - Full "cooking weeks" in holiday = week-off (don't advance rotation)
 * - Remaining cooking days = ghost duty (advance rotation)
 *
 * Example with Mon-Thu schedule (4 cooking days/week):
 * - 4 cooking days in holiday = 1 week-off, 0 ghost
 * - 5 cooking days in holiday = 1 week-off, 1 ghost
 * - 8 cooking days in holiday = 2 week-offs, 0 ghost
 *
 * @param teams - Array of cooking teams with affinities
 * @param cookingDays - WeekDayMap indicating which weekdays are cooking days
 * @param consecutiveCookingDays - Number of consecutive cooking days per team
 * @param events - Array of dinner events to assign teams to
 * @param holidays - Optional array of holiday DateRanges
 * @returns Array of DinnerEvents with computed team IDs assigned
 */
export const computeTeamAssignmentsForEvents = (teams: CookingTeamDisplay[], cookingDays: WeekDayMap, consecutiveCookingDays: number, events: DinnerEventDisplay[], holidays: DateRange[] = []): DinnerEventDisplay[] => {
    if (teams.length === 0 || events.length === 0 || consecutiveCookingDays < 1) return events

    const needsAssignment = events
        .filter(event => !event.cookingTeamId)
        .toSorted((a, b) => a.date.getTime() - b.date.getTime())
    if (needsAssignment.length === 0) return events

    const teamsWithAffinity = teams.filter(team => team.affinity)
    if (teamsWithAffinity.length === 0) return events

    const firstEventDate = needsAssignment[0]!.date
    const firstDay = dateToWeekDay(firstEventDate)
    const roster = createTeamRoster(firstDay!, teamsWithAffinity)

    // Find earliest ghost duty date from holidays before first event
    // This ensures ghost duties in holidays preceding the first event are counted
    const ghostDutiesBeforeFirstEvent = holidays
        .filter(h => isBefore(h.start, firstEventDate))
        .flatMap(holiday => getEachDayOfIntervalWithSelectedWeekdays(holiday.start, holiday.end, cookingDays))
        .filter(cookingDate => isBefore(cookingDate, firstEventDate) && isHolidayGhostDuty(cookingDate, holidays, cookingDays))
        .toSorted((a, b) => a.getTime() - b.getTime())

    const startDate = ghostDutiesBeforeFirstEvent.length > 0 ? ghostDutiesBeforeFirstEvent[0]! : firstEventDate

    const wouldBeCookingDays = getEachDayOfIntervalWithSelectedWeekdays(
        startDate,
        needsAssignment.at(-1)!.date,
        cookingDays
    )

    // Build assignments with holiday-aware counter
    // Week-off holidays don't advance counter, ghost duty holidays do
    let quotaCounter = 0
    const assignmentsMap = new Map<number, number>(
        wouldBeCookingDays.flatMap(cookingDate => {
            const isWeekOffHoliday = holidays.some(h =>
                isWithinInterval(cookingDate, h) && !isHolidayGhostDuty(cookingDate, holidays, cookingDays)
            )

            // Skip week-off holidays entirely (don't advance counter)
            if (isWeekOffHoliday) return []

            const rosterIndex = Math.floor(quotaCounter / consecutiveCookingDays) % roster.length
            const assignedTeam = roster[rosterIndex]!
            quotaCounter++

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
 * @returns 'aktiv' | 'kommende' | 'i gang' | 'afsluttet'
 */
export const getSeasonStatus = (season: Season, referenceDate: Date = new Date()): SeasonStatus => {
    // Active takes precedence regardless of dates
    if (season.isActive) {
        return SEASON_STATUS.ACTIVE
    }

    // Past: ended before reference date
    if (isPast(season, referenceDate)) {
        return SEASON_STATUS.PAST
    }

    // Future: starts after reference date
    if (isFuture(season, referenceDate)) {
        return SEASON_STATUS.FUTURE
    }

    // Current: reference date within season dates
    return SEASON_STATUS.CURRENT
}

/**
 * Sort seasons by active priority: aktiv → kommende (closest) → i gang → afsluttet (recent)
 * @param seasons - Seasons to sort
 * @param referenceDate - Date to compare against (defaults to now)
 * @returns Sorted seasons array (does not mutate input)
 */
export const sortSeasonsByActivePriority = (seasons: Season[], referenceDate: Date = new Date()): Season[] => {
    return [...seasons].sort((a, b) => {
        const statusA = getSeasonStatus(a, referenceDate)
        const statusB = getSeasonStatus(b, referenceDate)

        // Priority order: aktiv > kommende > i gang > afsluttet
        const statusPriority: Record<SeasonStatus, number> = {
            [SEASON_STATUS.ACTIVE]: 0,
            [SEASON_STATUS.FUTURE]: 1,
            [SEASON_STATUS.CURRENT]: 2,
            [SEASON_STATUS.PAST]: 3
        }

        const priorityDiff = statusPriority[statusA]! - statusPriority[statusB]!
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

/**
 * Get dinner time range for a given date in Copenhagen timezone.
 * Uses createDateInTimezone to ensure correct UTC representation on Cloudflare Workers.
 *
 * @param date - The date to get dinner time for
 * @param startHour - Hour when dinner starts (24h format, e.g. 18 for 6 PM) in Copenhagen
 * @param durationMinutes - Duration of dinner window in minutes (e.g. 60 for 1 hour)
 * @returns DateRange with start and end times correctly offset for Copenhagen timezone
 */
export const getDinnerTimeRange = (date: Date, startHour: number, durationMinutes: number): DateRange => {
    const start = createDateInTimezone(date, startHour)
    const end = addMinutes(start, durationMinutes)

    return {start, end}
}

/**
 * Get next dinner time range from now (accounting for dinner time window)
 * Curried function to allow pre-configuring dinner duration
 *
 * - If now is within dinner time window and today has dinner → today's dinner time
 * - Otherwise → next upcoming dinner time
 *
 * @param dinnerDurationMinutes - Duration of dinner window in minutes (e.g. 60 for 1 hour)
 * @returns Function that takes dinnerDates and startHour, returns DateRange or null
 *
 * @example
 * const getNextDinner = getNextDinnerDate(60) // Configure 60 min duration
 * const nextDinnerRange = getNextDinner(dinnerDates, 18) // {start: Date, end: Date} or null
 */
export const getNextDinnerDate = (dinnerDurationMinutes: number): (dinnerDates: Date[], dinnerStartTimeHour: number) => DateRange | null =>
    (dinnerDates: Date[], dinnerStartTimeHour: number): DateRange | null => {
        const now = new Date()
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Check if today has dinner
        const todayHasDinner = dinnerDates.some(d => isSameDay(d, today))

        if (todayHasDinner) {
            // Check if we're still within the dinner window
            const dinnerTimeRange = getDinnerTimeRange(now, dinnerStartTimeHour, dinnerDurationMinutes)

            if (now < dinnerTimeRange.end) {
                return dinnerTimeRange
            }
        }

        // Dates are sorted - find first future date
        const nextDate = dinnerDates.find(d => d > today)

        return nextDate ? getDinnerTimeRange(nextDate, dinnerStartTimeHour, dinnerDurationMinutes) : null
    }

/**
 * Split dinner events into next dinner and others in a single pass
 * @param dinnerEvents - Array of dinner events to split
 * @param nextDinnerDateRange - The date range of the next dinner (from getNextDinnerDate)
 * @param maxDaysAhead - Optional max days ahead to include in futureDinnerDates (for prebooking window)
 * @returns Object with nextDinner event and array of other dinner dates
 */
export const splitDinnerEvents = <T extends { date: Date }>(
    dinnerEvents: T[],
    nextDinnerDateRange: DateRange | null,
    maxDaysAhead?: number
): { nextDinner: T | null; pastDinnerDates: Date[]; futureDinnerDates: Date[] } => {
    const now = new Date()

    // Calculate max future date if maxDaysAhead is provided
    const maxFutureDate = maxDaysAhead !== undefined
        ? (() => {
            const max = new Date()
            max.setDate(max.getDate() + maxDaysAhead)
            max.setHours(23, 59, 59, 999)
            return max
        })()
        : null

    const isWithinWindow = (date: Date): boolean =>
        maxFutureDate === null || date <= maxFutureDate

    if (!nextDinnerDateRange) {
        const allDates = dinnerEvents.map(e => e.date)
        return {
            nextDinner: null,
            pastDinnerDates: allDates.filter(d => d < now),
            futureDinnerDates: allDates.filter(d => d >= now && isWithinWindow(d))
        }
    }

    return dinnerEvents.reduce(
        (acc, event) => {
            if (isSameDay(event.date, nextDinnerDateRange.start)) {
                acc.nextDinner = event
            } else if (event.date < now) {
                acc.pastDinnerDates.push(event.date)
            } else if (isWithinWindow(event.date)) {
                acc.futureDinnerDates.push(event.date)
            }
            return acc
        },
        {
            nextDinner: null as T | null,
            pastDinnerDates: [] as Date[],
            futureDinnerDates: [] as Date[]
        }
    )
}

/**
 * Temporal category for dinner events
 * Re-exported from useSeason composable (ADR-001)
 */
type TemporalCategory = 'next' | 'future' | 'past'

/**
 * Dinner event with temporal category
 * Re-exported from useSeason composable (ADR-001)
 */
type TemporalDinnerEvent<T> = T & { temporalCategory: TemporalCategory }

/**
 * Sort dinner events in temporal order: next (today), future (ascending), past (descending)
 * @param dinnerEvents - Array of dinner events to sort
 * @param nextDinnerDateRange - The date range of the next dinner (from getNextDinnerDate)
 * @returns Events sorted in temporal order with category attached
 */
export const sortDinnerEventsByTemporal = <T extends { date: Date }>(
    dinnerEvents: T[],
    nextDinnerDateRange: DateRange | null
): TemporalDinnerEvent<T>[] => {
    const now = new Date()
    const next: TemporalDinnerEvent<T>[] = []
    const future: TemporalDinnerEvent<T>[] = []
    const past: TemporalDinnerEvent<T>[] = []

    for (const event of dinnerEvents) {
        if (nextDinnerDateRange && isSameDay(event.date, nextDinnerDateRange.start)) {
            next.push({ ...event, temporalCategory: 'next' })
        } else if (event.date < now) {
            past.push({ ...event, temporalCategory: 'past' })
        } else {
            future.push({ ...event, temporalCategory: 'future' })
        }
    }

    // Future ascending (soonest first), past descending (most recent first)
    future.sort((a, b) => a.date.getTime() - b.date.getTime())
    past.sort((a, b) => b.date.getTime() - a.date.getTime())

    return [...next, ...future, ...past]
}

/**
 * Generic curried function to check if now is before a deadline relative to dinner start time
 *
 * @param offsetDays - Number of days before dinner (default: 0)
 * @param offsetMinutes - Number of minutes before dinner (default: 0)
 * @param referenceTime - Optional reference time for testing (defaults to current time)
 * @returns Function that checks if now is before the deadline for a given dinner start time
 */
export const isBeforeDeadline = (offsetDays: number = 0, offsetMinutes: number = 0, referenceTime?: Date) =>
    (dinnerStartTime: Date): boolean => {
        const now = referenceTime ?? new Date()
        let freezeTime = subDays(dinnerStartTime, offsetDays)
        freezeTime = subMinutes(freezeTime, offsetMinutes)
        return isBefore(now, freezeTime)  // Strict <: before but not equal
    }

/**
 * Deadline urgency levels
 * 0 = On track (> warningHours before event)
 * 1 = Warning (between criticalHours and warningHours)
 * 2 = Critical (< criticalHours before event)
 * Re-exported from useSeason composable (ADR-001)
 */
type DeadlineUrgency = 0 | 1 | 2

/**
 * Convert hours to days and minutes for isBeforeDeadline
 */
const hoursToOffset = (hours: number): { days: number; minutes: number } => ({
    days: Math.floor(hours / 24),
    minutes: (hours % 24) * 60
})

/**
 * Pure function to calculate deadline urgency
 * Uses isBeforeDeadline internally for consistent deadline logic
 *
 * @param dinnerStartTime - The dinner event start time
 * @param criticalHours - Hours threshold for critical urgency
 * @param warningHours - Hours threshold for warning urgency
 * @param referenceTime - Optional reference time for testing (defaults to current time)
 * @returns Urgency level: 0 (on track) | 1 (warning) | 2 (critical)
 */
export const calculateDeadlineUrgency = (
    dinnerStartTime: Date,
    criticalHours: number,
    warningHours: number,
    referenceTime?: Date
): DeadlineUrgency => {
    const now = referenceTime ?? new Date()

    // Past events have no urgency
    if (isAfter(now, dinnerStartTime)) return 0

    const criticalOffset = hoursToOffset(criticalHours)
    const warningOffset = hoursToOffset(warningHours)

    // Calculate freeze times (deadlines)
    let criticalFreezeTime = subDays(dinnerStartTime, criticalOffset.days)
    criticalFreezeTime = subMinutes(criticalFreezeTime, criticalOffset.minutes)

    let warningFreezeTime = subDays(dinnerStartTime, warningOffset.days)
    warningFreezeTime = subMinutes(warningFreezeTime, warningOffset.minutes)

    // Use !isAfter to include boundary (<=)
    // On track: now <= warningFreezeTime (more than warningHours remaining)
    if (!isAfter(now, warningFreezeTime)) return 0

    // Warning: now <= criticalFreezeTime BUT now > warningFreezeTime
    if (!isAfter(now, criticalFreezeTime)) return 1

    // Critical: now > criticalFreezeTime (less than criticalHours remaining)
    return 2
}

/**
 * Get dinner events for a grid view grouped by week.
 * Single pass reduce over sorted events.
 */
export const getEventsForGridView = <T extends { date: Date }>(
    events: T[],
    range: DateRange
): T[][] => {
    type Acc = { weeks: T[][], firstDate: Date | null, lastDate: Date | null }

    const addToWeeks = (weeks: T[][], event: T): T[][] => {
        const last = weeks.at(-1)
        if (!last || !areSameWeek(event.date, last[0]!.date)) {
            return [...weeks, [event]]
        }
        last.push(event)
        return weeks
    }

    const result = events.reduce<Acc>((acc, event) => {
        const inRange = isWithinInterval(event.date, range)

        if (!acc.firstDate && !inRange && isBefore(event.date, range.start) && areSameWeek(event.date, range.start)) {
            // Before range but same week as range start - include for week completion
            return {...acc, weeks: addToWeeks(acc.weeks, event)}
        }

        if (inRange) {
            const firstDate = acc.firstDate ?? event.date
            const weeks = !acc.firstDate
                ? acc.weeks.filter(w => areSameWeek(w[0]!.date, event.date))
                : acc.weeks
            return {
                firstDate,
                lastDate: event.date,
                weeks: addToWeeks(weeks, event)
            }
        }

        if (acc.lastDate && areSameWeek(event.date, acc.lastDate)) {
            // After range, same week as last
            return {...acc, weeks: addToWeeks(acc.weeks, event)}
        }

        return acc
    }, {weeks: [], firstDate: null, lastDate: null})

    return result.weeks
}
