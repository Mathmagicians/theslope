// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import CalendarDateRangePicker from '~/components/calendar/CalendarDateRangePicker.vue'
import { nextTick, ref } from 'vue'
import { openPopover, expectSharedCalendarGrid } from '~~/tests/component/testHelpers'
import { CALENDAR, createDayCircleClasses } from '~/composables/useTheSlopeDesignSystem'

const IS_MD = true
const dayCircleClasses = createDayCircleClasses(ref(IS_MD))

const JAN_1 = new Date(2025, 0, 1)
const JAN_5 = new Date(2025, 0, 5)
const JAN_10 = new Date(2025, 0, 10)

type PickerVm = {
  errors: Map<string, string[]>
  updateDateRange: (range: { start: Date; end: Date }) => boolean
}

const mountPicker = async (modelValue: { start: Date; end: Date }, props: Record<string, unknown> = {}) =>
  await mountSuspended(CalendarDateRangePicker, {
    props: { modelValue, ...props },
    global: { provide: { isMd: ref(IS_MD) } }
  })

describe('CalendarDateRangePicker', () => {

  // The popover teleports into the body; clear it so each test reads its own calendar
  beforeEach(() => { document.body.innerHTML = '' })

  it('renders start and end inputs with formatted dates', async () => {
    const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBe(2)
    expect(inputs[0]!.element.value).toBe('01/01/2025')
    expect(inputs[1]!.element.value).toBe('05/01/2025')
  })

  it('updates start input while preserving end', async () => {
    const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('10/01/2025')
    await nextTick()
    expect(inputs[0]!.element.value).toBe('10/01/2025')
    expect(inputs[1]!.element.value).toBe('05/01/2025')
  })

  it('shows error for invalid date format', async () => {
    const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('31-01-2025')
    await nextTick()
    await nextTick()
    const vm = wrapper.vm as unknown as PickerVm
    expect(vm.errors.size).toBeGreaterThan(0)
  })

  it('configures its calendar from the shared design-system grid token', async () => {
    const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
    await openPopover(wrapper)
    expectSharedCalendarGrid(wrapper)
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

  it('rejects end before start', async () => {
    const wrapper = await mountPicker({ start: JAN_5, end: JAN_10 })
    const vm = wrapper.vm as unknown as PickerVm
    expect(vm.updateDateRange({ start: JAN_5, end: JAN_1 })).toBe(false)
    await nextTick()
    const allErrors = Array.from(vm.errors.values()).flat()
    expect(allErrors.some((msg: string) => msg.includes('Tidsmaskinen'))).toBe(true)
  })
})
