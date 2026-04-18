// @vitest-environment nuxt
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {flushPromises} from '@vue/test-utils'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {useBookingView, useDinnerDateParam, BookingViewSchema, type BookingView} from '~/composables/useBookingView'

/**
 * Unit tests for useBookingView composable (curried pattern)
 * ADR-006: URL-synced view type and date for booking calendar
 *
 * Architecture:
 * - useDinnerDateParam: creates date query param with dinner validation
 * - useBookingView: takes refs, provides navigation logic (hasPrev, hasNext, navigate)
 *
 * Navigation model: getPeriodBoundary(date, view, direction) → boundary → getAdjacentDinner →
 * the next/previous dinner on that side of the boundary (null if none, which hides the arrow).
 */

const {mockNavigateTo, mockRouteData} = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockRouteData: {
    path: '/household/test/bookings',
    params: {} as Record<string, string | undefined>,
    query: {} as Record<string, string>,
    hash: ''
  }
}))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => () => mockRouteData)

const setupQuery = (query: Record<string, string>) => {
  for (const key in mockRouteData.query) {
    if (Object.hasOwn(mockRouteData.query, key)) {
      Reflect.deleteProperty(mockRouteData.query, key)
    }
  }
  Object.assign(mockRouteData.query, query)
}

// Helper to create refs for useBookingView (simulates what pages do)
const createMockRefs = (
  initialDate: Date = new Date(),
  initialView: BookingView = 'day'
) => {
  const dateRef = ref(initialDate)
  const viewRef = ref(initialView)
  const setDate = vi.fn(async (d: Date) => { dateRef.value = d })
  const setView = vi.fn(async (v: BookingView) => { viewRef.value = v })

  return {
    selectedDate: computed(() => dateRef.value),
    setDate,
    view: computed(() => viewRef.value),
    setView
  }
}

