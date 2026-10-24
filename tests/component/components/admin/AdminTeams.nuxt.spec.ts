// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, onTestFinished} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {nextTick, ref} from 'vue'
import {mountWithTooltipProvider, clickByTestId, findAllByTestId, findByTestId, pollFor, resetStores, VIEWPORTS, holdEndpoint, findLoadingRow, expectMasterDetail} from '~~/tests/component/testHelpers'
import AdminTeams from '~/components/admin/AdminTeams.vue'
import TeamCalendarDisplay from '~/components/calendar/TeamCalendarDisplay.vue'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {usePlanStore} from '~/stores/plan'
import {useAuthStore} from '~/stores/auth'
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {COMPONENTS, getRainbowBand, getRainbowAccent, createResponsiveIcons} from '~/composables/useTheSlopeDesignSystem'

// The test environment has no router to navigate: useEntityFormManager and useQueryParam
// write the URL state through navigateTo (ADR-006 / ADR-008)
const {mockNavigateTo, mockRoute, landNavigation, useRoute} = await vi.hoisted(async () =>
    (await import('~~/tests/component/hoistedMocks')).mockRouteAndNavigation())
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => useRoute)

// Only HTTP is faked (testing.md Rule 6) - specific routes first, generic last
const season = {...SeasonFactory.defaultSeason('teams'), id: 1, CookingTeams: [] as CookingTeamDisplay[]}
const createdTeams = [
    {...SeasonFactory.defaultCookingTeamDetail(), id: 11, name: 'Hold 1'},
    {...SeasonFactory.defaultCookingTeamDetail(), id: 12, name: 'Hold 2'}
]
const createTeamsEndpoint = vi.fn(() => ({teams: createdTeams, eventsAssigned: 6}))
registerEndpoint('/api/_auth/session', () => ({user: {id: 1, email: 'admin@skraaningen.dk', systemRoles: [useCoreValidation().SystemRoleSchema.enum.ADMIN]}}))
registerEndpoint('/api/admin/season/active', () => 1)
const seasonByIdEndpoint = vi.fn(() => season)
registerEndpoint('/api/admin/season/1', seasonByIdEndpoint)
registerEndpoint('/api/admin/season', () => [season])
registerEndpoint('/api/admin/team', {method: 'PUT', handler: createTeamsEndpoint})

vi.setConfig({testTimeout: 20_000})
// The next test's resetStores drops the datasets a still-mounted table reads
enableAutoUnmount(afterEach)

const mountTeams = async (isMd = true) => {
    await useAuthStore().fetch()
    const store = usePlanStore()
    await store.loadSeasons()
    await pollFor(() => store.isPlanStoreReady, 40, false)

    const wrapper = await mountWithTooltipProvider(AdminTeams, {props: {canEdit: true}, isMd})
    await flushPromises()
    await nextTick()
    return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountTeams>>

const openCreateMode = async (wrapper: Wrapper) => {
    await clickByTestId(wrapper, 'create-team')
    await flushPromises()
}

const clickCreateTeams = async (wrapper: Wrapper) => {
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
        resetStores()
        vi.clearAllMocks()
        createTeamsEndpoint.mockReturnValue({teams: createdTeams, eventsAssigned: 6})
        seasonByIdEndpoint.mockReturnValue(season)
        useToast().clear()
    })

    it('reports created teams and assigned dinners in the toast and leaves create mode', async () => {
        const wrapper = await mountTeams()
        await openCreateMode(wrapper)

        expect(wrapper.find('#team-count').exists()).toBe(true)
        await wrapper.find('#team-count').setValue(2)
        await nextTick()

        await clickCreateTeams(wrapper)

        const toast = await lastToast()
        expect(toast?.title).toBe('Madhold oprettet')
        expect(toast?.description).toBe('2 madhold oprettet · 6 madlavninger tildelt')
        await vi.waitFor(() => expect(wrapper.find('#team-count').exists()).toBe(false))
    })

    // The store's apiRequest toasts the failure; an error the save leaves unhandled reaches Nuxt's root as vue:error
    it('GIVEN the create endpoint fails WHEN the admin saves the new teams THEN the form stays in create mode and the save raises no unhandled error', async () => {
        createTeamsEndpoint.mockImplementation(() => {
            throw createError({statusCode: 500})
        })
        const vueError = vi.fn()
        onTestFinished(useNuxtApp().hook('vue:error', vueError))
        const wrapper = await mountTeams()
        await openCreateMode(wrapper)

        await clickCreateTeams(wrapper)
        await lastToast()
        // The rethrow travels from the store's catch to the click handler after the toast
        await flushPromises()

        expect(wrapper.find('#team-count').exists()).toBe(true)
        expect(vueError).not.toHaveBeenCalled()
    })
})

