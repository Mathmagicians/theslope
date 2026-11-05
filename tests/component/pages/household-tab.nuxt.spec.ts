// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, type MockInstance} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {nextTick, toValue} from 'vue'
import HouseholdPage from '~/pages/household/[shortname]/[tab].vue'
import HouseholdAllergies from '~/components/household/HouseholdAllergies.vue'
import HouseholdBookings from '~/components/household/HouseholdBookings.vue'
import HouseholdCard from '~/components/household/HouseholdCard.vue'
import HouseholdEconomy from '~/components/household/HouseholdEconomy.vue'
import HouseholdSettings from '~/components/household/HouseholdSettings.vue'
import {useHouseholdsStore} from '~/stores/households'
import {HELP_TEXTS} from '~/config/help-texts'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'
import {useCoreValidation, type HouseholdDetail, type SystemRole} from '~/composables/useCoreValidation'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {HOUSEHOLD_TAB, type HouseholdTab} from '~/utils/household'
import {findByTestId, itemAt, mountWithTooltipProvider, mountedStore, registerEmptyStoreEndpoints, resetStores, untilTrue} from '~~/tests/component/testHelpers'

// The test environment has no router to land a deep link on, and no session cookie
const {mockRoute, mockNavigateTo, useRoute, session, useUserSession} = await vi.hoisted(async () => {
    const {mockRouteAndNavigation, mockSession} = await import('~~/tests/component/hoistedMocks')
    const {HOUSEHOLD_TAB} = await import('~/utils/household')
    return {...mockRouteAndNavigation({path: '/household', params: {shortname: '', tab: HOUSEHOLD_TAB.bookings}}), ...mockSession()}
})
mockNuxtImport('useRoute', () => useRoute)
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useUserSession', () => useUserSession)

const me = UserFactory.defaultUserWithInhabitant('household-tab')
const {Inhabitant: myInhabitant} = me
if (!myInhabitant) throw new Error('the factory user lives in a household')
const mine = {...HouseholdFactory.defaultHouseholdDetail('household-tab-mine'), id: myInhabitant.household.id, pbsId: myInhabitant.household.pbsId}
const other = {...HouseholdFactory.defaultHouseholdDetail('household-tab-other'), id: mine.id + 1, pbsId: mine.pbsId + 1, shortName: 'BR_2_th'}
// The stores the tabs create read their datasets; the spec's own routes register after, and the last registration answers
registerEmptyStoreEndpoints()
registerEndpoint('/api/admin/allergy-type', () => [])
registerEndpoint('/api/household/allergy', () => [])
registerEndpoint('/api/billing', () => BillingFactory.defaultHouseholdBilling(other.id))
registerEndpoint('/api/admin/household', () => [mine, other])
// The detail never arrives: the page stays behind its ready gate, so no tab mounts
registerEndpoint(`/api/admin/household/${mine.id}`, () => new Promise(() => {}))
registerEndpoint(`/api/admin/household/${other.id}`, () => new Promise(() => {}))

// A mounted page left alive keeps reading the next case's route
enableAutoUnmount(afterEach)

const landOn = (shortname: string, query: Record<string, string>) => {
    mockRoute.params = {shortname, tab: HOUSEHOLD_TAB.bookings}
    mockRoute.query = query
}

