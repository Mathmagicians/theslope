// @vitest-environment nuxt
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type {
  HouseholdDisplay,
  HouseholdDetail,
  UserDetail
} from '~/composables/useCoreValidation'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import { UserFactory } from '~~/tests/e2e/testDataFactories/userFactory'
import { asyncDataStatus, resetStores } from '~~/tests/component/testHelpers'

import { useHouseholdsStore } from '~/stores/households'

// nuxt-auth-utils has no session in the test environment; the spec logs in and out and sets the session user
const { mockLoggedIn, mockSessionUser } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { mockLoggedIn: ref(true), mockSessionUser: ref<UserDetail | null>(null) }
})
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: mockLoggedIn,
  user: mockSessionUser,
  session: { value: null },
  clear: vi.fn(),
  fetch: vi.fn()
}))

// Schema for validating mock responses
const { InhabitantUpdateResponseSchema, ScaffoldResultSchema } = useBookingValidation()

// IMPORTANT: Register endpoints BEFORE importing the store
// The store's module-level useFetch executes on import
// Order matters: specific endpoints FIRST, generic endpoints LAST
const householdIndexEndpoint = vi.fn()
const householdByIdEndpoint = vi.fn()
const preferencesEndpoint1 = vi.fn()
const preferencesEndpoint2 = vi.fn()
const moveInhabitantEndpoint = vi.fn()
const deleteHouseholdEndpoint = vi.fn()

registerEndpoint('/api/household/inhabitants/1/preferences', preferencesEndpoint1)
registerEndpoint('/api/household/inhabitants/2/preferences', preferencesEndpoint2)
// Generic (no method) registered BEFORE method-specific so method-specific wins (reverse-order lookup)
registerEndpoint('/api/admin/household/1', householdByIdEndpoint)
registerEndpoint('/api/admin/household/2', householdByIdEndpoint)
registerEndpoint('/api/admin/household/inhabitants/1', { handler: moveInhabitantEndpoint, method: 'POST' })
registerEndpoint('/api/admin/household/1', { handler: deleteHouseholdEndpoint, method: 'DELETE' })
registerEndpoint('/api/admin/household/2', { handler: deleteHouseholdEndpoint, method: 'DELETE' })
registerEndpoint('/api/admin/household', householdIndexEndpoint)
// Method-specific after the generic index above (reverse-order lookup)
const createHouseholdEndpoint = vi.fn()
const moveOutEndpoint = vi.fn()
registerEndpoint('/api/admin/household', { handler: createHouseholdEndpoint, method: 'PUT' })
registerEndpoint('/api/household/1/update', { handler: moveOutEndpoint, method: 'POST' })
const calendarFeedEndpoint = vi.fn()
registerEndpoint('/api/calendar/feed', calendarFeedEndpoint)

// ========================================
// Test Helpers - Use factory data + schema validation
// ========================================

