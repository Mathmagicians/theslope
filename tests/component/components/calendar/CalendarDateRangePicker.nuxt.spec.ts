// @vitest-environment nuxt
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { enableAutoUnmount } from '@vue/test-utils'
import CalendarDateRangePicker from '~/components/calendar/CalendarDateRangePicker.vue'
import { ref } from 'vue'
import { openPopover, expectSharedCalendarGrid, findDateSegments, typeIntoSegment, calendarDay, resetStores } from '~~/tests/component/testHelpers'
import { CALENDAR, createDayCircleClasses } from '~/composables/useTheSlopeDesignSystem'
import type { DateRange } from '~/types/dateTypes'

const IS_MD = true
const dayCircleClasses = createDayCircleClasses(ref(IS_MD))

const JAN_1 = new Date(2025, 0, 1)
const JAN_5 = new Date(2025, 0, 5)

type PickerVm = {
  errors: Map<string, string[]>
}

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
    expect(days.length).toBe(2)
    expect(days[0]!.attributes('aria-valuenow')).toBe('1')
    expect(days[1]!.attributes('aria-valuenow')).toBe('5')
    findDateSegments(wrapper, 'year').forEach(year => expect(year.attributes('aria-valuenow')).toBe('2025'))

    await openPopover(wrapper)
    expectSharedCalendarGrid(wrapper)
  })

  it('typing the start day updates start and preserves end', async () => {
    const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
    await typeIntoSegment(findDateSegments(wrapper, 'day')[0]!, ['0', '3'])

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const lastRange = emitted!.at(-1)![0] as DateRange
    expect(calendarDay(lastRange.start)).toBe('2025-01-03')
    expect(calendarDay(lastRange.end)).toBe('2025-01-05')
  })

  it('typing a start after the end reports the range error', async () => {
    const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
    await typeIntoSegment(findDateSegments(wrapper, 'day')[0]!, ['0', '7'])

    const vm = wrapper.vm as unknown as PickerVm
    const allErrors = Array.from(vm.errors.values()).flat()
    expect(allErrors.some((msg: string) => msg.includes('Tidsmaskinen'))).toBe(true)
  })

  // What is being picked decides how a selected day reads - the variants live in CALENDAR.picker
  describe.each(['cookingDay', 'holiday'] as const)('selection=%s', (selection) => {
    it('draws every picked day with the design-system circle for that selection', async () => {
      const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 }, { selection })
      await openPopover(wrapper)

      // The popover is teleported to the body, so the rendered days are read from the document
      expect(document.querySelectorAll('[data-selected]').length).toBeGreaterThan(0)
      const circle = document.querySelector(`[data-value="2025-01-03"] div`)
      expect(circle, 'a day inside the picked range renders a circle').not.toBeNull()
      dayCircleClasses(CALENDAR.picker[selection])
        .flatMap(token => token.split(' '))
        .forEach(cls => expect(circle!.classList.contains(cls)).toBe(true))
    })
  })
})
