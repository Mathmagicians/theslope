// @vitest-environment nuxt
/**
 * UserProfileCard - the member's card: the role badges and the household link of the user it shows, and for the
 * owner the header actions, the ⚙ toggle that reveals the settings card the parent renders and Log ud; for an admin the
 * role manager, where a role Heynabo owns stays read-only.
 *
 * Real component tree, real stores; only HTTP and the session are faked.
 * The toggle and Log ud belong to the current user's own card, so the spec drives `authStore.user`.
 */
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {nextTick} from 'vue'
import {flushPromises, enableAutoUnmount} from '@vue/test-utils'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import UserProfileCard from '~/components/user/UserProfileCard.vue'
import {mountWithTooltipProvider, findByTestId, clickByTestId, itemAt, resetStores, registerEmptyStoreEndpoints} from '~~/tests/component/testHelpers'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {useCoreValidation, type UserDetail} from '~/composables/useCoreValidation'
import {ROLE_OWNERSHIP, RoleOwner} from '~/composables/useUserRoles'
import {getHouseholdUrl} from '~/utils/household'
import {USER_WORDS} from '~/config/userWords'
import {BUTTON_WORDS} from '~/config/buttonWords'
import {PREF_TEST_IDS} from './userPreferencesTestIds'

const SystemRole = useCoreValidation().SystemRoleSchema.enum

/** The header's own actions; the ⚙ is `PREF_TEST_IDS.toggle`, next to the card it opens */
const PROFILE_TEST_IDS = {
    logout: 'logout-button',
    heynaboProfile: 'heynabo-profile-link',
    editRoles: 'edit-roles-btn'
} as const

// The test runtime has no session cookie and no /api/_auth endpoint, so the session nuxt-auth-utils
// would hydrate is the one thing faked; the auth store reading it is real.
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

// The users store fetches on creation (role manager data)
registerEmptyStoreEndpoints()

// The next test's resetStores drops the datasets a still-mounted card reads
enableAutoUnmount(afterEach)

const me = UserFactory.defaultUserWithInhabitant('profile-me', {id: 1})
const someoneElse = UserFactory.defaultUserWithInhabitant('profile-other', {id: 2})

const mountCard = async (props: Record<string, unknown>, sessionUser: UserDetail | null = me) => {
    session.user.value = sessionUser
    const wrapper = await mountWithTooltipProvider(UserProfileCard, {props})
    await flushPromises()
    await nextTick()
    return wrapper
}

beforeEach(() => {
    resetStores()
    vi.clearAllMocks()
})

describe('UserProfileCard - header actions', () => {
    it.each([
        {desc: 'the current user with actions', user: me, showActions: true, visible: true},
        {desc: 'another user with actions', user: someoneElse, showActions: true, visible: false},
        {desc: 'the current user without actions', user: me, showActions: false, visible: false}
    ])('GIVEN $desc THEN the toggle and Log ud are rendered=$visible', async ({user, showActions, visible}) => {
        const wrapper = await mountCard({user, showActions})

        expect(findByTestId(wrapper, PREF_TEST_IDS.toggle).exists()).toBe(visible)
        expect(findByTestId(wrapper, PROFILE_TEST_IDS.logout).exists()).toBe(visible)
    })

    it('GIVEN the toggle, the wheel alone named "Indstillinger" for assistive tech, WHEN it is clicked THEN the card asks its parent to toggle the settings', async () => {
        const wrapper = await mountCard({user: me, showActions: true})
        const toggle = findByTestId(wrapper, PREF_TEST_IDS.toggle)
        expect(toggle.text()).toBe('')
        expect(toggle.attributes('aria-label')).toBe(USER_WORDS.profile.settings)

        await toggle.trigger('click')
        await nextTick()

        expect(wrapper.emitted('toggle-preferences')).toHaveLength(1)
    })

    it.each([
        {preferencesOpen: false, expanded: 'false'},
        {preferencesOpen: true, expanded: 'true'}
    ])('GIVEN preferencesOpen=$preferencesOpen THEN the ⚙ opens a panel and reports aria-expanded=$expanded', async ({preferencesOpen, expanded}) => {
        const wrapper = await mountCard({user: me, showActions: true, preferencesOpen})

        expect(findByTestId(wrapper, PREF_TEST_IDS.toggle).attributes('aria-expanded')).toBe(expanded)
    })
})

describe('UserProfileCard - role badges', () => {
    it.each([
        {
            scenario: 'display badges for known roles',
            roles: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER],
            shouldInclude: [USER_WORDS.roles[SystemRole.ADMIN], USER_WORDS.roles[SystemRole.ALLERGYMANAGER]],
            shouldExclude: []
        },
        {
            scenario: 'not display badges for unknown roles',
            roles: ['UNKNOWN_ROLE'],
            shouldInclude: [],
            shouldExclude: ['UNKNOWN_ROLE']
        }
    ])('should $scenario', async ({roles, shouldInclude, shouldExclude}) => {
        // Set after the factory, which parses the user: the session may hold a role the catalog no longer knows
        const user = {...UserFactory.defaultUserWithInhabitant('profile-roles'), systemRoles: roles}

        const wrapper = await mountCard({user})

        const text = wrapper.text()
        shouldInclude.forEach(label => expect(text).toContain(label))
        shouldExclude.forEach(label => expect(text).not.toContain(label))
    })
})

describe('UserProfileCard - links', () => {
    it('GIVEN a user with a household THEN the card links the household and the Heynabo profile under the Heynabo name', async () => {
        const wrapper = await mountCard({user: me})
        const household = me.Inhabitant?.household
        if (!household?.shortName) throw new Error('The factory user has no household')

        expect(wrapper.find(`a[href="${getHouseholdUrl(household.shortName, household.pbsId)}"]`).exists()).toBe(true)
        expect(findByTestId(wrapper, PROFILE_TEST_IDS.heynaboProfile).text()).toBe(BUTTON_WORDS.heynabo.name)
    })
})

describe('UserProfileCard - role manager', () => {
    const admin = UserFactory.defaultUserWithInhabitant('profile-admin', {id: 3, systemRoles: [SystemRole.ADMIN]})

    it('GIVEN an admin editing the roles THEN a role Heynabo owns is read-only and marked, and the help names every role', async () => {
        const wrapper = await mountCard({user: me, showRoleManager: true}, admin)
        await clickByTestId(wrapper, PROFILE_TEST_IDS.editRoles)

        const roles = Object.values(SystemRole)
        const switches = wrapper.findAllComponents({name: 'USwitch'})
        expect(roles.map((_role, index) => itemAt(switches, index).props('disabled')))
            .toEqual(roles.map(role => ROLE_OWNERSHIP[role] === RoleOwner.HN))
        expect(wrapper.text()).toContain(USER_WORDS.profile.roles.heynaboOwned)
        roles.forEach(role => expect(wrapper.text()).toContain(USER_WORDS.profile.roles.help[role]))
    })
})

describe('UserProfileCard - optional data', () => {
    it('should handle user without household shortName', async () => {
        const user = UserFactory.defaultUserWithInhabitant('profile-no-shortname')
        const household = user.Inhabitant?.household
        if (!household) throw new Error('The factory user has no household')
        // shortName can be null from the API
        Object.assign(household, {shortName: null})
        user.phone = null

        const wrapper = await mountCard({user})

        // No household link without a shortName
        expect(wrapper.find('a[href="/household"]').exists()).toBe(false)
    })
})
