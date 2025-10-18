import { describe, it, expect } from 'vitest'
import { computeCookingDates, computeAffinitiesForTeams, computeTeamAssignmentsForEvents, isThisACookingDay, findFirstCookingDayInDates, compareAffinities, createSortedAffinitiesToTeamsMap, createTeamRoster } from '~/utils/season'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import type { DateRange, WeekDay, WeekDayMap } from '~/types/dateTypes'
import type { CookingTeam } from '~/composables/useCookingTeamValidation'
import type { DinnerEvent } from '~/composables/useDinnerEventValidation'
import { createWeekDayMapFromSelection } from '~/types/dateTypes'

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
    menuTitle: 'TBD',
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

    it('should handle holidays by incrementing quota without assignment', () => {
        // GIVEN: 3 events with holiday on Wed Jan 8 (between Mon and Fri)
        const teams = [createTeam(1, 'Hold 1'), createTeam(2, 'Hold 2')]
        const cookingDays = createDefaultWeekdayMap([true, false, true, false, true, false, false])
        const events = [
            createEvent(1, new Date(2025, 0, 6)),  // Mon Jan 6
            createEvent(2, new Date(2025, 0, 10)), // Fri Jan 10
            createEvent(3, new Date(2025, 0, 13))  // Mon Jan 13
        ]
        const teamsWithAffinities = computeAffinitiesForTeams(teams, cookingDays, 2, events[0]!.date)

        // WHEN: Assigning teams with consecutiveCookingDays=2
        const result = computeTeamAssignmentsForEvents(teamsWithAffinities, cookingDays, 2, events)

        // THEN: Team gets credit for holiday and rotates as if event existed
        expect(result[0]!.cookingTeamId).toBe(1) // Mon Jan 6 → Team 1 (quota=1)
        // Holiday Wed Jan 8 → Team 1 gets credit (quota=2, rotation triggers)
        expect(result[1]!.cookingTeamId).toBe(2) // Fri Jan 10 → Team 2 (new cycle, quota=1)
        expect(result[2]!.cookingTeamId).toBe(2) // Mon Jan 13 → Team 2 (quota=2)
    })
})
