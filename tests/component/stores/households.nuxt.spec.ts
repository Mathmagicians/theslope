// @vitest-environment nuxt
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import type {
  HouseholdDisplay,
  HouseholdDetail
} from '~/composables/useCoreValidation'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'

import { useHouseholdsStore } from '~/stores/households'

// Schema for validating mock responses
const { InhabitantUpdateResponseSchema, ScaffoldResultSchema } = useBookingValidation()

// IMPORTANT: Register endpoints BEFORE importing the store
// The store's module-level useFetch executes on import
// Order matters: specific endpoints FIRST, generic endpoints LAST
const householdIndexEndpoint = vi.fn()
const householdByIdEndpoint = vi.fn()
const preferencesEndpoint1 = vi.fn()
const preferencesEndpoint2 = vi.fn()

registerEndpoint('/api/household/inhabitants/1/preferences', preferencesEndpoint1)
registerEndpoint('/api/household/inhabitants/2/preferences', preferencesEndpoint2)
registerEndpoint('/api/admin/household/1', householdByIdEndpoint)
registerEndpoint('/api/admin/household/2', householdByIdEndpoint)
registerEndpoint('/api/admin/household', householdIndexEndpoint)

// ========================================
// Test Helpers - Use factory data + schema validation
// ========================================

// Lightweight inhabitant for Display (index endpoint)
const createMockInhabitantDisplay = (id: number) => ({
  id,
  name: `Inhabitant-${id}`,
  lastName: 'Test'
})

// Build mock data from factory defaults
const createMockHouseholds = (): HouseholdDisplay[] => {
  const base1 = HouseholdFactory.defaultHouseholdData('test-1')
  const base2 = HouseholdFactory.defaultHouseholdData('test-2')
  return [
    {
      ...base1,
      id: 1,
      shortName: 'AR_1_st',
      moveOutDate: null,
      // Include inhabitants for updateAllInhabitantPreferences (iterates over household.inhabitants)
      inhabitants: [
        createMockInhabitantDisplay(1),
        createMockInhabitantDisplay(2)
      ]
    },
    { ...base2, id: 2, shortName: 'BR_2_th', moveOutDate: null, inhabitants: [] }
  ]
}

const createMockInhabitant = (id: number, householdId: number) => {
  const base = HouseholdFactory.defaultInhabitantData(`test-inh-${id}`)
  return {
    ...base,
    id,
    householdId,
    userId: null,
    dinnerPreferences: null
  }
}

const createMockHouseholdDetail = (): HouseholdDetail => {
  const base = HouseholdFactory.defaultHouseholdData('test-detail')
  return {
    ...base,
    id: 1,
    shortName: 'AR_1_st',
    moveOutDate: null,
    inhabitants: [
      createMockInhabitant(1, 1),
      createMockInhabitant(2, 1)
    ]
  }
}

const createMockScaffoldResult = (overrides = {}) => {
  const result = {
    seasonId: 1,
    created: 5,
    deleted: 0,
    released: 0,
    priceUpdated: 0,
    unchanged: 0,
    households: 1,
    errored: 0,
    ...overrides
  }
  // Validate with schema
  return ScaffoldResultSchema.parse(result)
}

const createMockInhabitantUpdateResponse = (inhabitantId = 1) => {
  const response = {
    inhabitant: createMockInhabitant(inhabitantId, 1),
    scaffoldResult: createMockScaffoldResult()
  }
  // Validate with schema
  return InhabitantUpdateResponseSchema.parse(response)
}

const setupStore = async () => {
  const store = useHouseholdsStore()
  await store.loadHouseholds()
  return store
}

// ========================================
// Tests
// ========================================

