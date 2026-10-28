// @vitest-environment nuxt
import {describe, it, expect, vi, beforeAll, beforeEach, afterEach} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount, flushPromises} from '@vue/test-utils'
import {nextTick} from 'vue'
import ChefPage from '~/pages/chef/index.vue'
import {usePlanStore} from '~/stores/plan'
import {useCookingTeam} from '~/composables/useCookingTeam'
import {useCookingTeamValidation, type CookingTeamDetail, type CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay} from '~/composables/useBookingValidation'
import type {Season} from '~/composables/useSeasonValidation'
import {TEAM_WORDS} from '~/config/teamWords'
import {formatDate} from '~/utils/date'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {findAllByTestId, findByTestId, mountWithTooltipProvider, registerEmptyStoreEndpoints, resetStores} from '~~/tests/component/testHelpers'

// The test environment has no router to land a deep link on, and no session cookie
const {mockRoute, mockNavigateTo, landNavigation, useRoute, session, useUserSession} = await vi.hoisted(async () => {
    const {mockRouteAndNavigation, mockSession} = await import('~~/tests/component/hoistedMocks')
    return {...mockRouteAndNavigation({path: '/chef'}), ...mockSession()}
})
mockNuxtImport('useRoute', () => useRoute)
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useUserSession', () => useUserSession)

const TEST_IDS = {
    teamSelector: 'my-team-selector',
    visitBadge: 'my-team-visit-badge',
    roleStatus: 'team-role-status',
    calendar: 'chef-calendar-header'
} as const

const me = UserFactory.defaultUserWithInhabitant('chef-page')
const SEASON_ID = 1
const teamOne = SeasonFactory.defaultCookingTeamDisplay({id: 21, seasonId: SEASON_ID, name: 'Madhold 1 - chef-page'})
const teamTwo = SeasonFactory.defaultCookingTeamDisplay({id: 22, seasonId: SEASON_ID, name: 'Madhold 2 - chef-page'})
const dinnerOf = (id: number, daysFromToday: number, team: CookingTeamDisplay | null): DinnerEventDisplay =>
    ({...DinnerEventFactory.dinnerEventAt(id, daysFromToday), seasonId: SEASON_ID, cookingTeamId: team?.id ?? null})

// Tomorrow's dinner has no team; team two cooks the season's next dinner of a team, team one the one after it
const pastDinner = dinnerOf(31, -3, teamOne)
const dinnerWithoutTeam = dinnerOf(32, 1, null)
const teamTwosNextDinner = dinnerOf(33, 2, teamTwo)
const teamOnesNextDinner = dinnerOf(34, 5, teamOne)
const dinners = [pastDinner, dinnerWithoutTeam, teamTwosNextDinner, teamOnesNextDinner]
const seasonOf = (dinnerEvents: DinnerEventDisplay[]): Season =>
    ({...SeasonFactory.defaultSeason('chef-page'), id: SEASON_ID, isActive: true, CookingTeams: [teamOne, teamTwo], dinnerEvents})
const seasonAhead = seasonOf(dinners)
const seasonPast = seasonOf([pastDinner, dinnerOf(35, -1, teamTwo)])

const teamDetailOf = (team: CookingTeamDisplay, assignments: CookingTeamDetail['assignments'] = []): CookingTeamDetail =>
    SeasonFactory.defaultCookingTeamDetail({...team, assignments, dinnerEvents: dinners.filter(d => d.cookingTeamId === team.id)})
const myTeamOne = teamDetailOf(teamOne, [SeasonFactory.defaultCookingTeamAssignment({
    cookingTeamId: teamOne.id,
    inhabitantId: me.Inhabitant!.id,
    role: useCookingTeamValidation().TeamRoleSchema.enum.COOK
})])

// The stores the page creates read their datasets; the spec's own routes register after, and the last registration answers
registerEmptyStoreEndpoints()
registerEndpoint('/api/order/waitlist', () => [])
const myHouseholdId = me.Inhabitant!.household!.id
registerEndpoint(`/api/admin/household/${myHouseholdId}`, () => ({...HouseholdFactory.defaultHouseholdDetail('chef-page'), id: myHouseholdId}))
;[teamOne, teamTwo].forEach(team => registerEndpoint(`/api/admin/team/${team.id}`, () => teamDetailOf(team)))
// The dinner's detail never arrives: the cases read the master panel, not the menu card
dinners.forEach(dinner => registerEndpoint(`/api/admin/dinner-event/${dinner.id}`, () => new Promise(() => {})))

