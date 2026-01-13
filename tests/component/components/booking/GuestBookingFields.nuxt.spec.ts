// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {flushPromises} from '@vue/test-utils'
import GuestBookingFields from '~/components/booking/GuestBookingFields.vue'
import {TicketFactory} from '../../../e2e/testDataFactories/ticketFactory'
import {useTicketPriceValidation} from '~/composables/useTicketPriceValidation'

const ticketPrices = TicketFactory.defaultTicketPrices()
const {TicketTypeSchema} = useTicketPriceValidation()
const adultPrice = ticketPrices.find(p => p.ticketType === TicketTypeSchema.enum.ADULT)!
const allergyOptions = [{label: 'Gluten', value: 1}, {label: 'Lactose', value: 2}]

const mount = (props = {}) => mountSuspended(GuestBookingFields, {
  props: {ticketPrices, ...props}
})

describe('GuestBookingFields', () => {
  const fields = [
    {name: 'guest-count', selector: 'input[name="guest-count"]'},
    {name: 'ticket-type', selector: '[data-testid="guest-ticket-type-select"]'}
  ]

  it.each(fields)('renders $name field', async ({selector}) => {
    const wrapper = await mount()
    expect(wrapper.find(selector).exists()).toBe(true)
  })

  const allergyCases = [
    {options: [], visible: false},
    {options: allergyOptions, visible: true}
  ]

  it.each(allergyCases)('allergy select visible=$visible when options=$options.length', async ({options, visible}) => {
    const wrapper = await mount({allergyOptions: options})
    expect(wrapper.find('[data-testid="guest-allergies"]').exists()).toBe(visible)
  })

  it('defaults to adult ticket and count=1', async () => {
    const wrapper = await mount()
    await flushPromises()
    expect(wrapper.emitted('update:ticketPriceId')?.[0]).toEqual([adultPrice?.id])
    const input = wrapper.find('input[name="guest-count"]').element as HTMLInputElement
    expect(input.value).toBe('1')
  })

  it('emits guestCount on change', async () => {
    const wrapper = await mount()
    await wrapper.find('input[name="guest-count"]').setValue(3)
    expect(wrapper.emitted('update:guestCount')).toBeTruthy()
  })
})
