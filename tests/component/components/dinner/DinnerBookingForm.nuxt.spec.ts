// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, beforeAll} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount, flushPromises, type BaseWrapper} from '@vue/test-utils'
import {shallowReactive} from 'vue'
import {mountWithTooltipProvider, findByTestId,clickByTestId, resetStores, registerEmptyStoreEndpoints, registerScaffoldEndpoint, VIEWPORTS, lockedDinnerSupply, isTableLoading, untilTrue} from '~~/tests/component/testHelpers'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import DinnerTicket from '~/components/dinner/DinnerTicket.vue'
import UserListItem from '~/components/shared/UserListItem.vue'
import GuestBookingForm from '~/components/booking/GuestBookingForm.vue'
import ActionPreview from '~/components/booking/ActionPreview.vue'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {ACTION_WORDS, MODE_WORDS, SUPPLY_WORDS, bookingSaveLabel, guestSaveLabel, moreTicketsAlert, formatPreviewLines, previewSaveOutcome, guestTicketsLabel, ticketBadgeLabel, ticketTypePresentation} from '~/composables/useBookingUi'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {DINNER_MODE_ORDER, EMPTY_RELEASED_TICKET_COUNTS, formatPlace} from '~/composables/useBooking'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import type {BookingAction, BookingResult, DesiredOrder, DinnerMode, OrderDisplay} from '~/composables/useBookingValidation'
import type {HouseholdDetail, UserDetail} from '~/composables/useCoreValidation'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {COMPONENTS, ICONS, createTableColumns, getRibbonClasses, useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'
import {WAITLIST_TEST_IDS} from './waitlistTestIds'
import {subYears} from 'date-fns'
import {useBookingValidation as useActionValidation, OrderState, TicketState} from '~/composables/useBookingValidation'
const Action = useActionValidation().BookingActionSchema.enum

/**
 * DinnerBookingForm: real component tree and real stores (testing.md Rule 6); only HTTP and the session are faked.
 * The edit permission is the auth store's isMemberOfHousehold over the session user, so the spec logs a member of
 * the household or a stranger in.
 */
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

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
// The season's ticket price of a ticket type
const priceOf = TicketFactory.defaultPriceOf
const householdWithInhabitants = HouseholdFactory.defaultHouseholdDetail('test')
const strangerHousehold = HouseholdFactory.defaultHouseholdDetail('stranger')

/** A session user living in the household: the auth store's isMemberOfHousehold reads the inhabitant's householdId */
const userInHousehold = (salt: string, household: HouseholdDetail): UserDetail => {
  const base = UserFactory.defaultUserWithInhabitant(salt)
  const inhabitant = household.inhabitants[0]!
  return {
    ...base,
    Inhabitant: {
      ...base.Inhabitant!,
      id: inhabitant.id,
      householdId: household.id,
      household: {...base.Inhabitant!.household, id: household.id, pbsId: household.pbsId, shortName: household.shortName}
    }
  }
}
const member = userInHousehold('member', householdWithInhabitants)
const stranger = userInHousehold('stranger', strangerHousehold)

// Only HTTP is faked: the households store reads the session user's household once logged in
registerEmptyStoreEndpoints()
registerEndpoint('/api/admin/allergy-type', () => [])
registerEndpoint(`/api/admin/household/${householdWithInhabitants.id}`, () => householdWithInhabitants)
registerEndpoint(`/api/admin/household/${strangerHousehold.id}`, () => strangerHousehold)
// The previews and the expected bookings read the scaffold's dry run
const scaffold = registerScaffoldEndpoint()
// The previews of a save: the dry run's reads with orders
const previews = () => scaffold.sent.filter(({body}) => body.orders.length > 0)

const mountForm = (props: Record<string, unknown>, isMd?: boolean) => mountWithTooltipProvider(DinnerBookingForm, {props, isMd})

/** The props of a member of the household on a dinner open or closed for changes; the dining mode stays editable */
const memberFormProps = (canModify: boolean, props: Record<string, unknown> = {}): Record<string, unknown> => {
  session.user.value = member
  const deadlines = {...baseDeadlines, canModifyOrders: () => canModify, canEditDiningMode: () => true}
  return {...baseProps, household: householdWithInhabitants, deadlines, ...props}
}
const mountMemberForm = (canModify: boolean, props: Record<string, unknown> = {}) => mountForm(memberFormProps(canModify, props))

/** The mode selector of an expanded row, by the row's test id prefix (`inhabitant-<id>`, `power-power-mode`) */
const rowSelector = (wrapper: Awaited<ReturnType<typeof mountMemberForm>>, row: string) =>
  wrapper.findAllComponents({name: 'DinnerModeSelector'}).find(selector => selector.props('name') === `${row}-mode-edit`)!
/** The mode selector of an inhabitant's expanded row */
const editSelector = (wrapper: Awaited<ReturnType<typeof mountMemberForm>>, inhabitantId: number) => rowSelector(wrapper, `inhabitant-${inhabitantId}`)
/** The name cell of an inhabitant's row: the UserListItem naming that inhabitant alone */
const nameCellOf = (wrapper: Awaited<ReturnType<typeof mountMemberForm>>, inhabitantId: number) =>
  wrapper.findAllComponents(UserListItem).find(item => {
    const inhabitants = item.props('inhabitants')
    return !Array.isArray(inhabitants) && inhabitants.id === inhabitantId
  })!
// The tickets of an inhabitant's row, found by the row's name: on a phone under the name, from md in their own column
const ticketsOf = (wrapper: Awaited<ReturnType<typeof mountMemberForm>>, inhabitantId: number) => {
  const row = (nameCellOf(wrapper, inhabitantId).element as Element).closest('tr')!
  return wrapper.findAllComponents(DinnerTicket).filter(ticket => row.contains(ticket.element))
}

// The next test's resetStores drops the datasets a still-mounted form reads
enableAutoUnmount(afterEach)

beforeEach(() => {
  resetStores()
  session.user.value = null
  scaffold.reset()
})

describe('DinnerBookingForm', () => {
  it('renders empty state when no household', async () => {
    const wrapper = await mountForm(baseProps)
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
      session.user.value = isMember ? member : stranger
      const props = {...baseProps, household: householdWithInhabitants, canEditAdminOverride: adminOverride}
      const wrapper = await mountForm(props)
      expect(findByTestId(wrapper, 'power-power-mode-toggle').exists()).toBe(expectEdit)
    })
  })

  describe('deadline overrides via deadlines prop', () => {
    const deadlineCases = [
      {canModify: true, expectedText: 'Åben', desc: 'booking open'},
      {canModify: false, expectedText: 'Lukket', desc: 'booking closed'},
    ]

    it.each(deadlineCases)('GIVEN canModifyOrders=$canModify THEN shows $desc', async ({canModify, expectedText}) => {
      session.user.value = member
      const deadlines = {...baseDeadlines, canModifyOrders: () => canModify}
      const props = {...baseProps, household: householdWithInhabitants, deadlines}
      const wrapper = await mountForm(props)
      expect(wrapper.text()).toContain(expectedText)
    })
  })

  describe('guest orders', () => {
    const {DinnerModeSchema, OrderStateSchema, TicketTypeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const adultPrice = priceOf(TicketTypeSchema.enum.ADULT)
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

    const mountMember = (orders: OrderDisplay[]) => mountMemberForm(true, {orders})

    const saveRow = async (wrapper: Awaited<ReturnType<typeof mountMember>>, rowId: string, dinnerMode: DinnerMode) => {
      await clickByTestId(wrapper, `${rowId}-toggle`)
      await clickByTestId(wrapper, `${rowId}-mode-edit-${dinnerMode}`)
      await clickByTestId(wrapper, `${rowId}-save`)
      return wrapper.emitted('saveBookings')
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

    it('GIVEN a claimed guest order THEN its name cell leads with the user-plus disc, the "Gæst af" label and "fra X"', async () => {
      const wrapper = await mountMember(guestOrders.map(order => ({...order, provenanceHousehold: 'Hansen'})))

      const row = wrapper.findAll('span').find(span => span.text() === 'Gæst af')!.element.parentElement!
      expect(wrapper.findAllComponents({name: 'UAvatar'}).some(avatar => row.contains(avatar.element) && avatar.props('icon') === ICONS.userPlus)).toBe(true)
      // The name cell's provenance badge; the ticket's own "fra" line is plain text
      expect(wrapper.findAllComponents({name: 'UBadge'}).some(badge => badge.text().includes('fra Hansen'))).toBe(true)
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

      const familyAndGuests = [...familyOrders(DinnerMode.DINEIN), ...guestOrders]
      const mountBooked = (orders: OrderDisplay[] = familyAndGuests) =>
        mountMemberForm(true, {household: householdWithAllergies, orders})

      const ticketAllergies = (wrapper: Awaited<ReturnType<typeof mountBooked>>) =>
        wrapper.findAllComponents(DinnerTicket).map(ticket => ticket.props('allergies') as {name: string}[] | undefined)

      it('GIVEN a booked inhabitant with allergies THEN the ticket carries the allergy types and no row names them', async () => {
        const wrapper = await mountBooked()

        expect(ticketAllergies(wrapper)).toContainEqual(allergyTypes)
        allergyTypes.forEach(type => expect(findByTestId(wrapper, 'booking-table').text()).not.toContain(type.name))
      })

      // The allergies belong to the booked inhabitant: the expanded row names them, one AllergyTypeDisplay each
      it.each([
        {desc: 'a booked inhabitant with allergies', inhabitant: allergic!, orders: familyAndGuests, shown: allergyTypes},
        {desc: 'a booked inhabitant without allergies', inhabitant: notAllergic!, orders: familyAndGuests, shown: []},
        {desc: 'an inhabitant with allergies and no ticket', inhabitant: allergic!, orders: familyAndGuests.filter(order => order.inhabitantId !== allergic!.id || order.isGuestTicket), shown: []}
      ])('GIVEN $desc WHEN the row expands THEN the allergy line shows $shown.length allergies', async ({inhabitant, orders, shown}) => {
        const wrapper = await mountBooked(orders)
        await clickByTestId(wrapper, `inhabitant-${inhabitant.id}-toggle`)

        const line = findByTestId(wrapper, `inhabitant-${inhabitant.id}-allergies`)
        expect(line.exists()).toBe(shown.length > 0)
        const displays = wrapper.findAllComponents(AllergyTypeDisplay)
        expect(displays.map(display => display.props('allergyType'))).toEqual(shown)
        displays.forEach(display => {
          expect(line.element.contains(display.element)).toBe(true)
          expect(display.props()).toMatchObject({compact: true, showName: true})
        })
      })

      it('GIVEN guest tickets THEN their ticket carries no allergy types', async () => {
        const wrapper = await mountBooked()

        const guestTickets = wrapper.findAllComponents(DinnerTicket).filter(ticket => ticket.props('guestCount') !== undefined)
        expect(guestTickets.length).toBeGreaterThan(0)
        guestTickets.forEach(ticket => expect(ticket.props('allergies')).toEqual([]))
      })
    })

    describe('power mode', () => {
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
      const wrapper = await mountForm(props, isMd)
      const headers = wrapper.findAll('thead th').map(th => th.text())
      expect(headers).toContain(createTableColumns(ref(isMd)).bookingFormName.header)
    })
  })

  // The power row's faces set the name column's width: a household's faces past the power row's max fold into the count
  it('the power row\'s face group stops at the power row\'s max', async () => {
    const wrapper = await mountMemberForm(true)
    expect(wrapper.findAllComponents({name: 'UAvatarGroup'}).map(group => group.props('max'))).toEqual([COMPONENTS.avatar.powerRowMax])
  })

  // While the dinner's bookings reload, UTable runs its loading bar over the household's rows; the expected bookings'
  // read runs the same bar and lands at once here. The day bill and the household's notes count the orders: they wait
  // while the orders load
  describe('while the bookings of the dinner reload', () => {
    it.each([
      {loading: true, shown: false},
      {loading: false, shown: true}
    ])('GIVEN a closed dinner with a released ticket and a queue entry and loading=$loading THEN the table receives it and the household\'s rows stay, and the day bill and both household notes show: $shown', async ({loading, shown}) => {
      const [anna, bo] = householdWithInhabitants.inhabitants
      const dinnerEventId = baseProps.dinnerEvent.id
      const released = OrderFactory.defaultOrder('released', {inhabitantId: anna!.id, dinnerEventId, state: useBookingValidation().OrderStateSchema.enum.RELEASED})
      const entry = WaitlistFactory.defaultEntry({id: 41, inhabitantId: bo!.id, dinnerEventId})

      const wrapper = await mountMemberForm(false, {orders: [released], waitlistEntries: [entry], loading})

      await vi.waitFor(() => expect(isTableLoading(wrapper)).toBe(loading))
      expect(findByTestId(wrapper, 'power-power-mode-toggle').exists()).toBe(true)
      expect(wrapper.findAllComponents(DinnerTicket).length > 0).toBe(true)
      expect(findByTestId(wrapper, 'booking-day-bill').exists()).toBe(shown)
      expect(wrapper.text().includes(SUPPLY_WORDS.householdReleased(1).title)).toBe(shown)
      expect(findByTestId(wrapper, WAITLIST_TEST_IDS.householdQueued).exists()).toBe(shown)
    })
  })

  // A released ticket's row badges its order's state in the words, colour and icon of formatOrder (useBookingUi), a guest's as a person's
  it.each([
    {ticket: 'Anna\'s ticket', isGuestTicket: false, rowId: (order: OrderDisplay) => `inhabitant-${order.inhabitantId}`},
    {ticket: 'her guest\'s ticket', isGuestTicket: true, rowId: (order: OrderDisplay) => `guest-order-guest-group-${Object.keys(useBooking().groupGuestOrders([order]))[0]}`}
  ])('GIVEN $ticket is released THEN its row\'s state badge reads the state text, icon and colour formatOrder gives the order', async ({isGuestTicket, rowId}) => {
    const anna = householdWithInhabitants.inhabitants[0]!
    const released = OrderFactory.defaultOrder('released', {inhabitantId: anna.id, dinnerEventId: baseProps.dinnerEvent.id, state: OrderState.RELEASED, isGuestTicket})
    const wrapper = await mountMemberForm(false, {orders: [released]})

    // The UBadge whose root is the part: a part's own component lookups reach only the components inside that root
    const part = findByTestId(wrapper, `${rowId(released)}-state`)
    const badge = wrapper.findAllComponents({name: 'UBadge'}).find(component => component.element === part.element)
    const {stateText, stateIcon, stateColor} = useBookingUi().formatOrder(released)
    expect({text: badge?.text(), icon: badge?.props('icon'), color: badge?.props('color')}).toEqual({text: stateText, icon: stateIcon, color: stateColor})
  })
})

describe('DinnerBookingForm on a closed, sold-out dinner (waiting list)', () => {
  const {DinnerModeSchema, TicketTypeSchema, OrderStateSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const {ADULT, CHILD} = TicketTypeSchema.enum
  const [adultPrice, childPrice] = [priceOf(ADULT), priceOf(CHILD)]
  const [anna, bo] = householdWithInhabitants.inhabitants
  const dinnerEventId = baseProps.dinnerEvent.id
  const boQueued = WaitlistFactory.defaultEntry({id: 31, inhabitantId: bo!.id, dinnerEventId, position: 2, dinnerMode: DinnerMode.TAKEAWAY, ticketPrice: adultPrice})
  const guestQueued = WaitlistFactory.defaultEntry({id: 41, inhabitantId: bo!.id, dinnerEventId, isGuestTicket: true, position: 3, ticketPrice: childPrice, dinnerMode: DinnerMode.DINEIN})

  const mountClosed = (props: {orders?: OrderDisplay[], waitlistEntries?: ReturnType<typeof WaitlistFactory.defaultEntry>[]} = {}) =>
    mountMemberForm(false, props)
  const emittedSaves = (wrapper: Awaited<ReturnType<typeof mountClosed>>) => wrapper.emitted('saveBookings')

  // Bo's own place, second in the adults' line wishing Takeaway, and the place of Bo's guest, third in the children's
  // line wishing Spisesal: the same marks and the same edits; a queued guest's row id names its entry
  const queuedRows = [
    {row: 'Bo\'s place', entry: boQueued, ticketType: ADULT, rowId: `inhabitant-${bo!.id}`, positionId: bo!.id, guestCount: undefined, requeue: DinnerMode.DINEINLATE, saved: {isGuestTicket: false}},
    {row: 'the place of Bo\'s guest', entry: guestQueued, ticketType: CHILD, rowId: `guest-order-guest-entry-${guestQueued.id}`, positionId: `guest-entry-${guestQueued.id}`, guestCount: 1, requeue: DinnerMode.TAKEAWAY, saved: {isGuestTicket: true, ticketPriceId: childPrice.id}}
  ]

  it.each(queuedRows)('GIVEN $row THEN the row shows the place in its ticket type\'s line, and its ticket the hourglass with the wish ghosted', async ({entry, ticketType, positionId, guestCount}) => {
    const wrapper = await mountClosed({waitlistEntries: [entry]})

    expect(findByTestId(wrapper, WAITLIST_TEST_IDS.position(positionId)).text()).toContain(formatPlace(entry.position, ticketType))
    const queuedTickets = wrapper.findAllComponents(DinnerTicket).filter(ticket => ticket.props('ticketState') === TicketState.queued)
    expect(queuedTickets).not.toHaveLength(0)
    queuedTickets.forEach(ticket => expect(ticket.props()).toMatchObject({dinnerMode: entry.order.dinnerMode, guestCount}))
  })

  // A queued row edits its wish: Ingen leaves the line, another mode requeues the wish, each naming the place
  it.each(queuedRows.flatMap(row => [
    {...row, intent: 'leaves the line', dinnerMode: DinnerMode.NONE},
    {...row, intent: 'requeues the new wish', dinnerMode: row.requeue}
  ]))('GIVEN $row WHEN the row expands THEN the draft starts on the wish; WHEN the member picks $dinnerMode and saves THEN the order names the place and $intent', async ({entry, rowId, dinnerMode, saved}) => {
    const wrapper = await mountClosed({waitlistEntries: [entry]})
    await clickByTestId(wrapper, `${rowId}-toggle`)
    expect(rowSelector(wrapper, rowId).props('modelValue')).toBe(entry.order.dinnerMode)

    await clickByTestId(wrapper, `${rowId}-mode-edit-${dinnerMode}`)
    await clickByTestId(wrapper, `${rowId}-save`)

    expect(emittedSaves(wrapper)).toEqual([[[expect.objectContaining({inhabitantId: bo!.id, dinnerEventId, dinnerMode, waitlistEntryId: entry.id, ...saved})]]])
  })

  it('GIVEN a member holding a ticket THEN the row shows no queue position', async () => {
    const order = OrderFactory.defaultOrder('ticket-holder', {inhabitantId: anna!.id, dinnerEventId, ticketPriceId: adultPrice.id, priceAtBooking: adultPrice.price, state: OrderStateSchema.enum.BOOKED})
    const wrapper = await mountClosed({orders: [order], waitlistEntries: [{...boQueued, inhabitantId: anna!.id}]})

    expect(findByTestId(wrapper, WAITLIST_TEST_IDS.position(anna!.id)).exists()).toBe(false)
    expect(wrapper.findAllComponents(DinnerTicket).some(ticket => ticket.props('ticketState') === TicketState.queued)).toBe(false)
  })

  it('GIVEN the guest form WHEN it saves a guest THEN the guest goes through the one booking path', async () => {
    const wrapper = await mountClosed()
    await clickByTestId(wrapper, 'guest-add-guest-toggle')
    const guest = OrderFactory.defaultDesiredOrder({inhabitantId: 1, dinnerEventId, dinnerMode: DinnerMode.DINEIN, ticketPriceId: adultPrice.id, isGuestTicket: true, allergyTypeIds: [4]})

    wrapper.findComponent(GuestBookingForm).vm.$emit('save', [guest])
    await nextTick()

    expect(emittedSaves(wrapper)).toEqual([[[guest]]])
  })
})

// A guest row is one booker's guests at one price: a baby who tastes for free and a hungry baby are two rows, placed or
// queued
describe('DinnerBookingForm guest rows by price on a closed dinner', () => {
  const {TicketTypeSchema} = useBookingValidation()
  // The factory lists the baby who tastes first, the hungry baby second
  const babyPrices = baseProps.ticketPrices.filter(price => price.ticketType === TicketTypeSchema.enum.BABY)
  const [tasting, hungry] = [babyPrices[0]!, babyPrices[1]!]
  const booker = householdWithInhabitants.inhabitants[0]!
  const dinnerEventId = baseProps.dinnerEvent.id
  const guestBaby = (id: number, price: TicketPrice) => OrderFactory.defaultOrder('guest-baby', {
    id, inhabitantId: booker.id, dinnerEventId, ticketPriceId: price.id, ticketType: price.ticketType, priceAtBooking: price.price, isGuestTicket: true
  })
  const queuedHungryBaby = WaitlistFactory.defaultEntry({id: 51, inhabitantId: booker.id, dinnerEventId, isGuestTicket: true, ticketPrice: hungry})
  const placed = (price: TicketPrice, guestCount: number) => ({price: price.price, guestCount, ticketState: TicketState.normal})
  const queued = {price: hungry.price, guestCount: 1, ticketState: TicketState.queued}

  // The ticket of each guest row as it renders, one per row: a row renders its ticket inline on a phone and in its column from md
  const guestTickets = (wrapper: Awaited<ReturnType<typeof mountMemberForm>>) => wrapper.findAll('tbody tr').flatMap((row: BaseWrapper<Node>) => {
    const ticket = row.findAllComponents(DinnerTicket).find(candidate => candidate.props('guestCount') !== undefined)
    return ticket ? [{price: ticket.props('price'), guestCount: ticket.props('guestCount'), ticketState: ticket.props('ticketState')}] : []
  })

  it.each([
    {guests: 'a baby who tastes placed and a hungry baby queued', orders: [guestBaby(101, tasting)], entries: [queuedHungryBaby], rows: [placed(tasting, 1), queued]},
    {guests: 'a baby who tastes and a hungry baby placed', orders: [guestBaby(101, tasting), guestBaby(102, hungry)], entries: [], rows: [placed(tasting, 1), placed(hungry, 1)]},
    {guests: 'two babies who taste placed and a hungry baby queued', orders: [guestBaby(101, tasting), guestBaby(103, tasting)], entries: [queuedHungryBaby], rows: [placed(tasting, 2), queued]}
  ])('GIVEN one booker\'s guests: $guests THEN each price is its own guest row', async ({orders, entries, rows}) => {
    const wrapper = await mountMemberForm(false, {orders, waitlistEntries: entries})

    expect(guestTickets(wrapper)).toEqual(rows)
  })

  // The toggles of the open rows: an open row's toggle points down
  const openToggles = (wrapper: Awaited<ReturnType<typeof mountForm>>) => wrapper.findAllComponents({name: 'UButton'})
    .filter(button => button.props('icon') === ICONS.chevronDown)
    .map(button => button.attributes('data-testid'))

  // The form shows the placed baby; the save's re-read then hands it the same order anew and the queued hungry baby,
  // a row above the add-guest row. The open row follows its row by id, not by position
  it.each([
    {opened: 'no row open', open: async () => {}, openRows: [], guestForm: false},
    {opened: 'the add-guest row open', open: (wrapper: Awaited<ReturnType<typeof mountForm>>) => clickByTestId(wrapper, 'guest-add-guest-toggle'),
      openRows: ['guest-add-guest-toggle'], guestForm: true}
  ])('GIVEN a baby who tastes placed, with $opened, WHEN the re-read adds a queued hungry baby THEN both guest rows show, and the open row stays open', async ({open, openRows, guestForm}) => {
    const props = shallowReactive(memberFormProps(false, {orders: [guestBaby(101, tasting)], waitlistEntries: []}))
    const wrapper = await mountForm(props)
    await open(wrapper)

    Object.assign(props, {orders: [guestBaby(101, tasting)], waitlistEntries: [queuedHungryBaby]})
    await flushPromises()

    expect(guestTickets(wrapper)).toEqual([placed(tasting, 1), queued])
    expect(openToggles(wrapper)).toEqual(openRows)
    expect(wrapper.findComponent(GuestBookingForm).exists()).toBe(guestForm)
  })
})

// A dinner without a booking takes the price for the person's age on its date, as the save prices it; a booked ticket
// keeps its booked price and its own ticket type, whatever the person's age
describe('DinnerBookingForm a person\'s price on the dinner\'s date', () => {
  const {ADULT, CHILD} = useActionValidation().TicketTypeSchema.enum
  const [adultPrice, childPrice] = [priceOf(ADULT), priceOf(CHILD)]
  const [anna, bo] = householdWithInhabitants.inhabitants
  const {dinnerEvent} = baseProps
  // Anna turns the CHILD price's age limit on the dinner: a child today, an adult on the dinner's date
  const annaGrowingUp = {...anna!, birthDate: subYears(dinnerEvent.date, childPrice.maximumAgeLimit!)}
  const bookedAtTheChildPrice = OrderFactory.defaultOrder('child-price', {
    inhabitantId: anna!.id, dinnerEventId: dinnerEvent.id, ticketPriceId: childPrice.id, ticketType: childPrice.ticketType, priceAtBooking: childPrice.price
  })

  it.each([
    {given: 'Anna, a child today, turns 12 on the dinner, with no order', inhabitant: annaGrowingUp, orders: [], price: adultPrice},
    {given: 'Anna, an adult, holds a ticket booked at the CHILD price row', inhabitant: anna!, orders: [bookedAtTheChildPrice], price: childPrice}
  ])('GIVEN $given THEN her ticket badge reads the type and price of the $price.ticketType price row', async ({inhabitant, orders, price}) => {
    const wrapper = await mountMemberForm(true, {household: {...householdWithInhabitants, inhabitants: [inhabitant, bo!]}, orders})

    const badges = ticketsOf(wrapper, anna!.id).map(ticket => ticket.findComponent({name: 'UBadge'}).text())
    expect(badges).not.toHaveLength(0)
    expect(badges).toEqual(badges.map(() => ticketBadgeLabel(ticketTypePresentation(price.ticketType).label, price.price)))
  })
})

// Hele familien reaches every row on a closed dinner: Anna's ticket, Bo's place and the place of Bo's queued guest
describe('DinnerBookingForm power mode on a closed dinner where the household waits', () => {
  const {DinnerModeSchema, TicketTypeSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const [adultPrice, childPrice] = [TicketTypeSchema.enum.ADULT, TicketTypeSchema.enum.CHILD].map(priceOf)
  const [anna, bo] = householdWithInhabitants.inhabitants
  const dinnerEventId = baseProps.dinnerEvent.id
  const annaTicket = OrderFactory.defaultOrder('power', {
    id: 201, inhabitantId: anna!.id, dinnerEventId, ticketPriceId: adultPrice!.id, ticketType: adultPrice!.ticketType, priceAtBooking: adultPrice!.price, dinnerMode: DinnerMode.TAKEAWAY
  })
  const boQueued = WaitlistFactory.defaultEntry({id: 31, inhabitantId: bo!.id, dinnerEventId, position: 2, dinnerMode: DinnerMode.TAKEAWAY, ticketPrice: adultPrice!})
  const guestQueued = (dinnerMode: DinnerMode) => {
    const entry = WaitlistFactory.defaultEntry({id: 41, inhabitantId: bo!.id, dinnerEventId, isGuestTicket: true, position: 1, ticketPrice: childPrice!, dinnerMode})
    return {...entry, order: {...entry.order, allergyTypeIds: [7]}}
  }
  const mountWaiting = (guestWish: DinnerMode) => mountMemberForm(false, {orders: [annaTicket], waitlistEntries: [boQueued, guestQueued(guestWish)]})

  it.each([
    {guestWish: DinnerMode.TAKEAWAY, power: {dinnerMode: DinnerMode.TAKEAWAY, consensus: true}},
    {guestWish: DinnerMode.DINEINLATE, power: {consensus: false}}
  ])('GIVEN Anna\'s ticket and Bo\'s place on Takeaway and a queued guest wishing $guestWish THEN the power row counts the wishes in its consensus', async ({guestWish, power}) => {
    const wrapper = await mountWaiting(guestWish)

    const powerTickets = wrapper.findAllComponents(DinnerTicket).filter(ticket => ticket.props('consensus') !== undefined)
    expect(powerTickets).not.toHaveLength(0)
    powerTickets.forEach(ticket => expect(ticket.props()).toMatchObject(power))
  })

  it('WHEN power mode sets Ingen and saves THEN Anna\'s ticket is released, Bo\'s intent names his place and the guest\'s place leaves the line', async () => {
    const wrapper = await mountWaiting(DinnerMode.TAKEAWAY)
    await clickByTestId(wrapper, 'power-power-mode-toggle')
    await clickByTestId(wrapper, `power-power-mode-mode-edit-${DinnerMode.NONE}`)
    await clickByTestId(wrapper, 'power-power-mode-save')

    expect(wrapper.emitted('saveBookings')).toEqual([[[
      expect.objectContaining({inhabitantId: anna!.id, dinnerEventId, dinnerMode: DinnerMode.NONE, isGuestTicket: false, orderId: annaTicket.id}),
      expect.objectContaining({inhabitantId: bo!.id, dinnerEventId, dinnerMode: DinnerMode.NONE, isGuestTicket: false, waitlistEntryId: boQueued.id}),
      expect.objectContaining({inhabitantId: bo!.id, dinnerEventId, dinnerMode: DinnerMode.NONE, ticketPriceId: childPrice!.id, isGuestTicket: true, allergyTypeIds: [7], waitlistEntryId: 41})
    ]]])
  })
})

// Every preview is the server's dry run of the save: the save's request read through the GET, its reply under the dinner's day
describe('DinnerBookingForm previews a save through the server\'s dry run', () => {
  const {DinnerModeSchema, TicketTypeSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const [anna, bo] = householdWithInhabitants.inhabitants
  const {dinnerEvent} = baseProps
  const householdOrder = householdWithInhabitants.inhabitants.map(({id}) => id)
  const adultPrice = priceOf(TicketTypeSchema.enum.ADULT)
  const resultOf = (action: BookingAction, overrides: Partial<BookingResult> = {}): BookingResult => OrderFactory.defaultBookingResult({
    inhabitantId: anna!.id, inhabitantName: anna!.name, dinnerEventId: dinnerEvent.id, action, ...overrides
  })
  const answer = (...results: BookingResult[]) => OrderFactory.defaultScaffoldOrdersResponse({dinners: [{id: dinnerEvent.id, date: dinnerEvent.date}], results})
  type Mounted = Awaited<ReturnType<typeof mountMemberForm>>
  const rowPreview = (wrapper: Mounted) => wrapper.findComponent(ActionPreview)
  const guestPreview = (wrapper: Mounted) => wrapper.findComponent(GuestBookingForm).findComponent(ActionPreview)
  const openRow = async (wrapper: Mounted, inhabitantId: number, dinnerMode: DinnerMode) => {
    await clickByTestId(wrapper, `inhabitant-${inhabitantId}-toggle`)
    await clickByTestId(wrapper, `inhabitant-${inhabitantId}-mode-edit-${dinnerMode}`)
  }

  // An admin's save lifts the deadlines (ADR-016): its preview reads the same run with bypassDeadlines, a dry-run
  // parameter and no override (ADR-004). The save button reads the reply's outcome, and the save sends the row's desired
  // order through the one booking path, which books, buys a ticket for sale or queues by supply
  it.each([
    {who: 'a member', adminBypass: false, query: {}},
    {who: 'an admin', adminBypass: true, query: {bypassDeadlines: 'true'}}
  ])('WHEN $who picks a mode THEN the row\'s desired order goes to the dry run with $query, its reply renders under the dinner\'s day and names the save; WHEN the row saves THEN it sends the mode at the row\'s ticket price', async ({adminBypass, query}) => {
    const reply = answer(resultOf(Action.BOOK, {dinnerMode: DinnerMode.TAKEAWAY}))
    scaffold.answers.preview = () => reply
    const wrapper = await mountMemberForm(true, {adminBypass})
    await openRow(wrapper, anna!.id, DinnerMode.TAKEAWAY)

    await vi.waitFor(() => expect(rowPreview(wrapper).props('days')).toEqual(formatPreviewLines(reply.scaffoldResult, householdOrder)))
    const desired = {inhabitantId: anna!.id, dinnerMode: DinnerMode.TAKEAWAY, ticketPriceId: adultPrice.id}
    expect(previews().at(-1)).toEqual({
      query,
      body: {
        householdId: householdWithInhabitants.id,
        dinnerEventIds: [dinnerEvent.id],
        orders: [expect.objectContaining(desired)]
      }
    })
    expect(findByTestId(wrapper, `inhabitant-${anna!.id}-save`).text()).toContain(bookingSaveLabel(previewSaveOutcome(reply.scaffoldResult)))

    await clickByTestId(wrapper, `inhabitant-${anna!.id}-save`)

    expect(wrapper.emitted('saveBookings')).toEqual([[[expect.objectContaining({...desired, dinnerEventId: dinnerEvent.id, isGuestTicket: false})]]])
  })

  it('WHILE the dry run works THEN the row shows the loader in place of the lines, and the reply\'s lines once it lands', async () => {
    scaffold.answers.preview = () => answer(resultOf(Action.BOOK))
    const land = scaffold.hold('preview')
    const wrapper = await mountMemberForm(true)
    await openRow(wrapper, anna!.id, DinnerMode.DINEIN)

    await vi.waitFor(() => expect(rowPreview(wrapper).props('pending')).toBe(true))
    land()
    await vi.waitFor(() => expect(rowPreview(wrapper).props('pending')).toBe(false))
    expect(rowPreview(wrapper).props('days')).toHaveLength(1)
  })

  it('GIVEN no row open THEN no preview is asked for', async () => {
    const wrapper = await mountMemberForm(true)
    await vi.waitFor(() => expect(scaffold.sent.length).toBeGreaterThan(0))

    expect(previews()).toEqual([])
    expect(rowPreview(wrapper).exists()).toBe(false)
  })

  // The guest form opens on Voksen; its preview lines name the guests per outcome and its button names the guests
  it.each([
    {desc: 'nothing for sale', action: Action.QUEUE},
    {desc: 'an adult ticket for sale', action: Action.BUY}
  ])('after the deadline with $desc: the guest form sends the guest on Voksen to the dry run, previews $action and saves as one guest', async ({action}) => {
    scaffold.answers.preview = () => answer(resultOf(action, {isGuestTicket: true}))
    const wrapper = await mountMemberForm(false)
    await clickByTestId(wrapper, 'guest-add-guest-toggle')

    await vi.waitFor(() => expect(guestPreview(wrapper).props('days').flatMap(day => day.lines.map(line => line.action))).toEqual([action]))
    expect(guestPreview(wrapper).props('title')).toBe(BOOKING_WORDS.preview.guestTitle)
    expect(previews().at(-1)!.body.orders).toEqual([expect.objectContaining({inhabitantId: anna!.id, isGuestTicket: true, ticketPriceId: adultPrice.id})])
    expect(findByTestId(wrapper, 'guest-form-save').text()).toContain(guestSaveLabel(1))
  })

  // The guests of one booker, ticket type and price are one group per outcome, named by type and price with the count
  it('ten adult guests whose dry run buys three and queues seven preview a line each, and save as guests', async () => {
    const guests = (action: BookingAction, count: number) => Array.from({length: count}, () =>
      resultOf(action, {isGuestTicket: true, ticketType: adultPrice.ticketType, priceAtBooking: adultPrice.price}))
    // "Gæst af Anna (Voksen · 40 kr ×3)": the booker's guests, the price row's type and price, the count
    const guestLine = (count: number) =>
      `${useOrder().formatGuestLabel(anna!.name)} (${guestTicketsLabel(ticketBadgeLabel(ticketTypePresentation(adultPrice.ticketType).label, adultPrice.price), count)})`
    scaffold.answers.preview = () => answer(...guests(Action.BUY, 3), ...guests(Action.QUEUE, 7))
    const wrapper = await mountMemberForm(false)
    await clickByTestId(wrapper, 'guest-add-guest-toggle')
    await wrapper.findComponent(GuestBookingForm).find('input[name="count"]').setValue(10)

    await vi.waitFor(() => expect(guestPreview(wrapper).props('days').flatMap(day => day.lines.map(line => line.name)))
      .toEqual([guestLine(3), guestLine(7)]))
    expect(previews().at(-1)!.body.orders).toHaveLength(10)
    expect(findByTestId(wrapper, 'guest-form-save').text()).toContain(guestSaveLabel(10))
  })

  it('WHEN a queued inhabitant picks another mode THEN the entry goes to the dry run, its requeue names the new mode on the waiting list and the save reads its outcome', async () => {
    const QUEUED_ENTRY_ID = 31
    const boQueued = WaitlistFactory.defaultEntry({id: QUEUED_ENTRY_ID, inhabitantId: bo!.id, dinnerEventId: dinnerEvent.id, position: 2, dinnerMode: DinnerMode.TAKEAWAY})
    scaffold.answers.preview = () => answer(resultOf(Action.REQUEUE, {inhabitantId: bo!.id, inhabitantName: bo!.name, dinnerMode: DinnerMode.DINEINLATE}))
    const wrapper = await mountMemberForm(false, {waitlistEntries: [boQueued]})
    await openRow(wrapper, bo!.id, DinnerMode.DINEINLATE)

    await vi.waitFor(() => expect(wrapper.text()).toContain(`${bo!.name} ${ACTION_WORDS[Action.REQUEUE].preview({mode: MODE_WORDS[DinnerMode.DINEINLATE].label})}`))
    expect(findByTestId(wrapper, `inhabitant-${bo!.id}-save`).text()).toContain(bookingSaveLabel(Action.REQUEUE))
    expect(previews().at(-1)!.body.orders).toEqual([expect.objectContaining({inhabitantId: bo!.id, dinnerMode: DinnerMode.DINEINLATE, waitlistEntryId: QUEUED_ENTRY_ID})])
  })
})

// A row without an order shows what the scaffold will do: the dry run with no orders answers the expected bookings
describe('DinnerBookingForm shows the bookings the preferences give a row without an order', () => {
  const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const [anna, bo] = householdWithInhabitants.inhabitants
  const dinnerEventId = baseProps.dinnerEvent.id
  const annaExpected = OrderFactory.defaultBookingResult({inhabitantId: anna!.id, inhabitantName: anna!.name, dinnerEventId, dinnerMode: DinnerMode.DINEIN, action: Action.BOOK})
  const annaOrder = OrderFactory.defaultOrder('anna', {inhabitantId: anna!.id, dinnerEventId, dinnerMode: DinnerMode.TAKEAWAY, state: OrderStateSchema.enum.BOOKED})
  type Mounted = Awaited<ReturnType<typeof mountMemberForm>>

  const expectedReads = () => scaffold.sent.filter(({body}) => body.orders.length === 0)

  // Who views the form: the household's member, or a member of another household (an admin before the override)
  const viewers = {
    member: (orders: OrderDisplay[]) => mountMemberForm(true, {orders}),
    stranger: (orders: OrderDisplay[]) => {
      session.user.value = stranger
      return mountForm({...baseProps, household: householdWithInhabitants, orders})
    }
  }

  // Every member reads (ADR-004): whoever views the form reads the expected bookings through the GET without any
  // override, on the season's deadlines
  const mountExpected = async (results: BookingResult[], orders: OrderDisplay[] = [], viewer: keyof typeof viewers = 'member') => {
    scaffold.answers.expected = () => OrderFactory.defaultScaffoldOrdersResponse({results})
    const wrapper = await viewers[viewer](orders)
    // The table's loading bar runs until the read lands
    await untilTrue(() => expectedReads().length > 0 && !isTableLoading(wrapper))
    expect(expectedReads()).toEqual([{
      query: {},
      body: {householdId: householdWithInhabitants.id, dinnerEventIds: [dinnerEventId], orders: []}
    }])
    return wrapper
  }

  // The legend comes with the edit mode and lists the expected booking as a standing entry, also while no row is expected
  it.each([
    {desc: 'a row without an order shows the expected mode ghosted', viewer: 'member', orders: [], expected: [annaExpected], annaTicket: {dinnerMode: DinnerMode.DINEIN, expected: true}, annaFace: COMPONENTS.ticket.face.expected, legend: true},
    {desc: 'a member of another household, or an admin before the override, sees a row without an order on the expected mode ghosted', viewer: 'stranger', orders: [], expected: [annaExpected], annaTicket: {dinnerMode: DinnerMode.DINEIN, expected: true}, annaFace: COMPONENTS.ticket.face.expected, legend: false},
    {desc: 'an order supersedes the expected booking', viewer: 'member', orders: [annaOrder], expected: [annaExpected], annaTicket: {dinnerMode: DinnerMode.TAKEAWAY, expected: false}, annaFace: COMPONENTS.ticket.face.normal, legend: true},
    {desc: 'a run that expects nothing leaves the row on Ingen', viewer: 'member', orders: [], expected: [], annaTicket: {dinnerMode: DinnerMode.NONE, expected: false}, annaFace: COMPONENTS.ticket.face.normal, legend: true}
  ] as const)('$desc; the legend explains the expected booking: $legend', async ({viewer, orders, expected, annaTicket, annaFace, legend}) => {
    const wrapper = await mountExpected([...expected], [...orders], viewer)

    const ticketProps = (inhabitantId: number) => ticketsOf(wrapper, inhabitantId).map(ticket => ticket.props())
    expect(ticketProps(anna!.id)).not.toHaveLength(0)
    ticketProps(anna!.id).forEach(props => expect(props).toMatchObject(annaTicket))
    ticketsOf(wrapper, anna!.id).forEach(ticket => expect(ticket.classes()).toEqual(annaFace.split(' ')))
    // Bo has no result: the run leaves him out, as it leaves out a person who cancelled the dinner
    expect(ticketProps(bo!.id)).not.toHaveLength(0)
    ticketProps(bo!.id).forEach(props => expect(props).toMatchObject({dinnerMode: DinnerMode.NONE, expected: false}))
    expect(findByTestId(wrapper, 'dinner-mode-legend-expected').exists()).toBe(legend)
  })

  // The power row reads the modes the rows show; it is expected while every inhabitant row is
  it.each([
    {desc: 'every row expected on Takeaway', expected: [DinnerMode.TAKEAWAY, DinnerMode.TAKEAWAY], power: {dinnerMode: DinnerMode.TAKEAWAY, consensus: true, expected: true}},
    {desc: 'Anna expected on Takeaway and Bo left out', expected: [DinnerMode.TAKEAWAY], power: {consensus: false, expected: false}}
  ])('GIVEN $desc THEN the power ticket reads the modes the rows show', async ({expected, power}) => {
    const results = householdWithInhabitants.inhabitants.slice(0, expected.length).map((inhabitant, index) =>
      OrderFactory.defaultBookingResult({inhabitantId: inhabitant.id, inhabitantName: inhabitant.name, dinnerEventId, dinnerMode: expected[index]!, action: Action.BOOK}))
    const wrapper = await mountExpected(results)

    const powerTickets = wrapper.findAllComponents(DinnerTicket).filter(ticket => ticket.props('consensus') !== undefined)
    expect(powerTickets).not.toHaveLength(0)
    powerTickets.forEach(ticket => expect(ticket.props()).toMatchObject(power))
  })

  // The plan the preferences give a person on Takeaway
  const planOf = (inhabitant: NonNullable<typeof anna>) =>
    OrderFactory.defaultBookingResult({inhabitantId: inhabitant.id, inhabitantName: inhabitant.name, dinnerEventId, dinnerMode: DinnerMode.TAKEAWAY, action: Action.BOOK})
  // The save emits one desired order per person on the mode, each bare: no order and no place on the waiting list to name
  const expectBareSave = (wrapper: Mounted, inhabitants: {id: number}[], dinnerMode: DinnerMode) => {
    expect(wrapper.emitted('saveBookings')).toEqual([[inhabitants.map(({id}) => expect.objectContaining({inhabitantId: id, dinnerEventId, dinnerMode, isGuestTicket: false}))]])
    const [[saved]] = wrapper.emitted('saveBookings') as [[DesiredOrder[]]]
    for (const order of saved) {
      expect(order.orderId).toBeUndefined()
      expect(order.waitlistEntryId).toBeUndefined()
    }
  }

  // A plan stays a ghost until it is touched: a click on a mode adopts it as the person's own draft, and the save sends
  // it with nothing to name. Ingen on a row without an order is the person's cancellation
  it.each([
    {click: 'the plan\'s Takeaway', dinnerMode: DinnerMode.TAKEAWAY},
    {click: 'Ingen', dinnerMode: DinnerMode.NONE}
  ])('GIVEN Anna\'s plan WHEN her row expands THEN the selector shows the plan untouched; WHEN $click is clicked THEN her ticket turns solid on it and the save sends it bare', async ({dinnerMode}) => {
    const wrapper = await mountExpected([planOf(anna!)])
    await clickByTestId(wrapper, `inhabitant-${anna!.id}-toggle`)
    expect(editSelector(wrapper, anna!.id).props()).toMatchObject({modelValue: DinnerMode.TAKEAWAY, expected: true})

    await clickByTestId(wrapper, `inhabitant-${anna!.id}-mode-edit-${dinnerMode}`)
    expect(editSelector(wrapper, anna!.id).props()).toMatchObject({modelValue: dinnerMode, expected: false})
    expect(ticketsOf(wrapper, anna!.id)).not.toHaveLength(0)
    ticketsOf(wrapper, anna!.id).forEach(ticket => expect(ticket.props()).toMatchObject({dinnerMode, expected: false}))

    await clickByTestId(wrapper, `inhabitant-${anna!.id}-save`)
    expectBareSave(wrapper, [anna!], dinnerMode)
  })

  // Untouched, a plan is no booking: no preview is asked for, the save reads Opdater, sends nothing and closes the row
  it('GIVEN Anna\'s plan WHEN her row expands and saves untouched THEN the save reads Opdater, nothing is sent and the row closes', async () => {
    const wrapper = await mountExpected([planOf(anna!)])
    await clickByTestId(wrapper, `inhabitant-${anna!.id}-toggle`)
    expect(findByTestId(wrapper, `inhabitant-${anna!.id}-save`).text()).toContain(bookingSaveLabel(Action.CHANGE_MODE))

    await clickByTestId(wrapper, `inhabitant-${anna!.id}-save`)

    expect(previews()).toEqual([])
    expect(wrapper.emitted('saveBookings')).toBeUndefined()
    expect(findByTestId(wrapper, `inhabitant-${anna!.id}-save`).exists()).toBe(false)
  })

  it('GIVEN every row\'s plan on Takeaway WHEN the power row adopts the plan in one click THEN the save sends every person\'s plan bare', async () => {
    const {inhabitants} = householdWithInhabitants
    const wrapper = await mountExpected(inhabitants.map(planOf))
    await clickByTestId(wrapper, 'power-power-mode-toggle')
    expect(rowSelector(wrapper, 'power-power-mode').props()).toMatchObject({modelValue: DinnerMode.TAKEAWAY, expected: true})

    await clickByTestId(wrapper, `power-power-mode-mode-edit-${DinnerMode.TAKEAWAY}`)
    await clickByTestId(wrapper, 'power-power-mode-save')

    expectBareSave(wrapper, inhabitants, DinnerMode.TAKEAWAY)
  })
})

describe('DinnerBookingForm on a closed dinner: the "Har du brug for flere billetter?" bar', () => {
  const TITLE = BOOKING_WORDS.supply.moreTickets
  const {ADULT, CHILD} = useActionValidation().TicketTypeSchema.enum

  // The bar's words and glyph per supply are moreTicketsAlert's (useBookingUi)
  it('GIVEN tickets for sale and a waiting list THEN one bar reads the closure and the supply in one line, in the glyph the supply gives', async () => {
    const counts = lockedDinnerSupply({[CHILD]: 1}, {[ADULT]: 8})
    const wrapper = await mountMemberForm(false, {releasedTicketCounts: counts})

    const bar = findByTestId(wrapper, WAITLIST_TEST_IDS.moreTickets)
    const alert = wrapper.findAllComponents({name: 'UAlert'}).find(component => component.element === bar.element)
    expect(alert?.props()).toMatchObject(moreTicketsAlert(counts)!)
  })

  it.each([
    {desc: 'a closed dinner with nothing for sale and nobody waiting', canModify: false, counts: EMPTY_RELEASED_TICKET_COUNTS},
    {desc: 'a dinner open for booking', canModify: true, counts: lockedDinnerSupply({[ADULT]: 4}, {[CHILD]: 1})}
  ])('GIVEN $desc THEN no bar shows', async ({canModify, counts}) => {
    const wrapper = await mountMemberForm(canModify, {releasedTicketCounts: counts})

    expect(wrapper.text()).not.toContain(TITLE)
  })
})

describe('DinnerBookingForm on a closed dinner: the household\'s own places on the waiting list', () => {
  const [anna, bo] = householdWithInhabitants.inhabitants
  const dinnerEventId = baseProps.dinnerEvent.id
  const entryFor = (id: number, inhabitantId: number, onDinner = dinnerEventId) =>
    WaitlistFactory.defaultEntry({id, inhabitantId, dinnerEventId: onDinner})
  const noteOf = (wrapper: Awaited<ReturnType<typeof mountMemberForm>>) => findByTestId(wrapper, WAITLIST_TEST_IDS.householdQueued)

  it.each([
    {count: 1, entries: [entryFor(41, bo!.id)]},
    {count: 2, entries: [entryFor(41, anna!.id), entryFor(42, bo!.id)]}
  ])('GIVEN $count entries THEN the warning note counts them and says when the household pays', async ({count, entries}) => {
    const wrapper = await mountMemberForm(false, {waitlistEntries: entries})

    const {title, description} = SUPPLY_WORDS.householdQueued(count)
    expect(noteOf(wrapper).text()).toContain(title)
    expect(noteOf(wrapper).text()).toContain(description)
    const note = wrapper.findAllComponents({name: 'UAlert'}).find(alert => alert.element === noteOf(wrapper).element)!
    expect(note.props()).toMatchObject({icon: ICONS.waitlist, color: useTheSlopeDesignSystem().ALERTS.warning.color})
  })

  it.each([
    {desc: 'no entry', entries: []},
    {desc: 'an entry on another dinner only', entries: [entryFor(41, bo!.id, dinnerEventId + 1)]}
  ])('GIVEN $desc THEN no note shows', async ({entries}) => {
    const wrapper = await mountMemberForm(false, {waitlistEntries: entries})

    expect(noteOf(wrapper).exists()).toBe(false)
  })
})

// Nothing lands on a cancelled dinner: the form wears the corner ribbon, and the tickets of its rows the cancelled face
// Hele familien offers the modes every row may pick (powerOptions over each row's getBookingOptions)
describe('DinnerBookingForm power row modes', () => {
  const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
  const {TAKEAWAY, NONE} = DinnerModeSchema.enum
  const [anna, bo] = householdWithInhabitants.inhabitants
  const dinnerEventId = baseProps.dinnerEvent.id
  // Anna holds her ticket on Takeaway, Bo has released his
  const orders = [
    OrderFactory.defaultOrder('power-anna', {id: 201, inhabitantId: anna!.id, dinnerEventId, dinnerMode: TAKEAWAY, state: OrderStateSchema.enum.BOOKED}),
    OrderFactory.defaultOrder('power-bo', {id: 202, inhabitantId: bo!.id, dinnerEventId, dinnerMode: NONE, state: OrderStateSchema.enum.RELEASED})
  ]

  it.each([
    {standing: 'before the deadline, every row open', canModifyOrders: true, canEditDiningMode: true, modes: DINNER_MODE_ORDER},
    {standing: 'after the deadline with the mode locked', canModifyOrders: false, canEditDiningMode: false, modes: [NONE]}
  ])('GIVEN Anna\'s ticket on Takeaway and Bo\'s released, $standing, WHEN Hele familien expands THEN it offers $modes', async ({canModifyOrders, canEditDiningMode, modes}) => {
    const wrapper = await mountMemberForm(canModifyOrders, {orders, deadlines: {...baseDeadlines, canModifyOrders: () => canModifyOrders, canEditDiningMode: () => canEditDiningMode}})
    await clickByTestId(wrapper, 'power-power-mode-toggle')

    expect(rowSelector(wrapper, 'power-power-mode').props('enabledModes')).toEqual(modes)
  })
})

describe('DinnerBookingForm on a cancelled dinner', () => {
  const {DinnerStateSchema, OrderStateSchema} = useBookingValidation()
  const [anna] = householdWithInhabitants.inhabitants
  const cancelledDinner = {...baseProps.dinnerEvent, state: DinnerStateSchema.enum.CANCELLED}
  const annaTicket = OrderFactory.defaultOrder('cancelled', {inhabitantId: anna!.id, dinnerEventId: cancelledDinner.id, state: OrderStateSchema.enum.BOOKED})
  const mountCancelled = () => mountMemberForm(true, {dinnerEvent: cancelledDinner, orders: [annaTicket]})

  it('GIVEN a cancelled dinner THEN the form wears the cancelled corner ribbon', async () => {
    const wrapper = await mountCancelled()

    const ribbon = findByTestId(wrapper, 'cancelled-ribbon')
    expect(ribbon.exists()).toBe(true)
    expect(ribbon.classes()).toEqual(getRibbonClasses('cancel').split(' '))
  })

  // A member edits the dinners still to come: a cancelled dinner is as closed to edits as a past one
  it.each([
    {standing: 'a past dinner', dinnerEvent: {...baseProps.dinnerEvent, date: DinnerEventFactory.dinnerEventAt(baseProps.dinnerEvent.id, -1).date}},
    {standing: 'a cancelled dinner', dinnerEvent: cancelledDinner}
  ])('GIVEN a member on $standing THEN the form offers no edit mode: no row opens, no guest can be added and no legend shows', async ({dinnerEvent}) => {
    const wrapper = await mountMemberForm(true, {dinnerEvent})

    const toggles = ['power-power-mode', ...householdWithInhabitants.inhabitants.map(({id}) => `inhabitant-${id}`), 'guest-add-guest'].map(row => `${row}-toggle`)
    expect(toggles.filter(toggle => findByTestId(wrapper, toggle).exists())).toEqual([])
    // The add-guest row's name cell is the one UserListItem wearing the add-guest face
    expect(wrapper.findAllComponents(UserListItem).some(item => item.props('icon') === ICONS.userPlus)).toBe(false)
    expect(wrapper.findComponent({name: 'DinnerModeLegend'}).exists()).toBe(false)
  })

  it('GIVEN a cancelled dinner THEN every ticket of its rows wears the cancelled face', async () => {
    const wrapper = await mountCancelled()

    const tickets = wrapper.findAllComponents(DinnerTicket)
    expect(tickets).not.toHaveLength(0)
    tickets.forEach(ticket => expect(ticket.props('cancelled')).toBe(true))
  })
})
