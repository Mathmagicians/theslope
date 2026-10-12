// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {ref, type Ref} from 'vue'
import {mountWithTooltipProvider, resetStores, VIEWPORTS} from '~~/tests/component/testHelpers'
import HouseholdBookings from '~/components/household/HouseholdBookings.vue'
import DinnerCalendarDisplay from '~/components/calendar/DinnerCalendarDisplay.vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'

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

    it('waits for the layout to measure the viewport before it writes ?cal=', async () => {
        const isMd = ref<boolean | null>(null)
        await mountBookings(isMd)
        expect(mockRoute.query.cal).toBeUndefined()

        isMd.value = true

        await vi.waitFor(() => expect(mockRoute.query.cal).toBe('open'))
    })

    it('follows ?cal= from the URL over the viewport default', async () => {
        mockRoute.query = {cal: 'open'}
        const wrapper = await mountBookings(false)

        expect(wrapper.findComponent(DinnerCalendarDisplay).exists()).toBe(true)
    })
})
