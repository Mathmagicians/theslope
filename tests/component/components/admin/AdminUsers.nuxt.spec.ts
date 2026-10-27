// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, resetStores, registerEmptyStoreEndpoints, holdEndpoint, findLoadingRow, tableHeaders, cellsByHeader, VIEWPORTS, findByTestId, findOpenRows} from '~~/tests/component/testHelpers'
import AdminUsers from '~/components/admin/AdminUsers.vue'
import UserProfileCard from '~/components/user/UserProfileCard.vue'
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

describe('AdminUsers open row', () => {
    const second = UserFactory.defaultUserWithInhabitant('admin-users-second', {id: user.id + 1})
    let unregister: () => void = () => {}

    beforeEach(() => {
        unregister = registerEndpoint('/api/admin/users', () => [user, second])
    })

    afterEach(() => unregister())

    it('GIVEN the search narrowed to the second user and their row open WHEN the search clears and the first user\'s row returns above it THEN the open row and the profile card under it stay the second user\'s', async () => {
        const wrapper = await mountUsers(true)
        await vi.waitFor(() => expect(wrapper.find('tbody').text()).toContain(second.email))
        await findByTestId(wrapper, 'user-search').setValue(second.email)
        await wrapper.find('tbody button[aria-label="Åbn detaljer"]').trigger('click')

        await findByTestId(wrapper, 'user-search').setValue('')

        const open = findOpenRows(wrapper)
        expect(open.map(({row}) => row.text())).toEqual([expect.stringContaining(second.email)])
        expect(open[0]!.detail.findComponent(UserProfileCard).props('user')).toMatchObject({id: second.id, email: second.email})
    })
})
