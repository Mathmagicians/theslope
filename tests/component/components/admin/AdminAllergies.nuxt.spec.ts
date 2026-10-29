// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {nextTick, toValue} from 'vue'
import AdminAllergies from '~/components/admin/AdminAllergies.vue'
import AllergyCatalogTable from '~/components/allergy/AllergyCatalogTable.vue'
import {useAllergiesStore} from '~/stores/allergies'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {ALLERGY_TEST_IDS} from '../allergy/allergyTestIds'
import {mountWithTooltipProvider, mountedStore, findByTestId, findAllByTestId, clickByTestId, resetStores, registerEmptyStoreEndpoints, VIEWPORTS, expectMasterDetail, findOpenRows} from '~~/tests/component/testHelpers'

// The test environment has no router: navigateTo lands the written query on the route the component reads
const {mockRoute, mockNavigateTo, landNavigation, useRoute} = await vi.hoisted(async () =>
    (await import('~~/tests/component/hoistedMocks')).mockRouteAndNavigation({path: '/admin/allergies', params: {tab: 'allergies'}}))
mockNuxtImport('useRoute', () => useRoute)
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNavigateTo.mockImplementation(landNavigation)

// The one Setting row the catalog footer and the poster read
const POSTER_NOTES_ENDPOINT = '/api/admin/setting/allergy-poster-notes'

// Only HTTP is faked (docs/testing.md Rule 6)
registerEmptyStoreEndpoints()
const allergyTypesEndpoint = vi.fn()
const posterNotesGetEndpoint = vi.fn()
const posterNotesPostEndpoint = vi.fn()
AllergyFactory.createMockAllergyTypesWithInhabitants().forEach(allergyType =>
    registerEndpoint(`/api/admin/allergy-type/${allergyType.id}`, () => allergyType))
registerEndpoint('/api/admin/allergy-type', allergyTypesEndpoint)
// Generic (GET) registered BEFORE method-specific so POST wins (reverse-order lookup)
registerEndpoint(POSTER_NOTES_ENDPOINT, posterNotesGetEndpoint)
registerEndpoint(POSTER_NOTES_ENDPOINT, {handler: posterNotesPostEndpoint, method: 'POST'})

// Container spec: every test mounts the whole catalog page with three real stores (~0.6s alone,
// several seconds under full-suite parallelism on a loaded machine) - size the timeout accordingly
vi.setConfig({testTimeout: 15_000})
// The next test's resetStores drops the datasets a still-mounted page reads
enableAutoUnmount(afterEach)

// The stored notes - two lines, so the assertions cannot pass on the three-bullet registry default
const STORED_NOTES = 'Glutenfri boller findes i fryseren\nHusk at give besked ved menu-præsentationen'
const aNotesRow = (value: string) => ({
    key: 'allergy-poster-notes',
    value,
    updatedAt: new Date('2026-09-18T10:00:00.000Z').toISOString(),
    updatedByUserId: 3
})

const mockAllergyTypes = AllergyFactory.createMockAllergyTypesWithInhabitants()
const [firstType] = mockAllergyTypes
const firstRow = ALLERGY_TEST_IDS.row(firstType!.id!)

