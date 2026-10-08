// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { asyncDataStatus, resetStores } from '~~/tests/component/testHelpers'

import { usePlanStore } from '~/stores/plan'
import { ROLE_LABELS } from '~/composables/useCookingTeamValidation'

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
const activeSeasonIdEndpoint = vi.fn((): number | null => season1.id)

registerEndpoint('/api/admin/season/active', activeSeasonIdEndpoint)
registerEndpoint('/api/admin/season/1', seasonByIdEndpoint)
registerEndpoint('/api/admin/season/2', () => season2)
const GONE_SEASON_ID = 3
registerEndpoint(`/api/admin/season/${GONE_SEASON_ID}`, () => {
    throw createError({statusCode: 404})
})
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

// Team aggregate writes: a create returns the created entity, a delete the deleted count (ADR-009)
const TEAM_ID = 11
const ASSIGNMENT_ID = 7
const JOKER_SLOT_ID = 5
const assignment = SeasonFactory.defaultCookingTeamAssignment({id: ASSIGNMENT_ID, cookingTeamId: TEAM_ID})
const jokerSlot = SeasonFactory.defaultJokerSlot()
const createdJokerSlot = {...jokerSlot, id: JOKER_SLOT_ID, cookingTeamId: TEAM_ID, note: null, createdAt: new Date(), updatedAt: new Date()}
const addTeamMemberEndpoint = vi.fn(() => assignment)
const removeTeamMemberEndpoint = vi.fn(() => 1)
const createJokerSlotEndpoint = vi.fn(() => createdJokerSlot)
const deleteJokerSlotEndpoint = vi.fn(() => 1)
registerEndpoint(`/api/admin/team/assignment/${ASSIGNMENT_ID}`, { method: 'DELETE', handler: removeTeamMemberEndpoint })
registerEndpoint('/api/admin/team/assignment', { method: 'PUT', handler: addTeamMemberEndpoint })
registerEndpoint(`/api/admin/team/${TEAM_ID}/joker-slot/${JOKER_SLOT_ID}`, { method: 'DELETE', handler: deleteJokerSlotEndpoint })
registerEndpoint(`/api/admin/team/${TEAM_ID}/joker-slot`, { method: 'PUT', handler: createJokerSlotEndpoint })

// Test helpers
const SELECTED_SEASON_KEY = 'plan-store-selected-season'

const setupStore = async () => {
    const store = usePlanStore()
    await store.loadSeasons()
    return store
}

describe('Plan Store - Basic Initialization', () => {
    beforeEach(() => {
        resetStores()
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
        resetStores()
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
        resetStores()
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

describe('Plan Store - gated selected season', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)
    })

    it('stays idle and unrequested with no season to select, and the store is ready', async () => {
        seasonIndexEndpoint.mockReturnValue([])
        activeSeasonIdEndpoint.mockReturnValue(null)

        const store = await setupStore()
        await vi.waitFor(() => expect(store.isActiveSeasonIdInitialized).toBe(true))

        expect(seasonByIdEndpoint).not.toHaveBeenCalled()
        expect(asyncDataStatus(SELECTED_SEASON_KEY)).toBe('idle')
        expect({
            isSelectedSeasonLoading: store.isSelectedSeasonLoading,
            isSelectedSeasonErrored: store.isSelectedSeasonErrored,
            isPlanStoreReady: store.isPlanStoreReady
        }).toEqual({isSelectedSeasonLoading: false, isSelectedSeasonErrored: false, isPlanStoreReady: true})
    })

    it('fetches the selected season once one is selected, and the store is ready', async () => {
        seasonIndexEndpoint.mockReturnValue(mockSeasons)

        const store = await setupStore()

        await vi.waitFor(() => expect(store.isPlanStoreReady).toBe(true))
        expect(asyncDataStatus(SELECTED_SEASON_KEY)).toBe('success')
        expect(seasonByIdEndpoint).toHaveBeenCalled()
        expect(store.selectedSeason?.id).toBe(season1.id)
    })
})

