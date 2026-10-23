// @vitest-environment nuxt
import {describe, it, expect, beforeAll, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {findByTestId, clickByTestId, resetStores, findLoadingRow, isTableLoading, registerEmptyStoreEndpoints, registerScaffoldEndpoint, mountWithTooltipProvider, untilTrue, lockedDinnerSupply} from '~~/tests/component/testHelpers'
import {BookingViewSchema} from '~/composables/useBookingView'
import BookingGridView from '~/components/booking/BookingGridView.vue'
import DinnerModeSelector from '~/components/dinner/DinnerModeSelector.vue'
import {useBookingValidation, TicketState, type BookingAction, type DinnerEventDisplay, type DinnerMode, type OrderDisplay, type OrderState} from '~/composables/useBookingValidation'
import type {HouseholdDetail} from '~/composables/useCoreValidation'
import {FORM_MODES, type FormMode} from '~/types/form'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {WaitlistFactory} from '~~/tests/e2e/testDataFactories/waitlistFactory'
import {COMPONENTS, DINNER_STATE_BADGES, ICONS, ORDER_STATE_COLORS} from '~/composables/useTheSlopeDesignSystem'
import type {TicketWaitlistDetail} from '~/composables/useWaitlistValidation'
import ActionPreview from '~/components/booking/ActionPreview.vue'
import GuestBookingForm from '~/components/booking/GuestBookingForm.vue'
import {formatPreviewLines} from '~/composables/useBookingUi'
import {addDays} from 'date-fns'

const {day, week, month} = BookingViewSchema.enum
const {DinnerModeSchema, OrderStateSchema, DinnerStateSchema, BookingActionSchema, TicketTypeSchema} = useBookingValidation()
const {DINEIN, DINEINLATE, TAKEAWAY, NONE} = DinnerModeSchema.enum
const {BOOKED, RELEASED} = OrderStateSchema.enum
const {CANCELLED} = DinnerStateSchema.enum
const {ADULT} = TicketTypeSchema.enum
const Action = BookingActionSchema.enum

enableAutoUnmount(afterEach)

// Only HTTP is faked: the stores the grid creates read their datasets; the preview and the expected bookings read the
// scaffold's dry run
registerEmptyStoreEndpoints()
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

// Anna and Lars, in residency on every dinner the spec places, the past ones too
const household: HouseholdDetail = {...HouseholdFactory.defaultHouseholdDetail('grid'), movedInDate: addDays(new Date(), -365)}
type Inhabitant = HouseholdDetail['inhabitants'][number]
const [anna, lars] = household.inhabitants as [Inhabitant, Inhabitant]
const householdOrder = household.inhabitants.map(({id}) => id)

const baseProps = {
  view: day,
  dateRange: {start: new Date('2025-01-15'), end: new Date('2025-01-15')},
  household,
  dinnerEvents: [],
  orders: [],
  ticketPrices,
  // Getter: deadlines is assigned in beforeAll, read when a test spreads baseProps
  get deadlines() { return deadlines }
}

const mount = (props: Record<string, unknown> = {}) => mountSuspended(BookingGridView, {
  props: {...baseProps, ...props},
  slots: {'day-content': '<div data-testid="day-slot">Day content</div>'}
})
type Mounted = Awaited<ReturnType<typeof mount>>

// The week around a dinner, or the weeks from the first dinner to the last
const weekAround = (first: DinnerEventDisplay, last: DinnerEventDisplay = first) => ({start: addDays(first.date, -3), end: addDays(last.date, 3)})
const mountGrid = (dinnerEvents: DinnerEventDisplay[], props: Record<string, unknown> = {}) =>
  mount({view: week, dateRange: weekAround(dinnerEvents[0]!, dinnerEvents.at(-1)), dinnerEvents, ...props})

// A grid cell's selector by its name: cell-<inhabitant>-<dinner>, power-<dinner>, guest-<row>-<dinner>
const selectorNamed = (wrapper: Mounted, name: string) =>
  wrapper.findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === name)!
const cellOf = (inhabitantId: number, dinnerEventId: number) => `cell-${inhabitantId}-${dinnerEventId}`
const powerOf = (dinnerEventId: number) => `power-${dinnerEventId}`
// A dinner's column: its power cell and the household's cells
const columnCells = (dinnerEventId: number) => [powerOf(dinnerEventId), ...householdOrder.map(id => cellOf(id, dinnerEventId))]

