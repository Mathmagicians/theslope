// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, beforeAll} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, clickByTestId, resetStores, registerEmptyStoreEndpoints, registerScaffoldEndpoint, VIEWPORTS, lockedDinnerSupply, isTableLoading} from '~~/tests/component/testHelpers'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import DinnerTicket from '~/components/dinner/DinnerTicket.vue'
import GuestBookingForm from '~/components/booking/GuestBookingForm.vue'
import ActionPreview from '~/components/booking/ActionPreview.vue'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {ACTION_WORDS, MODE_WORDS, SUPPLY_WORDS, bookingSaveLabel, guestSaveLabel, closedForCancellation, formatPreviewLines, previewSaveOutcome} from '~/composables/useBookingUi'
import {BOOKING_WORDS} from '~/config/bookingWords'
import {EMPTY_RELEASED_TICKET_COUNTS} from '~/composables/useBooking'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import type {BookingAction, BookingResult, DinnerMode, OrderDisplay} from '~/composables/useBookingValidation'
import type {HouseholdDetail, UserDetail} from '~/composables/useCoreValidation'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {COMPONENTS, ICONS, createTableColumns, useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'
import {WAITLIST_TEST_IDS} from './waitlistTestIds'
import {useBookingValidation as useActionValidation, TicketState} from '~/composables/useBookingValidation'
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

const mountForm = (props: Record<string, unknown>, isMd?: boolean) => mountWithTooltipProvider(DinnerBookingForm, {props, isMd})

/** A member of the household on a dinner open or closed for changes; the dining mode stays editable */
const mountMemberForm = (canModify: boolean, props: Record<string, unknown> = {}) => {
  session.user.value = member
  const deadlines = {...baseDeadlines, canModifyOrders: () => canModify, canEditDiningMode: () => true}
  return mountForm({...baseProps, household: householdWithInhabitants, deadlines, ...props})
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

      const mountBooked = () =>
        mountMemberForm(true, {household: householdWithAllergies, orders: [...familyOrders(DinnerMode.DINEIN), ...guestOrders]})

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

  // While the dinner's bookings reload, UTable runs its loading bar over the household's rows
  describe('while the bookings of the dinner reload', () => {
    // The expected bookings' read runs the same bar; it lands at once here
    it.each([true, false])('GIVEN loading=%s THEN the table receives it, and the household\'s rows stay', async (loading) => {
      const wrapper = await mountMemberForm(true, {loading})

      await vi.waitFor(() => expect(isTableLoading(wrapper)).toBe(loading))
      expect(findByTestId(wrapper, 'power-power-mode-toggle').exists()).toBe(true)
      expect(wrapper.findAllComponents(DinnerTicket).length > 0).toBe(true)
    })

    // The day bill and the household's notes count the orders: they wait while the orders load
    it.each([
      {loading: true, shown: false},
      {loading: false, shown: true}
    ])('GIVEN a closed dinner with a released ticket and a queue entry and loading=$loading THEN the day bill and the household\'s notes show: $shown', async ({loading, shown}) => {
      const [anna, bo] = householdWithInhabitants.inhabitants
      const dinnerEventId = baseProps.dinnerEvent.id
      const released = OrderFactory.defaultOrder('released', {inhabitantId: anna!.id, dinnerEventId, state: useBookingValidation().OrderStateSchema.enum.RELEASED})
      const entry = WaitlistFactory.defaultEntry({id: 41, inhabitantId: bo!.id, dinnerEventId})

      const wrapper = await mountMemberForm(false, {orders: [released], waitlistEntries: [entry], loading})

      expect(findByTestId(wrapper, 'booking-day-bill').exists()).toBe(shown)
      expect(wrapper.text().includes(SUPPLY_WORDS.householdReleased(1).title)).toBe(shown)
      expect(findByTestId(wrapper, WAITLIST_TEST_IDS.householdQueued).exists()).toBe(shown)
    })
  })
})

