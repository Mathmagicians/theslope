import { describe, it, expect } from 'vitest'
import { useHousehold, isHouseholdActiveOnDay, getResidencyStatus, buildResolvedHouseholdMap } from '~/composables/useHousehold'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { useWeekDayMapValidation } from '~/composables/useWeekDayMapValidation'
import type { InhabitantDetail, InhabitantDisplay } from '~/composables/useCoreValidation'
import { WEEKDAYS } from '~/types/dateTypes'

describe('isHouseholdActiveOnDay', () => {
  const date = (y: number, m: number, d: number) => new Date(y, m - 1, d)

  // Inactive before move-in and after move-out; both days themselves count
  it.each([
    { scenario: 'future move-in → event before move-in ineligible',
      movedIn: date(2026, 4, 1), moveOut: null,
      eventDate: date(2026, 3, 15), expected: false },
    { scenario: 'past move-out → event after move-out ineligible',
      movedIn: date(2020, 1, 1), moveOut: date(2026, 4, 1),
      eventDate: date(2026, 5, 1), expected: false },
    { scenario: 'boundary: event on movedInDate → eligible',
      movedIn: date(2026, 4, 1), moveOut: null,
      eventDate: date(2026, 4, 1), expected: true },
    { scenario: 'boundary: event on moveOutDate → eligible',
      movedIn: date(2020, 1, 1), moveOut: date(2026, 4, 1),
      eventDate: date(2026, 4, 1), expected: true },
  ])('$scenario', ({ movedIn, moveOut, eventDate, expected }) => {
    const predicate = isHouseholdActiveOnDay(movedIn, moveOut)
    expect(predicate(eventDate)).toBe(expected)
  })
})

describe('getResidencyStatus', () => {
  const date = (y: number, m: number, d: number) => new Date(y, m - 1, d)
  const REF = date(2026, 3, 1) // Fixed reference date: 2026-03-01

  it.each([
    { scenario: 'moved in on reference date, no move-out',
      movedIn: REF, moveOut: null, expected: 'active' },
    { scenario: 'not yet moved in (future movedInDate)',
      movedIn: date(2026, 6, 1), moveOut: null, expected: 'pending' },
    { scenario: 'not yet moved in, with future move-out',
      movedIn: date(2026, 6, 1), moveOut: date(2027, 1, 1), expected: 'pending' },
    { scenario: 'move-out date on reference date (still leaving)',
      movedIn: date(2020, 1, 1), moveOut: REF, expected: 'leaving' },
    { scenario: 'move-out date in the past',
      movedIn: date(2020, 1, 1), moveOut: date(2025, 12, 1), expected: 'moved-out' },
  ])('$scenario → $expected', ({ movedIn, moveOut, expected }) => {
    expect(getResidencyStatus(movedIn, moveOut, REF)).toBe(expected)
  })
})

