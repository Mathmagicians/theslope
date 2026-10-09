// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'
import { DinnerEventFactory } from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import { HouseholdFactory } from '~~/tests/e2e/testDataFactories/householdFactory'
import { asyncDataStatus, resetStores } from '~~/tests/component/testHelpers'

import { usePlanStore } from '~/stores/plan'
import { useAuthStore } from '~/stores/auth'
import { ROLE_LABELS, useCookingTeamValidation } from '~/composables/useCookingTeamValidation'
import { useCoreValidation } from '~/composables/useCoreValidation'

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
// The response leaves the allocation to the schema default, so the result shows the parse
const {allocationPercentage: _allocation, ...assignmentResponse} = assignment
const addTeamMemberEndpoint = vi.fn(() => assignmentResponse)
const removeTeamMemberEndpoint = vi.fn(() => 1)
const updatedAssignment = {...assignment, role: useCookingTeamValidation().TeamRoleSchema.enum.COOK, allocationPercentage: 50}
const updateTeamMemberEndpoint = vi.fn(() => updatedAssignment)
const createJokerSlotEndpoint = vi.fn(() => createdJokerSlot)
const deleteJokerSlotEndpoint = vi.fn(() => 1)
registerEndpoint(`/api/admin/team/assignment/${ASSIGNMENT_ID}`, { method: 'DELETE', handler: removeTeamMemberEndpoint })
registerEndpoint(`/api/admin/team/assignment/${ASSIGNMENT_ID}`, { method: 'POST', handler: updateTeamMemberEndpoint })
registerEndpoint('/api/admin/team/assignment', { method: 'PUT', handler: addTeamMemberEndpoint })
registerEndpoint(`/api/admin/team/${TEAM_ID}/joker-slot/${JOKER_SLOT_ID}`, { method: 'DELETE', handler: deleteJokerSlotEndpoint })
registerEndpoint(`/api/admin/team/${TEAM_ID}/joker-slot`, { method: 'PUT', handler: createJokerSlotEndpoint })

// Season, team and dinner writes answer with entities carrying dates: only a schema parse turns
// the JSON date strings back into the Date objects the fixtures hold
const { id: _newSeasonId, ...newSeason } = season2
const deactivateSeasonEndpoint = vi.fn(() => season1)
const teamDetail = SeasonFactory.defaultCookingTeamDetail({ id: TEAM_ID })
const updateTeamEndpoint = vi.fn(() => teamDetail)
const deleteTeamEndpoint = vi.fn(() => teamDetail)
const assignAffinitiesEndpoint = vi.fn(() => ({ seasonId: season1.id, teamCount: 1, teams: [teamDetail] }))
const assignCookingTeamsEndpoint = vi.fn(() => ({ seasonId: season1.id, eventCount: 1, events: [DinnerEventFactory.defaultDinnerEventDisplay()] }))
const dinner = { ...DinnerEventFactory.defaultDinnerEventDetail(), id: 21 }
const assignRoleEndpoint = vi.fn(() => dinner)
const removeRoleEndpoint = vi.fn(() => dinner)
const me = { ...HouseholdFactory.defaultInhabitantData('plan'), id: 31 }
registerEndpoint('/api/_auth/session', () => ({ user: { id: 1, email: 'me@example.com', systemRoles: [], Inhabitant: me } }))
const { SystemRoleSchema } = useCoreValidation()
// The role actions refresh through the users and bookings stores, whose reads start with them
const emptyReads = ['/api/team/my', `/api/admin/users/by-role/${SystemRoleSchema.enum.ALLERGYMANAGER}`, '/api/admin/users', '/api/admin/household',
    '/api/admin/billing/periods', '/api/admin/billing/current-period']
