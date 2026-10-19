// @vitest-environment nuxt
import {describe, it, expect, beforeAll, beforeEach, afterEach, vi} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {findByTestId, clickByTestId, resetStores, findLoadingRow, isTableLoading, registerScaffoldEndpoint, mountWithTooltipProvider, VIEWPORTS} from '~~/tests/component/testHelpers'
import {BookingViewSchema} from '~/composables/useBookingView'
import BookingGridView from '~/components/booking/BookingGridView.vue'
import DinnerModeSelector from '~/components/dinner/DinnerModeSelector.vue'
import {useBookingValidation, TicketState, type DinnerEventDisplay, type DinnerMode, type OrderDisplay, type OrderState} from '~/composables/useBookingValidation'
import {FORM_MODES, type FormMode} from '~/types/form'
import {DINNER_MODE_ORDER, EMPTY_RELEASED_TICKET_COUNTS, type ReleasedTicketCounts} from '~/composables/useBooking'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {COMPONENTS, DINNER_STATE_BADGES, ICONS, ORDER_STATE_COLORS} from '~/composables/useTheSlopeDesignSystem'
import type {TicketWaitlistDetail} from '~/composables/useWaitlistValidation'
import ActionPreview from '~/components/booking/ActionPreview.vue'
import GuestBookingForm from '~/components/booking/GuestBookingForm.vue'
import {formatPreviewLines} from '~/composables/useBookingUi'
import {addDays, startOfDay} from 'date-fns'

const {day, week, month} = BookingViewSchema.enum

enableAutoUnmount(afterEach)

// The preview and the expected bookings read the scaffold's dry run
const scaffold = registerScaffoldEndpoint()

beforeEach(() => {
  resetStores()
  scaffold.reset()
})

const ticketPrices = TicketFactory.defaultTicketPrices()
// Use real deadlinesForSeason() to stay in sync with SeasonDeadlines interface
// @nuxt/test-utils 4 starts Nuxt in beforeAll: composables run there, not at module level
let deadlines: ReturnType<ReturnType<typeof useSeason>['deadlinesForSeason']>
beforeAll(() => {
  const {deadlinesForSeason} = useSeason()
  deadlines = deadlinesForSeason(SeasonFactory.defaultSeasonData)
})

// Mock household with inhabitants (inline to avoid type imports)
const mockHousehold = {
  id: 1,
  heynaboId: 1001,
  pbsId: 2001,
  name: 'Test Household',
  address: 'Testvej 1',
  movedInDate: new Date('2020-01-01'),
  moveOutDate: null,
  shortName: 'T1',
  inhabitants: [
    {id: 1, name: 'Anna', lastName: 'Test', birthDate: new Date('1990-01-01'), heynaboId: 101, householdId: 1, dinnerPreferences: null},
    {id: 2, name: 'Lars', lastName: 'Test', birthDate: new Date('1988-05-15'), heynaboId: 102, householdId: 1, dinnerPreferences: null}
  ]
}

const baseProps = {
  view: day,
  dateRange: {start: new Date('2025-01-15'), end: new Date('2025-01-15')},
  household: mockHousehold,
  dinnerEvents: [],
  orders: [],
  ticketPrices,
  // Getter: deadlines is assigned in beforeAll, read when a test spreads baseProps
  get deadlines() { return deadlines }
}

const mount = (props = {}) => mountSuspended(BookingGridView, {
  props: {...baseProps, ...props},
  slots: {'day-content': '<div data-testid="day-slot">Day content</div>'}
})

