import {test, expect, type Page, type Locator} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {getHouseholdUrl} from '~/utils/household'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil, doScreenshot, waitForHydration, getSessionUserInfo} = testHelpers

/**
 * Mobile viewport regression guard (iPhone X, 375x812) for the "Alerts on mobile" fix.
 *
 * Every page renders at phone width and must not scroll horizontally:
 * `document.documentElement.scrollWidth <= window.innerWidth`.
 * A screenshot of each page lands in test-results/mobile/ so the cause of an overflow
 * (alert text that never wraps, action buttons, a wide table) can be read off the image.
 *
 * Measured 2026-09-16: green on all 7 pages - the alert theme clips (root overflow-hidden) instead of
 * scrolling the document, see "Alerts on mobile > Classification" in docs/features/bug-fix-admin-ux.md.
 *
 * A UTable root scrolls its own overflow, so a row that spills never reaches the document: a case
 * with a `scrollBox` measures that box as well.
 */
test.describe('Mobile viewport - no horizontal overflow', () => {
    const MOBILE_VIEWPORT = {width: 375, height: 812}

    test.use({storageState: adminUIFile, viewport: MOBILE_VIEWPORT})

    // The admin's own household URL is session-derived (shortName + ?pbs=), resolved in beforeAll
    let ownHouseholdSettingsUrl = ''

    type MobilePageCase = {
        name: string
        path: () => string
        ready: (page: Page) => Locator
        /** Reveals what the page hides behind a control, so the measurement covers it too */
        reveal?: (page: Page) => Promise<void>
        /** A box that scrolls its own overflow, measured on top of the document */
        scrollBox?: (page: Page) => Locator
    }

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
            scrollBox: (page) => page.getByTestId('admin-allergies').locator('div:has(> table)').first()
        },
        {name: 'admin-allergies-pdf', path: () => '/admin/allergies/pdf', ready: (page) => page.getByTestId('allergy-table')},
        {name: 'admin-system', path: () => '/admin/system', ready: (page) => page.getByTestId('admin-system')},
        {name: 'admin-users', path: () => '/admin/users', ready: (page) => page.getByTestId('admin-users')},
        {name: 'dinner', path: () => '/dinner', ready: (page) => page.getByTestId('dinner-detail-panel')},
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
    })

    test.beforeEach(() => {
        // Dev server compiles each route lazily on first visit; hydration polling adds up to ~15s
        test.setTimeout(90_000)
    })

    const measureHorizontalOverflow = (page: Page) =>
        page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

    for (const {name, path, ready, reveal, scrollBox} of PAGES) {
        test(`GIVEN a 375px viewport WHEN ${name} renders THEN the page does not scroll horizontally`, async ({page}) => {
            const url = path()

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

            // THEN: nothing renders wider than the viewport
            const overflow = await measureHorizontalOverflow(page)
            expect(overflow, `${url} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(0)

            if (scrollBox) {
                const inner = await scrollBox(page).evaluate(box => box.scrollWidth - box.clientWidth)
                expect(inner, `${url} (${name}) scrolls sideways inside its table by ${inner}px`).toBeLessThanOrEqual(0)
            }
        })
    }
})