describe('BookingGridView', () => {
  it('renders day-content slot for day view', async () => {
    const wrapper = await mount({view: day})
    expect(findByTestId(wrapper, 'day-slot').exists()).toBe(true)
  })

  // Navigation is handled by CalendarDateNav; the edit button renders in the week and month views only
  it.each`
    view    | button             | event                | payload
    ${day}  | ${'date-nav-prev'} | ${'navigate'}        | ${['prev']}
    ${day}  | ${'date-nav-next'} | ${'navigate'}        | ${['next']}
    ${week} | ${'grid-edit'}     | ${'update:formMode'} | ${[FORM_MODES.EDIT]}
  `('in $view view the $button button emits $event $payload', async ({view, button, event, payload}) => {
    const wrapper = await mount({view})
    await findByTestId(wrapper, button).trigger('click')
    expect(wrapper.emitted(event)?.[0]).toEqual(payload)
  })

  it.each`
    formMode           | hiddenButton
    ${FORM_MODES.VIEW} | ${'grid-edit'}
    ${FORM_MODES.EDIT} | ${'grid-save'}
  `('GIVEN canEdit=false in $formMode mode THEN the $hiddenButton button is hidden', async ({formMode, hiddenButton}) => {
    const wrapper = await mount({view: week, canEdit: false, formMode})
    expect(findByTestId(wrapper, hiddenButton).exists()).toBe(false)
  })

  // A week or month with no dinners has nothing to grid: the table's own #empty slot is the one empty state, and the
  // loading row takes its place while the range's bookings load; the synthetic power row must not keep the table populated
  it.each`
    view     | loading  | shows
    ${week}  | ${false} | ${'Ingen middage denne uge'}
    ${month} | ${false} | ${'Ingen middage denne måned'}
    ${week}  | ${true}  | ${'Henter bookinger...'}
  `('GIVEN a $view without dinners, loading $loading, THEN the table shows "$shows" in place of the household', async ({view, loading, shows}) => {
    const wrapper = await mount({view, dateRange: weekAround(DinnerEventFactory.dinnerEventAt(1, 1)), dinnerEvents: [], loading})

    expect(wrapper.text()).toContain(shows)
    expect(findLoadingRow(wrapper).exists()).toBe(loading)
    expect(wrapper.text().includes('Ingen middage')).toBe(!loading)
    expect(wrapper.text()).not.toContain(anna.name)
  })

  // While the range's bookings reload, UTable runs its loading bar over the rows
  it('GIVEN the range\'s bookings reload THEN the table runs its loading bar, and the household\'s cells and the sum row stay', async () => {
    const dinner = DinnerEventFactory.dinnerEventAt(1, 1)
    const wrapper = await mountGrid([dinner], {loading: true})

    expect(isTableLoading(wrapper)).toBe(true)
    // The legend draws its own mode samples: a grid cell carries the dinner's id in its name
    expect(wrapper.findAllComponents(DinnerModeSelector).filter(c => String(c.props('name')).endsWith(`-${dinner.id}`))).toHaveLength(household.inhabitants.length + 1)
    expect(wrapper.find('tfoot').exists()).toBe(true)
    expect(findLoadingRow(wrapper).exists()).toBe(false)
  })

  describe('the edit mode\'s buttons', () => {
    const dinner = DinnerEventFactory.dinnerEventAt(2, 60)
    const annaCell = cellOf(anna.id, dinner.id)
    const isSaveDisabled = (wrapper: Mounted) => findByTestId(wrapper, 'grid-save').attributes('disabled') !== undefined

    it('GIVEN no draft THEN Opdater is disabled; WHEN a cell changes and Annuller is clicked THEN the draft is gone and the grid emits cancel and the view mode', async () => {
      const wrapper = await mountGrid([dinner], {formMode: FORM_MODES.EDIT})
      expect(isSaveDisabled(wrapper)).toBe(true)

      await clickByTestId(wrapper, annaCell)
      expect(selectorNamed(wrapper, annaCell).props('isModified')).toBe(true)
      expect(isSaveDisabled(wrapper)).toBe(false)

      await clickByTestId(wrapper, 'grid-cancel')

      expect(selectorNamed(wrapper, annaCell).props('isModified')).toBe(false)
      expect(isSaveDisabled(wrapper)).toBe(true)
      expect(wrapper.emitted('cancel')).toEqual([[]])
      expect(wrapper.emitted('update:formMode')).toEqual([[FORM_MODES.VIEW]])
    })

    it('WHILE the save runs THEN the cells show their view face and Opdater reads its working label', async () => {
      const wrapper = await mountGrid([dinner], {formMode: FORM_MODES.EDIT, isSaving: true})

      expect(columnCells(dinner.id).map(name => selectorNamed(wrapper, name).props('formMode'))).toEqual(columnCells(dinner.id).map(() => FORM_MODES.VIEW))
      expect(findByTestId(wrapper, 'grid-save').text()).toContain('Arbejder ...')
    })
  })

  // A household books the dinners of its residency: a dinner after its move-out offers no mode, and the alert says why
  it('GIVEN a dinner after the household\'s move-out THEN the residency alert shows and the dinner\'s column offers no mode', async () => {
    const dinner = DinnerEventFactory.dinnerEventAt(2, 60)
    const wrapper = await mountGrid([dinner], {household: {...household, moveOutDate: addDays(dinner.date, -10)}, formMode: FORM_MODES.EDIT, bookerId: anna.id})

    expect(findByTestId(wrapper, 'outside-residency-alert').exists()).toBe(true)
    columnCells(dinner.id).forEach(name => expect(selectorNamed(wrapper, name).props()).toMatchObject({enabledModes: [], formMode: FORM_MODES.VIEW}))
    expect(findByTestId(wrapper, `guest-add-${dinner.id}`).exists()).toBe(false)
  })

  // A guest ticket is booked by an inhabitant but is not that inhabitant's own dinner
  describe('guest tickets in the inhabitant rows', () => {
    const event = DinnerEventFactory.dinnerEventAt(1, 1)

    const order = (id: number, inhabitantId: number, isGuestTicket: boolean, dinnerMode: DinnerMode, state: OrderState = BOOKED, dinnerEventId: number = event.id): OrderDisplay =>
      OrderFactory.defaultOrder(undefined, {id, inhabitantId, dinnerEventId, isGuestTicket, dinnerMode, state})

    const mountWeek = (orders: OrderDisplay[], dinnerEvent: DinnerEventDisplay = event, formMode: FormMode = FORM_MODES.VIEW) =>
      mountGrid([dinnerEvent], {orders, formMode})

    const guestCellName = (wrapper: Mounted): string =>
      wrapper.findAllComponents(DinnerModeSelector).map(c => c.props('name') as string).find(name => name.startsWith('guest-'))!

    const countOf = (wrapper: Mounted, testId: string): number => {
      const badge = findByTestId(wrapper, testId)
      return badge.exists() ? Number(badge.text()) : 0
    }

    it('GIVEN Anna\'s guest ticket listed before her regular order THEN her cell shows her own order, and the power row reads no consensus over the guest\'s other mode', async () => {
      const wrapper = await mountWeek([order(7, anna.id, true, TAKEAWAY), order(42, anna.id, false, DINEINLATE), order(43, lars.id, false, DINEINLATE)])

      expect(selectorNamed(wrapper, cellOf(anna.id, event.id)).props('modelValue')).toBe(DINEINLATE)
      expect(selectorNamed(wrapper, powerOf(event.id)).props()).toMatchObject({modelValue: DINEIN, consensus: false})
    })

    // The name cell counts over the dinners in view
    const later = DinnerEventFactory.dinnerEventAt(5, 2)
    const place = (id: number, dinnerEventId: number, isGuestTicket = false): TicketWaitlistDetail =>
      WaitlistFactory.defaultEntry({id, inhabitantId: anna.id, dinnerEventId, isGuestTicket})
    const mountCounts = (orders: OrderDisplay[], waitlistEntries: TicketWaitlistDetail[]) => mountGrid([event, later], {orders, waitlistEntries})
    const countsOf = (wrapper: Mounted) => ({
      total: countOf(wrapper, `inhabitant-ticket-count-${anna.id}`),
      released: countOf(wrapper, `inhabitant-released-count-${anna.id}`),
      queued: countOf(wrapper, `inhabitant-waitlist-count-${anna.id}`)
    })
    const countCases: {desc: string, orders: OrderDisplay[], places: TicketWaitlistDetail[], counts: {total: number, released: number, queued: number}}[] = [
      {desc: 'guest tickets only', orders: [order(7, anna.id, true, DINEIN), order(8, anna.id, true, DINEIN, RELEASED)], places: [], counts: {total: 0, released: 0, queued: 0}},
      {desc: 'a released regular order and guest tickets', orders: [order(7, anna.id, true, DINEIN), order(8, anna.id, true, DINEIN, RELEASED), order(42, anna.id, false, DINEIN, RELEASED)], places: [], counts: {total: 1, released: 1, queued: 0}},
      {desc: 'places on the waiting list only', orders: [], places: [place(9, event.id), place(10, later.id)], counts: {total: 0, released: 0, queued: 2}},
      {desc: 'a guest\'s place on the waiting list', orders: [], places: [place(11, later.id, true)], counts: {total: 0, released: 0, queued: 0}}
    ]

    it.each(countCases)('counts Anna\'s own tickets, the released among them and her own places on the waiting list when she holds $desc', async ({orders, places, counts}) => {
      const wrapper = await mountCounts(orders, places)
      expect(countsOf(wrapper)).toEqual(counts)
    })

    it('GIVEN a ticket and a place on the waiting list THEN Anna counts one of each, and the waiting-list count wears the waiting list\'s glyph and colour, in the name cell beside the ticket count', async () => {
      const wrapper = await mountCounts([order(42, anna.id, false, DINEIN)], [place(9, later.id)])
      const waitlistBadge = wrapper.findAllComponents({name: 'UBadge'}).find(badge => badge.attributes('data-testid') === `inhabitant-waitlist-count-${anna.id}`)!

      expect(countsOf(wrapper)).toEqual({total: 1, released: 0, queued: 1})
      expect(waitlistBadge.props('color')).toBe(ORDER_STATE_COLORS[TicketState.queued])
      expect(waitlistBadge.findComponent({name: 'UIcon'}).props('name')).toBe(ICONS.waitlist)
      expect(findByTestId(wrapper, `inhabitant-ticket-count-${anna.id}`).element.parentElement).toBe(waitlistBadge.element.parentElement)
    })

    describe('guest cells in edit mode', () => {
      const future = DinnerEventFactory.dinnerEventAt(2, 60)
      const guest = order(7, anna.id, true, DINEIN, BOOKED, future.id)
      const annaOwn = order(42, anna.id, false, DINEIN, BOOKED, future.id)
      const annaCell = cellOf(anna.id, future.id)

      it('renders an editable guest cell whose change keeps the booker\'s own cell untouched, and emits the regular and the guest changes in one save', async () => {
        const wrapper = await mountWeek([guest, annaOwn], future, FORM_MODES.EDIT)
        const guestCell = guestCellName(wrapper)
        expect(selectorNamed(wrapper, guestCell).props()).toMatchObject({formMode: FORM_MODES.EDIT, interaction: 'toggle'})

        await clickByTestId(wrapper, guestCell)

        expect(selectorNamed(wrapper, guestCell).props()).toMatchObject({isModified: true})
        expect(selectorNamed(wrapper, guestCell).props('modelValue')).not.toBe(DINEIN)
        expect(selectorNamed(wrapper, annaCell).props()).toMatchObject({modelValue: DINEIN, isModified: false})

        await clickByTestId(wrapper, annaCell)
        const guestMode = selectorNamed(wrapper, guestCell).props('modelValue')
        const annaMode = selectorNamed(wrapper, annaCell).props('modelValue')

        await clickByTestId(wrapper, 'grid-save')

        expect(wrapper.emitted('save')?.[0]).toEqual([{
          intents: [{inhabitantId: anna.id, dinnerEventId: future.id, dinnerMode: annaMode}],
          guestIntents: [{guestOrders: [guest], dinnerMode: guestMode}],
          entryIntents: []
        }])
      })

      describe('power mode with a guest differing from the family', () => {
        const differingGuest = order(7, anna.id, true, DINEINLATE, BOOKED, future.id)
        const family = [annaOwn, order(43, lars.id, false, DINEIN, BOOKED, future.id)]
        const powerCell = powerOf(future.id)

        it('shows no consensus while the family is uniform; setting the power mode carries it into the guest draft, regains consensus, and saves the guest intent alongside the family\'s', async () => {
          const wrapper = await mountWeek([differingGuest, ...family], future, FORM_MODES.EDIT)
          expect(selectorNamed(wrapper, powerCell).props()).toMatchObject({modelValue: DINEIN, consensus: false})

          selectorNamed(wrapper, powerCell).vm.$emit('update:modelValue', TAKEAWAY)
          await nextTick()
          expect(selectorNamed(wrapper, guestCellName(wrapper)).props()).toMatchObject({modelValue: TAKEAWAY, isModified: true})
          expect(selectorNamed(wrapper, powerCell).props()).toMatchObject({modelValue: TAKEAWAY, consensus: true})

          await clickByTestId(wrapper, 'grid-save')

          expect(wrapper.emitted('save')?.[0]).toEqual([{
            intents: [anna, lars].map(({id}) => ({inhabitantId: id, dinnerEventId: future.id, dinnerMode: TAKEAWAY})),
            guestIntents: [{guestOrders: [differingGuest], dinnerMode: TAKEAWAY}],
            entryIntents: []
          }])
        })
      })

      it('locks a guest cell by the deadline rules of its booker\'s cell', async () => {
        const wrapper = await mountWeek([order(7, anna.id, true, DINEIN), order(42, anna.id, false, DINEIN)], event, FORM_MODES.EDIT)
        const bookerModes = selectorNamed(wrapper, cellOf(anna.id, event.id)).props('enabledModes')
        // A booked ticket can always be given up
        expect(bookerModes).toContain(NONE)
        expect(selectorNamed(wrapper, guestCellName(wrapper)).props('enabledModes')).toEqual(bookerModes)
      })
    })
  })

  describe('queued cells', () => {
    const closedDinner = DinnerEventFactory.dinnerEventAt(1, 1)
    const annaQueued = WaitlistFactory.defaultEntry({id: 9, inhabitantId: anna.id, dinnerEventId: closedDinner.id, position: 3, dinnerMode: TAKEAWAY})
    const mountQueued = (formMode: FormMode = FORM_MODES.VIEW, deadlineOverrides: Partial<typeof deadlines> = {}) =>
      mountGrid([closedDinner], {waitlistEntries: [annaQueued], formMode, deadlines: {...deadlines, ...deadlineOverrides}})
    const queuedCellName = cellOf(anna.id, closedDinner.id)
    const queueMarker = (wrapper: Mounted) => findByTestId(wrapper, `grid-waitlist-${anna.id}-${closedDinner.id}`)

    it('in view mode the queued cell shows the wished mode ghosted under the queue marker, read-only, and the legend explains the marker', async () => {
      const wrapper = await mountQueued()

      expect(queueMarker(wrapper).exists()).toBe(true)
      expect(selectorNamed(wrapper, queuedCellName).props()).toMatchObject({modelValue: TAKEAWAY, ghost: true, formMode: FORM_MODES.VIEW})
      expect(findByTestId(wrapper, 'dinner-mode-legend-waitlist').exists()).toBe(true)
    })

    // What a person can do in the grid is what the day view lets them do: in edit mode the queued cell cycles its modes.
    // A wish on the waiting list is no booking: untouched it keeps the ghost face in edit mode too
    it('in edit mode an untouched queued cell renders its wish as an editable ghost under the queue marker, and a click trades the ghost for the modified accent', async () => {
      const wrapper = await mountQueued(FORM_MODES.EDIT)

      expect(queueMarker(wrapper).exists()).toBe(true)
      expect(selectorNamed(wrapper, queuedCellName).props()).toMatchObject({modelValue: TAKEAWAY, ghost: true, isModified: false, formMode: FORM_MODES.EDIT, interaction: 'toggle'})

      await clickByTestId(wrapper, queuedCellName)

      expect(selectorNamed(wrapper, queuedCellName).props()).toMatchObject({ghost: false, isModified: true})
    })

    // With the mode locked the place keeps its wish or leaves the waiting list
    it('GIVEN a dinner after the deadline with the mode locked WHEN the queued cell is clicked in edit mode THEN it cycles Takeaway → Ingen → Takeaway', async () => {
      const wrapper = await mountQueued(FORM_MODES.EDIT, {canModifyOrders: () => false, canEditDiningMode: () => false})
      expect(selectorNamed(wrapper, queuedCellName).props()).toMatchObject({modelValue: TAKEAWAY, interaction: 'toggle'})

      const modes: DinnerMode[] = []
      for (const _click of [1, 2]) {
        await clickByTestId(wrapper, queuedCellName)
        modes.push(selectorNamed(wrapper, queuedCellName).props('modelValue') as DinnerMode)
      }

      expect(modes).toEqual([NONE, TAKEAWAY])
    })
  })

  // The grid's rows follow its dinners on view; the waiting list it receives also covers the season's locked dinners
  describe('guest rows of dinners outside the week on view', () => {
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
    const rowIdsOf = (wrapper: Mounted) =>
      (wrapper.findComponent({name: 'UTable'}).props('data') as {id: string | number}[]).map(row => row.id)

    it.each([
      {kind: 'queued guest', props: {waitlistEntries: [entries.inWeek, entries.outside]}, rowIds: () => ({kept: `guest-entry-${entries.inWeek.id}`, dropped: `guest-entry-${entries.outside.id}`})},
      {kind: 'placed guest group', props: {orders: [groups.inWeek, groups.outside]}, rowIds: () => ({kept: groupRowId(groups.inWeek), dropped: groupRowId(groups.outside)})}
    ])('GIVEN the week on view and a $kind on a dinner in it and one outside it THEN only the one in the week has a guest row', async ({props, rowIds}) => {
      const wrapper = await mountGrid([inWeek, outside], {dateRange: weekAround(inWeek), ...props})
      const {kept, dropped} = rowIds()

      expect(rowIdsOf(wrapper)).toContain(kept)
      expect(rowIdsOf(wrapper)).not.toContain(dropped)
    })
  })

  // The power cell reaches every place the household holds on the dinner: Lars's own and Anna's queued guest's
  it('GIVEN Anna\'s ticket, Lars\'s place and a queued guest on Takeaway THEN the power cell counts the wishes in its consensus; WHEN it is set to Ingen and saved THEN Lars\'s queued cell shows the draft, his intent names his place and the guest\'s place leaves', async () => {
    const closedDinner = DinnerEventFactory.dinnerEventAt(1, 1)
    const powerCell = powerOf(closedDinner.id)
    const annaTicket = OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: anna.id, dinnerEventId: closedDinner.id, dinnerMode: TAKEAWAY})
    const larsQueued = WaitlistFactory.defaultEntry({id: 11, inhabitantId: lars.id, dinnerEventId: closedDinner.id, dinnerMode: TAKEAWAY})
    const guestEntry = WaitlistFactory.defaultEntry({id: 28, inhabitantId: anna.id, dinnerEventId: closedDinner.id, isGuestTicket: true, dinnerMode: TAKEAWAY})
    const wrapper = await mountGrid([closedDinner], {orders: [annaTicket], waitlistEntries: [larsQueued, guestEntry], formMode: FORM_MODES.EDIT})
    expect(selectorNamed(wrapper, powerCell).props()).toMatchObject({modelValue: TAKEAWAY, consensus: true})

    selectorNamed(wrapper, powerCell).vm.$emit('update:modelValue', NONE)
    await nextTick()

    expect(selectorNamed(wrapper, powerCell).props()).toMatchObject({modelValue: NONE, consensus: true})
    // As an expected cell does, the queued cell ghosts its wish until a draft takes its place
    expect(findByTestId(wrapper, `grid-waitlist-${lars.id}-${closedDinner.id}`).exists()).toBe(true)
    expect(selectorNamed(wrapper, cellOf(lars.id, closedDinner.id)).props()).toMatchObject({modelValue: NONE, isModified: true, ghost: false, formMode: FORM_MODES.EDIT})

    await clickByTestId(wrapper, 'grid-save')

    expect(wrapper.emitted('save')?.[0]).toEqual([{
      intents: [
        {inhabitantId: anna.id, dinnerEventId: closedDinner.id, dinnerMode: NONE},
        {inhabitantId: lars.id, dinnerEventId: closedDinner.id, dinnerMode: NONE, waitlistEntryId: larsQueued.id}
      ],
      guestIntents: [],
      entryIntents: [{entry: guestEntry, dinnerMode: NONE}]
    }])
  })

  // The power cell offers the modes every cell of its dinner may pick (powerOptions over each cell's getBookingOptions)
  it('GIVEN Anna\'s ticket on Takeaway and Lars\'s released, after the deadline with the mode locked, THEN the power cell offers Ingen only', async () => {
    const dinner = DinnerEventFactory.dinnerEventAt(1, 1)
    const orders = [
      OrderFactory.defaultOrder(undefined, {id: 201, inhabitantId: anna.id, dinnerEventId: dinner.id, dinnerMode: TAKEAWAY, state: BOOKED}),
      OrderFactory.defaultOrder(undefined, {id: 202, inhabitantId: lars.id, dinnerEventId: dinner.id, dinnerMode: NONE, state: RELEASED})
    ]
    const wrapper = await mountGrid([dinner], {
      orders,
      formMode: FORM_MODES.EDIT,
      deadlines: {...deadlines, canModifyOrders: () => false, canEditDiningMode: () => false}
    })

    expect(selectorNamed(wrapper, powerOf(dinner.id)).props('enabledModes')).toEqual([NONE])
  })

  // Nothing lands on a cancelled dinner: its header names the state, and its cells show the tickets cancelled, offering no mode
  it('GIVEN Anna\'s ticket on a cancelled dinner in edit mode THEN its column header shows the Aflyst badge in place of the lock chip, and her cell shows the ticket cancelled, offering no mode', async () => {
    // Tomorrow, past the booking deadline, where a dinner that goes ahead carries the lock chip
    const cancelled = {...DinnerEventFactory.dinnerEventAt(1, 1), state: CANCELLED}
    const annaTicket = OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: anna.id, dinnerEventId: cancelled.id, dinnerMode: DINEIN})
    const wrapper = await mountGrid([cancelled], {orders: [annaTicket], formMode: FORM_MODES.EDIT})
    const inHeader = (name: string) => wrapper.findAllComponents({name}).filter(component => wrapper.find('thead').element.contains(component.element))

    const {label, color, icon} = DINNER_STATE_BADGES.CANCELLED
    const badge = inHeader('UBadge').find(candidate => candidate.props('color') === color && candidate.props('icon') === icon)
    expect(badge?.text()).toContain(label)
    expect(inHeader('UChip')).toHaveLength(0)
    expect(selectorNamed(wrapper, cellOf(anna.id, cancelled.id)).props()).toMatchObject({modelValue: DINEIN, cancelled: true, enabledModes: [], formMode: FORM_MODES.VIEW})
  })

  // The column header counts the household's own released tickets on a locked dinner: the household pays for them until
  // they are sold. The chip counts the household's orders, so it waits with the rows while they load
  describe('lock chip in the column header', () => {
    const locked = {label: 'a locked dinner', event: DinnerEventFactory.dinnerEventAt(1, 1)}
    const open = {label: 'a dinner open for booking', event: DinnerEventFactory.dinnerEventAt(2, 60)}
    // A standalone UChip renders its number in its base slot
    const headerChip = (wrapper: Mounted) => wrapper.find('thead [data-slot="base"]')

    it.each`
      dinner      | ownReleased | forSale | loading  | chip
      ${locked}   | ${2}        | ${2}    | ${false} | ${'2'}
      ${locked}   | ${0}        | ${3}    | ${false} | ${''}
      ${open}     | ${0}        | ${0}    | ${false} | ${null}
      ${locked}   | ${1}        | ${1}    | ${true}  | ${null}
    `('GIVEN $dinner.label with $ownReleased own released tickets and $forSale for sale, loading $loading, THEN the chip reads $chip', async ({dinner, ownReleased, forSale, loading, chip}) => {
      const {event} = dinner
      const orders = householdOrder.slice(0, ownReleased).map((inhabitantId, index) =>
        OrderFactory.defaultOrder(undefined, {id: 900 + index, inhabitantId, dinnerEventId: event.id, state: RELEASED}))
      const wrapper = await mountGrid([event], {orders, lockStatus: new Map([[event.id, lockedDinnerSupply({[ADULT]: forSale})]]), loading})

      expect(headerChip(wrapper).exists() ? headerChip(wrapper).text() : null).toBe(chip)
    })
  })
})

