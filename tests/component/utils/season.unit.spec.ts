import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {z} from 'zod'
import {
    calculateDeadlineUrgency,
    canSeasonBeActive,
    compareAffinities,
    computeAffinitiesForTeams,
    computeCookingDates,
    computeTeamAssignmentsForEvents,
    createSortedAffinitiesToTeamsMap,
    createTeamRoster,
    distanceToToday,
    findFirstCookingDayInDates,
    getNextDinnerDate,
    getSeasonStatus,
    isBeforeDeadline,
    isFuture,
    isPast,
    isThisACookingDay,
    isHolidayGhostDuty,
    selectMostAppropriateActiveSeason,
    sortSeasonsByActivePriority,
    splitDinnerEvents,
    sortDinnerEventsByTemporal
} from '~/utils/season'
import {SEASON_STATUS} from '~/composables/useSeasonValidation'
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import type {DateRange, WeekDay, WeekDayMap} from '~/types/dateTypes'
import {createWeekDayMapFromSelection} from '~/types/dateTypes'
import type {CookingTeam} from '~/composables/useCookingTeamValidation'
import type {DinnerEvent} from '~/composables/useBookingValidation'
import {SeasonFactory} from '../../e2e/testDataFactories/seasonFactory'

// Schema for splitDinnerEvents return structure
const SplitDinnerEventsResultSchema = z.object({
    nextDinner: z.object({ id: z.number(), date: z.date() }).nullable(),
    pastDinnerDates: z.array(z.date()),
    futureDinnerDates: z.array(z.date())
})

const { createDefaultWeekdayMap } = useWeekDayMapValidation()

// Factory functions for test data
const createTeam = (id: number, name: string, affinity: WeekDayMap | null | undefined = null): CookingTeam => ({
    id,
    name,
    seasonId: 1,
    affinity
})

const createEvent = (id: number, date: Date, teamId: number | null = null): DinnerEvent => ({
    id,
    date,
    menuTitle: '',
    dinnerMode: 'NONE',
    cookingTeamId: teamId,
    seasonId: 1,
    menuDescription: null,
    menuPictureUrl: null,
    chefId: null,
    createdAt: new Date(),
    updatedAt: new Date()
})

describe('computeCookingDates', () => {
    it.each([
        {
            scenario: 'Monday and Wednesday cooking days',
            seasonDates: {
                start: new Date(2025, 0, 6),  // Monday, Jan 6
                end: new Date(2025, 0, 31)     // Friday, Jan 31
            },
            cookingDays: createDefaultWeekdayMap([true, false, true, false, false, false, false]),
            holidays: [],
            expectedDayOfWeek: [1, 3], // Monday, Wednesday
            minExpectedCount: 8
        },
        {
            scenario: 'Tuesday only',
            seasonDates: {
                start: new Date(2025, 0, 1),
                end: new Date(2025, 0, 31)
            },
            cookingDays: createDefaultWeekdayMap([false, true, false, false, false, false, false]),
            holidays: [],
            expectedDayOfWeek: [2], // Tuesday
            minExpectedCount: 4
        },
        {
            scenario: 'Mon-Fri in one week',
            seasonDates: {
                start: new Date(2025, 0, 6),   // Monday
                end: new Date(2025, 0, 10)     // Friday
            },
            cookingDays: createDefaultWeekdayMap([true, true, true, true, true, false, false]),
            holidays: [],
            expectedDayOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
            minExpectedCount: 5,
            exactCount: 5
        }
    ])('should return dates for cooking days: $scenario', ({ seasonDates, cookingDays, holidays, expectedDayOfWeek, minExpectedCount, exactCount }) => {
        // WHEN: Computing cooking dates
        const dates = computeCookingDates(cookingDays, seasonDates, holidays)

        // THEN: Correct dates are returned
        if (exactCount) {
            expect(dates.length).toBe(exactCount)
        } else {
            expect(dates.length).toBeGreaterThanOrEqual(minExpectedCount)
        }

        // AND: All dates match expected weekdays
        dates.forEach(date => {
            expect(expectedDayOfWeek).toContain(date.getDay())
        })

        // AND: All dates are within season boundaries
        dates.forEach(date => {
            expect(date >= seasonDates.start).toBe(true)
            expect(date <= seasonDates.end).toBe(true)
        })
    })

    it('should exclude holidays from returned dates', () => {
        // GIVEN: Season with Tuesday as cooking day and a holiday
        const seasonDates: DateRange = {
            start: new Date(2025, 0, 1),
            end: new Date(2025, 0, 31)
        }
        const cookingDays = createDefaultWeekdayMap([false, true, false, false, false, false, false])
        const holidays: DateRange[] = [
            { start: new Date(2025, 0, 14), end: new Date(2025, 0, 14) } // Tuesday, Jan 14
        ]

        // WHEN: Computing cooking dates
        const dates = computeCookingDates(cookingDays, seasonDates, holidays)

        // THEN: Holiday date is excluded
        const holidayDate = new Date(2025, 0, 14)
        expect(dates.some(date => date.getTime() === holidayDate.getTime())).toBe(false)

        // AND: Other Tuesdays are included
        expect(dates.length).toBeGreaterThan(0)
        dates.forEach(date => expect(date.getDay()).toBe(2))
    })

    it('should return empty array when no cooking days are selected', () => {
        // GIVEN: Season with no cooking days enabled
        const dates = computeCookingDates(
            createDefaultWeekdayMap(false),
            { start: new Date(2025, 0, 1), end: new Date(2025, 0, 31) },
            []
        )

        // THEN: No dates are returned
        expect(dates).toEqual([])
    })
})

describe('isThisACookingDay', () => {
    it.each([
        { day: 'Monday', date: new Date(2025, 0, 6), enabled: [true, false, false, false, false, false, false], expected: true },
        { day: 'Tuesday', date: new Date(2025, 0, 7), enabled: [true, false, false, false, false, false, false], expected: false },
        { day: 'Sunday (ISO 7 boundary)', date: new Date(2025, 0, 5), enabled: [false, false, false, false, false, false, true], expected: true }
    ])('$day returns $expected', ({ date, enabled, expected }) => {
        const cookingDays = createDefaultWeekdayMap(enabled)
        expect(isThisACookingDay(date, cookingDays)).toBe(expected)
    })
})

describe('findFirstCookingDayInDates', () => {
    it.each([
        {
            scenario: 'unsorted dates returns chronologically first',
            cookingDays: [true, false, true, false, true, false, false],
            dates: [new Date(2025, 0, 8), new Date(2025, 0, 6), new Date(2025, 0, 10)],
            expected: new Date(2025, 0, 6)
        },
        {
            scenario: 'skips non-cooking days',
            cookingDays: [false, false, true, false, true, false, false],
            dates: [new Date(2025, 0, 7), new Date(2025, 0, 8), new Date(2025, 0, 10)],
            expected: new Date(2025, 0, 8)
        },
        {
            scenario: 'no matches returns undefined',
            cookingDays: [true, false, true, false, true, false, false],
            dates: [new Date(2025, 0, 7), new Date(2025, 0, 9)],
            expected: undefined
        },
        {
            scenario: 'empty array returns undefined',
            cookingDays: [true, false, true, false, true, false, false],
            dates: [],
            expected: undefined
        }
    ])('$scenario', ({ cookingDays, dates, expected }) => {
        const result = findFirstCookingDayInDates(createDefaultWeekdayMap(cookingDays), dates)
        expect(result?.getTime()).toBe(expected?.getTime())
    })
})

