// @vitest-environment nuxt
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { getQuery, type H3Event } from 'h3'
import { AllergyFactory } from '~~/tests/e2e/testDataFactories/allergyFactory'
import { UserFactory } from '~~/tests/e2e/testDataFactories/userFactory'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import { asyncDataStatus, resetStores, registerEmptyStoreEndpoints } from '~~/tests/component/testHelpers'

import { useAllergiesStore } from '~/stores/allergies'

// The test runtime has no session cookie, so the session is the one thing faked; the households store
// selecting the household from it is real
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

// The stores' own datasets answer empty; the routes this spec drives register after
registerEmptyStoreEndpoints()

// The session user's household is the households store's default selection
const me = UserFactory.defaultUserWithInhabitant('allergies-store')
const MY_HOUSEHOLD_ID = me.Inhabitant!.household!.id
registerEndpoint(`/api/admin/household/${MY_HOUSEHOLD_ID}`, () => ({...HouseholdFactory.defaultHouseholdDetail('allergies-store'), id: MY_HOUSEHOLD_ID}))
const ALLERGIES_KEY = 'allergy-store-allergies'

// The one Setting row the allergy surfaces read (catalog footer + poster)
const POSTER_NOTES_ENDPOINT = '/api/admin/setting/allergy-poster-notes'

// ========================================
// IMPORTANT: Register endpoints BEFORE importing the store
// The store's module-level useFetch executes on import
// Order matters: specific endpoints FIRST, generic endpoints LAST
// ========================================

const allergyTypesEndpoint = vi.fn()
const allergyTypeByIdEndpoint = vi.fn()
const allergiesEndpoint = vi.fn()
const allergyByIdEndpoint = vi.fn()
const posterNotesGetEndpoint = vi.fn()
const posterNotesPostEndpoint = vi.fn()

registerEndpoint('/api/admin/allergy-type/1', allergyTypeByIdEndpoint)
const GONE_ALLERGY_TYPE_ID = 404
const goneAllergyTypeEndpoint = vi.fn(() => {
    throw createError({statusCode: 404})
})
registerEndpoint(`/api/admin/allergy-type/${GONE_ALLERGY_TYPE_ID}`, goneAllergyTypeEndpoint)
const SELECTED_ALLERGY_TYPE_KEY = 'allergy-store-selected-allergy-type'
registerEndpoint('/api/admin/allergy-type', allergyTypesEndpoint)
registerEndpoint('/api/household/allergy/1', allergyByIdEndpoint)
registerEndpoint('/api/household/allergy', allergiesEndpoint)
// Generic (GET) registered BEFORE method-specific so POST wins (reverse-order lookup)
registerEndpoint(POSTER_NOTES_ENDPOINT, posterNotesGetEndpoint)
registerEndpoint(POSTER_NOTES_ENDPOINT, {handler: posterNotesPostEndpoint, method: 'POST'})

// ========================================
// Test Helpers
// ========================================

const setupStore = async () => {
    const store = useAllergiesStore()
    await store.loadAllergyTypes()
    return store
}

// ========================================
// Tests
// ========================================

describe('Allergies Store - AllergyTypes', () => {
    beforeAll(() => {
        setActivePinia(createPinia())
    })

    beforeEach(() => {
        clearNuxtData()
        vi.clearAllMocks()
        allergyTypesEndpoint.mockClear()
        allergyTypeByIdEndpoint.mockClear()

        allergyTypesEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypesWithInhabitants())
        allergyTypeByIdEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypes()[0])
    })

    it('initializes with allergy types', async () => {
        const store = await setupStore()

        expect(store.isAllergyTypesInitialized).toBe(true)
        expect(store.isNoAllergyTypes).toBe(false)
        expect(store.allergyTypes).toHaveLength(AllergyFactory.createMockAllergyTypesWithInhabitants().length)
        expect(store.allergyTypes[0]!.name).toBe(AllergyFactory.createMockAllergyTypesWithInhabitants()[0]!.name)
    })

    it('exposes error when fetch fails', async () => {
        allergyTypesEndpoint.mockImplementation(() => {
            throw createError({
                statusCode: 500,
                statusMessage: 'Network error'
            })
        })

        const store = useAllergiesStore()
        await expect(store.loadAllergyTypes()).rejects.toThrow()

        expect(store.isAllergyTypesErrored).toBe(true)
        expect(store.allergyTypesError?.statusCode).toBe(500)
    })

    it('isNoAllergyTypes detects an empty catalog', async () => {
        allergyTypesEndpoint.mockReturnValue([])

        const store = await setupStore()

        expect(store.isNoAllergyTypes).toBe(true)
        expect(store.allergyTypes).toHaveLength(0)
    })

})

