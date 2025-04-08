import {describe, it, expect} from 'vitest'
import {useSeasonValidation, type Season} from '@/composables/useSeasonValidation'
import {createDefaultWeekdayMap, createDateRange, formatDate} from '@/utils/date'
import type {DateRange} from "@/types/dateTypes"
import {testSeason} from '~/tests/mocks/testObjects'

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
      const validSeason = {
        shortName: "Test 2025",
        seasonDates: {
          start: new Date(2025, 0, 1),
          end: new Date(2025, 0, 31)
        },
        isActive: true,
        cookingDays: createDefaultWeekdayMap(true),
        holidays: [],
        ticketIsCancellableDaysBefore: 7,
        diningModeIsEditableMinutesBefore: 720
      }
      
      const result = SeasonSchema.safeParse(validSeason)
      expect(result.success).toBe(true)
    })

    it('should accept both Date and string formats for seasonDates and holidays', () => {
      const validSeason = {
        shortName: "Test 2025",
        seasonDates: {
          start: "01/01/2025",
          end: "31/01/2025"
        },
        isActive: true,
        cookingDays: createDefaultWeekdayMap(true),
        holidays: [
          {
            start: new Date(2025, 0, 5),
            end: new Date(2025, 0, 10)
          },
          {
            start: "15/01/2025",
            end: "20/01/2025"
          }
        ],
        ticketIsCancellableDaysBefore: 7,
        diningModeIsEditableMinutesBefore: 720
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
        shortName: "Test 2025",
        seasonDates: createDateRange(new Date(2025, 0, 1), new Date(2025, 0, 31)),
        isActive: true,
        cookingDays: createDefaultWeekdayMap(true),
        holidays: [
          { start: new Date(2025, 0, 1), end: new Date(2025, 0, 10) },
          { start: new Date(2025, 0, 5), end: new Date(2025, 0, 15) },
          { start: new Date(2025, 0, 20), end: new Date(2025, 0, 25) }
        ],
        ticketIsCancellableDaysBefore: 7,
        diningModeIsEditableMinutesBefore: 720
      }

      const result = SeasonSchema.safeParse(seasonWithOverlappingHolidays)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Ferieperioder må ikke overlappe hinanden")
      }
    })

    it('should reject holidays outside season', () => {
      const seasonWithOutsideHolidays = {
        shortName: "Test 2025",
        seasonDates: createDateRange(new Date(2025, 0, 1), new Date(2025, 0, 31)),
        isActive: true,
        cookingDays: createDefaultWeekdayMap(true),
        holidays: [
          { start: new Date(2024, 11, 25), end: new Date(2025, 0, 5) },
          { start: new Date(2025, 0, 10), end: new Date(2025, 0, 15) },
          { start: new Date(2025, 0, 20), end: new Date(2025, 1, 5) }
        ],
        ticketIsCancellableDaysBefore: 7,
        diningModeIsEditableMinutesBefore: 720
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
      const originalSeason = {
        shortName: "Test 2025",
        seasonDates: {
          start: new Date(2025, 0, 1),
          end: new Date(2025, 0, 31)
        },
        isActive: true,
        cookingDays: createDefaultWeekdayMap(true),
        holidays: [
          {
            start: new Date(2025, 0, 5),
            end: new Date(2025, 0, 10)
          }
        ],
        ticketIsCancellableDaysBefore: 7,
        diningModeIsEditableMinutesBefore: 720
      } as Season;

      // Serialize and deserialize
      const serialized = serializeSeason(originalSeason)
      const deserialized = deserializeSeason(serialized)

      // Check structure
      expect(typeof serialized.cookingDays).toBe('string')
      expect(typeof serialized.holidays).toBe('string')
      expect(typeof serialized.seasonDates).toBe('string') // Now seasonDates is a JSON string

      // Check deserialized matches original
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
      const originalSeason = {
        shortName: "Test 2025",
        seasonDates: {
          start: new Date(2025, 0, 1),
          end: new Date(2025, 0, 31)
        },
        isActive: true,
        cookingDays: createDefaultWeekdayMap(true),
        holidays: [
          {
            start: new Date(2025, 0, 5),
            end: new Date(2025, 0, 10)
          }
        ],
        ticketIsCancellableDaysBefore: 7,
        diningModeIsEditableMinutesBefore: 720
      } as Season;

      const serialized = serializeSeason(originalSeason)
      const jsonString = JSON.stringify(serialized)
      const parsed = JSON.parse(jsonString)
      const deserialized = deserializeSeason(parsed)

      // Verify the round-trip works
      const result = SeasonSchema.safeParse(deserialized)
      expect(result.success).toBe(true)
    })

    it('should correctly handle the API test season', () => {
      // testSeason is imported at the top of the file
      
      // Verify the test season validates
      const validationResult = SeasonSchema.safeParse(testSeason)
      if (!validationResult.success) {
        console.error("Validation error:", validationResult.error.format())
      }
      expect(validationResult.success).toBe(true)

      // Test the serialization and deserialization process
      const serialized = serializeSeason(testSeason)
      
      // Check structure - seasonDates should be serialized properly
      expect(typeof serialized.cookingDays).toBe('string')
      expect(typeof serialized.holidays).toBe('string')
      expect(typeof serialized.seasonDates).toBe('string') // This should be a string, not an object!
      
      // Log the data for debugging
      console.log("Test Season Serialized:", JSON.stringify(serialized))
      
      // Now deserialize and verify
      const deserialized = deserializeSeason(serialized)
      expect(deserialized.shortName).toBe(testSeason.shortName)
      
      // Compare the dates using formatDate
      const formatDateStart = formatDate(deserialized.seasonDates.start)
      const formatDateEnd = formatDate(deserialized.seasonDates.end)
      
      // Output detailed info for debugging
      console.log("Date comparison:", {
        originalStart: testSeason.seasonDates.start.toISOString(),
        deserializedStart: deserialized.seasonDates.start.toISOString(),
        formattedOriginalStart: formatDate(testSeason.seasonDates.start),
        formattedDeserializedStart: formatDateStart
      })
      
      // Check dates using format strings
      expect(formatDateStart).toBe(formatDate(testSeason.seasonDates.start))
      expect(formatDateEnd).toBe(formatDate(testSeason.seasonDates.end))
      
      // Log the final result
      console.log("Test Season Deserialized:", JSON.stringify({
        ...deserialized,
        seasonDates: {
          start: deserialized.seasonDates.start.toISOString(),
          end: deserialized.seasonDates.end.toISOString()
        }
      }))
    })
  })
})