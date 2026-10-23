// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, type MockInstance} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {toValue} from 'vue'
import HouseholdPage from '~/pages/household/[shortname]/[tab].vue'
import HouseholdAllergies from '~/components/household/HouseholdAllergies.vue'
import {useHouseholdsStore} from '~/stores/households'
import {useCoreValidation, type HouseholdDetail} from '~/composables/useCoreValidation'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {findByTestId, mountWithTooltipProvider, mountedStore, registerEmptyStoreEndpoints, resetStores} from '~~/tests/component/testHelpers'

// The test environment has no router to land a deep link on, and no session cookie
const {mockRoute, mockNavigateTo, useRoute, session, useUserSession} = await vi.hoisted(async () => {
    const {mockRouteAndNavigation, mockSession} = await import('~~/tests/component/hoistedMocks')
    return {...mockRouteAndNavigation({path: '/household', params: {shortname: '', tab: 'bookings'}}), ...mockSession()}
})
mockNuxtImport('useRoute', () => useRoute)
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useUserSession', () => useUserSession)

const me = UserFactory.defaultUserWithInhabitant('household-tab')
const mine = {...HouseholdFactory.defaultHouseholdDetail('household-tab-mine'), id: me.Inhabitant!.household!.id, pbsId: me.Inhabitant!.household!.pbsId}
const other = {...HouseholdFactory.defaultHouseholdDetail('household-tab-other'), id: mine.id + 1, pbsId: mine.pbsId + 1, shortName: 'BR_2_th'}
// The stores the tabs create read their datasets; the spec's own routes register after, and the last registration answers
registerEmptyStoreEndpoints()
registerEndpoint('/api/admin/allergy-type', () => [])
registerEndpoint('/api/household/allergy', () => [])
registerEndpoint('/api/admin/household', () => [mine, other])
// The detail never arrives: the page stays behind its ready gate, so no tab mounts
registerEndpoint(`/api/admin/household/${mine.id}`, () => new Promise(() => {}))
registerEndpoint(`/api/admin/household/${other.id}`, () => new Promise(() => {}))

// A mounted page left alive keeps reading the next case's route
enableAutoUnmount(afterEach)

const landOn = (shortname: string, query: Record<string, string>) => {
    mockRoute.params = {shortname, tab: 'bookings'}
    mockRoute.query = query
}

describe('household/[shortname]/[tab] - the household in the URL', () => {
    beforeEach(() => {
        resetStores()
        session.user.value = me
    })

    it.each([
        {description: 'selects the household ?pbs= names', shortname: mine.shortName, query: {pbs: String(other.pbsId)} as Record<string, string>},
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
            const choice = selectHousehold.mock.calls[0]![0]
            expect(toValue(choice)).toEqual({shortName: other.shortName, pbsId: other.pbsId})

            landOn(mine.shortName, {})

            expect(toValue(choice)).toEqual({shortName: mine.shortName, pbsId: undefined})
            expect(selectHousehold).toHaveBeenCalledTimes(1)
        })
    })
})

// Every member reads; a household changes its own data, an admin any household's and the allergy manager any
// household's allergies, through the override the visitor banner offers (ADR-004)
describe('household/[shortname]/[tab] - the override on another household', () => {
    const SystemRole = useCoreValidation().SystemRoleSchema.enum
    const userWith = (systemRoles: (typeof SystemRole)[keyof typeof SystemRole][]) =>
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

    const mountOn = async (household: HouseholdDetail, tab: string) => {
        mockRoute.params = {shortname: household.shortName, tab}
        mockRoute.query = {pbs: String(household.pbsId)}
        const wrapper = await mountWithTooltipProvider(HouseholdPage)
        await vi.waitFor(() => expect(wrapper.text()).toContain(household.address))
        return wrapper
    }

    it.each([
        {viewer: 'an admin', roles: [SystemRole.ADMIN], on: 'another household', tab: 'settings', shows: true},
        {viewer: 'the allergy manager', roles: [SystemRole.ALLERGYMANAGER], on: 'another household', tab: 'allergies', shows: true},
        {viewer: 'the allergy manager', roles: [SystemRole.ALLERGYMANAGER], on: 'another household', tab: 'settings', shows: false},
        {viewer: 'a member', roles: [], on: 'another household', tab: 'allergies', shows: false},
        {viewer: 'an admin', roles: [SystemRole.ADMIN], on: 'their own household', tab: 'allergies', shows: false},
        {viewer: 'the allergy manager', roles: [SystemRole.ALLERGYMANAGER], on: 'their own household', tab: 'allergies', shows: false}
    ] as const)('GIVEN $viewer on the $tab tab of $on THEN the override button shows: $shows', async ({roles, on, tab, shows}) => {
        session.user.value = userWith([...roles])

        const wrapper = await mountOn(households[on], tab)

        expect(findByTestId(wrapper, 'admin-override-btn').exists()).toBe(shows)
    })

    it('GIVEN the allergy manager on another household\'s allergies tab WHEN the override is confirmed THEN the allergies tab can edit', async () => {
        session.user.value = userWith([SystemRole.ALLERGYMANAGER])
        const wrapper = await mountOn(other, 'allergies')
        await vi.waitFor(() => expect(wrapper.findComponent(HouseholdAllergies).exists()).toBe(true))
        expect(wrapper.findComponent(HouseholdAllergies).props('canEdit')).toBe(false)
        expect(findByTestId(wrapper, 'admin-override-btn').exists()).toBe(true)

        // The override asks twice: the first click arms it, the second confirms
        const override = findByTestId(wrapper, 'admin-override-btn').find('button')
        await override.trigger('click')
        await override.trigger('click')

        await vi.waitFor(() => expect(wrapper.findComponent(HouseholdAllergies).props('canEdit')).toBe(true))
    })
})