describe('BookingGridView add-guest button', () => {
  const future = DinnerEventFactory.dinnerEventAt(2, 60)
  const editProps = {
    view: week,
    dateRange: weekAround(future),
    dinnerEvents: [future],
    formMode: FORM_MODES.EDIT,
    bookerId: anna.id
  }
  const mountEdit = (props: Record<string, unknown> = editProps, isMd?: boolean) =>
    mountWithTooltipProvider(BookingGridView, {props: {...baseProps, ...props}, isMd})

  // The chevron renders while the guest add row has a mode (THE RULES): never on a dinner nobody can book
  it.each([
    {standing: 'before the booking deadline', dinner: future, renders: true},
    {standing: 'a past dinner', dinner: DinnerEventFactory.dinnerEventAt(5, -2), renders: false}
  ])('GIVEN $standing THEN the chevron renders: $renders', async ({dinner, renders}) => {
    const wrapper = await mountGrid([dinner], {
      formMode: FORM_MODES.EDIT,
      bookerId: anna.id,
      deadlines: {...deadlines, canModifyOrders: () => true, canEditDiningMode: () => true}
    })

    expect(findByTestId(wrapper, `guest-add-${dinner.id}`).exists()).toBe(renders)
  })

  // The day columns widen the table past a phone, and the table scrolls sideways in its own box: the edit mode's action
  // bar and the guest form ride under the rows, kept to the part of the box in view, their buttons on screen
  it('on a phone edit mode keeps the preview and the Annuller/Opdater buttons to the part of the table\'s box in view, and the chevron opens the guest form in the row below, kept there too', async () => {
    const wrapper = await mountEdit(editProps, false)

    // The bar's cell spans the table; its inner panel holds the preview and the buttons
    const actionPanel = findByTestId(wrapper, 'grid-save').element.closest('td')!.firstElementChild!
    expect([...actionPanel.classList]).toEqual(expect.arrayContaining(COMPONENTS.bookingGrid.actionPanel.split(' ')))
    expect(actionPanel.contains(wrapper.findComponent(ActionPreview).element)).toBe(true)
    expect(['grid-cancel', 'grid-save'].filter(button => !actionPanel.contains(findByTestId(wrapper, button).element))).toEqual([])
    expect(wrapper.findAllComponents({name: 'UButton'}).find(button => button.attributes('data-testid') === `guest-add-${future.id}`)!.props('icon')).toBe(ICONS.chevronDown)

    await clickByTestId(wrapper, `guest-add-${future.id}`)

    const form = wrapper.findComponent(GuestBookingForm)
    expect(form.props('dinnerEvent')).toEqual(future)
    // GuestBookingForm renders several roots; its UForm sits directly in the panel
    const formPanel = form.findComponent({name: 'UForm'}).element.parentElement!
    expect([...formPanel.classList]).toEqual(expect.arrayContaining(COMPONENTS.bookingGrid.expandedPanel.split(' ')))
  })

  it('WHEN the guest form saves THEN the grid hands its guest orders on as addGuest and closes the form', async () => {
    const wrapper = await mountEdit()
    await clickByTestId(wrapper, `guest-add-${future.id}`)
    const guests = [OrderFactory.defaultDesiredOrder({inhabitantId: anna.id, dinnerEventId: future.id, isGuestTicket: true})]

    wrapper.findComponent(GuestBookingForm).vm.$emit('save', guests)
    await nextTick()

    expect(wrapper.emitted('addGuest')).toEqual([[guests]])
    expect(wrapper.findComponent(GuestBookingForm).exists()).toBe(false)
  })

  describe('with the guest form open on one of two dinners', () => {
    const later = DinnerEventFactory.dinnerEventAt(3, 62)
    const twoDinners = {...editProps, dateRange: weekAround(future, later), dinnerEvents: [future, later]}

    it.each([
      {desc: 'its own chevron', tapped: later, outcome: 'closes', open: undefined},
      {desc: 'the other dinner\'s chevron', tapped: future, outcome: 'switches to that dinner in one tap', open: future}
    ])('WHEN $desc is tapped THEN the form $outcome', async ({tapped, open}) => {
      const wrapper = await mountEdit(twoDinners)
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
  const future = DinnerEventFactory.dinnerEventAt(2, 60)
  const later = DinnerEventFactory.dinnerEventAt(3, 62)
  const dinnerEvents = [future, later]
  const mountWeek = (formMode: FormMode = FORM_MODES.VIEW, props: Record<string, unknown> = {}) => mountGrid(dinnerEvents, {formMode, ...props})
  const cell = (wrapper: Mounted, inhabitantId: number, dinnerEventId: number) => selectorNamed(wrapper, cellOf(inhabitantId, dinnerEventId))
  const previews = () => scaffold.sent.filter(({body}) => body.orders.length > 0)
  const expectedReads = () => scaffold.sent.filter(({body}) => body.orders.length === 0)
  const resultOf = (inhabitant: Inhabitant, dinnerEventId: number, action: BookingAction, dinnerMode: DinnerMode = DINEIN) =>
    OrderFactory.defaultBookingResult({inhabitantId: inhabitant.id, inhabitantName: inhabitant.name, dinnerEventId, dinnerMode, action})
  // Anna is expected on both dinners; Lars, who cancelled earlier, is left out
  const annaExpected = () => OrderFactory.defaultScaffoldOrdersResponse({results: [resultOf(anna, future.id, Action.BOOK), resultOf(anna, later.id, Action.BOOK)]})
  // Anna and Lars are expected on Takeaway on both dinners
  const bothOnTakeaway = () => OrderFactory.defaultScaffoldOrdersResponse({results: [anna, lars].flatMap(inhabitant => dinnerEvents.map(({id}) => resultOf(inhabitant, id, Action.BOOK, TAKEAWAY)))})
  // The expected bookings have landed: read, and the table's loading bar gone
  const landed = (wrapper: Mounted) => untilTrue(() => expectedReads().length > 0 && !isTableLoading(wrapper))

  describe('the expected bookings', () => {
    it('reads the dry run with no orders on the dinners on view and shows Anna\'s expected cells outlined, Lars\'s on Ingen, with the legend entry', async () => {
      scaffold.answers.expected = annaExpected
      const wrapper = await mountWeek()
      await landed(wrapper)

      expect(expectedReads()[0]).toEqual({query: {adminBypass: 'false', preview: 'true'}, body: {householdId: household.id, dinnerEventIds: [future.id, later.id], orders: []}})
      dinnerEvents.forEach(({id}) => {
        expect(cell(wrapper, anna.id, id).props()).toMatchObject({modelValue: DINEIN, expected: true})
        expect(cell(wrapper, lars.id, id).props()).toMatchObject({modelValue: NONE, expected: false})
      })
      expect(findByTestId(wrapper, 'dinner-mode-legend-expected').exists()).toBe(true)
    })

    // The legend lists the expected booking as a standing entry, also while no cell is expected
    it('an order supersedes the expected booking, and without an expected cell the legend still explains it', async () => {
      scaffold.answers.expected = () => OrderFactory.defaultScaffoldOrdersResponse({results: [resultOf(anna, future.id, Action.BOOK)]})
      const annaOrder = OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: anna.id, dinnerEventId: future.id, dinnerMode: TAKEAWAY})
      const wrapper = await mountWeek(FORM_MODES.VIEW, {orders: [annaOrder]})
      await landed(wrapper)

      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: TAKEAWAY, expected: false})
      expect(findByTestId(wrapper, 'dinner-mode-legend-expected').exists()).toBe(true)
    })

    it('the table\'s loading bar runs while the read loads', async () => {
      scaffold.answers.expected = annaExpected
      const release = scaffold.hold('expected')
      const wrapper = await mountWeek()

      await untilTrue(() => isTableLoading(wrapper))
      release()
      await untilTrue(() => !isTableLoading(wrapper))
      expect(cell(wrapper, anna.id, future.id).props('expected')).toBe(true)
    })

    // The orders a save lands change what the preferences still book: the expected bookings follow them
    it('WHEN the orders change THEN the dry run with no orders is read again', async () => {
      const wrapper = await mountWeek()
      await landed(wrapper)
      const [firstRead] = expectedReads()
      expect(expectedReads()).toHaveLength(1)

      await wrapper.setProps({orders: [OrderFactory.defaultOrder(undefined, {id: 42, inhabitantId: anna.id, dinnerEventId: future.id})]})

      await untilTrue(() => expectedReads().length > 1)
      expect(expectedReads()).toEqual([firstRead, firstRead])
    })

    // In edit mode a plan stays a ghost until it is touched: the first click adopts the plan as the person's draft
    it('GIVEN Anna\'s plan in edit mode WHEN her cell is clicked twice THEN it shows the plan until the first click adopts it as a draft, and the second moves to the next mode', async () => {
      scaffold.answers.expected = annaExpected
      const wrapper = await mountWeek(FORM_MODES.EDIT)
      await landed(wrapper)
      const annaCell = cellOf(anna.id, future.id)
      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: DINEIN, expected: true, isModified: false, formMode: FORM_MODES.EDIT})

      await clickByTestId(wrapper, annaCell)
      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: DINEIN, expected: false, isModified: true})

      await clickByTestId(wrapper, annaCell)
      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: DINEINLATE, expected: false, isModified: true})
    })

    // The power cell reads the modes the cells show: an expected cell counts its expected mode
    it('GIVEN Anna and Lars planned on Takeaway THEN the power cell reads their consensus; in edit mode WHEN it is clicked once and saved THEN it adopts the plan as one draft per person and saves them', async () => {
      scaffold.answers.expected = bothOnTakeaway
      const wrapper = await mountWeek(FORM_MODES.EDIT)
      await landed(wrapper)
      dinnerEvents.forEach(({id}) => expect(selectorNamed(wrapper, powerOf(id)).props()).toMatchObject({modelValue: TAKEAWAY, consensus: true, expected: true}))

      await clickByTestId(wrapper, powerOf(future.id))
      for (const {id} of [anna, lars]) {
        expect(cell(wrapper, id, future.id).props()).toMatchObject({modelValue: TAKEAWAY, expected: false, isModified: true})
      }

      await clickByTestId(wrapper, 'grid-save')
      expect(wrapper.emitted('save')?.[0]).toEqual([{
        intents: [anna, lars].map(({id}) => ({inhabitantId: id, dinnerEventId: future.id, dinnerMode: TAKEAWAY})),
        guestIntents: [],
        entryIntents: []
      }])
    })
  })

  describe('the preview of the draft', () => {
    // An admin's save lifts the deadlines (ADR-016): its preview reads the same run
    it.each`
      who           | adminBypass
      ${'a member'} | ${false}
      ${'an admin'} | ${true}
    `('GIVEN $who\'s grid with no draft THEN no preview is asked for; WHEN a cell changes THEN the draft goes to the dry run once the clicks rest, the loader shows meanwhile, and the reply renders a day per dinner', async ({adminBypass}) => {
      const reply = OrderFactory.defaultScaffoldOrdersResponse({dinners: [{id: future.id, date: future.date}], results: [resultOf(lars, future.id, Action.BOOK, DINEINLATE)]})
      scaffold.answers.preview = () => reply
      const wrapper = await mountWeek(FORM_MODES.EDIT, {adminBypass})
      await landed(wrapper)
      expect(previews()).toEqual([])
      expect(wrapper.findComponent(ActionPreview).props()).toMatchObject({days: [], pending: false})

      await clickByTestId(wrapper, cellOf(lars.id, future.id))
      expect(wrapper.findComponent(ActionPreview).props('pending')).toBe(true)

      await untilTrue(() => wrapper.findComponent(ActionPreview).props('days').length > 0)
      expect(wrapper.findComponent(ActionPreview).props('days')).toEqual(formatPreviewLines(reply.scaffoldResult, householdOrder))
      expect(previews()).toEqual([{
        query: {adminBypass: String(adminBypass), preview: 'true'},
        body: {householdId: household.id, dinnerEventIds: [future.id], orders: [expect.objectContaining({inhabitantId: lars.id, dinnerEventId: future.id, dinnerMode: cell(wrapper, lars.id, future.id).props('modelValue')})]}
      }])
    })

    it('WHEN an expected cell is set to Ingen THEN the draft sends the bare Ingen and the reply previews the cancellation', async () => {
      const reply = OrderFactory.defaultScaffoldOrdersResponse({dinners: [{id: future.id, date: future.date}], results: [resultOf(anna, future.id, Action.CANCEL, NONE)]})
      scaffold.answers.expected = annaExpected
      scaffold.answers.preview = () => reply
      const wrapper = await mountWeek(FORM_MODES.EDIT)
      await landed(wrapper)

      cell(wrapper, anna.id, future.id).vm.$emit('update:modelValue', NONE)
      await nextTick()
      expect(cell(wrapper, anna.id, future.id).props()).toMatchObject({modelValue: NONE, isModified: true, expected: false})

      await untilTrue(() => wrapper.findComponent(ActionPreview).props('days').length > 0)
      expect(wrapper.findComponent(ActionPreview).props('days')).toEqual(formatPreviewLines(reply.scaffoldResult, householdOrder))
      const [bareIngen] = previews().at(-1)!.body.orders
      expect(bareIngen).toMatchObject({inhabitantId: anna.id, dinnerEventId: future.id, dinnerMode: NONE})
      expect(bareIngen).not.toHaveProperty('orderId')
    })
  })
})
