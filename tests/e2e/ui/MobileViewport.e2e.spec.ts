import {test, expect, type Page, type Locator} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {BillingFactory} from '../testDataFactories/billingFactory'
import {getHouseholdUrl} from '~/utils/household'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot, waitForHydration, getSessionUserInfo} = testHelpers

/**
 * Mobile viewport guard (iPhone X, 375x812): every screen fits a phone.
 *
 * Cases: every route, every admin and household tab, the booking views, and the states a control reveals (an expanded
 * row, the settings card). The index routes redirect to a covered tab.
 *
 * Per screen:
 * - the document never scrolls horizontally, in any frame from the first paint on (skeletons and loaders
 *   included): `document.documentElement.scrollWidth <= window.innerWidth`, sampled every animation frame;
 * - no alert clips its content: the alert root is `overflow-hidden`, so an alert wider than its content box
 *   hides the overflow instead of widening the document. Alert responsiveness lives in the design system's
 *   `ALERTS` token (ADR-018), so a red here points at the token;
 * - a data table wider than the phone scrolls inside its own box (the UTable root), so the page check above covers it;
 * - no word breaks across two lines in a table, a badge or a button. Alerts break anywhere by design (`ALERTS`), so
 *   text inside an alert is left out.
 *
 * A screenshot of each screen lands in test-results/mobile/, taken before the assertions.
 */
