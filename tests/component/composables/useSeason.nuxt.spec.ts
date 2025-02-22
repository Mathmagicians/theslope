import {describe, it, expect} from 'vitest'
import {type Season, useSeason} from '@/composables/useSeason'
import type {DateRange} from "~/types/dateTypes"
describe('useSeasonSchema', () => {
    // Update the test in useSeason.nuxt.spec.ts
    it('should validate default season', async () => {
        const {SeasonSchema, getDefaultSeason} = useSeason()
        const defaultSeason = getDefaultSeason()
        const result = SeasonSchema.safeParse(defaultSeason)

        expect(result.success).toBe(true)
        if (result.success) {
            const parsed = result.data
            expect(parsed.seasonDates.start).toBeInstanceOf(Date)
            expect(parsed.seasonDates.end).toBeInstanceOf(Date)
            expect(Object.keys(parsed.cookingDays)).toHaveLength(7)
            expect(parsed.holidays).toEqual([])
            expect(parsed.isActive).toBe(false)
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


describe('serializeSeason/deserializeSeason', () => {
    it('should correctly serialize and deserialize default season', () => {
        const { getDefaultSeason, serializeSeason, deserializeSeason } = useSeason()

        // Get a default season
        const originalSeason = getDefaultSeason()

        // Serialize and then deserialize
        const serialized = serializeSeason(originalSeason)
        const deserialized = deserializeSeason(serialized)

        // Compare the original and deserialized objects
        expect(deserialized).toEqual(originalSeason)

        // Specific date checks
        expect(deserialized.seasonDates.start).toBeInstanceOf(Date)
        expect(deserialized.seasonDates.end).toBeInstanceOf(Date)
        expect(deserialized.seasonDates.start.getTime()).toBe(originalSeason.seasonDates.start.getTime())
        expect(deserialized.seasonDates.end.getTime()).toBe(originalSeason.seasonDates.end.getTime())
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
})

describe('season serialization', () => {
    it('should survive JSON stringification cycle', () => {
        const { getDefaultSeason, SeasonSchema, serializeSeason, deserializeSeason } = useSeason()
        const defaultSeason = getDefaultSeason()

        const serialized = serializeSeason(defaultSeason)
        const jsonString = JSON.stringify(serialized)
        const parsed = JSON.parse(jsonString)
        const deserialized = deserializeSeason(parsed)

        const result = SeasonSchema.safeParse(deserialized)
        expect(result.success).toBe(true)
    })
})
