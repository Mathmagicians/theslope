import {describe, it, expect} from 'vitest'
import {useSeasonValidation, type Season} from '~/composables/useSeasonValidation'
import {createDateRange, formatDate} from '~/utils/date'
import {DinnerEventFactory} from '../../e2e/testDataFactories/dinnerEventFactory'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'
import {SeasonFactory} from "~~/tests/e2e/testDataFactories/seasonFactory"

const {TICKET_TYPES} = useTicketPriceValidation()
const testSeason = SeasonFactory.defaultSeasonData

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
        expect(result.error.errors[0]?.message).toBe("Ferieperioder må ikke overlappe hinanden")
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
        expect(result.error.errors[0]?.message).toBe("Ferieperioder skal være inden for fællesspisningssæsonen")
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

    it('should correctly handle the API test season', () => {

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
      const originalStartDate = testSeason.seasonDates.start as Date
      const originalEndDate = testSeason.seasonDates.end as Date

      const formatDateStart = formatDate(deserialized.seasonDates.start)
      const formatDateEnd = formatDate(deserialized.seasonDates.end)

      expect(formatDateStart).toBe(formatDate(originalStartDate))
      expect(formatDateEnd).toBe(formatDate(originalEndDate))
    })

    it('should correctly serialize and deserialize a Season with relations', () => {
      const dinnerEvent1 = {
        ...DinnerEventFactory.defaultDinnerEventData,
        id: 1,
        date: new Date(2025, 0, 6),
        menuTitle: 'Pasta Night',
        dinnerMode: 'DINEIN' as const,
        chefId: 1,
        cookingTeamId: 1
      }

      const dinnerEvent2 = {
        ...DinnerEventFactory.defaultDinnerEventData,
        id: 2,
        date: new Date(2025, 0, 13),
        menuTitle: 'Taco Tuesday',
        dinnerMode: 'TAKEAWAY' as const,
        chefId: null,
        cookingTeamId: 2
      }

      const seasonWithRelations: Season = {
        ...testSeason,
        id: 1,
        dinnerEvents: [dinnerEvent1, dinnerEvent2],
        CookingTeams: [{id: 1, name: 'Team A'}],
        ticketPrices: [{id: 1, seasonId: testSeason.id!, ticketType: 'HUNGRY_BABY', price: 4000}]
      }

      // Serialize
      const serialized = serializeSeason(seasonWithRelations)

      // Verify base properties are serialized
      expect(typeof serialized.cookingDays).toBe('string')
      expect(typeof serialized.holidays).toBe('string')
      expect(typeof serialized.seasonDates).toBe('string')

      // Deserialize
      const deserialized = deserializeSeason({
        ...serialized,
        dinnerEvents: seasonWithRelations.dinnerEvents,
        CookingTeams: seasonWithRelations.CookingTeams,
        ticketPrices: seasonWithRelations.ticketPrices
      })

      // Verify base properties
      expect(deserialized.shortName).toBe(seasonWithRelations.shortName)
      expect(deserialized.seasonDates.start).toBeInstanceOf(Date)
      expect(deserialized.seasonDates.end).toBeInstanceOf(Date)

      // Verify relations are preserved
      const deserializedWithRelations = deserialized 
      expect(deserializedWithRelations.dinnerEvents).toHaveLength(2)
      expect(deserializedWithRelations.dinnerEvents![0]?.date).toBeInstanceOf(Date)
      expect(deserializedWithRelations.dinnerEvents![0]?.menuTitle).toBe('Pasta Night')
      expect(deserializedWithRelations.dinnerEvents![1]?.date).toBeInstanceOf(Date)
      expect(deserializedWithRelations.dinnerEvents![1]?.menuTitle).toBe('Taco Tuesday')
      expect(deserializedWithRelations.CookingTeams).toHaveLength(1)
      expect(deserializedWithRelations.ticketPrices).toHaveLength(1)

      // ticket prices
        expect(deserializedWithRelations.ticketPrices.length).toBe(1)
        expect(deserializedWithRelations.ticketPrices.map(tp => tp.ticketType)).toEqual(['HUNGRY_BABY'])
    })
      
  })
})