describe('BookingGridView', () => {
  it('renders day-content slot for day view', async () => {
    const wrapper = await mount({view: day})
    expect(findByTestId(wrapper, 'day-slot').exists()).toBe(true)
  })

  const navCases: {button: string, event: string}[] = [
    {button: 'date-nav-prev', event: 'prev'},
    {button: 'date-nav-next', event: 'next'}
  ]

  it.each(navCases)('emits navigate $event when $button clicked', async ({button, event}) => {
    const wrapper = await mount()
    // Navigation is handled by CalendarDateNav component
    await findByTestId(wrapper, button).trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual([event])
  })

  it('emits update:formMode EDIT when edit button clicked (week/month only)', async () => {
    // Edit button only renders for week/month views, not day view
    const wrapper = await mount({view: week})
    await findByTestId(wrapper, 'grid-edit').trigger('click')
    expect(wrapper.emitted('update:formMode')?.[0]).toEqual([FORM_MODES.EDIT])
  })

  describe('canEdit prop', () => {
    it('hides edit button when canEdit=false', async () => {
      const wrapper = await mount({view: week, canEdit: false})
      expect(findByTestId(wrapper, 'grid-edit').exists()).toBe(false)
    })

    it('hides save button when canEdit=false in edit mode', async () => {
      const wrapper = await mount({view: week, canEdit: false, formMode: FORM_MODES.EDIT})
      expect(findByTestId(wrapper, 'grid-save').exists()).toBe(false)
    })

    it('shows save button when canEdit=true in edit mode', async () => {
      const wrapper = await mount({view: week, canEdit: true, formMode: FORM_MODES.EDIT})
      expect(findByTestId(wrapper, 'grid-save').exists()).toBe(true)
    })
  })

  // A week or month with no dinners has nothing to grid: the table's own #empty slot is the
  // one empty state, so the synthetic power row must not keep the table populated.
  describe('period without dinners', () => {
    const weekAroundToday = {
      start: startOfDay(addDays(new Date(), -3)),
      end: startOfDay(addDays(new Date(), 3))
    }

    it.each([
      {view: week, text: 'Ingen middage denne uge'},
      {view: month, text: 'Ingen middage denne måned'}
    ])('renders the $view empty state instead of an empty grid', async ({view, text}) => {
      const wrapper = await mount({view, dateRange: weekAroundToday, dinnerEvents: []})

      expect(wrapper.text()).toContain(text)
      expect(wrapper.text()).not.toContain('Anna')
    })

    it('grids the household again as soon as the period holds a dinner', async () => {
      const wrapper = await mount({
        view: week,
        dateRange: weekAroundToday,
        dinnerEvents: [DinnerEventFactory.dinnerEventAt(1, 1)]
      })

      expect(wrapper.text()).not.toContain('Ingen middage')
      expect(wrapper.text()).toContain('Anna')
    })
  })

  // While the range's bookings reload, UTable runs its loading bar over the rows; a table without rows shows the loading row
  describe('while the bookings of the range reload', () => {
    const dinner = DinnerEventFactory.dinnerEventAt(1, 1)
    const mountLoading = (loading: boolean, dinnerEvents: DinnerEventDisplay[] = [dinner]) => mount({
      view: week,
      dateRange: {start: addDays(dinner.date, -3), end: addDays(dinner.date, 3)},
      dinnerEvents,
      loading
    })

    // The expected bookings' read runs the same bar; it lands at once here
    it.each([true, false])('GIVEN loading=%s THEN the table receives it, and the household\'s cells and the sum row stay', async (loading) => {
      const wrapper = await mountLoading(loading)

      await vi.waitFor(() => expect(isTableLoading(wrapper)).toBe(loading))
      // The legend draws its own mode samples: a grid cell carries the dinner's id in its name
      expect(wrapper.findAllComponents(DinnerModeSelector).filter(c => String(c.props('name')).endsWith(`-${dinner.id}`))).toHaveLength(mockHousehold.inhabitants.length + 1)
      expect(wrapper.find('tfoot').exists()).toBe(true)
      expect(findLoadingRow(wrapper).exists()).toBe(false)
    })

    it('GIVEN a range without dinners while loading THEN the loading row stands where the empty state would', async () => {
      const wrapper = await mountLoading(true, [])

      expect(findLoadingRow(wrapper).text()).toContain('Henter bookinger...')
      expect(wrapper.text()).not.toContain('Ingen middage denne uge')
    })
  })

  // A guest ticket is booked by an inhabitant but is not that inhabitant's own dinner
  describe('guest tickets in the inhabitant rows', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const OrderState = OrderStateSchema.enum
    const anna = mockHousehold.inhabitants[0]!
    const lars = mockHousehold.inhabitants[1]!
    const event = DinnerEventFactory.dinnerEventAt(1, 1)

    const order = (id: number, inhabitantId: number, isGuestTicket: boolean, dinnerMode: DinnerMode, state: OrderState = OrderState.BOOKED, dinnerEventId: number = event.id): OrderDisplay =>
      OrderFactory.defaultOrder(undefined, {id, inhabitantId, dinnerEventId, isGuestTicket, dinnerMode, state})

    const mountWeek = (orders: OrderDisplay[], dinnerEvent: DinnerEventDisplay = event, formMode: FormMode = FORM_MODES.VIEW) => mount({
      view: week,
      dateRange: {start: addDays(dinnerEvent.date, -3), end: addDays(dinnerEvent.date, 3)},
      dinnerEvents: [dinnerEvent],
      orders,
      formMode
    })

    const selectorProps = (wrapper: Awaited<ReturnType<typeof mount>>, name: string) =>
      wrapper.findAllComponents(DinnerModeSelector).find(c => c.props('name') === name)!.props()

    const guestCellName = (wrapper: Awaited<ReturnType<typeof mount>>): string =>
      wrapper.findAllComponents(DinnerModeSelector).map(c => c.props('name') as string).find(name => name.startsWith('guest-'))!

    const countOf = (wrapper: Awaited<ReturnType<typeof mount>>, testId: string): number => {
      const badge = findByTestId(wrapper, testId)
      return badge.exists() ? Number(badge.text()) : 0
    }

    describe.each([
      {
        desc: 'guest-only ticket',
        orders: [order(7, anna.id, true, DinnerMode.TAKEAWAY)],
        annaMode: DinnerMode.NONE,
        power: {modelValue: DinnerMode.DINEIN, consensus: false}
      },
      {
        desc: 'regular order',
        orders: [order(42, anna.id, false, DinnerMode.TAKEAWAY)],
        annaMode: DinnerMode.TAKEAWAY,
        power: {modelValue: DinnerMode.DINEIN, consensus: false}
      },
      {
        desc: 'guest ticket listed before the regular order',
        orders: [order(7, anna.id, true, DinnerMode.TAKEAWAY), order(42, anna.id, false, DinnerMode.DINEINLATE), order(43, lars.id, false, DinnerMode.DINEINLATE)],
        annaMode: DinnerMode.DINEINLATE,
        power: {modelValue: DinnerMode.DINEIN, consensus: false}
      },
      {
        desc: 'regular order matching the family and the guest ticket',
        orders: [order(7, anna.id, true, DinnerMode.DINEINLATE), order(42, anna.id, false, DinnerMode.DINEINLATE), order(43, lars.id, false, DinnerMode.DINEINLATE)],
        annaMode: DinnerMode.DINEINLATE,
        power: {modelValue: DinnerMode.DINEINLATE, consensus: true}
      }
    ])('Anna holds a $desc', ({orders, annaMode, power}) => {
      it(`renders Anna's cell as ${annaMode} and hands the power row ${power.modelValue} with consensus ${power.consensus}`, async () => {
        const wrapper = await mountWeek(orders)
        expect(selectorProps(wrapper, `cell-${anna.id}-${event.id}`).modelValue).toBe(annaMode)
        expect(selectorProps(wrapper, `power-${event.id}`)).toMatchObject(power)
      })
    })

    // The name cell counts over the dinners in view
    const later = DinnerEventFactory.dinnerEventAt(5, 2)
    const place = (id: number, dinnerEventId: number, isGuestTicket = false): TicketWaitlistDetail =>
      WaitlistFactory.defaultEntry({id, inhabitantId: anna.id, dinnerEventId, isGuestTicket})
    const mountCounts = (orders: OrderDisplay[], waitlistEntries: TicketWaitlistDetail[]) => mount({
      view: week,
      dateRange: {start: addDays(event.date, -3), end: addDays(event.date, 3)},
      dinnerEvents: [event, later],
      orders,
      waitlistEntries
    })
    const countCases: {desc: string, orders: OrderDisplay[], places: TicketWaitlistDetail[], counts: {total: number, released: number, queued: number}}[] = [
      {desc: 'guest tickets only', orders: [order(7, anna.id, true, DinnerMode.DINEIN), order(8, anna.id, true, DinnerMode.DINEIN, OrderState.RELEASED)], places: [], counts: {total: 0, released: 0, queued: 0}},
      {desc: 'a released regular order and guest tickets', orders: [order(7, anna.id, true, DinnerMode.DINEIN), order(8, anna.id, true, DinnerMode.DINEIN, OrderState.RELEASED), order(42, anna.id, false, DinnerMode.DINEIN, OrderState.RELEASED)], places: [], counts: {total: 1, released: 1, queued: 0}},
      {desc: 'a ticket and a place on the waiting list', orders: [order(42, anna.id, false, DinnerMode.DINEIN)], places: [place(9, later.id)], counts: {total: 1, released: 0, queued: 1}},
      {desc: 'places on the waiting list only', orders: [], places: [place(9, event.id), place(10, later.id)], counts: {total: 0, released: 0, queued: 2}},
      {desc: 'a guest\'s place on the waiting list', orders: [], places: [place(11, later.id, true)], counts: {total: 0, released: 0, queued: 0}}
    ]

    it.each(countCases)('counts Anna\'s own tickets, the released among them and her own places on the waiting list when she holds $desc', async ({orders, places, counts}) => {
      const wrapper = await mountCounts(orders, places)
      expect({
        total: countOf(wrapper, `inhabitant-ticket-count-${anna.id}`),
        released: countOf(wrapper, `inhabitant-released-count-${anna.id}`),
        queued: countOf(wrapper, `inhabitant-waitlist-count-${anna.id}`)
      }).toEqual(counts)
    })

    it('the waiting-list count wears the waiting list\'s glyph and colour, in the name cell beside the ticket count', async () => {
      const wrapper = await mountCounts([order(42, anna.id, false, DinnerMode.DINEIN)], [place(9, later.id)])
      const waitlistBadge = wrapper.findAllComponents({name: 'UBadge'}).find(badge => badge.attributes('data-testid') === `inhabitant-waitlist-count-${anna.id}`)!

      expect(waitlistBadge.props('color')).toBe(ORDER_STATE_COLORS[TicketState.queued])
      expect(waitlistBadge.findComponent({name: 'UIcon'}).props('name')).toBe(ICONS.waitlist)
      expect(findByTestId(wrapper, `inhabitant-ticket-count-${anna.id}`).element.parentElement).toBe(waitlistBadge.element.parentElement)
    })

    describe('guest cells in edit mode', () => {
      const future = DinnerEventFactory.dinnerEventAt(2, 60)
      const past = DinnerEventFactory.dinnerEventAt(3, -2)
      const guest = order(7, anna.id, true, DinnerMode.DINEIN, OrderState.BOOKED, future.id)
      const annaOwn = order(42, anna.id, false, DinnerMode.DINEIN, OrderState.BOOKED, future.id)
      const annaCell = `cell-${anna.id}-${future.id}`

      const mountEdit = () => mountWeek([guest, annaOwn], future, FORM_MODES.EDIT)

      it('renders an editable guest cell, and keeps the booker\'s own cell untouched when the guest cell changes', async () => {
        const wrapper = await mountEdit()
        const guestCell = guestCellName(wrapper)
        expect(selectorProps(wrapper, guestCell)).toMatchObject({formMode: FORM_MODES.EDIT, interaction: 'toggle'})

        await clickByTestId(wrapper, guestCell)

        expect(selectorProps(wrapper, guestCell)).toMatchObject({isModified: true})
        expect(selectorProps(wrapper, guestCell).modelValue).not.toBe(DinnerMode.DINEIN)
        expect(selectorProps(wrapper, annaCell)).toMatchObject({modelValue: DinnerMode.DINEIN, isModified: false})
      })

      it('emits the regular and the guest changes in one save', async () => {
        const wrapper = await mountEdit()
        const guestCell = guestCellName(wrapper)
        await clickByTestId(wrapper, guestCell)
        await clickByTestId(wrapper, annaCell)
        const guestMode = selectorProps(wrapper, guestCell).modelValue
        const annaMode = selectorProps(wrapper, annaCell).modelValue

        await clickByTestId(wrapper, 'grid-save')

        expect(wrapper.emitted('save')?.[0]).toEqual([{
          intents: [{inhabitantId: anna.id, dinnerEventId: future.id, dinnerMode: annaMode}],
          guestIntents: [{guestOrders: [guest], dinnerMode: guestMode}],
          entryIntents: []
        }])
      })

      describe('power mode with a guest differing from the family', () => {
        const differingGuest = order(7, anna.id, true, DinnerMode.DINEINLATE, OrderState.BOOKED, future.id)
        const family = [annaOwn, order(43, lars.id, false, DinnerMode.DINEIN, OrderState.BOOKED, future.id)]
        const powerCell = `power-${future.id}`

        it('shows no consensus while the family is uniform; setting the power mode carries it into the guest draft, regains consensus, and saves the guest intent alongside the family\'s', async () => {
          const wrapper = await mountWeek([differingGuest, ...family], future, FORM_MODES.EDIT)
          expect(selectorProps(wrapper, powerCell)).toMatchObject({modelValue: DinnerMode.DINEIN, consensus: false})

          wrapper.findAllComponents(DinnerModeSelector).find(c => c.props('name') === powerCell)!.vm.$emit('update:modelValue', DinnerMode.TAKEAWAY)
          await nextTick()
          expect(selectorProps(wrapper, guestCellName(wrapper))).toMatchObject({modelValue: DinnerMode.TAKEAWAY, isModified: true})
          expect(selectorProps(wrapper, powerCell)).toMatchObject({modelValue: DinnerMode.TAKEAWAY, consensus: true})

          await clickByTestId(wrapper, 'grid-save')

          expect(wrapper.emitted('save')?.[0]).toEqual([{
            intents: [anna, lars].map(({id}) => ({inhabitantId: id, dinnerEventId: future.id, dinnerMode: DinnerMode.TAKEAWAY})),
            guestIntents: [{guestOrders: [differingGuest], dinnerMode: DinnerMode.TAKEAWAY}],
            entryIntents: []
          }])
        })
      })

      it('keeps a past dinner\'s guest cell view-only', async () => {
        const wrapper = await mountWeek([order(8, anna.id, true, DinnerMode.DINEIN, OrderState.BOOKED, past.id)], past, FORM_MODES.EDIT)
        expect(selectorProps(wrapper, guestCellName(wrapper)).formMode).toBe(FORM_MODES.VIEW)
      })

      it('locks a guest cell by the deadline rules of its booker\'s cell', async () => {
        const wrapper = await mountWeek([order(7, anna.id, true, DinnerMode.DINEIN), order(42, anna.id, false, DinnerMode.DINEIN)], event, FORM_MODES.EDIT)
        const bookerModes = selectorProps(wrapper, `cell-${anna.id}-${event.id}`).enabledModes
        // A booked ticket can always be given up
        expect(bookerModes).toContain(DinnerMode.NONE)
        expect(selectorProps(wrapper, guestCellName(wrapper)).enabledModes).toEqual(bookerModes)
      })
    })
  })

  describe('queued cells', () => {
    const {DinnerModeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const anna = mockHousehold.inhabitants[0]!
    const closedDinner = DinnerEventFactory.dinnerEventAt(1, 1)
    const annaQueued = WaitlistFactory.defaultEntry({id: 9, inhabitantId: anna.id, dinnerEventId: closedDinner.id, position: 3, dinnerMode: DinnerMode.TAKEAWAY})
    const mountQueued = (formMode: FormMode = FORM_MODES.VIEW, deadlineOverrides: Partial<typeof deadlines> = {}) => mount({
      view: week,
      dateRange: {start: addDays(closedDinner.date, -3), end: addDays(closedDinner.date, 3)},
      dinnerEvents: [closedDinner],
      waitlistEntries: [annaQueued],
      formMode,
      deadlines: {...deadlines, ...deadlineOverrides}
    })
    const queuedCellName = `cell-${anna.id}-${closedDinner.id}`
    const queuedCell = (wrapper: Awaited<ReturnType<typeof mount>>) =>
      wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === queuedCellName)!

    // What a person can do in the grid is what the day view lets them do: in edit mode the queued cell cycles its modes
    it.each([
      {formMode: FORM_MODES.VIEW, cell: {formMode: FORM_MODES.VIEW}, access: 'read-only'},
      {formMode: FORM_MODES.EDIT, cell: {formMode: FORM_MODES.EDIT, interaction: 'toggle'}, access: 'editable'}
    ])('in $formMode mode the queued cell shows the wished mode ghosted under the queue marker, $access', async ({formMode, cell}) => {
      const wrapper = await mountQueued(formMode)

      expect(findByTestId(wrapper, `grid-waitlist-${anna.id}-${closedDinner.id}`).exists()).toBe(true)
      expect(queuedCell(wrapper).props()).toMatchObject({modelValue: DinnerMode.TAKEAWAY, ghost: true, ...cell})
    })

    // A wish on the waiting list is no booking: untouched it keeps the ghost face in edit mode too
    it('in edit mode an untouched queued cell renders its wish as a ghost under the queue marker, and a click trades the ghost for the modified accent', async () => {
      const wrapper = await mountQueued(FORM_MODES.EDIT)
      const {color, variant} = COMPONENTS.waitlist.ghostBadge

      expect(findByTestId(wrapper, `grid-waitlist-${anna.id}-${closedDinner.id}`).exists()).toBe(true)
      expect(queuedCell(wrapper).props()).toMatchObject({ghost: true, isModified: false})
      expect(queuedCell(wrapper).findComponent({name: 'UButton'}).props()).toMatchObject({color, variant})

      await clickByTestId(wrapper, queuedCellName)

      expect(queuedCell(wrapper).props()).toMatchObject({ghost: false, isModified: true})
    })

    it('the legend explains the queue marker', async () => {
      const wrapper = await mountQueued()

      expect(findByTestId(wrapper, 'dinner-mode-legend-waitlist').exists()).toBe(true)
    })

    // With the mode locked the place keeps its wish or leaves the waiting list
    it('GIVEN a dinner after the deadline with the mode locked WHEN the queued cell is clicked in edit mode THEN it cycles Takeaway → Ingen → Takeaway', async () => {
      const wrapper = await mountQueued(FORM_MODES.EDIT, {canModifyOrders: () => false, canEditDiningMode: () => false})
      expect(queuedCell(wrapper).props()).toMatchObject({modelValue: DinnerMode.TAKEAWAY, interaction: 'toggle'})

      const modes: DinnerMode[] = []
      for (const _click of [1, 2]) {
        await clickByTestId(wrapper, queuedCellName)
        modes.push(queuedCell(wrapper).props('modelValue') as DinnerMode)
      }

      expect(modes).toEqual([DinnerMode.NONE, DinnerMode.TAKEAWAY])
    })
  })

  // The grid's rows follow its dinners on view; the waiting list it receives also covers the season's locked dinners
  describe('guest rows of dinners outside the week on view', () => {
    const anna = mockHousehold.inhabitants[0]!
    const inWeek = DinnerEventFactory.dinnerEventAt(1, 1)
    const outside = DinnerEventFactory.dinnerEventAt(6, 15)
    const entries = {
      inWeek: WaitlistFactory.defaultEntry({id: 41, inhabitantId: anna.id, dinnerEventId: inWeek.id, isGuestTicket: true}),
      outside: WaitlistFactory.defaultEntry({id: 42, inhabitantId: anna.id, dinnerEventId: outside.id, isGuestTicket: true})
    }
    const groups = {
      inWeek: OrderFactory.defaultOrder(undefined, {id: 71, inhabitantId: anna.id, dinnerEventId: inWeek.id, isGuestTicket: true}),
      outside: OrderFactory.defaultOrder(undefined, {id: 72, inhabitantId: anna.id, dinnerEventId: outside.id, isGuestTicket: true})
    }
    const groupRowId = (order: OrderDisplay) => `guest-group-${Object.keys(useBooking().groupGuestOrders([order]))[0]}`
    // The ids of the rows the grid hands its table
    const rowIdsOf = (wrapper: Awaited<ReturnType<typeof mount>>) =>
      (wrapper.findComponent({name: 'UTable'}).props('data') as {id: string | number}[]).map(row => row.id)

    it.each([
      {kind: 'queued guest', props: {waitlistEntries: [entries.inWeek, entries.outside]}, rowIds: () => ({kept: `guest-entry-${entries.inWeek.id}`, dropped: `guest-entry-${entries.outside.id}`})},
      {kind: 'placed guest group', props: {orders: [groups.inWeek, groups.outside]}, rowIds: () => ({kept: groupRowId(groups.inWeek), dropped: groupRowId(groups.outside)})}
    ])('GIVEN the week on view and a $kind on a dinner in it and one outside it THEN only the one in the week has a guest row', async ({props, rowIds}) => {
      const wrapper = await mount({
        view: week,
        dateRange: {start: addDays(inWeek.date, -3), end: addDays(inWeek.date, 3)},
        dinnerEvents: [inWeek, outside],
        ...props
      })
      const {kept, dropped} = rowIds()

      expect(rowIdsOf(wrapper)).toContain(kept)
      expect(rowIdsOf(wrapper)).not.toContain(dropped)
    })
  })

  // The power cell reaches every place the household holds on the dinner: Lars's own and Anna's queued guest's
  describe('the power cell over the household\'s places on the waiting list', () => {
    const {DinnerModeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const [anna, lars] = mockHousehold.inhabitants as [typeof mockHousehold.inhabitants[number], typeof mockHousehold.inhabitants[number]]
    const closedDinner = DinnerEventFactory.dinnerEventAt(1, 1)
    const powerCell = `power-${closedDinner.id}`
    const annaTicket = OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: anna.id, dinnerEventId: closedDinner.id, dinnerMode: DinnerMode.TAKEAWAY})
    const larsQueued = WaitlistFactory.defaultEntry({id: 11, inhabitantId: lars.id, dinnerEventId: closedDinner.id, dinnerMode: DinnerMode.TAKEAWAY})
    const guestQueued = (dinnerMode: DinnerMode) => WaitlistFactory.defaultEntry({id: 28, inhabitantId: anna.id, dinnerEventId: closedDinner.id, isGuestTicket: true, dinnerMode})
    const mountWaiting = (guestEntry: TicketWaitlistDetail, formMode: FormMode = FORM_MODES.VIEW) => mount({
      view: week,
      dateRange: {start: addDays(closedDinner.date, -3), end: addDays(closedDinner.date, 3)},
      dinnerEvents: [closedDinner],
      orders: [annaTicket],
      waitlistEntries: [larsQueued, guestEntry],
      formMode
    })
    const powerSelector = (wrapper: Awaited<ReturnType<typeof mount>>) =>
      wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === powerCell)!

    it.each([
      {guestWish: DinnerMode.TAKEAWAY, power: {modelValue: DinnerMode.TAKEAWAY, consensus: true}},
      {guestWish: DinnerMode.DINEINLATE, power: {consensus: false}}
    ])('GIVEN Anna\'s ticket and Lars\'s place on Takeaway and a queued guest wishing $guestWish THEN the power cell counts the wishes in its consensus', async ({guestWish, power}) => {
      const wrapper = await mountWaiting(guestQueued(guestWish))

      expect(powerSelector(wrapper).props()).toMatchObject(power)
    })

    it('WHEN the power cell is set to Ingen and saved THEN Lars\'s intent names his place and the queued guest\'s place leaves', async () => {
      const guestEntry = guestQueued(DinnerMode.TAKEAWAY)
      const wrapper = await mountWaiting(guestEntry, FORM_MODES.EDIT)

      powerSelector(wrapper).vm.$emit('update:modelValue', DinnerMode.NONE)
      await nextTick()
      expect(powerSelector(wrapper).props()).toMatchObject({modelValue: DinnerMode.NONE, consensus: true})

      await clickByTestId(wrapper, 'grid-save')

      expect(wrapper.emitted('save')?.[0]).toEqual([{
        intents: [
          {inhabitantId: anna.id, dinnerEventId: closedDinner.id, dinnerMode: DinnerMode.NONE},
          {inhabitantId: lars.id, dinnerEventId: closedDinner.id, dinnerMode: DinnerMode.NONE, waitlistEntryId: larsQueued.id}
        ],
        guestIntents: [],
        entryIntents: [{entry: guestEntry, dinnerMode: DinnerMode.NONE}]
      }])
    })

    // As an expected cell does, the queued cell ghosts its wish until a draft takes its place
    it('WHEN the power cell is set to Ingen THEN Lars\'s queued cell shows the draft with the modified accent under the queue marker', async () => {
      const wrapper = await mountWaiting(guestQueued(DinnerMode.TAKEAWAY), FORM_MODES.EDIT)
      const larsCell = () => wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === `cell-${lars.id}-${closedDinner.id}`)!

      powerSelector(wrapper).vm.$emit('update:modelValue', DinnerMode.NONE)
      await nextTick()

      expect(findByTestId(wrapper, `grid-waitlist-${lars.id}-${closedDinner.id}`).exists()).toBe(true)
      expect(larsCell().props()).toMatchObject({modelValue: DinnerMode.NONE, isModified: true, ghost: false, formMode: FORM_MODES.EDIT})
    })
  })

  // The power cell offers the modes every cell of its dinner may pick (powerOptions over each cell's getBookingOptions)
  describe('the power cell\'s modes', () => {
    const {DinnerModeSchema, OrderStateSchema} = useBookingValidation()
    const {TAKEAWAY, NONE} = DinnerModeSchema.enum
    const [anna, lars] = mockHousehold.inhabitants
    const dinner = DinnerEventFactory.dinnerEventAt(1, 1)
    // Anna holds her ticket on Takeaway, Lars has released his
    const orders = [
      OrderFactory.defaultOrder(undefined, {id: 201, inhabitantId: anna!.id, dinnerEventId: dinner.id, dinnerMode: TAKEAWAY, state: OrderStateSchema.enum.BOOKED}),
      OrderFactory.defaultOrder(undefined, {id: 202, inhabitantId: lars!.id, dinnerEventId: dinner.id, dinnerMode: NONE, state: OrderStateSchema.enum.RELEASED})
    ]

    it.each([
      {standing: 'before the deadline, every cell open', canModifyOrders: true, canEditDiningMode: true, modes: DINNER_MODE_ORDER},
      {standing: 'after the deadline with the mode locked', canModifyOrders: false, canEditDiningMode: false, modes: [NONE]}
    ])('GIVEN Anna\'s ticket on Takeaway and Lars\'s released, $standing, THEN the power cell offers $modes', async ({canModifyOrders, canEditDiningMode, modes}) => {
      const wrapper = await mount({
        view: week,
        dateRange: {start: addDays(dinner.date, -3), end: addDays(dinner.date, 3)},
        dinnerEvents: [dinner],
        orders,
        formMode: FORM_MODES.EDIT,
        deadlines: {...deadlines, canModifyOrders: () => canModifyOrders, canEditDiningMode: () => canEditDiningMode}
      })

      const powerCell = wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === `power-${dinner.id}`)!
      expect(powerCell.props('enabledModes')).toEqual(modes)
    })
  })

  // Nothing lands on a cancelled dinner: its header names the state, and its cells show the tickets cancelled, offering no mode
  describe('a cancelled dinner', () => {
    const {DinnerModeSchema, DinnerStateSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const anna = mockHousehold.inhabitants[0]!
    // Tomorrow, past the booking deadline, where a dinner that goes ahead carries the lock chip
    const cancelled = {...DinnerEventFactory.dinnerEventAt(1, 1), state: DinnerStateSchema.enum.CANCELLED}
    const annaTicket = OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: anna.id, dinnerEventId: cancelled.id, dinnerMode: DinnerMode.DINEIN})
    const mountCancelled = (formMode: FormMode = FORM_MODES.VIEW) => mount({
      view: week,
      dateRange: {start: addDays(cancelled.date, -3), end: addDays(cancelled.date, 3)},
      dinnerEvents: [cancelled],
      orders: [annaTicket],
      formMode
    })
    const inHeader = (wrapper: Awaited<ReturnType<typeof mount>>, name: string) => {
      const header = wrapper.find('thead').element
      return wrapper.findAllComponents({name}).filter(component => header.contains(component.element))
    }

    it('GIVEN a cancelled dinner THEN its column header shows the Aflyst badge in place of the lock chip', async () => {
      const wrapper = await mountCancelled()

      const {label, color, icon} = DINNER_STATE_BADGES.CANCELLED
      const badge = inHeader(wrapper, 'UBadge').find(candidate => candidate.props('color') === color && candidate.props('icon') === icon)
      expect(badge?.text()).toContain(label)
      expect(inHeader(wrapper, 'UChip')).toHaveLength(0)
    })

    it.each([FORM_MODES.VIEW, FORM_MODES.EDIT])('GIVEN Anna\'s ticket on a cancelled dinner in %s mode THEN her cell shows it cancelled and offers no mode', async (formMode) => {
      const wrapper = await mountCancelled(formMode)

      const annaCell = wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === `cell-${anna.id}-${cancelled.id}`)!
      expect(annaCell.props()).toMatchObject({modelValue: DinnerMode.DINEIN, cancelled: true, enabledModes: [], formMode: FORM_MODES.VIEW})
    })
  })

  // The column header counts the household's own released tickets on a locked dinner: the household pays for them until they are sold
  describe('lock chip in the column header', () => {
    const {OrderStateSchema} = useBookingValidation()
    const supply = (total: number): ReleasedTicketCounts => ({...EMPTY_RELEASED_TICKET_COUNTS, total, formatted: total > 0 ? `${total}V` : '-'})
    const released = (id: number, dinnerEventId: number): OrderDisplay =>
      OrderFactory.defaultOrder(undefined, {id, inhabitantId: 1, dinnerEventId, state: OrderStateSchema.enum.RELEASED})
    const mountWeekOf = (dinnerEvent: DinnerEventDisplay, orders: OrderDisplay[], lockStatus: Map<number, ReleasedTicketCounts | null>, loading = false) => mount({
      view: week,
      dateRange: {start: addDays(dinnerEvent.date, -3), end: addDays(dinnerEvent.date, 3)},
      dinnerEvents: [dinnerEvent],
      orders,
      lockStatus,
      loading
    })
    // A standalone UChip renders its number in its base slot
    const headerChip = (wrapper: Awaited<ReturnType<typeof mount>>) => wrapper.find('thead [data-slot="base"]')
    const lockedDinner = DinnerEventFactory.dinnerEventAt(1, 1)

    it.each([
      {desc: 'the household\'s own released tickets', own: 2, forSale: 2, text: '2'},
      {desc: 'no number while only other households sell tickets', own: 0, forSale: 3, text: ''}
    ])('shows $desc', async ({own, forSale, text}) => {
      const orders = Array.from({length: own}, (_, index) => released(900 + index, lockedDinner.id))
      const wrapper = await mountWeekOf(lockedDinner, orders, new Map([[lockedDinner.id, supply(forSale)]]))
      expect(headerChip(wrapper).text()).toBe(text)
    })

    it('carries no chip on a dinner open for booking', async () => {
      const wrapper = await mountWeekOf(DinnerEventFactory.dinnerEventAt(2, 60), [], new Map())
      expect(headerChip(wrapper).exists()).toBe(false)
    })

    // The chip counts the household's orders: it waits with the rows while they load
    it('carries no chip on a locked dinner while the bookings of the range load', async () => {
      const wrapper = await mountWeekOf(lockedDinner, [released(900, lockedDinner.id)], new Map([[lockedDinner.id, supply(1)]]), true)
      expect(headerChip(wrapper).exists()).toBe(false)
    })
  })
})

