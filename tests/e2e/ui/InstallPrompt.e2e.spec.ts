import type {Page} from '@playwright/test'
import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {INSTALL_TEST_IDS} from '~~/tests/component/components/installPromptTestIds'
import {INSTALL_MEDIA_QUERIES, INSTALL_PROMPT_STATE} from '~/composables/useInstallPrompt'

const {memberUIFile} = authFiles
const {waitForHydration} = testHelpers

type StubbedWindow = Window & {
    installPromptCalls?: number
    installPromptCaptured?: boolean
    useNuxtApp?: () => {payload: {state: Record<string, unknown>}}
}

// Nuxt stores useState under a `$s` prefix in the payload state
const CAPTURED_EVENT_KEY = '$s' + INSTALL_PROMPT_STATE.event

/** A share-sheet browser tab (iOS) exposes `navigator.standalone` as false; desktop Chromium has no such property */
const shareSheetBrowser = () => {
    Object.defineProperty(navigator, 'standalone', {value: false, configurable: true})
}

/** A touch-first device matches the query; desktop Chromium does not, so the init script answers it */
const touchFirstBrowser = (touchFirstQuery: string) => {
    const matchMedia = window.matchMedia.bind(window)
    window.matchMedia = (query: string) => {
        const list = matchMedia(query)
        return query === touchFirstQuery ? Object.defineProperty(list, 'matches', {value: true}) : list
    }
}

const INSTRUCTION_FACES = [
    {given: 'a share-sheet browser tab', inject: shareSheetBrowser, text: 'Åbn Del-menuen og vælg \'Føj til hjemmeskærm\''},
    {given: 'a touch-first browser tab without an install event', inject: touchFirstBrowser, text: 'Åbn browserens menu og vælg \'Føj til startskærm\''}
] as const

/**
 * Chromium fires `beforeinstallprompt` around page load when the page is installable. The stub fires a
 * cancelable Event with a counting prompt() from load until the app's client plugin has stored it in its
 * shared state: under the dev server the app boots after the load event.
 */
const chromiumInstallable = (capturedEventKey: string) => {
    const w = window as StubbedWindow
    w.installPromptCalls = 0
    const fire = () => {
        const event = Object.assign(new Event('beforeinstallprompt', {cancelable: true}), {
            prompt: () => {
                w.installPromptCalls = (w.installPromptCalls ?? 0) + 1
                return Promise.resolve()
            }
        })
        window.dispatchEvent(event)
        w.installPromptCaptured = w.useNuxtApp?.().payload.state[capturedEventKey] === event
        if (!w.installPromptCaptured) setTimeout(fire, 100)
    }
    window.addEventListener('load', fire)
}

const openDashboard = async (page: Page) => {
    await page.goto('/login')
    await waitForHydration(page)
    await expect(page.getByTestId('logout-button')).toBeVisible()
}

/**
 * The dashboard answers "Where is the app?" with the strongest install affordance the browser offers.
 * Each case injects a capability before the page loads; the dismissal is a cookie in the case's own context.
 */
test.describe('Install guidance on the dashboard', () => {
    test.use({storageState: memberUIFile})

    test('GIVEN a plain Chromium tab THEN no install card shows', async ({page}) => {
        await openDashboard(page)

        await expect(page.getByTestId(INSTALL_TEST_IDS.card)).toHaveCount(0)
    })

    for (const {given, inject, text} of INSTRUCTION_FACES) {
        test(`GIVEN ${given} THEN the instructions show with Ikke nu only`, async ({page}) => {
            await page.addInitScript(inject, INSTALL_MEDIA_QUERIES.touchFirst)
            await openDashboard(page)

            await expect(page.getByTestId(INSTALL_TEST_IDS.card)).toContainText(text)
            await expect(page.getByTestId(INSTALL_TEST_IDS.dismiss)).toBeVisible()
            await expect(page.getByTestId(INSTALL_TEST_IDS.install)).toHaveCount(0)
        })
    }

    test('GIVEN an installable Chromium tab WHEN Installér app is clicked THEN the browser install prompt opens', async ({page}) => {
        await page.addInitScript(chromiumInstallable, CAPTURED_EVENT_KEY)
        await openDashboard(page)

        await page.getByTestId(INSTALL_TEST_IDS.install).click()

        await expect.poll(() => page.evaluate(() => (window as StubbedWindow).installPromptCalls)).toBe(1)
    })

    test('GIVEN the install card WHEN Ikke nu is clicked THEN the card stays gone after reload', async ({page}) => {
        await page.addInitScript(chromiumInstallable, CAPTURED_EVENT_KEY)
        await openDashboard(page)
        await expect(page.getByTestId(INSTALL_TEST_IDS.card)).toBeVisible()

        await page.getByTestId(INSTALL_TEST_IDS.dismiss).click()
        await expect(page.getByTestId(INSTALL_TEST_IDS.card)).toHaveCount(0)

        await page.reload()
        await waitForHydration(page)
        // The card has seen the capability, so its absence is the dismissal
        await expect.poll(() => page.evaluate(() => (window as StubbedWindow).installPromptCaptured)).toBe(true)
        await expect(page.getByTestId('logout-button')).toBeVisible()
        await expect(page.getByTestId(INSTALL_TEST_IDS.card)).toHaveCount(0)
    })
})