describe('Plan Store - season selection', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)
    })

    const selectedSeasonOnceReady = async (store: ReturnType<typeof usePlanStore>) => {
        await vi.waitFor(() => expect(store.isPlanStoreReady).toBe(true))
        return store.selectedSeason?.id
    }

    it.each([
        {rule: 'the active season', activeId: season1.id, expected: season1.id},
        {rule: 'the first sorted season without an active one', activeId: null, expected: season1.id}
    ])('selects $rule by default once seasons and the active id resolve', async ({activeId, expected}) => {
        activeSeasonIdEndpoint.mockReturnValue(activeId)

        const store = usePlanStore()

        expect(await selectedSeasonOnceReady(store)).toBe(expected)
    })

    it('a user choice wins over the default', async () => {
        const store = usePlanStore()
        await selectedSeasonOnceReady(store)

        store.onSeasonSelect(season2.id)

        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season2.id))
    })

    it.each([
        {when: 'after the seasons have loaded', awaitSeasons: true},
        {when: 'before the seasons have loaded', awaitSeasons: false}
    ])('selects the season a shortName names, requested $when', async ({awaitSeasons}) => {
        const store = usePlanStore()
        if (awaitSeasons) await store.loadSeasons()

        store.loadSeasonByShortName(season2.shortName)

        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season2.id))
    })

    it('falls back to the default for a shortName no season carries', async () => {
        const store = usePlanStore()
        await store.loadSeasons()

        store.loadSeasonByShortName('no-such-season')

        expect(await selectedSeasonOnceReady(store)).toBe(season1.id)
    })
})

describe('Plan Store - a selected season that no longer exists', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)
    })

    const goneSeason = {...SeasonFactory.defaultSeason('gone'), id: GONE_SEASON_ID}

    it('toasts the season, drops the choice and refreshes the seasons and the active season id, so the default season loads', async () => {
        seasonIndexEndpoint.mockReturnValue([...mockSeasons, goneSeason])
        const store = await setupStore()
        await vi.waitFor(() => expect(asyncDataStatus(SELECTED_SEASON_KEY)).toBe('success'))
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        const before = {seasons: seasonIndexEndpoint.mock.calls.length, active: activeSeasonIdEndpoint.mock.calls.length}

        store.onSeasonSelect(GONE_SEASON_ID)

        await vi.waitFor(() => expect(activeSeasonIdEndpoint.mock.calls.length).toBeGreaterThan(before.active))
        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season1.id))
        expect(store.selectedSeasonId).toBe(season1.id)
        expect(seasonIndexEndpoint.mock.calls.length).toBeGreaterThan(before.seasons)
        expect(useToast().toasts.value.at(-1)?.title).toBe(`Kan ikke finde sæsonen ${goneSeason.shortName}`)
    })
})

describe('Plan Store - Team members and joker slots', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)
    })

    // Dates in `parsed` are Date objects: only a schema parse turns the JSON strings back into dates
    it.each([
        {
            action: 'addTeamMember',
            endpoint: addTeamMemberEndpoint,
            write: (store: ReturnType<typeof usePlanStore>) => store.addTeamMember({
                cookingTeamId: TEAM_ID, inhabitantId: assignment.inhabitantId, role: assignment.role, allocationPercentage: 100
            }),
            parsed: assignment,
            toast: {title: 'Medlem tilføjet til hold', description: `${assignment.inhabitant.name} ${assignment.inhabitant.lastName}`}
        },
        {
            action: 'removeTeamMember',
            endpoint: removeTeamMemberEndpoint,
            write: (store: ReturnType<typeof usePlanStore>) => store.removeTeamMember(ASSIGNMENT_ID),
            parsed: 1,
            toast: {title: 'Medlem fjernet fra hold'}
        },
        {
            action: 'createJokerSlot',
            endpoint: createJokerSlotEndpoint,
            write: (store: ReturnType<typeof usePlanStore>) => store.createJokerSlot(TEAM_ID, jokerSlot),
            parsed: createdJokerSlot,
            toast: {title: 'Joker tilføjet', description: ROLE_LABELS[jokerSlot.role]}
        },
        {
            action: 'deleteJokerSlot',
            endpoint: deleteJokerSlotEndpoint,
            write: (store: ReturnType<typeof usePlanStore>) => store.deleteJokerSlot(TEAM_ID, JOKER_SLOT_ID),
            parsed: 1,
            toast: {title: 'Joker fjernet'}
        }
    ])('$action returns the parsed response, refreshes the selected season and toasts once', async ({endpoint, write, parsed, toast}) => {
        useToast().clear()
        const store = await setupStore()
        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season1.id))
        const seasonFetchesBefore = seasonByIdEndpoint.mock.calls.length

        const result = await write(store)

        expect(endpoint).toHaveBeenCalledTimes(1)
        expect(result).toEqual(parsed)
        expect(seasonByIdEndpoint.mock.calls.length).toBeGreaterThan(seasonFetchesBefore)
        expect(useToast().toasts.value).toHaveLength(1)
        expect(useToast().toasts.value[0]).toMatchObject(toast)
    })
})
