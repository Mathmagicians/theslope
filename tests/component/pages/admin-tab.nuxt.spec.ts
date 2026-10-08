// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
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
// The seasons never arrive: every mounted page stays behind its ready gate, so AdminTeams never selects
registerEndpoint('/api/admin/season', () => new Promise(() => {}))
registerEndpoint('/api/_auth/session', () => ({user: {id: 1, email: 'admin@skraaningen.dk', systemRoles: ['ADMIN']}}))
registerEndpoint('/api/admin/season/active', () => season.id)
registerEndpoint(`/api/admin/season/${season.id}`, () => season)
registerEndpoint(`/api/admin/team/${TEAM_ID}`, () => SeasonFactory.defaultCookingTeamDetail({id: TEAM_ID}))

describe('admin/[tab] - a deep link to a team', () => {
    beforeEach(() => {
        // The mounted pages share the Nuxt app's plan store, which still holds the previous case's selection
        usePlanStore().selectTeam(null)
    })

    it.each([
        {description: 'selects the team in ?team= at setup, before the season has loaded', team: String(TEAM_ID), selected: TEAM_ID},
        {description: 'selects no team for a ?team= that is not a number', team: 'hold', selected: null}
    ])('$description', async ({team, selected}) => {
        mockRoute.query = {season: season.shortName, team}

        await mountWithTooltipProvider(AdminPage)

        expect(usePlanStore().isPlanStoreReady).toBe(false)
        expect(usePlanStore().selectedTeamId).toBe(selected)
    })
})
