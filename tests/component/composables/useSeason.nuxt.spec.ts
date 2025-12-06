import {describe, it, expect} from 'vitest'
import {useSeason} from '~/composables/useSeason'
import type {Season} from '~/composables/useSeasonValidation'
import type {DateRange, WeekDayMap} from "~/types/dateTypes"
import {WEEKDAYS} from "~/types/dateTypes"
import {useWeekDayMapValidation} from '~/composables/useWeekDayMapValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

const {createDefaultWeekdayMap} = useWeekDayMapValidation()
const {DinnerEventCreateSchema} = useBookingValidation()

describe('useSeasonSchema', () => {
    it('should validate default season', async () => {
        const {SeasonSchema, getDefaultSeason} = useSeason()
        const defaultSeason = getDefaultSeason()
        const result = SeasonSchema.safeParse(defaultSeason)

        expect(result.success, result.success ? '' : JSON.stringify(result.error.format(), null, 2)).toBe(true)
        if (result.success) {
            const parsed = result.data
            expect(parsed.seasonDates.start).toBeInstanceOf(Date)
            expect(parsed.seasonDates.end).toBeInstanceOf(Date)
            expect(Object.keys(parsed.cookingDays)).toHaveLength(7)
            expect(parsed.holidays.length).toBe(0) // Empty - component calculates reactively
            expect(parsed.isActive).toBe(false)
            expect(parsed.consecutiveCookingDays).toBe(2)
            expect(parsed.ticketPrices).toBeDefined()
            expect(parsed.ticketPrices.length).toBe(4)
        }
    })

    it('should create correct season name', async () => {
        const {createSeasonName} = useSeason()

        const dateRange = {
            start: new Date(2024, 0, 1),
            end: new Date(2024, 11, 31)
        } satisfies DateRange
        expect(createSeasonName(dateRange)).toBe('01/24-12/24')
    })

    it('should correctly determine if date is within season', async () => {
        const {isActive} = useSeason()
        const start = new Date(2024, 0, 1)
        const end = new Date(2024, 11, 31)

        // Test dates
        const middleDate = new Date(2024, 6, 1)
        const beforeDate = new Date(2023, 11, 31)
        const afterDate = new Date(2025, 0, 1)

        expect(isActive(middleDate, start, end)).toBe(true)
        expect(isActive(beforeDate, start, end)).toBe(false)
        expect(isActive(afterDate, start, end)).toBe(false)
        expect(isActive(start, start, end)).toBe(true)
        expect(isActive(end, start, end)).toBe(true)
    })
})

describe('coalesceSeason', () => {
    const { coalesceSeason, getDefaultSeason } = useSeason()

    it('should return the default season when no season is provided', () => {
        const defaultSeason = getDefaultSeason()
        const result = coalesceSeason(undefined, defaultSeason)
        expect(result).toEqual(defaultSeason)
    })
    
    it('should handle null input and return the default season', () => {
        const defaultSeason = getDefaultSeason()
        const result = coalesceSeason(null, defaultSeason)
        expect(result).toEqual(defaultSeason)
    })

    it('should merge provided season with default season', () => {
        const defaultSeason = getDefaultSeason()
        const partialSeason: Partial<Season> = {
            shortName: 'Test Season',
            isActive: true
        }
        const result = coalesceSeason(partialSeason, defaultSeason)
        expect(result.shortName).toBe(partialSeason.shortName)
        expect(result.isActive).toBe(partialSeason.isActive)
        expect(result.seasonDates).toEqual(defaultSeason.seasonDates)
    })

    it('should deep copy seasonDates and holidays', () => {
        const defaultSeason = getDefaultSeason()
        const partialSeason: Partial<Season> = {
            seasonDates: {
                start: new Date(1976, 0, 26),
                end: new Date(1976, 0, 26)
            },
            holidays: [
                { start: new Date(1976, 0, 26), end: new Date(1976, 0, 26) }
            ]
        }
        const result = coalesceSeason(partialSeason, defaultSeason)
        expect(result.seasonDates).toEqual(partialSeason.seasonDates)
        expect(result.holidays).toEqual(partialSeason.holidays)
        expect(result.seasonDates).not.toBe(partialSeason.seasonDates)
        expect(result.holidays).not.toBe(partialSeason.holidays)
    })
})

describe('getDefaultSeason', () => {
    it('should validate against both application and serialization schemas', () => {
        const { getDefaultSeason, SeasonSchema, serializeSeason, deserializeSeason } = useSeason()
        const defaultSeason = getDefaultSeason()

        // Test application schema
        const schemaResult = SeasonSchema.safeParse(defaultSeason)
        expect(schemaResult.success).toBe(true)

        // Test serialization schema
        const serialized = serializeSeason(defaultSeason)
        const deserialized = deserializeSeason(serialized)
        const serializedResult = SeasonSchema.safeParse(deserialized)

        expect(serializedResult.success).toBe(true)
        if (schemaResult.success && serializedResult.success) {
            expect(deserialized).toEqual(defaultSeason)
            expect(defaultSeason.seasonDates.start < defaultSeason.seasonDates.end).toBe(true)
        }
    })

    it('should return empty holidays array', () => {
        const { getDefaultSeason } = useSeason()
        const defaultSeason = getDefaultSeason()

        // GIVEN: Default season is created
        // THEN: Holidays should be empty (component calculates reactively)
        expect(defaultSeason.holidays).toEqual([])
    })
})

