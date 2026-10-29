import {test, expect, type Page, type Locator} from '~~/tests/e2e/uiTest'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {BillingFactory} from '../testDataFactories/billingFactory'
import {getHouseholdUrl} from '~/utils/household'
import {BookingViewSchema} from '~/composables/useBookingView'

const {adminUIFile} = authFiles
const {validatedBrowserContext, doScreenshot, gotoHydrated, getSessionUserInfo, PHONE_VIEWPORT} = testHelpers

/**
 * Mobile viewport guard (iPhone X, 375x812): every screen fits a phone.
 *
 * Cases: every route, every admin and household tab, the booking views, and the states a control reveals (an expanded
 * row, the settings card). The index routes redirect to a covered tab.
 *
 * Per screen:
 * - the document never scrolls horizontally, in any frame from the first paint to the screenshot (skeletons and
 *   loaders included): `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, sampled every
 *   animation frame;
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
    test.use({storageState: adminUIFile, viewport: PHONE_VIEWPORT})

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
    const BOOKING_VIEWS = [BookingViewSchema.enum.week, BookingViewSchema.enum.month]

    const householdTab = (tab: string, query = '') =>
        `${getHouseholdUrl(ownHousehold.shortName, ownHousehold.pbsId, tab)}${query}`
    const publicBillingPath = () => {
        if (!publicBillingToken) throw new Error('No billing period with a share token - run monthly-billing.feature first')
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

    type WindowWithOverflow = Window & {__maxOverflow?: number, __overflowCulprit?: string, __stopOverflowSampler?: () => void}

    /**
     * Samples the document overflow every animation frame from the first paint on, until the case stops it with a
     * last measurement of the settled page. On the widest frame it names the outermost element that reaches past the
     * layout's right edge, so a red case names its cause.
     */
    const sampleOverflowEveryFrame = (page: Page) => page.addInitScript(() => {
        const win = window as WindowWithOverflow
        win.__maxOverflow = 0
        // clientWidth and scrollWidth read the same layout; innerWidth follows the window before the layout catches up
        const layoutWidth = () => document.documentElement.clientWidth
        const pastLayout = (element: Element | null) => !!element && element.getBoundingClientRect().right > layoutWidth() + 0.5
        // A box that clips or scrolls its content keeps that content out of the document's width
        const clippedByAncestor = (element: Element) => {
            for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
                if (getComputedStyle(ancestor).overflowX !== 'visible') return true
            }
            return false
        }
        const describe = (element: Element) => {
            const testid = element.closest('[data-testid]')?.getAttribute('data-testid') ?? 'no testid'
            const slot = element.getAttribute('data-slot')
            const classes = (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).slice(0, 5).join('.')
            return `${element.tagName.toLowerCase()}${slot ? `[data-slot=${slot}]` : ''}${classes ? `.${classes}` : ''} in ${testid}`
        }
        // The outermost overflowing elements sit in a parent that fits; the one reaching furthest sets the scroll width
        const outermostCulprit = () => [...document.querySelectorAll('body, body *')]
            .filter(element => pastLayout(element) && !pastLayout(element.parentElement) && !clippedByAncestor(element))
            .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)[0]
        const measure = () => {
            const overflow = document.documentElement.scrollWidth - layoutWidth()
            if (overflow <= (win.__maxOverflow ?? 0)) return
            win.__maxOverflow = overflow
            const culprit = outermostCulprit()
            win.__overflowCulprit = culprit ? describe(culprit) : 'no element outside a clipping box'
        }
        let frame = 0
        const sample = () => {
            measure()
            frame = requestAnimationFrame(sample)
        }
        frame = requestAnimationFrame(sample)
        win.__stopOverflowSampler = () => {
            cancelAnimationFrame(frame)
            measure()
        }
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
            await gotoHydrated(page, url)
            await expect(page.getByTestId(ready)).toBeVisible()
            await reveal?.(page)

            // The sampler stops before the screenshot: a full-page screenshot resizes the window, and the frames in
            // between are narrower than the page's layout
            const {overflow, culprit} = await page.evaluate(() => {
                const win = window as WindowWithOverflow
                win.__stopOverflowSampler?.()
                return {overflow: win.__maxOverflow ?? 0, culprit: win.__overflowCulprit}
            })

            // Evidence for the visual check - taken before the assertions so it exists on failure
            await doScreenshot(page, `mobile/${name}`)

            // THEN: no frame rendered wider than the viewport, the skeletons included
            expect.soft(overflow, `${url} scrolled horizontally by ${overflow}px in some frame: ${culprit}`).toBeLessThanOrEqual(0)

            // THEN: no alert clips its content (the ALERTS token owns alert wrapping)
            expect.soft(await measureInnerOverflow(page.locator(ALERT_ROOT)), `${url}: alerts that clip their content`).toEqual([])

            // THEN: tables, badges and buttons keep their words whole
            expect.soft(await findBrokenWords(page.locator(WHOLE_WORD_TEXT)), `${url}: words broken across two lines`).toEqual([])
        })
    }
})
