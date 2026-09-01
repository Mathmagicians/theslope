// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {mountSuspended, mockNuxtImport, mockComponent, registerEndpoint} from '@nuxt/test-utils/runtime'
import {setActivePinia, createPinia} from 'pinia'
import {flushPromises} from '@vue/test-utils'
import {clearNuxtData} from '#app'
import {ref, h, nextTick} from 'vue'
import AdminAllergies from '~/components/admin/AdminAllergies.vue'
import {useAllergiesStore} from '~/stores/allergies'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

// Endpoint mocks - specific FIRST, generic LAST (docs/testing.md)
const allergyTypesEndpoint = vi.fn()
registerEndpoint('/api/admin/allergy-type', allergyTypesEndpoint)
registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])

mockNuxtImport('useHeynabo', () => () => ({
    getUserUrl: vi.fn((heynaboId: number) => `/user/${heynaboId}`)
}))

mockComponent('UserListItem', {
    props: ['inhabitants', 'label'],
    setup: () => () => h('div', {'data-testid': 'user-list-item'})
})
mockComponent('AllergyManagersList', {setup: () => () => h('div')})

const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()
const [firstType] = mockAllergyTypes

const TEST_IDS = {
    form: 'allergy-type-form',
    create: 'create-allergy-type',
    edit: 'edit-allergy-type',
    delete: 'delete-allergy-type',
    deleteConfirm: 'delete-allergy-type-confirm',
    cancelDelete: 'cancel-delete-allergy-type',
    confirmDelete: 'confirm-delete-allergy-type',
    compare: 'multiselect-toggle',
    sort: 'sort-by-count',
    firstRow: `allergy-row-${firstType!.id}`
} as const

