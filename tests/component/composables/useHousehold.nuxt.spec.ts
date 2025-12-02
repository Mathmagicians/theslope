import { describe, it, expect } from 'vitest'
import { useHousehold } from '~/composables/useHousehold'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import type { InhabitantDetail } from '~/composables/useCoreValidation'
import { WEEKDAYS } from '~/types/dateTypes'

describe('useHousehold', () => {
  const { DinnerModeSchema } = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const { createDefaultWeekdayMap } = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.DINEIN
  })

  describe('computeAggregatedPreferences', () => {
    const { computeAggregatedPreferences } = useHousehold()

    describe('edge cases', () => {
      it('returns all DINEIN for empty inhabitants array', () => {
        const result = computeAggregatedPreferences([])

        WEEKDAYS.forEach(day => {
          expect(result[day]).toBe(DinnerMode.DINEIN)
        })
      })

      it('returns default (DINEIN) when all inhabitants have null preferences', () => {
        const inhabitants: Pick<InhabitantDetail, 'dinnerPreferences'>[] = [
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
        it('returns DINEIN for mixed preferences and consensus where they agree', () => {
          const inhabitants = [
            { dinnerPreferences: createDefaultWeekdayMap(inhabitant1) },
            { dinnerPreferences: createDefaultWeekdayMap(inhabitant2) }
          ]

          const result = computeAggregatedPreferences(inhabitants)

          // Check mixed days - fall back to DINEIN
          expectMixed.forEach(day => {
            expect(result[day as keyof typeof result]).toBe(DinnerMode.DINEIN)
          })

          // Check consensus days
          Object.entries(expectConsensus).forEach(([day, value]) => {
            expect(result[day as keyof typeof result]).toBe(value)
          })
        })
      })
    })

    describe('null handling in input preferences', () => {
      it('treats null preference values as DINEIN default', () => {
        const prefs1 = createDefaultWeekdayMap([DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])
        const prefs2 = createDefaultWeekdayMap([null, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])

        const inhabitants = [
          { dinnerPreferences: prefs1 },
          { dinnerPreferences: prefs2 }
        ]

        const result = computeAggregatedPreferences(inhabitants)

        // null treated as DINEIN, so consensus is DINEIN
        expect(result.mandag).toBe(DinnerMode.DINEIN)
        expect(result.tirsdag).toBe(DinnerMode.DINEIN)
      })

      it('returns DINEIN when null values cause mismatch with non-default', () => {
        const prefs1 = createDefaultWeekdayMap([DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])
        const prefs2 = createDefaultWeekdayMap([null, DinnerMode.DINEINLATE, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])
        const prefs3 = createDefaultWeekdayMap([DinnerMode.DINEIN, null, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])

        const inhabitants = [
          { dinnerPreferences: prefs1 },
          { dinnerPreferences: prefs2 },
          { dinnerPreferences: prefs3 }
        ]

        const result = computeAggregatedPreferences(inhabitants)

        expect(result.mandag).toBe(DinnerMode.DINEIN) // All agree (null → DINEIN)
        expect(result.tirsdag).toBe(DinnerMode.DINEIN) // Mixed, falls back to DINEIN
      })
    })

    describe('real-world scenarios', () => {
      // D = DINEIN, L = DINEINLATE, T = TAKEAWAY, N = NONE, X = null (treated as DINEIN)
      const D = DinnerMode.DINEIN, L = DinnerMode.DINEINLATE, T = DinnerMode.TAKEAWAY, N = DinnerMode.NONE

      describe.each([
        {
          scenario: 'parents agree, child differs on Friday',
          prefs: [[D,D,D,D,T,N,N], [D,D,D,D,T,N,N], [D,D,D,D,D,N,N]],
          expected: [D,D,D,D,D,N,N] // Friday mixed → DINEIN fallback
        },
        {
          scenario: 'household with baby (null preferences → DINEIN)',
          prefs: [[D,D,D,D,T,N,N], [D,D,D,D,T,N,N], null],
          expected: [D,D,D,D,D,D,D] // Fri/Sat/Sun: adults differ from baby's DINEIN → fallback
        },
        {
          scenario: 'completely mixed preferences',
          prefs: [[D,L,T,D,D,N,D], [L,D,D,T,D,N,T], [T,T,N,D,D,N,D]],
          expected: [D,D,D,D,D,N,D] // Most days mixed → DINEIN, Sat consensus NONE, Sun mixed
        },
        {
          scenario: 'all agree on everything',
          prefs: [[D,D,T,T,N,N,D], [D,D,T,T,N,N,D]],
          expected: [D,D,T,T,N,N,D]
        },
        {
          scenario: 'single inhabitant',
          prefs: [[T,T,D,D,N,L,L]],
          expected: [T,T,D,D,N,L,L]
        }
      ])('$scenario', ({ prefs, expected }) => {
        it('aggregates preferences correctly', () => {
          const inhabitants = prefs.map(p =>
            ({ dinnerPreferences: p ? createDefaultWeekdayMap(p) : null })
          )

          const result = computeAggregatedPreferences(inhabitants)

          WEEKDAYS.forEach((day, i) => {
            expect(result[day]).toBe(expected[i])
          })
        })
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