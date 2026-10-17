// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, beforeAll} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, clickByTestId, resetStores, registerEmptyStoreEndpoints, VIEWPORTS} from '~~/tests/component/testHelpers'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import DinnerTicket from '~/components/dinner/DinnerTicket.vue'
import GuestBookingForm from '~/components/booking/GuestBookingForm.vue'
import ActionPreview from '~/components/booking/ActionPreview.vue'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {MODE_WORDS, SUPPLY_WORDS, bookingSaveLabel} from '~/composables/useBookingUi'
import {EMPTY_RELEASED_TICKET_COUNTS} from '~/composables/useBooking'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import type {DinnerMode, OrderDisplay} from '~/composables/useBookingValidation'
import type {HouseholdDetail, UserDetail} from '~/composables/useCoreValidation'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {ICONS, createTableColumns, useTheSlopeDesignSystem} from '~/composables/useTheSlopeDesignSystem'
import {WAITLIST_TEST_IDS} from './waitlistTestIds'
import {useBookingValidation as useActionValidation} from '~/composables/useBookingValidation'
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
    const wrapper = await mountClosed({waitlistEntries: [boQueued]})
    await clickByTestId(wrapper, `inhabitant-${anna!.id}-toggle`)
    await clickByTestId(wrapper, `inhabitant-${anna!.id}-mode-edit-${DinnerMode.TAKEAWAY}`)

    const save = findByTestId(wrapper, `inhabitant-${anna!.id}-save`)
    expect(save.text()).toContain('Skriv på venteliste')
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
    const queuedTickets = wrapper.findAllComponents(DinnerTicket).filter(ticket => ticket.props('isQueued'))
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
    expect(wrapper.findAllComponents(DinnerTicket).some(ticket => ticket.props('isQueued'))).toBe(false)
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
    const ticket = wrapper.findAllComponents(DinnerTicket).find(candidate => candidate.props('isQueued') && candidate.props('guestCount') !== undefined)
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

describe('DinnerBookingForm previews the outcome of a save by the supply', () => {
  const {DinnerModeSchema, TicketTypeSchema} = useBookingValidation()
  const anna = householdWithInhabitants.inhabitants[0]!

  // Anna is an adult: the tickets for sale are adult tickets
  const mountRow = (canModify: boolean, ticketsForSale: number) => mountMemberForm(canModify, {releasedTicketCounts: {
    ...EMPTY_RELEASED_TICKET_COUNTS, total: ticketsForSale, formatted: `${ticketsForSale}V`, byType: {[TicketTypeSchema.enum.ADULT]: ticketsForSale}
  }})

  it.each([
    {desc: 'before the deadline', canModify: true, ticketsForSale: 0, label: 'Book'},
    {desc: 'after the deadline, a ticket for sale', canModify: false, ticketsForSale: 1, label: 'Køb billet'},
    {desc: 'after the deadline, nothing for sale', canModify: false, ticketsForSale: 0, label: 'Skriv på venteliste'}
  ])('$desc: a row without a ticket saves as "$label"', async ({canModify, ticketsForSale, label}) => {
    const wrapper = await mountRow(canModify, ticketsForSale)
    await clickByTestId(wrapper, `inhabitant-${anna.id}-toggle`)
    await clickByTestId(wrapper, `inhabitant-${anna.id}-mode-edit-${DinnerModeSchema.enum.DINEIN}`)

    expect(findByTestId(wrapper, `inhabitant-${anna.id}-save`).text()).toContain(label)
  })

  // The guest form opens on Voksen; its preview lines name each guest's outcome and its button names the guests
  const guestPreview = (wrapper: Awaited<ReturnType<typeof mountRow>>) =>
    wrapper.findComponent(GuestBookingForm).findComponent(ActionPreview).props('items').map(item => item.action)

  it.each([
    {desc: 'nothing for sale', ticketsForSale: 0, action: Action.QUEUE},
    {desc: 'an adult ticket for sale', ticketsForSale: 1, action: Action.BUY}
  ])('after the deadline with $desc: the guest form opens on Voksen, previews $action and saves as "Tilmeld gæst"', async ({ticketsForSale, action}) => {
    const wrapper = await mountRow(false, ticketsForSale)
    await clickByTestId(wrapper, 'guest-add-guest-toggle')

    expect(guestPreview(wrapper)).toEqual([action])
    expect(findByTestId(wrapper, 'guest-form-save').text()).toContain('Tilmeld gæst')
  })

  // The guests share one name, so the buys read as one line and the places on the waiting list as another
  it('after the deadline with 3V 1B for sale: ten adult guests preview a buy line and a waiting-list line, and save as "Tilmeld gæster"', async () => {
    const wrapper = await mountMemberForm(false, {releasedTicketCounts: {
      ...EMPTY_RELEASED_TICKET_COUNTS, total: 4, formatted: '3V 1B', byType: {[TicketTypeSchema.enum.ADULT]: 3, [TicketTypeSchema.enum.CHILD]: 1}
    }})
    await clickByTestId(wrapper, 'guest-add-guest-toggle')
    await wrapper.findComponent(GuestBookingForm).find('input[name="count"]').setValue(10)

    expect(guestPreview(wrapper)).toEqual([Action.BUY, Action.QUEUE])
    expect(findByTestId(wrapper, 'guest-form-save').text()).toContain('Tilmeld gæster')
  })
})

