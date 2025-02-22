// @vitest-environment nuxt
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { usePlanStore } from '~/stores/plan'

describe('Plan Store', () => {
    const mockSeasons = [
        { id: 1, shortName: 'Season 1' },
        { id: 2, shortName: 'Season 2' }
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
            expect(store.seasons).toEqual(mockSeasons)
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
