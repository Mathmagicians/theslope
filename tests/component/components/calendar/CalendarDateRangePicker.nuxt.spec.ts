// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import CalendarDateRangePicker from '~/components/calendar/CalendarDateRangePicker.vue'
import { nextTick, ref } from 'vue'
import { nullableEndDateRangeSchema } from '~/composables/useDateRangeValidation'
import type { DateRange, NullableDateRange } from '~/types/dateTypes'

const JAN_1 = new Date(2025, 0, 1)
const JAN_5 = new Date(2025, 0, 5)
const JAN_10 = new Date(2025, 0, 10)
const TWO_YEARS_LATER = new Date(2027, 0, 1)

type PickerVm = {
  errors: Map<string, string[]>
  updateDateRange: (range: DateRange | NullableDateRange) => boolean
}

const pickerVariants = [
  {
    name: 'CalendarDateRangePicker<DateRange>',
    defaultModel: { start: JAN_1, end: JAN_5 } as DateRange,
    props: {}
  },
  {
    name: 'CalendarDateRangePicker<NullableDateRange>',
    defaultModel: { start: JAN_1, end: null } as NullableDateRange,
    props: { schema: nullableEndDateRangeSchema, labels: { start: 'Indflyttet', end: 'Udflytningsdato' } }
  }
]

const mountPicker = async (modelValue: DateRange | NullableDateRange, extraProps: Record<string, unknown> = {}) =>
  await mountSuspended(CalendarDateRangePicker, {
    props: { modelValue, ...extraProps },
    global: { provide: { isMd: ref(true) } }
  })

describe('CalendarDateRangePicker', () => {

  describe.each(pickerVariants)('$name', ({ defaultModel, props }) => {

    it('renders start input with formatted date', async () => {
      const wrapper = await mountPicker(defaultModel, props)
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBe(2)
      expect(inputs[0]!.element.value).toBe('01/01/2025')
    })

    it('updates start input while preserving end', async () => {
      // Both variants need non-null end for this test
      const model = { start: JAN_1, end: JAN_5 }
      const wrapper = await mountPicker(model, props)
      const inputs = wrapper.findAll('input')
      await inputs[0]!.setValue('10/01/2025')
      await nextTick()
      expect(inputs[0]!.element.value).toBe('10/01/2025')
      expect(inputs[1]!.element.value).toBe('05/01/2025')
    })

    it('shows error for invalid date format', async () => {
      const wrapper = await mountPicker(defaultModel, props)
      const inputs = wrapper.findAll('input')
      await inputs[0]!.setValue('31-01-2025')
      await nextTick()
      await nextTick()
      expect((wrapper.vm as unknown as PickerVm).errors.size).toBeGreaterThan(0)
    })

    it('rejects end before start', async () => {
      const wrapper = await mountPicker({ start: JAN_5, end: JAN_10 }, props)
      const vm = wrapper.vm as unknown as PickerVm
      expect(vm.updateDateRange({ start: JAN_5, end: JAN_1 })).toBe(false)
      await nextTick()
      const allErrors = Array.from(vm.errors.values()).flat()
      expect(allErrors.some((msg: string) => msg.includes('Tidsmaskinen'))).toBe(true)
    })
  })

  describe('CalendarDateRangePicker<DateRange> - maxOneYear', () => {
    it('rejects range longer than one year', async () => {
      const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 })
      const vm = wrapper.vm as unknown as PickerVm
      expect(vm.updateDateRange({ start: JAN_1, end: TWO_YEARS_LATER })).toBe(false)
      await nextTick()
      const allErrors = Array.from(vm.errors.values()).flat()
      expect(allErrors.some((msg: string) => msg.toLowerCase().includes('max et år'))).toBe(true)
    })
  })

  describe('CalendarDateRangePicker<NullableDateRange> - nullable end', () => {
    const nullableProps = { schema: nullableEndDateRangeSchema, labels: { start: 'Indflyttet', end: 'Udflytningsdato' } }

    it('renders null end as empty input', async () => {
      const wrapper = await mountPicker({ start: JAN_1, end: null }, nullableProps)
      const inputs = wrapper.findAll('input')
      expect(inputs[0]!.element.value).toBe('01/01/2025')
      expect(inputs[1]!.element.value).toBe('')
    })

    it('renders custom labels', async () => {
      const wrapper = await mountPicker({ start: JAN_1, end: null }, nullableProps)
      const html = wrapper.html()
      expect(html).toContain('Indflyttet')
      expect(html).toContain('Udflytningsdato')
    })

    it('accepts null end date', async () => {
      const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 }, nullableProps)
      const vm = wrapper.vm as unknown as PickerVm
      expect(vm.updateDateRange({ start: JAN_1, end: null })).toBe(true)
      expect(vm.errors.size).toBe(0)
    })

    it('accepts range longer than one year (no maxOneYear)', async () => {
      const wrapper = await mountPicker({ start: JAN_1, end: JAN_5 }, nullableProps)
      const vm = wrapper.vm as unknown as PickerVm
      expect(vm.updateDateRange({ start: JAN_1, end: TWO_YEARS_LATER })).toBe(true)
      expect(vm.errors.size).toBe(0)
    })
  })
})
