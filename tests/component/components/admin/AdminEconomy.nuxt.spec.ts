// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {toValue} from 'vue'
import {enableAutoUnmount} from '@vue/test-utils'
import AdminEconomy from '~/components/admin/AdminEconomy.vue'
import {useBookingsStore} from '~/stores/bookings'
import type {UserDetail} from '~/composables/useCoreValidation'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {mountWithTooltipProvider, mountedStore, resetStores} from '~~/tests/component/testHelpers'

// The test environment has no router to land a deep link on, and no session cookie
const {mockRoute, sessionUser} = await vi.hoisted(async () => {
    const {reactive, ref} = await import('vue')
    return {
        mockRoute: reactive({path: '/admin/economy', params: {tab: 'economy'}, query: {} as Record<string, string>, hash: ''}),
        sessionUser: ref<UserDetail | null>(null)
    }
})
mockNuxtImport('useRoute', () => () => mockRoute)
mockNuxtImport('navigateTo', () => vi.fn((to: {query: Record<string, string>}) => {
    mockRoute.query = to.query
}))
mockNuxtImport('useUserSession', () => () => ({
    loggedIn: {value: true},
    user: sessionUser,
    session: {value: null},
    clear: vi.fn(),
    fetch: vi.fn()
}))

const period = BillingFactory.defaultSummaryData('admin-economy')
const invoice = period.invoices[0]!
registerEndpoint(`/api/admin/billing/periods/${period.id}`, () => period)
registerEndpoint('/api/admin/billing/periods', () => [period])
registerEndpoint(`/api/admin/billing/invoices/${invoice.id}`, () => [])
registerEndpoint('/api/admin/billing/current-period', () => [])
registerEndpoint('/api/order', () => [])
registerEndpoint('/api/admin/household', () => [])
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])

// The next test's resetStores drops the datasets a still-mounted page reads
enableAutoUnmount(afterEach)

type Store = ReturnType<typeof useBookingsStore>

describe('AdminEconomy - the billing selection in the URL', () => {
    beforeEach(() => {
        resetStores()
        sessionUser.value = UserFactory.defaultUserWithInhabitant('admin-economy')
        mockRoute.query = {}
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
