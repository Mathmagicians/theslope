// @vitest-environment nuxt
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { usePlanStore } from '~/stores/plan'

describe('Plan Store', () => {
    const mockSeasons = [
        { id: 1, shortName: 'Season 1', seasonDates: '{"start":"01/01/2025","end":"31/01/2025"}', isActive: false, cookingDays: '{"mandag":true,"tirsdag":true,"onsdag":true,"torsdag":true,"fredag":false,"loerdag":false,"soendag":false}', holidays: '[]', ticketIsCancellableDaysBefore: 10, diningModeIsEditableMinutesBefore: 90 },
        { id: 2, shortName: 'Season 2', seasonDates: '{"start":"01/02/2025","end":"28/02/2025"}', isActive: false, cookingDays: '{"mandag":true,"tirsdag":true,"onsdag":true,"torsdag":true,"fredag":false,"loerdag":false,"soendag":false}', holidays: '[]', ticketIsCancellableDaysBefore: 10, diningModeIsEditableMinutesBefore: 90 }
    ]

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
                apiCall: async (action) => action()
            }),
            useSeason: () => ({
                getDefaultSeason: () => ({
                    shortName: 'Default Season',
                    seasonDates: { start: new Date(2025, 0, 1), end: new Date(2025, 0, 31) },
                    isActive: false,
                    cookingDays: { mandag: true, tirsdag: true, onsdag: true, torsdag: true, fredag: false, loerdag: false, soendag: false },
                    holidays: [],
                    ticketIsCancellableDaysBefore: 10,
                    diningModeIsEditableMinutesBefore: 90
                }),
                deserializeSeason: (data) => ({
                    ...data,
                    seasonDates: { start: new Date(2025, 0, 1), end: new Date(2025, 0, 31) },
                    cookingDays: { mandag: true, tirsdag: true, onsdag: true, torsdag: true, fredag: false, loerdag: false, soendag: false },
                    holidays: []
                }),
                serializeSeason: (season) => season,
                coalesceSeason: (draft, defaultSeason) => defaultSeason
            })
        }
    })

    const endpoint = vi.fn()

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        endpoint.mockClear()
        registerEndpoint('/api/admin/season', endpoint)
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
            expect(store.seasons[0].shortName).toBe('Season 1')
            expect(store.seasons[1].id).toBe(2)
            expect(store.seasons[1].shortName).toBe('Season 2')
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
            expect(store.error).toBeNull()
            expect(store.seasons).toEqual([])
            expect(store.draftSeason).toBeNull()
            expect(store.selectedSeason).toBeNull()
        })
    })
})