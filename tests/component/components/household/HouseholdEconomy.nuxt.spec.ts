// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {nextTick} from 'vue'
import {enableAutoUnmount} from '@vue/test-utils'
import HouseholdEconomy from '~/components/household/HouseholdEconomy.vue'
import {useBookingsStore} from '~/stores/bookings'
import {usePlanStore} from '~/stores/plan'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {mountWithTooltipProvider, mountedStore, resetStores, registerEmptyStoreEndpoints, untilTrue, cellsByHeader} from '~~/tests/component/testHelpers'

// The test environment has no session cookie
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

const SALT = 'household-economy'
const member = UserFactory.defaultUserWithInhabitant(SALT)
// The member's own household: the households store selects it from the session
const household = {...HouseholdFactory.defaultHouseholdDetail(SALT), id: member.Inhabitant!.household!.id}
const season = {...SeasonFactory.defaultSeason(SALT), id: 7}
const dinnerEvent = DinnerEventFactory.defaultDinnerEventDisplay(SALT)
const upcoming = [OrderFactory.defaultOrder(SALT, {dinnerEventId: dinnerEvent.id, inhabitantId: household.inhabitants[0]!.id, dinnerEvent})]

// Only HTTP is faked (testing.md Rule 6)
registerEmptyStoreEndpoints()
registerEndpoint('/api/admin/season/active', () => season.id)
registerEndpoint('/api/admin/season', () => [season])
registerEndpoint(`/api/admin/season/${season.id}`, () => season)
registerEndpoint(`/api/admin/household/${household.id}`, () => household)
registerEndpoint('/api/billing', () => BillingFactory.defaultHouseholdBilling(household.id))
registerEndpoint('/api/order', () => upcoming)

// The next test's resetStores drops the datasets a still-mounted view reads
enableAutoUnmount(afterEach)

describe('HouseholdEconomy - the upcoming orders', () => {
    beforeEach(() => {
        resetStores()
        session.user.value = member
    })

    it('GIVEN the upcoming orders have loaded THEN the dinner\'s row reads the dinner\'s menu title under Menu', async () => {
        const wrapper = await mountWithTooltipProvider(HouseholdEconomy, {props: {household}})
        const bookings = mountedStore(useBookingsStore)
        await untilTrue(() => mountedStore(usePlanStore).isSelectedSeasonInitialized && bookings.isUpcomingOrdersLoaded && bookings.householdBilling !== null)
        await nextTick()

        // The first of the view's two tables: Kommende
        expect(cellsByHeader(wrapper.findComponent({name: 'EconomyTable'})).Menu).toBe(dinnerEvent.menuTitle)
    })
})
