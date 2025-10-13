import {describe, it, expect} from 'vitest'
import {useSeason} from '~/composables/useSeason'
import {type Season} from '~/composables/useSeasonValidation'
import type {DateRange} from "~/types/dateTypes"
import {createDefaultWeekdayMap} from '~/utils/date'

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
            expect(parsed.holidays.length).toBe(3) // Weeks 8, 42, 52 from app.config
            expect(parsed.holidays.every(h => h.start instanceof Date && h.end instanceof Date)).toBe(true)
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
        expect(createSeasonName(dateRange)).toBe('01/24 - 12/24')
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

    it('should generate holidays within season date boundaries', () => {
        const { getDefaultSeason, holidaysSchema } = useSeason()
        const defaultSeason = getDefaultSeason()

        // GIVEN: Holidays are validated by schema
        const holidaysResult = holidaysSchema.safeParse(defaultSeason.holidays)
        expect(holidaysResult.success, holidaysResult.success ? '' : JSON.stringify(holidaysResult.error.format(), null, 2)).toBe(true)

        // THEN: All holidays must be within season dates
        defaultSeason.holidays.forEach((holiday, index) => {
            const holidayStart = holiday.start
            const holidayEnd = holiday.end
            const seasonStart = defaultSeason.seasonDates.start
            const seasonEnd = defaultSeason.seasonDates.end

            expect(
                holidayStart >= seasonStart && holidayStart <= seasonEnd,
                `Holiday ${index} start (${holidayStart.toISOString()}) must be within season (${seasonStart.toISOString()} - ${seasonEnd.toISOString()})`
            ).toBe(true)

            expect(
                holidayEnd >= seasonStart && holidayEnd <= seasonEnd,
                `Holiday ${index} end (${holidayEnd.toISOString()}) must be within season (${seasonStart.toISOString()} - ${seasonEnd.toISOString()})`
            ).toBe(true)
        })
    })
})

describe('generateDinnerEventDataForSeason', () => {
    const { generateDinnerEventDataForSeason, getDefaultSeason } = useSeason()

    it('should generate events for all cooking days within season dates', () => {
        // GIVEN: A season with Monday and Wednesday as cooking days
        const season: Season = {
            ...getDefaultSeason(),
            id: 1,
            seasonDates: {
                start: new Date(2025, 0, 6),  // Monday, Jan 6, 2025
                end: new Date(2025, 0, 31)     // Friday, Jan 31, 2025
            },
            cookingDays: createDefaultWeekdayMap([true, false, true, false, false, false, false]) // Mon, Wed
        }

        // WHEN: Generating dinner event data
        const events = generateDinnerEventDataForSeason(season)

        // THEN: Events are created for all Mondays and Wednesdays
        expect(events.length).toBeGreaterThan(0)

        // AND: All events have correct properties
        events.forEach(event => {
            expect(event.seasonId).toBe(1)
            expect(event.menuTitle).toBe('TBD')
            expect(event.dinnerMode).toBe('NONE')
            expect(event.chefId).toBeNull()
            expect(event.cookingTeamId).toBeNull()

            // Verify dates are Monday (1) or Wednesday (3)
            const dayOfWeek = event.date.getDay()
            expect([1, 3]).toContain(dayOfWeek)
        })
    })

    it('should exclude holidays from generated events', () => {
        // GIVEN: A season with Tuesday as cooking day and a holiday
        const season: Season = {
            ...getDefaultSeason(),
            id: 2,
            seasonDates: {
                start: new Date(2025, 0, 1),
                end: new Date(2025, 0, 31)
            },
            cookingDays: createDefaultWeekdayMap([false, true, false, false, false, false, false]), // Tuesday
            holidays: [
                {
                    start: new Date(2025, 0, 14),  // Tuesday, Jan 14
                    end: new Date(2025, 0, 14)
                }
            ]
        }

        // WHEN: Generating dinner event data
        const events = generateDinnerEventDataForSeason(season)

        // THEN: No event exists for the holiday date
        const holidayDate = new Date(2025, 0, 14)
        const hasHolidayEvent = events.some(event =>
            event.date.getTime() === holidayDate.getTime()
        )
        expect(hasHolidayEvent).toBe(false)

        // AND: Events exist for other Tuesdays
        expect(events.length).toBeGreaterThan(0)
        events.forEach(event => {
            expect(event.date.getDay()).toBe(2) // Tuesday
        })
    })

    it('should return empty array when no cooking days are selected', () => {
        // GIVEN: A season with no cooking days
        const season: Season = {
            ...getDefaultSeason(),
            id: 3,
            cookingDays: createDefaultWeekdayMap(false) // All false
        }

        // WHEN: Generating dinner event data
        const events = generateDinnerEventDataForSeason(season)

        // THEN: No events are generated
        expect(events).toEqual([])
    })

    it('should respect season date boundaries', () => {
        // GIVEN: A short season (one week) with daily cooking
        const season: Season = {
            ...getDefaultSeason(),
            id: 4,
            seasonDates: {
                start: new Date(2025, 0, 6),   // Monday
                end: new Date(2025, 0, 10)     // Friday
            },
            cookingDays: createDefaultWeekdayMap([true, true, true, true, true, false, false]) // Mon-Fri
        }

        // WHEN: Generating dinner event data
        const events = generateDinnerEventDataForSeason(season)

        // THEN: Exactly 5 events (Mon-Fri)
        expect(events.length).toBe(5)

        // AND: All events are within season boundaries
        events.forEach(event => {
            expect(event.date >= season.seasonDates.start).toBe(true)
            expect(event.date <= season.seasonDates.end).toBe(true)
        })
    })
})
