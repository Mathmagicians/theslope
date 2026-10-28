// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import type {Ref} from 'vue'
import {mountWithTooltipProvider, findByTestId, clickByTestId, resetStores,VIEWPORTS, holdEndpoint, isTableLoading, expectMasterDetail, registerScaffoldEndpoint, untilTrue} from '~~/tests/component/testHelpers'
import HouseholdBookings from '~/components/household/HouseholdBookings.vue'
import DinnerCalendarDisplay from '~/components/calendar/DinnerCalendarDisplay.vue'
import BookingGridView from '~/components/booking/BookingGridView.vue'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import DinnerModeSelector from '~/components/dinner/DinnerModeSelector.vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {useBookingValidation, type BookingResult, type ScaffoldOrdersRequest} from '~/composables/useBookingValidation'
import {BookingViewSchema} from '~/composables/useBookingView'
import {SettingKeySchema, SETTING_REGISTRY} from '~/composables/useSettingValidation'
import {formatDate} from '~/utils/date'

// The test environment has no router to navigate: useQueryParam writes the URL through navigateTo (ADR-006)
const {mockNavigateTo, mockRoute, landNavigation, useRoute} = await vi.hoisted(async () =>
    (await import('~~/tests/component/hoistedMocks')).mockRouteAndNavigation())
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => useRoute)

// Only HTTP is faked (testing.md Rule 6)
const dinnerEvent = {...DinnerEventFactory.defaultDinnerEventDisplay('household-bookings'), seasonId: 1}
const season = {...SeasonFactory.defaultSeason('household-bookings'), id: 1, dinnerEvents: [dinnerEvent]}
registerEndpoint('/api/_auth/session', () => ({}))
registerEndpoint('/api/admin/season/active', () => season.id)
registerEndpoint(`/api/admin/season/${season.id}`, () => season)
registerEndpoint('/api/admin/season', () => [season])
registerEndpoint('/api/admin/household', () => [])
registerEndpoint('/api/admin/allergy-type', () => [])
const POSTER_NOTES = SettingKeySchema.enum['allergy-poster-notes']
// Without a stored row the server answers the registry default
registerEndpoint(`/api/admin/setting/${POSTER_NOTES}`, () => ({key: POSTER_NOTES, value: SETTING_REGISTRY[POSTER_NOTES].defaultValue, updatedAt: null, updatedByUserId: null}))
registerEndpoint('/api/order', () => [])
registerEndpoint('/api/order/waitlist', () => [])
// The scaffold's dry run decides each dinner of the season it is asked about; a dinner it leaves out reads as closed and
// refreshes the season
const scaffold = registerScaffoldEndpoint()
const runOnSeason = (results: BookingResult[] = []) => (body: ScaffoldOrdersRequest) => OrderFactory.defaultScaffoldOrdersResponse({
    dinners: season.dinnerEvents.filter(({id}) => body.dinnerEventIds.includes(id)).map(({id, date}) => ({id, date})), results
}, body.householdId)
beforeEach(() => {
    scaffold.reset()
    scaffold.answers.expected = runOnSeason()
})

vi.setConfig({testTimeout: 20_000})
// A mounted page left alive keeps syncing its parameters into the next case's route
enableAutoUnmount(afterEach)

const household = HouseholdFactory.defaultHouseholdDetail('household-bookings')

const mountBookings = async (isMd: boolean | null | Ref<boolean | null>, props: {canEdit?: boolean, adminBypass?: boolean} = {}) => {
    const wrapper = await mountWithTooltipProvider(HouseholdBookings, {props: {household, ...props}, isMd})
    await vi.waitFor(() => expect(findByTestId(wrapper, 'household-bookings').exists()).toBe(true), {timeout: 10_000})
    await flushPromises()
    return wrapper
}

