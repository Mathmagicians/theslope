// @vitest-environment nuxt
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import type {
  HouseholdDisplay,
  HouseholdDetail
} from '~/composables/useCoreValidation'

import { useHouseholdsStore } from '~/stores/households'

// IMPORTANT: Register endpoints BEFORE importing the store
// The store's module-level useFetch executes on import
// Order matters: specific endpoints FIRST, generic endpoints LAST
const householdIndexEndpoint = vi.fn()
const householdByIdEndpoint = vi.fn()

registerEndpoint('/api/admin/household/1', householdByIdEndpoint)
registerEndpoint('/api/admin/household/2', householdByIdEndpoint)
registerEndpoint('/api/admin/household', householdIndexEndpoint)

// ========================================
// Test Helpers
// ========================================

const createMockHouseholds = (): HouseholdDisplay[] => [
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

const createMockHouseholdDetail = (): HouseholdDetail => ({
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
      userId: null,
      dinnerPreferences: null
    }
  ]
})

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

    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
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
})