describe('isHolidayGhostDuty', () => {
    // Week-off is based on cooking days, not calendar days
    // Example: Mon/Wed/Fri = 3 cooking days/week, so 3 cooking days = 1 week-off
    // Example: Mon-Thu = 4 cooking days/week, so 4 cooking days = 1 week-off

    it.each([
        {
            scenario: '1 cooking day holiday = ghost duty (Mon/Wed/Fri)',
            cookingDate: new Date(2025, 0, 8), // Wed Jan 8
            holidays: [{ start: new Date(2025, 0, 8), end: new Date(2025, 0, 8) }], // 1 cooking day
            cookingDays: [true, false, true, false, true, false, false], // Mon/Wed/Fri
            expected: true
        },
        {
            scenario: '2 cooking days in holiday = 2nd is ghost duty (Mon/Wed/Fri)',
            cookingDate: new Date(2025, 0, 8), // Wed Jan 8 (2nd cooking day)
            holidays: [{ start: new Date(2025, 0, 6), end: new Date(2025, 0, 8) }], // Mon-Wed = 2 cooking days
            cookingDays: [true, false, true, false, true, false, false],
            expected: true
        },
        {
            scenario: '3 cooking days in holiday = 1 week-off, NO ghost (Mon/Wed/Fri)',
            cookingDate: new Date(2025, 0, 10), // Fri Jan 10 (3rd cooking day)
            holidays: [{ start: new Date(2025, 0, 6), end: new Date(2025, 0, 12) }], // Mon-Sun = 3 cooking days
            cookingDays: [true, false, true, false, true, false, false],
            expected: false
        },
        {
            scenario: '4 cooking days in holiday = 1 week-off + 1 ghost (Mon/Wed/Fri)',
            cookingDate: new Date(2025, 0, 13), // Mon Jan 13 (4th cooking day = 1st ghost)
            holidays: [{ start: new Date(2025, 0, 6), end: new Date(2025, 0, 13) }], // Mon-Mon = 4 cooking days
            cookingDays: [true, false, true, false, true, false, false],
            expected: true
        },
        {
            scenario: '4 cooking days in holiday, first day = week-off portion (Mon/Wed/Fri)',
            cookingDate: new Date(2025, 0, 6), // Mon Jan 6 (1st cooking day = week-off)
            holidays: [{ start: new Date(2025, 0, 6), end: new Date(2025, 0, 13) }], // Mon-Mon = 4 cooking days
            cookingDays: [true, false, true, false, true, false, false],
            expected: false
        },
        {
            scenario: '6 cooking days in holiday = 2 week-offs, NO ghost (Mon/Wed/Fri)',
            cookingDate: new Date(2025, 0, 17), // Fri Jan 17 (6th cooking day)
            holidays: [{ start: new Date(2025, 0, 6), end: new Date(2025, 0, 19) }], // Mon-Sun×2 = 6 cooking days
            cookingDays: [true, false, true, false, true, false, false],
            expected: false
        },
        {
            scenario: '7 cooking days in holiday = 2 week-offs + 1 ghost (Mon/Wed/Fri)',
            cookingDate: new Date(2025, 0, 20), // Mon Jan 20 (7th cooking day = 1st ghost)
            holidays: [{ start: new Date(2025, 0, 6), end: new Date(2025, 0, 20) }], // = 7 cooking days
            cookingDays: [true, false, true, false, true, false, false],
            expected: true
        },
        {
            scenario: '4 cooking days = 1 week-off (Mon-Thu schedule)',
            cookingDate: new Date(2025, 9, 16), // Thu Oct 16 (4th cooking day)
            holidays: [{ start: new Date(2025, 9, 13), end: new Date(2025, 9, 16) }], // Mon-Thu = 4 cooking days
            cookingDays: [true, true, true, true, false, false, false], // Mon-Thu
            expected: false
        },
        {
            scenario: '5 cooking days = 1 week-off + 1 ghost (Mon-Thu schedule)',
            cookingDate: new Date(2025, 3, 6), // Mon Apr 6 (5th cooking day = ghost)
            holidays: [{ start: new Date(2025, 2, 30), end: new Date(2025, 3, 6) }], // Mar 30 - Apr 6 = 5 cooking days
            cookingDays: [true, true, true, true, false, false, false],
            expected: true
        },
        {
            scenario: '5 cooking days = 1 week-off + 1 ghost, check week-off portion (Mon-Thu)',
            cookingDate: new Date(2025, 2, 30), // Mon Mar 30 (1st cooking day = week-off)
            holidays: [{ start: new Date(2025, 2, 30), end: new Date(2025, 3, 6) }], // 5 cooking days
            cookingDays: [true, true, true, true, false, false, false],
            expected: false
        },
        {
            scenario: 'not in any holiday = false',
            cookingDate: new Date(2025, 0, 22), // Wed Jan 22
            holidays: [{ start: new Date(2025, 0, 6), end: new Date(2025, 0, 12) }],
            cookingDays: [true, false, true, false, true, false, false],
            expected: false
        },
        {
            scenario: 'empty holidays = false',
            cookingDate: new Date(2025, 0, 8),
            holidays: [],
            cookingDays: [true, false, true, false, true, false, false],
            expected: false
        }
    ])('$scenario', ({ cookingDate, holidays, cookingDays, expected }) => {
        expect(isHolidayGhostDuty(cookingDate, holidays, createDefaultWeekdayMap(cookingDays))).toBe(expected)
    })
})

describe('computeAffinitiesForTeams', () => {
    it.each([
        {
            scenario: '3 teams, 3 weekdays (Mon/Wed/Fri), consecutiveCookingDays=1',
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2'), createTeam(3, 'Hold 3')],
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
            consecutiveCookingDays: 1,
            expected: {
                1: createDefaultWeekdayMap([true, false, false, false, false, false, false]),  // Mon
                2: createDefaultWeekdayMap([false, false, true, false, false, false, false]),  // Wed
                3: createDefaultWeekdayMap([false, false, false, false, true, false, false])   // Fri
            }
        },
        {
            scenario: '3 teams, 3 weekdays (Mon/Wed/Fri), consecutiveCookingDays=2',
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2'), createTeam(3, 'Hold 3')],
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
            consecutiveCookingDays: 2,
            expected: {
                1: createDefaultWeekdayMap([true, false, true, false, false, false, false]),   // Mon, Wed
                2: createDefaultWeekdayMap([true, false, false, false, true, false, false]),   // Fri, Mon (wrapped)
                3: createDefaultWeekdayMap([false, false, true, false, true, false, false])    // Wed, Fri (wrapped)
            }
        },
        {
            scenario: '2 teams, 5 weekdays (Mon-Fri), consecutiveCookingDays=2',
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')],
            cookingDays: createDefaultWeekdayMap([true, true, true, true, true, false, false]),
            consecutiveCookingDays: 2,
            expected: {
                1: createDefaultWeekdayMap([true, true, false, false, false, false, false]),   // Mon, Tue
                2: createDefaultWeekdayMap([false, false, true, true, false, false, false])    // Wed, Thu
            }
        }
    ])('should assign weekdays in round-robin: $scenario', ({ teams, cookingDays, consecutiveCookingDays, expected }) => {
        // WHEN: Computing affinities for teams (starting Monday)
        const firstDay = new Date(2025, 0, 6) // Monday, Jan 6
        const result = computeAffinitiesForTeams(teams, cookingDays, consecutiveCookingDays, firstDay)

        // THEN: Each team gets assigned weekdays in round-robin order
        Object.entries(expected).forEach(([teamId, expectedAffinity]) => {
            const team = result.find(t => t.id === Number(teamId))
            expect(team?.affinity).toEqual(expectedAffinity)
        })
    })

    it('should handle more teams than weekdays by wrapping', () => {
        // GIVEN: 5 teams but only 3 cooking weekdays (Mon/Wed/Fri)
        const teams = [
            createTeam(1, 'Hold 1'),
            createTeam(2, 'Hold 2'),
            createTeam(3, 'Hold 3'),
            createTeam(4, 'Hold 4'),
            createTeam(5, 'Hold 5')
        ]
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false])
        const firstDay = new Date(2025, 0, 6) // Monday, Jan 6

        // WHEN: Computing affinities with consecutiveCookingDays=1
        const result = computeAffinitiesForTeams(teams, cookingDays, 1, firstDay)

        // THEN: Weekdays wrap around (team 4 gets Mon, team 5 gets Wed)
        const team1 = result.find(t => t.id === 1)
        const team2 = result.find(t => t.id === 2)
        const team3 = result.find(t => t.id === 3)
        const team4 = result.find(t => t.id === 4)
        const team5 = result.find(t => t.id === 5)

        expect(Object.values(team1?.affinity || {}).filter(Boolean).length).toBe(1) // Hold 1: Mon
        expect(Object.values(team2?.affinity || {}).filter(Boolean).length).toBe(1) // Hold 2: Wed
        expect(Object.values(team3?.affinity || {}).filter(Boolean).length).toBe(1) // Hold 3: Fri
        expect(Object.values(team4?.affinity || {}).filter(Boolean).length).toBe(1) // Hold 4: Mon (wrapped)
        expect(Object.values(team5?.affinity || {}).filter(Boolean).length).toBe(1) // Hold 5: Wed (wrapped)
    })

    it('should return empty array when no teams', () => {
        // GIVEN: No teams
        const teams: CookingTeam[] = []
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false])
        const firstDay = new Date(2025, 0, 6) // Monday, Jan 6

        // WHEN: Computing affinities
        const result = computeAffinitiesForTeams(teams, cookingDays, 2, firstDay)

        // THEN: Returns empty array
        expect(result).toEqual([])
    })

    it.each([
        {
            scenario: 'season starting Monday (first cooking day)',
            seasonDates: {
                start: new Date(2025, 0, 6),   // Monday, Jan 6
                end: new Date(2025, 0, 31)
            },
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2'), createTeam(3, 'Hold 3')],
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon/Wed/Fri
            consecutiveCookingDays: 1,
            expected: {
                1: createDefaultWeekdayMap([true, false, false, false, false, false, false]),  // Mon
                2: createDefaultWeekdayMap([false, false, true, false, false, false, false]),  // Wed
                3: createDefaultWeekdayMap([false, false, false, false, true, false, false])   // Fri
            }
        },
        {
            scenario: 'season starting Wednesday (second cooking day)',
            seasonDates: {
                start: new Date(2025, 0, 8),   // Wednesday, Jan 8
                end: new Date(2025, 0, 31)
            },
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2'), createTeam(3, 'Hold 3')],
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon/Wed/Fri
            consecutiveCookingDays: 1,
            expected: {
                1: createDefaultWeekdayMap([false, false, true, false, false, false, false]),  // Wed
                2: createDefaultWeekdayMap([false, false, false, false, true, false, false]),  // Fri
                3: createDefaultWeekdayMap([true, false, false, false, false, false, false])   // Mon (wrapped)
            }
        },
        {
            scenario: 'season starting Friday (third cooking day)',
            seasonDates: {
                start: new Date(2025, 0, 10),  // Friday, Jan 10
                end: new Date(2025, 0, 31)
            },
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2'), createTeam(3, 'Hold 3')],
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]), // Mon/Wed/Fri
            consecutiveCookingDays: 1,
            expected: {
                1: createDefaultWeekdayMap([false, false, false, false, true, false, false]),  // Fri
                2: createDefaultWeekdayMap([true, false, false, false, false, false, false]),   // Mon (wrapped)
                3: createDefaultWeekdayMap([false, false, true, false, false, false, false])    // Wed
            }
        }
    ])('should start rotation from first cooking day in season: $scenario', ({ seasonDates, teams, cookingDays, consecutiveCookingDays, expected }) => {
        // WHEN: Computing affinities for teams
        const result = computeAffinitiesForTeams(teams, cookingDays, consecutiveCookingDays, seasonDates.start)

        // THEN: Team 1 gets first cooking day of season, rotation proceeds from there
        Object.entries(expected).forEach(([teamId, expectedAffinity]) => {
            const team = result.find(t => t.id === Number(teamId))
            expect(team?.affinity).toEqual(expectedAffinity)
        })
    })

    it('should return teams unchanged when firstDay is not a cooking day (input validation)', () => {
        // GIVEN: Tuesday is NOT a cooking day (only Wed/Fri are cooking days)
        const teams = [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')]
        const cookingDays = createDefaultWeekdayMap([false, false, true, false, true, false, false]) // Wed/Fri
        const tuesday = new Date(2025, 0, 7) // Tuesday, Jan 7

        // WHEN: Computing affinities with firstDay that is not a cooking day
        const result = computeAffinitiesForTeams(teams, cookingDays, 1, tuesday)

        // THEN: Returns teams unchanged (composable layer is responsible for finding first cooking day)
        expect(result).toEqual(teams)
    })

    it('should preserve existing team affinities and only assign to teams without affinities', () => {
        // GIVEN: 3 teams, T1 has affinity (Wed), T2 and T3 have no affinity
        const existingAffinity = createDefaultWeekdayMap([false, false, true, false, false, false, false]) // Wed
        const teams = [
            createTeam(1, 'Hold 1', existingAffinity),
            createTeam(2, 'Hold 2'),
            createTeam(3, 'Hold 3')
        ]
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false]) // Mon/Wed/Fri
        const firstDay = new Date(2025, 0, 6) // Monday, Jan 6

        // WHEN: Computing affinities (first call)
        const firstResult = computeAffinitiesForTeams(teams, cookingDays, 1, firstDay)

        // THEN: T1 keeps its existing affinity (Wed), T2 gets Mon, T3 gets Fri
        const t1AfterFirst = firstResult.find(t => t.id === 1)
        const t2AfterFirst = firstResult.find(t => t.id === 2)
        const t3AfterFirst = firstResult.find(t => t.id === 3)

        expect(t1AfterFirst?.affinity).toEqual(existingAffinity) // T1 unchanged (Wed)
        expect(t2AfterFirst?.affinity).toEqual(createDefaultWeekdayMap([true, false, false, false, false, false, false])) // T2 gets Mon (filtered index 0)
        expect(t3AfterFirst?.affinity).toEqual(createDefaultWeekdayMap([false, false, true, false, false, false, false])) // T3 gets Wed (filtered index 1, same as T1)

        // WHEN: Computing affinities again (second call) with same inputs
        const secondResult = computeAffinitiesForTeams(firstResult, cookingDays, 1, firstDay)

        // THEN: All teams keep their affinities from first call (idempotent)
        const t1AfterSecond = secondResult.find(t => t.id === 1)
        const t2AfterSecond = secondResult.find(t => t.id === 2)
        const t3AfterSecond = secondResult.find(t => t.id === 3)

        expect(t1AfterSecond?.affinity).toEqual(t1AfterFirst?.affinity)
        expect(t2AfterSecond?.affinity).toEqual(t2AfterFirst?.affinity)
        expect(t3AfterSecond?.affinity).toEqual(t3AfterFirst?.affinity)
    })
})

