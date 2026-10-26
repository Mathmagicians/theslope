// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, resetStores, registerEmptyStoreEndpoints, holdEndpoint, findLoadingRow, tableHeaders, cellsByHeader, VIEWPORTS} from '~~/tests/component/testHelpers'
import AdminUsers from '~/components/admin/AdminUsers.vue'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

// Only HTTP is faked (testing.md Rule 6)
registerEmptyStoreEndpoints()
const user = UserFactory.defaultUserWithInhabitant('admin-users')
registerEndpoint('/api/admin/users', () => [user])

// The expand column has no header text
const HEADERS = ['', '#', 'Navn', 'Mail', 'Telefon', 'Systemroller', 'Sidst opdateret']

const mountUsers = (isMd: boolean) => mountWithTooltipProvider(AdminUsers, {props: {canEdit: true}, isMd})

// The next test's resetStores drops the datasets a still-mounted table reads
enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

// Every viewport shows every column, the user's values under them; on a phone the table scrolls sideways in its card
describe('AdminUsers table', () => {
    it.each(VIEWPORTS)('$viewport: the columns read # to Sidst opdateret beside the expand column, and the user\'s row holds their phone under Telefon', async ({isMd}) => {
        const wrapper = await mountUsers(isMd)
        await vi.waitFor(() => expect(wrapper.find('tbody').text()).toContain(user.email))

        expect(tableHeaders(wrapper)).toEqual(HEADERS)
        expect(cellsByHeader(wrapper)).toMatchObject({Telefon: user.phone})
    })
})

// Until the users answer, the table's loading row stands where the empty text would
describe('AdminUsers while the users load', () => {
    let held: ReturnType<typeof holdEndpoint>

    beforeEach(() => {
        held = holdEndpoint('/api/admin/users', [])
    })

    afterEach(() => {
        held.release()
        held.unregister()
    })

    it('GIVEN the users are on the way THEN the loading row shows, WHEN none answer THEN the empty text', async () => {
        const wrapper = await mountUsers(true)

        await vi.waitFor(() => expect(findLoadingRow(wrapper).text()).toContain('Henter brugere...'))
        expect(wrapper.text()).not.toContain('Ingen brugere at vise')

        held.release()

        await vi.waitFor(() => expect(wrapper.text()).toContain('Ingen brugere at vise'))
        expect(findLoadingRow(wrapper).exists()).toBe(false)
    })
})