describe('DinnerBookingForm on a closed, sold-out dinner (waiting list)', () => {
  const {DinnerModeSchema, TicketTypeSchema, OrderStateSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const adultPrice = baseProps.ticketPrices.find(tp => tp.ticketType === TicketTypeSchema.enum.ADULT)!
  const [anna, bo] = householdWithInhabitants.inhabitants
  const dinnerEventId = baseProps.dinnerEvent.id
  const boQueued = WaitlistFactory.defaultEntry({id: 31, inhabitantId: bo!.id, dinnerEventId, position: 2, dinnerMode: DinnerMode.TAKEAWAY, ticketPriceId: adultPrice.id})

  const mountClosed = (props: {orders?: OrderDisplay[], waitlistEntries?: ReturnType<typeof WaitlistFactory.defaultEntry>[]} = {}) =>
    mountMemberForm(false, props)
  const emittedSaves = (wrapper: Awaited<ReturnType<typeof mountClosed>>) => wrapper.emitted('saveBookings')
  const editSelector = (wrapper: Awaited<ReturnType<typeof mountClosed>>, inhabitantId: number) =>
    wrapper.findAllComponents({name: 'DinnerModeSelector'}).find(selector => selector.props('name') === `inhabitant-${inhabitantId}-mode-edit`)!

  it('GIVEN no ticket WHEN the member picks a mode THEN the save previews the queue and sends the mode at the row\'s ticket price through the one booking path', async () => {
    scaffold.answers.preview = () => OrderFactory.defaultScaffoldOrdersResponse({results: [OrderFactory.defaultBookingResult({inhabitantId: anna!.id, inhabitantName: anna!.name, dinnerEventId, dinnerMode: DinnerMode.TAKEAWAY, action: Action.QUEUE})]})
    const wrapper = await mountClosed({waitlistEntries: [boQueued]})
    await clickByTestId(wrapper, `inhabitant-${anna!.id}-toggle`)
    await clickByTestId(wrapper, `inhabitant-${anna!.id}-mode-edit-${DinnerMode.TAKEAWAY}`)

    const save = findByTestId(wrapper, `inhabitant-${anna!.id}-save`)
    await vi.waitFor(() => expect(save.text()).toContain('Skriv på venteliste'))
    await save.trigger('click')

    expect(emittedSaves(wrapper)).toEqual([[[expect.objectContaining({
      inhabitantId: anna!.id,
      dinnerEventId,
      dinnerMode: DinnerMode.TAKEAWAY,
      ticketPriceId: adultPrice.id,
      isGuestTicket: false
    })]]])
  })

  it('GIVEN a queued member THEN the row shows the position badge and the ticket shows the wished mode ghosted', async () => {
    const wrapper = await mountClosed({waitlistEntries: [boQueued]})

    expect(findByTestId(wrapper, WAITLIST_TEST_IDS.position(bo!.id)).text()).toContain('Voksen #2')
    const queuedTickets = wrapper.findAllComponents(DinnerTicket).filter(ticket => ticket.props('ticketState') === TicketState.queued)
    expect(queuedTickets.length).toBeGreaterThan(0)
    queuedTickets.forEach(ticket => expect(ticket.props('dinnerMode')).toBe(DinnerMode.TAKEAWAY))
  })

  it('GIVEN a queued member WHEN the row expands THEN the draft starts on the wish and Ingen is open to leave the queue', async () => {
    const wrapper = await mountClosed({waitlistEntries: [boQueued]})
    await clickByTestId(wrapper, `inhabitant-${bo!.id}-toggle`)

    const selector = editSelector(wrapper, bo!.id)
    expect(selector.props('modelValue')).toBe(DinnerMode.TAKEAWAY)
    expect(selector.props('disabledModes')).not.toContain(DinnerMode.NONE)
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

describe('DinnerBookingForm on a queued row', () => {
  const {DinnerModeSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const bo = householdWithInhabitants.inhabitants[1]!
  const dinnerEventId = baseProps.dinnerEvent.id
  const QUEUED_ENTRY_ID = 31
  const boQueued = WaitlistFactory.defaultEntry({id: QUEUED_ENTRY_ID, inhabitantId: bo.id, dinnerEventId, position: 2, dinnerMode: DinnerMode.TAKEAWAY})

  it.each([
    {intent: 'leaves the queue', dinnerMode: DinnerMode.NONE},
    {intent: 'requeues the wish', dinnerMode: DinnerMode.DINEINLATE}
  ])('WHEN the member picks $dinnerMode and saves THEN the order names the entry and $intent', async ({dinnerMode}) => {
    const wrapper = await mountMemberForm(false, {waitlistEntries: [boQueued]})
    await clickByTestId(wrapper, `inhabitant-${bo.id}-toggle`)
    await clickByTestId(wrapper, `inhabitant-${bo.id}-mode-edit-${dinnerMode}`)
    await clickByTestId(wrapper, `inhabitant-${bo.id}-save`)

    expect(wrapper.emitted('saveBookings')).toEqual([[[expect.objectContaining({
      inhabitantId: bo.id, dinnerEventId, dinnerMode, waitlistEntryId: QUEUED_ENTRY_ID
    })]]])
  })
})

describe('DinnerBookingForm on a queued guest row', () => {
  const {DinnerModeSchema, TicketTypeSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const childPrice = baseProps.ticketPrices.find(tp => tp.ticketType === TicketTypeSchema.enum.CHILD)!
  const bo = householdWithInhabitants.inhabitants[1]!
  const dinnerEventId = baseProps.dinnerEvent.id
  const GUEST_ENTRY_ID = 41
  const guestQueued = WaitlistFactory.defaultEntry({id: GUEST_ENTRY_ID, inhabitantId: bo.id, dinnerEventId, isGuestTicket: true, position: 3, ticketPriceId: childPrice.id, dinnerMode: DinnerMode.DINEIN})
  // A queued guest's row id names its entry; the row's test ids prefix it with the row type
  const guestRowId = `guest-entry-${GUEST_ENTRY_ID}`
  const rowId = `guest-order-${guestRowId}`

  const mountQueuedGuest = () => mountMemberForm(false, {waitlistEntries: [guestQueued]})

  it('renders the marks of a queued inhabitant: the position badge, the hourglass ticket with the guest glyph and the ghosted wish', async () => {
    const wrapper = await mountQueuedGuest()

    expect(findByTestId(wrapper, WAITLIST_TEST_IDS.position(guestRowId)).text()).toContain('Barn #3')
    const ticket = wrapper.findAllComponents(DinnerTicket).find(candidate => candidate.props('ticketState') === TicketState.queued && candidate.props('guestCount') !== undefined)
    expect(ticket?.props()).toMatchObject({dinnerMode: DinnerMode.DINEIN, guestCount: 1})
  })

  it.each([
    {intent: 'leaves the queue', dinnerMode: DinnerMode.NONE},
    {intent: 'requeues the new wish', dinnerMode: DinnerMode.TAKEAWAY}
  ])('WHEN the member picks $dinnerMode and saves THEN the guest order names the entry and $intent', async ({dinnerMode}) => {
    const wrapper = await mountQueuedGuest()
    await clickByTestId(wrapper, `${rowId}-toggle`)
    await clickByTestId(wrapper, `${rowId}-mode-edit-${dinnerMode}`)
    await clickByTestId(wrapper, `${rowId}-save`)

    expect(wrapper.emitted('saveBookings')).toEqual([[[expect.objectContaining({
      inhabitantId: bo.id, dinnerEventId, dinnerMode, ticketPriceId: childPrice.id, isGuestTicket: true, waitlistEntryId: GUEST_ENTRY_ID
    })]]])
  })
})

// Hele familien reaches every row on a closed dinner: Anna's ticket, Bo's place and the place of Bo's queued guest
describe('DinnerBookingForm power mode on a closed dinner where the household waits', () => {
  const {DinnerModeSchema, TicketTypeSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const [adultPrice, childPrice] = [TicketTypeSchema.enum.ADULT, TicketTypeSchema.enum.CHILD].map(ticketType => baseProps.ticketPrices.find(tp => tp.ticketType === ticketType)!)
  const [anna, bo] = householdWithInhabitants.inhabitants
  const dinnerEventId = baseProps.dinnerEvent.id
  const annaTicket = OrderFactory.defaultOrder('power', {
    id: 201, inhabitantId: anna!.id, dinnerEventId, ticketPriceId: adultPrice!.id, ticketType: adultPrice!.ticketType, priceAtBooking: adultPrice!.price, dinnerMode: DinnerMode.TAKEAWAY
  })
  const boQueued = WaitlistFactory.defaultEntry({id: 31, inhabitantId: bo!.id, dinnerEventId, position: 2, dinnerMode: DinnerMode.TAKEAWAY, ticketPriceId: adultPrice!.id})
  const guestQueued = (dinnerMode: DinnerMode) => {
    const entry = WaitlistFactory.defaultEntry({id: 41, inhabitantId: bo!.id, dinnerEventId, isGuestTicket: true, position: 1, ticketPriceId: childPrice!.id, dinnerMode})
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

// Every preview is the server's dry run of the save: the save's request with ?preview=true, its reply under the dinner's day
describe('DinnerBookingForm previews a save through the server\'s dry run', () => {
  const {DinnerModeSchema, TicketTypeSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const [anna, bo] = householdWithInhabitants.inhabitants
  const {dinnerEvent} = baseProps
  const householdOrder = householdWithInhabitants.inhabitants.map(({id}) => id)
  const adultPrice = baseProps.ticketPrices.find(tp => tp.ticketType === TicketTypeSchema.enum.ADULT)!
  const resultOf = (action: BookingAction, overrides: Partial<BookingResult> = {}): BookingResult => OrderFactory.defaultBookingResult({
    inhabitantId: anna!.id, inhabitantName: anna!.name, dinnerEventId: dinnerEvent.id, action, ...overrides
  })
  const answer = (...results: BookingResult[]) => OrderFactory.defaultScaffoldOrdersResponse({dinners: [{id: dinnerEvent.id, date: dinnerEvent.date}], results})
  const previews = () => scaffold.sent.filter(({body}) => body.orders.length > 0)
  type Mounted = Awaited<ReturnType<typeof mountMemberForm>>
  const rowPreview = (wrapper: Mounted) => wrapper.findComponent(ActionPreview)
  const guestPreview = (wrapper: Mounted) => wrapper.findComponent(GuestBookingForm).findComponent(ActionPreview)
  const openRow = async (wrapper: Mounted, inhabitantId: number, dinnerMode: DinnerMode) => {
    await clickByTestId(wrapper, `inhabitant-${inhabitantId}-toggle`)
    await clickByTestId(wrapper, `inhabitant-${inhabitantId}-mode-edit-${dinnerMode}`)
  }

  it.each([
    {who: 'a member', adminBypass: false},
    {who: 'an admin', adminBypass: true}
  ])('WHEN $who picks a mode THEN the row\'s desired order goes to the dry run and its reply renders under the dinner\'s day', async ({adminBypass}) => {
    const reply = answer(resultOf(Action.BOOK, {dinnerMode: DinnerMode.TAKEAWAY}))
    scaffold.answers.preview = () => reply
    const wrapper = await mountMemberForm(true, {adminBypass})
    await openRow(wrapper, anna!.id, DinnerMode.TAKEAWAY)

    await vi.waitFor(() => expect(rowPreview(wrapper).props('days')).toEqual(formatPreviewLines(reply.scaffoldResult, householdOrder)))
    expect(previews().at(-1)).toEqual({
      query: {adminBypass: String(adminBypass), preview: 'true'},
      body: {
        householdId: householdWithInhabitants.id,
        dinnerEventIds: [dinnerEvent.id],
        orders: [expect.objectContaining({inhabitantId: anna!.id, dinnerMode: DinnerMode.TAKEAWAY, ticketPriceId: adultPrice.id})]
      }
    })
  })

  it.each([Action.BOOK, Action.BUY, Action.QUEUE, Action.CHANGE_MODE])('GIVEN the dry run answers %s THEN the row saves as that outcome', async (action) => {
    scaffold.answers.preview = () => answer(resultOf(action))
    const wrapper = await mountMemberForm(false)
    await openRow(wrapper, anna!.id, DinnerMode.DINEIN)

    await vi.waitFor(() => expect(findByTestId(wrapper, `inhabitant-${anna!.id}-save`).text()).toContain(bookingSaveLabel(previewSaveOutcome(answer(resultOf(action)).scaffoldResult))))
  })

  it('WHILE the dry run works THEN the row shows the loader in place of the lines, and the reply\'s lines once it lands', async () => {
    let land: () => void = () => {}
    const landed = new Promise<void>(resolve => {
      land = resolve
    })
    scaffold.answers.preview = async () => {
      await landed
      return answer(resultOf(Action.BOOK))
    }
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

  // The guests of one booker and ticket type are one group per outcome, named with the count
  it('ten adult guests whose dry run buys three and queues seven preview a line each, and save as guests', async () => {
    const guests = (action: BookingAction, count: number) => Array.from({length: count}, () => resultOf(action, {isGuestTicket: true}))
    scaffold.answers.preview = () => answer(...guests(Action.BUY, 3), ...guests(Action.QUEUE, 7))
    const wrapper = await mountMemberForm(false)
    await clickByTestId(wrapper, 'guest-add-guest-toggle')
    await wrapper.findComponent(GuestBookingForm).find('input[name="count"]').setValue(10)

    await vi.waitFor(() => expect(guestPreview(wrapper).props('days').flatMap(day => day.lines.map(line => line.name)))
      .toEqual([expect.stringMatching(/\(Voksen ×3\)$/), expect.stringMatching(/\(Voksen ×7\)$/)]))
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
  // The tickets of an inhabitant's row: on a phone under the name, from md in their own column
  const ticketsOf = (wrapper: Mounted, inhabitantId: number) => {
    const row = wrapper.findAll('tr').find(candidate => candidate.find(`[data-testid="inhabitant-${inhabitantId}-toggle"]`).exists())!
    return wrapper.findAllComponents(DinnerTicket).filter(ticket => row.element.contains(ticket.element))
  }

  const mountExpected = async (results: BookingResult[], orders: OrderDisplay[] = []) => {
    scaffold.answers.expected = () => OrderFactory.defaultScaffoldOrdersResponse({results})
    const wrapper = await mountMemberForm(true, {orders})
    await vi.waitFor(() => expect(scaffold.sent.find(({body}) => body.orders.length === 0)).toEqual({
      query: {adminBypass: 'false', preview: 'true'},
      body: {householdId: householdWithInhabitants.id, dinnerEventIds: [dinnerEventId], orders: []}
    }))
    // The table's loading bar runs until the read lands
    await vi.waitFor(() => expect(isTableLoading(wrapper)).toBe(false))
    return wrapper
  }

  it.each([
    {desc: 'a row without an order shows the expected mode ghosted', orders: [], expected: [annaExpected], annaTicket: {dinnerMode: DinnerMode.DINEIN, expected: true}, annaFace: COMPONENTS.ticket.face.expected, legend: true},
    {desc: 'an order supersedes the expected booking', orders: [annaOrder], expected: [annaExpected], annaTicket: {dinnerMode: DinnerMode.TAKEAWAY, expected: false}, annaFace: COMPONENTS.ticket.face.normal, legend: false},
    {desc: 'a run that expects nothing leaves the row on Ingen', orders: [], expected: [], annaTicket: {dinnerMode: DinnerMode.NONE, expected: false}, annaFace: COMPONENTS.ticket.face.normal, legend: false}
  ])('$desc', async ({orders, expected, annaTicket, annaFace, legend}) => {
    const wrapper = await mountExpected(expected, orders)

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
})

describe('DinnerBookingForm on a closed dinner: the "Har du brug for flere billetter?" bar', () => {
  const TITLE = 'Har du brug for flere billetter?'
  const {ADULT, CHILD} = useActionValidation().TicketTypeSchema.enum

  it.each([
    {desc: 'tickets for sale only', counts: lockedDinnerSupply({[CHILD]: 1}), icon: ICONS.claim},
    {desc: 'the waiting list only', counts: lockedDinnerSupply({}, {[ADULT]: 8}), icon: ICONS.waitlist},
    {desc: 'tickets for sale and a waiting list', counts: lockedDinnerSupply({[CHILD]: 1}, {[ADULT]: 8}), icon: ICONS.claim}
  ])('GIVEN $desc THEN one bar reads the closure and the supply in one line', async ({counts, icon}) => {
    const wrapper = await mountMemberForm(false, {releasedTicketCounts: counts})

    const bar = findByTestId(wrapper, WAITLIST_TEST_IDS.moreTickets)
    const alert = wrapper.findAllComponents({name: 'UAlert'}).find(component => component.element === bar.element)
    expect(alert?.props('title')).toBe(TITLE)
    expect(alert?.props('description')).toBe(closedForCancellation(counts))
    expect(alert?.props('icon')).toBe(icon)
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
  const {OrderStateSchema} = useBookingValidation()
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

  it('GIVEN a released ticket and an entry THEN both household notes show', async () => {
    const released = OrderFactory.defaultOrder('released', {inhabitantId: anna!.id, dinnerEventId, state: OrderStateSchema.enum.RELEASED})
    const wrapper = await mountMemberForm(false, {orders: [released], waitlistEntries: [entryFor(41, bo!.id)]})

    expect(wrapper.text()).toContain(SUPPLY_WORDS.householdReleased(1).title)
    expect(noteOf(wrapper).text()).toContain(SUPPLY_WORDS.householdQueued(1).title)
  })
})