describe('useBookingView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupQuery({})
  })

  describe('BookingViewSchema', () => {
    it.each(BookingViewSchema.options)('parses valid view: %s', (view) => {
      expect(BookingViewSchema.parse(view)).toBe(view)
    })

    it('rejects invalid view', () => {
      expect(BookingViewSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('dateRange Computed', () => {
    const rangeCases: { view: BookingView, date: Date, expectedStartDay: number, expectedEndDay: number }[] = [
      // Day view: same start/end
      {view: 'day', date: new Date(2025, 0, 15), expectedStartDay: 15, expectedEndDay: 15},
      // Week view: Monday-Sunday (15th is Wednesday → 13-19)
      {view: 'week', date: new Date(2025, 0, 15), expectedStartDay: 13, expectedEndDay: 19},
      // Month view: 1st to last day
      {view: 'month', date: new Date(2025, 0, 15), expectedStartDay: 1, expectedEndDay: 31},
      {view: 'month', date: new Date(2025, 1, 15), expectedStartDay: 1, expectedEndDay: 28}
    ]

    it.each(rangeCases)('$view view → days $expectedStartDay-$expectedEndDay', ({view, date, expectedStartDay, expectedEndDay}) => {
      const refs = createMockRefs(date, view)
      const {dateRange} = useBookingView({...refs})
      expect(dateRange.value.start.getDate()).toBe(expectedStartDay)
      expect(dateRange.value.end.getDate()).toBe(expectedEndDay)
    })
  })

  describe('weeks Computed', () => {
    it.each(['day', 'week'] as const)('returns empty for %s view', (view) => {
      const refs = createMockRefs(new Date(2025, 0, 15), view)
      const {weeks} = useBookingView({...refs})
      expect(weeks.value).toEqual([])
    })

    it('returns weeks for month view with Monday-Sunday spans', () => {
      const refs = createMockRefs(new Date(2025, 0, 15), 'month')
      const {weeks} = useBookingView({...refs})
      expect(weeks.value.length).toBeGreaterThan(0)
      weeks.value.forEach(week => {
        expect(week.start.getDay()).toBe(1) // Monday
        expect(week.end.getDay()).toBe(0) // Sunday
        const daysDiff = Math.round((week.end.getTime() - week.start.getTime()) / (1000 * 60 * 60 * 24))
        expect(daysDiff).toBe(6)
      })
    })
  })

  /**
   * Unified navigation matrix.
   *
   * Dinner fixture (January/March 2025, all local-time Dates for TZ safety):
   *   Week of Mon Jan 13: [Mon 13, Wed 15, Fri 17]
   *   Week of Mon Jan 20: empty
   *   Week of Mon Jan 27: [Wed 29]
   *   Month Feb:          empty
   *   Month Mar:          [Mon Mar 3]
   *
   * Each row asserts both hasPrev/hasNext flags AND the navigate() result in one pass,
   * so we do not need separate describe blocks per concern.
   */
  describe('navigation matrix', () => {
    const mon13 = new Date(2025, 0, 13)
    const wed15 = new Date(2025, 0, 15)
    const fri17 = new Date(2025, 0, 17)
    const wed29 = new Date(2025, 0, 29)
    const mar3 = new Date(2025, 2, 3)

    const allDinners = [mon13, wed15, fri17, wed29, mar3]

    const cases: {
      desc: string
      date: Date
      view: BookingView
      direction: 1 | -1
      dinnerDates: Date[]
      expected: Date | null
    }[] = [
      // DAY view
      {desc: 'day +1 from Wed 15 → Fri 17',
        date: wed15, view: 'day', direction: 1, dinnerDates: allDinners, expected: fri17},
      {desc: 'day -1 from Wed 15 → Mon 13',
        date: wed15, view: 'day', direction: -1, dinnerDates: allDinners, expected: mon13},
      {desc: 'day +1 from last dinner (Mar 3) → null (no-op)',
        date: mar3, view: 'day', direction: 1, dinnerDates: allDinners, expected: null},
      {desc: 'day -1 from first dinner (Mon 13) → null (no-op)',
        date: mon13, view: 'day', direction: -1, dinnerDates: allDinners, expected: null},

      // WEEK view — skips the empty week of Mon 20.
      {desc: 'week +1 from Wed 15 skips empty week-of-20 → Wed 29',
        date: wed15, view: 'week', direction: 1, dinnerDates: allDinners, expected: wed29},
      {desc: 'week -1 from Wed 29 skips empty week-of-20 → Fri 17',
        date: wed29, view: 'week', direction: -1, dinnerDates: allDinners, expected: fri17},

      // MONTH view — skips empty February.
      {desc: 'month +1 from January skips empty Feb → Mar 3',
        date: wed15, view: 'month', direction: 1, dinnerDates: allDinners, expected: mar3},
      {desc: 'month -1 from March skips empty Feb → Wed 29',
        date: mar3, view: 'month', direction: -1, dinnerDates: allDinners, expected: wed29},

      // No dinner dates supplied → every arrow is blocked.
      {desc: 'day +1 with empty dinnerDates → null',
        date: wed15, view: 'day', direction: 1, dinnerDates: [], expected: null},
      {desc: 'week +1 with empty dinnerDates → null',
        date: wed15, view: 'week', direction: 1, dinnerDates: [], expected: null},
      {desc: 'month +1 with empty dinnerDates → null',
        date: wed15, view: 'month', direction: 1, dinnerDates: [], expected: null}
    ]

    it.each(cases)('$desc', async ({date, view, direction, dinnerDates, expected}) => {
      const refs = createMockRefs(date, view)
      const {hasPrev, hasNext, navigate} = useBookingView({
        ...refs,
        dinnerDates: () => dinnerDates
      })

      // Directional flag must agree with adjacency lookup.
      const flag = direction === 1 ? hasNext.value : hasPrev.value
      expect(flag).toBe(expected !== null)

      await navigate(direction)
      if (expected === null) {
        expect(refs.setDate).not.toHaveBeenCalled()
      } else {
        expect(refs.setDate).toHaveBeenCalledWith(expected)
      }
    })
  })
})

describe('useDinnerDateParam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupQuery({})
  })

  const dinnerDates = [
    new Date(2025, 0, 13),
    new Date(2025, 0, 15),
    new Date(2025, 0, 17)
  ]

  it('parses valid dinner date from URL', () => {
    setupQuery({date: '15/01/2025'})
    const {value} = useDinnerDateParam({
      dinnerDates: () => dinnerDates,
      syncWhen: () => true
    })
    expect(value.value.getDate()).toBe(15)
    expect(value.value.getMonth()).toBe(0)
    expect(value.value.getFullYear()).toBe(2025)
  })

  it('updates URL on setValue', async () => {
    const {setValue} = useDinnerDateParam({
      dinnerDates: () => dinnerDates,
      syncWhen: () => false
    })
    await setValue(new Date(2025, 0, 17))
    await flushPromises()
    expect(mockNavigateTo).toHaveBeenCalledWith(
      expect.objectContaining({query: expect.objectContaining({date: '17/01/2025'})}),
      {replace: true}
    )
  })
})