emptyReads.forEach(url => registerEndpoint(url, () => []))
registerEndpoint('/api/admin/season/deactivate', { method: 'POST', handler: deactivateSeasonEndpoint })
registerEndpoint(`/api/admin/season/${season1.id}/assign-team-affinities`, { method: 'POST', handler: assignAffinitiesEndpoint })
registerEndpoint(`/api/admin/season/${season1.id}/assign-cooking-teams`, { method: 'POST', handler: assignCookingTeamsEndpoint })
registerEndpoint(`/api/admin/team/${TEAM_ID}`, { method: 'POST', handler: updateTeamEndpoint })
registerEndpoint(`/api/admin/team/${TEAM_ID}`, { method: 'DELETE', handler: deleteTeamEndpoint })
const teamByIdEndpoint = vi.fn(() => teamDetail)
registerEndpoint(`/api/admin/team/${TEAM_ID}`, { method: 'GET', handler: teamByIdEndpoint })
const OTHER_TEAM_ID = 12
registerEndpoint(`/api/admin/team/${OTHER_TEAM_ID}`, { method: 'GET', handler: () => SeasonFactory.defaultCookingTeamDetail({ id: OTHER_TEAM_ID }) })
registerEndpoint(`/api/team/cooking/${dinner.id}/assign-role`, { method: 'POST', handler: assignRoleEndpoint })
registerEndpoint(`/api/team/cooking/${dinner.id}/remove-role`, { method: 'POST', handler: removeRoleEndpoint })

// Test helpers
const SELECTED_SEASON_KEY = 'plan-store-selected-season'
const SELECTED_TEAM_KEY = 'plan-store-selected-team'

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

    it.each([
        {choice: 'a shortName', value: season2.shortName, awaitSeasons: true},
        {choice: 'a shortName handed before the seasons load', value: season2.shortName, awaitSeasons: false},
        {choice: 'an id', value: season2.id, awaitSeasons: true}
    ])('loads the season $choice names', async ({value, awaitSeasons}) => {
        const store = usePlanStore()
        if (awaitSeasons) await store.loadSeasons()

        store.selectSeason(() => value)

        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season2.id))
    })

    it('follows the getter: the season changes when the value it reads changes', async () => {
        const store = usePlanStore()
        const shortName = ref<string | null>(season2.shortName)
        store.selectSeason(shortName)
        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season2.id))

        shortName.value = null

        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season1.id))
    })

    it('falls back to the default for a shortName no season carries', async () => {
        const store = usePlanStore()
        await store.loadSeasons()

        store.selectSeason(() => 'no-such-season')

        expect(await selectedSeasonOnceReady(store)).toBe(season1.id)
    })

    it('keeps the choice out of the pinia state: the page hands it to the server render and the client alike', () => {
        const store = usePlanStore()
        const marker = 'season-choice-marker'

        store.selectSeason(() => marker)

        expect(JSON.stringify(store.$state)).not.toContain(marker)
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

        store.selectSeason(GONE_SEASON_ID)

        await vi.waitFor(() => expect(activeSeasonIdEndpoint.mock.calls.length).toBeGreaterThan(before.active))
        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season1.id))
        expect(store.selectedSeasonId).toBe(season1.id)
        expect(seasonIndexEndpoint.mock.calls.length).toBeGreaterThan(before.seasons)
        expect(useToast().toasts.value.at(-1)?.title).toBe(`Kan ikke finde sæsonen ${goneSeason.shortName}`)
    })

    it('after a 404 the page\'s getter still drives the selection', async () => {
        seasonIndexEndpoint.mockReturnValue([...mockSeasons, goneSeason])
        const store = await setupStore()
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        const choice = ref<number | null>(GONE_SEASON_ID)
        store.selectSeason(choice)
        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season1.id))

        choice.value = season2.id

        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season2.id))
    })
})

