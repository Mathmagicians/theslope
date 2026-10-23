// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach, type MockInstance} from 'vitest'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import {toValue} from 'vue'
import AdminPage from '~/pages/admin/[tab].vue'
import AdminAllergies from '~/components/admin/AdminAllergies.vue'
import {usePlanStore} from '~/stores/plan'
import {useBookingsStore} from '~/stores/bookings'
import {useCoreValidation, type SystemRole as SystemRoleValue} from '~/composables/useCoreValidation'
import {SettingKeySchema, SETTING_REGISTRY} from '~/composables/useSettingValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {mountedStore, mountWithTooltipProvider, registerEmptyStoreEndpoints, resetStores} from '~~/tests/component/testHelpers'

// The test environment has no router to land a deep link on, and no session cookie
const {mockRoute, mockNavigateTo, useRoute, session, useUserSession} = await vi.hoisted(async () => {
    const {mockRouteAndNavigation, mockSession} = await import('~~/tests/component/hoistedMocks')
    return {...mockRouteAndNavigation({path: '/admin/teams', params: {tab: 'teams'}}), ...mockSession()}
})
mockNuxtImport('useRoute', () => useRoute)
mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useUserSession', () => useUserSession)

const SystemRole = useCoreValidation().SystemRoleSchema.enum
const userWith = (systemRoles: SystemRoleValue[]) => UserFactory.defaultUserWithInhabitant('admin-tab', {systemRoles})
const admin = userWith([SystemRole.ADMIN])
const myHouseholdId = admin.Inhabitant!.household!.id

const TEAM_ID = 11
const season = {...SeasonFactory.defaultSeason('admin-tab'), id: 1}
const otherSeason = SeasonFactory.defaultSeason('admin-tab-other')
// The stores the tabs create read their datasets; the spec's own routes register after, and the last registration answers
registerEmptyStoreEndpoints()
// The seasons never arrive: every mounted page stays behind its ready gate, so AdminTeams never mounts
registerEndpoint('/api/admin/season', () => new Promise(() => {}))
registerEndpoint('/api/admin/season/active', () => season.id)
registerEndpoint(`/api/admin/season/${season.id}`, () => season)
registerEndpoint(`/api/admin/team/${TEAM_ID}`, () => SeasonFactory.defaultCookingTeamDetail({id: TEAM_ID}))
registerEndpoint(`/api/admin/household/${myHouseholdId}`, () => ({...HouseholdFactory.defaultHouseholdDetail('admin-tab'), id: myHouseholdId}))
// The allergies tab's catalog and its notes, the notes as the endpoint answers them while no row is stored
const POSTER_NOTES = SettingKeySchema.enum['allergy-poster-notes']
registerEndpoint('/api/admin/allergy-type', () => [])
registerEndpoint(`/api/admin/setting/${POSTER_NOTES}`, () => ({key: POSTER_NOTES, value: SETTING_REGISTRY[POSTER_NOTES].defaultValue, updatedAt: null, updatedByUserId: null}))

// A mounted page left alive keeps reading the next case's route
enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
    session.user.value = admin
})

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

describe('admin/[tab] - the billing overview on the economy tab', () => {
    let loadBillingOverview: MockInstance<ReturnType<typeof useBookingsStore>['loadBillingOverview']>

    beforeEach(() => {
        loadBillingOverview = vi.spyOn(mountedStore(useBookingsStore), 'loadBillingOverview')
    })

    afterEach(() => {
        loadBillingOverview.mockRestore()
    })

    it.each([
        {tab: 'economy', requested: true},
        {tab: 'planning', requested: false}
    ])('hands the store a getter at setup that reads $requested on the $tab tab', async ({tab, requested}) => {
        mockRoute.path = `/admin/${tab}`
        mockRoute.params = {tab}
        mockRoute.query = {season: season.shortName}

        await mountWithTooltipProvider(AdminPage)

        expect(loadBillingOverview).toHaveBeenCalledTimes(1)
        expect(toValue(loadBillingOverview.mock.calls[0]![0])).toBe(requested)
    })
})

// Every member reads the allergy catalog; an admin or the allergy manager edits it
describe('admin/[tab] - who edits the allergy catalog', () => {
    beforeEach(() => {
        mockRoute.path = '/admin/allergies'
        mockRoute.params = {tab: 'allergies'}
        mockRoute.query = {}
    })

    it.each([
        {viewer: 'a member without a role', roles: [], canEdit: false},
        {viewer: 'the allergy manager', roles: [SystemRole.ALLERGYMANAGER], canEdit: true},
        {viewer: 'an admin', roles: [SystemRole.ADMIN], canEdit: true}
    ])('GIVEN $viewer THEN the catalog can edit: $canEdit', async ({roles, canEdit}) => {
        session.user.value = userWith(roles)

        const wrapper = await mountWithTooltipProvider(AdminPage)

        await vi.waitFor(() => expect(wrapper.findComponent(AdminAllergies).exists()).toBe(true))
        expect(wrapper.findComponent(AdminAllergies).props('canEdit')).toBe(canEdit)
    })
})
