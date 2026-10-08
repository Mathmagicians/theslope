// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {flushPromises} from '@vue/test-utils'
import {clearNuxtData} from '#app'
import {nextTick} from 'vue'
import {mountWithTooltipProvider, clickByTestId, pollFor} from '~~/tests/component/testHelpers'
import AdminTeams from '~/components/admin/AdminTeams.vue'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {usePlanStore} from '~/stores/plan'
import {useAuthStore} from '~/stores/auth'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'

// The test environment has no router to navigate: useEntityFormManager and useQueryParam
// write the URL state through navigateTo (ADR-006 / ADR-008)
const {mockNavigateTo, mockRoute} = await vi.hoisted(async () => {
    const {reactive} = await import('vue')
    return {
        mockNavigateTo: vi.fn(),
        mockRoute: reactive({path: '/', query: {} as Record<string, string>, params: {}, hash: ''})
    }
})
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => () => mockRoute)
// The mocked navigation lands on the mocked route, as the router does
const landNavigation = async ({path, query}: {path: string, query: Record<string, string>}) => {
    mockRoute.path = path
    mockRoute.query = query
}

// Only HTTP is faked (testing.md Rule 6) - specific routes first, generic last
const season = {...SeasonFactory.defaultSeason('teams'), id: 1, CookingTeams: [] as CookingTeamDisplay[]}
const createdTeams = [
    {...SeasonFactory.defaultCookingTeamDetail(), id: 11, name: 'Hold 1'},
    {...SeasonFactory.defaultCookingTeamDetail(), id: 12, name: 'Hold 2'}
]
const createTeamsEndpoint = vi.fn(() => ({teams: createdTeams, eventsAssigned: 6}))
registerEndpoint('/api/_auth/session', () => ({user: {id: 1, email: 'admin@skraaningen.dk', systemRoles: ['ADMIN']}}))
registerEndpoint('/api/admin/season/active', () => 1)
const seasonByIdEndpoint = vi.fn(() => season)
registerEndpoint('/api/admin/season/1', seasonByIdEndpoint)
registerEndpoint('/api/admin/season', () => [season])
registerEndpoint('/api/admin/team', {method: 'PUT', handler: createTeamsEndpoint})

vi.setConfig({testTimeout: 20_000})

const mountTeams = async () => {
    await useAuthStore().fetch()
    const store = usePlanStore()
    await store.loadSeasons()
    await pollFor(() => store.isPlanStoreReady, 40, false)

    const wrapper = await mountWithTooltipProvider(AdminTeams, {props: {canEdit: true}, isMd: true})
    await flushPromises()
    await nextTick()
    return wrapper
}

const clickCreateTeams = async (wrapper: Awaited<ReturnType<typeof mountTeams>>) => {
    await clickByTestId(wrapper, 'submit-create-teams')
    await flushPromises()
    await nextTick()
}

// The toast lands after the store's PUT and the season refresh have resolved;
// flushPromises advances one timer round per call, nextTick alone does not
const lastToast = async () => {
    const {toasts} = useToast()
    for (let attempt = 0; attempt < 20 && toasts.value.length === 0; attempt++) {
        await flushPromises()
    }
    return toasts.value.at(-1)
}

describe('AdminTeams', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
        vi.clearAllMocks()
        createTeamsEndpoint.mockReturnValue({teams: createdTeams, eventsAssigned: 6})
        seasonByIdEndpoint.mockReturnValue(season)
        useToast().clear()
    })

    it('reports created teams and assigned dinners in the toast', async () => {
        const wrapper = await mountTeams()
        await clickByTestId(wrapper, 'create-team')
        await flushPromises()

        expect(wrapper.find('#team-count').exists()).toBe(true)
        await wrapper.find('#team-count').setValue(2)
        await nextTick()

        await clickCreateTeams(wrapper)

        const toast = await lastToast()
        expect(toast?.title).toBe('Madhold oprettet')
        expect(toast?.description).toBe('2 madhold oprettet · 6 madlavninger tildelt')
    })
})

describe('AdminTeams master table', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
        vi.clearAllMocks()
    })

    it('shows the joker badge in the row of a team that holds joker slots, and none in a team without', async () => {
        const withJokers = SeasonFactory.defaultCookingTeamDisplay({id: 21, name: 'Hold 1', jokerSlotCount: 2})
        const withoutJokers = SeasonFactory.defaultCookingTeamDisplay({id: 22, name: 'Hold 2', jokerSlotCount: 0})
        seasonByIdEndpoint.mockReturnValue({...season, CookingTeams: [withJokers, withoutJokers]})

        const wrapper = await mountTeams()

        expect(wrapper.find(`[data-testid="team-row-${withJokers.id}"] [data-testid="team-badge-jokers"]`).exists()).toBe(true)
        expect(wrapper.find(`[data-testid="team-row-${withoutJokers.id}"] [data-testid="team-badge-jokers"]`).exists()).toBe(false)
    })
})

describe('AdminTeams team selection', () => {
    const team = SeasonFactory.defaultCookingTeamDisplay({id: 31, name: 'Hold 1'})
    registerEndpoint(`/api/admin/team/${team.id}`, () => SeasonFactory.defaultCookingTeamDetail({id: team.id, name: team.name}))

    beforeEach(() => {
        setActivePinia(createPinia())
        clearNuxtData()
        vi.clearAllMocks()
        seasonByIdEndpoint.mockReturnValue({...season, CookingTeams: [team]})
        mockNavigateTo.mockImplementation(landNavigation)
    })

    afterEach(() => {
        mockNavigateTo.mockReset()
        mockRoute.query = {}
    })

    it('opening a row selects its team in the store, and closing it deselects', async () => {
        const wrapper = await mountTeams()
        const store = usePlanStore()

        await clickByTestId(wrapper, `team-row-${team.id}`)
        await vi.waitFor(() => expect(store.selectedTeamId).toBe(team.id))

        await clickByTestId(wrapper, `team-row-${team.id}`)
        await vi.waitFor(() => expect(store.selectedTeamId).toBeNull())
    })
})
