import { describe, it, expect } from 'vitest'
import { useHousehold } from '~/composables/useHousehold'
import { useDinnerEventValidation } from '~/composables/useDinnerEventValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import type { Inhabitant } from '~/composables/useHouseholdValidation'
import { WEEKDAYS } from '~/types/dateTypes'

describe('useHousehold', () => {
  const { DinnerModeSchema } = useDinnerEventValidation()
  const DinnerMode = DinnerModeSchema.enum
  const { createDefaultWeekdayMap } = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.DINEIN
  })

  describe('computeAggregatedPreferences', () => {
    const { computeAggregatedPreferences } = useHousehold()

    describe('edge cases', () => {
      it('returns all null for empty inhabitants array', () => {
        const result = computeAggregatedPreferences([])

        WEEKDAYS.forEach(day => {
          expect(result[day]).toBeNull()
        })
      })

      it('returns default (DINEIN) when all inhabitants have null preferences', () => {
        const inhabitants: Pick<Inhabitant, 'dinnerPreferences'>[] = [
          { dinnerPreferences: null },
          { dinnerPreferences: null }
        ]

        const result = computeAggregatedPreferences(inhabitants)

        // Null preferences are treated as default (DINEIN)
        WEEKDAYS.forEach(day => {
          expect(result[day]).toBe(DinnerMode.DINEIN)
        })
      })
    })

    describe('consensus scenarios', () => {
      // Parametrized test for all DinnerMode values
      describe.each([
        { mode: DinnerMode.DINEIN, label: 'DINEIN' },
        { mode: DinnerMode.DINEINLATE, label: 'DINEINLATE' },
        { mode: DinnerMode.TAKEAWAY, label: 'TAKEAWAY' },
        { mode: DinnerMode.NONE, label: 'NONE' }
      ])('with $label mode', ({ mode, label }) => {
        it(`returns ${label} when all inhabitants agree on all days`, () => {
          const preferences = createDefaultWeekdayMap(mode)

          const inhabitants = [
            { dinnerPreferences: preferences },
            { dinnerPreferences: preferences },
            { dinnerPreferences: preferences }
          ]

          const result = computeAggregatedPreferences(inhabitants)

          WEEKDAYS.forEach(day => {
            expect(result[day]).toBe(mode)
          })
        })

        it(`returns ${label} for single inhabitant with ${label} preference`, () => {
          const preferences = createDefaultWeekdayMap(mode)
          const inhabitants = [{ dinnerPreferences: preferences }]

          const result = computeAggregatedPreferences(inhabitants)

          WEEKDAYS.forEach(day => {
            expect(result[day]).toBe(mode)
          })
        })
      })
    })

    describe('mixed preference scenarios', () => {
      // Parametrized test for different combinations of mixed preferences
      describe.each([
        {
          scenario: 'two different preferences',
          inhabitant1: [DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.DINEIN],
          inhabitant2: [DinnerMode.DINEINLATE, DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.TAKEAWAY, DinnerMode.DINEINLATE],
          expectMixed: ['mandag', 'onsdag', 'fredag', 'søndag'],
          expectConsensus: { tirsdag: DinnerMode.DINEIN, torsdag: DinnerMode.DINEIN, lørdag: DinnerMode.TAKEAWAY }
        },
        {
          scenario: 'DINEIN vs NONE',
          inhabitant1: [DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN, DinnerMode.NONE, DinnerMode.DINEIN],
          inhabitant2: [DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE, DinnerMode.NONE],
          expectMixed: ['mandag', 'onsdag', 'fredag', 'søndag'],
          expectConsensus: { tirsdag: DinnerMode.NONE, torsdag: DinnerMode.NONE, lørdag: DinnerMode.NONE }
        },
        {
          scenario: 'TAKEAWAY vs DINEINLATE',
          inhabitant1: [DinnerMode.TAKEAWAY, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.DINEIN, DinnerMode.TAKEAWAY],
          inhabitant2: [DinnerMode.DINEINLATE, DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.DINEIN, DinnerMode.DINEINLATE],
          expectMixed: ['mandag', 'onsdag', 'fredag', 'søndag'],
          expectConsensus: { tirsdag: DinnerMode.DINEIN, torsdag: DinnerMode.DINEIN, lørdag: DinnerMode.DINEIN }
        }
      ])('$scenario', ({ inhabitant1, inhabitant2, expectMixed, expectConsensus }) => {
        it('returns null for mixed preferences and consensus where they agree', () => {
          const inhabitants = [
            { dinnerPreferences: createDefaultWeekdayMap(inhabitant1) },
            { dinnerPreferences: createDefaultWeekdayMap(inhabitant2) }
          ]

          const result = computeAggregatedPreferences(inhabitants)

          // Check mixed days
          expectMixed.forEach(day => {
            expect(result[day as keyof typeof result]).toBeNull()
          })

          // Check consensus days
          Object.entries(expectConsensus).forEach(([day, value]) => {
            expect(result[day as keyof typeof result]).toBe(value)
          })
        })
      })
    })

    describe('null handling', () => {
      it('returns value when some have null, others agree', () => {
        const prefs1 = createDefaultWeekdayMap([DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])
        const prefs2 = createDefaultWeekdayMap([null, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])

        const inhabitants = [
          { dinnerPreferences: prefs1 },
          { dinnerPreferences: prefs2 }
        ]

        const result = computeAggregatedPreferences(inhabitants)

        expect(result.mandag).toBe(DinnerMode.DINEIN) // Only non-null inhabitants count
        expect(result.tirsdag).toBe(DinnerMode.DINEIN)
      })

      it('returns null when non-null values are mixed', () => {
        const prefs1 = createDefaultWeekdayMap([DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])
        const prefs2 = createDefaultWeekdayMap([null, DinnerMode.DINEINLATE, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])
        const prefs3 = createDefaultWeekdayMap([DinnerMode.DINEIN, null, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])

        const inhabitants = [
          { dinnerPreferences: prefs1 },
          { dinnerPreferences: prefs2 },
          { dinnerPreferences: prefs3 }
        ]

        const result = computeAggregatedPreferences(inhabitants)

        expect(result.mandag).toBe(DinnerMode.DINEIN) // All non-null agree
        expect(result.tirsdag).toBeNull() // Mixed among non-null
      })
    })

    describe('real-world scenarios', () => {
      it('typical household: parents agree, child differs', () => {
        const parentPrefs = createDefaultWeekdayMap([
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.TAKEAWAY,
          DinnerMode.NONE,
          DinnerMode.NONE
        ])

        const childPrefs = createDefaultWeekdayMap([
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.DINEIN, // Child wants to eat in on Friday
          DinnerMode.NONE,
          DinnerMode.NONE
        ])

        const inhabitants = [
          { dinnerPreferences: parentPrefs },
          { dinnerPreferences: parentPrefs },
          { dinnerPreferences: childPrefs }
        ]

        const result = computeAggregatedPreferences(inhabitants)

        // Consensus days
        expect(result.mandag).toBe(DinnerMode.DINEIN)
        expect(result.tirsdag).toBe(DinnerMode.DINEIN)
        expect(result.onsdag).toBe(DinnerMode.DINEIN)
        expect(result.torsdag).toBe(DinnerMode.DINEIN)
        expect(result.lørdag).toBe(DinnerMode.NONE)
        expect(result.søndag).toBe(DinnerMode.NONE)

        // Mixed day
        expect(result.fredag).toBeNull()
      })

      it('household with baby (no preferences) - null treated as DINEIN', () => {
        const adultPrefs = createDefaultWeekdayMap([
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.TAKEAWAY,
          DinnerMode.NONE,
          DinnerMode.NONE
        ])

        const inhabitants = [
          { dinnerPreferences: adultPrefs },
          { dinnerPreferences: adultPrefs },
          { dinnerPreferences: null } // Baby - null treated as DINEIN
        ]

        const result = computeAggregatedPreferences(inhabitants)

        // Days where adults agree with baby's default (DINEIN)
        expect(result.mandag).toBe(DinnerMode.DINEIN)
        expect(result.tirsdag).toBe(DinnerMode.DINEIN)
        expect(result.onsdag).toBe(DinnerMode.DINEIN)
        expect(result.torsdag).toBe(DinnerMode.DINEIN)

        // Days where adults differ from baby's default: mixed (null)
        expect(result.fredag).toBeNull() // Adults: TAKEAWAY, Baby: DINEIN (default)
        expect(result.lørdag).toBeNull() // Adults: NONE, Baby: DINEIN (default)
        expect(result.søndag).toBeNull() // Adults: NONE, Baby: DINEIN (default)
      })

      it('completely mixed household preferences', () => {
        const prefs1 = createDefaultWeekdayMap([
          DinnerMode.DINEIN,
          DinnerMode.DINEINLATE,
          DinnerMode.TAKEAWAY,
          null,
          DinnerMode.DINEIN,
          DinnerMode.NONE,
          DinnerMode.DINEIN
        ])

        const prefs2 = createDefaultWeekdayMap([
          DinnerMode.DINEINLATE,
          DinnerMode.DINEIN,
          DinnerMode.DINEIN,
          DinnerMode.TAKEAWAY,
          DinnerMode.DINEIN,
          DinnerMode.NONE,
          DinnerMode.TAKEAWAY
        ])

        const prefs3 = createDefaultWeekdayMap([
          DinnerMode.TAKEAWAY,
          DinnerMode.TAKEAWAY,
          DinnerMode.NONE,
          null,
          DinnerMode.DINEIN,
          DinnerMode.NONE,
          null
        ])

        const inhabitants = [
          { dinnerPreferences: prefs1 },
          { dinnerPreferences: prefs2 },
          { dinnerPreferences: prefs3 }
        ]

        const result = computeAggregatedPreferences(inhabitants)

        // All mixed or partially null
        expect(result.mandag).toBeNull()
        expect(result.tirsdag).toBeNull()
        expect(result.onsdag).toBeNull()
        expect(result.torsdag).toBeNull()
        expect(result.søndag).toBeNull()

        // Consensus days
        expect(result.fredag).toBe(DinnerMode.DINEIN)
        expect(result.lørdag).toBe(DinnerMode.NONE)
      })
    })

    describe('number of inhabitants', () => {
      // Parametrized test for different inhabitant counts
      describe.each([
        { count: 1, label: 'single inhabitant' },
        { count: 2, label: 'two inhabitants' },
        { count: 3, label: 'three inhabitants' },
        { count: 5, label: 'five inhabitants' },
        { count: 10, label: 'large household (10)' }
      ])('with $label', ({ count }) => {
        it(`handles consensus correctly with ${count} inhabitant(s)`, () => {
          const consensusPrefs = createDefaultWeekdayMap([
            DinnerMode.DINEIN,
            DinnerMode.DINEIN,
            DinnerMode.DINEIN,
            DinnerMode.DINEIN,
            DinnerMode.TAKEAWAY,
            DinnerMode.NONE,
            DinnerMode.NONE
          ])

          const inhabitants = Array.from({ length: count }, () => ({
            dinnerPreferences: consensusPrefs
          }))

          const result = computeAggregatedPreferences(inhabitants)

          expect(result.mandag).toBe(DinnerMode.DINEIN)
          expect(result.fredag).toBe(DinnerMode.TAKEAWAY)
          expect(result.lørdag).toBe(DinnerMode.NONE)
        })
      })
    })
  })
})