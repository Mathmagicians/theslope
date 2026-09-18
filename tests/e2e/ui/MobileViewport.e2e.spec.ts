import {test, expect, type Page, type Locator} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {getHouseholdUrl} from '~/utils/household'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot, waitForHydration, getSessionUserInfo} = testHelpers

/**
 * Mobile viewport guard (iPhone X, 375x812): every page fits a phone.
 *
 * Per page:
 * - the document never scrolls horizontally, in any frame from the first paint on (skeletons and loaders
 *   included): `document.documentElement.scrollWidth <= window.innerWidth`, sampled every animation frame;
 * - no alert clips its content: the alert root is `overflow-hidden`, so an alert wider than its content box
 *   hides the overflow instead of widening the document. Alert responsiveness lives in the design system's
 *   `ALERTS` token (ADR-018), so a red here is fixed in the token;
 * - a UTable root scrolls its own overflow, so a row that spills never reaches the document: `scrollBoxes`
 *   measures those boxes;
 * - `clipped` measures text that a truncating slot cuts off.
 *
 * A screenshot of each page lands in test-results/mobile/, taken before the assertions.
 */
test.describe('Mobile viewport - no horizontal overflow', () => {
    const MOBILE_VIEWPORT = {width: 375, height: 812}

    test.use({storageState: adminUIFile, viewport: MOBILE_VIEWPORT})

    // The admin's own household URLs are session-derived (shortName + ?pbs=), resolved in beforeAll
    let ownHouseholdSettingsUrl = ''
    let ownHouseholdMembersUrl = ''

    type MobilePageCase = {
        name: string
        path: () => string
        ready: (page: Page) => Locator
        /** Reveals what the page hides behind a control, so the measurement covers it too */
        reveal?: (page: Page) => Promise<void>
        /** Boxes that scroll their own overflow (a UTable root), measured on top of the document */
        scrollBoxes?: (page: Page) => Locator
        /** Text slots that truncate (an ellipsis), measured for the width they cut off */
        clipped?: (page: Page) => Locator
    }

    /** A Nuxt UI alert: the one component whose root carries data-orientation above a wrapper slot */
    const ALERT_ROOT = '[data-slot="root"][data-orientation]:has(> [data-slot="wrapper"])'

    const PAGES: MobilePageCase[] = [
        {name: 'admin-allergies', path: () => '/admin/allergies', ready: (page) => page.getByTestId('admin-allergies')},
        {
            name: 'admin-allergies-expanded-row',
            path: () => '/admin/allergies',
            ready: (page) => page.getByTestId('admin-allergies'),
            // On a phone the detail panel docks in the tapped row, inside the catalog table
            reveal: async (page) => {
                await page.locator('[data-testid^="allergy-row-"]').first().click()
                await page.getByTestId('edit-allergy-type').waitFor({state: 'visible'})
            },
            scrollBoxes: (page) => page.getByTestId('admin-allergies').locator('div:has(> table)').first()
        },
        {name: 'admin-allergies-pdf', path: () => '/admin/allergies/pdf', ready: (page) => page.getByTestId('allergy-table')},
        {
            name: 'admin-system',
            path: () => '/admin/system',
            ready: (page) => page.getByTestId('admin-system'),
            // The job history table; the settings tree truncates long values (holidayUrl)
            scrollBoxes: (page) => page.getByTestId('admin-system').locator('div:has(> table)'),
            clipped: (page) => page.getByTestId('admin-system').locator('[data-slot="linkLabel"]')
        },
        {
            name: 'admin-users',
            path: () => '/admin/users',
            ready: (page) => page.getByTestId('admin-users'),
            scrollBoxes: (page) => page.getByTestId('admin-users').locator('div:has(> table)')
        },
        {name: 'dinner', path: () => '/dinner', ready: (page) => page.getByTestId('dinner-detail-panel')},
        {name: 'household-members', path: () => ownHouseholdMembersUrl, ready: (page) => page.getByTestId('household-members')},
        {name: 'household-settings', path: () => ownHouseholdSettingsUrl, ready: (page) => page.getByTestId('household-settings')},
        {
            name: 'login',
            path: () => '/login',
            ready: (page) => page.getByTestId('logout-button'),
            // The settings card sits behind the ⚙ in the profile card header
            reveal: async (page) => {
                await page.getByTestId('pref-toggle').click()
                await page.getByTestId('pref-card').waitFor({state: 'visible'})
            }
        }
    ]

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        // /dinner only renders the master/detail layout when a season is active (ADR-003 singleton)
        await SeasonFactory.createActiveSeason(context)
        const {householdShortname, householdPbsId} = await getSessionUserInfo(context)
        ownHouseholdSettingsUrl = getHouseholdUrl(householdShortname, householdPbsId, 'settings')
        ownHouseholdMembersUrl = getHouseholdUrl(householdShortname, householdPbsId, 'members')
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

    for (const {name, path, ready, reveal, scrollBoxes, clipped} of PAGES) {
        test(`GIVEN a 375px viewport WHEN ${name} renders THEN the page does not scroll horizontally`, async ({page}) => {
            const url = path()
            await sampleOverflowEveryFrame(page)

            // WHEN: the page is loaded and hydrated
            await page.goto(url)
            await waitForHydration(page)
            await pollUntil(
                async () => ready(page).isVisible().catch(() => false),
                (isVisible) => isVisible,
                8
            )
            await reveal?.(page)

            // Evidence for the classification table - taken before the assertion so it exists on failure
            await doScreenshot(page, `mobile/alerts-${name}`)

            // THEN: no frame rendered wider than the viewport, the skeletons included
            const {overflow, culprits} = await page.evaluate(() => {
                const win = window as WindowWithOverflow
                return {overflow: win.__maxOverflow ?? 0, culprits: win.__overflowCulprits ?? []}
            })
            expect.soft(overflow, `${url} scrolled horizontally by ${overflow}px in some frame: ${culprits.join(' | ')}`).toBeLessThanOrEqual(0)

            // THEN: no alert clips its content (fixed in the ALERTS token)
            expect.soft(await measureInnerOverflow(page.locator(ALERT_ROOT)), `${url}: alerts that clip their content`).toEqual([])

            // THEN: no table scrolls sideways, no truncating slot cuts its text
            if (scrollBoxes) {
                expect.soft(await measureInnerOverflow(scrollBoxes(page)), `${url}: tables that scroll sideways`).toEqual([])
            }
            if (clipped) {
                expect.soft(await measureInnerOverflow(clipped(page)), `${url}: truncated text`).toEqual([])
            }
        })
    }
})
