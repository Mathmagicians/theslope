import type {Page} from '@playwright/test'
import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {INSTALL_TEST_IDS} from '~~/tests/component/components/installPromptTestIds'
import {INSTALL_PROMPT_STATE} from '~/composables/useInstallPrompt'

const {memberUIFile} = authFiles
const {waitForHydration, gotoHydrated} = testHelpers

type StubbedWindow = Window & {
    installPromptCalls?: number
    installPromptCaptured?: boolean
    useNuxtApp?: () => {payload: {state: Record<string, unknown>}}
}

// Nuxt stores useState under a `$s` prefix in the payload state
const CAPTURED_EVENT_KEY = '$s' + INSTALL_PROMPT_STATE.event

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
    await gotoHydrated(page, '/login')
    await expect(page.getByTestId('logout-button')).toBeVisible()
}

/**
 * The dashboard answers "Where is the app?" with the strongest install affordance the browser offers.
 * Each case injects a capability before the page loads; the dismissal is a cookie in the case's own context.
 */
test.describe('Install guidance on the dashboard', () => {
    test.use({storageState: memberUIFile})

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
