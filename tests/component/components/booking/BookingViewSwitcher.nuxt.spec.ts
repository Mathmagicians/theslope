// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import type {ButtonProps} from '@nuxt/ui'
import {findByTestId, findComponentByTestId, resetStores} from '~~/tests/component/testHelpers'
import {nextTick} from 'vue'
import BookingViewSwitcher from '~/components/booking/BookingViewSwitcher.vue'
import {BookingViewSchema, type BookingView} from '~/composables/useBookingView'
import {DATE_WORDS} from '~/config/dateWords'
import {NOISE, COMPONENTS} from '~/composables/useTheSlopeDesignSystem'

enableAutoUnmount(afterEach)

const {day, week, month} = BookingViewSchema.enum
const views = BookingViewSchema.options
const labels = DATE_WORDS.periodViews

const mount = (modelValue: BookingView = day) =>
  mountSuspended(BookingViewSwitcher, {props: {modelValue}})

type Wrapper = Awaited<ReturnType<typeof mount>>

const btn = (wrapper: Wrapper, view: BookingView) =>
  findByTestId(wrapper, `booking-view-${view}`)

const buttonOf = (wrapper: Wrapper, view: BookingView) =>
  findComponentByTestId<ButtonProps>(wrapper, 'UButton', `booking-view-${view}`)

describe('BookingViewSwitcher', () => {
  beforeEach(() => {
    resetStores()
  })

  it('renders one button per view with its label', async () => {
    const wrapper = await mount()
    views.forEach(view => expect(btn(wrapper, view).text(), view).toContain(labels[view]))
  })

  // One template renders every button, so one click and one selection prove the wiring
  it('emits the clicked view', async () => {
    const wrapper = await mount(day)
    await btn(wrapper, month).trigger('click')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([month])
  })

  it('marks the selected button active and the others not', async () => {
    const wrapper = await mount(week)
    views.forEach(view => expect(buttonOf(wrapper, view).props('active'), view).toBe(view === week))
  })

  it('makes the selected view loud and the others medium, each view\'s word on the switcher\'s label token', async () => {
    const wrapper = await mount(week)
    views.forEach(view => {
      expect(buttonOf(wrapper, view).props('variant'), view).toBe(view === week ? NOISE.loud : NOISE.medium)
      const label = btn(wrapper, view).findAll('span').find(span => span.text() === labels[view])
      expect(label?.classes(), view).toEqual(COMPONENTS.bookingViewSwitcher.label.split(' '))
    })
  })
})
