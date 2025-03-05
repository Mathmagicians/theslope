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
            useDraftStorage: () => ({
                loadDraft: () => Promise.resolve(null),
                saveDraft: vi.fn(),
                clearDraft: vi.fn()
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

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        vi.restoreAllMocks()
    })

    describe('loads seasons successfully', () => {
        const endpoint = vi.fn()

        beforeEach(() => {
            registerEndpoint('/api/admin/season', endpoint)
        })

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
        const endpoint = vi.fn()

        beforeEach(() => {
            registerEndpoint('/api/admin/season', endpoint)
        })

        it('handles empty array', async () => {
            endpoint.mockReturnValue([])
            const store = usePlanStore()
            await store.loadSeasons()
            expect(store.seasons).toEqual([])
            expect(store.isNoSeasons).toBe(true)
        })
    })

    describe('initialization', () => {
        const endpoint = vi.fn()

        beforeEach(() => {
            registerEndpoint('/api/admin/season', endpoint)
        })

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
