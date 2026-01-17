// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {nextTick} from 'vue'
import BookingViewSwitcher from '~/components/booking/BookingViewSwitcher.vue'
import {BookingViewSchema, type BookingView} from '~/composables/useBookingView'

const views = BookingViewSchema.options
const labels: Record<BookingView, string> = {day: 'Dag', week: 'Uge', month: 'Måned'}

const mount = (modelValue: BookingView = 'day') =>
  mountSuspended(BookingViewSwitcher, {props: {modelValue}})

const btn = (wrapper: Awaited<ReturnType<typeof mount>>, view: BookingView) =>
  wrapper.find(`[data-testid="booking-view-${view}"]`)

describe('BookingViewSwitcher', () => {
  it.each(views)('renders %s button with label', async (view) => {
    const wrapper = await mount()
    expect(btn(wrapper, view).text()).toContain(labels[view])
  })

  const clickCases: {initial: BookingView, click: BookingView}[] = [
    {initial: 'day', click: 'week'},
    {initial: 'day', click: 'month'},
    {initial: 'week', click: 'day'},
    {initial: 'month', click: 'week'}
  ]

  it.each(clickCases)('emits $click when clicking from $initial', async ({initial, click}) => {
    const wrapper = await mount(initial)
    await btn(wrapper, click).trigger('click')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([click])
  })

  it.each(views)('uses solid variant for selected %s', async (view) => {
    const wrapper = await mount(view)
    const classes = btn(wrapper, view).classes()
    // Active button gets solid variant styling from UButton
    expect(classes.some(c => c.includes('bg-') || c.includes('ring-'))).toBe(true)
  })
})
