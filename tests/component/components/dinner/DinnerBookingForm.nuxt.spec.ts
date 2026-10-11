// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, beforeAll} from 'vitest'
import {mountSuspended, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {findByTestId, clickByTestId, withTooltipProvider, VIEWPORTS} from '~~/tests/component/testHelpers'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import DinnerTicket from '~/components/dinner/DinnerTicket.vue'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import type {DinnerMode, OrderDisplay} from '~/composables/useBookingValidation'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {COMPONENTS, ICONS, createTableColumns} from '~/composables/useTheSlopeDesignSystem'

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

    it('GIVEN a guest order THEN its name cell leads with the user-plus disc of the add-guest row and the "Gæst af" label on the guestOf tokens', async () => {
      const wrapper = await mountMember(guestOrders)

      const label = wrapper.findAll('span').find(span => span.text() === 'Gæst af')!
      const row = label.element.parentElement!
      expect(label.classes()).toEqual(expect.arrayContaining(COMPONENTS.bookingForm.guestOfLabel.split(' ')))
      expect([...row.classList]).toEqual(expect.arrayContaining(COMPONENTS.bookingForm.guestOf.split(' ')))
      const disc = wrapper.findAllComponents({name: 'UAvatar'}).find(avatar => row.contains(avatar.element) && avatar.props('icon') === ICONS.userPlus)
      expect(disc).toBeDefined()
      expect(disc!.props('size')).toBe(COMPONENTS.avatar.compact.size)
      expect(disc!.classes()).toEqual(expect.arrayContaining(COMPONENTS.avatar.compact.fit.split(' ')))
    })

    it('GIVEN a claimed guest order THEN "fra X" sits in the guestProvenance row under the label', async () => {
      const wrapper = await mountMember(guestOrders.map(order => ({...order, provenanceHousehold: 'Hansen'})))

      // The name cell's provenance badge; the ticket's own "fra" line is plain text
      const badge = wrapper.findAllComponents({name: 'UBadge'}).find(candidate => candidate.text().includes('fra Hansen'))
      expect(badge).toBeDefined()
      expect([...badge!.element.parentElement!.classList]).toEqual(expect.arrayContaining(COMPONENTS.bookingForm.guestProvenance.split(' ')))
    })

    describe('ticket allergies', () => {
      const [allergic, notAllergic] = householdWithInhabitants.inhabitants
      const allergyTypes = AllergyFactory.createMockAllergyTypes()
      const householdWithAllergies = {
        ...householdWithInhabitants,
        inhabitants: householdWithInhabitants.inhabitants.map(inhabitant => ({
          ...inhabitant,
          allergies: inhabitant.id === allergic!.id ? AllergyFactory.serializedAllergies(allergyTypes.length, inhabitant.id) : []
        }))
      }

      const mountBooked = () => {
        mockIsHouseholdMember.mockReturnValue(true)
        const deadlines = {...baseDeadlines, canModifyOrders: () => true, canEditDiningMode: () => true}
        const orders = [...familyOrders(DinnerMode.DINEIN), ...guestOrders]
        return mountSuspended(withTooltipProvider(DinnerBookingForm, {...baseProps, household: householdWithAllergies, orders, deadlines}))
      }

      const ticketAllergies = (wrapper: Awaited<ReturnType<typeof mountBooked>>) =>
        wrapper.findAllComponents(DinnerTicket).map(ticket => ticket.props('allergies') as {name: string}[] | undefined)

      it('GIVEN a booked inhabitant with allergies THEN the ticket carries the allergy types and no row names them', async () => {
        const wrapper = await mountBooked()

        expect(ticketAllergies(wrapper)).toContainEqual(allergyTypes)
        allergyTypes.forEach(type => expect(findByTestId(wrapper, 'booking-table').text()).not.toContain(type.name))
      })

      it('GIVEN a booked inhabitant with allergies WHEN the row expands THEN the line shows one AllergyTypeDisplay per allergy', async () => {
        const wrapper = await mountBooked()
        await clickByTestId(wrapper, `inhabitant-${allergic!.id}-toggle`)

        const line = findByTestId(wrapper, `inhabitant-${allergic!.id}-allergies`)
        expect(line.exists()).toBe(true)
        const displays = wrapper.findAllComponents(AllergyTypeDisplay).filter(display => line.element.contains(display.element))
        expect(displays.map(display => display.props('allergyType'))).toEqual(allergyTypes)
        displays.forEach(display => expect(display.props()).toMatchObject({compact: true, showName: true}))
      })

      it('GIVEN a booked inhabitant without allergies WHEN the row expands THEN no allergy line shows', async () => {
        const wrapper = await mountBooked()
        await clickByTestId(wrapper, `inhabitant-${notAllergic!.id}-toggle`)

        expect(findByTestId(wrapper, `inhabitant-${notAllergic!.id}-allergies`).exists()).toBe(false)
        expect(wrapper.findAllComponents(AllergyTypeDisplay)).toHaveLength(0)
      })

      it('GIVEN guest tickets THEN their ticket carries no allergy types', async () => {
        const wrapper = await mountBooked()

        const guestTickets = wrapper.findAllComponents(DinnerTicket).filter(ticket => ticket.props('guestCount') !== undefined)
        expect(guestTickets.length).toBeGreaterThan(0)
        guestTickets.forEach(ticket => expect(ticket.props('allergies')).toEqual([]))
      })
    })

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

  describe('name column header', () => {
    it.each(VIEWPORTS)('$viewport: the name column carries the header of its viewport', async ({isMd}) => {
      const props = {...baseProps, household: householdWithInhabitants}
      const wrapper = await mountSuspended(withTooltipProvider(DinnerBookingForm, props), {global: {provide: {isMd: ref(isMd)}}})
      const headers = wrapper.findAll('thead th').map(th => th.text())
      expect(headers).toContain(createTableColumns(ref(isMd)).bookingFormName.header)
    })

    it.each(VIEWPORTS)('$viewport: the ticket column renders its header and cells from md through its column meta', async ({isMd}) => {
      const props = {...baseProps, household: householdWithInhabitants}
      const wrapper = await mountSuspended(withTooltipProvider(DinnerBookingForm, props), {global: {provide: {isMd: ref(isMd)}}})
      const {meta} = createTableColumns(ref(isMd)).bookingFormTicket
      const columns = wrapper.findComponent({name: 'UTable'}).props('columns') as Array<{id: string}>
      const ticketIndex = columns.findIndex(column => column.id === 'ticket')
      expect(wrapper.findAll('thead th')[ticketIndex]!.classes()).toEqual(expect.arrayContaining(meta.class.th.split(' ')))
      expect(wrapper.findAll('tbody tr')[0]!.findAll('td')[ticketIndex]!.classes()).toEqual(expect.arrayContaining(meta.class.td.split(' ')))
    })
  })
})