describe('getDefaultHolidays', () => {
    const { getDefaultHolidays } = useSeason()

    it('should calculate holidays within full production season', () => {
        // GIVEN: A typical production season (Aug - Jun)
        const seasonDates: DateRange = {
            start: new Date(2025, 7, 1),  // Aug 1, 2025
            end: new Date(2026, 5, 30)    // Jun 30, 2026
        }

        // WHEN: Calculating default holidays
        const holidays = getDefaultHolidays(seasonDates)

        // THEN: Should return 3 holidays (weeks 8, 42, 52 from app config)
        expect(holidays.length).toBe(3)

        // AND: All holidays are within season boundaries
        holidays.forEach((holiday) => {
            expect(holiday.start >= seasonDates.start).toBe(true)
            expect(holiday.end <= seasonDates.end).toBe(true)
        })
    })

    it('should return empty array for short season outside holidayw weeks', () => {
        // GIVEN: A short test season (7 days)
        const seasonDates: DateRange = {
            start: new Date(2025, 8, 1),  // Sep 1, 2025
            end: new Date(2025, 8, 7)     // Sep 7, 2025
        }

        // WHEN: Calculating default holidays
        const holidays = getDefaultHolidays(seasonDates)

        // THEN: Should return empty (no holiday weeks fit in 7 days)
        expect(holidays).toEqual([])
    })

    it('should filter holidays outside season range', () => {
        // GIVEN: Season that only contains week 42, not weeks 8 or 52
        const seasonDates: DateRange = {
            start: new Date(2025, 9, 1),   // Oct 1, 2025
            end: new Date(2025, 10, 30)    // Nov 30, 2025
        }

        // WHEN: Calculating default holidays
        const holidays = getDefaultHolidays(seasonDates)

        // THEN: Should only return week 42 (October)
        expect(holidays.length).toBe(1)
        expect(holidays[0]?.start.getMonth()).toBe(9) // October (month 9)
    })
})

describe('generateDinnerEventDataForSeason', () => {
    const { generateDinnerEventDataForSeason } = useSeason()

    it('should return empty array for invalid season', () => {
        // GIVEN: Invalid season (missing required fields)
        const invalidSeason = {} as Season

        // WHEN: Generating dinner event data
        const events = generateDinnerEventDataForSeason(invalidSeason)

        // THEN: Returns empty array
        expect(events).toEqual([])
    })

    it('should create event objects from computed cooking dates', () => {
        // GIVEN: A valid season with cooking days
        const season: Season = {
            ...SeasonFactory.defaultSeason(),
            id: 1,
            seasonDates: {
                start: new Date(2025, 0, 6),   // Monday
                end: new Date(2025, 0, 10)     // Friday
            },
            cookingDays: createDefaultWeekdayMap([true, true, true, true, true, false, false]) // Mon-Fri
        }

        // WHEN: Generating dinner event data
        const events = generateDinnerEventDataForSeason(season)

        // THEN: Creates valid DinnerEventCreate objects
        expect(events.length).toBe(5)
        events.forEach(event => {
            const result = DinnerEventCreateSchema.safeParse(event)
            expect(result.success, result.success ? '' : JSON.stringify(result.error.format(), null, 2)).toBe(true)
        })
    })
})

describe('assignAffinitiesToTeams', () => {
    const { assignAffinitiesToTeams } = useSeason()

    it('should return empty array for invalid season', () => {
        // GIVEN: Invalid season (missing required fields)
        const invalidSeason = {} as Season

        // WHEN: Assigning affinities to teams
        const result = assignAffinitiesToTeams(invalidSeason)

        // THEN: Returns empty array
        expect(result).toEqual([])
    })

    it('should return empty array when CookingTeams is missing', () => {
        // GIVEN: Valid season but no CookingTeams
        const season: Season = {
            ...SeasonFactory.defaultSeason(),
            id: 1,
            CookingTeams: undefined
        }

        // WHEN: Assigning affinities to teams
        const result = assignAffinitiesToTeams(season)

        // THEN: Returns empty array
        expect(result).toEqual([])
    })

    it('should call computeAffinitiesForTeams with destructured season data', () => {
        // GIVEN: Valid season with teams
        const season: Season = {
            ...SeasonFactory.defaultSeason(),
            id: 1,
            consecutiveCookingDays: 2,
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
            CookingTeams: [
                { id: 1, name: 'Hold 1', seasonId: 1, affinity: null, assignments: [] },
                { id: 2, name: 'Hold 2', seasonId: 1, affinity: null, assignments: [] },
                { id: 3, name: 'Hold 3', seasonId: 1, affinity: null, assignments: [] }
            ]
        }

        // WHEN: Assigning affinities to teams
        const result = assignAffinitiesToTeams(season)

        // THEN: Returns teams with computed affinities (WeekDayMap objects)
        expect(result).toHaveLength(3)
        result.forEach((team) => {
            const affinity = team.affinity as WeekDayMap
            expect(affinity).not.toBeNull()
            // Verify it has all weekday keys
            WEEKDAYS.forEach((weekday) => {
                expect(affinity[weekday]).toEqual(expect.any(Boolean))
            })
        })
    })
})