describe('household/[shortname]/[tab] - the household in the URL', () => {
    beforeEach(() => {
        resetStores()
        session.user.value = me
    })

    it.each<{description: string, shortname: string, query: Record<string, string>}>([
        {description: 'selects the household ?pbs= names', shortname: mine.shortName, query: {pbs: String(other.pbsId)}},
        {description: 'selects the household the short name names when ?pbs= is absent', shortname: other.shortName, query: {}}
    ])('$description', async ({shortname, query}) => {
        landOn(shortname, query)

        await mountWithTooltipProvider(HouseholdPage)

        await vi.waitFor(() => expect(useHouseholdsStore().selectedHouseholdId).toBe(other.id))
    })

    it('returns to my household when ?pbs= is cleared and the short name names no household', async () => {
        landOn('nowhere', {pbs: String(other.pbsId)})
        await mountWithTooltipProvider(HouseholdPage)
        await vi.waitFor(() => expect(useHouseholdsStore().selectedHouseholdId).toBe(other.id))

        mockRoute.query = {}

        await vi.waitFor(() => expect(useHouseholdsStore().selectedHouseholdId).toBe(mine.id))
    })

    describe('the setter', () => {
        let selectHousehold: MockInstance<ReturnType<typeof useHouseholdsStore>['selectHousehold']>

        beforeEach(() => {
            selectHousehold = vi.spyOn(mountedStore(useHouseholdsStore), 'selectHousehold')
        })

        afterEach(() => {
            selectHousehold.mockRestore()
        })

        it('hands the store the URL\'s household once at setup, and the store follows the URL with no further setter call', async () => {
            landOn(other.shortName, {pbs: String(other.pbsId)})

            await mountWithTooltipProvider(HouseholdPage)

            expect(selectHousehold).toHaveBeenCalledTimes(1)
            const [choice] = itemAt(selectHousehold.mock.calls, 0)
            expect(toValue(choice)).toEqual({shortName: other.shortName, pbsId: other.pbsId})

            landOn(mine.shortName, {})

            expect(toValue(choice)).toEqual({shortName: mine.shortName, pbsId: undefined})
            expect(selectHousehold).toHaveBeenCalledTimes(1)
        })
    })
})

describe('household/[shortname]/[tab] - an app with no households', () => {
    let unregister: () => void = () => {}
    beforeEach(() => {
        resetStores()
        session.user.value = me
        unregister = registerEndpoint('/api/admin/household', () => [])
    })
    afterEach(() => {
        unregister()
    })

    it('GIVEN no households THEN the page says so and mounts no tab', async () => {
        landOn('nowhere', {})

        const wrapper = await mountWithTooltipProvider(HouseholdPage)

        await vi.waitFor(() => expect(wrapper.text()).toContain(HOUSEHOLD_WORDS.page.noHouseholds))
        expect(wrapper.findAll('[role="tab"]')).toHaveLength(0)
    })
})

