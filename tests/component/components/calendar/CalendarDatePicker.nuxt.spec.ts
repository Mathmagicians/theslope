// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import CalendarDatePicker from '~/components/calendar/CalendarDatePicker.vue'
import { nextTick, ref } from 'vue'

const JAN_1 = new Date(2025, 0, 1)

type PickerVm = {
  errors: Map<string, string[]>
  updateDate: (date: Date | null) => boolean
}

const mountPicker = async (modelValue: Date | null, extraProps: Record<string, unknown> = {}) =>
  await mountSuspended(CalendarDatePicker, {
    props: { modelValue, ...extraProps },
    global: { provide: { isMd: ref(true) } }
  })

describe('CalendarDatePicker', () => {

  describe.each([
    { name: 'with Date model', model: JAN_1, expectedValue: '01/01/2025' },
    { name: 'with null model', model: null, expectedValue: '' }
  ])('$name', ({ model, expectedValue }) => {
    it(`renders input with value "${expectedValue}"`, async () => {
      const wrapper = await mountPicker(model)
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBe(1)
      expect(inputs[0]!.element.value).toBe(expectedValue)
    })
  })

  it('renders custom label', async () => {
    const wrapper = await mountPicker(JAN_1, { label: 'Udflytningsdato' })
    expect(wrapper.html()).toContain('Udflytningsdato')
  })

  it('renders default label', async () => {
    const wrapper = await mountPicker(JAN_1)
    expect(wrapper.html()).toContain('Dato')
  })

  it('shows error for invalid date format', async () => {
    const wrapper = await mountPicker(JAN_1)
    await wrapper.find('input').setValue('31-01-2025')
    await nextTick()
    await nextTick()
    const vm = wrapper.vm as unknown as PickerVm
    expect(vm.errors.size).toBeGreaterThan(0)
  })

  it('accepts valid date input and updates model', async () => {
    const wrapper = await mountPicker(JAN_1)
    const input = wrapper.find('input')
    await input.setValue('15/06/2025')
    await nextTick()
    const vm = wrapper.vm as unknown as PickerVm
    expect(vm.errors.size).toBe(0)
    expect(input.element.value).toBe('15/06/2025')
  })

  it('clears to null on empty string input', async () => {
    const wrapper = await mountPicker(JAN_1)
    const input = wrapper.find('input')
    await input.setValue('')
    await nextTick()
    const vm = wrapper.vm as unknown as PickerVm
    expect(vm.errors.size).toBe(0)
    expect(input.element.value).toBe('')
  })
})
