// @vitest-environment nuxt
import { setActivePinia, createPinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'

import { usePlanStore } from '~/stores/plan'

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

registerEndpoint('/api/admin/season/active', activeSeasonIdEndpoint)
registerEndpoint('/api/admin/season/1', seasonByIdEndpoint)
registerEndpoint('/api/admin/season/2', seasonByIdEndpoint)
registerEndpoint('/api/admin/season', seasonIndexEndpoint)

// Team creation returns the operation result envelope (ADR-009)
const createdTeams = [
    { ...SeasonFactory.defaultCookingTeamDetail(), id: 11, name: 'Hold 1' },
    { ...SeasonFactory.defaultCookingTeamDetail(), id: 12, name: 'Hold 2' }
]
const createTeamsEndpoint = vi.fn(() => ({ teams: createdTeams, eventsAssigned: 6 }))
registerEndpoint('/api/admin/team', { method: 'PUT', handler: createTeamsEndpoint })

// Test helpers
const setupStore = async (initStore = false, shortName?: string) => {
    const store = usePlanStore()
    await store.loadSeasons()
    if (initStore) store.initPlanStore(shortName)
    return store
}

describe('Plan Store - Basic Initialization', () => {
    beforeAll(() => {
        setActivePinia(createPinia())
    })

    beforeEach(() => {
        vi.clearAllMocks()
        seasonIndexEndpoint.mockClear()
        seasonByIdEndpoint.mockClear()
        activeSeasonIdEndpoint.mockClear()

        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)
    })

    it('initializes with 2 seasons', async () => {
        const store = await setupStore()

        expect(store.isSeasonsInitialized).toBe(true)
        expect(store.seasons).toHaveLength(2)
    })
    

    it('exposes seasons error when fetch fails', async () => {
        seasonIndexEndpoint.mockImplementation(() => {
            throw createError({
                statusCode: 500,
                statusMessage: 'Network error'
            })
        })

        const store = usePlanStore()

        // Manually call loadSeasons to trigger error
        await expect(store.loadSeasons()).rejects.toThrow()

        expect(store.isSeasonsErrored).toBe(true)
        expect(store.seasonsError).toBeTruthy()
        expect(store.seasonsError?.statusCode).toBe(500)
    })

    it.each([
        { data: [], expected: true, description: 'empty array' },
        { data: mockSeasons, expected: false, description: 'with data' }
    ])('isNoSeasons detects $description', async ({ data, expected }) => {
        seasonIndexEndpoint.mockReturnValue(data)

        const store = await setupStore()

        expect(store.isNoSeasons).toBe(expected)
        expect(store.seasons).toHaveLength(data.length)
    })
})

describe('Plan Store - Team creation', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
        vi.clearAllMocks()
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)
        createTeamsEndpoint.mockReturnValue({ teams: createdTeams, eventsAssigned: 6 })
    })

    it('createTeam returns the {teams, eventsAssigned} envelope', async () => {
        const store = await setupStore()

        const result = await store.createTeam([
            { seasonId: 1, name: 'Hold 1' },
            { seasonId: 1, name: 'Hold 2' }
        ])

        expect(result.teams.map(team => team.id)).toEqual([11, 12])
        expect(result.eventsAssigned).toBe(6)
    })
})
