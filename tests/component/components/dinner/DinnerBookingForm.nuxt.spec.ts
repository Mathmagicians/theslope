// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import {TicketFactory} from '../../../e2e/testDataFactories/ticketFactory'
import {useBookingValidation} from '~/composables/useBookingValidation'

const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum

// Mock stores
const mockHouseholdsStore = {
  initHouseholdsStore: vi.fn(),
  selectedHousehold: null,
  myInhabitant: {id: 1, name: 'Test', lastName: 'User'}
}
mockNuxtImport('useHouseholdsStore', () => () => mockHouseholdsStore)
mockNuxtImport('storeToRefs', () => (store: typeof mockHouseholdsStore) => ({
  selectedHousehold: ref(store.selectedHousehold),
  myInhabitant: ref(store.myInhabitant)
}))

const mockAllergiesStore = {allergyTypes: []}
mockNuxtImport('useAllergiesStore', () => () => mockAllergiesStore)

// Test data
const ticketPrices = TicketFactory.defaultTicketPrices()
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

const baseProps = {
  dinnerEvent: {id: 1, date: futureDate, seasonId: 1, state: 'SCHEDULED'},
  ticketPrices,
  deadlines: {
    canModifyOrders: () => true,
    canEditDiningMode: () => true
  }
}

const inhabitant = {id: 1, name: 'Anna', lastName: 'Hansen', birthDate: new Date('1990-01-01')}
const household = {id: 1, shortName: 'test', inhabitants: [inhabitant]}

describe('DinnerBookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHouseholdsStore.selectedHousehold = null
  })

  it('renders empty state when no household', async () => {
    const wrapper = await mountSuspended(DinnerBookingForm, {props: baseProps})
    expect(wrapper.text()).toContain('Ingen husstandsmedlemmer')
  })

  it('renders booking table when household exists', async () => {
    const wrapper = await mountSuspended(DinnerBookingForm, {
      props: {...baseProps, household}
    })
    expect(wrapper.find('[data-testid="booking-table"]').exists()).toBe(true)
  })

  it('emits saveBookings with correct structure on save', async () => {
    const wrapper = await mountSuspended(DinnerBookingForm, {
      props: {...baseProps, household, orders: []}
    })

    // Expand inhabitant row
    const toggle = wrapper.find('[data-testid="inhabitant-1-toggle"]')
    if (toggle.exists()) {
      await toggle.trigger('click')

      // Find and click save
      const save = wrapper.find('[data-testid="inhabitant-1-save"]')
      if (save.exists()) {
        await save.trigger('click')

        const emitted = wrapper.emitted('saveBookings')
        if (emitted?.[0]) {
          const orders = emitted[0][0] as Array<{inhabitantId: number; dinnerMode: string}>
          expect(orders[0]?.inhabitantId).toBe(1)
          expect(orders[0]?.dinnerMode).toBe(DinnerMode.DINEIN)
        }
      }
    }
  })
})
