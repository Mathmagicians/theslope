// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, resetStores, registerEmptyStoreEndpoints, holdEndpoint, findLoadingRow} from '~~/tests/component/testHelpers'
import AdminUsers from '~/components/admin/AdminUsers.vue'

// Only HTTP is faked (testing.md Rule 6)
registerEmptyStoreEndpoints()

// The next test's resetStores drops the datasets a still-mounted table reads
enableAutoUnmount(afterEach)

// Until the users answer, the table's loading row stands where the empty text would
describe('AdminUsers while the users load', () => {
    let held: ReturnType<typeof holdEndpoint>

    beforeEach(() => {
        resetStores()
        held = holdEndpoint('/api/admin/users', [])
    })

    afterEach(() => {
        held.release()
        held.unregister()
    })

    it('GIVEN the users are on the way THEN the loading row shows, WHEN none answer THEN the empty text', async () => {
        const wrapper = await mountWithTooltipProvider(AdminUsers, {props: {canEdit: true}, isMd: true})

        await vi.waitFor(() => expect(findLoadingRow(wrapper).text()).toContain('Henter brugere...'))
        expect(wrapper.text()).not.toContain('Ingen brugere at vise')

        held.release()

        await vi.waitFor(() => expect(wrapper.text()).toContain('Ingen brugere at vise'))
        expect(findLoadingRow(wrapper).exists()).toBe(false)
    })
})