describe('DinnerBookingForm settles a claim against the tickets for sale of the row\'s ticket type', () => {
  const {DinnerModeSchema, TicketTypeSchema} = useBookingValidation()
  const TicketType = TicketTypeSchema.enum
  const anna = householdWithInhabitants.inhabitants[0]!
  // Anna is a child on the dinner's day: her row claims a child ticket
  const household = {
    ...householdWithInhabitants,
    inhabitants: [{...anna, birthDate: TicketFactory.birthDateForTicketType(TicketType.CHILD, baseProps.dinnerEvent.date)}, ...householdWithInhabitants.inhabitants.slice(1)]
  }

  it.each([
    {desc: 'only an adult ticket', ticketType: TicketType.ADULT, label: 'Skriv på venteliste'},
    {desc: 'a child ticket', ticketType: TicketType.CHILD, label: 'Køb billet'}
  ])('GIVEN $desc for sale WHEN a child row picks a mode THEN it saves as "$label"', async ({ticketType, label}) => {
    const wrapper = await mountMemberForm(false, {household, releasedTicketCounts: {...EMPTY_RELEASED_TICKET_COUNTS, total: 1, byType: {[ticketType]: 1}}})
    await clickByTestId(wrapper, `inhabitant-${anna.id}-toggle`)
    await clickByTestId(wrapper, `inhabitant-${anna.id}-mode-edit-${DinnerModeSchema.enum.DINEIN}`)

    expect(findByTestId(wrapper, `inhabitant-${anna.id}-save`).text()).toContain(label)
  })
})

describe('DinnerBookingForm previews a requeue', () => {
  const {DinnerModeSchema} = useBookingValidation()
  const bo = householdWithInhabitants.inhabitants[1]!
  const boQueued = WaitlistFactory.defaultEntry({id: 31, inhabitantId: bo.id, dinnerEventId: baseProps.dinnerEvent.id, position: 2, dinnerMode: DinnerModeSchema.enum.TAKEAWAY})

  it('WHEN a queued member picks another mode THEN the save reads Opdater and the preview names the new mode and the kept place', async () => {
    const wrapper = await mountMemberForm(false, {waitlistEntries: [boQueued]})
    await clickByTestId(wrapper, `inhabitant-${bo.id}-toggle`)
    await clickByTestId(wrapper, `inhabitant-${bo.id}-mode-edit-${DinnerModeSchema.enum.DINEINLATE}`)

    expect(findByTestId(wrapper, `inhabitant-${bo.id}-save`).text()).toContain(bookingSaveLabel(Action.REQUEUE))
    expect(wrapper.text()).toContain(`ændrer ønsket tilmelding til ${MODE_WORDS[DinnerModeSchema.enum.DINEINLATE].label}, beholder ventelisteplads Voksen #${boQueued.position}`)
  })
})

describe('DinnerBookingForm on a closed dinner: the "Har du brug for flere billetter?" bar', () => {
  const TITLE = 'Har du brug for flere billetter?'
  const FOR_SALE = 'til salg'
  const WAITING = 'ventelisten'
  const supply = (total: number, formatted: string, queued: number, queuedFormatted: string) =>
    ({...EMPTY_RELEASED_TICKET_COUNTS, total, formatted, queued, queuedFormatted})

  it.each([
    {desc: 'tickets for sale only', counts: supply(4, '4V', 0, '-'), icon: ICONS.claim, absent: [WAITING],
      lines: ['Lukket for ændringer, men der er 4 billetter til salg (4V).']},
    {desc: 'one ticket for sale', counts: supply(1, '1V', 0, '-'), icon: ICONS.claim, absent: [WAITING],
      lines: ['Lukket for ændringer, men der er 1 billet til salg (1V).']},
    {desc: 'the waiting list only', counts: supply(0, '-', 6, '2V 3B 1b'), icon: ICONS.waitlist, absent: [FOR_SALE],
      lines: ['Lukket for ændringer, men du kan få en plads på ventelisten. Pt står 2V 3B 1b på ventelisten.']},
    {desc: 'tickets for sale and a waiting list', counts: supply(4, '4V', 1, '1B'), icon: ICONS.claim, absent: [],
      lines: ['Lukket for ændringer, men der er 4 billetter til salg (4V).', 'Du kan også få en plads på ventelisten. Pt står 1B på ventelisten.']}
  ])('GIVEN $desc THEN one bar reads a line per supply', async ({counts, icon, absent, lines}) => {
    const wrapper = await mountMemberForm(false, {releasedTicketCounts: counts})

    const bar = findByTestId(wrapper, WAITLIST_TEST_IDS.moreTickets)
    expect(bar.text()).toContain(TITLE)
    expect(bar.findAll('p').map(line => line.text())).toEqual(lines)
    absent.forEach(words => expect(bar.text()).not.toContain(words))
    expect(wrapper.findAllComponents({name: 'UAlert'}).find(alert => alert.element === bar.element)?.props('icon')).toBe(icon)
  })

  it.each([
    {desc: 'a closed dinner with nothing for sale and nobody waiting', canModify: false, counts: EMPTY_RELEASED_TICKET_COUNTS},
    {desc: 'a dinner open for booking', canModify: true, counts: supply(4, '4V', 1, '1B')}
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
