// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
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
import {FORM_MODES} from '~/types/form'

// The test environment has no router to navigate: useEntityFormManager and useQueryParam
// write the URL state through navigateTo (ADR-006 / ADR-008)
const {mockNavigateTo} = vi.hoisted(() => ({mockNavigateTo: vi.fn()}))
mockNuxtImport('navigateTo', () => mockNavigateTo)

// Only HTTP is faked (testing.md Rule 6) - specific routes first, generic last
const season = {...SeasonFactory.defaultSeason('teams'), id: 1, CookingTeams: []}
const createdTeams = [
    {...SeasonFactory.defaultCookingTeamDetail(), id: 11, name: 'Hold 1'},
    {...SeasonFactory.defaultCookingTeamDetail(), id: 12, name: 'Hold 2'}
]
const createTeamsEndpoint = vi.fn(() => ({teams: createdTeams, eventsAssigned: 6}))
registerEndpoint('/api/_auth/session', () => ({user: {id: 1, email: 'admin@skraaningen.dk', systemRoles: ['ADMIN']}}))
registerEndpoint('/api/admin/season/active', () => 1)
registerEndpoint('/api/admin/season/1', () => season)
registerEndpoint('/api/admin/season', () => [season])
registerEndpoint('/api/admin/team', {method: 'PUT', handler: createTeamsEndpoint})

vi.setConfig({testTimeout: 20_000})

const mountTeams = async () => {
    await useAuthStore().fetch()
    const store = usePlanStore()
    await store.loadSeasons()
    store.initPlanStore()
    await pollFor(() => store.isPlanStoreReady, 40, false)

    const wrapper = await mountWithTooltipProvider(AdminTeams, {props: {canEdit: true}, isMd: true})
    await flushPromises()
    await nextTick()
    return wrapper
}

const clickCreateTeams = async (wrapper: Awaited<ReturnType<typeof mountTeams>>) => {
    const button = wrapper.findAll('button').find(candidate => candidate.text().includes('Opret madhold'))
    await button!.trigger('click')
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
        useToast().clear()
    })

    it('reports created teams and assigned dinners in the toast', async () => {
        const wrapper = await mountTeams()
        await clickByTestId(wrapper, `form-mode-${FORM_MODES.CREATE}`)
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
