// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'

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
mockNuxtImport('useAllergiesStore', () => () => ({allergyTypes: []}))

const baseProps = {
  dinnerEvent: {id: 1, date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), seasonId: 1, state: 'SCHEDULED'},
  ticketPrices: TicketFactory.defaultTicketPrices(),
  deadlines: {canModifyOrders: () => true, canEditDiningMode: () => true}
}

describe('DinnerBookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHouseholdsStore.selectedHousehold = null
  })

  it('renders empty state when no household', async () => {
    const wrapper = await mountSuspended(DinnerBookingForm, {props: baseProps})
    expect(wrapper.text()).toContain('Ingen husstandsmedlemmer')
  })

  it('initializes household store on mount', async () => {
    await mountSuspended(DinnerBookingForm, {props: baseProps})
    expect(mockHouseholdsStore.initHouseholdsStore).toHaveBeenCalled()
  })
})