// Fetching is the store's concern (covered by stores/allergies.nuxt.spec.ts); this spec
// covers what the component renders once the catalog is loaded. Children render for real
// (AllergyManagersList, UserListItem) - the mount helper supplies the tooltip provider.
const mountAdmin = async (props: Record<string, unknown> = {}, isMd = false) => {
    const store = useAllergiesStore()
    await store.loadAllergyTypes()
    await store.loadPosterNotes()

    const wrapper = await mountWithTooltipProvider(AdminAllergies, {props: {canEdit: true, ...props}, isMd})
    await flushPromises()
    await nextTick()
    return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountAdmin>>

// Master/detail with a responsive mount point: the desktop pane
// always shows the (fallback) selection; on mobile the detail docks under the
// tapped row, so it must be opened first (VIEWPORTS from the test helpers).

describe('AdminAllergies', () => {
    beforeEach(() => {
        resetStores()
        mockRoute.query = {}
        vi.clearAllMocks()
        allergyTypesEndpoint.mockReturnValue(mockAllergyTypes)
        posterNotesGetEndpoint.mockReturnValue(aNotesRow(STORED_NOTES))
        posterNotesPostEndpoint.mockReturnValue(aNotesRow(STORED_NOTES))
    })

    // The two mount points of the detail are the one width-dependent outcome: these cases run on both
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
            it(`mounts one open detail ${isMd ? 'in the pane beside the catalog' : 'docked in the catalog row'}, one compare control, and one form when editing`, async () => {
                const wrapper = await mount()
                expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.compare)).toHaveLength(1)
                await openDetail(wrapper)

                expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.edit)).toHaveLength(1)
                expect(findByTestId(wrapper.find('tbody'), ALLERGY_TEST_IDS.edit).exists()).toBe(!isMd)
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
    })

    it('md: the catalog is the master and the open detail pane the detail', async () => {
        const wrapper = await mountAdmin({}, true)

        // The catalog renders UTable's several roots, so its wrapper's element is the one holding it: the master
        const master = wrapper.findComponent(AllergyCatalogTable).element
        expectMasterDetail(master, master.nextElementSibling)
        expect(master.nextElementSibling?.contains(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).element)).toBe(true)
    })

    // The phone layout: the detail opens by tapping the first row
    const openDetail = (wrapper: Wrapper) => clickByTestId(wrapper, firstRow)

    describe('actions', () => {
        // Same AllergyNotes component and text source (the Setting row) as the poster,
        // in the card header above the managers list
        it('exposes the sort control and the stored notes in the card header, and switches to combine mode', async () => {
            const wrapper = await mountAdmin()

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.sort).exists()).toBe(true)
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.notes).text()).toContain('Vigtige bemærkninger')
            expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem).map(item => item.text()))
                .toEqual(STORED_NOTES.split('\n'))
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.compare).text()).toContain('Kombiner allergener')

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.compare)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.compare).text()).toContain('Afslut kombinering')
        })

        it('writes the edited notes back to the setting', async () => {
            const wrapper = await mountAdmin()

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.editNotes)
            await findByTestId(wrapper, ALLERGY_TEST_IDS.notesTextarea).setValue('Kun én bemærkning')
            await clickByTestId(wrapper, ALLERGY_TEST_IDS.saveNotes)
            await flushPromises()

            expect(posterNotesPostEndpoint).toHaveBeenCalled()
        })

        it('opens an empty form from the create button', async () => {
            const wrapper = await mountAdmin()

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.create)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.form).exists()).toBe(true)
            expect(wrapper.text()).toContain('Opret allergi')
        })
    })

    // Deleting a type cascades to every registration, so it confirms in-app rather
    // than through a browser dialog, and names the inhabitants that lose their
    // registration.
    describe('delete confirmation', () => {
        it('asks for confirmation in the UI instead of deleting straight away, and warns how many inhabitants lose their registration', async () => {
            const wrapper = await mountAdmin()
            await openDetail(wrapper)
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.deleteConfirm).exists()).toBe(false)

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.delete)

            const confirmPanel = findByTestId(wrapper, ALLERGY_TEST_IDS.deleteConfirm)
            expect(confirmPanel.exists()).toBe(true)
            expect(confirmPanel.text()).toContain(firstType!.name)
            expect(confirmPanel.text()).toContain(String(firstType!.inhabitants!.length))
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.confirmDelete).exists()).toBe(true)
        })

        it('returns to the detail view when cancelled', async () => {
            const wrapper = await mountAdmin()
            await openDetail(wrapper)
            await clickByTestId(wrapper, ALLERGY_TEST_IDS.delete)

            await clickByTestId(wrapper, ALLERGY_TEST_IDS.cancelDelete)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.deleteConfirm).exists()).toBe(false)
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(true)
        })
    })

    describe('authorization', () => {
        // A member reads the notes on the catalog the same way they read them on the poster
        it('hides the edit, delete and notes pencil controls when canEdit is false, keeping the bullets', async () => {
            const wrapper = await mountAdmin({canEdit: false})
            await openDetail(wrapper)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(false)
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.delete).exists()).toBe(false)
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.editNotes).exists()).toBe(false)
            expect(findAllByTestId(wrapper, ALLERGY_TEST_IDS.notesItem)).toHaveLength(2)
        })
    })

    // The mobile master/detail contract: the detail docks under the tapped row -
    // nothing renders below the list, and tapping again folds it away.
    describe('the allergy type in ?allergy=', () => {
        const [, secondType] = mockAllergyTypes

        it('hands the store the URL\'s allergy type once at setup, and the store follows the URL with no further setter call', async () => {
            mockRoute.query = {allergy: String(secondType!.id)}
            const selectAllergyType = vi.spyOn(mountedStore(useAllergiesStore), 'selectAllergyType')

            const mounted = await mountAdmin({}, false)

            expect(selectAllergyType).toHaveBeenCalledTimes(1)
            const choice = selectAllergyType.mock.calls[0]![0]
            expect(toValue(choice)).toBe(secondType!.id)
            expect(useAllergiesStore().selectedAllergyTypeId).toBe(secondType!.id)
            expect(findByTestId(mounted, ALLERGY_TEST_IDS.edit).exists()).toBe(true)

            mockRoute.query = {allergy: String(firstType!.id)}

            expect(toValue(choice)).toBe(firstType!.id)
            expect(selectAllergyType).toHaveBeenCalledTimes(1)
            selectAllergyType.mockRestore()
        })

        it('a cleared ?allergy= deselects and folds the mobile detail away', async () => {
            mockRoute.query = {allergy: String(secondType!.id)}
            const mounted = await mountAdmin({}, false)
            expect(findByTestId(mounted, ALLERGY_TEST_IDS.edit).exists()).toBe(true)

            mockRoute.query = {}
            await nextTick()

            expect(useAllergiesStore().selectedAllergyTypeId).toBeNull()
            expect(findByTestId(mounted, ALLERGY_TEST_IDS.edit).exists()).toBe(false)
        })

        it('tapping a row writes its id to ?allergy=', async () => {
            const mounted = await mountAdmin({}, false)

            await clickByTestId(mounted, ALLERGY_TEST_IDS.row(secondType!.id!))
            await flushPromises()

            expect(mockRoute.query.allergy).toBe(String(secondType!.id))
        })
    })

    describe('mobile detail docking', () => {
        it('shows no detail panel before a row is tapped', async () => {
            const wrapper = await mountAdmin({}, false)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(false)
            expect(wrapper.text()).not.toContain('Detaljer')
        })

        it('tapping a row docks the detail in the row after it, and tapping it again collapses the detail', async () => {
            const wrapper = await mountAdmin({}, false)
            await clickByTestId(wrapper, firstRow)
            const open = findOpenRows(wrapper)
            expect(open.map(({row}) => findByTestId(row, firstRow).exists())).toEqual([true])
            expect(open.map(({detail}) => findByTestId(detail, ALLERGY_TEST_IDS.edit).exists())).toEqual([true])

            await clickByTestId(wrapper, firstRow)

            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.edit).exists()).toBe(false)
        })
    })

    // An empty catalog renders the page's own empty state in the master table,
    // with the create CTA as the way out (edit rights only)
    describe('empty catalog', () => {
        const mountEmpty = async (props: Record<string, unknown> = {}) => {
            allergyTypesEndpoint.mockReturnValue([])
            return mountAdmin(props)
        }

        it.each([
            {canEdit: true, expected: true},
            {canEdit: false, expected: false}
        ])('renders the empty-state message, create CTA with canEdit=$canEdit', async ({canEdit, expected}) => {
            const wrapper = await mountEmpty({canEdit})

            expect(wrapper.text()).toContain('Kataloget er tomt')
            expect(wrapper.text()).toContain('Tilføj allergener for at komme i gang')
            expect(findByTestId(wrapper, ALLERGY_TEST_IDS.createFirst).exists()).toBe(expected)
        })
    })
})