// Every member reads; a household changes its own data, an admin any household's and the allergy manager any
// household's allergies, through the override the visitor banner offers
describe('household/[shortname]/[tab] - the override on another household', () => {
    const Role = useCoreValidation().SystemRoleSchema.enum
    const userWith = (systemRoles: SystemRole[]) =>
        UserFactory.defaultUserWithInhabitant('household-tab', {systemRoles})
    const households = {'another household': other, 'their own household': mine}

    // The detail lands, so the page passes its ready gate and mounts the tab
    let unregister: (() => void)[] = []
    beforeEach(() => {
        resetStores()
        unregister = [mine, other].map(household => registerEndpoint(`/api/admin/household/${household.id}`, () => household))
    })
    afterEach(() => {
        unregister.forEach(off => off())
    })

    // The page passes its ready gate once the URL's household has loaded; the wait is bounded by the test's timeout
    const mountOn = async (household: HouseholdDetail, tab: HouseholdTab) => {
        mockRoute.params = {shortname: household.shortName, tab}
        mockRoute.query = {pbs: String(household.pbsId)}
        const wrapper = await mountWithTooltipProvider(HouseholdPage)
        const householdsStore = mountedStore(useHouseholdsStore)
        await untilTrue(() => householdsStore.isHouseholdsStoreReady && householdsStore.selectedHousehold?.id === household.id)
        await nextTick()
        expect(wrapper.text()).toContain(household.address)
        return wrapper
    }

    it('the tabs carry the titles of the household page\'s help texts, in the tabs\' order', async () => {
        session.user.value = me

        const wrapper = await mountOn(mine, HOUSEHOLD_TAB.bookings)

        const labels = wrapper.findAll('[role="tab"]').map(tab => tab.text())
        expect(labels).toEqual(Object.values(HOUSEHOLD_TAB).map(tab => HELP_TEXTS.household[tab].title))
    })

    it.each([
        {viewer: 'an admin', roles: [Role.ADMIN], on: 'another household', tab: HOUSEHOLD_TAB.settings, shows: true},
        {viewer: 'the allergy manager', roles: [Role.ALLERGYMANAGER], on: 'another household', tab: HOUSEHOLD_TAB.allergies, shows: true},
        {viewer: 'the allergy manager', roles: [Role.ALLERGYMANAGER], on: 'another household', tab: HOUSEHOLD_TAB.settings, shows: false},
        {viewer: 'the allergy manager', roles: [Role.ALLERGYMANAGER], on: 'another household', tab: HOUSEHOLD_TAB.bookings, shows: false},
        {viewer: 'a member', roles: [], on: 'another household', tab: HOUSEHOLD_TAB.allergies, shows: false},
        {viewer: 'an admin', roles: [Role.ADMIN], on: 'their own household', tab: HOUSEHOLD_TAB.allergies, shows: false},
        {viewer: 'the allergy manager', roles: [Role.ALLERGYMANAGER], on: 'their own household', tab: HOUSEHOLD_TAB.allergies, shows: false}
    ] as const)('GIVEN $viewer on the $tab tab of $on THEN the visitor banner shows on another household, and the override button shows: $shows', async ({roles, on, tab, shows}) => {
        session.user.value = userWith([...roles])

        const wrapper = await mountOn(households[on], tab)

        expect(findByTestId(wrapper, 'visitor-banner').exists()).toBe(on === 'another household')
        expect(findByTestId(wrapper, 'admin-override-btn').exists()).toBe(shows)
    })

    // The page hands canEdit and adminBypass to the tabs that declare them; a tab without them takes neither, so
    // neither lands on its root as an attribute
    it.each([
        {viewer: 'the allergy manager', roles: [Role.ALLERGYMANAGER], tab: HOUSEHOLD_TAB.allergies, component: HouseholdAllergies, declares: true},
        {viewer: 'an admin', roles: [Role.ADMIN], tab: HOUSEHOLD_TAB.bookings, component: HouseholdBookings, declares: true},
        {viewer: 'an admin', roles: [Role.ADMIN], tab: HOUSEHOLD_TAB.members, component: HouseholdCard, declares: true},
        {viewer: 'an admin', roles: [Role.ADMIN], tab: HOUSEHOLD_TAB.settings, component: HouseholdSettings, declares: true},
        {viewer: 'an admin', roles: [Role.ADMIN], tab: HOUSEHOLD_TAB.economy, component: HouseholdEconomy, declares: false}
    ] as const)('GIVEN $viewer on another household\'s $tab tab WHEN the override is confirmed THEN the tab takes canEdit and adminBypass as props: $declares, and no attribute falls through', async ({roles, tab, component, declares}) => {
        session.user.value = userWith([...roles])
        // A visitor neither edits nor bypasses until the override is confirmed
        const handed = (override: boolean) => declares ? {canEdit: override, adminBypass: override} : {}
        const wrapper = await mountOn(other, tab)
        await vi.waitFor(() => expect(wrapper.findComponent(component).exists()).toBe(true))
        expect(wrapper.findComponent(component).props()).toMatchObject(handed(false))
        expect(findByTestId(wrapper, 'admin-override-btn').exists()).toBe(true)

        // The override asks twice: the first click arms it, the second confirms
        const override = findByTestId(wrapper, 'admin-override-btn').find('button')
        await override.trigger('click')
        await override.trigger('click')

        await vi.waitFor(() => expect(findByTestId(wrapper, 'admin-override-active').exists()).toBe(true))
        const tabComponent = wrapper.findComponent(component)
        expect(tabComponent.props()).toMatchObject(handed(true))
        expect(tabComponent.vm.$attrs).toEqual({})
        expect(tabComponent.attributes()).not.toHaveProperty('can-edit')
        expect(tabComponent.attributes()).not.toHaveProperty('admin-bypass')
    })
})
