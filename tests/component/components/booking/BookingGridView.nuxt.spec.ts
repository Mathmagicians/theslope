// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import BookingGridView from '~/components/booking/BookingGridView.vue'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

const ticketPrices = TicketFactory.defaultTicketPrices()
// Use real deadlinesForSeason() to stay in sync with SeasonDeadlines interface
const {deadlinesForSeason} = useSeason()
const deadlines = deadlinesForSeason(SeasonFactory.defaultSeasonData)

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
  deadlines
}

const mount = (props = {}) => mountSuspended(BookingGridView, {
  props: {...baseProps, ...props},
  slots: {'day-content': '<div data-testid="day-slot">Day content</div>'}
})

describe('BookingGridView', () => {
  it('renders with data-testid', async () => {
    const wrapper = await mount()
    expect(wrapper.find('[data-testid="booking-grid-view"]').exists()).toBe(true)
  })

  it('renders navigation buttons', async () => {
    const wrapper = await mount()
    // Navigation is handled by CalendarDateNav component
    expect(wrapper.find('[data-testid="date-nav-prev"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="date-nav-next"]').exists()).toBe(true)
  })

  it('renders edit button in view mode (week/month only)', async () => {
    // Edit button only renders for week/month views, not day view
    const wrapper = await mount({view: 'week'})
    expect(wrapper.find('[data-testid="grid-edit"]').exists()).toBe(true)
  })

  it('renders day-content slot for day view', async () => {
    const wrapper = await mount({view: 'day'})
    expect(wrapper.find('[data-testid="day-slot"]').exists()).toBe(true)
  })

  const navCases: {button: string, event: string}[] = [
    {button: 'date-nav-prev', event: 'prev'},
    {button: 'date-nav-next', event: 'next'}
  ]

  it.each(navCases)('emits navigate $event when $button clicked', async ({button, event}) => {
    const wrapper = await mount()
    // Navigation is handled by CalendarDateNav component
    await wrapper.find(`[data-testid="${button}"]`).trigger('click')
    expect(wrapper.emitted('navigate')?.[0]).toEqual([event])
  })

  it('emits update:formMode EDIT when edit button clicked (week/month only)', async () => {
    // Edit button only renders for week/month views, not day view
    const wrapper = await mount({view: 'week'})
    await wrapper.find('[data-testid="grid-edit"]').trigger('click')
    expect(wrapper.emitted('update:formMode')?.[0]).toEqual(['edit'])
  })

  describe('canEdit prop', () => {
    it.each(['week', 'month'] as const)('hides edit button when canEdit=false in %s view', async (view) => {
      const wrapper = await mount({view, canEdit: false})
      expect(wrapper.find('[data-testid="grid-edit"]').exists()).toBe(false)
    })

    it.each(['week', 'month'] as const)('shows edit button when canEdit=true (default) in %s view', async (view) => {
      const wrapper = await mount({view, canEdit: true})
      expect(wrapper.find('[data-testid="grid-edit"]').exists()).toBe(true)
    })

    it('hides save button when canEdit=false in edit mode', async () => {
      const wrapper = await mount({view: 'week', canEdit: false, formMode: 'edit'})
      expect(wrapper.find('[data-testid="grid-save"]').exists()).toBe(false)
    })

    it('shows save button when canEdit=true in edit mode', async () => {
      const wrapper = await mount({view: 'week', canEdit: true, formMode: 'edit'})
      expect(wrapper.find('[data-testid="grid-save"]').exists()).toBe(true)
    })
  })
})
