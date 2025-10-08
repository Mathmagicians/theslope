// @vitest-environment nuxt
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { SeasonFactory } from '../../e2e/testDataFactories/seasonFactory'
import { createDefaultWeekdayMap } from '~/utils/date'

// IMPORTANT: Register endpoint BEFORE importing the store
// The store's module-level useFetch executes on import
const endpoint = vi.fn()
registerEndpoint('/api/admin/season', endpoint)

import { usePlanStore } from '~/stores/plan'

describe('Plan Store', () => {
    // Use SeasonFactory for consistent test data
    const season1 = { ...SeasonFactory.defaultSeason('1').serializedSeason, id: 1 }
    const season2 = { ...SeasonFactory.defaultSeason('2').serializedSeason, id: 2 }
    const mockSeasons = [season1, season2]

    vi.mock('#imports', () => {
        const actualPinia = vi.requireActual('pinia')
        return {
            defineStore: actualPinia.defineStore,
            ref: (x) => ({
                value: x
            }),
            watch: vi.fn(),
            computed: (fn) => fn(),
            useApiHandler: () => ({
                handleApiError: vi.fn()
            }),
            useSeason: () => ({
                getDefaultSeason: () => ({
                    shortName: 'Default Season',
                    seasonDates: { start: new Date(2025, 0, 1), end: new Date(2025, 0, 31) },
                    isActive: false,
                    cookingDays: createDefaultWeekdayMap([true, true, true, true, false, false, false]),
                    holidays: [],
                    ticketIsCancellableDaysBefore: 10,
                    diningModeIsEditableMinutesBefore: 90
                }),
                deserializeSeason: (data) => ({
                    ...data,
                    seasonDates: { start: new Date(2025, 0, 1), end: new Date(2025, 0, 31) },
                    cookingDays: createDefaultWeekdayMap([true, true, true, true, false, false, false]),
                    holidays: []
                }),
                serializeSeason: (season) => season,
                coalesceSeason: (draft, defaultSeason) => defaultSeason
            })
        }
    })

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        endpoint.mockClear()
        // Clear Nuxt data cache to prevent useFetch caching between tests
        clearNuxtData()
    })

    describe('loads seasons successfully', () => {
        it('returns mock seasons', async () => {
            endpoint.mockReturnValue(mockSeasons)
            const store = usePlanStore()
            await store.loadSeasons()
            // Check that seasons were loaded by checking their IDs and shortNames
            expect(store.seasons.length).toBe(2)
            expect(store.seasons[0].id).toBe(1)
            expect(store.seasons[0].shortName).toBe('TestSeason-1')
            expect(store.seasons[1].id).toBe(2)
            expect(store.seasons[1].shortName).toBe('TestSeason-2')
        })
    })

    describe('handles empty server response', () => {
        it('handles empty array', async () => {
            endpoint.mockReturnValue([])
            const store = usePlanStore()
            await store.loadSeasons()
            // Verify endpoint was called with empty array
            expect(endpoint).toHaveBeenCalled()
            expect(endpoint.mock.results[0].value).toEqual([])
            // Store should be updated to reflect empty response
            expect(store.seasons.length).toBe(0)
            expect(store.isNoSeasons).toBe(true)
        })
    })

    describe('initialization', () => {
        it('initializes without errors', () => {
            endpoint.mockReturnValue([])
            const store = usePlanStore()
            expect(store.error).toBeUndefined()
            expect(store.seasons).toEqual([])
            expect(store.selectedSeason).toBeNull()
        })
    })
})