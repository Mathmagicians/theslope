// @vitest-environment nuxt
/**
 * UserProfileCard - the owner's header actions: the ⚙ toggle that reveals the settings card the
 * parent renders, and Log ud.
 *
 * Real component tree, real stores (testing.md Rule 6); only HTTP and the session are faked.
 * The toggle and Log ud belong to the current user's own card, so the spec drives `authStore.user`.
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {nextTick, type Ref} from 'vue'
import {flushPromises} from '@vue/test-utils'
import {setActivePinia, createPinia} from 'pinia'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {clearNuxtData} from '#app'
import UserProfileCard from '~/components/user/UserProfileCard.vue'
import {mountWithTooltipProvider, findByTestId} from '~~/tests/component/testHelpers'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import type {UserDetail} from '~/composables/useCoreValidation'
import {PREF_TEST_IDS} from './userPreferencesTestIds'

/** The header's own actions; the ⚙ is `PREF_TEST_IDS.toggle`, next to the card it opens */
const PROFILE_TEST_IDS = {
    logout: 'logout-button'
} as const

// The test runtime has no session cookie and no /api/_auth endpoint, so the session nuxt-auth-utils
// would hydrate is the one thing faked; the auth store reading it is real.
const {session} = vi.hoisted(() => ({
    session: {} as {user: Ref<UserDetail | null>}
}))
mockNuxtImport('useUserSession', () => {
    session.user = ref<UserDetail | null>(null)
    return () => ({
        loggedIn: computed(() => session.user.value !== null),
        user: session.user,
        session: ref(null),
        clear: vi.fn(),
        fetch: vi.fn()
    })
})

// The users store fetches on creation (role manager data)
registerEndpoint('/api/admin/users/by-role/ALLERGYMANAGER', () => [])
registerEndpoint('/api/admin/users', () => [])
registerEndpoint('/api/team/my', () => [])

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
    setActivePinia(createPinia())
    vi.clearAllMocks()
    clearNuxtData()
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



    it('GIVEN the toggle THEN it is the wheel alone, named "Indstillinger" for assistive tech', async () => {
        const wrapper = await mountCard({user: me, showActions: true})
        const toggle = findByTestId(wrapper, PREF_TEST_IDS.toggle)

        expect(toggle.text()).toBe('')
        expect(toggle.attributes('aria-label')).toBe('Indstillinger')
    })

    it('GIVEN the toggle WHEN it is clicked THEN the card asks its parent to toggle the settings', async () => {
        const wrapper = await mountCard({user: me, showActions: true})

        await findByTestId(wrapper, PREF_TEST_IDS.toggle).trigger('click')
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