describe('Allergies Store - selected allergy type', () => {
    const [selectedType] = AllergyFactory.createMockAllergyTypesWithInhabitants()
    const goneType = {...selectedType!, id: GONE_ALLERGY_TYPE_ID}

    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        allergyTypesEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypesWithInhabitants())
        allergyTypeByIdEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypes()[0])
    })

    it('a getter naming an allergy type loads that type, and the choice stays out of the store state', async () => {
        const store = await setupStore()

        store.selectAllergyType(() => selectedType!.id!)

        await vi.waitFor(() => expect(store.isSelectedAllergyTypeInitialized).toBe(true))
        expect(store.selectedAllergyTypeId).toBe(selectedType!.id)
        expect(store.selectedAllergyType?.name).toBe('Peanuts')
        expect(Object.values(store.$state)).not.toContain(selectedType!.id)
    })

    it.each([
        {by: 'no getter', select: () => {}},
        {by: 'a getter naming nothing', select: (store: ReturnType<typeof useAllergiesStore>) => store.selectAllergyType(() => null)},
        {by: 'a getter naming an unknown type', select: (store: ReturnType<typeof useAllergiesStore>) => store.selectAllergyType(() => 999)}
    ])('$by selects no type and leaves the detail idle and unrequested', async ({select}) => {
        const store = await setupStore()

        select(store)

        await flushPromises()
        expect(store.selectedAllergyTypeId).toBeNull()
        expect(asyncDataStatus(SELECTED_ALLERGY_TYPE_KEY)).toBe('idle')
        expect(allergyTypeByIdEndpoint).not.toHaveBeenCalled()
    })

    it('follows its getter with no further setter call, and a cleared choice deselects', async () => {
        const store = await setupStore()
        const choice = ref<number | null>(selectedType!.id!)

        store.selectAllergyType(choice)
        await vi.waitFor(() => expect(asyncDataStatus(SELECTED_ALLERGY_TYPE_KEY)).toBe('success'))

        choice.value = null

        await vi.waitFor(() => expect(asyncDataStatus(SELECTED_ALLERGY_TYPE_KEY)).toBe('idle'))
        expect(store.selectedAllergyType).toBeNull()
    })

    it('a type that no longer exists: toasts it, drops the choice and refreshes the catalog', async () => {
        allergyTypesEndpoint.mockReturnValue([...AllergyFactory.createMockAllergyTypesWithInhabitants(), goneType])
        const store = await setupStore()
        allergyTypesEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypesWithInhabitants())
        const catalogRequests = allergyTypesEndpoint.mock.calls.length

        store.selectAllergyType(() => GONE_ALLERGY_TYPE_ID)

        await vi.waitFor(() => expect(allergyTypesEndpoint.mock.calls.length).toBeGreaterThan(catalogRequests))
        await vi.waitFor(() => expect(store.selectedAllergyTypeId).toBeNull())
        expect(goneAllergyTypeEndpoint).toHaveBeenCalledTimes(1)
        expect(useToast().toasts.value.at(-1)?.title).toBe('Kan ikke finde allergitypen')
    })

    it('after a 404 the page\'s getter still drives the selection', async () => {
        allergyTypesEndpoint.mockReturnValue([...AllergyFactory.createMockAllergyTypesWithInhabitants(), goneType])
        const store = await setupStore()
        const choice = ref<number | null>(GONE_ALLERGY_TYPE_ID)
        store.selectAllergyType(choice)
        await vi.waitFor(() => expect(goneAllergyTypeEndpoint).toHaveBeenCalledTimes(1))
        await vi.waitFor(() => expect(store.selectedAllergyTypeId).toBeNull())

        choice.value = selectedType!.id!

        await vi.waitFor(() => expect(store.isSelectedAllergyTypeInitialized).toBe(true))
        expect(store.selectedAllergyTypeId).toBe(selectedType!.id)
    })
})

