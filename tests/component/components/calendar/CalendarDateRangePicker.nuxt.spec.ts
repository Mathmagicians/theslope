// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import CalendarDateRangePicker from '~/components/calendar/CalendarDateRangePicker.vue'
import { nextTick, ref } from 'vue'

const JAN_1 = new Date(2025, 0, 1)
const JAN_5 = new Date(2025, 0, 5)
const JAN_10 = new Date(2025, 0, 10)

type PickerVm = {
  errors: Map<string, string[]>
  updateDateRange: (range: { start: Date; end: Date }) => boolean
}

const mountPicker = async (modelValue: { start: Date; end: Date }) =>
  await mountSuspended(CalendarDateRangePicker, {
    props: { modelValue },
    global: { provide: { isMd: ref(true) } }
  })

describe('CalendarDateRangePicker', () => {

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

  it('rejects end before start', async () => {
    const wrapper = await mountPicker({ start: JAN_5, end: JAN_10 })
    const vm = wrapper.vm as unknown as PickerVm
    expect(vm.updateDateRange({ start: JAN_5, end: JAN_1 })).toBe(false)
    await nextTick()
    const allErrors = Array.from(vm.errors.values()).flat()
    expect(allErrors.some((msg: string) => msg.includes('Tidsmaskinen'))).toBe(true)
  })
})
