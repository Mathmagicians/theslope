// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, resetStores, registerEmptyStoreEndpoints, holdEndpoint, isTableLoading, untilTrue, mountedStore} from '~~/tests/component/testHelpers'
import HouseholdAllergies from '~/components/household/HouseholdAllergies.vue'
import {useAllergiesStore} from '~/stores/allergies'
import {nextTick} from 'vue'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

// The store reads the session user's household: the session comes from a cookie the test runtime lacks
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

// Only HTTP is faked (testing.md Rule 6)
const user = UserFactory.defaultUserWithInhabitant('household-allergies')
const household = {...HouseholdFactory.defaultHouseholdDetail('household-allergies'), id: user.Inhabitant!.household!.id}
registerEmptyStoreEndpoints()
registerEndpoint('/api/admin/allergy-type', () => [])
registerEndpoint(`/api/admin/household/${household.id}`, () => household)

// The next test's resetStores drops the datasets a still-mounted table reads
enableAutoUnmount(afterEach)

// While the household's allergies load, the table runs its loading bar over its inhabitants
describe('HouseholdAllergies while the allergies load', () => {
    let held: ReturnType<typeof holdEndpoint>

    beforeEach(() => {
        resetStores()
        session.user.value = user
        held = holdEndpoint('/api/household/allergy', [])
    })

    afterEach(() => {
        held.release()
        held.unregister()
    })

    it('GIVEN the allergies are on the way THEN the table runs its loading bar over the inhabitants, WHEN they land THEN the bar stops', async () => {
        const wrapper = await mountWithTooltipProvider(HouseholdAllergies, {props: {household, canEdit: true}, isMd: true})
        const name = household.inhabitants[0]!.name
        const allergies = mountedStore(useAllergiesStore)

        await untilTrue(() => allergies.isAllergiesLoading)
        await nextTick()
        expect(isTableLoading(wrapper)).toBe(true)
        expect(wrapper.text()).toContain(name)

        held.release()

        await untilTrue(() => !allergies.isAllergiesLoading)
        await nextTick()
        expect(isTableLoading(wrapper)).toBe(false)
        expect(wrapper.text()).toContain(name)
    })
})