describe('compareAffinities', () => {
    it.each([
        { startDay: 'mandag' as WeekDay, aff1: ['mandag'], aff2: ['onsdag'], expected: -1 },
        { startDay: 'mandag' as WeekDay, aff1: ['onsdag'], aff2: ['mandag'], expected: 1 },
        { startDay: 'mandag' as WeekDay, aff1: ['søndag'], aff2: ['onsdag'], expected: 1 },
        { startDay: 'onsdag' as WeekDay, aff1: ['fredag'], aff2: ['mandag'], expected: -1 },
        { startDay: 'mandag' as WeekDay, aff1: ['mandag'], aff2: ['mandag'], expected: 0 }
    ])('startDay=$startDay, aff1=$aff1, aff2=$aff2 => $expected', ({ startDay, aff1, aff2, expected }) => {
        const compareFn = compareAffinities(startDay)
        expect(compareFn(createWeekDayMapFromSelection(aff1), createWeekDayMapFromSelection(aff2))).toBe(expected)
    })
})

describe('createSortedAffinitiesToTeamsMap', () => {
    it.each([
        {
            scenario: '3 teams, different affinities, default startDay (mandag)',
            teams: [
                createTeam(1, 'TeamC', createWeekDayMapFromSelection(['mandag', 'onsdag'])),
                createTeam(2, 'TeamA', createWeekDayMapFromSelection(['onsdag'])),
                createTeam(3, 'TeamB', createWeekDayMapFromSelection(['mandag', 'fredag']))
            ],
            startDay: undefined,
            expectedKeys: ['mandag', 'onsdag'],
            expectedTeams: { mandag: ['TeamB', 'TeamC'], onsdag: ['TeamA'] }
        },
        {
            scenario: '3 teams, different affinities, startDay=onsdag',
            teams: [
                createTeam(1, 'TeamC', createWeekDayMapFromSelection(['mandag'])),
                createTeam(2, 'TeamA', createWeekDayMapFromSelection(['onsdag'])),
                createTeam(3, 'TeamB', createWeekDayMapFromSelection(['fredag']))
            ],
            startDay: 'onsdag' as WeekDay,
            expectedKeys: ['onsdag', 'fredag', 'mandag'],
            expectedTeams: { onsdag: ['TeamA'], fredag: ['TeamB'], mandag: ['TeamC'] }
        },
        {
            scenario: 'same first weekday, sorted by name',
            teams: [
                createTeam(1, 'C-Team', createWeekDayMapFromSelection(['fredag'])),
                createTeam(2, 'A-Team', createWeekDayMapFromSelection(['fredag'])),
                createTeam(3, 'B-Team', createWeekDayMapFromSelection(['fredag']))
            ],
            startDay: undefined,
            expectedKeys: ['fredag'],
            expectedTeams: { fredag: ['A-Team', 'B-Team', 'C-Team'] }
        },
        {
            scenario: 'empty teams',
            teams: [],
            startDay: undefined,
            expectedKeys: [],
            expectedTeams: {}
        }
    ])('$scenario', ({ teams, startDay, expectedKeys, expectedTeams }) => {
        const result = startDay
            ? createSortedAffinitiesToTeamsMap(teams, startDay)
            : createSortedAffinitiesToTeamsMap(teams)

        // Verify key ordering
        expect(Array.from(result.keys())).toEqual(expectedKeys)

        // Verify teams within each key
        expectedKeys.forEach(weekday => {
            expect(result.get(weekday as WeekDay)?.map(t => t.name)).toEqual(expectedTeams[weekday])
        })
    })
})

describe('createTeamRoster', () => {
    it.each([
        {
            scenario: 'single affinity (3 teams)',
            startDay: 'mandag' as WeekDay,
            teams: [
                createTeam(1, 'Team1', createWeekDayMapFromSelection(['mandag'])),
                createTeam(2, 'Team2', createWeekDayMapFromSelection(['mandag'])),
                createTeam(3, 'Team3', createWeekDayMapFromSelection(['mandag']))
            ],
            expected: ['Team1', 'Team2', 'Team3']
        },
        {
            scenario: '3 different affinities (1 team each) zigzag',
            startDay: 'mandag' as WeekDay,
            teams: [
                createTeam(1, 'Mon1', createWeekDayMapFromSelection(['mandag'])),
                createTeam(2, 'Wed1', createWeekDayMapFromSelection(['onsdag'])),
                createTeam(3, 'Fri1', createWeekDayMapFromSelection(['fredag']))
            ],
            expected: ['Mon1', 'Wed1', 'Fri1']
        },
        {
            scenario: 'mixed affinities (varying sizes) zigzag round-robin',
            startDay: 'mandag' as WeekDay,
            teams: [
                createTeam(1, 'Mon1', createWeekDayMapFromSelection(['mandag'])),
                createTeam(2, 'Mon2', createWeekDayMapFromSelection(['mandag'])),
                createTeam(3, 'Mon3', createWeekDayMapFromSelection(['mandag'])),
                createTeam(4, 'Wed1', createWeekDayMapFromSelection(['onsdag'])),
                createTeam(5, 'Wed2', createWeekDayMapFromSelection(['onsdag'])),
                createTeam(6, 'Fri1', createWeekDayMapFromSelection(['fredag']))
            ],
            expected: ['Mon1', 'Wed1', 'Fri1', 'Mon2', 'Wed2', 'Mon3']
        },
        { scenario: 'empty teams', startDay: 'mandag' as WeekDay, teams: [], expected: [] }
    ])('$scenario', ({ startDay, teams, expected }) => {
        expect(createTeamRoster(startDay, teams).map(t => t.name)).toEqual(expected)
    })
})

