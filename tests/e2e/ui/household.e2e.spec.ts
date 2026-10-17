import {test, expect, type Page} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import {SeasonFactory} from '../testDataFactories/seasonFactory'
import {BookingViewSchema} from '~/composables/useBookingView'

const {adminUIFile, memberUIFile} = authFiles
const {validatedBrowserContext, gotoHydrated, pollUntil, salt, temporaryAndRandom, doScreenshot, getSessionUserInfo} = testHelpers

test.describe('Household tab navigation', () => {
    // Unique salt per worker to avoid parallel test conflicts
    const testSalt = temporaryAndRandom()
    const createdHouseholdIds: number[] = []
    let shortName: string
    let pbsId: number

    const tabs = [
        {name: 'Tilmeldinger', path: 'bookings', selector: '[data-testid="household-bookings"]'},
        {name: 'Præferencer', path: 'members', selector: '[data-testid="household-members"]'},
        {name: 'Allergier', path: 'allergies', selector: '[data-testid="household-allergies"]'},
        {name: 'Økonomi', path: 'economy', selector: '[data-testid="household-economy"]'},
        {name: 'Indstillinger', path: 'settings', selector: '[data-testid="household-settings"]'}
    ] as const

    const defaultTab = tabs[0]!

    type Tab = typeof tabs[number]

    const buildUrl = (tabPath: string) => `/household/${encodeURIComponent(shortName)}/${tabPath}?pbs=${pbsId}`

    const waitForTabVisible = async (page: Page, tab: Tab) => {
        await pollUntil(() => page.locator(tab.selector).isVisible(), visible => visible)
    }

    /**
     * Navigate to tab and wait for it to be visible
     */
    const navigateToTab = async (page: Page, tab: Tab) => {
        await page.goto(buildUrl(tab.path))
        await expect(page).toHaveURL(buildUrl(tab.path))
        await waitForTabVisible(page, tab)
    }

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create active season (required for bookings tab component to render) - uses singleton to prevent parallel test conflicts
        // NOTE: Singleton is cleaned up by global teardown, not by this test
        await SeasonFactory.createActiveSeason(context, {holidays: []})

        // Create household with salted name for parallel safety
        const household = await HouseholdFactory.createHousehold(context, {name: salt('TabNav', testSalt)})
        createdHouseholdIds.push(household.id)
        shortName = household.shortName
        pbsId = household.pbsId
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    })


    test('Base URL redirects to default tab', async ({page}) => {
        await page.goto(`/household/${encodeURIComponent(shortName)}?pbs=${pbsId}`)

        await pollUntil(async () => page.url(), url => url.includes(buildUrl(defaultTab.path)))

        // Screenshot before waiting for component (debug flakiness)
        await page.screenshot({ path: `test-results/base-url-redirect-before-wait-${Date.now()}.png`, fullPage: true })

        await waitForTabVisible(page, defaultTab)
    })

    test('Invalid tab redirects to default tab', async ({page}) => {
        await page.goto(buildUrl('unicorn'))

        await pollUntil(async () => page.url(), url => url.includes(buildUrl(defaultTab.path)))
        await waitForTabVisible(page, defaultTab)
    })

    test('URL path preserved on refresh', async ({page}) => {
        const testTab = tabs[1]!
        await navigateToTab(page, testTab)

        await page.reload()
        await waitForTabVisible(page, testTab)

        await expect(page).toHaveURL(buildUrl(testTab.path))
    })

    for (const tab of tabs) {
        test(`Tab "${tab.name}" at /${tab.path} is the selected tab`, async ({page}) => {
            await page.goto(buildUrl(tab.path))
            await waitForTabVisible(page, tab)

            const activeTab = page.locator('button[role="tab"]').filter({hasText: tab.name}).first()
            await expect(activeTab).toHaveAttribute('aria-selected', 'true')

            // Documentation screenshot per tab; the members tab is pictured by HouseholdCard.e2e.spec.ts
            if (tab.path !== 'members') await doScreenshot(page, `household/household-${tab.path}`, true)
        })
    }
})

test.describe('Household PBS query param resolution', () => {
    const testSalt = temporaryAndRandom()
    const createdHouseholdIds: number[] = []
    let shortName: string
    let pbsId: number
    let myShortName: string
    let myPbsId: number

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        await SeasonFactory.createActiveSeason(context, {holidays: []})

        const household = await HouseholdFactory.createHousehold(context, {name: salt('PbsTest', testSalt)})
        createdHouseholdIds.push(household.id)
        shortName = household.shortName
        pbsId = household.pbsId

        const sessionInfo = await getSessionUserInfo(context)
        myShortName = sessionInfo.householdShortname
        myPbsId = sessionInfo.householdPbsId
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
    })

    test('Valid ?pbs= loads that household', async ({page}) => {
        await page.goto(`/household/${encodeURIComponent(shortName)}/bookings?pbs=${pbsId}`)

        await pollUntil(() => page.locator('[data-testid="household-bookings"]').isVisible(), visible => visible)

        expect(page.url()).toContain(`pbs=${pbsId}`)
    })

    test('Missing ?pbs= defaults to user own household', async ({page}) => {
        await page.goto(`/household/${encodeURIComponent(myShortName)}/bookings`)

        await pollUntil(() => page.locator('[data-testid="household-bookings"]').isVisible(), visible => visible)

        await pollUntil(async () => page.url(), url => url.includes(`pbs=${myPbsId}`))
    })

    const invalidPbsCases = [
        {description: 'unknown numeric', pbs: '99999'},
        {description: 'non-numeric', pbs: 'abc'},
    ] as const

    for (const {description, pbs} of invalidPbsCases) {
        test(`${description} ?pbs= falls back to user own household`, async ({page}) => {
            await page.goto(`/household/${encodeURIComponent(myShortName)}/bookings?pbs=${pbs}`)

            await pollUntil(() => page.locator('[data-testid="household-bookings"]').isVisible(), visible => visible)

            await pollUntil(async () => page.url(), url => url.includes(`pbs=${myPbsId}`))
        })
    }
})

