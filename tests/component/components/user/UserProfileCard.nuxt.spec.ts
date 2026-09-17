// @vitest-environment nuxt
/**
 * UserProfileCard - the ⚙ toggle that reveals the settings card the parent renders.
 *
 * Real component tree, real stores (testing.md Rule 6); only HTTP and the session are faked.
 * The toggle belongs to the current user's own card, so the spec drives `authStore.user`.
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

describe('UserProfileCard - settings toggle', () => {
    it.each([
        {desc: 'the current user with actions', user: me, showActions: true, visible: true},
        {desc: 'another user with actions', user: someoneElse, showActions: true, visible: false},
        {desc: 'the current user without actions', user: me, showActions: false, visible: false}
    ])('GIVEN $desc THEN the toggle is rendered=$visible', async ({user, showActions, visible}) => {
        const wrapper = await mountCard({user, showActions})

        expect(findByTestId(wrapper, PREF_TEST_IDS.toggle).exists()).toBe(visible)
    })

    it('GIVEN the toggle WHEN it is clicked THEN the card asks its parent to toggle the settings', async () => {
        const wrapper = await mountCard({user: me, showActions: true})

        await findByTestId(wrapper, PREF_TEST_IDS.toggle).trigger('click')
        await nextTick()

        expect(wrapper.emitted('toggle-preferences')).toHaveLength(1)
    })

    it.each([
        {preferencesOpen: false, pressed: 'false'},
        {preferencesOpen: true, pressed: 'true'}
    ])('GIVEN preferencesOpen=$preferencesOpen THEN the toggle reports aria-pressed=$pressed', async ({preferencesOpen, pressed}) => {
        const wrapper = await mountCard({user: me, showActions: true, preferencesOpen})

        expect(findByTestId(wrapper, PREF_TEST_IDS.toggle).attributes('aria-pressed')).toBe(pressed)
    })
})
