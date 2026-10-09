// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, type MockInstance} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {toValue} from 'vue'
import AdminPage from '~/pages/admin/[tab].vue'
import {usePlanStore} from '~/stores/plan'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {mountWithTooltipProvider} from '~~/tests/component/testHelpers'

// The test environment has no router to land a deep link on
const {mockRoute} = await vi.hoisted(async () => {
    const {reactive} = await import('vue')
    return {mockRoute: reactive({path: '/admin/teams', params: {tab: 'teams'}, query: {} as Record<string, string>, hash: ''})}
})
mockNuxtImport('useRoute', () => () => mockRoute)
mockNuxtImport('navigateTo', () => vi.fn())

const TEAM_ID = 11
const season = {...SeasonFactory.defaultSeason('admin-tab'), id: 1}
const otherSeason = SeasonFactory.defaultSeason('admin-tab-other')
// The seasons never arrive: every mounted page stays behind its ready gate, so AdminTeams never mounts
registerEndpoint('/api/admin/season', () => new Promise(() => {}))
registerEndpoint('/api/_auth/session', () => ({user: {id: 1, email: 'admin@skraaningen.dk', systemRoles: ['ADMIN']}}))
registerEndpoint('/api/admin/season/active', () => season.id)
registerEndpoint(`/api/admin/season/${season.id}`, () => season)
registerEndpoint(`/api/admin/team/${TEAM_ID}`, () => SeasonFactory.defaultCookingTeamDetail({id: TEAM_ID}))

describe('admin/[tab] - a deep link to a team', () => {
    it.each([
        {description: 'selects the team in ?team= at setup, before the season has loaded', team: String(TEAM_ID), selected: TEAM_ID},
        {description: 'selects no team for a ?team= that is not a number', team: 'hold', selected: null}
    ])('$description', async ({team, selected}) => {
        mockRoute.query = {season: season.shortName, team}

        await mountWithTooltipProvider(AdminPage)

        expect(usePlanStore().isPlanStoreReady).toBe(false)
        expect(usePlanStore().selectedTeamId).toBe(selected)
    })

    it('deselects the team when ?team= is cleared', async () => {
        mockRoute.query = {season: season.shortName, team: String(TEAM_ID)}
        await mountWithTooltipProvider(AdminPage)
        expect(usePlanStore().selectedTeamId).toBe(TEAM_ID)

        mockRoute.query = {season: season.shortName}

        expect(usePlanStore().selectedTeamId).toBeNull()
    })
})

describe('admin/[tab] - the season in ?season=', () => {
    let selectSeason: MockInstance<ReturnType<typeof usePlanStore>['selectSeason']>

    beforeEach(() => {
        selectSeason = vi.spyOn(usePlanStore(), 'selectSeason')
    })

    afterEach(() => {
        selectSeason.mockRestore()
    })

    it('hands the store the URL\'s season once at setup, and the store follows the URL with no further setter call', async () => {
        mockRoute.query = {season: season.shortName}

        await mountWithTooltipProvider(AdminPage)

        expect(selectSeason).toHaveBeenCalledTimes(1)
        const choice = selectSeason.mock.calls[0]![0]
        expect(toValue(choice)).toBe(season.shortName)

        mockRoute.query = {season: otherSeason.shortName}

        expect(toValue(choice)).toBe(otherSeason.shortName)
        expect(selectSeason).toHaveBeenCalledTimes(1)
    })
})