describe('assignTeamsToEvents', () => {
    const { assignTeamsToEvents } = useSeason()

    it('should return empty array for invalid season', () => {
        // GIVEN: Invalid season (missing required fields)
        const invalidSeason = {} as Season

        // WHEN: Assigning teams to events
        const result = assignTeamsToEvents(invalidSeason)

        // THEN: Returns empty array
        expect(result).toEqual([])
    })

    it('should call computeTeamAssignmentsForEvents with destructured season data', () => {
        // GIVEN: Valid season with teams and events (simple happy path)
        const season: Season = {
            ...SeasonFactory.defaultSeason(),
            id: 1,
            consecutiveCookingDays: 2,
            cookingDays: createDefaultWeekdayMap([true, false, true, false, true, false, false]),
            CookingTeams: [
                { id: 1, name: 'Hold 1', seasonId: 1, affinity: createDefaultWeekdayMap([true, false, true, false, true, false, false]), assignments: [] },
                { id: 2, name: 'Hold 2', seasonId: 1, affinity: createDefaultWeekdayMap([true, false, true, false, true, false, false]), assignments: [] }
            ],
            dinnerEvents: [
                { id: 1, date: new Date(2025, 0, 6), menuTitle: 'TBD', state: 'SCHEDULED' as const, totalCost: 0, heynaboEventId: null, cookingTeamId: null, seasonId: 1, menuDescription: null, menuPictureUrl: null, chefId: null, createdAt: new Date(), updatedAt: new Date() },
                { id: 2, date: new Date(2025, 0, 8), menuTitle: 'TBD', state: 'SCHEDULED' as const, totalCost: 0, heynaboEventId: null, cookingTeamId: null, seasonId: 1, menuDescription: null, menuPictureUrl: null, chefId: null, createdAt: new Date(), updatedAt: new Date() },
                { id: 3, date: new Date(2025, 0, 10), menuTitle: 'TBD', state: 'SCHEDULED' as const, totalCost: 0, heynaboEventId: null, cookingTeamId: null, seasonId: 1, menuDescription: null, menuPictureUrl: null, chefId: null, createdAt: new Date(), updatedAt: new Date() },
                { id: 4, date: new Date(2025, 0, 13), menuTitle: 'TBD', state: 'SCHEDULED' as const, totalCost: 0, heynaboEventId: null, cookingTeamId: null, seasonId: 1, menuDescription: null, menuPictureUrl: null, chefId: null, createdAt: new Date(), updatedAt: new Date() }
            ]
        }

        // WHEN: Assigning teams to events
        const result = assignTeamsToEvents(season)

        // THEN: Returns events with team assignments (orchestration works)
        expect(result).toHaveLength(4)
        // Verify teams were assigned (not all null)
        const assignedTeams = result.map(e => e.cookingTeamId).filter(Boolean)
        expect(assignedTeams.length).toBeGreaterThan(0)
    })
})

describe('getHolidaysForSeason', () => {
    const { getHolidaysForSeason } = useSeason()

    it.each([
        {
            description: 'empty array when season has no holidays',
            holidays: [],
            expectedCount: 0
        },
        {
            description: 'single date for single-day holiday',
            holidays: [{ start: new Date(2025, 0, 15), end: new Date(2025, 0, 15) }],
            expectedCount: 1
        },
        {
            description: '3 dates for 3-day holiday range',
            holidays: [{ start: new Date(2025, 0, 1), end: new Date(2025, 0, 3) }],
            expectedCount: 3
        },
        {
            description: '6 dates for two 3-day holiday ranges',
            holidays: [
                { start: new Date(2025, 0, 1), end: new Date(2025, 0, 3) },
                { start: new Date(2025, 0, 10), end: new Date(2025, 0, 12) }
            ],
            expectedCount: 6
        }
    ])('should return $expectedCount dates for $description', ({ holidays, expectedCount }) => {
        // GIVEN: Season with specified holidays
        const season: Season = {
            ...SeasonFactory.defaultSeason(),
            holidays
        }

        // WHEN: Getting holiday dates
        const result = getHolidaysForSeason(season)

        // THEN: Returns expected number of individual dates
        expect(result).toHaveLength(expectedCount)
    })

    it('should expand holiday ranges into consecutive dates', () => {
        // GIVEN: Season with 3-day holiday
        const season: Season = {
            ...SeasonFactory.defaultSeason(),
            holidays: [{ start: new Date(2025, 0, 1), end: new Date(2025, 0, 3) }]
        }

        // WHEN: Getting holiday dates
        const result = getHolidaysForSeason(season)

        // THEN: Returns all consecutive dates
        expect(result[0]).toEqual(new Date(2025, 0, 1))
        expect(result[1]).toEqual(new Date(2025, 0, 2))
        expect(result[2]).toEqual(new Date(2025, 0, 3))
    })
})

