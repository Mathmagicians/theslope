// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, beforeAll} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {findByTestId, clickByTestId, withTooltipProvider} from '~~/tests/component/testHelpers'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import DinnerTicket from '~/components/dinner/DinnerTicket.vue'
import type {DinnerMode, OrderDisplay} from '~/composables/useBookingValidation'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

// Mock stores
const mockHouseholdsStore = {
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
// @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not at module level
let baseDeadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
beforeAll(() => {
  const {deadlinesForSeason} = useSeason()
  baseDeadlines = deadlinesForSeason(SeasonFactory.defaultSeasonData)
})
const baseProps = {
  dinnerEvent: DinnerEventFactory.defaultDinnerEventDisplay(),
  ticketPrices: TicketFactory.defaultTicketPrices(),
  // Getter: baseDeadlines is assigned in beforeAll, read when a test mounts with baseProps
  get deadlines() { return baseDeadlines }
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

  describe('guest orders', () => {
    const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const adultPrice = baseProps.ticketPrices.find(tp => tp.ticketType === TicketTypeSchema.enum.ADULT)!
    const booker = householdWithInhabitants.inhabitants[0]!
    const dinnerEventId = baseProps.dinnerEvent.id
    const adultOrder = (id: number, inhabitantId: number, dinnerMode: DinnerMode, isGuestTicket: boolean) => OrderFactory.defaultOrder('guest', {
      id,
      inhabitantId,
      dinnerEventId,
      ticketPriceId: adultPrice.id,
      ticketType: adultPrice.ticketType,
      priceAtBooking: adultPrice.price,
      dinnerMode,
      isGuestTicket
    })
    const guestOrders = [101, 102].map(id => adultOrder(id, booker.id, DinnerMode.DINEIN, true))
    const familyOrders = (dinnerMode: DinnerMode) =>
      householdWithInhabitants.inhabitants.map((inhabitant, i) => adultOrder(201 + i, inhabitant.id, dinnerMode, false))
    const expectedGuestOrders = (dinnerMode: DinnerMode) => guestOrders.map(order => ({
      inhabitantId: booker.id,
      dinnerEventId,
      dinnerMode,
      ticketPriceId: adultPrice.id,
      isGuestTicket: true,
      orderId: order.id,
      state: OrderStateSchema.enum.BOOKED
    }))

    const mountMember = (orders: OrderDisplay[]) => {
      mockIsHouseholdMember.mockReturnValue(true)
      const deadlines = {...baseDeadlines, canModifyOrders: () => true, canEditDiningMode: () => true}
      return mountSuspended(withTooltipProvider(DinnerBookingForm, {...baseProps, household: householdWithInhabitants, orders, deadlines}))
    }

    const saveRow = async (wrapper: Awaited<ReturnType<typeof mountMember>>, rowId: string, dinnerMode: DinnerMode) => {
      await clickByTestId(wrapper, `${rowId}-toggle`)
      await clickByTestId(wrapper, `${rowId}-mode-edit-${dinnerMode}`)
      await clickByTestId(wrapper, `${rowId}-save`)
      return wrapper.findComponent(DinnerBookingForm).emitted('saveBookings')
    }

    it.each([DinnerMode.DINEINLATE, DinnerMode.TAKEAWAY, DinnerMode.NONE])(
      'GIVEN a guest group of two WHEN mode changes to %s and saves THEN emits one DesiredOrder per guest order',
      async (newMode) => {
        const wrapper = await mountMember(guestOrders)
        const {groupGuestOrders} = useBooking()
        const rowId = `guest-order-guest-group-${Object.keys(groupGuestOrders(guestOrders))[0]}`

        expect(await saveRow(wrapper, rowId, newMode)).toEqual([[expectedGuestOrders(newMode)]])
      }
    )

    describe('power mode', () => {
      const powerConsensus = (wrapper: Awaited<ReturnType<typeof mountMember>>) =>
        wrapper.findAllComponents(DinnerTicket).find(c => c.props('consensus') !== undefined)!.props('consensus')

      it.each([
        {guestMode: DinnerMode.DINEIN, consensus: true},
        {guestMode: DinnerMode.TAKEAWAY, consensus: false}
      ])('GIVEN a DINEIN family and a $guestMode guest THEN the power row has consensus $consensus', async ({guestMode, consensus}) => {
        const guests = guestOrders.map(order => ({...order, dinnerMode: guestMode}))
        const wrapper = await mountMember([...familyOrders(DinnerMode.DINEIN), ...guests])
        expect(powerConsensus(wrapper)).toBe(consensus)
      })

      it('GIVEN a family and a guest group WHEN power sets TAKEAWAY and saves THEN emits the family\'s and one DesiredOrder per guest order', async () => {
        const family = familyOrders(DinnerMode.DINEIN)
        const wrapper = await mountMember([...family, ...guestOrders])

        expect(await saveRow(wrapper, 'power-power-mode', DinnerMode.TAKEAWAY)).toEqual([[[
          ...family.map(order => ({
            inhabitantId: order.inhabitantId,
            dinnerEventId,
            dinnerMode: DinnerMode.TAKEAWAY,
            ticketPriceId: adultPrice.id,
            isGuestTicket: false,
            orderId: order.id,
            state: OrderStateSchema.enum.BOOKED
          })),
          ...expectedGuestOrders(DinnerMode.TAKEAWAY)
        ]]])
      })
    })
  })
})
