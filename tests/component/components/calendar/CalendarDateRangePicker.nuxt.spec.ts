// @vitest-environment nuxt
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { enableAutoUnmount } from '@vue/test-utils'
import CalendarDateRangePicker from '~/components/calendar/CalendarDateRangePicker.vue'
import { ref } from 'vue'
import { openPopover, expectSharedCalendarGrid, findDateSegments, dateSegment, typeIntoSegment, calendarDay, resetStores, emittedPayload } from '~~/tests/component/testHelpers'
import { CALENDAR, dayCircleClasses, type CalendarPickerSelection } from '~/composables/useTheSlopeDesignSystem'
import { dateRangeSchema } from '~/composables/useDateRangeValidation'

const IS_MD = true

const JAN_1 = new Date(2025, 0, 1)
const JAN_5 = new Date(2025, 0, 5)

enableAutoUnmount(afterEach)

const mountPicker = async (modelValue: { start: Date; end: Date }, props: Record<string, unknown> = {}) =>
  await mountSuspended(CalendarDateRangePicker, {
    props: { modelValue, ...props },
    global: { provide: { isMd: ref(IS_MD) } }
  })

describe('CalendarDateRangePicker', () => {

  // The popover teleports into the body; clear it so each test reads its own calendar
  beforeEach(() => {
    resetStores()
    document.body.innerHTML = ''
  })

  it('renders start and end dates in typed segments, and a calendar on the shared grid token', async () => {
    const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
    const days = findDateSegments(wrapper, 'day')
    expect(days.map(day => day.attributes('aria-valuenow'))).toEqual(['1', '5'])
    findDateSegments(wrapper, 'year').forEach(year => expect(year.attributes('aria-valuenow')).toBe('2025'))

    await openPopover(wrapper)
    expectSharedCalendarGrid(wrapper)
  })

  it('typing the start day updates start and preserves end', async () => {
    const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
    await typeIntoSegment(dateSegment(wrapper, 'day'), ['0', '3'])

    const lastRange = emittedPayload(wrapper, 'update:modelValue', dateRangeSchema)
    expect(calendarDay(lastRange.start)).toBe('2025-01-03')
    expect(calendarDay(lastRange.end)).toBe('2025-01-05')
  })

  it('typing a start after the end shows the range rule under the field', async () => {
    const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
    await typeIntoSegment(dateSegment(wrapper, 'day'), ['0', '7'])

    const rangeRule = dateRangeSchema.safeParse({ start: new Date(2025, 0, 7), end: JAN_5 }).error?.issues.map(issue => issue.message)
    expect(rangeRule).toHaveLength(1)
    expect(wrapper.find('[data-slot="error"]').text()).toBe(rangeRule?.[0])
  })

  // What is being picked decides how a selected day reads - the variants live in CALENDAR.picker
  describe.each(['cookingDay', 'holiday'] as const satisfies readonly CalendarPickerSelection[])('selection=%s', (selection) => {
    it('draws every picked day with the design-system circle for that selection', async () => {
      const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 }, { selection })
      await openPopover(wrapper)

      // The popover is teleported to the body, so the rendered days are read from the document
      expect(document.querySelectorAll('[data-selected]').length).toBeGreaterThan(0)
      const circle = document.querySelector(`[data-value="2025-01-03"] div`)
      const circleClasses = dayCircleClasses(CALENDAR.picker[selection]).flatMap(token => token.split(' '))
      expect(Array.from(circle?.classList ?? []), 'a day inside the picked range renders the circle').toEqual(expect.arrayContaining(circleClasses))
    })
  })
})