// Fetching is the store's concern (covered by stores/allergies.nuxt.spec.ts); this spec
// covers what the component renders once the catalog is loaded.
const mountAdmin = async (props: Record<string, unknown> = {}, isMd = false) => {
    await useAllergiesStore().loadAllergyTypes()

    const wrapper = await mountSuspended(AdminAllergies, {
        props: {canEdit: true, ...props},
        global: {provide: {isMd: ref(isMd)}}
    })
    await flushPromises()
    await nextTick()
    return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountAdmin>>

const findAll = (wrapper: Wrapper, testId: string) => wrapper.findAll(`[data-testid="${testId}"]`)
const find = (wrapper: Wrapper, testId: string) => wrapper.find(`[data-testid="${testId}"]`)

const click = async (wrapper: Wrapper, testId: string) => {
    await find(wrapper, testId).trigger('click')
    await nextTick()
}

// Master/detail with a responsive mount point: the desktop pane
// always shows the (fallback) selection; on mobile the detail docks under the
// tapped row, so it must be opened first.
const VIEWPORTS = [
    {viewport: 'desktop', isMd: true},
    {viewport: 'mobile', isMd: false}
] as const

describe('AdminAllergies', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
        vi.clearAllMocks()
        allergyTypesEndpoint.mockReturnValue(mockAllergyTypes)
    })

    describe.each(VIEWPORTS)('on $viewport', ({isMd}) => {
        const mount = (props: Record<string, unknown> = {}) => mountAdmin(props, isMd)

        const openDetail = async (wrapper: Wrapper) => {
            if (!isMd) await click(wrapper, TEST_IDS.firstRow)
        }

        /**
         * The detail panel has two guarded mount points (desktop pane / mobile
         * expanded row) - exactly ONE may be live at a time.
         */
        describe('single mount invariant', () => {
            it('renders exactly one edit control once the detail is open', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)

                expect(findAll(wrapper, TEST_IDS.edit)).toHaveLength(1)
            })

            it('renders exactly one compare control', async () => {
                const wrapper = await mount()

                expect(findAll(wrapper, TEST_IDS.compare)).toHaveLength(1)
            })

            it('opens exactly one form when editing', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)
                expect(find(wrapper, TEST_IDS.form).exists()).toBe(false)

                await click(wrapper, TEST_IDS.edit)

                expect(findAll(wrapper, TEST_IDS.form)).toHaveLength(1)
            })

            it('opens exactly one form when creating with a row selected', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)

                await click(wrapper, TEST_IDS.create)

                expect(findAll(wrapper, TEST_IDS.form)).toHaveLength(1)
            })
        })

        describe('actions', () => {
            it.each([
                {control: 'edit', testId: TEST_IDS.edit},
                {control: 'delete', testId: TEST_IDS.delete}
            ])('exposes the $control control once the detail is open', async ({testId}) => {
                const wrapper = await mount()
                await openDetail(wrapper)

                expect(find(wrapper, testId).exists()).toBe(true)
            })

            it('exposes the sort control', async () => {
                const wrapper = await mount()

                expect(find(wrapper, TEST_IDS.sort).exists()).toBe(true)
            })

            it('switches to compare mode', async () => {
                const wrapper = await mount()

                await click(wrapper, TEST_IDS.compare)

                expect(wrapper.text()).toContain('Afslut sammenligning')
            })

            it('opens an empty form from the create button', async () => {
                const wrapper = await mount()

                await click(wrapper, TEST_IDS.create)

                expect(find(wrapper, TEST_IDS.form).exists()).toBe(true)
                expect(wrapper.text()).toContain('Opret allergi')
            })
        })

        // Deleting a type cascades to every registration, so it confirms in-app rather
        // than through a browser dialog, and names the inhabitants that lose their
        // registration.
        describe('delete confirmation', () => {
            it('asks for confirmation in the UI instead of deleting straight away', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)
                expect(find(wrapper, TEST_IDS.deleteConfirm).exists()).toBe(false)

                await click(wrapper, TEST_IDS.delete)

                const confirmPanel = find(wrapper, TEST_IDS.deleteConfirm)
                expect(confirmPanel.exists()).toBe(true)
                expect(confirmPanel.text()).toContain(firstType!.name)
            })

            it('warns how many inhabitants lose their registration', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)

                await click(wrapper, TEST_IDS.delete)

                expect(find(wrapper, TEST_IDS.deleteConfirm).text())
                    .toContain(String(firstType!.inhabitants!.length))
            })

            it('returns to the detail view when cancelled', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)
                await click(wrapper, TEST_IDS.delete)

                await click(wrapper, TEST_IDS.cancelDelete)

                expect(find(wrapper, TEST_IDS.deleteConfirm).exists()).toBe(false)
                expect(find(wrapper, TEST_IDS.edit).exists()).toBe(true)
            })

            it('exposes a confirm action', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)

                await click(wrapper, TEST_IDS.delete)

                expect(find(wrapper, TEST_IDS.confirmDelete).exists()).toBe(true)
            })
        })

        describe('authorization', () => {
            it.each([TEST_IDS.edit, TEST_IDS.delete])('hides %s when canEdit is false', async (testId) => {
                const wrapper = await mount({canEdit: false})
                await openDetail(wrapper)

                expect(find(wrapper, testId).exists()).toBe(false)
            })
        })
    })

    // The mobile master/detail contract: the detail docks under the tapped row -
    // nothing renders below the list, and tapping again folds it away.
    describe('mobile detail docking', () => {
        it('shows no detail panel before a row is tapped', async () => {
            const wrapper = await mountAdmin({}, false)

            expect(find(wrapper, TEST_IDS.edit).exists()).toBe(false)
            expect(wrapper.text()).not.toContain('Detaljer')
        })

        it('tapping the selected row again collapses the detail', async () => {
            const wrapper = await mountAdmin({}, false)
            await click(wrapper, TEST_IDS.firstRow)
            expect(find(wrapper, TEST_IDS.edit).exists()).toBe(true)

            await click(wrapper, TEST_IDS.firstRow)

            expect(find(wrapper, TEST_IDS.edit).exists()).toBe(false)
        })
    })
})
