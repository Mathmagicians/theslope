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

// Method-specific registrations come after the generic ones above (reverse-order lookup)
const seasonUpdate = SeasonFactory.defaultSeasonUpdateResponse(season1, {reconciliation: {created: 3, idempotent: 5, deleted: 1}})
const updateSeasonEndpoint = vi.fn(() => seasonUpdate)
const createSeasonEndpoint = vi.fn(() => season2)
const activateSeasonEndpoint = vi.fn(() => season2)
registerEndpoint('/api/admin/season/1', { method: 'POST', handler: updateSeasonEndpoint })
registerEndpoint('/api/admin/season', { method: 'PUT', handler: createSeasonEndpoint })
registerEndpoint('/api/admin/season/active', { method: 'POST', handler: activateSeasonEndpoint })

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

    it('createTeam reports the created teams and assigned dinners in a toast', async () => {
        useToast().clear()
        const store = await setupStore()

        await store.createTeam([{ seasonId: 1, name: 'Hold 1' }, { seasonId: 1, name: 'Hold 2' }])

        expect(useToast().toasts.value.at(-1)).toMatchObject({
            title: 'Madhold oprettet',
            description: '2 madhold oprettet · 6 madlavninger tildelt'
        })
    })
})

describe('Plan Store - Season save and activation', () => {
    const failure = () => {
        throw createError({statusCode: 500})
    }

    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
        vi.clearAllMocks()
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)
        updateSeasonEndpoint.mockImplementation(() => seasonUpdate)
        createSeasonEndpoint.mockImplementation(() => season2)
    })

    it('updateSeason returns the SeasonUpdateResponse envelope and reloads the seasons', async () => {
        const store = await setupStore()
        const seasonFetchesBefore = seasonIndexEndpoint.mock.calls.length

        const result = await store.updateSeason(season1)

        expect(result?.reconciliation).toEqual(seasonUpdate.reconciliation)
        expect(seasonIndexEndpoint.mock.calls.length).toBeGreaterThan(seasonFetchesBefore)
        expect(store.isSavingSeasonFlowInProgress).toBe(false)
    })

    it('createSeason returns the season and reloads the seasons', async () => {
        const store = await setupStore()
        const seasonFetchesBefore = seasonIndexEndpoint.mock.calls.length

        expect(await store.createSeason(season2)).toEqual(season2)
        expect(seasonIndexEndpoint.mock.calls.length).toBeGreaterThan(seasonFetchesBefore)
    })

    it.each([
        {action: 'updateSeason', endpoint: updateSeasonEndpoint, save: (store: ReturnType<typeof usePlanStore>) => store.updateSeason(season1)},
        {action: 'createSeason', endpoint: createSeasonEndpoint, save: (store: ReturnType<typeof usePlanStore>) => store.createSeason(season2)}
    ])('$action resolves null when the save fails', async ({endpoint, save}) => {
        endpoint.mockImplementation(failure)
        const store = await setupStore()

        expect(await save(store)).toBeNull()
        expect(store.isSavingSeasonFlowInProgress).toBe(false)
    })

    it.each([
        {
            action: 'createSeason',
            save: (store: ReturnType<typeof usePlanStore>) => store.createSeason(season2),
            title: 'Sæson oprettet',
            description: undefined
        },
        {
            action: 'updateSeason',
            save: (store: ReturnType<typeof usePlanStore>) => store.updateSeason(season1),
            title: 'Sæson opdateret',
            description: '3 datoer tilføjet, 1 fjernet. Husk at tildele madhold til nye datoer.'
        }
    ])('$action reports the save in a toast', async ({save, title, description}) => {
        useToast().clear()
        const store = await setupStore()

        await save(store)

        expect(useToast().toasts.value.at(-1)).toMatchObject({title, description})
    })

    it('a failed save shows no success toast', async () => {
        useToast().clear()
        updateSeasonEndpoint.mockImplementation(failure)
        const store = await setupStore()

        await store.updateSeason(season1)

        expect(useToast().toasts.value.map(toast => toast.title)).not.toContain('Sæson opdateret')
    })

    it('activateSeason posts the season and reloads the active season', async () => {
        const store = await setupStore()
        const activeFetchesBefore = activeSeasonIdEndpoint.mock.calls.length

        await store.activateSeason(season2.id!)

        expect(activateSeasonEndpoint).toHaveBeenCalledTimes(1)
        expect(activeSeasonIdEndpoint.mock.calls.length).toBeGreaterThan(activeFetchesBefore)
        expect(store.isActivatingSeasonFlowInProgress).toBe(false)
    })
})