describe('Allergies Store - gated reads', () => {
    type Store = ReturnType<typeof useAllergiesStore>

    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        session.user.value = me
        allergyTypesEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypesWithInhabitants())
        allergyTypeByIdEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypes()[0])
        allergiesEndpoint.mockReturnValue(AllergyFactory.createMockAllergies())
    })
    afterEach(() => {
        session.user.value = null
    })

    const gatedReads = [
        {
            dataset: 'selected allergy type',
            idleKey: SELECTED_ALLERGY_TYPE_KEY,
            requestedKey: SELECTED_ALLERGY_TYPE_KEY,
            endpoint: allergyTypeByIdEndpoint,
            answer: () => AllergyFactory.createMockAllergyTypes()[0],
            request: (store: Store) => store.selectAllergyType(() => 1)
        },
        {
            dataset: 'household allergies',
            idleKey: ALLERGIES_KEY,
            requestedKey: ALLERGIES_KEY,
            endpoint: allergiesEndpoint,
            answer: () => AllergyFactory.createMockAllergies(),
            request: (store: Store) => store.loadAllergiesForHousehold()
        }
    ]

    it('household allergies are the selected household\'s, read in one request', async () => {
        const store = await setupStore()

        store.loadAllergiesForHousehold()

        await vi.waitFor(() => expect(asyncDataStatus(ALLERGIES_KEY)).toBe('success'))
        expect(allergiesEndpoint).toHaveBeenCalledOnce()
        expect(getQuery(allergiesEndpoint.mock.calls[0]![0] as H3Event)).toEqual({householdId: String(MY_HOUSEHOLD_ID)})
    })

    it.each(gatedReads)('$dataset is idle and unrequested while its condition is false', async ({idleKey, endpoint}) => {
        const store = await setupStore()

        expect(endpoint).not.toHaveBeenCalled()
        expect(asyncDataStatus(idleKey)).toBe('idle')
        expect(store.isAllergyStoreReady).toBe(true)
    })

    it.each(gatedReads)('$dataset fetches once its condition holds', async ({requestedKey, endpoint, request}) => {
        const store = await setupStore()

        request(store)

        await vi.waitFor(() => expect(asyncDataStatus(requestedKey)).toBe('success'))
        expect(endpoint).toHaveBeenCalled()
        expect(store.isAllergyStoreReady).toBe(true)
    })

    it.each(gatedReads)('the ready flag waits for $dataset while it loads', async ({requestedKey, endpoint, answer, request}) => {
        const store = await setupStore()
        let land = () => {}
        endpoint.mockImplementationOnce(() => new Promise(resolve => {
            land = () => resolve(answer())
        }))

        request(store)
        await vi.waitFor(() => expect(endpoint).toHaveBeenCalled())

        expect(store.isAllergyStoreReady).toBe(false)
        land()
        await vi.waitFor(() => expect(asyncDataStatus(requestedKey)).toBe('success'))
        expect(store.isAllergyStoreReady).toBe(true)
    })

    it('reads idle household allergies as neither loading, errored, loaded nor empty', async () => {
        const store = await setupStore()

        expect({
            isAllergiesLoading: store.isAllergiesLoading,
            isAllergiesErrored: store.isAllergiesErrored,
            isAllergiesInitialized: store.isAllergiesInitialized,
            isNoAllergies: store.isNoAllergies,
            isSelectedAllergyTypeInitialized: store.isSelectedAllergyTypeInitialized
        }).toEqual({
            isAllergiesLoading: false,
            isAllergiesErrored: false,
            isAllergiesInitialized: false,
            isNoAllergies: false,
            isSelectedAllergyTypeInitialized: false
        })
    })
})

