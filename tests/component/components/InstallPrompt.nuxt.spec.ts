// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {nextTick, markRaw} from 'vue'
import {clearNuxtState, useState} from '#app'
import {flushPromises} from '@vue/test-utils'
import InstallPrompt from '~/components/InstallPrompt.vue'
import {INSTALL_DISMISSED_COOKIE, INSTALL_MEDIA_QUERIES, INSTALL_PROMPT_STATE, type BeforeInstallPromptEvent} from '~/composables/useInstallPrompt'
import {INSTALL_TEST_IDS} from './installPromptTestIds'
import {mountWithTooltipProvider, findByTestId, clickByTestId} from '~~/tests/component/testHelpers'

// The card shows the strongest install affordance the browser offers; the capability is
// a browser fact, so each case fakes the browser and the component decides the face.
type Capability = 'chromium' | 'share-sheet' | 'touch-first' | 'standalone' | 'plain'

const promptStub = vi.fn(() => Promise.resolve())

// happy-dom evaluates neither `display-mode` nor `pointer`/`hover`: matchMedia answers the listed queries
const fakeMedia = (matching: string[] = []) =>
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
        matches: matching.includes(query),
        media: query
    }) as MediaQueryList)

// happy-dom has no `navigator.standalone` (Safari-only property)
const fakeNavigatorStandalone = (value: boolean) =>
    Object.defineProperty(window.navigator, 'standalone', {value, configurable: true})

// happy-dom has no BeforeInstallPromptEvent (Chromium-only): a cancelable Event carrying a prompt() stub
const fakeInstallEvent = (): BeforeInstallPromptEvent =>
    Object.assign(new Event('beforeinstallprompt', {cancelable: true}), {prompt: promptStub})

const dispatchBeforeInstallPrompt = () => window.dispatchEvent(fakeInstallEvent())

// Chromium fires the event at page load, before the card exists: the client plugin has already captured it
const seedCapturedPrompt = () => {
    useState<BeforeInstallPromptEvent | null>(INSTALL_PROMPT_STATE.event).value = markRaw(fakeInstallEvent())
}

const mountWith = async (capability: Capability) => {
    fakeMedia([
        ...(capability === 'standalone' ? [INSTALL_MEDIA_QUERIES.standalone] : []),
        ...(capability === 'touch-first' ? [INSTALL_MEDIA_QUERIES.touchFirst] : [])
    ])
    if (capability === 'share-sheet') fakeNavigatorStandalone(false)
    if (capability === 'chromium' || capability === 'standalone') seedCapturedPrompt()
    const wrapper = await mountWithTooltipProvider(InstallPrompt, {isMd: false})
    await flushPromises()
    await nextTick()
    return wrapper
}

const ICON_SRC = '/app-icon.svg'

describe('InstallPrompt', () => {
    beforeEach(() => {
        promptStub.mockClear()
        clearNuxtState(Object.values(INSTALL_PROMPT_STATE))
        document.cookie = `${INSTALL_DISMISSED_COOKIE}=; max-age=0; path=/`
    })

    afterEach(() => {
        vi.restoreAllMocks()
        delete (window.navigator as Navigator & {standalone?: boolean}).standalone
    })

    describe.each<[Capability, string, boolean]>([
        ['chromium', 'Installér appen, så ligger den på din hjemmeskærm som alle andre apps.', true],
        ['share-sheet', 'Åbn Del-menuen og vælg \'Føj til hjemmeskærm\'', false],
        ['touch-first', 'Åbn browserens menu og vælg \'Føj til startskærm\'', false]
    ])('%s face', (capability, description, hasInstallButton) => {
        it('renders the title, the app icon and the description', async () => {
            const wrapper = await mountWith(capability)
            const card = findByTestId(wrapper, INSTALL_TEST_IDS.card)

            expect(card.text()).toContain('Få Skråningen som app')
            expect(card.text()).toContain(description)
            expect(card.find(`img[src="${ICON_SRC}"]`).exists()).toBe(true)
        })

        it(`renders Ikke nu${hasInstallButton ? ' and Installér app' : ' only'}`, async () => {
            const wrapper = await mountWith(capability)

            expect(findByTestId(wrapper, INSTALL_TEST_IDS.dismiss).text()).toContain('Ikke nu')
            expect(findByTestId(wrapper, INSTALL_TEST_IDS.install).exists()).toBe(hasInstallButton)
        })

        it('Ikke nu hides the card and the dismissal outlives the mount', async () => {
            const wrapper = await mountWith(capability)
            await clickByTestId(wrapper, INSTALL_TEST_IDS.dismiss)

            expect(findByTestId(wrapper, INSTALL_TEST_IDS.card).exists()).toBe(false)
            expect(document.cookie).toContain(`${INSTALL_DISMISSED_COOKIE}=true`)

            const remounted = await mountWith(capability)
            expect(findByTestId(remounted, INSTALL_TEST_IDS.card).exists()).toBe(false)
        })
    })

    it('Installér app calls the captured event\'s prompt()', async () => {
        const wrapper = await mountWith('chromium')
        await clickByTestId(wrapper, INSTALL_TEST_IDS.install)

        expect(promptStub).toHaveBeenCalledOnce()
    })

    // The window events reach the card through the app's client plugin, which listens from app start
    it.each([
        ['before the card mounts', true],
        ['after the card mounts', false]
    ])('a beforeinstallprompt fired %s yields the button face', async (_, firesFirst) => {
        fakeMedia()
        if (firesFirst) dispatchBeforeInstallPrompt()
        const wrapper = await mountWithTooltipProvider(InstallPrompt, {isMd: false})
        if (!firesFirst) dispatchBeforeInstallPrompt()
        await flushPromises()
        await nextTick()

        expect(findByTestId(wrapper, INSTALL_TEST_IDS.install).exists()).toBe(true)
    })

    // Chromium's own mini-infobar stays as a second install offer: the event is captured, never cancelled
    it('captures beforeinstallprompt without cancelling it', () => {
        const event = fakeInstallEvent()
        window.dispatchEvent(event)

        expect(event.defaultPrevented).toBe(false)
        expect(useState<BeforeInstallPromptEvent | null>(INSTALL_PROMPT_STATE.event).value).toBe(event)
    })

    it('hides the card once the app is installed', async () => {
        const wrapper = await mountWith('chromium')
        window.dispatchEvent(new Event('appinstalled'))
        await nextTick()

        expect(findByTestId(wrapper, INSTALL_TEST_IDS.card).exists()).toBe(false)
    })

    it.each<Capability>(['standalone', 'plain'])('%s renders nothing', async capability => {
        const wrapper = await mountWith(capability)

        expect(findByTestId(wrapper, INSTALL_TEST_IDS.card).exists()).toBe(false)
    })
})