describe('Plan Store - write actions', () => {
    const {TeamRoleSchema} = useCookingTeamValidation()
    type PlanStore = ReturnType<typeof usePlanStore>
    const asMe = async () => { await useAuthStore().fetch() }

    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)
        createSeasonEndpoint.mockImplementation(() => season2)
    })

    // `parsed` holds Date objects and schema defaults: only a schema parse of the JSON response yields it
    const writeActions = [
        {
            action: 'createSeason',
            endpoint: createSeasonEndpoint,
            write: (store: PlanStore) => store.createSeason(newSeason),
            parsed: season2,
            refreshes: 'the seasons',
            refreshed: seasonIndexEndpoint,
            toast: {title: 'Sæson oprettet'}
        },
        {
            action: 'activateSeason',
            endpoint: activateSeasonEndpoint,
            write: (store: PlanStore) => store.activateSeason(season2.id),
            parsed: season2,
            refreshes: 'the active season id',
            refreshed: activeSeasonIdEndpoint,
            toast: null
        },
        {
            action: 'deactivateSeason',
            endpoint: deactivateSeasonEndpoint,
            write: (store: PlanStore) => store.deactivateSeason(),
            parsed: season1,
            refreshes: 'the active season id',
            refreshed: activeSeasonIdEndpoint,
            toast: null
        },
        {
            action: 'assignTeamAffinitiesAndEvents',
            endpoint: assignCookingTeamsEndpoint,
            write: (store: PlanStore) => store.assignTeamAffinitiesAndEvents(season1.id),
            parsed: {teamCount: 1, eventCount: 1},
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: null
        },
        {
            action: 'updateTeam (affinity)',
            endpoint: updateTeamEndpoint,
            write: (store: PlanStore) => store.updateTeam({id: TEAM_ID, affinity: jokerSlot.affinity}),
            parsed: teamDetail,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: {title: 'Madlavningsdage for teams opdateret'}
        },
        {
            action: 'updateTeam (name)',
            endpoint: updateTeamEndpoint,
            write: (store: PlanStore) => store.updateTeam({id: TEAM_ID, name: teamDetail.name}),
            parsed: teamDetail,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: null
        },
        {
            action: 'deleteTeam',
            endpoint: deleteTeamEndpoint,
            write: (store: PlanStore) => store.deleteTeam(TEAM_ID),
            parsed: teamDetail,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: {title: 'Madhold slettet'}
        },
        {
            action: 'addTeamMember',
            endpoint: addTeamMemberEndpoint,
            write: (store: PlanStore) => store.addTeamMember({
                cookingTeamId: TEAM_ID, inhabitantId: assignment.inhabitantId, role: assignment.role, allocationPercentage: 100
            }),
            parsed: assignment,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: {title: 'Medlem tilføjet til hold', description: `${assignment.inhabitant.name} ${assignment.inhabitant.lastName}`}
        },
        {
            action: 'updateTeamMember',
            endpoint: updateTeamMemberEndpoint,
            write: (store: PlanStore) => store.updateTeamMember(ASSIGNMENT_ID, {role: updatedAssignment.role, allocationPercentage: 50}),
            parsed: updatedAssignment,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: {title: 'Medlem opdateret', description: `${assignment.inhabitant.name} ${assignment.inhabitant.lastName}`}
        },
        {
            action: 'removeTeamMember',
            endpoint: removeTeamMemberEndpoint,
            write: (store: PlanStore) => store.removeTeamMember(ASSIGNMENT_ID),
            parsed: 1,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: {title: 'Medlem fjernet fra hold'}
        },
        {
            action: 'createJokerSlot',
            endpoint: createJokerSlotEndpoint,
            write: (store: PlanStore) => store.createJokerSlot(TEAM_ID, jokerSlot),
            parsed: createdJokerSlot,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: {title: 'Joker tilføjet', description: ROLE_LABELS[jokerSlot.role]}
        },
        {
            action: 'deleteJokerSlot',
            endpoint: deleteJokerSlotEndpoint,
            write: (store: PlanStore) => store.deleteJokerSlot(TEAM_ID, JOKER_SLOT_ID),
            parsed: 1,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: {title: 'Joker fjernet'}
        },
        {
            action: 'assignRoleToDinner',
            endpoint: assignRoleEndpoint,
            write: (store: PlanStore) => store.assignRoleToDinner(dinner.id, me.id, TeamRoleSchema.enum.CHEF),
            parsed: dinner,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: null
        },
        {
            action: 'claimRoleForMe',
            endpoint: assignRoleEndpoint,
            write: async (store: PlanStore) => { await asMe(); return store.claimRoleForMe(dinner, TeamRoleSchema.enum.CHEF) },
            parsed: dinner,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: {title: useCookingTeam().formatRoleClaimedTitle(dinner, TeamRoleSchema.enum.CHEF)}
        },
        {
            action: 'resignRoleForMe',
            endpoint: removeRoleEndpoint,
            write: async (store: PlanStore) => { await asMe(); return store.resignRoleForMe(dinner, TeamRoleSchema.enum.CHEF) },
            parsed: dinner,
            refreshes: 'the selected season',
            refreshed: seasonByIdEndpoint,
            toast: {title: 'Du har meldt afbud. Tjansen som chefkok er nu ledig.'}
        }
    ]

    it.each(writeActions)('$action returns the parsed response, refreshes $refreshes and reports its result in at most one success toast', async ({endpoint, write, parsed, refreshed, toast}) => {
        const store = await setupStore()
        await vi.waitFor(() => expect(store.selectedSeason?.id).toBe(season1.id))
        const refreshesBefore = refreshed.mock.calls.length
        useToast().clear()

        const result = await write(store)

        expect(endpoint).toHaveBeenCalledTimes(1)
        expect(result).toEqual(parsed)
        expect(refreshed.mock.calls.length).toBeGreaterThan(refreshesBefore)
        expect(useToast().toasts.value).toEqual(toast ? [expect.objectContaining({...toast, icon: ICONS.checkCircle, color: COLOR.success})] : [])
    })

    it('assignTeamAffinitiesAndEvents rejects an envelope its schema refuses', async () => {
        assignAffinitiesEndpoint.mockReturnValueOnce({seasonId: season1.id, teamCount: 1, teams: [{id: TEAM_ID}]} as never)
        const store = await setupStore()

        await expect(store.assignTeamAffinitiesAndEvents(season1.id)).rejects.toThrow()
    })

    const TEAM_WRITES = ['updateTeam (affinity)', 'updateTeam (name)', 'addTeamMember', 'updateTeamMember', 'removeTeamMember', 'createJokerSlot', 'deleteJokerSlot']

    it.each(writeActions.filter(({action}) => TEAM_WRITES.includes(action)))('$action refreshes the selected team', async ({write}) => {
        const store = await setupStore()
        store.selectTeam(TEAM_ID)
        await vi.waitFor(() => expect(store.selectedTeam?.id).toBe(TEAM_ID))
        const refreshesBefore = teamByIdEndpoint.mock.calls.length

        await write(store)

        expect(teamByIdEndpoint.mock.calls.length).toBeGreaterThan(refreshesBefore)
    })

    it('deleteTeam deselects the deleted team, so its dataset reads idle without a request, and keeps following the page\'s choice', async () => {
        const store = await setupStore()
        const teamId = ref<number | null>(TEAM_ID)
        store.selectTeam(teamId)
        await vi.waitFor(() => expect(store.selectedTeam?.id).toBe(TEAM_ID))
        const refreshesBefore = teamByIdEndpoint.mock.calls.length

        await store.deleteTeam(TEAM_ID)

        expect(store.selectedTeamId).toBeNull()
        expect(store.selectedTeam).toBeNull()
        expect(asyncDataStatus(SELECTED_TEAM_KEY)).toBe('idle')
        expect(teamByIdEndpoint.mock.calls.length).toBe(refreshesBefore)

        teamId.value = OTHER_TEAM_ID

        await vi.waitFor(() => expect(store.selectedTeamId).toBe(OTHER_TEAM_ID))
    })
})