describe('AdminTeams master table', () => {
    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
    })

    it('shows the joker badge in the row of a team that holds joker slots, none in a team without, and the columns bind their tokens', async () => {
        const withJokers = SeasonFactory.defaultCookingTeamDisplay({id: 21, name: 'Hold 1', jokerSlotCount: 2})
        const withoutJokers = SeasonFactory.defaultCookingTeamDisplay({id: 22, name: 'Hold 2', jokerSlotCount: 0})
        seasonByIdEndpoint.mockReturnValue({...season, CookingTeams: [withJokers, withoutJokers]})

        const wrapper = await mountTeams()

        expect(wrapper.find(`[data-testid="team-row-${withJokers.id}"] [data-testid="team-badge-jokers"]`).exists()).toBe(true)
        expect(wrapper.find(`[data-testid="team-row-${withoutJokers.id}"] [data-testid="team-badge-jokers"]`).exists()).toBe(false)

        // The Madhold column takes the row's slack, so the badges stay on one line while the weekdays fit their letters
        const columns = wrapper.findComponent({name: 'UTable'}).props('columns') as Array<{header?: string, meta?: {class?: unknown}}>
        expect(columns.find(column => column.header === 'Madhold')?.meta?.class).toEqual(COMPONENTS.masterDetail.primaryColumn)
        expect(columns.find(column => column.header === 'Madlavningsdage')?.meta?.class).toEqual(COMPONENTS.masterDetail.compactColumn)
    })

    // A season without teams that reloads shows the loading row, not the empty state, until the season answers
    it('GIVEN a season without teams WHEN it reloads THEN the loading row stands where the empty state was, until the season lands', async () => {
        seasonByIdEndpoint.mockReturnValue(season)
        const wrapper = await mountTeams()
        expect(wrapper.find('[data-testid="teams-empty-state"]').exists()).toBe(true)
        const held = holdEndpoint('/api/admin/season/1', season)

        try {
            void usePlanStore().selectedSeasonDataset.refresh()

            await vi.waitFor(() => expect(findLoadingRow(wrapper).text()).toContain('Henter madhold...'))
            expect(wrapper.find('[data-testid="teams-empty-state"]').exists()).toBe(false)

            held.release()

            await vi.waitFor(() => expect(wrapper.find('[data-testid="teams-empty-state"]').exists()).toBe(true))
        } finally {
            held.release()
            held.unregister()
        }
    })
})