// Lightweight inhabitant for Display (index endpoint) - uses factory for required fields
const createMockInhabitantDisplay = (id: number, householdId: number = 1) => {
  const base = HouseholdFactory.defaultInhabitantData(`test-display-${id}`)
  return {
    ...base,
    id,
    householdId
  }
}

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
    modeUpdated: 0,
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
    moveInhabitantEndpoint.mockClear()
    deleteHouseholdEndpoint.mockClear()

    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
    preferencesEndpoint1.mockReturnValue(createMockInhabitantUpdateResponse())
    preferencesEndpoint2.mockReturnValue(createMockInhabitantUpdateResponse())
    moveInhabitantEndpoint.mockReturnValue(createMockInhabitantUpdateResponse())
    deleteHouseholdEndpoint.mockReturnValue(null)
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

      // Verify aggregated result (includes all ScaffoldResult fields)
      expect(store.lastPreferenceResult).toEqual({
        seasonId: 1,     // Same for all (household in same season)
        created: 5,      // 3 + 2
        deleted: 2,      // 1 + 1
        released: 1,     // 0 + 1
        priceUpdated: 1, // 0 + 1
        modeUpdated: 0,  // 0 + 0
        unchanged: 3,    // 2 + 1
        households: 1,   // Power mode = single household
        errored: 0,      // 0 + 0
        claimed: 0,      // 0 + 0
        claimRejected: 0 // 0 + 0
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

  describe('moveInhabitant', () => {
    it('calls POST /api/admin/household/inhabitants/:id with target householdId', async () => {
      const store = await setupStore()

      await store.moveInhabitant(1, 2)

      expect(moveInhabitantEndpoint).toHaveBeenCalledTimes(1)
    })

    it('stores scaffold result in lastMoveResult', async () => {
      const store = await setupStore()
      const mockResponse = createMockInhabitantUpdateResponse()
      moveInhabitantEndpoint.mockReturnValue(mockResponse)

      await store.moveInhabitant(1, 2)

      expect(store.lastMoveResult).toEqual(mockResponse.scaffoldResult)
    })

    it('returns an InhabitantUpdateResponse with inhabitant and scaffoldResult', async () => {
      const store = await setupStore()
      const mockResponse = createMockInhabitantUpdateResponse()
      moveInhabitantEndpoint.mockReturnValue(mockResponse)

      const result = await store.moveInhabitant(1, 2)

      // $fetch returns JSON-deserialized data (dates as strings), so compare non-date fields
      expect(result?.inhabitant.id).toBe(mockResponse.inhabitant.id)
      expect(result?.scaffoldResult).toEqual(mockResponse.scaffoldResult)
    })

    it('refreshes selected household after move when one is selected', async () => {
      const store = await setupStore()

      store.loadHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())
      householdByIdEndpoint.mockClear()

      await store.moveInhabitant(1, 2)

      expect(householdByIdEndpoint).toHaveBeenCalled()
    })

    it('refreshes household list after move', async () => {
      const store = await setupStore()
      householdIndexEndpoint.mockClear()

      await store.moveInhabitant(1, 2)

      expect(householdIndexEndpoint).toHaveBeenCalled()
    })

    it.each([
      { description: 'no order changes (created=0, deleted=0, released=0)', scaffoldOverrides: { created: 0, deleted: 0, released: 0 } },
      { description: 'with order changes (created=3)', scaffoldOverrides: { created: 3, deleted: 0, released: 0 } }
    ])('does not throw on success with $description', async ({ scaffoldOverrides }) => {
      const store = await setupStore()
      moveInhabitantEndpoint.mockReturnValue(
        InhabitantUpdateResponseSchema.parse({
          inhabitant: createMockInhabitant(1, 2),
          scaffoldResult: createMockScaffoldResult(scaffoldOverrides)
        })
      )

      await expect(store.moveInhabitant(1, 2)).resolves.not.toThrow()
    })

    it('does not throw on API error (calls handleApiError instead)', async () => {
      const store = await setupStore()
      moveInhabitantEndpoint.mockImplementation(() => {
        throw createError({ statusCode: 500, statusMessage: 'Server error' })
      })

      // moveInhabitant catches errors with handleApiError and does not rethrow
      await expect(store.moveInhabitant(1, 2)).resolves.toBeUndefined()
    })
  })

  describe('deleteHousehold', () => {
    it('calls DELETE /api/admin/household/:id', async () => {
      const store = await setupStore()

      await store.deleteHousehold(1)

      expect(deleteHouseholdEndpoint).toHaveBeenCalledTimes(1)
    })

    it('refreshes household list after deletion', async () => {
      const store = await setupStore()
      householdIndexEndpoint.mockClear()

      await store.deleteHousehold(1)

      expect(householdIndexEndpoint).toHaveBeenCalled()
    })

    it.each([
      { description: 'selected household is the deleted one', selectedId: 1, expectedAfter: null },
      { description: 'selected household is a different one', selectedId: 2, expectedAfter: 2 }
    ])('clears selectedHouseholdId when $description', async ({ selectedId, expectedAfter }) => {
      const store = await setupStore()

      store.loadHousehold(selectedId)
      await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(selectedId))

      await store.deleteHousehold(1)

      expect(store.selectedHouseholdId).toBe(expectedAfter)
    })

    it('does not throw on API error (calls handleApiError instead)', async () => {
      const store = await setupStore()
      deleteHouseholdEndpoint.mockImplementation(() => {
        throw createError({ statusCode: 500, statusMessage: 'Server error' })
      })

      // deleteHousehold catches errors with handleApiError and does not rethrow
      await expect(store.deleteHousehold(1)).resolves.toBeUndefined()
    })
  })

  describe('setMoveOutDate', () => {
    it('returns the scaffold result and keeps it in lastMoveOutResult', async () => {
      const scaffoldResult = createMockScaffoldResult({ deleted: 4 })
      moveOutEndpoint.mockReturnValue({ household: createMockHouseholdDetail(), scaffoldResult })
      const store = await setupStore()

      const result = await store.setMoveOutDate(1, new Date())

      expect(result).toEqual(scaffoldResult)
      expect(store.lastMoveOutResult).toEqual(scaffoldResult)
    })

    it('rethrows a failed update', async () => {
      moveOutEndpoint.mockImplementation(() => {
        throw createError({ statusCode: 500, statusMessage: 'Server error' })
      })
      const store = await setupStore()

      await expect(store.setMoveOutDate(1, null)).rejects.toThrow()
    })
  })

  describe('createHousehold', () => {
    const payload = () => {
      const { pbsId, address, movedInDate, heynaboId, name } = createMockHouseholdDetail()
      return { pbsId, address, movedInDate, heynaboId, name }
    }

    it('returns the created household and refreshes the list', async () => {
      createHouseholdEndpoint.mockReturnValue(createMockHouseholdDetail())
      const store = await setupStore()
      householdIndexEndpoint.mockClear()

      const created = await store.createHousehold(payload())

      expect(created?.id).toBe(createMockHouseholdDetail().id)
      expect(householdIndexEndpoint).toHaveBeenCalled()
    })

    it('resolves null when the create fails', async () => {
      createHouseholdEndpoint.mockImplementation(() => {
        throw createError({ statusCode: 400, statusMessage: 'Bad request' })
      })
      const store = await setupStore()

      await expect(store.createHousehold(payload())).resolves.toBeNull()
    })
  })
})