describe('BookingGridView add-guest button', () => {
  const future = DinnerEventFactory.dinnerEventAt(2, 60)
  const editProps = {
    view: week,
    dateRange: {start: addDays(future.date, -3), end: addDays(future.date, 3)},
    dinnerEvents: [future],
    formMode: FORM_MODES.EDIT,
    bookerId: mockHousehold.inhabitants[0]!.id
  }
  const mountEdit = () => mount(editProps)
  const addButton = (wrapper: Awaited<ReturnType<typeof mount>>) =>
    wrapper.findAllComponents({name: 'UButton'}).find(button => button.attributes('data-testid') === `guest-add-${future.id}`)!

  it('carries the chevron glyph', async () => {
    const wrapper = await mountEdit()
    expect(addButton(wrapper).props('icon')).toBe(ICONS.chevronDown)
  })

  // The chevron renders while the guest add row has a mode: before and after the booking deadline, never on a dinner
  // nobody can book
  describe('the dinner\'s standing', () => {
    const {CANCELLED} = useBookingValidation().DinnerStateSchema.enum
    const open = {canModifyOrders: () => true, canEditDiningMode: () => true}
    const afterDeadline = {canModifyOrders: () => false, canEditDiningMode: () => true}

    it.each([
      {standing: 'before the booking deadline', dinner: future, deadlineOverrides: open, renders: true},
      {standing: 'after the booking deadline', dinner: DinnerEventFactory.dinnerEventAt(4, 1), deadlineOverrides: afterDeadline, renders: true},
      {standing: 'a past dinner', dinner: DinnerEventFactory.dinnerEventAt(5, -2), deadlineOverrides: open, renders: false},
      {standing: 'a CANCELLED dinner', dinner: {...future, state: CANCELLED}, deadlineOverrides: open, renders: false}
    ])('GIVEN $standing THEN the chevron renders: $renders', async ({dinner, deadlineOverrides, renders}) => {
      const wrapper = await mount({
        ...editProps,
        dateRange: {start: addDays(dinner.date, -3), end: addDays(dinner.date, 3)},
        dinnerEvents: [dinner],
        deadlines: {...deadlines, ...deadlineOverrides}
      })

      expect(findByTestId(wrapper, `guest-add-${dinner.id}`).exists()).toBe(renders)
    })
  })

  // The day columns widen the table past a phone, and the table scrolls sideways in its own box
  it.each(VIEWPORTS)('at $viewport width the chevron opens the guest form in the row below, kept to the part of the table\'s box in view', async ({isMd}) => {
    const wrapper = await mountWithTooltipProvider(BookingGridView, {props: {...baseProps, ...editProps}, isMd})

    await clickByTestId(wrapper, `guest-add-${future.id}`)

    const form = wrapper.findComponent(GuestBookingForm)
    expect(form.props('dinnerEvent')).toEqual(future)
    // GuestBookingForm renders several roots; its UForm sits directly in the panel
    const panel = form.findComponent({name: 'UForm'}).element.parentElement!
    expect([...panel.classList]).toEqual(expect.arrayContaining(COMPONENTS.bookingGrid.expandedPanel.split(' ')))
  })

  // The edit mode's action bar rides under the rows as the guest form does: kept to the box in view, its buttons on screen
  it.each(VIEWPORTS)('at $viewport width edit mode keeps the preview and the Annuller/Opdater buttons to the part of the table\'s box in view', async ({isMd}) => {
    const wrapper = await mountWithTooltipProvider(BookingGridView, {props: {...baseProps, ...editProps}, isMd})

    // The bar's cell spans the table; its inner panel holds the preview and the buttons
    const panel = findByTestId(wrapper, 'grid-save').element.closest('td')!.firstElementChild!
    expect([...panel.classList]).toEqual(expect.arrayContaining(COMPONENTS.bookingGrid.actionPanel.split(' ')))
    expect(panel.contains(wrapper.findComponent(ActionPreview).element)).toBe(true)
    expect(['grid-cancel', 'grid-save'].filter(button => !panel.contains(findByTestId(wrapper, button).element))).toEqual([])
  })

  describe('with the guest form open on one of two dinners', () => {
    const later = DinnerEventFactory.dinnerEventAt(3, 62)
    const twoDinners = {...editProps, dateRange: {start: addDays(future.date, -3), end: addDays(later.date, 3)}, dinnerEvents: [future, later]}

    it.each([
      {desc: 'its own chevron', tapped: later, outcome: 'closes', open: undefined},
      {desc: 'the other dinner\'s chevron', tapped: future, outcome: 'switches to that dinner in one tap', open: future}
    ])('WHEN $desc is tapped THEN the form $outcome', async ({tapped, open}) => {
      const wrapper = await mountWithTooltipProvider(BookingGridView, {props: {...baseProps, ...twoDinners}})
      await clickByTestId(wrapper, `guest-add-${later.id}`)
      expect(wrapper.findComponent(GuestBookingForm).props('dinnerEvent')).toEqual(later)

      await clickByTestId(wrapper, `guest-add-${tapped.id}`)

      const form = wrapper.findComponent(GuestBookingForm)
      expect(form.exists() ? form.props('dinnerEvent') : undefined).toEqual(open)
    })
  })
})

