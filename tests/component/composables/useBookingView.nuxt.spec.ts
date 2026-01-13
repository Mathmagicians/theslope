// @vitest-environment nuxt
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {flushPromises} from '@vue/test-utils'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {useBookingView, BookingViewSchema, type BookingView} from '~/composables/useBookingView'

/**
 * Unit tests for useBookingView composable
 * ADR-006: URL-synced view type and date for booking calendar
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

const createBookingView = (query: Record<string, string> = {}, seasonDates?: { start: Date, end: Date }) => {
  setupQuery(query)
  return useBookingView({
    syncWhen: () => false,
    seasonDates: seasonDates ? () => seasonDates : undefined
  })
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

  describe('View Parameter', () => {
    const viewCases: { query: Record<string, string>, expected: BookingView }[] = [
      {query: {}, expected: 'day'},
      {query: {view: 'day'}, expected: 'day'},
      {query: {view: 'week'}, expected: 'week'},
      {query: {view: 'month'}, expected: 'month'},
      {query: {view: 'invalid'}, expected: 'day'}
    ]

    it.each(viewCases)('returns $expected for query $query', ({query, expected}) => {
      const {view} = createBookingView(query)
      expect(view.value).toBe(expected)
    })

    it('updates URL on setView', async () => {
      const {setView} = createBookingView()
      await setView('week')
      await flushPromises()
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.objectContaining({query: expect.objectContaining({view: 'week'})}),
        {replace: true}
      )
    })
  })

  describe('Date Parameter', () => {
    const dateCases: { query: Record<string, string>, expectedDay: number, expectedMonth: number, expectedYear: number }[] = [
      {query: {date: '15/01/2025'}, expectedDay: 15, expectedMonth: 0, expectedYear: 2025},
      {query: {date: '28/02/2025'}, expectedDay: 28, expectedMonth: 1, expectedYear: 2025},
      {query: {date: '31/12/2024'}, expectedDay: 31, expectedMonth: 11, expectedYear: 2024}
    ]

    it.each(dateCases)('parses $query.date correctly', ({query, expectedDay, expectedMonth, expectedYear}) => {
      const {selectedDate} = createBookingView(query)
      expect(selectedDate.value.getDate()).toBe(expectedDay)
      expect(selectedDate.value.getMonth()).toBe(expectedMonth)
      expect(selectedDate.value.getFullYear()).toBe(expectedYear)
    })

    it('defaults to today for missing/invalid date', () => {
      const today = new Date()
      const invalidQueries: Record<string, string>[] = [{}, {date: 'invalid'}, {date: ''}]
      for (const query of invalidQueries) {
        const {selectedDate} = createBookingView(query)
        expect(selectedDate.value.toDateString()).toBe(today.toDateString())
      }
    })

    it('updates URL on setDate', async () => {
      const {setDate} = createBookingView()
      await setDate(new Date('2025-03-20'))
      await flushPromises()
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.objectContaining({query: expect.objectContaining({date: '20/03/2025'})}),
        {replace: true}
      )
    })
  })

  describe('dateRange Computed', () => {
    const rangeCases: { view: BookingView, date: string, expectedStart: number, expectedEnd: number }[] = [
      // Day view: same start/end
      {view: 'day', date: '15/01/2025', expectedStart: 15, expectedEnd: 15},
      // Week view: Monday-Sunday (15th is Wednesday → 13-19)
      {view: 'week', date: '15/01/2025', expectedStart: 13, expectedEnd: 19},
      // Month view: 1st to last day
      {view: 'month', date: '15/01/2025', expectedStart: 1, expectedEnd: 31},
      {view: 'month', date: '15/02/2025', expectedStart: 1, expectedEnd: 28}
    ]

    it.each(rangeCases)('$view view on $date → days $expectedStart-$expectedEnd', ({view, date, expectedStart, expectedEnd}) => {
      const {dateRange} = createBookingView({view, date})
      expect(dateRange.value.start.getDate()).toBe(expectedStart)
      expect(dateRange.value.end.getDate()).toBe(expectedEnd)
    })
  })

  describe('weeks Computed', () => {
    it.each(['day', 'week'] as const)('returns empty for %s view', (view) => {
      const {weeks} = createBookingView({view, date: '15/01/2025'})
      expect(weeks.value).toEqual([])
    })

    it('returns weeks for month view with Monday-Sunday spans', () => {
      const {weeks} = createBookingView({view: 'month', date: '15/01/2025'})
      expect(weeks.value.length).toBeGreaterThan(0)
      weeks.value.forEach(week => {
        expect(week.start.getDay()).toBe(1) // Monday
        expect(week.end.getDay()).toBe(0) // Sunday
        const daysDiff = Math.round((week.end.getTime() - week.start.getTime()) / (1000 * 60 * 60 * 24))
        expect(daysDiff).toBe(6)
      })
    })
  })

  describe('navigate()', () => {
    const navCases: { view: BookingView, date: string, direction: 1 | -1, expected: string }[] = [
      // Day: ±1 day
      {view: 'day', date: '15/01/2025', direction: 1, expected: '16/01/2025'},
      {view: 'day', date: '15/01/2025', direction: -1, expected: '14/01/2025'},
      // Week: ±7 days
      {view: 'week', date: '15/01/2025', direction: 1, expected: '22/01/2025'},
      {view: 'week', date: '15/01/2025', direction: -1, expected: '08/01/2025'},
      // Month: ±1 month
      {view: 'month', date: '15/01/2025', direction: 1, expected: '15/02/2025'},
      {view: 'month', date: '15/01/2025', direction: -1, expected: '15/12/2024'}
    ]

    it.each(navCases)('$view $direction from $date → $expected', async ({view, date, direction, expected}) => {
      const {navigate} = createBookingView({view, date})
      await navigate(direction)
      await flushPromises()
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.objectContaining({query: expect.objectContaining({date: expected})}),
        {replace: true}
      )
    })

    describe('Season Bounds Clamping', () => {
      const bounds = {start: new Date('2025-01-10'), end: new Date('2025-01-20')}

      const clampCases: { date: string, direction: 1 | -1, expected: string }[] = [
        {date: '11/01/2025', direction: -1, expected: '10/01/2025'}, // Clamp to start
        {date: '19/01/2025', direction: 1, expected: '20/01/2025'}   // Clamp to end
      ]

      it.each(clampCases)('clamps $date $direction to $expected', async ({date, direction, expected}) => {
        const {navigate} = createBookingView({view: 'day', date}, bounds)
        await navigate(direction)
        await flushPromises()
        expect(mockNavigateTo).toHaveBeenCalledWith(
          expect.objectContaining({query: expect.objectContaining({date: expected})}),
          {replace: true}
        )
      })
    })
  })

  describe('URL Preservation', () => {
    it('preserves view when changing date', async () => {
      const {setDate} = createBookingView({view: 'week', date: '15/01/2025'})
      await setDate(new Date('2025-02-01'))
      await flushPromises()
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.objectContaining({query: expect.objectContaining({view: 'week', date: '01/02/2025'})}),
        {replace: true}
      )
    })

    it('preserves date when changing view', async () => {
      const {setView} = createBookingView({view: 'day', date: '15/01/2025'})
      await setView('month')
      await flushPromises()
      expect(mockNavigateTo).toHaveBeenCalledWith(
        expect.objectContaining({query: expect.objectContaining({view: 'month', date: '15/01/2025'})}),
        {replace: true}
      )
    })
  })
})
