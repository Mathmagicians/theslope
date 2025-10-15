// @vitest-environment nuxt
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { SeasonFactory } from '../../e2e/testDataFactories/seasonFactory'

// IMPORTANT: Register endpoints BEFORE importing the store
// The store's module-level useFetch executes on import
const seasonIndexEndpoint = vi.fn()
const seasonByIdEndpoint = vi.fn()
registerEndpoint('/api/admin/season', seasonIndexEndpoint)
registerEndpoint('/api/admin/season/:id', seasonByIdEndpoint)

import { usePlanStore } from '~/stores/plan'

describe('Plan Store', () => {
    // Use SeasonFactory for consistent test data
    const season1 = { ...SeasonFactory.defaultSeason('1'), id: 1 }
    const season2 = { ...SeasonFactory.defaultSeason('2'), id: 2 }
    const mockSeasons = [season1, season2]

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        seasonIndexEndpoint.mockClear()
        seasonByIdEndpoint.mockClear()
        // Clear Nuxt data cache to prevent useFetch caching between tests
        clearNuxtData()
    })

    describe('loads seasons successfully', () => {
        it('returns mock seasons', async () => {
            seasonIndexEndpoint.mockReturnValue(mockSeasons)
            seasonByIdEndpoint.mockReturnValue(season1)
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
            seasonIndexEndpoint.mockReturnValue([])
            const store = usePlanStore()
            await store.loadSeasons()
            // Verify endpoint was called with empty array
            expect(seasonIndexEndpoint).toHaveBeenCalled()
            expect(seasonIndexEndpoint.mock.results[0].value).toEqual([])
            // Store should be updated to reflect empty response
            expect(store.seasons.length).toBe(0)
            expect(store.isNoSeasons).toBe(true)
        })
    })

    describe('initialization', () => {
        it('initializes without errors', () => {
            seasonIndexEndpoint.mockReturnValue([])
            const store = usePlanStore()
            expect(store.error).toBeUndefined()
            expect(store.seasons).toEqual([])
            expect(store.selectedSeason).toBeNull()
        })
    })
})