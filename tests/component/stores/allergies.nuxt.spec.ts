// @vitest-environment nuxt
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import type {
    AllergyTypeDisplay,
    AllergyDetail
} from '~/composables/useAllergyValidation'
import { AllergyFactory } from '../../e2e/testDataFactories/allergyFactory'

// ========================================
// IMPORTANT: Register endpoints BEFORE importing the store
// The store's module-level useFetch executes on import
// Order matters: specific endpoints FIRST, generic endpoints LAST
// ========================================

const allergyTypesEndpoint = vi.fn()
const allergyTypeByIdEndpoint = vi.fn()
const allergiesEndpoint = vi.fn()

registerEndpoint('/api/admin/allergy-type/1', allergyTypeByIdEndpoint)
registerEndpoint('/api/admin/allergy-type', allergyTypesEndpoint)
registerEndpoint('/api/household/allergy', allergiesEndpoint)

import { useAllergiesStore } from '~/stores/allergies'

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

        allergyTypesEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypes())
        allergyTypeByIdEndpoint.mockReturnValue(AllergyFactory.createMockAllergyTypes()[0])
    })

    it('initializes with allergy types', async () => {
        const store = await setupStore()

        expect(store.isAllergyTypesInitialized).toBe(true)
        expect(store.allergyTypes).toHaveLength(2)
        expect(store.allergyTypes[0].name).toBe('Peanuts')
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
        { data: AllergyFactory.createMockAllergyTypes(), expected: false, description: 'with data' }
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
        expect(store.allergies[0].inhabitantId).toBe(1)
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
