// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {findByTestId, withTooltipProvider} from '~~/tests/component/testHelpers'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

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

// Mock auth store - control isMemberOfHousehold behavior (session predicate lives on the store, ADR-017)
const mockIsHouseholdMember = vi.fn(() => false)
mockNuxtImport('useAuthStore', () => () => ({
  user: null,
  isAdmin: false,
  inhabitantId: null,
  isMemberOfHousehold: mockIsHouseholdMember
}))

// Test fixtures - use real deadlinesForSeason() to stay in sync with SeasonDeadlines interface
const {deadlinesForSeason} = useSeason()
const baseDeadlines = deadlinesForSeason(SeasonFactory.defaultSeasonData)
const baseProps = {
  dinnerEvent: DinnerEventFactory.defaultDinnerEventDisplay(),
  ticketPrices: TicketFactory.defaultTicketPrices(),
  deadlines: baseDeadlines
}
const householdWithInhabitants = HouseholdFactory.defaultHouseholdDetail('test')

describe('DinnerBookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHouseholdsStore.selectedHousehold = null
    mockIsHouseholdMember.mockReturnValue(false)
  })

  it('renders empty state when no household', async () => {
    const wrapper = await mountSuspended(DinnerBookingForm, {props: baseProps})
    expect(wrapper.text()).toContain('Ingen husstandsmedlemmer')
  })

  it('initializes household store on mount', async () => {
    await mountSuspended(DinnerBookingForm, {props: baseProps})
    expect(mockHouseholdsStore.initHouseholdsStore).toHaveBeenCalled()
  })

  describe('edit permission (canEditAdminOverride + isMemberOfHousehold)', () => {
    const editPermissionCases = [
      {isMember: false, adminOverride: undefined, expectEdit: false, desc: 'no override, not member'},
      {isMember: true, adminOverride: undefined, expectEdit: true, desc: 'no override, is member'},
      {isMember: false, adminOverride: () => true, expectEdit: true, desc: 'admin override true'},
      {isMember: true, adminOverride: () => false, expectEdit: false, desc: 'admin override false (explicit deny)'},
    ] as const

    it.each(editPermissionCases)('GIVEN $desc THEN edit=$expectEdit', async ({isMember, adminOverride, expectEdit}) => {
      mockIsHouseholdMember.mockReturnValue(isMember)
      const props = {...baseProps, household: householdWithInhabitants, canEditAdminOverride: adminOverride}
      const wrapper = await mountSuspended(withTooltipProvider(DinnerBookingForm, props))
      expect(findByTestId(wrapper, 'power-power-mode-toggle').exists()).toBe(expectEdit)
    })
  })

  describe('deadline overrides via deadlines prop', () => {
    const deadlineCases = [
      {canModify: true, expectedText: 'Åben', desc: 'booking open'},
      {canModify: false, expectedText: 'Lukket', desc: 'booking closed'},
    ]

    it.each(deadlineCases)('GIVEN canModifyOrders=$canModify THEN shows $desc', async ({canModify, expectedText}) => {
      mockIsHouseholdMember.mockReturnValue(true)
      const deadlines = {...baseDeadlines, canModifyOrders: () => canModify}
      const props = {...baseProps, household: householdWithInhabitants, deadlines}
      const wrapper = await mountSuspended(withTooltipProvider(DinnerBookingForm, props))
      expect(wrapper.text()).toContain(expectedText)
    })
  })
})
