// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {mountWithTooltipProvider, resetStores, registerEmptyStoreEndpoints, holdEndpoint, findLoadingRow, findByTestId, findOpenRows} from '~~/tests/component/testHelpers'
import AdminHouseholds from '~/components/admin/AdminHouseholds.vue'
import HouseholdEditPanel from '~/components/admin/HouseholdEditPanel.vue'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import type {HouseholdDetail} from '~/composables/useCoreValidation'

// The households load for a logged-in user: the session comes from a cookie the test runtime lacks
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

// Only HTTP is faked (testing.md Rule 6)
registerEmptyStoreEndpoints()

const mountHouseholds = () => mountWithTooltipProvider(AdminHouseholds, {props: {canEdit: true}, isMd: true})

// The next test's resetStores drops the datasets a still-mounted table reads
enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
    session.user.value = UserFactory.defaultUserWithInhabitant('admin-households')
})

// Until the households answer, the table's loading row stands where the empty state would
describe('AdminHouseholds while the households load', () => {
    let held: ReturnType<typeof holdEndpoint>

    beforeEach(() => {
        held = holdEndpoint('/api/admin/household', [])
    })

    afterEach(() => {
        held.release()
        held.unregister()
    })

    it('GIVEN the households are on the way THEN the loading row shows, WHEN none answer THEN the empty state', async () => {
        const wrapper = await mountHouseholds()

        await vi.waitFor(() => expect(findLoadingRow(wrapper).text()).toContain('Henter husstande...'))
        expect(wrapper.text()).not.toContain('Ingen er flyttet ind i appen endnu')

        held.release()

        await vi.waitFor(() => expect(wrapper.text()).toContain('Ingen er flyttet ind i appen endnu'))
        expect(findLoadingRow(wrapper).exists()).toBe(false)
    })
})

// The list sorts by address, so the first household's row returns above the second's
describe('AdminHouseholds open row', () => {
    const [first, second] = ['admin-households-a', 'admin-households-b'].map(testSalt => HouseholdFactory.defaultHouseholdDetail(testSalt))
    const addressOf = (household: HouseholdDetail | undefined) => `household-address-${household!.id}`
    let unregister: () => void = () => {}

    beforeEach(() => {
        unregister = registerEndpoint('/api/admin/household', () => [first, second])
    })

    afterEach(() => unregister())

    it('GIVEN the search narrowed to the second household and its edit row open WHEN the search clears and the first household returns above it THEN the open row and the edit panel under it stay the second household\'s', async () => {
        const wrapper = await mountHouseholds()
        await vi.waitFor(() => expect(findByTestId(wrapper, addressOf(second)).exists()).toBe(true))
        await findByTestId(wrapper, 'household-search').setValue(second!.address)
        // The edit button stands in the row's first cell
        const secondRow = wrapper.findAll('tbody tr').find(tr => findByTestId(tr, addressOf(second)).exists())
        await secondRow!.find('td button').trigger('click')

        await findByTestId(wrapper, 'household-search').setValue('')

        const open = findOpenRows(wrapper)
        expect(open.map(({row}) => findByTestId(row, addressOf(second)).exists())).toEqual([true])
        expect(open[0]!.detail.findComponent(HouseholdEditPanel).props('household')).toMatchObject({id: second!.id, address: second!.address})
    })
})
