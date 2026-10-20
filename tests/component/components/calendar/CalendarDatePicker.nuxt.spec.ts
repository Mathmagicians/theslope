// @vitest-environment nuxt
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { enableAutoUnmount } from '@vue/test-utils'
import CalendarDatePicker from '~/components/calendar/CalendarDatePicker.vue'
import { ref } from 'vue'
import { openPopover, expectSharedCalendarGrid, findDateSegments, typeIntoSegment, calendarDay, resetStores } from '~~/tests/component/testHelpers'

const JAN_1 = new Date(2025, 0, 1)

type PickerVm = {
  errors: Map<string, string[]>
  updateDate: (date: Date | null) => boolean
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  resetStores()
})

const mountPicker = async (modelValue: Date | null, extraProps: Record<string, unknown> = {}) =>
  await mountSuspended(CalendarDatePicker, {
    props: { modelValue, ...extraProps },
    global: { provide: { isMd: ref(true) } }
  })

describe('CalendarDatePicker', () => {

  it('renders the model date in typed day/month/year segments under the default label, and a calendar on the shared grid token', async () => {
    const wrapper = await mountPicker(JAN_1)
    expect(findDateSegments(wrapper, 'day')[0]!.attributes('aria-valuenow')).toBe('1')
    expect(findDateSegments(wrapper, 'year')[0]!.attributes('aria-valuenow')).toBe('2025')
    expect(wrapper.html()).toContain('Dato')

    await openPopover(wrapper)
    expectSharedCalendarGrid(wrapper)
  })

  it('renders empty segments with a null model', async () => {
    const wrapper = await mountPicker(null)
    expect(findDateSegments(wrapper, 'day').length).toBe(1)
    expect(wrapper.text()).not.toContain('2025')
  })

  it('renders custom label', async () => {
    const wrapper = await mountPicker(JAN_1, { label: 'Udflytningsdato' })
    expect(wrapper.html()).toContain('Udflytningsdato')
  })

  it('typing digits in the segments updates the model', async () => {
    const wrapper = await mountPicker(JAN_1)
    await typeIntoSegment(findDateSegments(wrapper, 'day')[0]!, ['1', '5'])
    await typeIntoSegment(findDateSegments(wrapper, 'month')[0]!, ['0', '6'])
    await typeIntoSegment(findDateSegments(wrapper, 'year')[0]!, ['2', '0', '2', '5'])

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(calendarDay(emitted!.at(-1)![0] as Date)).toBe('2025-06-15')
  })

  it('updateDate rejects an invalid Date and reports errors', async () => {
    const wrapper = await mountPicker(JAN_1)
    const vm = wrapper.vm as unknown as PickerVm
    expect(vm.updateDate(new Date(Number.NaN))).toBe(false)
    expect(vm.errors.size).toBeGreaterThan(0)
  })

  it('updateDate clears the model to null', async () => {
    const wrapper = await mountPicker(JAN_1)
    const vm = wrapper.vm as unknown as PickerVm
    expect(vm.updateDate(null)).toBe(true)
    expect(vm.errors.size).toBe(0)
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toBeNull()
  })
})
