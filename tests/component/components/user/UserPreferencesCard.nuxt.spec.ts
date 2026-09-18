// @vitest-environment nuxt
/**
 * UserPreferencesCard - the "Mine indstillinger" card on the dashboard.
 *
 * Real component, real auth store, real design system (testing.md Rule 6); only HTTP and the
 * session are faked. Runs every case on both viewports through the injected `isMd` breakpoint.
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {nextTick, type Ref} from 'vue'
import {flushPromises} from '@vue/test-utils'
import {setActivePinia, createPinia} from 'pinia'
import {registerEndpoint, mockNuxtImport} from '@nuxt/test-utils/runtime'
import {readBody, type H3Event} from 'h3'
import {clearNuxtData} from '#app'
import UserPreferencesCard from '~/components/user/UserPreferencesCard.vue'
import {mountWithTooltipProvider, findByTestId} from '~~/tests/component/testHelpers'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import type {UserDetail} from '~/composables/useCoreValidation'
import {PALETTES} from '~/composables/useUserPreferenceValidation'
import {PREF_TEST_IDS, PALETTE_BADGE_TEXT, COLOUR_SAFE_BADGE_TEXT} from './userPreferencesTestIds'

// The test runtime has no session cookie and no /api/_auth endpoint, so the session nuxt-auth-utils
// would hydrate is the one thing faked (households.nuxt.spec.ts precedent) - the auth store is real.
// The Nuxt app owns one pinia for the whole file, so the session user must be a real ref: the store's
// `user` computed is created once and only re-reads what it can track.
const {session} = vi.hoisted(() => ({
    session: {} as {user: Ref<UserDetail | null>, fetch: ReturnType<typeof vi.fn>}
}))
mockNuxtImport('useUserSession', () => {
    session.user = ref<UserDetail | null>(null)
    session.fetch = vi.fn()
    return () => ({
        loggedIn: computed(() => session.user.value !== null),
        user: session.user,
        session: ref(null),
        clear: vi.fn(),
        fetch: session.fetch
    })
})

const savedBodies: Record<string, unknown>[] = []
const testNotificationSpy = vi.fn()

registerEndpoint('/api/user/preferences', {
    method: 'POST',
    handler: async (event: H3Event) => {
        savedBodies.push(await readBody(event))
        return session.user.value
    }
})
const TEST_DEDUPE_KEY = 'TEST:EMAIL:m***@example.com:1'

registerEndpoint('/api/user/notifications/test', {
    method: 'POST',
    handler: () => {
        testNotificationSpy()
        return {queued: true, dedupeKey: TEST_DEDUPE_KEY, degraded: false}
    }
})

const userWith = (overrides: Partial<UserDetail>): UserDetail =>
    UserFactory.defaultUserWithInhabitant('prefs', overrides)

const mountCard = async (user: UserDetail, isMd: boolean) => {
    session.user.value = user
    const wrapper = await mountWithTooltipProvider(UserPreferencesCard, {isMd})
    await flushPromises()
    await nextTick()
    return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountCard>>

/** A click, then the ticks a store round-trip (request, response, session refresh) needs to settle */
const click = async (wrapper: Wrapper, testId: string) => {
    await findByTestId(wrapper, testId).trigger('click')
    for (let round = 0; round < 3; round++) {
        await flushPromises()
        await nextTick()
    }
}

/** The radio's clickable control is reka-ui's `button[role=radio]`, addressed by its value */
const selectRadio = async (wrapper: Wrapper, value: string) => {
    await wrapper.find(`button[value="${value}"]`).trigger('click')
    await flushPromises()
    await nextTick()
}

const isOn = (wrapper: Wrapper, testId: string) =>
    findByTestId(wrapper, testId).attributes('aria-checked') === 'true'

beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    clearNuxtData()
    savedBodies.length = 0
})