describe('computeTeamAssignmentsForEvents', () => {
    it.each([
        {
            scenario: '3 teams, 6 events (Mon/Wed/Fri), consecutiveCookingDays=2',
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2'), createTeam(3, 'Hold 3')],
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
            events: [
                createEvent(1, new Date(2025, 0, 6)),  // Mon
                createEvent(2, new Date(2025, 0, 8)),  // Wed
                createEvent(3, new Date(2025, 0, 10)), // Fri
                createEvent(4, new Date(2025, 0, 13)), // Mon
                createEvent(5, new Date(2025, 0, 15)), // Wed
                createEvent(6, new Date(2025, 0, 17))  // Fri
            ],
            consecutiveCookingDays: 2,
            // T1: Mon+Wed, T2: Fri+Mon, T3: Wed+Fri → roster: [T1(Mon), T3(Wed), T2(Fri)]
            expectedAssignments: [1, 1, 3, 3, 2, 2]
        },
        {
            scenario: '2 teams, 4 events (Mon/Wed/Fri), consecutiveCookingDays=1',
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')],
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
            events: [
                createEvent(1, new Date(2025, 0, 6)),  // Mon
                createEvent(2, new Date(2025, 0, 8)),  // Wed
                createEvent(3, new Date(2025, 0, 10)), // Fri
                createEvent(4, new Date(2025, 0, 13))  // Mon
            ],
            consecutiveCookingDays: 1,
            expectedAssignments: [1, 2, 1, 2]
        },
        {
            scenario: '3 teams, 9 events (Mon/Wed/Fri), consecutiveCookingDays=3',
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2'), createTeam(3, 'Hold 3')],
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
            events: [
                createEvent(1, new Date(2025, 0, 6)),  // Mon
                createEvent(2, new Date(2025, 0, 8)),  // Wed
                createEvent(3, new Date(2025, 0, 10)), // Fri
                createEvent(4, new Date(2025, 0, 13)), // Mon
                createEvent(5, new Date(2025, 0, 15)), // Wed
                createEvent(6, new Date(2025, 0, 17)), // Fri
                createEvent(7, new Date(2025, 0, 20)), // Mon
                createEvent(8, new Date(2025, 0, 22)), // Wed
                createEvent(9, new Date(2025, 0, 24))  // Fri
            ],
            consecutiveCookingDays: 3,
            expectedAssignments: [1, 1, 1, 2, 2, 2, 3, 3, 3]
        }
    ])('should assign teams in round-robin: $scenario', ({ teams, cookingDays, events, consecutiveCookingDays, expectedAssignments }) => {
        // GIVEN: Teams with computed affinities
        const teamsWithAffinities = computeAffinitiesForTeams(teams, cookingDays, consecutiveCookingDays, events[0]!.date)

        // WHEN: Assigning teams to events
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, consecutiveCookingDays, events)

        // THEN: Teams are assigned in round-robin order based on quota
        expect(result.map(e => e.cookingTeamId)).toEqual(expectedAssignments)
    })

    it('should skip already assigned events but increment quota', () => {
        // GIVEN: 4 events with event 2 already assigned to team 99
        const teams = [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')]
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false])
        const events = [
            createEvent(1, new Date(2025, 0, 6)),     // Mon
            createEvent(2, new Date(2025, 0, 8), 99), // Wed - Already assigned
            createEvent(3, new Date(2025, 0, 10)),    // Fri
            createEvent(4, new Date(2025, 0, 13))     // Mon
        ]
        const teamsWithAffinities = computeAffinitiesForTeams(teams, cookingDays, 2, events[0]!.date)

        // WHEN: Assigning teams with consecutiveCookingDays=2
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, 2, events)

        // THEN: Already assigned event is skipped but quota increments
        expect(result[0]!.cookingTeamId).toBe(1)  // Event 1 → Team 1 (quota=1)
        expect(result[1]!.cookingTeamId).toBe(99) // Event 2 → Unchanged (quota=2, rotates)
        expect(result[2]!.cookingTeamId).toBe(2)  // Event 3 → Team 2 (new cycle)
        expect(result[3]!.cookingTeamId).toBe(2)  // Event 4 → Team 2 (quota=1)
    })

    it.each([
        {
            scenario: 'no events',
            teams: [createTeam(1, 'Hold 1')],
            events: [],
            expected: []
        },
        {
            scenario: 'no teams',
            teams: [],
            events: [createEvent(1, new Date(2025, 0, 6))],
            expected: [null]
        },
        {
            scenario: 'more teams than events',
            teams: [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2'), createTeam(3, 'Hold 3')],
            events: [createEvent(1, new Date(2025, 0, 6))],
            expected: [1]
        }
    ])('should handle edge case: $scenario', ({ teams, events, expected }) => {
        // GIVEN: Teams with computed affinities (if any)
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false])
        const teamsWithAffinities = teams.length > 0 && events.length > 0
            ? computeAffinitiesForTeams(teams, cookingDays, 1, events[0]!.date)
            : teams

        // WHEN: Assigning teams in edge case scenario
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, 1, events)

        // THEN: Expected assignment behavior
        expect(result.map(e => e.cookingTeamId)).toEqual(expected)
    })

    it('should handle SHORT holidays (< 7 days) by incrementing quota (ghost duty)', () => {
        // GIVEN: 3 events with 1-day holiday on Wed Jan 8 (short holiday = ghost duty)
        const teams = [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')]
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false])
        const holidays: DateRange[] = [
            { start: new Date(2025, 0, 8), end: new Date(2025, 0, 8) } // Wed Jan 8 only (1 day)
        ]
        const events = [
            createEvent(1, new Date(2025, 0, 6)),  // Mon Jan 6
            createEvent(2, new Date(2025, 0, 10)), // Fri Jan 10
            createEvent(3, new Date(2025, 0, 13))  // Mon Jan 13
        ]
        const teamsWithAffinities = computeAffinitiesForTeams(teams, cookingDays, 2, events[0]!.date)

        // WHEN: Assigning teams with consecutiveCookingDays=2
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, 2, events, holidays)

        // THEN: Short holiday counts as ghost duty - rotation happens
        expect(result[0]!.cookingTeamId).toBe(1) // Mon Jan 6 → Team 1 (quota=1)
        // Holiday Wed Jan 8 → SHORT (1 day) → ghost duty → Team 1 quota=2, rotation triggers
        expect(result[1]!.cookingTeamId).toBe(2) // Fri Jan 10 → Team 2 (new cycle, quota=1)
        expect(result[2]!.cookingTeamId).toBe(2) // Mon Jan 13 → Team 2 (quota=2)
    })

    it('should handle WEEK-OFF holidays (>= 7 days) by NOT incrementing quota (keeps weekday alignment)', () => {
        // GIVEN: Events with 1-week holiday (7 days) - full week = no ghost duty
        const teams = [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')]
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false]) // Mon/Wed/Fri
        const holidays: DateRange[] = [
            { start: new Date(2025, 0, 6), end: new Date(2025, 0, 12) } // Mon Jan 6 - Sun Jan 12 (7 days)
        ]
        const events = [
            // Week 1: Mon Jan 6, Wed Jan 8, Fri Jan 10 - ALL HOLIDAY (week-off)
            // Week 2: Mon Jan 13, Wed Jan 15, Fri Jan 17 - normal cooking
            createEvent(1, new Date(2025, 0, 13)), // Mon Jan 13
            createEvent(2, new Date(2025, 0, 15)), // Wed Jan 15
            createEvent(3, new Date(2025, 0, 17)), // Fri Jan 17
            createEvent(4, new Date(2025, 0, 20))  // Mon Jan 20
        ]
        const teamsWithAffinities = computeAffinitiesForTeams(teams, cookingDays, 2, events[0]!.date)

        // WHEN: Assigning teams with consecutiveCookingDays=2
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, 2, events, holidays)

        // THEN: Week-off holiday does NOT advance counter - teams keep their weekday alignment
        // No ghost duties from week-off, so rotation starts fresh from first event
        expect(result[0]!.cookingTeamId).toBe(1) // Mon Jan 13 → Team 1 (quota=1)
        expect(result[1]!.cookingTeamId).toBe(1) // Wed Jan 15 → Team 1 (quota=2, rotation)
        expect(result[2]!.cookingTeamId).toBe(2) // Fri Jan 17 → Team 2 (quota=1)
        expect(result[3]!.cookingTeamId).toBe(2) // Mon Jan 20 → Team 2 (quota=2)
    })

    it('should handle 8-day holiday as 1 week-off + 1 short day (partial ghost duty)', () => {
        // GIVEN: 8-day holiday = 7 days week-off + 1 day short (ghost duty)
        const teams = [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')]
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false]) // Mon/Wed/Fri
        const holidays: DateRange[] = [
            { start: new Date(2025, 0, 6), end: new Date(2025, 0, 13) } // Mon Jan 6 - Mon Jan 13 (8 days)
        ]
        const events = [
            // Holiday covers: Mon 6, Wed 8, Fri 10 (week-off portion), Mon 13 (short portion = ghost)
            // First actual events after holiday:
            createEvent(1, new Date(2025, 0, 15)), // Wed Jan 15
            createEvent(2, new Date(2025, 0, 17)), // Fri Jan 17
            createEvent(3, new Date(2025, 0, 20)), // Mon Jan 20
            createEvent(4, new Date(2025, 0, 22))  // Wed Jan 22
        ]
        const teamsWithAffinities = computeAffinitiesForTeams(teams, cookingDays, 2, events[0]!.date)

        // WHEN: Assigning teams with consecutiveCookingDays=2
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, 2, events, holidays)

        // THEN: Mon Jan 13 (8th day) counts as ghost duty for Team 1 (quota=1)
        // Week-off days (Jan 6, 8, 10) don't count
        // So Team 1 has 1 ghost duty, then first real event continues their quota
        expect(result[0]!.cookingTeamId).toBe(1) // Wed Jan 15 → Team 1 (quota=2 after ghost, rotation)
        expect(result[1]!.cookingTeamId).toBe(2) // Fri Jan 17 → Team 2 (quota=1)
        expect(result[2]!.cookingTeamId).toBe(2) // Mon Jan 20 → Team 2 (quota=2, rotation)
        expect(result[3]!.cookingTeamId).toBe(1) // Wed Jan 22 → Team 1 (quota=1)
    })

    it('should handle 2-week holiday (14 days) with no ghost duties', () => {
        // GIVEN: 14-day holiday = 2 full weeks = no ghost duties
        const teams = [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')]
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false]) // Mon/Wed/Fri
        const holidays: DateRange[] = [
            { start: new Date(2025, 0, 6), end: new Date(2025, 0, 19) } // Mon Jan 6 - Sun Jan 19 (14 days)
        ]
        const events = [
            createEvent(1, new Date(2025, 0, 20)), // Mon Jan 20
            createEvent(2, new Date(2025, 0, 22)), // Wed Jan 22
            createEvent(3, new Date(2025, 0, 24)), // Fri Jan 24
            createEvent(4, new Date(2025, 0, 27))  // Mon Jan 27
        ]
        const teamsWithAffinities = computeAffinitiesForTeams(teams, cookingDays, 2, events[0]!.date)

        // WHEN: Assigning teams
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, 2, events, holidays)

        // THEN: 2 full weeks = no ghost duties, rotation starts fresh
        expect(result[0]!.cookingTeamId).toBe(1) // Mon Jan 20 → Team 1 (quota=1)
        expect(result[1]!.cookingTeamId).toBe(1) // Wed Jan 22 → Team 1 (quota=2, rotation)
        expect(result[2]!.cookingTeamId).toBe(2) // Fri Jan 24 → Team 2 (quota=1)
        expect(result[3]!.cookingTeamId).toBe(2) // Mon Jan 27 → Team 2 (quota=2)
    })

    it('should handle no holidays (backwards compatible)', () => {
        // GIVEN: No holidays - same as original behavior
        const teams = [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')]
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false])
        const events = [
            createEvent(1, new Date(2025, 0, 6)),  // Mon
            createEvent(2, new Date(2025, 0, 8)),  // Wed
            createEvent(3, new Date(2025, 0, 10)), // Fri
            createEvent(4, new Date(2025, 0, 13))  // Mon
        ]
        const teamsWithAffinities = computeAffinitiesForTeams(teams, cookingDays, 2, events[0]!.date)

        // WHEN: Assigning without holidays parameter
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, 2, events)

        // THEN: Normal round-robin
        expect(result[0]!.cookingTeamId).toBe(1) // Mon → Team 1 (quota=1)
        expect(result[1]!.cookingTeamId).toBe(1) // Wed → Team 1 (quota=2, rotation)
        expect(result[2]!.cookingTeamId).toBe(2) // Fri → Team 2 (quota=1)
        expect(result[3]!.cookingTeamId).toBe(2) // Mon → Team 2 (quota=2)
    })

    /**
     * Real-world scenario from docs/team_assignment_sample.csv
     * Season: Aug 2025 - Jun 2026
     * Cooking days: Mon, Tue, Wed, Thu (4 days/week)
     * consecutiveCookingDays: 2 (Mon-Tue = team A, Wed-Thu = team B)
     * 8 teams rotating
     *
     * Holidays from CSV:
     * - Efterårsferie: Oct 13-16, 2025 (4 cooking days = 1 week-off)
     * - Juleferie: Dec 22, 2025 - Jan 4, 2026 (8 cooking days = 2 week-offs)
     * - Vinterferie: Feb 16-19, 2026 (4 cooking days = 1 week-off)
     * - Påskeferie: Mar 30 - Apr 6, 2026 (5 cooking days = 1 week-off + 1 ghost)
     * - Kr. Himmelfart: May 14, 2026 (1 cooking day = 1 ghost)
     * - Pinse: May 25, 2026 (1 cooking day = 1 ghost)
     */
    it('should match real-world team assignments from CSV (docs/team_assignment_sample.csv)', () => {
        // GIVEN: 8 teams, Mon-Thu cooking days, consecutiveCookingDays=2
        const teams = Array.from({length: 8}, (_, i) => createTeam(i + 1, `Hold ${i + 1}`))
        const cookingDays = createDefaultWeekdayMap([true, true, true, true, false, false, false]) // Mon-Thu
        const consecutiveCookingDays = 2

        // Holidays from the CSV
        const holidays: DateRange[] = [
            { start: new Date(2025, 9, 13), end: new Date(2025, 9, 16) },   // Efterårsferie: Oct 13-16
            { start: new Date(2025, 11, 22), end: new Date(2026, 0, 4) },   // Juleferie: Dec 22 - Jan 4
            { start: new Date(2026, 1, 16), end: new Date(2026, 1, 19) },   // Vinterferie: Feb 16-19
            { start: new Date(2026, 2, 30), end: new Date(2026, 3, 6) },    // Påskeferie: Mar 30 - Apr 6
            { start: new Date(2026, 4, 14), end: new Date(2026, 4, 14) },   // Kr. Himmelfart: May 14
            { start: new Date(2026, 4, 25), end: new Date(2026, 4, 25) }    // Pinse: May 25
        ]

        // Sample events with expected team assignments from CSV (date → expected team)
        // Format: [eventId, year, month (0-based), day, expectedTeamId]
        const csvExpectations: [number, number, number, number, number][] = [
            // August 2025 - Start of season
            [1, 2025, 7, 11, 1],   // Aug 11 Mon → Team 1
            [2, 2025, 7, 12, 1],   // Aug 12 Tue → Team 1
            [3, 2025, 7, 13, 2],   // Aug 13 Wed → Team 2
            [4, 2025, 7, 14, 2],   // Aug 14 Thu → Team 2
            [5, 2025, 7, 18, 3],   // Aug 18 Mon → Team 3
            [6, 2025, 7, 19, 3],   // Aug 19 Tue → Team 3
            [7, 2025, 7, 20, 4],   // Aug 20 Wed → Team 4
            [8, 2025, 7, 21, 4],   // Aug 21 Thu → Team 4

            // September - Full cycle completes, rotation restarts
            [9, 2025, 8, 1, 7],    // Sep 1 Mon → Team 7
            [10, 2025, 8, 2, 7],   // Sep 2 Tue → Team 7
            [11, 2025, 8, 3, 8],   // Sep 3 Wed → Team 8
            [12, 2025, 8, 4, 8],   // Sep 4 Thu → Team 8
            [13, 2025, 8, 8, 1],   // Sep 8 Mon → Team 1 (new cycle)
            [14, 2025, 8, 9, 1],   // Sep 9 Tue → Team 1

            // Before Efterårsferie
            [15, 2025, 9, 6, 1],   // Oct 6 Mon → Team 1
            [16, 2025, 9, 7, 1],   // Oct 7 Tue → Team 1
            [17, 2025, 9, 8, 2],   // Oct 8 Wed → Team 2
            [18, 2025, 9, 9, 2],   // Oct 9 Thu → Team 2
            // Oct 13-16: Efterårsferie (4 cooking days = 1 week-off, no ghost)
            [19, 2025, 9, 20, 3],  // Oct 20 Mon → Team 3 (continues from Team 2)
            [20, 2025, 9, 21, 3],  // Oct 21 Tue → Team 3
            [21, 2025, 9, 22, 4],  // Oct 22 Wed → Team 4
            [22, 2025, 9, 23, 4],  // Oct 23 Thu → Team 4

            // Before Juleferie
            [23, 2025, 11, 15, 3], // Dec 15 Mon → Team 3
            [24, 2025, 11, 16, 3], // Dec 16 Tue → Team 3
            [25, 2025, 11, 17, 4], // Dec 17 Wed → Team 4
            [26, 2025, 11, 18, 4], // Dec 18 Thu → Team 4
            // Dec 22 - Jan 4: Juleferie (8 cooking days = 2 week-offs, no ghost)
            [27, 2026, 0, 5, 5],   // Jan 5 Mon → Team 5 (continues from Team 4)
            [28, 2026, 0, 6, 5],   // Jan 6 Tue → Team 5
            [29, 2026, 0, 7, 6],   // Jan 7 Wed → Team 6
            [30, 2026, 0, 8, 6],   // Jan 8 Thu → Team 6

            // Before Vinterferie
            [31, 2026, 1, 9, 7],   // Feb 9 Mon → Team 7
            [32, 2026, 1, 10, 7],  // Feb 10 Tue → Team 7
            [33, 2026, 1, 11, 8],  // Feb 11 Wed → Team 8
            [34, 2026, 1, 12, 8],  // Feb 12 Thu → Team 8
            // Feb 16-19: Vinterferie (4 cooking days = 1 week-off, no ghost)
            [35, 2026, 1, 23, 1],  // Feb 23 Mon → Team 1 (continues from Team 8)
            [36, 2026, 1, 24, 1],  // Feb 24 Tue → Team 1
            [37, 2026, 1, 25, 2],  // Feb 25 Wed → Team 2
            [38, 2026, 1, 26, 2],  // Feb 26 Thu → Team 2

            // Before Påskeferie
            [39, 2026, 2, 23, 1],  // Mar 23 Mon → Team 1
            [40, 2026, 2, 24, 1],  // Mar 24 Tue → Team 1
            [41, 2026, 2, 25, 2],  // Mar 25 Wed → Team 2
            [42, 2026, 2, 26, 2],  // Mar 26 Thu → Team 2
            // Mar 30 - Apr 6: Påskeferie (5 cooking days = 1 week-off + 1 ghost on Apr 6)
            [43, 2026, 3, 7, 3],   // Apr 7 Tue → Team 3 (ghost on Apr 6 Mon advanced Team 3)
            [44, 2026, 3, 8, 4],   // Apr 8 Wed → Team 4
            [45, 2026, 3, 9, 4],   // Apr 9 Thu → Team 4

            // Before Kr. Himmelfart
            [46, 2026, 4, 11, 5],  // May 11 Mon → Team 5
            [47, 2026, 4, 12, 5],  // May 12 Tue → Team 5
            [48, 2026, 4, 13, 6],  // May 13 Wed → Team 6
            // May 14: Kr. Himmelfart (1 cooking day = 1 ghost)
            [49, 2026, 4, 18, 7],  // May 18 Mon → Team 7 (ghost on May 14 Thu advanced Team 6)
            [50, 2026, 4, 19, 7],  // May 19 Tue → Team 7

            // Before Pinse
            [51, 2026, 4, 20, 8],  // May 20 Wed → Team 8
            [52, 2026, 4, 21, 8],  // May 21 Thu → Team 8
            // May 25: Pinse (1 cooking day = 1 ghost)
            [53, 2026, 4, 26, 1],  // May 26 Tue → Team 1 (ghost on May 25 Mon advanced rotation)
            [54, 2026, 4, 27, 2],  // May 27 Wed → Team 2
            [55, 2026, 4, 28, 2],  // May 28 Thu → Team 2
        ]

        // Create events from expectations
        const events = csvExpectations.map(([id, year, month, day]) =>
            createEvent(id, new Date(year, month, day))
        )

        // Compute affinities starting from first event
        const teamsWithAffinities = computeAffinitiesForTeams(teams, cookingDays, consecutiveCookingDays, events[0]!.date)

        // WHEN: Assigning teams to events
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, consecutiveCookingDays, events, holidays)

        // THEN: All assignments match CSV expectations
        csvExpectations.forEach(([id, year, month, day, expectedTeam]) => {
            const event = result.find(e => e.id === id)
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            expect(event?.cookingTeamId, `Event ${id} (${dateStr}) should be Team ${expectedTeam}`).toBe(expectedTeam)
        })
    })
})