describe('Households Store - calendar feed', () => {
  const FEED_URL = 'webcal://example.test/api/calendar/feed.ics'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    { description: 'returns the feed URL', respond: () => FEED_URL, expected: FEED_URL },
    { description: 'resolves null when the request fails', respond: () => { throw createError({ statusCode: 500 }) }, expected: null }
  ])('fetchCalendarFeed $description', async ({ respond, expected }) => {
    calendarFeedEndpoint.mockImplementation(respond)
    const store = useHouseholdsStore()

    await expect(store.fetchCalendarFeed()).resolves.toBe(expected)
  })
})

describe('Households Store - gated reads', () => {
  const HOUSEHOLDS_KEY = 'households-store-households'
  const SELECTED_KEY = 'households-store-selected-household'

  beforeEach(() => {
    resetStores()
    vi.clearAllMocks()
    mockLoggedIn.value = true
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
    deleteHouseholdEndpoint.mockReturnValue(null)
  })

  afterEach(() => {
    mockLoggedIn.value = true
  })

  const readFlags = (store: ReturnType<typeof useHouseholdsStore>) => ({
    isHouseholdsLoading: store.isHouseholdsLoading,
    isHouseholdsErrored: store.isHouseholdsErrored,
    isHouseholdsInitialized: store.isHouseholdsInitialized,
    isNoHouseholds: store.isNoHouseholds,
    isHouseholdsStoreReady: store.isHouseholdsStoreReady
  })
  const IDLE_FLAGS = {
    isHouseholdsLoading: false,
    isHouseholdsErrored: false,
    isHouseholdsInitialized: false,
    isNoHouseholds: false,
    isHouseholdsStoreReady: false
  }

  describe('households list (login gate, constant key)', () => {
    it('is idle and unrequested while logged out, and the store is not ready', async () => {
      mockLoggedIn.value = false

      const store = useHouseholdsStore()
      await flushPromises()

      expect(householdIndexEndpoint).not.toHaveBeenCalled()
      expect(asyncDataStatus(HOUSEHOLDS_KEY)).toBe('idle')
      expect(readFlags(store)).toEqual(IDLE_FLAGS)
    })

    it('fetches once the user logs in', async () => {
      mockLoggedIn.value = false
      const store = useHouseholdsStore()
      await flushPromises()

      mockLoggedIn.value = true

      await vi.waitFor(() => expect(asyncDataStatus(HOUSEHOLDS_KEY)).toBe('success'))
      expect(householdIndexEndpoint).toHaveBeenCalled()
      expect(store.households).toHaveLength(createMockHouseholds().length)
    })

    it('empties on logout', async () => {
      const store = await setupStore()
      expect(store.households).toHaveLength(createMockHouseholds().length)

      mockLoggedIn.value = false

      await vi.waitFor(() => expect(asyncDataStatus(HOUSEHOLDS_KEY)).toBe('idle'))
      expect(store.households).toEqual([])
      expect(readFlags(store)).toEqual(IDLE_FLAGS)
    })
  })

  describe('selected household (id in the key)', () => {
    it('is idle and unrequested with no household selected', async () => {
      const store = await setupStore()

      expect(householdByIdEndpoint).not.toHaveBeenCalled()
      expect(asyncDataStatus(SELECTED_KEY)).toBe('idle')
      expect(store.isSelectedHouseholdLoading).toBe(false)
      expect(store.isSelectedHouseholdInitialized).toBe(false)
      expect(store.isHouseholdsStoreReady).toBe(false)
    })

    it('fetches once a household is selected, and the store is ready', async () => {
      const store = await setupStore()

      store.loadHousehold(1)

      await vi.waitFor(() => expect(store.isHouseholdsStoreReady).toBe(true))
      expect(asyncDataStatus(SELECTED_KEY)).toBe('success')
      expect(householdByIdEndpoint).toHaveBeenCalled()
    })

    it('lands on the empty default when the selected household is deleted', async () => {
      const store = await setupStore()
      store.loadHousehold(1)
      await vi.waitFor(() => expect(store.isSelectedHouseholdInitialized).toBe(true))

      await store.deleteHousehold(1)

      await vi.waitFor(() => expect(asyncDataStatus(SELECTED_KEY)).toBe('idle'))
      expect(store.selectedHousehold).toBeNull()
    })
  })
})

