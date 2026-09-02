// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {registerEndpoint} from '@nuxt/test-utils/runtime'
import {setActivePinia, createPinia} from 'pinia'
import {flushPromises} from '@vue/test-utils'
import {clearNuxtData} from '#app'
import {nextTick} from 'vue'
import AdminAllergies from '~/components/admin/AdminAllergies.vue'
import {useAllergiesStore} from '~/stores/allergies'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {ALLERGY_TEST_IDS} from '../allergy/allergyTestIds'
import {mountWithTooltipProvider, findByTestId, findAllByTestId, clickByTestId} from '~~/tests/component/testHelpers'

// Endpoint mocks - specific FIRST, generic LAST (docs/testing.md)
const allergyTypesEndpoint = vi.fn()
registerEndpoint('/api/admin/allergy-type', allergyTypesEndpoint)
registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])
registerEndpoint('/api/admin/users', () => [])
registerEndpoint('/api/admin/household', () => [])
registerEndpoint('/api/admin/season/active', () => null)
registerEndpoint('/api/admin/season', () => [])

// Container spec: every test mounts the whole catalog page with three real stores (~0.6s alone,
// several seconds under full-suite parallelism on a loaded machine) - size the timeout accordingly
vi.setConfig({testTimeout: 15_000})

const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()
const [firstType] = mockAllergyTypes
const firstRow = ALLERGY_TEST_IDS.row(firstType!.id!)

// Fetching is the store's concern (covered by stores/allergies.nuxt.spec.ts); this spec
// covers what the component renders once the catalog is loaded. Children render for real
// (AllergyManagersList, UserListItem) - the mount helper supplies the tooltip provider.
const mountAdmin = async (props: Record<string, unknown> = {}, isMd = false) => {
    await useAllergiesStore().loadAllergyTypes()

    const wrapper = await mountWithTooltipProvider(AdminAllergies, {props: {canEdit: true, ...props}, isMd})
    await flushPromises()
    await nextTick()
    return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountAdmin>>

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
            if (!isMd) await clickByTestId(wrapper, firstRow)
        }

        /**
         * The detail panel has two guarded mount points (desktop pane / mobile
         * expanded row) - exactly ONE may be live at a time.
         */
        describe('single mount invariant', () => {
            it('renders exactly one edit control once the detail is open', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)

                expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.edit)).toHaveLength(1)
            })

            it('renders exactly one compare control', async () => {
                const wrapper = await mount()

                expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.compare)).toHaveLength(1)
            })

            it('opens exactly one form when editing', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)
                expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(false)

                await clickByTestId(wrapper, ALLERGY_TEST_IDS.edit)

                expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.form)).toHaveLength(1)
            })

            it('opens exactly one form when creating with a row selected', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)

                await clickByTestId(wrapper, ALLERGY_TEST_IDS.create)

                expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.form)).toHaveLength(1)
            })
        })

        describe('actions', () => {
            it.each([
                {control: 'edit', testId: ALLERGY_TEST_IDS.edit},
                {control: 'delete', testId: ALLERGY_TEST_IDS.delete}
            ])('exposes the $control control once the detail is open', async ({testId}) => {
                const wrapper = await mount()
                await openDetail(wrapper)

                expect(findByTestId(wrapper, testId).exists()).toBe(true)
            })

            it('exposes the sort control', async () => {
                const wrapper = await mount()

                expect(findByTestId(wrapper, ALLERGY_TEST_IDS.sort).exists()).toBe(true)
            })

            it('switches to compare mode', async () => {
                const wrapper = await mount()

                await clickByTestId(wrapper, ALLERGY_TEST_IDS.compare)

                expect(wrapper.text()).toContain('Afslut sammenligning')
            })

            it('opens an empty form from the create button', async () => {
                const wrapper = await mount()

                await clickByTestId(wrapper, ALLERGY_TEST_IDS.create)

                expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(true)
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
                expect(findByTestId(wrapper, ALLERGY_TEST_IDS.deleteConfirm).exists()).toBe(false)

                await clickByTestId(wrapper, ALLERGY_TEST_IDS.delete)

                const confirmPanel = findByTestId(wrapper, ALLERGY_TEST_IDS.deleteConfirm)
                expect(confirmPanel.exists()).toBe(true)
                expect(confirmPanel.text()).toContain(firstType!.name)
            })

            it('warns how many inhabitants lose their registration', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)

                await clickByTestId(wrapper, ALLERGY_TEST_IDS.delete)

                expect(findByTestId(wrapper, ALLERGY_TEST_IDS.deleteConfirm).text())
                    .toContain(String(firstType!.inhabitants!.length))
            })

            it('returns to the detail view when cancelled', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)
                await clickByTestId(wrapper, ALLERGY_TEST_IDS.delete)

                await clickByTestId(wrapper, ALLERGY_TEST_IDS.cancelDelete)

                expect(findByTestId(wrapper, ALLERGY_TEST_IDS.deleteConfirm).exists()).toBe(false)
                expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(true)
            })

            it('exposes a confirm action', async () => {
                const wrapper = await mount()
                await openDetail(wrapper)

                await clickByTestId(wrapper, ALLERGY_TEST_IDS.delete)

                expect(findByTestId(wrapper, ALLERGY_TEST_IDS.confirmDelete).exists()).toBe(true)
            })
        })

        describe('authorization', () => {
            it.each([ALLERGY_TEST_IDS.edit, ALLERGY_TEST_IDS.delete])('hides %s when canEdit is false', async (testId) => {
                const wrapper = await mount({canEdit: false})
                await openDetail(wrapper)

                expect(findByTestId(wrapper, testId).exists()).toBe(false)
            })
        })
    })

    // The mobile master/detail contract: the detail docks under the tapped row -
    // nothing renders below the list, and tapping again folds it away.
    describe('mobile detail docking', () => {
        it('shows no detail panel before a row is tapped', async () => {
            const wrapper = await mountAdmin({}, false)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(false)
            expect(wrapper.text()).not.toContain('Detaljer')
        })

        it('tapping the selected row again collapses the detail', async () => {
            const wrapper = await mountAdmin({}, false)
            await clickByTestId(wrapper, firstRow)
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(true)

            await clickByTestId(wrapper, firstRow)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(false)
        })
    })
})