describe('canModifyOrders', () => {
    const { canModifyOrders } = useSeason()

    it('should allow modifications when dinner is far in future', () => {
        // GIVEN: Dinner 15 days from now (at start of day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dinnerDate = new Date(today)
        dinnerDate.setDate(today.getDate() + 15)

        // WHEN: Checking if orders can be modified
        const result = canModifyOrders(dinnerDate)

        // THEN: Should allow (15 days > default 10 days deadline)
        expect(result).toBe(true)
    })

    it('should not allow modifications when dinner is tomorrow', () => {
        // GIVEN: Dinner tomorrow (at start of day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dinnerDate = new Date(today)
        dinnerDate.setDate(today.getDate() + 1)

        // WHEN: Checking if orders can be modified
        const result = canModifyOrders(dinnerDate)

        // THEN: Should not allow (1 day < default 2 days deadline)
        expect(result).toBe(false)
    })

    it('should not allow modifications when dinner is in the past', () => {
        // GIVEN: Dinner yesterday (at start of day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dinnerDate = new Date(today)
        dinnerDate.setDate(today.getDate() - 1)

        // WHEN: Checking if orders can be modified
        const result = canModifyOrders(dinnerDate)

        // THEN: Should not allow (past deadline)
        expect(result).toBe(false)
    })
})

describe('canEditDiningMode', () => {
    const { canEditDiningMode } = useSeason()

    it('should allow editing when dinner is far in future', () => {
        // GIVEN: Dinner 10 days from now (at start of day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dinnerDate = new Date(today)
        dinnerDate.setDate(today.getDate() + 10)

        // WHEN: Checking if dining mode can be edited
        const result = canEditDiningMode(dinnerDate)

        // THEN: Should allow (well before dinner time)
        expect(result).toBe(true)
    })

    it('should allow editing when dinner is tomorrow', () => {
        // GIVEN: Dinner tomorrow (at start of day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dinnerDate = new Date(today)
        dinnerDate.setDate(today.getDate() + 1)

        // WHEN: Checking if dining mode can be edited
        const result = canEditDiningMode(dinnerDate)

        // THEN: Should allow (24 hours > default 60 minutes deadline)
        expect(result).toBe(true)
    })

    it('should not allow editing when dinner is in the past', () => {
        // GIVEN: Dinner yesterday
        const dinnerDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)

        // WHEN: Checking if dining mode can be edited
        const result = canEditDiningMode(dinnerDate)

        // THEN: Should not allow (past deadline)
        expect(result).toBe(false)
    })
})

describe('isAnnounceMenuPastDeadline', () => {
    const { isAnnounceMenuPastDeadline } = useSeason()

    it.each([
        {
            description: 'far in future (11 days)',
            daysOffset: 11,
            hoursOffset: 0,
            expected: false  // Not past 10-day deadline
        },
        {
            description: 'tomorrow',
            daysOffset: 1,
            hoursOffset: 0,
            expected: true  // Past 10-day deadline
        },
        {
            description: 'same day before dinner time',
            daysOffset: 0,
            hoursOffset: 6,
            expected: true  // Past 10-day deadline
        },
        {
            description: 'in the past (yesterday)',
            daysOffset: -1,
            hoursOffset: 0,
            expected: true  // Past deadline
        },
        {
            description: 'after dinner started (2 hours ago)',
            daysOffset: 0,
            hoursOffset: -2,
            expected: true  // Past deadline
        }
    ])('should return $expected for dinner $description', ({ daysOffset, hoursOffset, expected }) => {
        // GIVEN: Dinner at calculated time
        const now = new Date()
        const dinnerDate = new Date(now)
        dinnerDate.setDate(now.getDate() + daysOffset)
        dinnerDate.setHours(now.getHours() + hoursOffset, 0, 0, 0)

        // WHEN: Checking if announce menu deadline has passed
        const result = isAnnounceMenuPastDeadline(dinnerDate)

        // THEN: Returns expected result
        expect(result).toBe(expected)
    })
})

