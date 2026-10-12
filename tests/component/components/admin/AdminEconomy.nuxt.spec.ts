// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {toValue} from 'vue'
import {enableAutoUnmount} from '@vue/test-utils'
import AdminEconomy from '~/components/admin/AdminEconomy.vue'
import {useBookingsStore} from '~/stores/bookings'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {mountWithTooltipProvider, mountedStore, resetStores, registerEmptyStoreEndpoints} from '~~/tests/component/testHelpers'

// The test environment has no router to land a deep link on, and no session cookie
const {mockRoute, mockNavigateTo, landNavigation, useRoute, session, useUserSession} = await vi.hoisted(async () => {
    const {mockRouteAndNavigation, mockSession} = await import('~~/tests/component/hoistedMocks')
    return {...mockRouteAndNavigation({path: '/admin/economy', params: {tab: 'economy'}}), ...mockSession()}
})
mockNuxtImport('useRoute', () => useRoute)
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useUserSession', () => useUserSession)
mockNavigateTo.mockImplementation(landNavigation)

const period = BillingFactory.defaultSummaryData('admin-economy')
const invoice = period.invoices[0]!
registerEmptyStoreEndpoints()
registerEndpoint(`/api/admin/billing/periods/${period.id}`, () => period)
registerEndpoint('/api/admin/billing/periods', () => [period])
registerEndpoint(`/api/admin/billing/invoices/${invoice.id}`, () => [])

// The next test's resetStores drops the datasets a still-mounted page reads
enableAutoUnmount(afterEach)

type Store = ReturnType<typeof useBookingsStore>

describe('AdminEconomy - the billing selection in the URL', () => {
    beforeEach(() => {
        resetStores()
        session.user.value = UserFactory.defaultUserWithInhabitant('admin-economy')
        mockRoute.query = {}
        mountedStore(useBookingsStore).loadBillingOverview(() => true)
    })

    describe.each([
        {param: 'period', id: period.id, setter: 'selectBillingPeriod' as const, selectedId: (store: Store) => store.selectedBillingPeriodId},
        {param: 'invoice', id: invoice.id, setter: 'selectInvoice' as const, selectedId: (store: Store) => store.selectedInvoiceId}
    ])('?$param=', ({param, id, setter, selectedId}) => {
        const landOn = () => {
            mockRoute.query = {period: String(period.id), invoice: String(invoice.id)}
        }

        it('hands the store the URL\'s selection once at setup, and the store follows the URL with no further setter call', async () => {
            landOn()
            const select = vi.spyOn(mountedStore(useBookingsStore), setter)

            await mountWithTooltipProvider(AdminEconomy)

            expect(select).toHaveBeenCalledTimes(1)
            const choice = select.mock.calls[0]![0]
            expect(toValue(choice)).toBe(id)
            await vi.waitFor(() => expect(selectedId(useBookingsStore())).toBe(id))

            mockRoute.query = {}

            expect(toValue(choice)).toBeNull()
            expect(select).toHaveBeenCalledTimes(1)
        })

        it('a cleared param deselects', async () => {
            landOn()
            await mountWithTooltipProvider(AdminEconomy)
            await vi.waitFor(() => expect(selectedId(useBookingsStore())).toBe(id))

            const {[param]: _cleared, ...rest} = mockRoute.query
            mockRoute.query = rest

            await vi.waitFor(() => expect(selectedId(useBookingsStore())).toBeNull())
        })
    })
})
