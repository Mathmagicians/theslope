// @vitest-environment nuxt
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { clearNuxtData } from '#app'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import type {
  HouseholdSummary,
  HouseholdWithInhabitants
} from '~/composables/useHouseholdValidation'

// IMPORTANT: Register endpoints BEFORE importing the store
// The store's module-level useFetch executes on import
// Order matters: specific endpoints FIRST, generic endpoints LAST
const householdIndexEndpoint = vi.fn()
const householdByIdEndpoint = vi.fn()

// Register specific ID endpoints, then generic list
// useAsyncData doesn't auto-execute so /null endpoint not needed
registerEndpoint('/api/admin/household/1', householdByIdEndpoint)
registerEndpoint('/api/admin/household/2', householdByIdEndpoint)
registerEndpoint('/api/admin/household', householdIndexEndpoint)

import { useHouseholdsStore } from '~/stores/households'

// ========================================
// Test Helpers
// ========================================

const createMockHouseholds = (): HouseholdSummary[] => [
  {
    id: 1,
    heynaboId: 100,
    pbsId: 1000,
    movedInDate: new Date('2024-01-01'),
    moveOutDate: null,
    shortName: 'AR_1_st',
    name: 'Household A',
    address: '123 Main St',
    inhabitants: []
  },
  {
    id: 2,
    heynaboId: 200,
    pbsId: 2000,
    movedInDate: new Date('2024-02-01'),
    moveOutDate: null,
    shortName: 'BR_2_th',
    name: 'Household B',
    address: '456 Oak Ave',
    inhabitants: []
  }
]

const createMockHouseholdDetail = (): HouseholdWithInhabitants => ({
  id: 1,
  shortName: 'AR_1_st',
  name: 'Household A',
  address: '123 Main St',
  heynaboId: 100,
  pbsId: 200,
  movedInDate: new Date('2024-01-01'),
  moveOutDate: null,
  inhabitants: [
    {
      id: 1,
      heynaboId: 1001,
      householdId: 1,
      name: 'Alice',
      lastName: 'Anderson',
      birthDate: new Date('1990-01-01'),
      pictureUrl: null,
      userId: null
    }
  ]
})

// ========================================
// Tests
// ========================================

describe('useHouseholdsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    householdIndexEndpoint.mockClear()
    householdByIdEndpoint.mockClear()
    clearNuxtData()
  })

  it('idempotency - should fetch once, then skip on subsequent calls', async () => {
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
    const store = useHouseholdsStore()

    await store.initHouseholdsStore()
    await store.initHouseholdsStore()
    await store.initHouseholdsStore()

    expect(householdIndexEndpoint).toHaveBeenCalledTimes(1)
    expect(store.households.length).toBe(2)
  })

  it('should skip list re-fetch when shortName parameter is provided', async () => {
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
    const store = useHouseholdsStore()

    // First call - should fetch list
    expect(store.isHouseholdsInitialized).toBe(false)
    await store.initHouseholdsStore()
    expect(store.isHouseholdsInitialized).toBe(true)
    expect(householdIndexEndpoint).toHaveBeenCalledTimes(1)

    // Second call with shortName - should skip list fetch
    await store.initHouseholdsStore('AR_1_st')
    expect(householdIndexEndpoint).toHaveBeenCalledTimes(1)  // Still 1, not 2
    expect(householdByIdEndpoint).toHaveBeenCalledTimes(1)
    expect(store.selectedHousehold?.shortName).toBe('AR_1_st')
  })

  it('should expose correct state after successful fetch', async () => {
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    const store = useHouseholdsStore()

    await store.initHouseholdsStore()

    expect(store.isHouseholdsLoading).toBe(false)
    expect(store.isHouseholdsErrored).toBe(false)
    expect(store.isNoHouseholds).toBe(false)
    expect(store.householdsError).toBeUndefined()
  })

  it.each([
    { data: [], isNoHouseholds: true, description: 'empty array' },
    { data: createMockHouseholds(), isNoHouseholds: false, description: 'with data' }
  ])('should detect empty state: $description', async ({ data, isNoHouseholds }) => {
    householdIndexEndpoint.mockReturnValue(data)
    const store = useHouseholdsStore()

    await store.initHouseholdsStore()

    expect(store.isNoHouseholds).toBe(isNoHouseholds)
  })

  it('should detect error state', async () => {
    householdIndexEndpoint.mockImplementation(() => {
      throw createError({
        statusCode: 500,
        statusMessage: 'Network error'
      })
    })
    const store = useHouseholdsStore()

    // With SSR pattern, errors propagate up - component/page handles display
    await expect(store.initHouseholdsStore()).rejects.toThrow()

    expect(store.isHouseholdsErrored).toBe(true)
    expect(store.householdsError).toBeTruthy()
  })

  it('should expose correct state after successful household load', async () => {
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
    const store = useHouseholdsStore()

    await store.initHouseholdsStore('AR_1_st')

    expect(store.isSelectedHouseholdLoading).toBe(false)
    expect(store.isSelectedHouseholdErrored).toBe(false)
    expect(store.isSelectedHouseholdInitialized).toBe(true)
    expect(store.selectedHouseholdError).toBeUndefined()
    expect(store.selectedHousehold?.id).toBe(1)
    expect(store.selectedHousehold?.shortName).toBe('AR_1_st')
  })

  it('should detect error state when household load fails', async () => {
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockImplementation(() => {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server error'
      })
    })
    const store = useHouseholdsStore()

    // With SSR pattern, errors propagate up - component/page handles display
    await expect(store.initHouseholdsStore('AR_1_st')).rejects.toThrow()

    expect(store.isSelectedHouseholdErrored).toBe(true)
    expect(store.selectedHouseholdError).toBeTruthy()
    expect(store.selectedHouseholdError?.statusCode).toBe(500)
  })
})