// A mounted page left alive keeps reading the next case's route
enableAutoUnmount(afterEach)

let unregister: (() => void)[] = []
const land = (season: Season | null, myTeams: CookingTeamDetail[], query: Record<string, string | undefined>) => {
    unregister = [
        registerEndpoint('/api/admin/season/active', () => season?.id ?? null),
        registerEndpoint('/api/admin/season', () => season ? [season] : []),
        registerEndpoint(`/api/admin/season/${SEASON_ID}`, () => season),
        registerEndpoint('/api/team/my', () => myTeams)
    ]
    mockRoute.query = query
    return mountWithTooltipProvider(ChefPage, {isMd: true})
}

let getTeamShortName: ReturnType<typeof useCookingTeam>['getTeamShortName']
beforeAll(() => {
    ({getTeamShortName} = useCookingTeam())
})

beforeEach(() => {
    resetStores()
    session.user.value = me
    mockNavigateTo.mockImplementation(landNavigation)
})

afterEach(() => {
    unregister.forEach(off => off())
    mockNavigateTo.mockReset()
})

/**
 * The team on view: an explicit ?team=, else the person's first team, else a visit to the team of the season's next
 * dinner of a team. ?date= follows with that team's next dinner.
 */
describe('chef/index - the team on view', () => {
    it.each([
        {
            description: 'a person on no team visits the team of the season\'s next dinner, past the dinner without a team',
            myTeams: [], query: {}, team: teamTwo, dinner: teamTwosNextDinner, visiting: true
        },
        {
            description: 'a person on a team opens their own team',
            myTeams: [myTeamOne], query: {}, team: teamOne, dinner: teamOnesNextDinner, visiting: false
        },
        {
            description: 'an explicit ?team= wins over the next dinner\'s team for a person on no team',
            myTeams: [], query: {team: String(teamOne.id)}, team: teamOne, dinner: teamOnesNextDinner, visiting: true
        }
    ])('$description', async ({myTeams, query, team, dinner, visiting}) => {
        const wrapper = await land(seasonAhead, myTeams, query)

        await vi.waitFor(() => expect(mockRoute.query).toMatchObject({team: String(team.id), date: formatDate(dinner.date)}))
        await vi.waitFor(() => expect(findByTestId(wrapper, TEST_IDS.calendar).exists(), 'the chef calendar renders').toBe(true))

        const tabs = findByTestId(wrapper, TEST_IDS.teamSelector).findAll('[role="tab"]')
        expect(tabs, 'one tab, the team on view').toHaveLength(1)
        expect(tabs[0]!.text()).toContain(getTeamShortName(team.name))
        expect(findAllByTestId(wrapper, TEST_IDS.visitBadge), 'the tab is marked as a visit').toHaveLength(visiting ? 1 : 0)
        expect(findByTestId(wrapper, TEST_IDS.roleStatus).text().includes(TEAM_WORDS.visit.line(getTeamShortName(team.name))),
            'the visitor line').toBe(visiting)
        expect(wrapper.text()).not.toContain('Ingen madhold')
    })
})

// With nothing ahead to visit, a person on no team reads the empty state alone, and the key stays off the URL
describe('chef/index - a person on no team with no dinner ahead', () => {
    it.each([
        {description: 'a season whose dinners are past', season: seasonPast},
        {description: 'no season', season: null}
    ])('$description: "Ingen madhold" alone and no team on view', async ({season}) => {
        const wrapper = await land(season, [], {})

        await vi.waitFor(() => expect(usePlanStore().isPlanStoreReady).toBe(true))
        await flushPromises()
        await nextTick()

        expect(wrapper.findAllComponents({name: 'UAlert'}).map(alert => alert.text()),
            'the master\'s empty state is the one alert: the calendar slot names no team')
            .toEqual([expect.stringContaining('Ingen madhold')])
        expect(findAllByTestId(wrapper, TEST_IDS.visitBadge)).toHaveLength(0)
        expect(findByTestId(wrapper, TEST_IDS.calendar).exists()).toBe(false)
        expect(mockRoute.query.team).toBeUndefined()
        expect(usePlanStore().selectedTeamId).toBeNull()
    })
})
