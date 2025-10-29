// @vitest-environment nuxt
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { SeasonFactory } from '../../e2e/testDataFactories/seasonFactory'

// IMPORTANT: Register endpoints BEFORE importing the store
// The store's module-level useFetch executes on import
// Order matters: specific endpoints FIRST, generic endpoints LAST

// Prepare default mock data before store import
const season1 = { ...SeasonFactory.defaultSeason('1'), id: 1 }
const season2 = { ...SeasonFactory.defaultSeason('2'), id: 2 }
const mockSeasons = [season1, season2]

// Register with default return values for auto-loading store
const seasonIndexEndpoint = vi.fn(() => mockSeasons)
const seasonByIdEndpoint = vi.fn(() => season1)
const activeSeasonIdEndpoint = vi.fn(() => season1.id)

registerEndpoint('/api/admin/season/activeId', activeSeasonIdEndpoint)
registerEndpoint('/api/admin/season/1', seasonByIdEndpoint)
registerEndpoint('/api/admin/season/2', seasonByIdEndpoint)
registerEndpoint('/api/admin/season', seasonIndexEndpoint)

import { usePlanStore } from '~/stores/plan'

describe('Plan Store', () => {
    // ========================================
    // Test Helpers
    // ========================================
    const setupMocks = (seasons = mockSeasons, seasonDetail = season1) => {
        seasonIndexEndpoint.mockReturnValue(seasons)
        seasonByIdEndpoint.mockReturnValue(seasonDetail)
        activeSeasonIdEndpoint.mockReturnValue(seasons.length > 0 ? seasons[0].id : undefined)
    }

    beforeEach(async () => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        seasonIndexEndpoint.mockClear()
        seasonByIdEndpoint.mockClear()
        activeSeasonIdEndpoint.mockClear()

        // Reset mock return values to defaults for next test
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)

        clearNuxtData()
    })

    it('it should only initialize once, even when init called multiple times', async () => {
        setupMocks()
        const store = usePlanStore()

        expect(store.isSeasonsInitialized).toBe(false)
        await store.initPlanStore()
        expect(store.isSeasonsInitialized).toBe(true)
        expect(seasonIndexEndpoint).toHaveBeenCalledTimes(1)

        await store.initPlanStore()
        await store.initPlanStore()

        expect(seasonIndexEndpoint).toHaveBeenCalledTimes(1)
        expect(store.seasons.length).toBe(2)
    })

    it('should expose correct state after successful fetch', async () => {
        setupMocks()
        const store = usePlanStore()

        await store.loadSeasons()

        expect(store.isSeasonsLoading).toBe(false)
        expect(store.isSeasonsErrored).toBe(false)
        expect(store.isNoSeasons).toBe(false)
        expect(store.seasonsError).toBeUndefined()
    })

    it.each([
        { data: [], isNoSeasons: true, description: 'empty array' },
        { data: mockSeasons, isNoSeasons: false, description: 'with data' }
    ])('should detect empty state: $description', async ({ data, isNoSeasons }) => {
        seasonIndexEndpoint.mockReturnValue(data)
        const store = usePlanStore()

        await store.loadSeasons()

        expect(store.isNoSeasons).toBe(isNoSeasons)
    })

    it('should detect error state', async () => {
        seasonIndexEndpoint.mockImplementation(() => {
            throw createError({
                statusCode: 500,
                statusMessage: 'Network error'
            })
        })
        const store = usePlanStore()

        // With SSR pattern, errors propagate up - component/page handles display
        await expect(store.loadSeasons()).rejects.toThrow()

        expect(store.isSeasonsErrored).toBe(true)
        expect(store.seasonsError).toBeTruthy()
    })

    it('should expose correct state after successful season load', async () => {
        setupMocks()
        const store = usePlanStore()

        await store.initPlanStore()  // Loads list + auto-selects first season

        expect(store.isSelectedSeasonLoading).toBe(false)
        expect(store.isSelectedSeasonErrored).toBe(false)
        expect(store.isSelectedSeasonInitialized).toBe(true)
        expect(store.selectedSeasonError).toBeUndefined()
        expect(store.selectedSeason?.id).toBe(1)
        expect(store.selectedSeason?.shortName).toBe('TestSeason-1')
    })

    it('should update selectedSeason when selecting different seasons', async () => {
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        const store = usePlanStore()

        await store.loadSeasons()
        seasonByIdEndpoint.mockClear()

        seasonByIdEndpoint.mockReturnValue(season2)
        await store.onSeasonSelect(2)

        expect(seasonByIdEndpoint).toHaveBeenCalledTimes(1)
        expect(store.selectedSeason?.id).toBe(2)
        expect(store.selectedSeason?.shortName).toBe('TestSeason-2')
    })

    it('should detect error state when season load fails', async () => {
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockImplementation(() => {
            throw createError({
                statusCode: 500,
                statusMessage: 'Server error'
            })
        })
        const store = usePlanStore()

        // With SSR pattern, errors propagate up - component/page handles display
        await expect(store.initPlanStore()).rejects.toThrow()

        expect(store.isSelectedSeasonErrored).toBe(true)
        expect(store.selectedSeasonError).toBeTruthy()
        expect(store.selectedSeasonError?.statusCode).toBe(500)
    })

    describe('initPlanStore behavior', () => {
        it('should skip list re-fetch when shortName parameter is provided', async () => {
            setupMocks()
            const store = usePlanStore()

            // First call - should fetch list
            expect(store.isSeasonsInitialized).toBe(false)
            await store.initPlanStore()
            expect(store.isSeasonsInitialized).toBe(true)
            expect(seasonIndexEndpoint).toHaveBeenCalledTimes(1)

            // Second call with shortName - should skip list fetch AND skip detail re-fetch (already selected)
            await store.initPlanStore('TestSeason-1')
            expect(seasonIndexEndpoint).toHaveBeenCalledTimes(1)  // Still 1, not 2
            expect(seasonByIdEndpoint).toHaveBeenCalledTimes(1) // Only once from first call (season already selected)
            expect(store.selectedSeason?.shortName).toBe('TestSeason-1')
        })

        it('should auto-select first season when no shortName provided', async () => {
            setupMocks()
            const store = usePlanStore()

            await store.initPlanStore()  // No shortName parameter

            expect(seasonByIdEndpoint).toHaveBeenCalledTimes(1)
            expect(store.selectedSeason?.id).toBe(1)
            expect(store.selectedSeason?.shortName).toBe('TestSeason-1')
        })

        it.each([
            { seasons: [], description: 'empty seasons', expectError: false },
            { seasons: mockSeasons, description: 'with seasons', expectError: false }
        ])('should handle $description during init without shortName', async ({ seasons, expectError }) => {
            setupMocks(seasons, season1)
            const store = usePlanStore()

            if (expectError) {
                await expect(store.initPlanStore()).rejects.toThrow()
            } else {
                await store.initPlanStore()
                expect(store.isNoSeasons).toBe(seasons.length === 0)
                if (seasons.length > 0) {
                    expect(store.selectedSeason?.id).toBe(1)
                } else {
                    expect(store.selectedSeason).toBeUndefined()
                }
            }
        })

        it('should throw 404 when season shortName not found', async () => {
            setupMocks()
            const store = usePlanStore()

            await expect(
                store.initPlanStore('NonExistentSeason')
            ).rejects.toThrow()

            // Should still have initialized the list
            expect(store.isSeasonsInitialized).toBe(true)
            expect(store.seasons.length).toBe(2)
        })

        it('should load specific season when shortName matches', async () => {
            setupMocks(mockSeasons, season2)
            const store = usePlanStore()

            await store.initPlanStore('TestSeason-2')

            expect(store.selectedSeason?.id).toBe(2)
            expect(store.selectedSeason?.shortName).toBe('TestSeason-2')
        })
    })
})