// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, beforeAll} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, findByTestId, clickByTestId, resetStores, registerEmptyStoreEndpoints, VIEWPORTS} from '~~/tests/component/testHelpers'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import DinnerTicket from '~/components/dinner/DinnerTicket.vue'
import GuestBookingForm from '~/components/booking/GuestBookingForm.vue'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {MODE_WORDS, bookingSaveLabel} from '~/composables/useBookingUi'
import AllergyTypeDisplay from '~/components/allergy/AllergyTypeDisplay.vue'
import type {DinnerMode, OrderDisplay} from '~/composables/useBookingValidation'
import type {HouseholdDetail, UserDetail} from '~/composables/useCoreValidation'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {COMPONENTS, ICONS, createTableColumns} from '~/composables/useTheSlopeDesignSystem'
import {WAITLIST_TEST_IDS} from './waitlistTestIds'

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

    const mountMember = (orders: OrderDisplay[]) => {
      session.user.value = member
      const deadlines = {...baseDeadlines, canModifyOrders: () => true, canEditDiningMode: () => true}
      return mountForm({...baseProps, household: householdWithInhabitants, orders, deadlines})
    }

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
        session.user.value = member
        const deadlines = {...baseDeadlines, canModifyOrders: () => true, canEditDiningMode: () => true}
        const orders = [...familyOrders(DinnerMode.DINEIN), ...guestOrders]
        return mountForm({...baseProps, household: householdWithAllergies, orders, deadlines})
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
      const wrapper = await mountForm(props, isMd)
      const headers = wrapper.findAll('thead th').map(th => th.text())
      expect(headers).toContain(createTableColumns(ref(isMd)).bookingFormName.header)
    })

    it.each(VIEWPORTS)('$viewport: the ticket column renders its header and cells from md through its column meta', async ({isMd}) => {
      const props = {...baseProps, household: householdWithInhabitants}
      const wrapper = await mountForm(props, isMd)
      const {meta} = createTableColumns(ref(isMd)).bookingFormTicket
      const columns = wrapper.findComponent({name: 'UTable'}).props('columns') as Array<{id: string}>
      const ticketIndex = columns.findIndex(column => column.id === 'ticket')
      expect(wrapper.findAll('thead th')[ticketIndex]!.classes()).toEqual(expect.arrayContaining(meta.class.th.split(' ')))
      expect(wrapper.findAll('tbody tr')[0]!.findAll('td')[ticketIndex]!.classes()).toEqual(expect.arrayContaining(meta.class.td.split(' ')))
    })
  })
})

describe('DinnerBookingForm on a closed, sold-out dinner (waiting list)', () => {
  const {DinnerModeSchema, TicketTypeSchema, OrderStateSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const adultPrice = baseProps.ticketPrices.find(tp => tp.ticketType === TicketTypeSchema.enum.ADULT)!
  const [anna, bo] = householdWithInhabitants.inhabitants
  const dinnerEventId = baseProps.dinnerEvent.id
  const boQueued = WaitlistFactory.defaultEntry({id: 31, inhabitantId: bo!.id, dinnerEventId, position: 2, dinnerMode: DinnerMode.TAKEAWAY})

  const mountClosed = (props: {orders?: OrderDisplay[], waitlistEntries?: ReturnType<typeof WaitlistFactory.defaultEntry>[]} = {}) => {
    session.user.value = member
    const deadlines = {...baseDeadlines, canModifyOrders: () => false, canEditDiningMode: () => true}
    return mountForm({...baseProps, household: householdWithInhabitants, deadlines, ...props})
  }
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

    expect(findByTestId(wrapper, WAITLIST_TEST_IDS.position(bo!.id)).text()).toContain('#2 i køen')
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
    session.user.value = member
    const deadlines = {...baseDeadlines, canModifyOrders: () => false, canEditDiningMode: () => true}
    const wrapper = await mountForm({...baseProps, household: householdWithInhabitants, deadlines, waitlistEntries: [boQueued]})
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

  const mountQueuedGuest = () => {
    session.user.value = member
    const deadlines = {...baseDeadlines, canModifyOrders: () => false, canEditDiningMode: () => true}
    return mountForm({...baseProps, household: householdWithInhabitants, deadlines, waitlistEntries: [guestQueued]})
  }

  it('renders the marks of a queued inhabitant: the position badge, the hourglass ticket with the guest glyph and the ghosted wish', async () => {
    const wrapper = await mountQueuedGuest()

    expect(findByTestId(wrapper, WAITLIST_TEST_IDS.position(guestRowId)).text()).toContain('#3 i køen')
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
  const {DinnerModeSchema} = useBookingValidation()
  const anna = householdWithInhabitants.inhabitants[0]!

  const mountRow = (canModify: boolean, ticketsForSale: number) => {
    session.user.value = member
    const deadlines = {...baseDeadlines, canModifyOrders: () => canModify, canEditDiningMode: () => true}
    return mountForm({
      ...baseProps, household: householdWithInhabitants, deadlines,
      releasedTicketCounts: {total: ticketsForSale, formatted: `${ticketsForSale}V`}
    })
  }

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

  it.each([
    {desc: 'nothing for sale', ticketsForSale: 0, label: 'Skriv gæst på venteliste'},
    {desc: 'a ticket for sale', ticketsForSale: 1, label: 'Køb billet til gæst'}
  ])('after the deadline with $desc: the guest form saves as "$label"', async ({ticketsForSale, label}) => {
    const wrapper = await mountRow(false, ticketsForSale)
    await clickByTestId(wrapper, 'guest-add-guest-toggle')

    expect(findByTestId(wrapper, 'guest-form-save').text()).toContain(label)
  })
})

describe('DinnerBookingForm previews a requeue', () => {
  const {DinnerModeSchema} = useBookingValidation()
  const bo = householdWithInhabitants.inhabitants[1]!
  const boQueued = WaitlistFactory.defaultEntry({id: 31, inhabitantId: bo.id, dinnerEventId: baseProps.dinnerEvent.id, position: 2, dinnerMode: DinnerModeSchema.enum.TAKEAWAY})

  it('WHEN a queued member picks another mode THEN the save reads Opdater and the preview names the new mode and the kept place', async () => {
    session.user.value = member
    const deadlines = {...baseDeadlines, canModifyOrders: () => false, canEditDiningMode: () => true}
    const wrapper = await mountForm({...baseProps, household: householdWithInhabitants, deadlines, waitlistEntries: [boQueued]})
    await clickByTestId(wrapper, `inhabitant-${bo.id}-toggle`)
    await clickByTestId(wrapper, `inhabitant-${bo.id}-mode-edit-${DinnerModeSchema.enum.DINEINLATE}`)

    expect(findByTestId(wrapper, `inhabitant-${bo.id}-save`).text()).toContain(bookingSaveLabel('requeue'))
    expect(wrapper.text()).toContain(`ændrer ønsket tilmelding til ${MODE_WORDS[DinnerModeSchema.enum.DINEINLATE].label}, beholder plads #${boQueued.position} i køen`)
  })
})