test.describe('Mobile viewport - no horizontal overflow', () => {
    const MOBILE_VIEWPORT = {width: 375, height: 812}

    test.use({storageState: adminUIFile, viewport: MOBILE_VIEWPORT})

    // Session-derived (the admin's own household) and data-derived (a billing period's share token), resolved in beforeAll
    let ownHousehold = {shortName: '', pbsId: 0}
    let publicBillingToken: string | undefined

    /** One screen, one case. */
    type MobileScreen = {
        /** Case and screenshot name */
        name: string
        path: () => string
        /** data-testid of the rendered content; defaults to the name (the screen's root test-id) */
        ready?: string
        /** Opens what the screen hides behind a control, so the measurement covers it too */
        reveal?: (page: Page) => Promise<void>
    }

    /** A Nuxt UI alert: the one component whose root carries data-orientation above a wrapper slot */
    const ALERT_ROOT = '[data-slot="root"][data-orientation]:has(> [data-slot="wrapper"])'
    /** Table cells, and badges and buttons outside a table: Nuxt UI renders a badge or button root as a span, button or
     * link carrying data-slot="base" */
    const WHOLE_WORD_TEXT = 'th, td, :is(span, button, a)[data-slot="base"]:not(td *)'

    const ADMIN_TABS = ['planning', 'teams', 'households', 'allergies', 'users', 'economy', 'system']
    const HOUSEHOLD_TABS = ['bookings', 'members', 'allergies', 'economy', 'settings']
    /** The bookings tab case renders the default day view */
    const BOOKING_VIEWS = ['week', 'month']

    const householdTab = (tab: string, query = '') =>
        `${getHouseholdUrl(ownHousehold.shortName, ownHousehold.pbsId, tab)}${query}`
    const publicBillingPath = () => {
        if (!publicBillingToken) throw new Error('No billing period with a share token - run maintenance.e2e.spec.ts first')
        return `/public/billing/${publicBillingToken}`
    }

    const SCREENS: MobileScreen[] = [
        {name: 'landing', path: () => '/', ready: 'landing-band-0'},
        {
            name: 'login',
            path: () => '/login',
            ready: 'logout-button',
            // The settings card sits behind the ⚙ in the profile card header
            reveal: async (page) => {
                await page.getByTestId('pref-toggle').click()
                await page.getByTestId('pref-card').waitFor({state: 'visible'})
            }
        },
        ...ADMIN_TABS.map(tab => ({name: `admin-${tab}`, path: () => `/admin/${tab}`})),
        {
            name: 'admin-allergies-expanded-row',
            path: () => '/admin/allergies',
            ready: 'admin-allergies',
            // On a phone the detail panel docks in the tapped row, inside the catalog table
            reveal: async (page) => {
                await page.locator('[data-testid^="allergy-row-"]').first().click()
                await page.getByTestId('edit-allergy-type').waitFor({state: 'visible'})
            }
        },
        {name: 'admin-allergies-pdf', path: () => '/admin/allergies/pdf', ready: 'allergy-table'},
        ...HOUSEHOLD_TABS.map(tab => ({name: `household-${tab}`, path: () => householdTab(tab)})),
        ...BOOKING_VIEWS.map(view => ({
            name: `household-bookings-${view}`,
            path: () => householdTab('bookings', `&view=${view}`),
            ready: 'household-bookings'
        })),
        {name: 'dinner', path: () => '/dinner', ready: 'dinner-detail-panel'},
        {name: 'chef', path: () => '/chef', ready: 'chef-page'},
        {name: 'public-billing', path: publicBillingPath}
    ]

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // /dinner only renders the master/detail layout when a season is active (ADR-003 singleton)
        await SeasonFactory.createActiveSeason(context)
        const {householdShortname, householdPbsId} = await getSessionUserInfo(context)
        ownHousehold = {shortName: householdShortname, pbsId: householdPbsId}
        publicBillingToken = (await BillingFactory.getBillingPeriods(context)).find(period => period.shareToken)?.shareToken ?? undefined
    })

    test.beforeEach(() => {
        // Dev server compiles each route lazily on first visit; hydration polling adds up to ~15s
        test.setTimeout(90_000)
    })

    type WindowWithOverflow = Window & {__maxOverflow?: number, __overflowCulprits?: string[]}

    /**
     * Samples the document overflow every animation frame from the first paint on. On the widest frame it records
     * the innermost elements that reach past the viewport, so a red case names its cause.
     */
    const sampleOverflowEveryFrame = (page: Page) => page.addInitScript(() => {
        const win = window as WindowWithOverflow
        win.__maxOverflow = 0
        win.__overflowCulprits = []
        const pastViewport = (element: Element) => element.getBoundingClientRect().right > window.innerWidth + 0.5
        const describe = (element: Element) => {
            const testid = element.closest('[data-testid]')?.getAttribute('data-testid') ?? 'no testid'
            const slot = element.getAttribute('data-slot')
            const classes = (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).slice(0, 5).join('.')
            return `${element.tagName.toLowerCase()}${slot ? `[data-slot=${slot}]` : ''}${classes ? `.${classes}` : ''} in ${testid}`
        }
        const sample = () => {
            const overflow = document.documentElement.scrollWidth - window.innerWidth
            if (overflow > (win.__maxOverflow ?? 0)) {
                win.__maxOverflow = overflow
                win.__overflowCulprits = [...document.querySelectorAll('body *')]
                    .filter(element => pastViewport(element) && ![...element.children].some(pastViewport))
                    .slice(0, 5)
                    .map(describe)
            }
            requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
    })

    /**
     * Every word inside the locator's elements that spans two lines, outside an alert: `<testid>: <word>`.
     * A word is a run between spaces and dashes: a line may break after a dash (18/09/2026-17/10/2026).
     */
    const findBrokenWords = (locator: Locator) => locator.evaluateAll((elements, alertRoot) => elements.flatMap(element => {
        const label = element.closest('[data-testid]')?.getAttribute('data-testid') ?? 'no testid'
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
        const broken: string[] = []
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.parentElement?.closest(alertRoot)) continue
            for (const word of (node.textContent ?? '').matchAll(/[^\s\-–—]+/g)) {
                const range = document.createRange()
                range.setStart(node, word.index ?? 0)
                range.setEnd(node, (word.index ?? 0) + word[0].length)
                const lines = new Set([...range.getClientRects()].map(rect => Math.round(rect.top)))
                if (lines.size > 1) broken.push(`${label}: ${word[0]}`)
            }
        }
        return broken
    }), ALERT_ROOT)

    /** Every element of the locator that is wider inside than its box: `<label>: <px>` */
    const measureInnerOverflow = (locator: Locator) => locator.evaluateAll(elements => elements
        .map(element => ({element, over: element.scrollWidth - element.clientWidth}))
        .filter(({over}) => over > 0)
        .map(({element, over}) => {
            const label = element.closest('[data-testid]')?.getAttribute('data-testid')
                ?? element.querySelector('[data-slot="title"]')?.textContent?.trim()
                ?? element.textContent?.trim().slice(0, 60)
            return `${label}: ${over}px`
        }))

    for (const {name, path, ready = name, reveal} of SCREENS) {
        test(`GIVEN a 375px viewport WHEN ${name} renders THEN the page does not scroll horizontally`, async ({page}) => {
            const url = path()
            await sampleOverflowEveryFrame(page)

            // WHEN: the page is loaded and hydrated
            await page.goto(url)
            await waitForHydration(page)
            await pollUntil(
                async () => page.getByTestId(ready).isVisible().catch(() => false),
                (isVisible) => isVisible,
                8
            )
            await reveal?.(page)

            // Evidence for the visual check - taken before the assertions so it exists on failure
            await doScreenshot(page, `mobile/${name}`)

            // THEN: no frame rendered wider than the viewport, the skeletons included
            const {overflow, culprits} = await page.evaluate(() => {
                const win = window as WindowWithOverflow
                return {overflow: win.__maxOverflow ?? 0, culprits: win.__overflowCulprits ?? []}
            })
            expect.soft(overflow, `${url} scrolled horizontally by ${overflow}px in some frame: ${culprits.join(' | ')}`).toBeLessThanOrEqual(0)

            // THEN: no alert clips its content (the ALERTS token owns alert wrapping)
            expect.soft(await measureInnerOverflow(page.locator(ALERT_ROOT)), `${url}: alerts that clip their content`).toEqual([])

            // THEN: tables, badges and buttons keep their words whole
            expect.soft(await findBrokenWords(page.locator(WHOLE_WORD_TEXT)), `${url}: words broken across two lines`).toEqual([])
        })
    }
})
