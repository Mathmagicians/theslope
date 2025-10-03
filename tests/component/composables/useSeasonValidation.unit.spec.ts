import {describe, it, expect} from 'vitest'
import {useSeasonValidation, type Season} from '~/composables/useSeasonValidation'
import {createDefaultWeekdayMap, createDateRange, formatDate} from '~/utils/date'
import type {DateRange} from "~/types/dateTypes"
import {SeasonFactory} from '../../e2e/testDataFactories/seasonFactory'

// Add testSeason using the factory
const testSeason = SeasonFactory.defaultSeason().season

describe('useSeasonValidation', () => {
  // Get validation utilities
  const { 
    holidaysSchema, 
    SeasonSchema, 
    serializeSeason, 
    deserializeSeason 
  } = useSeasonValidation()

  describe('schemas', () => {
    it('should accept valid season data', () => {
      const validSeason = SeasonFactory.defaultSeason().season

      const result = SeasonSchema.safeParse(validSeason)
      expect(result.success).toBe(true)
    })

    it('should accept both Date and string formats for seasonDates and holidays', () => {
      const validSeason = {
        ...SeasonFactory.defaultSeason().season,
        seasonDates: {
          start: "01/01/2025",
          end: "31/01/2025"
        },
        holidays: [
          {
            start: new Date(2025, 0, 5),
            end: new Date(2025, 0, 10)
          },
          {
            start: "15/01/2025",
            end: "20/01/2025"
          }
        ]
      }

      const result = SeasonSchema.safeParse(validSeason)
      expect(result.success).toBe(true)
    })

    it('holiday schema should accept a single holiday', () => {
      const january2025 = createDateRange(
        new Date(2025, 0, 1),
        new Date(2025, 0, 31)
      )
      
      const holidaysWithOnlyOnePeriod = [january2025]
      expect(holidaysSchema.safeParse(holidaysWithOnlyOnePeriod).success).toBe(true)

      const holidaysWithOnlyOneDay = [createDateRange(new Date(2025, 0, 1), new Date(2025, 0, 1))]
      expect(holidaysSchema.safeParse(holidaysWithOnlyOneDay).success).toBe(true)
    })

    it('should reject overlapping holidays', () => {
      const seasonWithOverlappingHolidays = {
        ...SeasonFactory.defaultSeason().season,
        holidays: [
          { start: new Date(2025, 0, 1), end: new Date(2025, 0, 10) },
          { start: new Date(2025, 0, 5), end: new Date(2025, 0, 15) },
          { start: new Date(2025, 0, 20), end: new Date(2025, 0, 25) }
        ]
      }

      const result = SeasonSchema.safeParse(seasonWithOverlappingHolidays)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Ferieperioder må ikke overlappe hinanden")
      }
    })

    it('should reject holidays outside season', () => {
      const seasonWithOutsideHolidays = {
        ...SeasonFactory.defaultSeason().season,
        holidays: [
          { start: new Date(2024, 11, 25), end: new Date(2025, 0, 5) },
          { start: new Date(2025, 0, 10), end: new Date(2025, 0, 15) },
          { start: new Date(2025, 0, 20), end: new Date(2025, 1, 5) }
        ]
      }

      const result = SeasonSchema.safeParse(seasonWithOutsideHolidays)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Ferieperioder skal være inden for fællesspisningssæsonen")
      }
    })
  })

  describe('serialization and deserialization', () => {
    it('should correctly serialize and deserialize season', () => {
      // Use factory and deserialize for originalSeason
      const originalSeasonSerialized = SeasonFactory.defaultSeason().serializedSeason
      const originalSeason = deserializeSeason(originalSeasonSerialized)

      // Serialize and deserialize
      const serialized = serializeSeason(originalSeason)
      const deserialized = deserializeSeason(serialized)

      // Check structure
      expect(typeof serialized.cookingDays).toBe('string')
      expect(typeof serialized.holidays).toBe('string')
      expect(typeof serialized.seasonDates).toBe('string')

      expect(deserialized.shortName).toBe(originalSeason.shortName)
      expect(deserialized.isActive).toBe(originalSeason.isActive)
      expect(deserialized.ticketIsCancellableDaysBefore).toBe(originalSeason.ticketIsCancellableDaysBefore)

      // Date checks
      expect(deserialized.seasonDates.start).toBeInstanceOf(Date)
      expect(deserialized.seasonDates.end).toBeInstanceOf(Date)
      expect(deserialized.seasonDates.start.getTime()).toBe(originalSeason.seasonDates.start.getTime())
      expect(deserialized.seasonDates.end.getTime()).toBe(originalSeason.seasonDates.end.getTime())
    })

    it('should survive JSON stringification cycle', () => {
      // ...existing code...
    })

    it('should correctly handle the API test season', () => {
      // Use testSeason from factory

      // Verify the test season validates
      const validationResult = SeasonSchema.safeParse(testSeason)
      if (!validationResult.success) {
        console.error("Validation error:", validationResult.error.format())
      }
      expect(validationResult.success).toBe(true)

      // Test the serialization and deserialization process
      const serialized = serializeSeason(testSeason)

      expect(typeof serialized.cookingDays).toBe('string')
      expect(typeof serialized.holidays).toBe('string')
      expect(typeof serialized.seasonDates).toBe('string')

      // Deserialize and ensure dates are parsed correctly
      const deserialized = deserializeSeason(serialized)
      expect(deserialized.shortName).toBe(testSeason.shortName)

      // Always parse seasonDates to Date objects before formatting
      const originalStartDate = testSeason.seasonDates.start instanceof Date
        ? testSeason.seasonDates.start
        : new Date(
            testSeason.seasonDates.start.split('/').reverse().join('-')
          )
      const originalEndDate = testSeason.seasonDates.end instanceof Date
        ? testSeason.seasonDates.end
        : new Date(
            testSeason.seasonDates.end.split('/').reverse().join('-')
          )

      const formatDateStart = formatDate(deserialized.seasonDates.start)
      const formatDateEnd = formatDate(deserialized.seasonDates.end)

      expect(formatDateStart).toBe(formatDate(originalStartDate))
      expect(formatDateEnd).toBe(formatDate(originalEndDate))

      // ...existing code...
    })
  })
})