// The grid's draft and its cells without an order read the server's dry run
describe('BookingGridView and the server\'s dry run', () => {
  const {DinnerModeSchema, BookingActionSchema} = useBookingValidation()
  const DinnerMode = DinnerModeSchema.enum
  const Action = BookingActionSchema.enum
  const anna = mockHousehold.inhabitants[0]!
  const lars = mockHousehold.inhabitants[1]!
  const householdOrder = mockHousehold.inhabitants.map(({id}) => id)
  const future = DinnerEventFactory.dinnerEventAt(2, 60)
  const later = DinnerEventFactory.dinnerEventAt(3, 62)
  const dinnerEvents = [future, later]
  const mountWeek = (formMode: FormMode = FORM_MODES.VIEW, orders: OrderDisplay[] = []) => mount({
    view: week,
    dateRange: {start: addDays(future.date, -3), end: addDays(later.date, 3)},
    dinnerEvents,
    orders,
    formMode
  })
  type Mounted = Awaited<ReturnType<typeof mount>>
  const cell = (wrapper: Mounted, inhabitantId: number, dinnerEventId: number) =>
    wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === `cell-${inhabitantId}-${dinnerEventId}`)!
  const previews = () => scaffold.sent.filter(({body}) => body.orders.length > 0)
  const expectedReads = () => scaffold.sent.filter(({body}) => body.orders.length === 0)
  const resultOf = (inhabitant: typeof anna, dinnerEventId: number, action: string, dinnerMode: DinnerMode = DinnerMode.DINEIN) =>
    OrderFactory.defaultBookingResult({inhabitantId: inhabitant.id, inhabitantName: inhabitant.name, dinnerEventId, dinnerMode, action: BookingActionSchema.parse(action)})
  // Anna is expected on both dinners; Lars, who cancelled earlier, is left out
  const annaExpected = () => OrderFactory.defaultScaffoldOrdersResponse({results: [resultOf(anna, future.id, Action.BOOK), resultOf(anna, later.id, Action.BOOK)]})
  const landed = async (wrapper: Mounted) => {
    await vi.waitFor(() => expect(expectedReads().length).toBeGreaterThan(0))
    await vi.waitFor(() => expect(isTableLoading(wrapper)).toBe(false))
  }

  describe('the expected bookings', () => {
    it('reads the dry run with no orders on the dinners on view and shows Anna\'s expected cells outlined, Lars\'s on Ingen, with the legend entry', async () => {
      scaffold.answers.expected = annaExpected
      const wrapper = await mountWeek()
      await landed(wrapper)

      expect(expectedReads()[0]).toEqual({query: {adminBypass: 'false', preview: 'true'}, body: {householdId: mockHousehold.id, dinnerEventIds: [future.id, later.id], orders: []}})
      dinnerEvents.forEach(({id}) => {
        expect(cell(wrapper, anna.id, id).props()).toMatchObject({modelValue: DinnerMode.DINEIN, expected: true})
        expect(cell(wrapper, lars.id, id).props()).toMatchObject({modelValue: DinnerMode.NONE, expected: false})
      })
      expect(findByTestId(wrapper, 'dinner-mode-legend-expected').exists()).toBe(true)
    })

    it('an expected cell ghosts its mode on the expected token: outlined on the waiting list\'s neutral, in the muted ink', async () => {
      scaffold.answers.expected = annaExpected
      const wrapper = await mountWeek()
      await landed(wrapper)

      const {color, variant, ink} = COMPONENTS.bookingGrid.expectedBadge
      const expectedCell = cell(wrapper, anna.id, future.id)
      expect(expectedCell.findComponent({name: 'UBadge'}).props()).toMatchObject({color, variant})
      expect(expectedCell.findComponent({name: 'UIcon'}).classes()).toEqual(expect.arrayContaining(ink.split(' ')))
    })

    // The legend lists the expected booking as a standing entry, also while no cell is expected
    it('an order supersedes the expected booking, and without an expected cell the legend still explains it', async () => {
      scaffold.answers.expected = () => OrderFactory.defaultScaffoldOrdersResponse({results: [resultOf(anna, future.id, Action.BOOK)]})
      const annaOrder = OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: anna.id, dinnerEventId: future.id, dinnerMode: DinnerMode.TAKEAWAY})
      const wrapper = await mountWeek(FORM_MODES.VIEW, [annaOrder])
      await landed(wrapper)

      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: DinnerMode.TAKEAWAY, expected: false})
      expect(findByTestId(wrapper, 'dinner-mode-legend-expected').exists()).toBe(true)
    })

    it('the table\'s loading bar runs while the read loads', async () => {
      let land: () => void = () => {}
      const held = new Promise<void>(resolve => {
        land = resolve
      })
      scaffold.answers.expected = async () => {
        await held
        return annaExpected()
      }
      const wrapper = await mountWeek()

      await vi.waitFor(() => expect(isTableLoading(wrapper)).toBe(true))
      land()
      await vi.waitFor(() => expect(isTableLoading(wrapper)).toBe(false))
      expect(cell(wrapper, anna.id, future.id).props('expected')).toBe(true)
    })

    // The power cell reads the modes the cells show: an expected cell counts its expected mode
    it.each([
      {desc: 'Anna and Lars expected on Takeaway', expected: () => OrderFactory.defaultScaffoldOrdersResponse({results: [anna, lars].flatMap(inhabitant => dinnerEvents.map(({id}) => resultOf(inhabitant, id, Action.BOOK, DinnerMode.TAKEAWAY)))}), power: {modelValue: DinnerMode.TAKEAWAY, consensus: true}},
      {desc: 'Anna expected and Lars left out', expected: annaExpected, power: {consensus: false}}
    ])('GIVEN $desc THEN the power cell reads the consensus of the modes the cells show', async ({expected, power}) => {
      scaffold.answers.expected = expected
      const wrapper = await mountWeek()
      await landed(wrapper)

      dinnerEvents.forEach(({id}) => expect(wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === `power-${id}`)!.props()).toMatchObject(power))
    })

    // In edit mode a plan stays a ghost until it is touched: the first click adopts the plan as the person's draft
    it('GIVEN Anna\'s plan in edit mode WHEN her cell is clicked twice THEN it shows the plan until the first click adopts it as a draft, and the second moves to the next mode', async () => {
      scaffold.answers.expected = annaExpected
      const wrapper = await mountWeek(FORM_MODES.EDIT)
      await landed(wrapper)
      const annaCell = `cell-${anna.id}-${future.id}`
      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: DinnerMode.DINEIN, expected: true, isModified: false, formMode: FORM_MODES.EDIT})

      await clickByTestId(wrapper, annaCell)
      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: DinnerMode.DINEIN, expected: false, isModified: true})

      await clickByTestId(wrapper, annaCell)
      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: DinnerMode.DINEINLATE, expected: false, isModified: true})
    })

    it('GIVEN Anna and Lars planned on Takeaway in edit mode WHEN the power cell is clicked once and saved THEN it adopts the plan as one draft per person and saves them', async () => {
      scaffold.answers.expected = () => OrderFactory.defaultScaffoldOrdersResponse({results: [anna, lars].flatMap(inhabitant => dinnerEvents.map(({id}) => resultOf(inhabitant, id, Action.BOOK, DinnerMode.TAKEAWAY)))})
      const wrapper = await mountWeek(FORM_MODES.EDIT)
      await landed(wrapper)
      const powerCell = `power-${future.id}`
      expect(wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === powerCell)!.props()).toMatchObject({modelValue: DinnerMode.TAKEAWAY, expected: true})

      await clickByTestId(wrapper, powerCell)
      for (const {id} of [anna, lars]) {
        expect(cell(wrapper, id, future.id).props()).toMatchObject({modelValue: DinnerMode.TAKEAWAY, expected: false, isModified: true})
      }

      await clickByTestId(wrapper, 'grid-save')
      expect(wrapper.emitted('save')?.[0]).toEqual([{
        intents: [anna, lars].map(({id}) => ({inhabitantId: id, dinnerEventId: future.id, dinnerMode: DinnerMode.TAKEAWAY})),
        guestIntents: [],
        entryIntents: []
      }])
    })
  })

  describe('the preview of the draft', () => {
    it('GIVEN no draft THEN no preview is asked for', async () => {
      const wrapper = await mountWeek(FORM_MODES.EDIT)
      await landed(wrapper)

      expect(previews()).toEqual([])
      expect(wrapper.findComponent(ActionPreview).props()).toMatchObject({days: [], pending: false})
    })

    it('WHEN a cell changes THEN the draft goes to the dry run once the clicks rest, the loader shows meanwhile, and the reply renders a day per dinner', async () => {
      const reply = OrderFactory.defaultScaffoldOrdersResponse({dinners: [{id: future.id, date: future.date}], results: [resultOf(lars, future.id, Action.BOOK, DinnerMode.DINEINLATE)]})
      scaffold.answers.preview = () => reply
      const wrapper = await mountWeek(FORM_MODES.EDIT)
      await landed(wrapper)

      await clickByTestId(wrapper, `cell-${lars.id}-${future.id}`)
      expect(wrapper.findComponent(ActionPreview).props('pending')).toBe(true)

      await vi.waitFor(() => expect(wrapper.findComponent(ActionPreview).props('days')).toEqual(formatPreviewLines(reply.scaffoldResult, householdOrder)))
      expect(previews()).toEqual([{
        query: {adminBypass: 'false', preview: 'true'},
        body: {householdId: mockHousehold.id, dinnerEventIds: [future.id], orders: [expect.objectContaining({inhabitantId: lars.id, dinnerEventId: future.id, dinnerMode: cell(wrapper, lars.id, future.id).props('modelValue')})]}
      }])
    })

    it('WHEN an expected cell is set to Ingen THEN the draft sends the bare Ingen and the reply previews the cancellation', async () => {
      scaffold.answers.expected = annaExpected
      scaffold.answers.preview = () => OrderFactory.defaultScaffoldOrdersResponse({dinners: [{id: future.id, date: future.date}], results: [resultOf(anna, future.id, Action.CANCEL, DinnerMode.NONE)]})
      const wrapper = await mountWeek(FORM_MODES.EDIT)
      await landed(wrapper)

      cell(wrapper, anna.id, future.id).vm.$emit('update:modelValue', DinnerMode.NONE)
      await nextTick()
      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: DinnerMode.NONE, isModified: true, expected: false})

      await vi.waitFor(() => expect(wrapper.findComponent(ActionPreview).props('days').flatMap(day => day.lines.map(line => line.text)))
        .toEqual([`${anna.name} frameldes`]))
      const [bareIngen] = previews().at(-1)!.body.orders
      expect(bareIngen).toMatchObject({inhabitantId: anna.id, dinnerEventId: future.id, dinnerMode: DinnerMode.NONE})
      expect(bareIngen).not.toHaveProperty('orderId')
    })
  })
})