describe('AdminTeams team selection', () => {
    const team = SeasonFactory.defaultCookingTeamDisplay({id: 31, name: 'Hold 1'})
    registerEndpoint(`/api/admin/team/${team.id}`, () => SeasonFactory.defaultCookingTeamDetail({id: team.id, name: team.name}))

    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        seasonByIdEndpoint.mockReturnValue({...season, CookingTeams: [team]})
        mockNavigateTo.mockImplementation(landNavigation)
    })

    afterEach(() => {
        mockNavigateTo.mockReset()
        mockRoute.query = {}
    })

    // The page hands the store a getter over ?team=; the component writes the URL only
    it('opening a row writes its team to ?team=, and closing it clears the param', async () => {
        const wrapper = await mountTeams()

        await clickByTestId(wrapper, `team-row-${team.id}`)
        await vi.waitFor(() => expect(mockRoute.query.team).toBe(String(team.id)))

        await clickByTestId(wrapper, `team-row-${team.id}`)
        await vi.waitFor(() => expect(mockRoute.query.team).toBeUndefined())
    })

    // The master table stays in the master slot; the detail slot beside it swaps between the overview and the open team
    it.each([
        {state: 'no team open: the all-teams calendar', open: false, holds: (detail: Element, wrapper: Wrapper) => detail.contains(wrapper.findComponent(TeamCalendarDisplay).element)},
        {state: 'a team open: the framed team detail', open: true, holds: (detail: Element, wrapper: Wrapper) => detail.contains(findByTestId(wrapper, 'edit-team').element)}
    ])('md, $state stands in the detail slot beside the master table', async ({open, holds}) => {
        const wrapper = await mountTeams(true)
        if (open) {
            await clickByTestId(wrapper, `team-row-${team.id}`)
            await vi.waitFor(() => expect(findAllByTestId(wrapper, 'edit-team')).toHaveLength(1))
        }

        // UTable renders more than one root, so its wrapper's element is the one holding it: the master
        const master = wrapper.findComponent({name: 'UTable'}).element
        expectMasterDetail(master, master.nextElementSibling)
        expect(holds(master.nextElementSibling!, wrapper)).toBe(true)
    })

    describe.each(VIEWPORTS)('$viewport: an open row', ({isMd}) => {
        const openTeam = async () => {
            const wrapper = await mountTeams(isMd)
            await clickByTestId(wrapper, `team-row-${team.id}`)
            await vi.waitFor(() => expect(mockRoute.query.team).toBe(String(team.id)))
            await flushPromises()
            return wrapper
        }

        it(`turns its toggle to the open-detail chevron of its viewport and renders its detail once, ${isMd ? 'in the pane beside the table' : 'docked in the table row'}`, async () => {
            const wrapper = await openTeam()
            const toggle = wrapper.findAllComponents({name: 'UButton'})
                .find(button => button.attributes('data-testid') === `team-toggle-${team.id}`)
            expect(toggle?.props('icon')).toBe(createResponsiveIcons(ref(isMd)).detailOpen)

            await vi.waitFor(() => expect(findAllByTestId(wrapper, 'edit-team')).toHaveLength(1))
            expect(wrapper.find('tbody [data-testid="edit-team"]').exists()).toBe(!isMd)
        })
    })
})

// A team's number is the one in its name, else its position in the season's teams; a row's badges and its
// selection accent wear the rainbow stop of that number, whatever order the season lists the teams in
describe('AdminTeams team colours', () => {
    const seasonTeams = [
        SeasonFactory.defaultCookingTeamDisplay({id: 41, name: 'Madhold 3 - S1'}),
        SeasonFactory.defaultCookingTeamDisplay({id: 42, name: 'Holdet uden tal'}),
        SeasonFactory.defaultCookingTeamDisplay({id: 43, name: 'Madhold 1 - S1'})
    ]
    // Madhold 3 takes its number from its name, the unnumbered team from its position; Madhold 1 only fills the third position
    const numbered = seasonTeams.slice(0, 2).map((team, position) => ({id: team.id!, name: team.name, number: [3, 2][position]!}))
    seasonTeams.forEach(team =>
        registerEndpoint(`/api/admin/team/${team.id}`, () => SeasonFactory.defaultCookingTeamDetail({id: team.id, name: team.name})))

    beforeEach(() => {
        resetStores()
        vi.clearAllMocks()
        seasonByIdEndpoint.mockReturnValue({...season, CookingTeams: seasonTeams})
        mockNavigateTo.mockImplementation(landNavigation)
    })

    afterEach(() => {
        mockNavigateTo.mockReset()
        mockRoute.query = {}
    })

    it.each(numbered)('the row of "$name" wears the stop of number $number, and selecting it accents the row with that stop', async ({id, number}) => {
        const wrapper = await mountTeams()
        const badge = wrapper.find(`[data-testid="team-row-${id}"] [data-testid="team-badge-name"]`)
        expect(badge.classes()).toEqual(expect.arrayContaining(getRainbowBand(number - 1).split(' ')))

        await clickByTestId(wrapper, `team-row-${id}`)
        await vi.waitFor(() => expect(wrapper.find(`[data-testid="team-row-${id}"]`).classes())
            .toEqual(expect.arrayContaining(getRainbowAccent(number - 1).split(' '))))
    })
})