describe('isOnTeam', () => {
    const { isOnTeam } = useSeason()
    const { TeamRoleSchema } = useCookingTeamValidation()
    const TeamRole = TeamRoleSchema.enum

    // Helper to create properly typed team using factory
    const createTeam = (assignments: Array<{id: number, inhabitantId: number, role: 'CHEF' | 'COOK' | 'JUNIORHELPER'}>) =>
        SeasonFactory.defaultCookingTeamDisplay({
            assignments: assignments.map(a => SeasonFactory.defaultCookingTeamAssignment({
                id: a.id,
                inhabitantId: a.inhabitantId,
                role: a.role
            }))
        })

    it.each([
        {
            description: 'inhabitant is on team as CHEF',
            inhabitantId: 1,
            team: createTeam([{id: 1, inhabitantId: 1, role: TeamRole.CHEF}]),
            expected: true
        },
        {
            description: 'inhabitant is on team as COOK',
            inhabitantId: 2,
            team: createTeam([{id: 2, inhabitantId: 2, role: TeamRole.COOK}]),
            expected: true
        },
        {
            description: 'inhabitant is on team as JUNIORHELPER',
            inhabitantId: 3,
            team: createTeam([{id: 3, inhabitantId: 3, role: TeamRole.JUNIORHELPER}]),
            expected: true
        },
        {
            description: 'inhabitant is not on team',
            inhabitantId: 99,
            team: createTeam([{id: 1, inhabitantId: 1, role: TeamRole.CHEF}]),
            expected: false
        },
        {
            description: 'team is null',
            inhabitantId: 1,
            team: null,
            expected: false
        },
        {
            description: 'team has no assignments',
            inhabitantId: 1,
            team: SeasonFactory.defaultCookingTeamDisplay({assignments: []}),
            expected: false
        }
    ])('should return $expected when $description', ({ inhabitantId, team, expected }) => {
        // WHEN: Checking if inhabitant is on team
        const result = isOnTeam(inhabitantId, team)

        // THEN: Returns expected result
        expect(result).toBe(expected)
    })
})