describe('Households Store', () => {
  beforeAll(() => {
    setActivePinia(createPinia())
  })

  beforeEach(() => {
    vi.clearAllMocks()
    householdIndexEndpoint.mockClear()
    householdByIdEndpoint.mockClear()
    preferencesEndpoint1.mockClear()
    preferencesEndpoint2.mockClear()

    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
    preferencesEndpoint1.mockReturnValue(createMockInhabitantUpdateResponse())
    preferencesEndpoint2.mockReturnValue(createMockInhabitantUpdateResponse())
  })

  it('initializes with 2 households', async () => {
    const store = await setupStore()

    expect(store.isHouseholdsInitialized).toBe(true)
    expect(store.households).toHaveLength(2)
  })

  it('exposes households error when fetch fails', async () => {
    householdIndexEndpoint.mockImplementation(() => {
      throw createError({
        statusCode: 500,
        statusMessage: 'Network error'
      })
    })

    const store = useHouseholdsStore()
    await expect(store.loadHouseholds()).rejects.toThrow()

    expect(store.isHouseholdsErrored).toBe(true)
    expect(store.householdsError?.statusCode).toBe(500)
  })

  it.each([
    { data: [], expected: true, description: 'empty array' },
    { data: createMockHouseholds(), expected: false, description: 'with data' }
  ])('isNoHouseholds detects $description', async ({ data, expected }) => {
    householdIndexEndpoint.mockReturnValue(data)

    const store = await setupStore()

    expect(store.isNoHouseholds).toBe(expected)
    expect(store.households).toHaveLength(data.length)
  })

  describe('updateInhabitantPreferences', () => {
    it('calls API endpoint', async () => {
      const store = await setupStore()
      const preferences = { MONDAY: 'DINEIN', TUESDAY: 'TAKEAWAY' }

      await store.updateInhabitantPreferences(1, preferences)

      expect(preferencesEndpoint1).toHaveBeenCalled()
    })

    it('returns scaffold result from API response', async () => {
      const store = await setupStore()
      const mockResponse = createMockInhabitantUpdateResponse()
      preferencesEndpoint1.mockReturnValue(mockResponse)

      const result = await store.updateInhabitantPreferences(1, { MONDAY: 'DINEIN' })

      expect(result).toEqual(mockResponse.scaffoldResult)
    })

    it('stores scaffold result in lastPreferenceResult', async () => {
      const store = await setupStore()
      const mockResponse = createMockInhabitantUpdateResponse()
      preferencesEndpoint1.mockReturnValue(mockResponse)

      await store.updateInhabitantPreferences(1, { MONDAY: 'DINEIN' })

      expect(store.lastPreferenceResult).toEqual(mockResponse.scaffoldResult)
    })

    it('refreshes selected household after update when household is selected', async () => {
      const store = await setupStore()

      // Load household detail to set selectedHouseholdId
      store.loadHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())

      // Clear previous calls
      householdByIdEndpoint.mockClear()

      await store.updateInhabitantPreferences(1, { MONDAY: 'DINEIN' })

      // Verify refresh was called
      expect(householdByIdEndpoint).toHaveBeenCalled()
    })

    it('handles API errors correctly', async () => {
      const store = await setupStore()
      preferencesEndpoint1.mockImplementation(() => {
        throw createError({
          statusCode: 500,
          statusMessage: 'Server error'
        })
      })

      await expect(
        store.updateInhabitantPreferences(1, { MONDAY: 'DINEIN' })
      ).rejects.toThrow()
    })
  })

  describe('updateAllInhabitantPreferences', () => {
    it('calls API for each inhabitant in household', async () => {
      const store = await setupStore()

      // Load household detail with 2 inhabitants
      store.loadHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())

      const preferences = { MONDAY: 'DINEIN', TUESDAY: 'TAKEAWAY' }
      await store.updateAllInhabitantPreferences(1, preferences)

      // Should call preferences endpoint for both inhabitants
      expect(preferencesEndpoint1).toHaveBeenCalled()
      expect(preferencesEndpoint2).toHaveBeenCalled()
    })

    it('aggregates scaffold results from all inhabitants', async () => {
      const store = await setupStore()

      // Setup household with 2 inhabitants
      store.loadHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())

      // Mock different results for each inhabitant - use factory + schema validation
      preferencesEndpoint1.mockReturnValue(InhabitantUpdateResponseSchema.parse({
        inhabitant: createMockInhabitant(1, 1),
        scaffoldResult: createMockScaffoldResult({ created: 3, deleted: 1, unchanged: 2 })
      }))
      preferencesEndpoint2.mockReturnValue(InhabitantUpdateResponseSchema.parse({
        inhabitant: createMockInhabitant(2, 1),
        scaffoldResult: createMockScaffoldResult({ created: 2, deleted: 1, released: 1, priceUpdated: 1, unchanged: 1 })
      }))

      await store.updateAllInhabitantPreferences(1, { MONDAY: 'DINEIN' })

      // Verify aggregated result
      expect(store.lastPreferenceResult).toEqual({
        created: 5,      // 3 + 2
        deleted: 2,      // 1 + 1
        released: 1,     // 0 + 1
        priceUpdated: 1, // 0 + 1
        unchanged: 3,    // 2 + 1
        errored: 0       // 0 + 0
      })
    })

    it('updates inhabitants sequentially to avoid race conditions', async () => {
      const store = await setupStore()

      store.loadHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())

      const callOrder: number[] = []

      preferencesEndpoint1.mockImplementation(() => {
        callOrder.push(1)
        return createMockInhabitantUpdateResponse()
      })
      preferencesEndpoint2.mockImplementation(() => {
        callOrder.push(2)
        return createMockInhabitantUpdateResponse()
      })

      await store.updateAllInhabitantPreferences(1, { MONDAY: 'DINEIN' })

      // Verify sequential execution (order preserved)
      expect(callOrder).toEqual([1, 2])
    })

    it('refreshes selected household once after all updates', async () => {
      const store = await setupStore()

      store.loadHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())

      // Clear previous calls from loadHousehold
      householdByIdEndpoint.mockClear()

      await store.updateAllInhabitantPreferences(1, { MONDAY: 'DINEIN' })

      // Should be called exactly once after all updates
      expect(householdByIdEndpoint).toHaveBeenCalledTimes(1)
    })

    it('throws error when household not found', async () => {
      const store = await setupStore()

      await expect(
        store.updateAllInhabitantPreferences(999, { MONDAY: 'DINEIN' })
      ).rejects.toThrow('Household 999 not found')
    })

    it('handles API errors during batch update', async () => {
      const store = await setupStore()

      store.loadHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())

      // First inhabitant succeeds, second fails
      preferencesEndpoint1.mockReturnValue(createMockInhabitantUpdateResponse())
      preferencesEndpoint2.mockImplementation(() => {
        throw createError({
          statusCode: 500,
          statusMessage: 'Server error'
        })
      })

      await expect(
        store.updateAllInhabitantPreferences(1, { MONDAY: 'DINEIN' })
      ).rejects.toThrow()
    })
  })
})