describe('HouseholdBookings calendar in ?cal=', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        mockNavigateTo.mockImplementation(landNavigation)
    })

    afterEach(() => {
        mockNavigateTo.mockReset()
        mockRoute.query = {}
    })

    it.each(VIEWPORTS)('$viewport: lands with the calendar of its viewport and spells it out in ?cal=', async ({isMd}) => {
        const wrapper = await mountBookings(isMd)

        await vi.waitFor(() => expect(mockRoute.query.cal).toBe(isMd ? 'open' : 'closed'))
        expect(wrapper.findComponent(DinnerCalendarDisplay).exists()).toBe(isMd)
    })
})

describe('HouseholdBookings master-detail layout', () => {
    const panelOf = (wrapper: Awaited<ReturnType<typeof mountBookings>>) =>
        findByTestId(wrapper, 'booking-grid-view').element.parentElement!

    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        mockNavigateTo.mockImplementation(landNavigation)
    })

    afterEach(() => {
        mockNavigateTo.mockReset()
        mockRoute.query = {}
    })

    it('day view with the calendar open: the calendar is the master, the booking panel the detail', async () => {
        mockRoute.query = {view: BookingViewSchema.enum.day, cal: 'open'}
        const wrapper = await mountBookings(true)

        await vi.waitFor(() => expect(wrapper.findComponent(DinnerCalendarDisplay).exists()).toBe(true))
        expectMasterDetail(wrapper.findComponent(DinnerCalendarDisplay).element.parentElement!, panelOf(wrapper))
    })

    it.each([
        {description: 'the month view', query: {view: BookingViewSchema.enum.month, cal: 'open'}},
        {description: 'the calendar closed', query: {view: BookingViewSchema.enum.day, cal: 'closed'}}
    ])('$description: the booking panel spans the row alone', async ({query}) => {
        mockRoute.query = query
        const wrapper = await mountBookings(true)

        await vi.waitFor(() => expect(findByTestId(wrapper, 'booking-grid-view').exists()).toBe(true))
        expect(wrapper.findComponent(DinnerCalendarDisplay).exists()).toBe(false)
        const row = panelOf(wrapper).parentElement!
        expect(row.children).toHaveLength(1)
        expect(Array.from(row.classList)).toEqual([])
    })
})

// The arrows' wiring to ?date=; which dinner is adjacent is useBookingView's navigation matrix
describe('HouseholdBookings date arrows', () => {
    // Two dinners four weeks apart and in two months, so a step of either view lands on the other one
    const firstDinner = {...dinnerEvent, id: 11, date: new Date(2030, 0, 7)}
    const lastDinner = {...dinnerEvent, id: 12, date: new Date(2030, 1, 4)}
    const seasonShape = {dinnerEvents: season.dinnerEvents, seasonDates: season.seasonDates}

    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        mockNavigateTo.mockImplementation(landNavigation)
        Object.assign(season, {
            dinnerEvents: [firstDinner, lastDinner],
            seasonDates: {start: new Date(2030, 0, 1), end: new Date(2030, 2, 31)}
        })
    })

    afterEach(() => {
        mockNavigateTo.mockReset()
        mockRoute.query = {}
        Object.assign(season, seasonShape)
    })

    it.each([BookingViewSchema.enum.week, BookingViewSchema.enum.month])('%s: the next arrow moves ?date= to the next dinner and the previous arrow brings it back', async (view) => {
        mockRoute.query = {view, date: formatDate(firstDinner.date)}
        const wrapper = await mountBookings(true)

        await vi.waitFor(() => expect(findByTestId(wrapper, 'date-nav-next').exists()).toBe(true))
        await clickByTestId(wrapper, 'date-nav-next')
        await vi.waitFor(() => expect(mockRoute.query.date).toBe(formatDate(lastDinner.date)))

        await vi.waitFor(() => expect(findByTestId(wrapper, 'date-nav-prev').exists()).toBe(true))
        await clickByTestId(wrapper, 'date-nav-prev')
        await vi.waitFor(() => expect(mockRoute.query.date).toBe(formatDate(firstDinner.date)))
    })

    it('week: the next arrow is gone on the season\'s last dinner', async () => {
        mockRoute.query = {view: BookingViewSchema.enum.week, date: formatDate(lastDinner.date)}
        const wrapper = await mountBookings(true)

        await vi.waitFor(() => expect(findByTestId(wrapper, 'date-nav-prev').exists()).toBe(true))
        expect(findByTestId(wrapper, 'date-nav-next').exists()).toBe(false)
    })
})

