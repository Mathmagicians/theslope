// @vitest-environment nuxt
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { enableAutoUnmount } from '@vue/test-utils'
import CalendarDatePicker from '~/components/calendar/CalendarDatePicker.vue'
import { ref } from 'vue'
import { openPopover, expectSharedCalendarGrid, findDateSegments, dateSegment, typeIntoSegment, calendarDay, resetStores, emittedPayload } from '~~/tests/component/testHelpers'
import { dateSchema } from '~/composables/useDateRangeValidation'
import { DATE_WORDS } from '~/config/dateWords'

const JAN_1 = new Date(2025, 0, 1)

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
    expect(dateSegment(wrapper, 'day').attributes('aria-valuenow')).toBe('1')
    expect(dateSegment(wrapper, 'year').attributes('aria-valuenow')).toBe('2025')
    expect(wrapper.html()).toContain(DATE_WORDS.picker.date)

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
    await typeIntoSegment(dateSegment(wrapper, 'day'), ['1', '5'])
    await typeIntoSegment(dateSegment(wrapper, 'month'), ['0', '6'])
    await typeIntoSegment(dateSegment(wrapper, 'year'), ['2', '0', '2', '5'])

    expect(calendarDay(emittedPayload(wrapper, 'update:modelValue', dateSchema))).toBe('2025-06-15')
  })

  it('clearing a typed segment clears the model to null', async () => {
    const wrapper = await mountPicker(JAN_1)
    await typeIntoSegment(dateSegment(wrapper, 'day'), ['Backspace'])

    expect(emittedPayload(wrapper, 'update:modelValue', dateSchema.nullable())).toBeNull()
  })
})
