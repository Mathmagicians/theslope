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

// Test data factory
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
      {view: 'day', date: new Date('2025-01-15'), expectedStartDay: 15, expectedEndDay: 15},
      // Week view: Monday-Sunday (15th is Wednesday → 13-19)
      {view: 'week', date: new Date('2025-01-15'), expectedStartDay: 13, expectedEndDay: 19},
      // Month view: 1st to last day
      {view: 'month', date: new Date('2025-01-15'), expectedStartDay: 1, expectedEndDay: 31},
      {view: 'month', date: new Date('2025-02-15'), expectedStartDay: 1, expectedEndDay: 28}
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
      const refs = createMockRefs(new Date('2025-01-15'), view)
      const {weeks} = useBookingView({...refs})
      expect(weeks.value).toEqual([])
    })

    it('returns weeks for month view with Monday-Sunday spans', () => {
      const refs = createMockRefs(new Date('2025-01-15'), 'month')
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

  describe('hasPrev / hasNext', () => {
    const dinnerDates = [
      new Date('2025-01-13'),
      new Date('2025-01-15'),
      new Date('2025-01-17'),
      new Date('2025-01-20')
    ]

    const boundsCases: { date: Date, hasPrev: boolean, hasNext: boolean }[] = [
      {date: new Date('2025-01-13'), hasPrev: false, hasNext: true},  // First dinner
      {date: new Date('2025-01-15'), hasPrev: true, hasNext: true},   // Middle
      {date: new Date('2025-01-20'), hasPrev: true, hasNext: false}   // Last dinner
    ]

    it.each(boundsCases)('date $date → hasPrev=$hasPrev, hasNext=$hasNext', ({date, hasPrev, hasNext}) => {
      const refs = createMockRefs(date, 'day')
      const result = useBookingView({
        ...refs,
        dinnerDates: () => dinnerDates
      })
      expect(result.hasPrev.value).toBe(hasPrev)
      expect(result.hasNext.value).toBe(hasNext)
    })

    it('returns false when no dinner dates', () => {
      const refs = createMockRefs(new Date('2025-01-15'), 'day')
      const {hasPrev, hasNext} = useBookingView({...refs})
      expect(hasPrev.value).toBe(false)
      expect(hasNext.value).toBe(false)
    })
  })

  describe('navigate()', () => {
    describe('Day View (cooking days only)', () => {
      const dinnerDates = [
        new Date('2025-01-13'),
        new Date('2025-01-15'),
        new Date('2025-01-17'),
        new Date('2025-01-20')
      ]

      const dayCases: { date: Date, direction: 1 | -1, expectedDate: Date }[] = [
        // Navigate from 15th → 17th (skips 16th)
        {date: new Date('2025-01-15'), direction: 1, expectedDate: new Date('2025-01-17')},
        // Navigate from 15th → 13th (skips 14th)
        {date: new Date('2025-01-15'), direction: -1, expectedDate: new Date('2025-01-13')}
      ]

      it.each(dayCases)('day $direction from date → skips non-cooking days', async ({date, direction, expectedDate}) => {
        const refs = createMockRefs(date, 'day')
        const {navigate} = useBookingView({...refs, dinnerDates: () => dinnerDates})
        await navigate(direction)
        expect(refs.setDate).toHaveBeenCalledWith(expectedDate)
      })

      it('does not navigate when at boundary', async () => {
        const refs = createMockRefs(new Date('2025-01-20'), 'day') // Last dinner
        const {navigate} = useBookingView({...refs, dinnerDates: () => dinnerDates})
        await navigate(1)
        expect(refs.setDate).not.toHaveBeenCalled()
      })

      it('does not navigate when no dinner dates', async () => {
        const refs = createMockRefs(new Date('2025-01-15'), 'day')
        const {navigate} = useBookingView({...refs})
        await navigate(1)
        expect(refs.setDate).not.toHaveBeenCalled()
      })
    })

    describe('Week/Month View', () => {
      const weekMonthCases: { view: BookingView, date: Date, direction: 1 | -1, expectedDay: number }[] = [
        // Week: ±7 days
        {view: 'week', date: new Date('2025-01-15'), direction: 1, expectedDay: 22},
        {view: 'week', date: new Date('2025-01-15'), direction: -1, expectedDay: 8},
        // Month: ±1 month (same day)
        {view: 'month', date: new Date('2025-01-15'), direction: 1, expectedDay: 15},
        {view: 'month', date: new Date('2025-01-15'), direction: -1, expectedDay: 15}
      ]

      it.each(weekMonthCases)('$view $direction from date', async ({view, date, direction, expectedDay}) => {
        const refs = createMockRefs(date, view)
        const {navigate} = useBookingView({...refs})
        await navigate(direction)
        expect(refs.setDate).toHaveBeenCalled()
        const calledDate = refs.setDate.mock.calls[0]?.[0] as Date
        expect(calledDate.getDate()).toBe(expectedDay)
      })
    })

    describe('Season Bounds Clamping', () => {
      const bounds = {start: new Date('2025-01-10'), end: new Date('2025-01-20')}
      const dinnerDates = [
        new Date('2025-01-10'),
        new Date('2025-01-11'),
        new Date('2025-01-19'),
        new Date('2025-01-20')
      ]

      it('clamps to start bound', async () => {
        const refs = createMockRefs(new Date('2025-01-11'), 'day')
        const {navigate} = useBookingView({
          ...refs,
          seasonDates: () => bounds,
          dinnerDates: () => dinnerDates
        })
        await navigate(-1)
        expect(refs.setDate).toHaveBeenCalledWith(new Date('2025-01-10'))
      })

      it('clamps to end bound', async () => {
        const refs = createMockRefs(new Date('2025-01-19'), 'day')
        const {navigate} = useBookingView({
          ...refs,
          seasonDates: () => bounds,
          dinnerDates: () => dinnerDates
        })
        await navigate(1)
        expect(refs.setDate).toHaveBeenCalledWith(new Date('2025-01-20'))
      })
    })
  })
})

describe('useDinnerDateParam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupQuery({})
  })

  const dinnerDates = [
    new Date('2025-01-13'),
    new Date('2025-01-15'),
    new Date('2025-01-17')
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
    await setValue(new Date('2025-01-17'))
    await flushPromises()
    expect(mockNavigateTo).toHaveBeenCalledWith(
      expect.objectContaining({query: expect.objectContaining({date: '17/01/2025'})}),
      {replace: true}
    )
  })
})