describe('Households Store - household selection', () => {
  const [mine, other] = createMockHouseholds()

  beforeEach(() => {
    resetStores()
    vi.clearAllMocks()
    mockSessionUser.value = UserFactory.defaultUserWithInhabitant('households-selection')
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
    deleteHouseholdEndpoint.mockReturnValue(null)
  })

  afterEach(() => {
    mockSessionUser.value = null
  })

  it('selects my household by default once the households load', async () => {
    const store = useHouseholdsStore()

    await vi.waitFor(() => expect(store.isHouseholdsStoreReady).toBe(true))
    expect(store.selectedHouseholdId).toBe(mine!.id)
  })

  it('a user choice wins over the default', async () => {
    const store = await setupStore()

    store.loadHousehold(other!.id)

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(other!.id))
  })

  it('deleting the selected household returns to my household', async () => {
    const store = await setupStore()
    store.loadHousehold(other!.id)
    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(other!.id))

    await store.deleteHousehold(other!.id)

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(mine!.id))
  })

  it.each([
    {when: 'after the households have loaded', awaitHouseholds: true},
    {when: 'before the households have loaded', awaitHouseholds: false}
  ])('selects the household a pbs names, requested $when', async ({awaitHouseholds}) => {
    const store = useHouseholdsStore()
    if (awaitHouseholds) await store.loadHouseholds()

    store.selectHouseholdByPbs(other!.pbsId)

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(other!.id))
    await vi.waitFor(() => expect(store.isHouseholdsStoreReady).toBe(true))
  })

  it('falls back to my household for a pbs no household carries', async () => {
    const store = await setupStore()

    store.selectHouseholdByPbs(-1)

    await vi.waitFor(() => expect(store.isHouseholdsStoreReady).toBe(true))
    expect(store.selectedHouseholdId).toBe(mine!.id)
  })
})
