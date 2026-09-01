// @vitest-environment nuxt
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { AllergyFactory } from '~~/tests/e2e/testDataFactories/allergyFactory'

import { useAllergiesStore } from '~/stores/allergies'

// ========================================
// IMPORTANT: Register endpoints BEFORE importing the store
// The store's module-level useFetch executes on import
// Order matters: specific endpoints FIRST, generic endpoints LAST
// ========================================

const allergyTypesEndpoint = vi.fn()
const allergyTypeByIdEndpoint = vi.fn()
const allergiesEndpoint = vi.fn()
const allergyByIdEndpoint = vi.fn()

registerEndpoint('/api/admin/allergy-type/1', allergyTypeByIdEndpoint)
registerEndpoint('/api/admin/allergy-type', allergyTypesEndpoint)
registerEndpoint('/api/household/allergy/1', allergyByIdEndpoint)
registerEndpoint('/api/household/allergy', allergiesEndpoint)

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

    it.each([
        { data: [], expected: true, description: 'empty array' },
        { data: AllergyFactory.createMockAllergyTypesWithInhabitants(), expected: false, description: 'with data' }
    ])('isNoAllergyTypes detects $description', async ({ data, expected }) => {
        allergyTypesEndpoint.mockReturnValue(data)

        const store = await setupStore()

        expect(store.isNoAllergyTypes).toBe(expected)
        expect(store.allergyTypes).toHaveLength(data.length)
    })

    it('loads selected allergy type by ID', async () => {
        const store = await setupStore()

        store.loadAllergyType(1)

        // Wait for reactive useAsyncData to fetch
        await new Promise(resolve => setTimeout(resolve, 100))

        expect(store.isSelectedAllergyTypeInitialized).toBe(true)
        expect(store.selectedAllergyType?.id).toBe(1)
        expect(store.selectedAllergyType?.name).toBe('Peanuts')
    })
})

describe('Allergies Store - Allergies (Household/Inhabitant)', () => {
    beforeEach(() => {
        clearNuxtData()
        vi.clearAllMocks()
        allergiesEndpoint.mockClear()

        // Mock allergies endpoint with query params
        allergiesEndpoint.mockReturnValue(AllergyFactory.createMockAllergies())
    })

    it('loads allergies for inhabitant', async () => {
        const store = useAllergiesStore()

        store.loadAllergiesForInhabitant(1)

        // Wait for reactive fetch
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(store.allergies).toHaveLength(1)
        expect(store.allergies[0]!.inhabitantId).toBe(1)
    })

    it('loads allergies for household', async () => {
        const store = useAllergiesStore()

        store.loadAllergiesForHousehold(1)

        // Wait for reactive fetch
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(store.allergies).toHaveLength(1)
    })

    it('creates new allergy', async () => {
        const store = useAllergiesStore()
        store.loadAllergiesForInhabitant(1)

        const newAllergy = {
            inhabitantId: 1,
            allergyTypeId: 2,
            inhabitantComment: 'Mild intolerance'
        }

        const created = await store.createAllergy(newAllergy)

        expect(created).toBeDefined()
    })
})

// The allergy-type catalog embeds inhabitants per type (admin counts, PDF poster).
// Every allergy mutation must refresh BOTH caches, or /admin/allergies shows stale data
// until a hard page refresh.
describe('Allergies Store - cache coherence between allergies and the catalog', () => {
    beforeEach(() => {
        clearNuxtData()
        vi.clearAllMocks()

        allergyTypesEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypesWithInhabitants())
        allergyTypeByIdEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypes()[0])
        allergiesEndpoint.mockReturnValue(AllergyFactory.createMockAllergies())
        allergyByIdEndpoint.mockReturnValue(AllergyFactory.createMockAllergies()[0])
    })

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
        const store = await setupStore()
        store.loadAllergiesForInhabitant(1)
        await new Promise(resolve => setTimeout(resolve, 0))
        const catalogFetchesBefore = allergyTypesEndpoint.mock.calls.length

        await act(store)

        expect(allergyTypesEndpoint.mock.calls.length, 'catalog refetched after the mutation')
            .toBeGreaterThan(catalogFetchesBefore)
    })

    it('deleteAllergyType refetches household allergies (CASCADE removes their rows)', async () => {
        const store = await setupStore()
        store.loadAllergiesForInhabitant(1)
        await new Promise(resolve => setTimeout(resolve, 0))
        const allergyFetchesBefore = allergiesEndpoint.mock.calls.length

        await store.deleteAllergyType(1)

        expect(allergiesEndpoint.mock.calls.length, 'household allergies refetched after cascade')
            .toBeGreaterThan(allergyFetchesBefore)
    })
})