describe('Active Season Management utilities', () => {
    describe('isPast', () => {
        it.each([
            { desc: 'season ending yesterday', end: new Date(2025, 0, 10), ref: new Date(2025, 0, 11), expected: true },
            { desc: 'season ending today (not past)', end: new Date(2025, 0, 15), ref: new Date(2025, 0, 15), expected: false },
            { desc: 'season ending tomorrow', end: new Date(2025, 0, 20), ref: new Date(2025, 0, 19), expected: false }
        ])('$desc → $expected', ({ end, ref, expected }) => {
            const season = { ...SeasonFactory.defaultSeason(), id: 1, seasonDates: { start: new Date(2025, 0, 1), end } }
            expect(isPast(season, ref)).toBe(expected)
        })
    })

    describe('isFuture', () => {
        it.each([
            { desc: 'season starting tomorrow', start: new Date(2025, 0, 16), ref: new Date(2025, 0, 15), expected: true },
            { desc: 'season starting today (not future)', start: new Date(2025, 0, 15), ref: new Date(2025, 0, 15), expected: false },
            { desc: 'season starting yesterday', start: new Date(2025, 0, 10), ref: new Date(2025, 0, 11), expected: false }
        ])('$desc → $expected', ({ start, ref, expected }) => {
            const season = { ...SeasonFactory.defaultSeason(), id: 1, seasonDates: { start, end: new Date(2025, 5, 30) } }
            expect(isFuture(season, ref)).toBe(expected)
        })
    })

    describe('distanceToToday', () => {
        it.each([
            { desc: 'current season (includes today)', start: new Date(2025, 0, 1), end: new Date(2025, 5, 30), ref: new Date(2025, 2, 15), expected: 0 },
            { desc: 'future season starting in 10 days', start: new Date(2025, 0, 25), end: new Date(2025, 5, 30), ref: new Date(2025, 0, 15), expected: 10 },
            { desc: 'past season ended 5 days ago', start: new Date(2024, 6, 1), end: new Date(2025, 0, 10), ref: new Date(2025, 0, 15), expected: -5 }
        ])('$desc → $expected', ({ start, end, ref, expected }) => {
            const season = { ...SeasonFactory.defaultSeason(), id: 1, seasonDates: { start, end } }
            expect(distanceToToday(season, ref)).toBe(expected)
        })
    })

    describe('canSeasonBeActive', () => {
        it.each([
            { desc: 'past season (ended yesterday)', start: new Date(2025, 0, 1), end: new Date(2025, 0, 14), ref: new Date(2025, 0, 15), expected: false },
            { desc: 'current season (includes today)', start: new Date(2025, 0, 1), end: new Date(2025, 0, 31), ref: new Date(2025, 0, 15), expected: true },
            { desc: 'future season', start: new Date(2025, 1, 1), end: new Date(2025, 5, 30), ref: new Date(2025, 0, 15), expected: true },
            { desc: 'season ending today (still eligible)', start: new Date(2025, 0, 1), end: new Date(2025, 0, 15), ref: new Date(2025, 0, 15), expected: true }
        ])('$desc → $expected', ({ start, end, ref, expected }) => {
            const season = { ...SeasonFactory.defaultSeason(), id: 1, seasonDates: { start, end } }
            expect(canSeasonBeActive(season, ref)).toBe(expected)
        })
    })

    describe('getSeasonStatus', () => {
        it.each([
            { desc: 'active season (isActive = true)', active: true, start: new Date(2025, 0, 1), end: new Date(2025, 5, 30), ref: new Date(2025, 2, 15), expected: SEASON_STATUS.ACTIVE },
            { desc: 'past season', active: false, start: new Date(2024, 6, 1), end: new Date(2024, 11, 31), ref: new Date(2025, 0, 15), expected: SEASON_STATUS.PAST },
            { desc: 'current season (not active)', active: false, start: new Date(2025, 0, 1), end: new Date(2025, 5, 30), ref: new Date(2025, 2, 15), expected: SEASON_STATUS.CURRENT },
            { desc: 'future season', active: false, start: new Date(2025, 6, 1), end: new Date(2025, 11, 31), ref: new Date(2025, 0, 15), expected: SEASON_STATUS.FUTURE }
        ])('$desc → $expected', ({ active, start, end, ref, expected }) => {
            const season = { ...SeasonFactory.defaultSeason(), id: 1, isActive: active, seasonDates: { start, end } }
            expect(getSeasonStatus(season, ref)).toBe(expected)
        })
    })

    describe('sortSeasonsByActivePriority', () => {
        it('should sort: active → future (closest) → current → past (recent)', () => {
            const ref = new Date(2025, 0, 15)
            const seasons = [
                { ...SeasonFactory.defaultSeason(), id: 1, shortName: 'Past Far', isActive: false, seasonDates: { start: new Date(2023, 0, 1), end: new Date(2023, 11, 31) } },
                { ...SeasonFactory.defaultSeason(), id: 2, shortName: 'Past Recent', isActive: false, seasonDates: { start: new Date(2024, 6, 1), end: new Date(2024, 11, 31) } },
                { ...SeasonFactory.defaultSeason(), id: 3, shortName: 'Current', isActive: false, seasonDates: { start: new Date(2025, 0, 1), end: new Date(2025, 5, 30) } },
                { ...SeasonFactory.defaultSeason(), id: 4, shortName: 'Active', isActive: true, seasonDates: { start: new Date(2025, 0, 1), end: new Date(2025, 5, 30) } },
                { ...SeasonFactory.defaultSeason(), id: 5, shortName: 'Future Close', isActive: false, seasonDates: { start: new Date(2025, 1, 1), end: new Date(2025, 6, 30) } },
                { ...SeasonFactory.defaultSeason(), id: 6, shortName: 'Future Far', isActive: false, seasonDates: { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) } }
            ]

            expect(sortSeasonsByActivePriority(seasons, ref).map(s => s.shortName)).toEqual([
                'Active', 'Future Close', 'Future Far', 'Current', 'Past Recent', 'Past Far'
            ])
        })

        it.each([
            { desc: 'empty array', seasons: [], expected: [] },
            { desc: 'single season', seasons: [{ ...SeasonFactory.defaultSeason(), id: 1, shortName: 'Test' }], expected: ['Test'] }
        ])('$desc', ({ seasons, expected }) => {
            expect(sortSeasonsByActivePriority(seasons).map(s => s.shortName)).toEqual(expected)
        })
    })

    describe('selectMostAppropriateActiveSeason', () => {
        it.each([
            {
                desc: 'future season closest to today',
                ref: new Date(2025, 0, 15),
                seasons: [
                    { ...SeasonFactory.defaultSeason(), id: 1, shortName: 'Past', isActive: false, seasonDates: { start: new Date(2024, 0, 1), end: new Date(2024, 11, 31) } },
                    { ...SeasonFactory.defaultSeason(), id: 2, shortName: 'Future Close', isActive: false, seasonDates: { start: new Date(2025, 1, 1), end: new Date(2025, 6, 30) } },
                    { ...SeasonFactory.defaultSeason(), id: 3, shortName: 'Future Far', isActive: false, seasonDates: { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) } }
                ],
                expected: 'Future Close'
            },
            {
                desc: 'current season when no future',
                ref: new Date(2025, 2, 15),
                seasons: [
                    { ...SeasonFactory.defaultSeason(), id: 1, shortName: 'Past', isActive: false, seasonDates: { start: new Date(2024, 0, 1), end: new Date(2024, 11, 31) } },
                    { ...SeasonFactory.defaultSeason(), id: 2, shortName: 'Current', isActive: false, seasonDates: { start: new Date(2025, 0, 1), end: new Date(2025, 5, 30) } }
                ],
                expected: 'Current'
            }
        ])('$desc', ({ ref, seasons, expected }) => {
            expect(selectMostAppropriateActiveSeason(seasons, ref)?.shortName).toBe(expected)
        })

        it.each([
            {
                desc: 'null when all past (cannot activate)',
                ref: new Date(2026, 0, 15),
                seasons: [
                    { ...SeasonFactory.defaultSeason(), id: 1, shortName: 'Past 2023', isActive: false, seasonDates: { start: new Date(2023, 0, 1), end: new Date(2023, 11, 31) } },
                    { ...SeasonFactory.defaultSeason(), id: 2, shortName: 'Past 2024', isActive: false, seasonDates: { start: new Date(2024, 0, 1), end: new Date(2024, 11, 31) } },
                    { ...SeasonFactory.defaultSeason(), id: 3, shortName: 'Past 2025', isActive: false, seasonDates: { start: new Date(2025, 0, 1), end: new Date(2025, 11, 31) } }
                ]
            },
            { desc: 'null when no seasons', ref: new Date(2025, 0, 15), seasons: [] }
        ])('$desc', ({ ref, seasons }) => {
            expect(selectMostAppropriateActiveSeason(seasons, ref)).toBeNull()
        })
    })

    describe('splitDinnerEvents', () => {
        it.each([
            {
                scenario: 'splits events with next dinner at start',
                events: [
                    { id: 1, date: new Date(2025, 0, 6, 18, 0) },
                    { id: 2, date: new Date(2025, 0, 8, 18, 0) },
                    { id: 3, date: new Date(2025, 0, 10, 18, 0) }
                ],
                nextDinnerDateRange: { start: new Date(2025, 0, 6, 18, 0), end: new Date(2025, 0, 6, 19, 0) },
                expectedNextDinnerId: 1,
                expectedOtherCount: 2
            },
            {
                scenario: 'splits events with next dinner in middle',
                events: [
                    { id: 1, date: new Date(2025, 0, 6, 18, 0) },
                    { id: 2, date: new Date(2025, 0, 8, 18, 0) },
                    { id: 3, date: new Date(2025, 0, 10, 18, 0) }
                ],
                nextDinnerDateRange: { start: new Date(2025, 0, 8, 18, 0), end: new Date(2025, 0, 8, 19, 0) },
                expectedNextDinnerId: 2,
                expectedOtherCount: 2
            },
            {
                scenario: 'splits events with next dinner at end',
                events: [
                    { id: 1, date: new Date(2025, 0, 6, 18, 0) },
                    { id: 2, date: new Date(2025, 0, 8, 18, 0) },
                    { id: 3, date: new Date(2025, 0, 10, 18, 0) }
                ],
                nextDinnerDateRange: { start: new Date(2025, 0, 10, 18, 0), end: new Date(2025, 0, 10, 19, 0) },
                expectedNextDinnerId: 3,
                expectedOtherCount: 2
            },
            {
                scenario: 'matches by same day, ignoring time differences',
                events: [
                    { id: 1, date: new Date(2025, 0, 6, 18, 0) },
                    { id: 2, date: new Date(2025, 0, 8, 12, 30) }
                ],
                nextDinnerDateRange: { start: new Date(2025, 0, 8, 18, 0), end: new Date(2025, 0, 8, 19, 0) },
                expectedNextDinnerId: 2,
                expectedOtherCount: 1
            }
        ])('$scenario', ({ events, nextDinnerDateRange, expectedNextDinnerId, expectedOtherCount }) => {
            const result = splitDinnerEvents(events, nextDinnerDateRange)

            // Validate structure
            const parseResult = SplitDinnerEventsResultSchema.safeParse(result)
            expect(parseResult.success, parseResult.success ? '' : JSON.stringify(parseResult.error.format(), null, 2)).toBe(true)

            // Verify expected values
            expect(result.nextDinner?.id).toBe(expectedNextDinnerId)
            const allOtherDates = [...result.pastDinnerDates, ...result.futureDinnerDates]
            expect(allOtherDates).toHaveLength(expectedOtherCount)
        })

        it.each([
            {
                scenario: 'returns null nextDinner when no match',
                events: [
                    { id: 1, date: new Date(2025, 0, 6, 18, 0) },
                    { id: 2, date: new Date(2025, 0, 8, 18, 0) }
                ],
                nextDinnerDateRange: { start: new Date(2025, 0, 15, 18, 0), end: new Date(2025, 0, 15, 19, 0) },
                expectedOtherCount: 2
            },
            {
                scenario: 'returns all events as others when nextDinnerDateRange is null',
                events: [
                    { id: 1, date: new Date(2025, 0, 6, 18, 0) },
                    { id: 2, date: new Date(2025, 0, 8, 18, 0) },
                    { id: 3, date: new Date(2025, 0, 10, 18, 0) }
                ],
                nextDinnerDateRange: null,
                expectedOtherCount: 3
            },
            {
                scenario: 'handles empty events array',
                events: [],
                nextDinnerDateRange: { start: new Date(2025, 0, 8, 18, 0), end: new Date(2025, 0, 8, 19, 0) },
                expectedOtherCount: 0
            }
        ])('$scenario', ({ events, nextDinnerDateRange, expectedOtherCount }) => {
            const result = splitDinnerEvents(events, nextDinnerDateRange)

            expect(result.nextDinner).toBeNull()
            const allOtherDates = [...result.pastDinnerDates, ...result.futureDinnerDates]
            expect(allOtherDates).toHaveLength(expectedOtherCount)
        })
    })

    describe('sortDinnerEventsByTemporal', () => {
        // Use fixed reference date for predictable tests
        const referenceDate = new Date(2025, 5, 15, 12, 0) // June 15, 2025 noon

        beforeEach(() => {
            vi.useFakeTimers()
            vi.setSystemTime(referenceDate)
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('should sort events in temporal order: next, future (ascending), past (descending)', () => {
            const pastEvent1 = { id: 1, date: new Date(2025, 5, 10, 18, 0) } // June 10
            const pastEvent2 = { id: 2, date: new Date(2025, 5, 13, 18, 0) } // June 13
            const nextEvent = { id: 3, date: new Date(2025, 5, 15, 18, 0) }  // June 15 (today)
            const futureEvent1 = { id: 4, date: new Date(2025, 5, 18, 18, 0) } // June 18
            const futureEvent2 = { id: 5, date: new Date(2025, 5, 22, 18, 0) } // June 22

            const events = [futureEvent2, pastEvent1, nextEvent, pastEvent2, futureEvent1]
            const nextDinnerDateRange = { start: nextEvent.date, end: new Date(2025, 5, 15, 19, 0) }

            const result = sortDinnerEventsByTemporal(events, nextDinnerDateRange)

            // Order: next, future (ascending), past (descending - most recent first)
            expect(result.map(e => e.id)).toEqual([3, 4, 5, 2, 1])
            expect(result.map(e => e.temporalCategory)).toEqual(['next', 'future', 'future', 'past', 'past'])
        })

        it('should handle null nextDinnerDateRange', () => {
            const pastEvent = { id: 1, date: new Date(2025, 5, 10, 18, 0) }
            const futureEvent = { id: 2, date: new Date(2025, 5, 20, 18, 0) }

            const result = sortDinnerEventsByTemporal([pastEvent, futureEvent], null)

            expect(result.map(e => e.id)).toEqual([2, 1])
            expect(result.map(e => e.temporalCategory)).toEqual(['future', 'past'])
        })

        it('should handle empty events array', () => {
            const result = sortDinnerEventsByTemporal([], null)
            expect(result).toEqual([])
        })
    })

    describe('getNextDinnerDate', () => {
        it('should find next dinner when there are future dates', () => {
            // GIVEN: Dinner dates with mix of past and future
            const dinnerDates = [
                new Date(2020, 10, 3, 18, 0),  // Nov 3, 2020 (past)
                new Date(2030, 10, 17, 18, 0)  // Nov 17, 2030 (future)
            ]
            const dinnerStartHour = 18

            // WHEN: Getting next dinner
            const getNext = getNextDinnerDate(60)
            const result = getNext(dinnerDates, dinnerStartHour)

            // THEN: Should return the next future date (skipping past dates)
            expect(result).not.toBeNull()
            expect(result?.start).toEqual(new Date(2030, 10, 17, 18, 0))
        })

        it('should return null when all dates are in the past', () => {
            // GIVEN: Only past dinner dates
            const dinnerDates = [
                new Date(2020, 0, 1, 18, 0),
                new Date(2020, 0, 3, 18, 0)
            ]
            const dinnerStartHour = 18

            // WHEN: Getting next dinner
            const getNext = getNextDinnerDate(60)
            const result = getNext(dinnerDates, dinnerStartHour)

            // THEN: Should return null
            expect(result).toBeNull()
        })

        describe('timezone handling for Heynabo integration (ADR-013)', () => {
            // Verifies dinner times are correctly represented when converted to ISO strings
            // 18:00 Copenhagen should be 17:00 UTC (winter) or 16:00 UTC (summer)

            it.each([
                {
                    scenario: 'winter (CET, UTC+1)',
                    dinnerDate: new Date(2030, 0, 15), // Jan 15, 2030 (future)
                    expectedUtcHour: 17 // 18:00 Copenhagen = 17:00 UTC
                },
                {
                    scenario: 'summer (CEST, UTC+2)',
                    dinnerDate: new Date(2030, 6, 15), // July 15, 2030 (future)
                    expectedUtcHour: 16 // 18:00 Copenhagen = 16:00 UTC
                }
            ])('$scenario: 18:00 Copenhagen → $expectedUtcHour:00 UTC', ({ dinnerDate, expectedUtcHour }) => {
                const getNext = getNextDinnerDate(60)
                const result = getNext([dinnerDate], 18)

                expect(result).not.toBeNull()
                expect(result!.start.getUTCHours()).toBe(expectedUtcHour)
            })
        })
    })

    describe('isBeforeDeadline', () => {
        let mockNow: Date

        beforeEach(() => {
            // Set a fixed "now" for testing: Jan 15, 2025 at 12:00
            mockNow = new Date(2025, 0, 15, 12, 0, 0)
            vi.useFakeTimers()
            vi.setSystemTime(mockNow)
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it.each([
            {
                scenario: 'now is before deadline (3 days before dinner)',
                dinnerStartTime: new Date(2025, 0, 20, 18, 0),  // Jan 20 at 18:00
                offsetDays: 2,
                offsetMinutes: 0,
                expected: true  // Now (Jan 15) is before Jan 18 (2 days before dinner)
            },
            {
                scenario: 'now is after deadline (dinner tomorrow)',
                dinnerStartTime: new Date(2025, 0, 16, 18, 0),  // Jan 16 at 18:00
                offsetDays: 2,
                offsetMinutes: 0,
                expected: false  // Now (Jan 15) is after Jan 14 (2 days before dinner)
            },
            {
                scenario: 'now is exactly at deadline',
                dinnerStartTime: new Date(2025, 0, 17, 12, 0),  // Jan 17 at 12:00
                offsetDays: 2,
                offsetMinutes: 0,
                expected: false  // Now (Jan 15 12:00) equals deadline (Jan 15 12:00)
            },
            {
                scenario: 'minutes offset - before deadline',
                dinnerStartTime: new Date(2025, 0, 15, 18, 0),  // Jan 15 at 18:00 (today)
                offsetDays: 0,
                offsetMinutes: 120,  // 2 hours
                expected: true  // Now (12:00) is before 16:00 (2 hours before 18:00)
            },
            {
                scenario: 'minutes offset - after deadline',
                dinnerStartTime: new Date(2025, 0, 15, 12, 0),  // Jan 15 at 12:00 (today, same as now)
                offsetDays: 0,
                offsetMinutes: 30,
                expected: false  // Now (12:00) is after 11:30 (30 min before 12:00), deadline passed
            },
            {
                scenario: 'combined days and minutes - before deadline',
                dinnerStartTime: new Date(2025, 0, 18, 18, 0),  // Jan 18 at 18:00
                offsetDays: 2,
                offsetMinutes: 360,  // 6 hours
                expected: true  // Now (Jan 15 12:00) is before Jan 16 12:00 (2 days + 6 hours before dinner)
            },
            {
                scenario: 'combined days and minutes - after deadline',
                dinnerStartTime: new Date(2025, 0, 16, 10, 0),  // Jan 16 at 10:00
                offsetDays: 1,
                offsetMinutes: 120,  // 2 hours
                expected: false  // Now (Jan 15 12:00) is after Jan 15 08:00 (1 day + 2 hours before dinner), deadline passed
            },
            {
                scenario: 'zero offsets - dinner in future',
                dinnerStartTime: new Date(2025, 0, 20, 18, 0),  // Jan 20 at 18:00
                offsetDays: 0,
                offsetMinutes: 0,
                expected: true  // Now is before dinner time
            },
            {
                scenario: 'zero offsets - dinner in past',
                dinnerStartTime: new Date(2025, 0, 10, 18, 0),  // Jan 10 at 18:00
                offsetDays: 0,
                offsetMinutes: 0,
                expected: false  // Now is after dinner time
            }
        ])('$scenario', ({ dinnerStartTime, offsetDays, offsetMinutes, expected }) => {
            // WHEN: Checking if now is before deadline
            const checkDeadline = isBeforeDeadline(offsetDays, offsetMinutes)
            const result = checkDeadline(dinnerStartTime)

            // THEN: Returns expected result
            expect(result).toBe(expected)
        })

        it('should use default parameters (0 days, 0 minutes)', () => {
            // GIVEN: Dinner tomorrow at 18:00
            const dinnerStartTime = new Date(2025, 0, 16, 18, 0)

            // WHEN: Calling with default parameters
            const checkDeadline = isBeforeDeadline()
            const result = checkDeadline(dinnerStartTime)

            // THEN: Checks against dinner time directly (no offset)
            expect(result).toBe(true)  // Now (Jan 15 12:00) is before Jan 16 18:00
        })
    })

    describe('calculateDeadlineUrgency', () => {
        it.each([
            {
                scenario: 'on track - 80 hours before dinner',
                dinnerStartTime: new Date(2025, 0, 15, 18, 0),
                criticalHours: 24,
                warningHours: 72,
                expected: 0  // > 72h = on track
            },
            {
                scenario: 'warning - 48 hours before dinner',
                dinnerStartTime: new Date(2025, 0, 13, 18, 0),
                criticalHours: 24,
                warningHours: 72,
                expected: 1  // 24h < x < 72h = warning
            },
            {
                scenario: 'critical - 12 hours before dinner',
                dinnerStartTime: new Date(2025, 0, 12, 6, 0),
                criticalHours: 24,
                warningHours: 72,
                expected: 2  // < 24h = critical
            },
            {
                scenario: 'boundary - exactly 24 hours (critical threshold)',
                dinnerStartTime: new Date(2025, 0, 12, 18, 0),
                criticalHours: 24,
                warningHours: 72,
                expected: 1  // Exactly 24h = warning (not critical)
            },
            {
                scenario: 'boundary - exactly 72 hours (warning threshold)',
                dinnerStartTime: new Date(2025, 0, 14, 18, 0),
                criticalHours: 24,
                warningHours: 72,
                expected: 0  // Exactly 72h = on track
            },
            {
                scenario: 'past event - negative hours',
                dinnerStartTime: new Date(2025, 0, 10, 18, 0),
                criticalHours: 24,
                warningHours: 72,
                expected: 0  // Past events = on track (no urgency)
            }
        ])('$scenario', ({ dinnerStartTime, criticalHours, warningHours, expected }) => {
            // GIVEN: Fixed reference time (Jan 11, 2025 at 18:00)
            const referenceTime = new Date(2025, 0, 11, 18, 0)

            // WHEN: Calculating deadline urgency
            const urgency = calculateDeadlineUrgency(dinnerStartTime, criticalHours, warningHours, referenceTime)

            // THEN: Returns expected urgency level
            expect(urgency).toBe(expected)
        })

        it.each([
            {
                scenario: 'custom thresholds - 12h critical, 36h warning',
                dinnerStartTime: new Date(2025, 0, 12, 6, 0),
                criticalHours: 12,
                warningHours: 36,
                expectedUrgency: 1  // 12h < time < 36h = warning
            },
            {
                scenario: 'custom thresholds - 6 hours before (critical)',
                dinnerStartTime: new Date(2025, 0, 12, 0, 0),
                criticalHours: 12,
                warningHours: 36,
                expectedUrgency: 2  // < 12h = critical
            }
        ])('$scenario', ({ dinnerStartTime, criticalHours, warningHours, expectedUrgency }) => {
            // GIVEN: Fixed reference time (Jan 11, 2025 at 18:00)
            const referenceTime = new Date(2025, 0, 11, 18, 0)

            // WHEN: Calculating with custom thresholds
            const urgency = calculateDeadlineUrgency(dinnerStartTime, criticalHours, warningHours, referenceTime)

            // THEN: Respects custom threshold values
            expect(urgency).toBe(expectedUrgency)
        })
    })
})