describe('createPreferenceClipper', () => {
    const {createPreferenceClipper} = useSeason()
    const {DinnerModeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum

    // Helper to create cooking days (Mon, Wed, Fri by default)
    const createCookingDays = (selected: boolean[] = [true, false, true, false, true, false, false]) =>
        createDefaultWeekdayMap(selected)

    // Helper to create preferences
    const createPreferences = (values: (typeof DinnerMode)[keyof typeof DinnerMode][]) =>
        WEEKDAYS.reduce((acc, day, i) => ({...acc, [day]: values[i]}), {} as WeekDayMap<typeof DinnerMode[keyof typeof DinnerMode]>)

    describe('needsClipping detection', () => {
        it('should detect inhabitant without preferences needs clipping', () => {
            // GIVEN: Inhabitant with null preferences
            const cookingDays = createCookingDays()
            const clipper = createPreferenceClipper(cookingDays)
            const inhabitants = [{id: 1, dinnerPreferences: null}]

            // WHEN: Processing inhabitants
            const updates = clipper(inhabitants)

            // THEN: Returns update for inhabitant
            expect(updates).toHaveLength(1)
            expect(updates[0].inhabitantId).toBe(1)
        })

        it('should detect non-cooking day with value != NONE needs clipping', () => {
            // GIVEN: Inhabitant with DINEIN on non-cooking day (Tuesday)
            const cookingDays = createCookingDays([true, false, true, false, true, false, false]) // Mon, Wed, Fri
            const preferences = createPreferences([
                DinnerMode.DINEIN,     // Mon - cooking day, OK
                DinnerMode.DINEIN,     // Tue - NON-cooking, needs clip!
                DinnerMode.DINEIN,     // Wed - cooking day, OK
                DinnerMode.NONE,       // Thu - non-cooking, already NONE
                DinnerMode.TAKEAWAY,   // Fri - cooking day, OK
                DinnerMode.NONE,       // Sat - non-cooking, already NONE
                DinnerMode.NONE        // Sun - non-cooking, already NONE
            ])
            const clipper = createPreferenceClipper(cookingDays)
            const inhabitants = [{id: 1, dinnerPreferences: preferences}]

            // WHEN: Processing inhabitants
            const updates = clipper(inhabitants)

            // THEN: Returns update (Tuesday needs clipping)
            expect(updates).toHaveLength(1)
        })

        it('should not clip when all non-cooking days are already NONE', () => {
            // GIVEN: Inhabitant with all non-cooking days already NONE
            const cookingDays = createCookingDays([true, false, true, false, true, false, false]) // Mon, Wed, Fri
            const preferences = createPreferences([
                DinnerMode.DINEIN,   // Mon - cooking day
                DinnerMode.NONE,     // Tue - non-cooking, NONE
                DinnerMode.TAKEAWAY, // Wed - cooking day
                DinnerMode.NONE,     // Thu - non-cooking, NONE
                DinnerMode.DINEIN,   // Fri - cooking day
                DinnerMode.NONE,     // Sat - non-cooking, NONE
                DinnerMode.NONE      // Sun - non-cooking, NONE
            ])
            const clipper = createPreferenceClipper(cookingDays)
            const inhabitants = [{id: 1, dinnerPreferences: preferences}]

            // WHEN: Processing inhabitants
            const updates = clipper(inhabitants)

            // THEN: Returns no updates (already properly clipped)
            expect(updates).toHaveLength(0)
        })
    })

    describe('clip function', () => {
        it('should create defaults for null preferences', () => {
            // GIVEN: Cooking days Mon, Wed, Fri
            const cookingDays = createCookingDays([true, false, true, false, true, false, false])
            const clipper = createPreferenceClipper(cookingDays)
            const inhabitants = [{id: 1, dinnerPreferences: null}]

            // WHEN: Processing inhabitants
            const updates = clipper(inhabitants)

            // THEN: Creates defaults (cooking days = DINEIN, non-cooking = NONE)
            expect(updates).toHaveLength(1)
            const prefs = updates[0].dinnerPreferences
            WEEKDAYS.forEach(day => {
                const expected = cookingDays[day] ? DinnerMode.DINEIN : DinnerMode.NONE
                expect(prefs[day], `${day} should be ${expected}`).toBe(expected)
            })
        })

        it('should preserve cooking day values and clip non-cooking to NONE', () => {
            // GIVEN: Inhabitant with various modes on all days
            const cookingDays = createCookingDays([true, false, true, false, true, false, false])
            const originalValues = [
                DinnerMode.TAKEAWAY,   // Mon - cooking, should preserve
                DinnerMode.DINEIN,     // Tue - non-cooking, should clip to NONE
                DinnerMode.DINEINLATE, // Wed - cooking, should preserve
                DinnerMode.TAKEAWAY,   // Thu - non-cooking, should clip to NONE
                DinnerMode.NONE,       // Fri - cooking, should preserve (even NONE)
                DinnerMode.DINEIN,     // Sat - non-cooking, should clip to NONE
                DinnerMode.DINEINLATE  // Sun - non-cooking, should clip to NONE
            ]
            const originalPrefs = createPreferences(originalValues)
            const clipper = createPreferenceClipper(cookingDays)
            const inhabitants = [{id: 1, dinnerPreferences: originalPrefs}]

            // WHEN: Processing inhabitants
            const updates = clipper(inhabitants)

            // THEN: Preserves cooking day values, clips non-cooking to NONE
            expect(updates).toHaveLength(1)
            const prefs = updates[0].dinnerPreferences
            WEEKDAYS.forEach((day, i) => {
                const expected = cookingDays[day] ? originalValues[i] : DinnerMode.NONE
                expect(prefs[day], `${day} should be ${expected}`).toBe(expected)
            })
        })
    })

    describe('multiple inhabitants', () => {
        it('should only return updates for inhabitants that need clipping', () => {
            // GIVEN: 3 inhabitants - one null, one needs clip, one already OK
            const cookingDays = createCookingDays([true, false, true, false, true, false, false])
            const okPrefs = createPreferences([
                DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN,
                DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE
            ])
            const needsClipPrefs = createPreferences([
                DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN,  // Tue needs clip
                DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE
            ])

            const clipper = createPreferenceClipper(cookingDays)
            const inhabitants = [
                {id: 1, dinnerPreferences: null},          // Needs clipping
                {id: 2, dinnerPreferences: okPrefs},       // Already OK
                {id: 3, dinnerPreferences: needsClipPrefs} // Needs clipping
            ]

            // WHEN: Processing inhabitants
            const updates = clipper(inhabitants)

            // THEN: Returns updates for inhabitants 1 and 3 only
            expect(updates).toHaveLength(2)
            expect(updates.map(u => u.inhabitantId)).toEqual([1, 3])
        })
    })
})

describe('createPreBookingGenerator', () => {
    const {createPreBookingGenerator, reconcilePreBookings} = useSeason()
    const {DinnerModeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum

    // Helper to create preferences
    const createPreferences = (values: (typeof DinnerMode)[keyof typeof DinnerMode][]) =>
        WEEKDAYS.reduce((acc, day, i) => ({...acc, [day]: values[i]}), {} as WeekDayMap<typeof DinnerMode[keyof typeof DinnerMode]>)

    // Standard ticket prices with IDs
    const ticketPrices = [
        {id: 1, ticketType: 'ADULT' as const, price: 4000, seasonId: 1, description: null, maximumAgeLimit: null},
        {id: 2, ticketType: 'CHILD' as const, price: 2000, seasonId: 1, description: null, maximumAgeLimit: 12},
        {id: 3, ticketType: 'BABY' as const, price: 0, seasonId: 1, description: null, maximumAgeLimit: 2}
    ]

    // Dinner events (Mon Jan 6, Wed Jan 8, Fri Jan 10 2025)
    const dinnerEvents = [
        {id: 101, date: new Date(2025, 0, 6), menuTitle: 'TBD', state: 'SCHEDULED' as const, totalCost: 0, heynaboEventId: null, cookingTeamId: null, seasonId: 1, menuDescription: null, menuPictureUrl: null, chefId: null, createdAt: new Date(), updatedAt: new Date()},
        {id: 102, date: new Date(2025, 0, 8), menuTitle: 'TBD', state: 'SCHEDULED' as const, totalCost: 0, heynaboEventId: null, cookingTeamId: null, seasonId: 1, menuDescription: null, menuPictureUrl: null, chefId: null, createdAt: new Date(), updatedAt: new Date()},
        {id: 103, date: new Date(2025, 0, 10), menuTitle: 'TBD', state: 'SCHEDULED' as const, totalCost: 0, heynaboEventId: null, cookingTeamId: null, seasonId: 1, menuDescription: null, menuPictureUrl: null, chefId: null, createdAt: new Date(), updatedAt: new Date()}
    ]

    describe('generator function', () => {
        it('should throw if inhabitant has no dinnerPreferences', () => {
            // GIVEN: Inhabitant with null preferences (malformed data)
            const generator = createPreBookingGenerator(1, ticketPrices, dinnerEvents)
            const inhabitants = [{id: 1, name: 'Test', birthDate: null, dinnerPreferences: null}]

            // WHEN/THEN: Should throw
            expect(() => generator(inhabitants)).toThrow('no dinnerPreferences')
        })

        it('should throw if no matching ticket price for type', () => {
            // GIVEN: Ticket prices missing ADULT type
            const incompleteTicketPrices = [
                {id: 2, ticketType: 'CHILD' as const, price: 2000, seasonId: 1, description: null, maximumAgeLimit: 12}
            ]
            const generator = createPreBookingGenerator(1, incompleteTicketPrices, dinnerEvents)
            const preferences = createPreferences([DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE])
            const inhabitants = [{id: 1, name: 'Adult', birthDate: new Date(1990, 0, 1), dinnerPreferences: preferences}]

            // WHEN/THEN: Should throw (no ADULT ticket price)
            expect(() => generator(inhabitants)).toThrow('No ticket price for type')
        })

        it.each([
            {
                description: 'adult with DINEIN on all cooking days',
                birthDate: new Date(1990, 0, 1),  // Adult
                preferences: [DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE],
                expectedCount: 3,
                expectedTicketType: 'ADULT',
                expectedPrice: 4000
            },
            {
                description: 'child (age 8) with TAKEAWAY on cooking days',
                birthDate: new Date(2017, 0, 1),  // ~8 years old in 2025
                preferences: [DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE],
                expectedCount: 3,
                expectedTicketType: 'CHILD',
                expectedPrice: 2000
            },
            {
                description: 'baby (age 1) with DINEIN on cooking days',
                birthDate: new Date(2024, 0, 1),  // ~1 year old in 2025
                preferences: [DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE],
                expectedCount: 3,
                expectedTicketType: 'BABY',
                expectedPrice: 0
            },
            {
                description: 'adult with NONE on some cooking days',
                birthDate: new Date(1990, 0, 1),
                preferences: [DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.NONE],
                expectedCount: 2,  // Only Mon and Fri
                expectedTicketType: 'ADULT',
                expectedPrice: 4000
            },
            {
                description: 'inhabitant with NONE on all days',
                birthDate: new Date(1990, 0, 1),
                preferences: [DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE],
                expectedCount: 0,
                expectedTicketType: 'ADULT',
                expectedPrice: 4000
            }
        ])('should generate $expectedCount orders for $description', ({birthDate, preferences, expectedCount, expectedPrice}) => {
            // GIVEN: Generator and inhabitant
            const generator = createPreBookingGenerator(1, ticketPrices, dinnerEvents)
            const prefs = createPreferences(preferences)
            const inhabitants = [{id: 1, name: 'Test', birthDate, dinnerPreferences: prefs}]

            // WHEN: Generating pre-bookings
            const orders = generator(inhabitants)

            // THEN: Returns expected count with correct price
            expect(orders).toHaveLength(expectedCount)
            orders.forEach(order => {
                expect(order.priceAtBooking).toBe(expectedPrice)
                expect(order.householdId).toBe(1)
                expect(order.state).toBe('BOOKED')
            })
        })
    })

    describe('reconcilePreBookings', () => {
        it.each([
            {
                description: 'all new orders (no existing)',
                existing: [],
                incoming: [
                    {inhabitantId: 1, dinnerEventId: 101, householdId: 1, bookedByUserId: null, ticketPriceId: 1, priceAtBooking: 4000, dinnerMode: DinnerMode.DINEIN, state: 'BOOKED' as const}
                ],
                expectedCreate: 1,
                expectedDelete: 0,
                expectedIdempotent: 0
            },
            {
                description: 'existing matches incoming (idempotent)',
                existing: [
                    {inhabitantId: 1, dinnerEventId: 101, householdId: 1, bookedByUserId: null, ticketPriceId: 1, priceAtBooking: 4000, dinnerMode: DinnerMode.DINEIN, state: 'BOOKED' as const}
                ],
                incoming: [
                    {inhabitantId: 1, dinnerEventId: 101, householdId: 1, bookedByUserId: null, ticketPriceId: 1, priceAtBooking: 4000, dinnerMode: DinnerMode.DINEIN, state: 'BOOKED' as const}
                ],
                expectedCreate: 0,
                expectedDelete: 0,
                expectedIdempotent: 1
            },
            {
                description: 'existing not in incoming (delete)',
                existing: [
                    {inhabitantId: 1, dinnerEventId: 101, householdId: 1, bookedByUserId: null, ticketPriceId: 1, priceAtBooking: 4000, dinnerMode: DinnerMode.DINEIN, state: 'BOOKED' as const}
                ],
                incoming: [],
                expectedCreate: 0,
                expectedDelete: 1,
                expectedIdempotent: 0
            },
            {
                description: 'mixed: some new, some existing, some deleted',
                existing: [
                    {inhabitantId: 1, dinnerEventId: 101, householdId: 1, bookedByUserId: null, ticketPriceId: 1, priceAtBooking: 4000, dinnerMode: DinnerMode.DINEIN, state: 'BOOKED' as const},
                    {inhabitantId: 1, dinnerEventId: 102, householdId: 1, bookedByUserId: null, ticketPriceId: 1, priceAtBooking: 4000, dinnerMode: DinnerMode.DINEIN, state: 'BOOKED' as const}
                ],
                incoming: [
                    {inhabitantId: 1, dinnerEventId: 101, householdId: 1, bookedByUserId: null, ticketPriceId: 1, priceAtBooking: 4000, dinnerMode: DinnerMode.DINEIN, state: 'BOOKED' as const},
                    {inhabitantId: 1, dinnerEventId: 103, householdId: 1, bookedByUserId: null, ticketPriceId: 1, priceAtBooking: 4000, dinnerMode: DinnerMode.DINEIN, state: 'BOOKED' as const}
                ],
                expectedCreate: 1,  // 103 is new
                expectedDelete: 1,  // 102 is deleted
                expectedIdempotent: 1  // 101 unchanged
            }
        ])('should handle $description', ({existing, incoming, expectedCreate, expectedDelete, expectedIdempotent}) => {
            // WHEN: Reconciling pre-bookings
            const result = reconcilePreBookings(existing)(incoming)

            // THEN: Returns expected counts
            expect(result.create).toHaveLength(expectedCreate)
            expect(result.delete).toHaveLength(expectedDelete)
            expect(result.idempotent).toHaveLength(expectedIdempotent)
        })
    })
})

describe('isChefFor', () => {
    const { isChefFor } = useSeason()
    const { TeamRoleSchema } = useCookingTeamValidation()
    const TeamRole = TeamRoleSchema.enum

    // Helper to create properly typed team using factory
    const createTeam = (assignments: Array<{id: number, inhabitantId: number, role: 'CHEF' | 'COOK' | 'JUNIORHELPER'}>) =>
        SeasonFactory.defaultCookingTeamDisplay({
            assignments: assignments.map(a => SeasonFactory.defaultCookingTeamAssignment({
                id: a.id,
                inhabitantId: a.inhabitantId,
                role: a.role
            }))
        })

    it.each([
        {
            description: 'inhabitant is CHEF on team',
            inhabitantId: 1,
            team: createTeam([{id: 1, inhabitantId: 1, role: TeamRole.CHEF}]),
            expected: true
        },
        {
            description: 'inhabitant is COOK (not CHEF)',
            inhabitantId: 2,
            team: createTeam([{id: 2, inhabitantId: 2, role: TeamRole.COOK}]),
            expected: false
        },
        {
            description: 'inhabitant is JUNIORHELPER (not CHEF)',
            inhabitantId: 3,
            team: createTeam([{id: 3, inhabitantId: 3, role: TeamRole.JUNIORHELPER}]),
            expected: false
        },
        {
            description: 'inhabitant is not on team',
            inhabitantId: 99,
            team: createTeam([{id: 1, inhabitantId: 1, role: TeamRole.CHEF}]),
            expected: false
        },
        {
            description: 'team is null',
            inhabitantId: 1,
            team: null,
            expected: false
        },
        {
            description: 'team has no assignments',
            inhabitantId: 1,
            team: SeasonFactory.defaultCookingTeamDisplay({assignments: []}),
            expected: false
        },
        {
            description: 'multiple assignments, inhabitant is CHEF',
            inhabitantId: 1,
            team: createTeam([
                {id: 1, inhabitantId: 1, role: TeamRole.CHEF},
                {id: 2, inhabitantId: 2, role: TeamRole.COOK}
            ]),
            expected: true
        }
    ])('should return $expected when $description', ({ inhabitantId, team, expected }) => {
        // WHEN: Checking if inhabitant is chef for team
        const result = isChefFor(inhabitantId, team)

        // THEN: Returns expected result
        expect(result).toBe(expected)
    })
})