describe('useHousehold', () => {
  const { DinnerModeSchema } = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const { createDefaultWeekdayMap } = useWeekDayMapValidation({
    valueSchema: DinnerModeSchema,
    defaultValue: DinnerMode.DINEIN
  })

  describe('computeConsensus', () => {
    const { computeConsensus } = useHousehold()

    it.each([
      { values: [], defaultValue: DinnerMode.DINEIN, expected: { value: DinnerMode.DINEIN, consensus: true } },
      { values: [DinnerMode.NONE, DinnerMode.NONE], defaultValue: DinnerMode.DINEIN, expected: { value: DinnerMode.NONE, consensus: true } },
      { values: [DinnerMode.DINEIN, DinnerMode.TAKEAWAY], defaultValue: DinnerMode.DINEIN, expected: { value: DinnerMode.DINEIN, consensus: false } }
    ])('returns $expected for $values.length values', ({ values, defaultValue, expected }) => {
      expect(computeConsensus(values, defaultValue)).toEqual(expected)
    })
  })

  describe('computeAggregatedPreferences', () => {
    const { computeAggregatedPreferences } = useHousehold()

    describe('edge cases', () => {
      it('returns all DINEIN for empty inhabitants array', () => {
        const result = computeAggregatedPreferences([])

        WEEKDAYS.forEach(day => {
          expect(result.preferences[day]).toBe(DinnerMode.DINEIN)
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
          expect(result.preferences[day]).toBe(DinnerMode.DINEIN)
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
        expect(result.preferences.mandag).toBe(DinnerMode.DINEIN)
        expect(result.preferences.tirsdag).toBe(DinnerMode.DINEIN)
      })
    })

    // A day the household agrees on keeps its mode; a mixed day falls back to DINEIN
    describe('real-world scenarios', () => {
      // D = DINEIN, L = DINEINLATE, T = TAKEAWAY, N = NONE, X = null (treated as DINEIN)
      const D = DinnerMode.DINEIN, L = DinnerMode.DINEINLATE, T = DinnerMode.TAKEAWAY, N = DinnerMode.NONE

      it.each([
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
        }
      ])('$scenario: aggregates preferences correctly', ({ prefs, expected }) => {
        const inhabitants = prefs.map(p =>
          ({ dinnerPreferences: p ? createDefaultWeekdayMap(p) : null })
        )

        const result = computeAggregatedPreferences(inhabitants)

        WEEKDAYS.forEach((day, i) => {
          expect(result.preferences[day]).toBe(expected[i])
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
      { id: 122, name: 'Nova Star', lastName: 'Berg Hansen' }, // composite first name
      // Single initial with multi-part lastName (Strategy 2b)
      { id: 202, name: 'Orion', lastName: 'Nebula Star' },     // ambiguous with id 203
      { id: 203, name: 'Orion', lastName: 'Nova Prime' }       // ambiguous: both "Orion N."
    ]

    describe('exact match', () => {
      it('matches "Signe Hansen" exactly, apart from the other Signe', () => {
        expect(matchInhabitantByNameWithInitials('Signe Hansen', testInhabitants)).toBe(12)
      })

      it('handles case insensitivity', () => {
        expect(matchInhabitantByNameWithInitials('SIGNE HANSEN', testInhabitants)).toBe(12)
        expect(matchInhabitantByNameWithInitials('signe hansen', testInhabitants)).toBe(12)
      })
    })

    describe('initials format', () => {
      it.each([
        { shortName: 'Signe D.M.', expectedId: 4, description: 'two-part last name' },
        { shortName: 'Signe H.', expectedId: 12, description: 'single-part last name, disambiguates from Signe D.M.' }
      ])('matches "$shortName" ($description)', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })
    })

    describe('initials format - single initial with multi-part lastName (Strategy 2b)', () => {
      it.each([
        { shortName: 'Signe D.', expectedId: 4, description: 'matches first lastName word' },
        { shortName: 'Signe M.', expectedId: 4, description: 'matches second lastName word' },
        { shortName: 'Tommy N.', expectedId: 28, description: 'composite name: initial matches second word of name' },
        { shortName: 'Tommy L.', expectedId: 28, description: 'composite name: initial matches lastName' }
      ])('matches "$shortName" ($description)', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })

      it('returns null when single initial is ambiguous', () => {
        // Both Orion Nebula Star (202) and Orion Nova Prime (203) have lastName word starting with N
        expect(matchInhabitantByNameWithInitials('Orion N.', testInhabitants)).toBeNull()
      })
    })

    describe('first name only match (Strategy 3)', () => {
      it.each([
        { shortName: 'Babyyoda', expectedId: 42, reason: 'unique first name' },
        { shortName: 'babyyoda', expectedId: 42, reason: 'case insensitive' },
        { shortName: 'Kai', expectedId: 73, reason: 'unique first name with trailing whitespace in DB' }
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
        { shortName: 'tommy', expectedId: 28, reason: 'case insensitive' }
      ])('matches "$shortName" ($reason)', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })
    })

    // Luna and Max share the lastName prefix "Sol": the first name tells them apart
    describe('first name + lastName prefix match (Strategy 5)', () => {
      it.each([
        { shortName: 'Luna Sol', expectedId: 16, reason: 'lastName starts with "Sol"' },
        { shortName: 'Max Sol', expectedId: 21, reason: 'lastName starts with "Sol"' }
      ])('matches "$shortName" ($reason)', ({ shortName, expectedId }) => {
        expect(matchInhabitantByNameWithInitials(shortName, testInhabitants)).toBe(expectedId)
      })
    })

    describe('no match cases', () => {
      it.each([
        { shortName: 'Unknown Person', reason: 'no inhabitant with this name' },
        { shortName: 'Signe X.Y.', reason: 'wrong initials' },
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

  describe('formatHouseholdFamilyName', () => {
    const { formatHouseholdFamilyName } = useHousehold()

    it.each([
      { inhabitants: [{ lastName: '' }], expected: null, scenario: 'empty lastName' },
      { inhabitants: [{ lastName: 'Hansen' }], expected: 'Hansen', scenario: 'single person' },
      { inhabitants: [{ lastName: 'Hansen' }, { lastName: 'Hansen' }], expected: 'Familien Hansen', scenario: 'same lastName' },
      { inhabitants: [{ lastName: 'Hansen' }, { lastName: 'Jensen' }], expected: 'Familien Hansen & Jensen', scenario: 'two lastNames' },
      { inhabitants: [{ lastName: 'Hansen' }, { lastName: 'Jensen' }, { lastName: 'Larsen' }], expected: 'Familien Hansen & Jensen m.fl.', scenario: '3+ lastNames' }
    ])('$scenario → $expected', ({ inhabitants, expected }) => {
      expect(formatHouseholdFamilyName(inhabitants)).toBe(expected)
    })
  })
})

describe('buildResolvedHouseholdMap', () => {
  const date = (y: number, m: number, d: number) => new Date(y, m - 1, d)

  // Factory: minimal household shape for routing (only id, heynaboId, moveOutDate matter)
  const household = (id: number, heynaboId: number, moveOutDate: Date | null = null) => ({
    ...HouseholdFactory.defaultHouseholdDetail(`${id}`),
    id,
    heynaboId,
    moveOutDate
  })

  it('unique heynaboIds → 1:1 map unchanged', () => {
    const {resolved} = buildResolvedHouseholdMap([household(1, 10), household(2, 20), household(3, 30)])
    expect(resolved.size).toBe(3)
    expect(resolved.get(10)!.id).toBe(1)
    expect(resolved.get(20)!.id).toBe(2)
    expect(resolved.get(30)!.id).toBe(3)
  })

  it.each([
    {
      scenario: '1 active + 1 leaving → picks active',
      households: [household(1, 42, null), household(2, 42, date(2026, 6, 1))],
      expectedId: 1
    },
    {
      scenario: '1 leaving + 1 active (reversed order) → still picks active',
      households: [household(5, 42, date(2026, 6, 1)), household(3, 42, null)],
      expectedId: 3
    },
    {
      scenario: 'all with moveOutDate → newest date wins',
      households: [household(10, 42, date(2026, 1, 1)), household(11, 42, date(2026, 6, 1))],
      expectedId: 11
    },
    {
      scenario: 'same moveOutDate → tie-break by lowest id',
      households: [household(35, 42, date(2026, 6, 1)), household(33, 42, date(2026, 6, 1))],
      expectedId: 33
    },
    {
      scenario: '2+ active → lowest id (deterministic)',
      households: [household(41, 42, null), household(40, 42, null)],
      expectedId: 40
    }
  ])('duplicate heynaboId: $scenario', ({ households, expectedId }) => {
    const {resolved} = buildResolvedHouseholdMap(households)
    expect(resolved.size).toBe(1)
    expect(resolved.get(42)!.id).toBe(expectedId)
  })

  // Factory: minimal inhabitant shape for placement (only id, heynaboId, householdId matter)
  const inhabitant = (testSalt: string, id: number, heynaboId: number, householdId: number) => ({
    ...HouseholdFactory.defaultInhabitantData(testSalt), id, heynaboId, householdId
  })

  it('inhabitantPlacements is global: spans sibling households AND other addresses', () => {
    const anna = inhabitant('a', 10, 100, 1)
    const bo = inhabitant('b', 11, 101, 1)
    const carl = inhabitant('c', 20, 200, 2)
    const dora = inhabitant('d', 30, 300, 3)
    const activeAt42 = {...household(1, 42), inhabitants: [anna, bo]}
    const siblingAt42 = {...household(2, 42, date(2026, 6, 1)), inhabitants: [carl]}
    const activeAt77 = {...household(3, 77), inhabitants: [dora]}
    const {inhabitantPlacements} = buildResolvedHouseholdMap([activeAt42, siblingAt42, activeAt77])

    const expected = [[anna, activeAt42], [bo, activeAt42], [carl, siblingAt42], [dora, activeAt77]] as const
    expect(inhabitantPlacements.size).toBe(expected.length)
    for (const [person, home] of expected) {
      expect(inhabitantPlacements.get(person.heynaboId)).toEqual({inhabitant: person, household: home})
    }
  })

  it('inhabitantPlacements empty when households hold no inhabitants', () => {
    const {inhabitantPlacements} = buildResolvedHouseholdMap([{...household(1, 42), inhabitants: []}])
    expect(inhabitantPlacements.size).toBe(0)
  })
})
