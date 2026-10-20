// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, resetStores, registerEmptyStoreEndpoints, holdEndpoint, findLoadingRow} from '~~/tests/component/testHelpers'
import AdminHouseholds from '~/components/admin/AdminHouseholds.vue'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

// The households load for a logged-in user: the session comes from a cookie the test runtime lacks
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

// Only HTTP is faked (testing.md Rule 6)
registerEmptyStoreEndpoints()

// The next test's resetStores drops the datasets a still-mounted table reads
enableAutoUnmount(afterEach)

// Until the households answer, the table's loading row stands where the empty state would
describe('AdminHouseholds while the households load', () => {
    let held: ReturnType<typeof holdEndpoint>

    beforeEach(() => {
        resetStores()
        session.user.value = UserFactory.defaultUserWithInhabitant('admin-households')
        held = holdEndpoint('/api/admin/household', [])
    })

    afterEach(() => {
        held.release()
        held.unregister()
    })

    it('GIVEN the households are on the way THEN the loading row shows, WHEN none answer THEN the empty state', async () => {
        const wrapper = await mountWithTooltipProvider(AdminHouseholds, {props: {canEdit: true}, isMd: true})

        await vi.waitFor(() => expect(findLoadingRow(wrapper).text()).toContain('Henter husstande...'))
        expect(wrapper.text()).not.toContain('Ingen er flyttet ind i appen endnu')

        held.release()

        await vi.waitFor(() => expect(wrapper.text()).toContain('Ingen er flyttet ind i appen endnu'))
        expect(findLoadingRow(wrapper).exists()).toBe(false)
    })
})
