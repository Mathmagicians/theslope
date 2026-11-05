// @vitest-environment nuxt
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {mockNuxtImport, mountSuspended} from '@nuxt/test-utils/runtime'
import {enableAutoUnmount} from '@vue/test-utils'
import Login from '~/components/login/Login.vue'
import {resetStores, registerEmptyStoreEndpoints} from '~~/tests/component/testHelpers'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {COMPONENTS, TYPOGRAPHY} from '~/composables/useTheSlopeDesignSystem'
import {USER_WORDS} from '~/config/userWords'

// The test runtime has no session cookie, so the session is the one thing faked
const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

registerEmptyStoreEndpoints()
enableAutoUnmount(afterEach)

const WORDS = USER_WORDS.login

describe('Login', () => {
    beforeEach(() => {
        resetStores()
        session.user.value = null
    })

    it('GIVEN no session THEN the form reads its title, fields and button in the form page\'s column', async () => {
        const wrapper = await mountSuspended(Login)

        expect(wrapper.find('h2').text()).toBe(WORDS.signIn)
        expect(wrapper.text()).toContain(WORDS.email.label)
        expect(wrapper.text()).toContain(WORDS.password.label)
        expect(wrapper.find('button[type="submit"]').text()).toBe(WORDS.signIn)
        expect(wrapper.find('input[type="email"]').attributes('placeholder')).toBe(WORDS.email.placeholder)
        expect(wrapper.find('form').classes()).toEqual(COMPONENTS.login.form.split(' '))
    })

    it('GIVEN a session THEN the dashboard greets the inhabitant on the greeting token and lists the three ways in', async () => {
        const user = UserFactory.defaultUserWithInhabitant('login')
        session.user.value = user
        const wrapper = await mountSuspended(Login)

        const greeting = wrapper.find('h1')
        expect(greeting.text()).toBe(WORDS.greeting(user.Inhabitant?.name ?? USER_WORDS.unknownUser))
        expect(greeting.classes()).toEqual([TYPOGRAPHY.sectionSubheadingLight, COMPONENTS.login.greeting].flatMap(token => token.split(' ')))
        expect(wrapper.text()).toContain(WORDS.waysIn)
        for (const way of [WORDS.dinner, WORDS.household, WORDS.team]) {
            expect(wrapper.text()).toContain(way.title)
            expect(wrapper.text()).toContain(way.open)
        }
    })
})