/**
 * Visitor mode tests - parametrized by user context (admin vs member).
 *
 * Both contexts:
 * - See visitor banner with "anden husstand end din egen"
 *
 * Admin-only:
 * - Sees admin override button to unlock editing
 * - Has edit controls hidden until the override: the admin holds edit rights, so the hiding is the visitor gate's
 *
 * Member-only:
 * - No admin override button
 */
const editControlTestCases = [
    {
        name: 'Preferences',
        path: 'members',
        contentSelector: '[data-testid="household-members"]',
        hiddenSelectors: [
            {desc: 'pencil buttons', selector: 'table button:has([class*="i-heroicons-pencil"])'},
            {desc: 'save button', selector: '[data-testid="save-preferences"]'}
        ]
    },
    {
        name: 'Allergies',
        path: 'allergies',
        contentSelector: '[data-testid="household-allergies"]',
        hiddenSelectors: [
            {desc: 'pencil buttons', selector: 'table button:has([class*="i-heroicons-pencil"])'}
        ]
    },
    {
        name: 'Bookings (week view)',
        path: `bookings?view=${BookingViewSchema.enum.week}`,
        contentSelector: '[data-testid="booking-grid-view"]',
        hiddenSelectors: [
            {desc: 'grid edit button', selector: '[data-testid="grid-edit"]'}
        ]
    }
] as const

const visitorContexts = [
    {name: 'member', storageState: memberUIFile, expectAdminOverride: false, editControlCases: []},
    {name: 'admin', storageState: adminUIFile, expectAdminOverride: true, editControlCases: editControlTestCases}
] as const

for (const ctx of visitorContexts) {
    test.describe(`Visitor mode (${ctx.name}) - viewing another household`, () => {
        const testSalt = temporaryAndRandom()
        const createdHouseholdIds: number[] = []
        let shortName: string
        let pbsId: number

        test.use({storageState: ctx.storageState})

        test.beforeAll(async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Create active season (required for bookings tab) - singleton pattern
            await SeasonFactory.createActiveSeason(context, {holidays: []})

            // Create household - test user is NOT a member of this household
            const household = await HouseholdFactory.createHousehold(context, {name: salt(`Visitor-${ctx.name}`, testSalt)})
            createdHouseholdIds.push(household.id)
            shortName = household.shortName
            pbsId = household.pbsId
        })

        test.afterAll(async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            await HouseholdFactory.deleteHousehold(context, createdHouseholdIds)
        })

        test('Visitor banner is shown when visiting another household', async ({page}) => {
            await gotoHydrated(page, `/household/${encodeURIComponent(shortName)}/bookings?pbs=${pbsId}`)

            // Wait for page to load
            await expect(page.locator('[data-testid="household-bookings"]')).toBeVisible()

            // Visitor banner should be visible with generic text (not hardcoded to specific wording)
            const visitorBanner = page.locator('[data-testid="visitor-banner"]')
            await expect(visitorBanner).toBeVisible()
            await expect(visitorBanner).toContainText('anden husstand end din egen')

            // Admin override button: visible for admins, absent for members
            const adminOverrideBtn = page.getByTestId('admin-override-btn')
            if (ctx.expectAdminOverride) {
                await expect(adminOverrideBtn).toBeVisible()
            } else {
                await expect(adminOverrideBtn).toHaveCount(0)
            }
        })

        for (const testCase of ctx.editControlCases) {
            test(`${testCase.name} tab - edit controls hidden when visiting`, async ({page}) => {
                const separator = testCase.path.includes('?') ? '&' : '?'
                // Hydrated first: the edit controls are counted after the client has applied the permissions
                await gotoHydrated(page, `/household/${encodeURIComponent(shortName)}/${testCase.path}${separator}pbs=${pbsId}`)

                // Wait for page content to load
                await expect(page.locator(testCase.contentSelector)).toBeVisible()

                // Verify all edit controls are hidden (admin without override)
                for (const {desc, selector} of testCase.hiddenSelectors) {
                    const element = page.locator(selector)
                    await expect(element, `${desc} should be hidden`).toHaveCount(0)
                }
            })
        }
    })
}
