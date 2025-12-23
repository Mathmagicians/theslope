import { describe, it, expect } from 'vitest'
import { useHousehold } from '~/composables/useHousehold'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import type { InhabitantDetail, InhabitantDisplay } from '~/composables/useCoreValidation'
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
        // Build a map with null in first position to test null handling
        const prefs2Base = createDefaultWeekdayMap([DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])
        const prefs2 = {...prefs2Base, mandag: null as unknown as typeof DinnerMode.DINEIN}

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
        // Build maps with null in specific positions to test null handling
        const prefs2Base = createDefaultWeekdayMap([DinnerMode.DINEIN, DinnerMode.DINEINLATE, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])
        const prefs2 = {...prefs2Base, mandag: null as unknown as typeof DinnerMode.DINEIN}
        const prefs3Base = createDefaultWeekdayMap([DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.DINEIN, DinnerMode.TAKEAWAY, DinnerMode.NONE, DinnerMode.NONE])
        const prefs3 = {...prefs3Base, tirsdag: null as unknown as typeof DinnerMode.DINEIN}

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

  describe('matchInhabitantByNameWithInitials', () => {
    const { matchInhabitantByNameWithInitials, createInhabitantMatcher } = useHousehold()

    // Obfuscated test data based on production patterns
    const testInhabitants: Pick<InhabitantDisplay, 'id' | 'name' | 'lastName'>[] = [
      { id: 4, name: 'Signe', lastName: 'Dalby Madsen' },
      { id: 12, name: 'Signe', lastName: 'Hansen' },
      { id: 3, name: 'Erik', lastName: 'Anders Hansen' },
      { id: 9, name: 'Clara', lastName: 'Urban Koch' },
      { id: 1, name: 'Helle', lastName: 'Andersen' },
      // Unique first names (no other inhabitant shares these)
      { id: 42, name: 'Babyyoda', lastName: 'Skywalker' },
      { id: 88, name: 'Skransen', lastName: 'Madsen' },
      // Production patterns: composite names, lastName prefixes, whitespace
      { id: 16, name: 'Luna', lastName: 'Sol Andersen-Berg' }, // lastName prefix pattern
      { id: 21, name: 'Max', lastName: 'Sol Andersen-Berg' },  // same lastName prefix, different first name
      { id: 28, name: 'Tommy Nielsen', lastName: 'Larsen' },   // composite first name
      { id: 73, name: 'Kai ', lastName: 'Berg Hansen ' },      // trailing whitespace in DB
      { id: 85, name: 'Zara Noor', lastName: 'Khan' },         // composite first name
      { id: 122, name: 'Nova Star', lastName: 'Berg Hansen' }  // composite first name
    ]

    describe('exact match', () => {
      it.each([
        { shortName: 'Signe Dalby Madsen', expectedId: 4 },
        { shortName: 'Signe Hansen', expectedId: 12 },
        { shortName: 'Erik Anders Hansen', expectedId: 3 },
        { shortName: 'Helle Andersen', expectedId: 1 }
      ])('matches "$shortName" exactly', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })

      it('handles case insensitivity', () => {
        expect(matchInhabitantByNameWithInitials('SIGNE HANSEN', testInhabitants)).toBe(12)
        expect(matchInhabitantByNameWithInitials('signe hansen', testInhabitants)).toBe(12)
      })
    })

    describe('initials format - multi-part last names', () => {
      it.each([
        { shortName: 'Signe D.M.', expectedId: 4, description: 'two-part last name' },
        { shortName: 'Erik A.H.', expectedId: 3, description: 'two-part last name' },
        { shortName: 'Clara U.K.', expectedId: 9, description: 'two-part last name' }
      ])('matches "$shortName" ($description)', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })
    })

    describe('initials format - single-part last names', () => {
      it.each([
        { shortName: 'Signe H.', expectedId: 12, description: 'disambiguates from Signe D.M.' },
        { shortName: 'Helle A.', expectedId: 1, description: 'single initial' }
      ])('matches "$shortName" ($description)', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })
    })

    describe('first name only match (Strategy 3)', () => {
      it.each([
        { shortName: 'Babyyoda', expectedId: 42, reason: 'unique first name' },
        { shortName: 'Skransen', expectedId: 88, reason: 'unique first name' },
        { shortName: 'babyyoda', expectedId: 42, reason: 'case insensitive' },
        { shortName: 'SKRANSEN', expectedId: 88, reason: 'case insensitive' },
        { shortName: 'Erik', expectedId: 3, reason: 'unique first name with multi-part last name' },
        { shortName: 'Clara', expectedId: 9, reason: 'unique first name' },
        { shortName: 'Helle', expectedId: 1, reason: 'unique first name' },
        { shortName: 'Kai', expectedId: 73, reason: 'unique first name with trailing whitespace in DB' },
        { shortName: 'Luna', expectedId: 16, reason: 'unique first name' },
        { shortName: 'Max', expectedId: 21, reason: 'unique first name' }
      ])('matches "$shortName" ($reason)', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })

      it('returns null for non-unique first name (Signe)', () => {
        // Signe appears twice (ids 4 and 12) - cannot disambiguate
        expect(matchInhabitantByNameWithInitials('Signe', testInhabitants)).toBeNull()
      })
    })

    describe('first word of composite name match (Strategy 4)', () => {
      it.each([
        { shortName: 'Tommy', expectedId: 28, reason: 'first word of "Tommy Nielsen"' },
        { shortName: 'Zara', expectedId: 85, reason: 'first word of "Zara Noor"' },
        { shortName: 'Nova', expectedId: 122, reason: 'first word of "Nova Star"' },
        { shortName: 'tommy', expectedId: 28, reason: 'case insensitive' }
      ])('matches "$shortName" ($reason)', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })
    })

    describe('first name + lastName prefix match (Strategy 5)', () => {
      it.each([
        { shortName: 'Luna Sol', expectedId: 16, reason: 'lastName starts with "Sol"' },
        { shortName: 'Max Sol', expectedId: 21, reason: 'lastName starts with "Sol"' },
        { shortName: 'luna sol', expectedId: 16, reason: 'case insensitive' }
      ])('matches "$shortName" ($reason)', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })

      it('returns null when lastName prefix is ambiguous', () => {
        // Both Luna and Max have lastName starting with "Sol" - but input has first name
        // So "Luna Sol" matches Luna, "Max Sol" matches Max (no ambiguity)
        expect(matchInhabitantByNameWithInitials('Luna Sol', testInhabitants)).toBe(16)
        expect(matchInhabitantByNameWithInitials('Max Sol', testInhabitants)).toBe(21)
      })
    })

    describe('no match cases', () => {
      it.each([
        { shortName: 'Unknown Person', reason: 'no inhabitant with this name' },
        { shortName: 'Signe', reason: 'non-unique first name (two Signes exist)' },
        { shortName: 'Signe X.Y.', reason: 'wrong initials' },
        { shortName: 'Signe D.', reason: 'incomplete initials for two-part last name' },
        { shortName: 'Anna D.M.', reason: 'wrong first name' }
      ])('returns null for "$shortName" ($reason)', ({ shortName }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBeNull()
      })
    })

    describe('createInhabitantMatcher', () => {
      it('creates a bound matcher function', () => {
        const matcher = createInhabitantMatcher(testInhabitants)

        expect(matcher('Signe D.M.')).toBe(4)
        expect(matcher('Signe H.')).toBe(12)
        expect(matcher('Unknown')).toBeNull()
      })
    })
  })
})