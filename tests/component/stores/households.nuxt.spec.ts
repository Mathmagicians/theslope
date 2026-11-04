// @vitest-environment nuxt
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { getQuery, readBody, type H3Event } from 'h3'
import {
  useCoreValidation,
  adminBypassQuery,
  allInhabitantsQuery,
  type HouseholdDisplay,
  type HouseholdDetail
} from '~/composables/useCoreValidation'
import { useBookingValidation } from '~/composables/useBookingValidation'
import { countTotals } from '~/composables/useBooking'
import { scaffoldToast, type ScaffoldToast } from '~/composables/useBookingUi'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import { UserFactory } from '~~/tests/e2e/testDataFactories/userFactory'
import { OrderFactory } from '~~/tests/e2e/testDataFactories/orderFactory'
import { asyncDataStatus, resetStores } from '~~/tests/component/testHelpers'

import { useHouseholdsStore } from '~/stores/households'
import { API_ERROR_WORDS } from '~/config/apiErrorWords'
import { HOUSEHOLD_WORDS } from '~/config/householdWords'
import { useBookingsStore } from '~/stores/bookings'
const Action = useBookingValidation().BookingActionSchema.enum
const DinnerMode = useBookingValidation().DinnerModeSchema.enum

// nuxt-auth-utils has no session in the test environment; the spec logs in and out and sets the session user
const { session, useUserSession } = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)
// Logged in without a session user: the reads gate on the flag alone
session.loggedIn.value = true

// Schema for validating mock responses
const { InhabitantUpdateResponseSchema } = useBookingValidation()
const { createDefaultWeekdayMap, serializeWeekDayMap } = useCoreValidation()
// The draft a preference save sends: every weekday dines in
const weekMap = createDefaultWeekdayMap(DinnerMode.DINEIN)
const aToastText: ScaffoldToast = {title: 'a save'}

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
const GONE_HOUSEHOLD_ID = 3
registerEndpoint(`/api/admin/household/${GONE_HOUSEHOLD_ID}`, () => {
  throw createError({ statusCode: 404 })
})
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
// A preference preview is a read: the GET after the generic routes above (reverse-order lookup)
const previewEndpoint1 = vi.fn()
const previewEndpoint2 = vi.fn()
registerEndpoint('/api/household/inhabitants/1/preferences', { handler: previewEndpoint1, method: 'GET' })
registerEndpoint('/api/household/inhabitants/2/preferences', { handler: previewEndpoint2, method: 'GET' })

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