describe.each([
    {viewport: 'phone', isMd: false},
    {viewport: 'desktop', isMd: true}
])('UserPreferencesCard ($viewport)', ({isMd}) => {
    it('GIVEN saved preferences WHEN the card renders THEN the view face shows the channels and the appearance', async () => {
        const wrapper = await mountCard(userWith({
            notificationChannels: ['EMAIL'],
            appearance: {palette: 'high-contrast', textScale: 'large'}
        }), isMd)

        expect(findByTestId(wrapper, PREF_TEST_IDS.card).exists()).toBe(true)
        expect(wrapper.text()).toContain('E-mail')
        expect(wrapper.text()).toContain('Farvevalg')
        expect(wrapper.text()).toContain('Høj kontrast')
        expect(wrapper.text()).toContain('Stor')
        expect(findByTestId(wrapper, PREF_TEST_IDS.edit).exists()).toBe(true)
        expect(findByTestId(wrapper, PREF_TEST_IDS.save).exists()).toBe(false)
    })

    // The row pencil of docs/ui.md "Edit affordances": a glyph with an accessible name, no text
    it('GIVEN the view face THEN the edit pencil is the bare glyph, named "Rediger"', async () => {
        const wrapper = await mountCard(userWith({}), isMd)
        const pencil = findByTestId(wrapper, PREF_TEST_IDS.edit)

        expect(pencil.text()).toBe('')
        expect(pencil.attributes('aria-label')).toBe('Rediger')
    })

    it('GIVEN a session snapshot from before the columns existed THEN the card falls back to the column defaults', async () => {
        const {notificationChannels: _channels, appearance: _appearance, ...stale} = userWith({})

        const wrapper = await mountCard(stale as UserDetail, isMd)

        expect(wrapper.text()).toContain('E-mail')
        expect(wrapper.text()).toContain('Glade farver')
        expect(wrapper.text()).not.toContain('Ingen notifikationer')
    })

    it('GIVEN no channels WHEN the card renders THEN it says so and the test button is disabled', async () => {
        const wrapper = await mountCard(userWith({notificationChannels: []}), isMd)

        expect(wrapper.text()).toContain('Ingen notifikationer')
        expect(findByTestId(wrapper, PREF_TEST_IDS.sendTest).attributes('disabled')).toBeDefined()
    })

    it('GIVEN at least one channel WHEN Send testbesked is clicked THEN the test notification is requested and its id is reported', async () => {
        const wrapper = await mountCard(userWith({notificationChannels: ['EMAIL']}), isMd)

        await click(wrapper, PREF_TEST_IDS.sendTest)

        expect(testNotificationSpy).toHaveBeenCalledTimes(1)
        // The toast names the message id, so a member can quote it and the logs can be grepped for it
        expect(useToast().toasts.value.at(-1)?.description).toBe(TEST_DEDUPE_KEY)
    })

    it('GIVEN the view face WHEN Rediger is clicked THEN the edit face opens', async () => {
        const wrapper = await mountCard(userWith({notificationChannels: ['EMAIL']}), isMd)

        await click(wrapper, PREF_TEST_IDS.edit)

        expect(findByTestId(wrapper, PREF_TEST_IDS.save).exists()).toBe(true)
        expect(findByTestId(wrapper, PREF_TEST_IDS.cancel).exists()).toBe(true)
        expect(findByTestId(wrapper, PREF_TEST_IDS.channel('EMAIL')).exists()).toBe(true)
        expect(findByTestId(wrapper, PREF_TEST_IDS.edit).exists()).toBe(false)
    })

    it.each([
        {desc: 'no phone', phone: null, disabled: true},
        {desc: 'a phone', phone: '+4512345678', disabled: false}
    ])('GIVEN a user with $desc WHEN editing THEN the SMS switch disabled=$disabled', async ({phone, disabled}) => {
        const wrapper = await mountCard(userWith({phone, notificationChannels: ['EMAIL']}), isMd)

        await click(wrapper, PREF_TEST_IDS.edit)

        expect(findByTestId(wrapper, PREF_TEST_IDS.channel('SMS')).attributes('disabled') !== undefined).toBe(disabled)
        expect(wrapper.text().includes('kræver telefonnummer')).toBe(disabled)
    })

    it('GIVEN the edit face THEN the palettes are offered as Glade farver, Høj kontrast, Til farveblinde', async () => {
        const wrapper = await mountCard(userWith({}), isMd)

        await click(wrapper, PREF_TEST_IDS.edit)

        const offered = Object.keys(PALETTES).map(palette => findByTestId(wrapper, PREF_TEST_IDS.palette(palette)).text())
        expect(offered.map((text, index) => text.startsWith(['Glade farver', 'Høj kontrast', 'Til farveblinde'][index]!)))
            .toEqual([true, true, true])
    })

    it('GIVEN the edit face THEN each badge sits on the palettes the registry verifies for it', async () => {
        const wrapper = await mountCard(userWith({}), isMd)

        await click(wrapper, PREF_TEST_IDS.edit)

        // The registry decides which option earns which badge, so a new preset needs no edit here
        const badged = Object.entries(PALETTES).map(([palette, {level, colourSafe}]) => {
            const text = findByTestId(wrapper, PREF_TEST_IDS.palette(palette)).text()
            return {palette, contrast: text.includes(PALETTE_BADGE_TEXT), colourSafe: text.includes(COLOUR_SAFE_BADGE_TEXT),
                verified: level !== null, safe: colourSafe}
        })
        expect(badged.filter(({contrast, verified, colourSafe, safe}) => contrast !== verified || colourSafe !== safe)).toEqual([])
    })

    it('GIVEN a member on Til farveblinde THEN the view face shows both badges', async () => {
        const wrapper = await mountCard(userWith({appearance: {palette: 'colorblind', textScale: 'normal'}}), isMd)

        expect(wrapper.text()).toContain('Til farveblinde')
        expect(wrapper.text()).toContain(PALETTE_BADGE_TEXT)
        expect(wrapper.text()).toContain(COLOUR_SAFE_BADGE_TEXT)
    })

    it('GIVEN a changed draft WHEN Annuller is clicked THEN the draft is discarded', async () => {
        const wrapper = await mountCard(userWith({
            notificationChannels: ['EMAIL'],
            appearance: {palette: 'default', textScale: 'normal'}
        }), isMd)

        await click(wrapper, PREF_TEST_IDS.edit)
        await click(wrapper, PREF_TEST_IDS.channel('EMAIL'))
        await selectRadio(wrapper, 'high-contrast')
        await click(wrapper, PREF_TEST_IDS.cancel)
        await click(wrapper, PREF_TEST_IDS.edit)

        expect(isOn(wrapper, PREF_TEST_IDS.channel('EMAIL'))).toBe(true)
        expect(savedBodies).toHaveLength(0)
    })

    it('GIVEN a changed draft WHEN Gem is clicked THEN both fields are posted and the card returns to view', async () => {
        const wrapper = await mountCard(userWith({
            phone: '+4512345678',
            notificationChannels: ['EMAIL'],
            appearance: {palette: 'default', textScale: 'normal'}
        }), isMd)

        await click(wrapper, PREF_TEST_IDS.edit)
        await click(wrapper, PREF_TEST_IDS.channel('SMS'))
        await selectRadio(wrapper, 'high-contrast')
        await selectRadio(wrapper, 'large')
        await click(wrapper, PREF_TEST_IDS.save)

        expect(savedBodies).toEqual([{
            notificationChannels: ['EMAIL', 'SMS'],
            appearance: {palette: 'high-contrast', textScale: 'large'}
        }])
        expect(session.fetch).toHaveBeenCalled()
        expect(findByTestId(wrapper, PREF_TEST_IDS.edit).exists()).toBe(true)
        expect(findByTestId(wrapper, PREF_TEST_IDS.save).exists()).toBe(false)
    })
})
