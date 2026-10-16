// @vitest-environment nuxt
import {describe, it, expect, beforeAll} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {findByTestId, clickByTestId} from '~~/tests/component/testHelpers'
import BookingGridView from '~/components/booking/BookingGridView.vue'
import DinnerModeSelector from '~/components/dinner/DinnerModeSelector.vue'
import {useBookingValidation, type DinnerEventDisplay, type DinnerMode, type OrderDisplay, type OrderState} from '~/composables/useBookingValidation'
import {FORM_MODES, type FormMode} from '~/types/form'
import {EMPTY_RELEASED_TICKET_COUNTS, type ReleasedTicketCounts} from '~/composables/useBooking'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {ICONS} from '~/composables/useTheSlopeDesignSystem'
import {addDays, startOfDay} from 'date-fns'

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
  view: 'day' as const,
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
    const wrapper = await mount({view: 'day'})
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
    const wrapper = await mount({view: 'week'})
    await findByTestId(wrapper, 'grid-edit').trigger('click')
    expect(wrapper.emitted('update:formMode')?.[0]).toEqual(['edit'])
  })

  describe('canEdit prop', () => {
    it('hides edit button when canEdit=false', async () => {
      const wrapper = await mount({view: 'week', canEdit: false})
      expect(findByTestId(wrapper, 'grid-edit').exists()).toBe(false)
    })

    it('hides save button when canEdit=false in edit mode', async () => {
      const wrapper = await mount({view: 'week', canEdit: false, formMode: 'edit'})
      expect(findByTestId(wrapper, 'grid-save').exists()).toBe(false)
    })

    it('shows save button when canEdit=true in edit mode', async () => {
      const wrapper = await mount({view: 'week', canEdit: true, formMode: 'edit'})
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
      {view: 'week' as const, text: 'Ingen middage denne uge'},
      {view: 'month' as const, text: 'Ingen middage denne måned'}
    ])('renders the $view empty state instead of an empty grid', async ({view, text}) => {
      const wrapper = await mount({view, dateRange: weekAroundToday, dinnerEvents: []})

      expect(wrapper.text()).toContain(text)
      expect(wrapper.text()).not.toContain('Anna')
    })

    it('grids the household again as soon as the period holds a dinner', async () => {
      const wrapper = await mount({
        view: 'week',
        dateRange: weekAroundToday,
        dinnerEvents: [DinnerEventFactory.dinnerEventAt(1, 1)]
      })

      expect(wrapper.text()).not.toContain('Ingen middage')
      expect(wrapper.text()).toContain('Anna')
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
      view: 'week',
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
      it(`renders Anna's cell as ${annaMode}`, async () => {
        const wrapper = await mountWeek(orders)
        expect(selectorProps(wrapper, `cell-${anna.id}-${event.id}`).modelValue).toBe(annaMode)
      })

      it(`hands the power row ${power.modelValue} with consensus ${power.consensus}`, async () => {
        const wrapper = await mountWeek(orders)
        expect(selectorProps(wrapper, `power-${event.id}`)).toMatchObject(power)
      })
    })

    it.each([
      {desc: 'guest tickets only', orders: [order(7, anna.id, true, DinnerMode.DINEIN), order(8, anna.id, true, DinnerMode.DINEIN, OrderState.RELEASED)], total: 0, released: 0},
      {desc: 'a released regular order and guest tickets', orders: [order(7, anna.id, true, DinnerMode.DINEIN), order(8, anna.id, true, DinnerMode.DINEIN, OrderState.RELEASED), order(42, anna.id, false, DinnerMode.DINEIN, OrderState.RELEASED)], total: 1, released: 1}
    ])('counts only Anna\'s own tickets when she holds $desc', async ({orders, total, released}) => {
      const wrapper = await mountWeek(orders)
      expect({
        total: countOf(wrapper, `inhabitant-ticket-count-${anna.id}`),
        released: countOf(wrapper, `inhabitant-released-count-${anna.id}`)
      }).toEqual({total, released})
    })

    describe('guest cells in edit mode', () => {
      const future = DinnerEventFactory.dinnerEventAt(2, 60)
      const past = DinnerEventFactory.dinnerEventAt(3, -2)
      const guest = order(7, anna.id, true, DinnerMode.DINEIN, OrderState.BOOKED, future.id)
      const annaOwn = order(42, anna.id, false, DinnerMode.DINEIN, OrderState.BOOKED, future.id)
      const annaCell = `cell-${anna.id}-${future.id}`

      const mountEdit = () => mountWeek([guest, annaOwn], future, FORM_MODES.EDIT)

      it('renders an editable guest cell', async () => {
        const wrapper = await mountEdit()
        expect(selectorProps(wrapper, guestCellName(wrapper))).toMatchObject({formMode: FORM_MODES.EDIT, interaction: 'toggle'})
      })

      it('keeps the booker\'s own cell untouched when the guest cell changes', async () => {
        const wrapper = await mountEdit()
        const guestCell = guestCellName(wrapper)
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
          guestIntents: [{guestOrders: [guest], dinnerMode: guestMode}]
        }])
      })

      describe('power mode with a guest differing from the family', () => {
        const differingGuest = order(7, anna.id, true, DinnerMode.DINEINLATE, OrderState.BOOKED, future.id)
        const family = [annaOwn, order(43, lars.id, false, DinnerMode.DINEIN, OrderState.BOOKED, future.id)]
        const powerCell = `power-${future.id}`

        const mountPowerSet = async (dinnerMode: DinnerMode) => {
          const wrapper = await mountWeek([differingGuest, ...family], future, FORM_MODES.EDIT)
          wrapper.findAllComponents(DinnerModeSelector).find(c => c.props('name') === powerCell)!.vm.$emit('update:modelValue', dinnerMode)
          await nextTick()
          return wrapper
        }

        it('shows no consensus while the family is uniform', async () => {
          const wrapper = await mountWeek([differingGuest, ...family], future, FORM_MODES.EDIT)
          expect(selectorProps(wrapper, powerCell)).toMatchObject({modelValue: DinnerMode.DINEIN, consensus: false})
        })

        it('carries the power mode into the guest draft and regains consensus', async () => {
          const wrapper = await mountPowerSet(DinnerMode.TAKEAWAY)
          expect(selectorProps(wrapper, guestCellName(wrapper))).toMatchObject({modelValue: DinnerMode.TAKEAWAY, isModified: true})
          expect(selectorProps(wrapper, powerCell)).toMatchObject({modelValue: DinnerMode.TAKEAWAY, consensus: true})
        })

        it('emits the guest intent alongside the family\'s in one save', async () => {
          const wrapper = await mountPowerSet(DinnerMode.TAKEAWAY)
          await clickByTestId(wrapper, 'grid-save')

          expect(wrapper.emitted('save')?.[0]).toEqual([{
            intents: [anna, lars].map(({id}) => ({inhabitantId: id, dinnerEventId: future.id, dinnerMode: DinnerMode.TAKEAWAY})),
            guestIntents: [{guestOrders: [differingGuest], dinnerMode: DinnerMode.TAKEAWAY}]
          }])
        })
      })

      it('keeps a past dinner\'s guest cell view-only', async () => {
        const wrapper = await mountWeek([order(8, anna.id, true, DinnerMode.DINEIN, OrderState.BOOKED, past.id)], past, FORM_MODES.EDIT)
        expect(selectorProps(wrapper, guestCellName(wrapper)).formMode).toBe(FORM_MODES.VIEW)
      })

      it('locks a guest cell by the deadline rules of its booker\'s cell', async () => {
        const wrapper = await mountWeek([order(7, anna.id, true, DinnerMode.DINEIN), order(42, anna.id, false, DinnerMode.DINEIN)], event, FORM_MODES.EDIT)
        expect(selectorProps(wrapper, guestCellName(wrapper)).disabledModes)
          .toEqual(selectorProps(wrapper, `cell-${anna.id}-${event.id}`).disabledModes)
      })
    })
  })

  describe('queued cells', () => {
    const {DinnerModeSchema} = useBookingValidation()
    const DinnerMode = DinnerModeSchema.enum
    const anna = mockHousehold.inhabitants[0]!
    const closedDinner = DinnerEventFactory.dinnerEventAt(1, 1)
    const annaQueued = WaitlistFactory.defaultEntry({id: 9, inhabitantId: anna.id, dinnerEventId: closedDinner.id, position: 3, dinnerMode: DinnerMode.TAKEAWAY})
    const mountQueued = (formMode: FormMode = FORM_MODES.VIEW) => mount({
      view: 'week',
      dateRange: {start: addDays(closedDinner.date, -3), end: addDays(closedDinner.date, 3)},
      dinnerEvents: [closedDinner],
      waitlistEntries: [annaQueued],
      formMode
    })
    const queuedCell = (wrapper: Awaited<ReturnType<typeof mount>>) =>
      wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === `cell-${anna.id}-${closedDinner.id}`)!

    it.each([FORM_MODES.VIEW, FORM_MODES.EDIT])('in %s mode the queued cell shows the wished mode ghosted under the queue marker, read-only', async (formMode) => {
      const wrapper = await mountQueued(formMode)

      expect(findByTestId(wrapper, `grid-waitlist-${anna.id}-${closedDinner.id}`).exists()).toBe(true)
      expect(queuedCell(wrapper).props()).toMatchObject({modelValue: DinnerMode.TAKEAWAY, ghost: true, formMode: FORM_MODES.VIEW})
    })

    it('the legend explains the queue marker', async () => {
      const wrapper = await mountQueued()

      expect(findByTestId(wrapper, 'dinner-mode-legend-waitlist').exists()).toBe(true)
    })
  })

  // The column header counts the household's own released tickets on a locked dinner: the household pays for them until they are sold
  describe('lock chip in the column header', () => {
    const {OrderStateSchema} = useBookingValidation()
    const supply = (total: number): ReleasedTicketCounts => ({...EMPTY_RELEASED_TICKET_COUNTS, total, formatted: total > 0 ? `${total}V` : '-'})
    const released = (id: number, dinnerEventId: number): OrderDisplay =>
      OrderFactory.defaultOrder(undefined, {id, inhabitantId: 1, dinnerEventId, state: OrderStateSchema.enum.RELEASED})
    const mountWeekOf = (dinnerEvent: DinnerEventDisplay, orders: OrderDisplay[], lockStatus: Map<number, ReleasedTicketCounts | null>) => mount({
      view: 'week',
      dateRange: {start: addDays(dinnerEvent.date, -3), end: addDays(dinnerEvent.date, 3)},
      dinnerEvents: [dinnerEvent],
      orders,
      lockStatus
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
  })
})

describe('BookingGridView add-guest button', () => {
  const future = DinnerEventFactory.dinnerEventAt(2, 60)
  const mountEdit = () => mount({
    view: 'week',
    dateRange: {start: addDays(future.date, -3), end: addDays(future.date, 3)},
    dinnerEvents: [future],
    formMode: FORM_MODES.EDIT,
    bookerId: mockHousehold.inhabitants[0]!.id
  })
  const addButton = (wrapper: Awaited<ReturnType<typeof mount>>) =>
    wrapper.findAllComponents({name: 'UButton'}).find(button => button.attributes('data-testid') === `guest-add-${future.id}`)!

  it('carries the chevron glyph', async () => {
    const wrapper = await mountEdit()
    expect(addButton(wrapper).props('icon')).toBe(ICONS.chevronDown)
  })
})