// While the range's orders load, the table of the view runs its loading bar over the household's rows
describe('HouseholdBookings while the orders of the range load', () => {
    let held: ReturnType<typeof holdEndpoint>

    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        mockNavigateTo.mockImplementation(landNavigation)
        held = holdEndpoint('/api/order', [])
    })

    afterEach(() => {
        held.release()
        held.unregister()
        mockNavigateTo.mockReset()
        mockRoute.query = {}
    })

    it.each([
        {view: BookingViewSchema.enum.week, table: BookingGridView},
        {view: BookingViewSchema.enum.day, table: DinnerBookingForm}
    ])('$view: GIVEN the orders are on the way THEN the table runs its loading bar over the household\'s rows, WHEN they land THEN the bar stops', async ({view, table}) => {
        mockRoute.query = {view, date: formatDate(dinnerEvent.date)}
        const wrapper = await mountBookings(true)
        const shown = () => wrapper.findComponent(table)

        await vi.waitFor(() => expect(isTableLoading(shown())).toBe(true))
        expect(shown().text()).toContain(household.inhabitants[0]!.name)

        held.release()

        await untilTrue(() => !isTableLoading(shown()))
        expect(shown().text()).toContain(household.inhabitants[0]!.name)
    })
})

// Every member reads (ADR-004): an admin on another household's bookings, before the override, reads the household's
// next run through the GET on the season's deadlines
describe('HouseholdBookings of another household, before the admin override', () => {
    const {DinnerModeSchema, BookingActionSchema} = useBookingValidation()
    const inhabitant = household.inhabitants[0]!
    const expectedReads = () => scaffold.sent.filter(({body}) => body.orders.length === 0)

    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        useToast().clear()
        mockNavigateTo.mockImplementation(landNavigation)
        scaffold.answers.expected = runOnSeason([OrderFactory.defaultBookingResult({
            inhabitantId: inhabitant.id, inhabitantName: inhabitant.name, dinnerEventId: dinnerEvent.id,
            dinnerMode: DinnerModeSchema.enum.DINEIN, action: BookingActionSchema.enum.BOOK
        })])
    })

    afterEach(() => {
        mockNavigateTo.mockReset()
        mockRoute.query = {}
    })

    it('GIVEN the week view without the override THEN the grid reads the expected bookings through the GET with no override, shows them ghosted and raises no toast', async () => {
        mockRoute.query = {view: BookingViewSchema.enum.week, date: formatDate(dinnerEvent.date)}
        const wrapper = await mountBookings(true, {canEdit: false, adminBypass: false})
        const grid = () => wrapper.findComponent(BookingGridView)
        const read = {query: {}, body: {householdId: household.id, dinnerEventIds: [dinnerEvent.id], orders: []}}

        // The grid sends the read, so it is mounted once a read is in; it reads again once the orders land
        await untilTrue(() => expectedReads().length > 0 && !isTableLoading(grid()))
        expect(expectedReads()).toEqual(expectedReads().map(() => read))
        const cell = grid().findAllComponents(DinnerModeSelector).find(selector => selector.props('name') === `cell-${inhabitant.id}-${dinnerEvent.id}`)
        expect(cell?.props()).toMatchObject({modelValue: DinnerModeSchema.enum.DINEIN, expected: true})
        expect(useToast().toasts.value).toEqual([])
    })
})