describe('Plan Store - selected team', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        seasonIndexEndpoint.mockReturnValue(mockSeasons)
        seasonByIdEndpoint.mockReturnValue(season1)
        activeSeasonIdEndpoint.mockReturnValue(season1.id)
    })

    const idleTeam = (store: ReturnType<typeof usePlanStore>) => ({
        status: asyncDataStatus(SELECTED_TEAM_KEY),
        selectedTeam: store.selectedTeam,
        isSelectedTeamLoading: store.isSelectedTeamLoading,
        isSelectedTeamErrored: store.isSelectedTeamErrored
    })
    const IDLE = {status: 'idle', selectedTeam: null, isSelectedTeamLoading: false, isSelectedTeamErrored: false}

    it('stays idle and unrequested with no team selected, and the store is ready', async () => {
        const store = await setupStore()
        await vi.waitFor(() => expect(store.isPlanStoreReady).toBe(true))

        expect(teamByIdEndpoint).not.toHaveBeenCalled()
        expect(idleTeam(store)).toEqual(IDLE)
    })

    it('selecting a team loads its Detail', async () => {
        const store = await setupStore()

        store.selectTeam(TEAM_ID)

        await vi.waitFor(() => expect(asyncDataStatus(SELECTED_TEAM_KEY)).toBe('success'))
        expect(store.selectedTeamId).toBe(TEAM_ID)
        expect(store.selectedTeam).toEqual(teamDetail)
        expect(store.isSelectedTeamLoading).toBe(false)
    })

    it('follows the getter: a cleared value reads idle with the default', async () => {
        const store = await setupStore()
        const teamId = ref<number | null>(TEAM_ID)
        store.selectTeam(teamId)
        await vi.waitFor(() => expect(store.selectedTeam?.id).toBe(TEAM_ID))

        teamId.value = null

        await vi.waitFor(() => expect(idleTeam(store)).toEqual(IDLE))
        expect(teamByIdEndpoint).toHaveBeenCalledTimes(1)
    })
})
