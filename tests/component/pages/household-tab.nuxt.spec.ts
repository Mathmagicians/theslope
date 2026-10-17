// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, type MockInstance} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {toValue} from 'vue'
import HouseholdPage from '~/pages/household/[shortname]/[tab].vue'
import {useHouseholdsStore} from '~/stores/households'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {mountWithTooltipProvider, mountedStore, resetStores} from '~~/tests/component/testHelpers'

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
