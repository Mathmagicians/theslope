// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import type {Ref} from 'vue'
import {mountWithTooltipProvider, resetStores, VIEWPORTS, holdEndpoint, isTableLoading, expectMasterDetail} from '~~/tests/component/testHelpers'
import HouseholdBookings from '~/components/household/HouseholdBookings.vue'
import DinnerCalendarDisplay from '~/components/calendar/DinnerCalendarDisplay.vue'
import BookingGridView from '~/components/booking/BookingGridView.vue'
import DinnerBookingForm from '~/components/dinner/DinnerBookingForm.vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {BookingViewSchema} from '~/composables/useBookingView'
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
registerEndpoint('/api/order', () => [])
registerEndpoint('/api/order/waitlist', () => [])

vi.setConfig({testTimeout: 20_000})
// A mounted page left alive keeps syncing its parameters into the next case's route
enableAutoUnmount(afterEach)

const household = HouseholdFactory.defaultHouseholdDetail('household-bookings')

const mountBookings = async (isMd: boolean | null | Ref<boolean | null>) => {
    const wrapper = await mountWithTooltipProvider(HouseholdBookings, {props: {household}, isMd})
    await vi.waitFor(() => expect(wrapper.find('[data-testid="household-bookings"]').exists()).toBe(true), {timeout: 10_000})
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
        wrapper.find('[data-testid="booking-grid-view"]').element.parentElement!

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

        await vi.waitFor(() => expect(wrapper.find('[data-testid="booking-grid-view"]').exists()).toBe(true))
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
    const arrow = (wrapper: Awaited<ReturnType<typeof mountBookings>>, direction: 'prev' | 'next') =>
        wrapper.find(`[data-testid="date-nav-${direction}"]`)

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

        await vi.waitFor(() => expect(arrow(wrapper, 'next').exists()).toBe(true))
        await arrow(wrapper, 'next').trigger('click')
        await vi.waitFor(() => expect(mockRoute.query.date).toBe(formatDate(lastDinner.date)))

        await vi.waitFor(() => expect(arrow(wrapper, 'prev').exists()).toBe(true))
        await arrow(wrapper, 'prev').trigger('click')
        await vi.waitFor(() => expect(mockRoute.query.date).toBe(formatDate(firstDinner.date)))
    })

    it('week: the next arrow is gone on the season\'s last dinner', async () => {
        mockRoute.query = {view: BookingViewSchema.enum.week, date: formatDate(lastDinner.date)}
        const wrapper = await mountBookings(true)

        await vi.waitFor(() => expect(arrow(wrapper, 'prev').exists()).toBe(true))
        expect(arrow(wrapper, 'next').exists()).toBe(false)
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

        await vi.waitFor(() => expect(isTableLoading(shown())).toBe(false))
        expect(shown().text()).toContain(household.inhabitants[0]!.name)
    })
})