// The allergy-type catalog embeds inhabitants per type (admin counts, PDF poster).
// Every allergy mutation must refresh BOTH caches, or /admin/allergies shows stale data
// until a hard page refresh.
describe('Allergies Store - cache coherence between allergies and the catalog', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        session.user.value = me

        allergyTypesEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypesWithInhabitants())
        allergyTypeByIdEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypes()[0])
        allergiesEndpoint.mockReturnValue(AllergyFactory.createMockAllergies())
        allergyByIdEndpoint.mockReturnValue(AllergyFactory.createMockAllergies()[0])
    })
    afterEach(() => {
        session.user.value = null
    })

    // The household's allergies loaded, as the household page loads them
    const setupHouseholdAllergies = async () => {
        const store = await setupStore()
        store.loadAllergiesForHousehold()
        await vi.waitFor(() => expect(asyncDataStatus(ALLERGIES_KEY)).toBe('success'))
        return store
    }

    it.each([
        {
            mutation: 'createAllergy',
            act: (store: ReturnType<typeof useAllergiesStore>) =>
                store.createAllergy({inhabitantId: 1, allergyTypeId: 2, inhabitantComment: 'Mild'})
        },
        {
            mutation: 'updateAllergy',
            act: (store: ReturnType<typeof useAllergiesStore>) =>
                store.updateAllergy(1, {allergyTypeId: 2, inhabitantComment: 'Worse'})
        },
        {
            mutation: 'deleteAllergy',
            act: (store: ReturnType<typeof useAllergiesStore>) => store.deleteAllergy(1)
        }
    ])('$mutation refetches the allergy-type catalog', async ({act}) => {
        const store = await setupHouseholdAllergies()
        const catalogFetchesBefore = allergyTypesEndpoint.mock.calls.length

        await act(store)

        expect(allergyTypesEndpoint.mock.calls.length, 'catalog refetched after the mutation')
            .toBeGreaterThan(catalogFetchesBefore)
    })

    it('deleteAllergyType refetches household allergies (CASCADE removes their rows)', async () => {
        const store = await setupHouseholdAllergies()
        const allergyFetchesBefore = allergiesEndpoint.mock.calls.length

        await store.deleteAllergyType(1)

        expect(allergiesEndpoint.mock.calls.length, 'household allergies refetched after cascade')
            .toBeGreaterThan(allergyFetchesBefore)
    })
})

// The catalog footer and the poster read ONE Setting row. It loads on its own status
// refs, so the poster renders its notes even when the catalog fetch is still pending.
describe('Allergies Store - poster notes setting', () => {
    const storedNotes = 'Glutenfri boller findes i fryseren\nHusk at give besked'

    const aSettingRow = (value: string) => ({
        key: 'allergy-poster-notes',
        value,
        updatedAt: new Date('2026-09-18T10:00:00.000Z').toISOString(),
        updatedByUserId: 3
    })

    // The endpoints model the one row: a write changes what the next read answers,
    // so a store that forgets to refetch fails here
    let currentValue = storedNotes

    beforeEach(() => {
        clearNuxtData()
        vi.clearAllMocks()

        currentValue = storedNotes
        allergyTypesEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypesWithInhabitants())
        posterNotesGetEndpoint.mockImplementation(() => aSettingRow(currentValue))
        posterNotesPostEndpoint.mockImplementation(() => {
            currentValue = 'Ny bemærkning'
            return aSettingRow(currentValue)
        })
    })

    it('loads the stored notes', async () => {
        const store = useAllergiesStore()

        await store.loadPosterNotes()

        expect(store.isPosterNotesInitialized).toBe(true)
        expect(store.posterNotes).toBe(storedNotes)
    })

    // The save endpoint returns the stored row (ADR-009). A second round trip to read it back
    // can fail, and a failed read leaves the box on the registry default - the user sees the
    // old notes under a success toast. The response IS the new value.
    it('saves the notes and shows the saved text even when a later read of the row fails', async () => {
        const store = useAllergiesStore()
        await store.loadPosterNotes()
        posterNotesGetEndpoint.mockImplementation(() => {
            throw createError({statusCode: 500, statusMessage: 'Network error'})
        })

        await store.savePosterNotes('Ny bemærkning')

        expect(posterNotesPostEndpoint).toHaveBeenCalled()
        expect(store.posterNotes).toBe('Ny bemærkning')
    })

    it('errors are exposed, not thrown away', async () => {
        posterNotesGetEndpoint.mockImplementation(() => {
            throw createError({statusCode: 500, statusMessage: 'Network error'})
        })
        const store = useAllergiesStore()

        await expect(store.loadPosterNotes()).rejects.toThrow()

        expect(store.isPosterNotesErrored).toBe(true)
    })
})