const createMockInhabitantUpdateResponse = (inhabitantId = 1) => {
  const response = {
    inhabitant: createMockInhabitant(inhabitantId, 1),
    scaffoldResult: OrderFactory.defaultScaffoldResult()
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
    expect(store.isNoHouseholds).toBe(false)
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

  it('isNoHouseholds detects an empty household list', async () => {
    householdIndexEndpoint.mockReturnValue([])

    const store = await setupStore()

    expect(store.isNoHouseholds).toBe(true)
    expect(store.households).toHaveLength(0)
  })

  describe('updateInhabitantPreferences', () => {
    it('calls the API and returns the scaffold result, kept in lastPreferenceResult', async () => {
      const store = await setupStore()
      const mockResponse = createMockInhabitantUpdateResponse()
      preferencesEndpoint1.mockReturnValue(mockResponse)

      const result = await store.updateInhabitantPreferences(1, weekMap, false, aToastText)

      expect(preferencesEndpoint1).toHaveBeenCalled()
      expect(result).toEqual(mockResponse.scaffoldResult)
      expect(store.lastPreferenceResult).toEqual(mockResponse.scaffoldResult)
    })

    it('refreshes selected household after update when household is selected', async () => {
      const store = await setupStore()

      // Load household detail to set selectedHouseholdId
      store.selectHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())

      // Clear previous calls
      householdByIdEndpoint.mockClear()

      await store.updateInhabitantPreferences(1, weekMap, false, aToastText)

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
        store.updateInhabitantPreferences(1, weekMap, false, aToastText)
      ).rejects.toThrow()
    })
  })

  // Power mode applies one draft to every inhabitant of the household: one save through an inhabitant's path with the
  // flag, whose one run answers for the household
  describe('updateAllInhabitantPreferences', () => {
    it('GIVEN power mode WHEN saved THEN one request to the inhabitant\'s preferences carries the draft and allInhabitants=true, and the server\'s scaffold result returns as is, kept in lastPreferenceResult', async () => {
      const requests: {query: Record<string, unknown>, body: unknown}[] = []
      const serverResult = OrderFactory.defaultScaffoldResult({totals: {[Action.BOOK]: 5, [Action.CANCEL]: 2}, unchanged: 3, households: 1})
      preferencesEndpoint1.mockImplementation(async (event: H3Event) => {
        requests.push({query: getQuery(event), body: await readBody(event)})
        return InhabitantUpdateResponseSchema.parse({inhabitant: createMockInhabitant(1, 1), scaffoldResult: serverResult})
      })
      const store = await setupStore()

      const result = await store.updateAllInhabitantPreferences(1, weekMap, false, aToastText)

      expect(requests).toEqual([{query: allInhabitantsQuery(true), body: {dinnerPreferences: weekMap}}])
      expect(preferencesEndpoint2).not.toHaveBeenCalled()
      expect(result).toEqual(serverResult)
      expect(store.lastPreferenceResult).toEqual(serverResult)
    })

    it('refreshes selected household once after the save', async () => {
      const store = await setupStore()

      store.selectHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())

      // Clear previous calls from loadHousehold
      householdByIdEndpoint.mockClear()

      await store.updateAllInhabitantPreferences(1, weekMap, false, aToastText)

      expect(householdByIdEndpoint).toHaveBeenCalledTimes(1)
    })

    it('rethrows a failed save', async () => {
      const store = await setupStore()
      preferencesEndpoint1.mockImplementation(() => {
        throw createError({
          statusCode: 500,
          statusMessage: 'Server error'
        })
      })

      await expect(
        store.updateAllInhabitantPreferences(1, weekMap, false, aToastText)
      ).rejects.toThrow()
    })
  })

  // A preview is a read: the draft travels serialized in the query of one GET, outside the booking write, with
  // no override; any member reads it. The server's run answers for the household: the other member's line stands beside
  // the inhabitant's own
  describe('previewPreferences', () => {
    const draft = { ...createDefaultWeekdayMap(DinnerMode.DINEIN), mandag: DinnerMode.NONE, tirsdag: DinnerMode.TAKEAWAY }
    const lines = [
      OrderFactory.defaultBookingResult({inhabitantId: 1, inhabitantName: 'Anna', dinnerEventId: 11, action: Action.CANCEL}),
      OrderFactory.defaultBookingResult({inhabitantId: 2, inhabitantName: 'Bo', dinnerEventId: 13, action: Action.BOOK})
    ]
    const serverPreview = OrderFactory.defaultScaffoldResult({results: lines, totals: countTotals(lines), households: 1})

    it.each([
      {mode: 'one inhabitant', allInhabitants: false},
      {mode: 'power mode', allInhabitants: true}
    ])('GIVEN $mode WHEN previewed THEN one GET of the inhabitant carries the draft and the scope, outside the booking write, and the server\'s result returns as is', async ({allInhabitants}) => {
      const sent: Record<string, unknown>[] = []
      previewEndpoint1.mockImplementation((event: H3Event) => {
        sent.push(getQuery(event))
        return InhabitantUpdateResponseSchema.parse({inhabitant: createMockInhabitant(1, 1), scaffoldResult: serverPreview})
      })
      const store = await setupStore()
      const lastSaved = store.lastPreferenceResult

      const preview = store.previewPreferences(1, draft, allInhabitants)
      expect(useBookingsStore().isProcessingBookings).toBe(false)

      expect(await preview).toEqual(serverPreview)
      expect(sent).toEqual([{dinnerPreferences: serializeWeekDayMap(draft), ...allInhabitantsQuery(allInhabitants)}])
      expect(previewEndpoint2).not.toHaveBeenCalled()
      expect(preferencesEndpoint1).not.toHaveBeenCalled()
      expect(store.lastPreferenceResult).toBe(lastSaved)
    })
  })

  describe('moveInhabitant', () => {
    it('posts the move once and returns an InhabitantUpdateResponse with inhabitant and scaffoldResult, kept in lastMoveResult', async () => {
      const store = await setupStore()
      const mockResponse = createMockInhabitantUpdateResponse()
      moveInhabitantEndpoint.mockReturnValue(mockResponse)

      const result = await store.moveInhabitant(1, 2)

      expect(moveInhabitantEndpoint).toHaveBeenCalledTimes(1)
      // $fetch returns JSON-deserialized data (dates as strings), so compare non-date fields
      expect(result?.inhabitant.id).toBe(mockResponse.inhabitant.id)
      expect(result?.scaffoldResult).toEqual(mockResponse.scaffoldResult)
      expect(store.lastMoveResult).toEqual(mockResponse.scaffoldResult)
    })

    it('refreshes the household list and the selected household after the move', async () => {
      const store = await setupStore()

      store.selectHousehold(1)
      await vi.waitFor(() => expect(store.selectedHousehold).toBeDefined())
      householdByIdEndpoint.mockClear()
      householdIndexEndpoint.mockClear()

      await store.moveInhabitant(1, 2)

      expect(householdByIdEndpoint).toHaveBeenCalled()
      expect(householdIndexEndpoint).toHaveBeenCalled()
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
    it('calls DELETE /api/admin/household/:id and refreshes the household list', async () => {
      const store = await setupStore()
      householdIndexEndpoint.mockClear()

      await store.deleteHousehold(1)

      expect(deleteHouseholdEndpoint).toHaveBeenCalledTimes(1)
      expect(householdIndexEndpoint).toHaveBeenCalled()
    })

    it.each([
      { description: 'selected household is the deleted one', selectedId: 1, expectedAfter: null },
      { description: 'selected household is a different one', selectedId: 2, expectedAfter: 2 }
    ])('clears selectedHouseholdId when $description', async ({ selectedId, expectedAfter }) => {
      const store = await setupStore()

      store.selectHousehold(selectedId)
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

  // The writes that re-scaffold a household, each with the override and the toast a caller hands it
  type Store = ReturnType<typeof useHouseholdsStore>
  const householdWrites = [
    {write: 'a preference change', endpoint: preferencesEndpoint1, run: (store: Store, adminBypass = false, toastText = aToastText) => store.updateInhabitantPreferences(1, weekMap, adminBypass, toastText)},
    {write: 'a power mode change', endpoint: preferencesEndpoint1, run: (store: Store, adminBypass = false, toastText = aToastText) => store.updateAllInhabitantPreferences(1, weekMap, adminBypass, toastText)},
    {write: 'a move-out date', endpoint: moveOutEndpoint, run: (store: Store, adminBypass = false, toastText = aToastText) => store.setMoveOutDate(1, new Date(), adminBypass, toastText)}
  ]

  // A write that changes bookings goes through the bookings store's one write, which re-reads what a booking touches
  describe('booking writes', () => {
    it.each([
      ...householdWrites,
      {write: 'a move to another household', run: (store: Store) => store.moveInhabitant(1, 2)}
    ])('$write goes through the one booking write', async ({run}) => {
      moveOutEndpoint.mockReturnValue({ household: createMockHouseholdDetail(), scaffoldResult: OrderFactory.defaultScaffoldResult() })
      const store = await setupStore()
      const bookingsStore = useBookingsStore()

      const write = run(store)
      expect(bookingsStore.isProcessingBookings).toBe(true)
      await write

      expect(bookingsStore.isProcessingBookings).toBe(false)
    })
  })

  // The store reports what a write's run did in the toast its caller hands it; a failed write shows the request's toast alone
  describe('the toast of a booking write', () => {
    const toastText: ScaffoldToast = {title: HOUSEHOLD_WORDS.moveOut.toasts.set, householdOrder: [2, 1]}
    const scaffoldResult = OrderFactory.defaultScaffoldResult({totals: {[Action.CANCEL]: 4}})

    beforeEach(() => {
      moveOutEndpoint.mockReturnValue({ household: createMockHouseholdDetail(), scaffoldResult })
      preferencesEndpoint1.mockReturnValue(InhabitantUpdateResponseSchema.parse({inhabitant: createMockInhabitant(1, 1), scaffoldResult}))
    })

    it.each(householdWrites)('GIVEN $write WHEN saved THEN one toast shows the run', async ({run}) => {
      const store = await setupStore()
      useToast().clear()

      await run(store, false, toastText)

      expect(useToast().toasts.value).toEqual([expect.objectContaining(scaffoldToast(toastText, scaffoldResult))])
    })

    it.each(householdWrites)('WHEN $write fails THEN the one toast is the request\'s, naming the failed save', async ({endpoint, run}) => {
      endpoint.mockImplementation(() => {
        throw createError({ statusCode: 500, statusMessage: 'Server error' })
      })
      const store = await setupStore()
      useToast().clear()

      await expect(run(store, false, toastText)).rejects.toThrow()

      expect(useToast().toasts.value.map(toast => toast.description)).toEqual([HOUSEHOLD_WORDS.failed.save.description])
    })
  })

  describe('setMoveOutDate', () => {
    it('returns the scaffold result and keeps it in lastMoveOutResult', async () => {
      const scaffoldResult = OrderFactory.defaultScaffoldResult({totals: {[Action.CANCEL]: 4}})
      moveOutEndpoint.mockReturnValue({ household: createMockHouseholdDetail(), scaffoldResult })
      const store = await setupStore()

      const result = await store.setMoveOutDate(1, new Date(), false)

      expect(result).toEqual(scaffoldResult)
      expect(store.lastMoveOutResult).toEqual(scaffoldResult)
    })

    it('rethrows a failed update', async () => {
      moveOutEndpoint.mockImplementation(() => {
        throw createError({ statusCode: 500, statusMessage: 'Server error' })
      })
      const store = await setupStore()

      await expect(store.setMoveOutDate(1, null, false)).rejects.toThrow()
    })
  })

  // An admin's change of a household carries the override; the household's own change carries no parameter
  describe('the override on a write', () => {
    it.each(householdWrites.flatMap(write => [false, true].map(adminBypass => ({...write, adminBypass}))))(
      'GIVEN $write with adminBypass $adminBypass WHEN saved THEN the request carries the override query of its role', async ({endpoint, run, adminBypass}) => {
        moveOutEndpoint.mockReturnValue({ household: createMockHouseholdDetail(), scaffoldResult: OrderFactory.defaultScaffoldResult() })
        const store = await setupStore()

        await run(store, adminBypass)

        expect(getQuery(endpoint.mock.calls[0]![0] as H3Event).adminBypass).toEqual(adminBypassQuery(adminBypass).adminBypass)
      })

    it('GIVEN a week map draft WHEN saved THEN the body carries the week map as it is, for the server to serialize', async () => {
      const draft = {...weekMap, tirsdag: DinnerMode.TAKEAWAY}
      const bodies: unknown[] = []
      preferencesEndpoint1.mockImplementation(async (event: H3Event) => {
        bodies.push(await readBody(event))
        return createMockInhabitantUpdateResponse()
      })
      const store = await setupStore()

      await store.updateInhabitantPreferences(1, draft, false, aToastText)

      expect(bodies).toEqual([{dinnerPreferences: draft}])
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

      const created = await store.createHousehold(payload(), [])

      expect(created?.id).toBe(createMockHouseholdDetail().id)
      expect(householdIndexEndpoint).toHaveBeenCalled()
    })

    it('resolves null when the create fails', async () => {
      createHouseholdEndpoint.mockImplementation(() => {
        throw createError({ statusCode: 400, statusMessage: 'Bad request' })
      })
      const store = await setupStore()

      await expect(store.createHousehold(payload(), [])).resolves.toBeNull()
    })

    it('GIVEN a prev owner at the address WHEN created THEN the create carries the household alone, the prev owner moves out by override, and the one toast reports the created household', async () => {
      const created: unknown[] = []
      createHouseholdEndpoint.mockImplementation(async (event: H3Event) => {
        created.push(await readBody(event))
        return createMockHouseholdDetail()
      })
      const movedOut: {query: unknown, body: unknown}[] = []
      moveOutEndpoint.mockImplementation(async (event: H3Event) => {
        movedOut.push({query: getQuery(event), body: await readBody(event)})
        return { household: createMockHouseholdDetail(), scaffoldResult: OrderFactory.defaultScaffoldResult() }
      })
      const store = await setupStore()
      const household = payload()
      const moveOutDate = new Date('2026-11-01T00:00:00Z')
      useToast().clear()

      await store.createHousehold(household, [{id: 1, moveOutDate}])

      expect(created).toEqual([JSON.parse(JSON.stringify(household))])
      expect(movedOut).toEqual([{query: adminBypassQuery(true), body: {moveOutDate: moveOutDate.toISOString()}}])
      expect(useToast().toasts.value.map(toast => toast.title)).toEqual([HOUSEHOLD_WORDS.moveOut.toasts.set, HOUSEHOLD_WORDS.toasts.created.title])
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
    session.loggedIn.value = true
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
    deleteHouseholdEndpoint.mockReturnValue(null)
  })

  afterEach(() => {
    session.loggedIn.value = true
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
      session.loggedIn.value = false

      const store = useHouseholdsStore()
      await flushPromises()

      expect(householdIndexEndpoint).not.toHaveBeenCalled()
      expect(asyncDataStatus(HOUSEHOLDS_KEY)).toBe('idle')
      expect(readFlags(store)).toEqual(IDLE_FLAGS)
    })

    it('fetches once the user logs in', async () => {
      session.loggedIn.value = false
      const store = useHouseholdsStore()
      await flushPromises()

      session.loggedIn.value = true

      await vi.waitFor(() => expect(asyncDataStatus(HOUSEHOLDS_KEY)).toBe('success'))
      expect(householdIndexEndpoint).toHaveBeenCalled()
      expect(store.households).toHaveLength(createMockHouseholds().length)
    })

    it('empties on logout', async () => {
      const store = await setupStore()
      expect(store.households).toHaveLength(createMockHouseholds().length)

      session.loggedIn.value = false

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

      store.selectHousehold(1)

      await vi.waitFor(() => expect(store.isHouseholdsStoreReady).toBe(true))
      expect(asyncDataStatus(SELECTED_KEY)).toBe('success')
      expect(householdByIdEndpoint).toHaveBeenCalled()
    })

    it('lands on the empty default when the selected household is deleted', async () => {
      const store = await setupStore()
      store.selectHousehold(1)
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
    session.user.value = UserFactory.defaultUserWithInhabitant('households-selection')
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    householdByIdEndpoint.mockReturnValue(createMockHouseholdDetail())
    deleteHouseholdEndpoint.mockReturnValue(null)
  })

  afterEach(() => {
    session.user.value = null
  })

  it('selects my household by default once the households load', async () => {
    const store = useHouseholdsStore()

    await vi.waitFor(() => expect(store.isHouseholdsStoreReady).toBe(true))
    expect(store.selectedHouseholdId).toBe(mine!.id)
  })

  type Choice = {shortName?: string, pbsId?: number} | number | null

  it.each([
    {by: 'its id', choice: other!.id as Choice},
    {by: 'its pbs', choice: {pbsId: other!.pbsId}},
    {by: 'its short name', choice: {shortName: other!.shortName}},
    {by: 'its pbs, over another household\'s short name', choice: {pbsId: other!.pbsId, shortName: mine!.shortName}}
  ])('a getter naming a household by $by loads that household', async ({choice}) => {
    const store = await setupStore()

    store.selectHousehold(() => choice)

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(other!.id))
    await vi.waitFor(() => expect(asyncDataStatus('households-store-selected-household')).toBe('success'))
    expect(householdByIdEndpoint).toHaveBeenCalled()
  })

  it.each([
    {by: 'an unknown id', choice: 999 as Choice},
    {by: 'an unknown pbs', choice: {pbsId: -1}},
    {by: 'an unknown short name', choice: {shortName: 'nowhere'}},
    {by: 'nothing', choice: null}
  ])('a getter naming $by selects my household', async ({choice}) => {
    const store = await setupStore()

    store.selectHousehold(() => choice)

    await vi.waitFor(() => expect(store.isHouseholdsStoreReady).toBe(true))
    expect(store.selectedHouseholdId).toBe(mine!.id)
  })

  it.each([
    {description: 'my household among them selects mine', sharing: () => [mine!, {...other!, shortName: mine!.shortName}], shortName: mine!.shortName, expected: mine!.id},
    {description: 'my household not among them selects the first', sharing: () => [mine!, other!, {...other!, id: 4, pbsId: other!.pbsId + 1}], shortName: other!.shortName, expected: other!.id}
  ])('a short name several households carry: $description', async ({sharing, shortName, expected}) => {
    householdIndexEndpoint.mockReturnValue(sharing())
    const store = await setupStore()

    store.selectHousehold(() => ({shortName}))

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(expected))
  })

  it('follows its getter with no further setter call, and a cleared choice returns to my household', async () => {
    const store = await setupStore()
    const choice = ref<Choice>({pbsId: other!.pbsId})

    store.selectHousehold(choice)
    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(other!.id))

    choice.value = null

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(mine!.id))
  })

  it('keeps the choice out of the store state', async () => {
    const store = await setupStore()
    const choice = {pbsId: other!.pbsId}

    store.selectHousehold(() => choice)

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(other!.id))
    expect(Object.values(store.$state)).not.toContainEqual(choice)
  })

  it('deleting the selected household returns to my household', async () => {
    const store = await setupStore()
    store.selectHousehold(other!.id)
    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(other!.id))

    await store.deleteHousehold(other!.id)

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(mine!.id))
  })

  // After the households have loaded is the "by its pbs" row above
  it('selects the household a pbs names, requested before the households have loaded', async () => {
    const store = useHouseholdsStore()

    store.selectHousehold(() => ({pbsId: other!.pbsId}))

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(other!.id))
    await vi.waitFor(() => expect(store.isHouseholdsStoreReady).toBe(true))
  })

  it('a chosen household that no longer exists: toasts it, drops the choice and refreshes the households, so my household loads', async () => {
    const gone = {...other!, id: GONE_HOUSEHOLD_ID, shortName: 'gone'}
    householdIndexEndpoint.mockReturnValue([...createMockHouseholds(), gone])
    const store = await setupStore()
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    const householdListRequests = householdIndexEndpoint.mock.calls.length

    store.selectHousehold(GONE_HOUSEHOLD_ID)

    await vi.waitFor(() => expect(householdIndexEndpoint.mock.calls.length).toBeGreaterThan(householdListRequests))
    await vi.waitFor(() => expect(store.selectedHousehold?.id).toBe(mine!.id))
    expect(store.selectedHouseholdId).toBe(mine!.id)
    expect(useToast().toasts.value.at(-1)?.title).toBe(API_ERROR_WORDS.notFoundOf(HOUSEHOLD_WORDS.notFound, gone.shortName))
  })

  it('after a 404 the page\'s getter still drives the selection', async () => {
    householdIndexEndpoint.mockReturnValue([...createMockHouseholds(), {...other!, id: GONE_HOUSEHOLD_ID, shortName: 'gone'}])
    const store = await setupStore()
    householdIndexEndpoint.mockReturnValue(createMockHouseholds())
    const choice = ref<Choice>(GONE_HOUSEHOLD_ID)
    store.selectHousehold(choice)
    await vi.waitFor(() => expect(store.selectedHousehold?.id).toBe(mine!.id))

    choice.value = {pbsId: other!.pbsId}

    await vi.waitFor(() => expect(store.selectedHouseholdId).toBe(other!.id))
  })
})
