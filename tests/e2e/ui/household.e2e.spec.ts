import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {HouseholdFactory} from '../testDataFactories/householdFactory'
import {SeasonFactory} from '../testDataFactories/seasonFactory'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil} = testHelpers

test.describe('Household tab navigation', () => {
    let householdId: number
    let shortName: string
    let seasonId: number

    const tabs = [
        {name: 'Tilmeldinger', path: 'bookings', selector: '[data-test-id="household-bookings"]'},
        {name: 'Husstanden', path: 'members', selector: '[data-test-id="household-members"]'},
        {name: 'Allergier', path: 'allergies', selector: '[data-test-id="household-allergies"]'},
        {name: 'Økonomi', path: 'economy', selector: '[data-test-id="household-economy"]'},
        {name: 'Indstillinger', path: 'settings', selector: '[data-test-id="household-settings"]'}
    ] as const

    const defaultTab = tabs[0]!

    type Tab = typeof tabs[number]

    const buildUrl = (tabPath: string, query?: string) =>
        `/household/${encodeURIComponent(shortName)}/${tabPath}${query ? `?${query}` : ''}`

    const waitForTabVisible = async (page: any, tab: Tab) => {
        await pollUntil(
            async () => {
                const isVisible = await page.locator(tab.selector).isVisible()
                return isVisible
            },
            (isVisible) => isVisible,
            10
        )
    }

    const navigateToTab = async (page: any, tab: Tab) => {
        await page.goto(buildUrl(tab.path))
        await expect(page).toHaveURL(buildUrl(tab.path))
        await waitForTabVisible(page, tab)
    }

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // Create season (required for bookings tab component to render)
        const season = await SeasonFactory.createSeason(context, {holidays: [], isActive: true})
        seasonId = season.id!

        // Create household
        const household = await HouseholdFactory.createHousehold(context, {name: 'TestHousehold-TabNav'})
        householdId = household.id
        shortName = household.shortName
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        if (householdId) {
            await HouseholdFactory.deleteHousehold(context, householdId).catch(() => {})
        }
        if (seasonId) {
            await SeasonFactory.cleanupSeasons(context, [seasonId]).catch(() => {})
        }
    })


    test('Base URL redirects to default tab', async ({page}) => {
        await page.goto(`/household/${encodeURIComponent(shortName)}`)

        await pollUntil(
            async () => page.url(),
            (url) => url.includes(buildUrl(defaultTab.path)),
            10
        )
        expect(page.url()).toContain(buildUrl(defaultTab.path))

        // Screenshot before waiting for component (debug flakiness)
        await page.screenshot({ path: `test-results/base-url-redirect-before-wait-${Date.now()}.png`, fullPage: true })

        await waitForTabVisible(page, defaultTab)
    })

    test('Invalid tab redirects to default tab', async ({page}) => {
        await page.goto(buildUrl('unicorn'))

        await pollUntil(
            async () => page.url(),
            (url) => url.includes(buildUrl(defaultTab.path)),
            10
        )
        expect(page.url()).toContain(buildUrl(defaultTab.path))
        await waitForTabVisible(page, defaultTab)
    })

    test('URL path preserved on refresh', async ({page}) => {
        const testTab = tabs[1]!
        await navigateToTab(page, testTab)
        await page.reload()
        await expect(page).toHaveURL(buildUrl(testTab.path))
        await waitForTabVisible(page, testTab)
    })

    test('Query params preserved when switching tabs', async ({page}) => {
        const query = 'date=2025-01-15'
        await page.goto(buildUrl(tabs[0]!.path, query))

        expect(page.url()).toContain(encodeURIComponent(shortName))
        expect(page.url()).toContain(query)
        await waitForTabVisible(page, tabs[0]!)

        await page.goto(buildUrl(tabs[1]!.path, query))

        expect(page.url()).toContain(encodeURIComponent(shortName))
        expect(page.url()).toContain(query)
        await waitForTabVisible(page, tabs[1]!)
    })

    for (const tab of tabs) {
        test(`Tab "${tab.name}" accessible at /${tab.path}`, async ({page}) => {
            await page.goto(buildUrl(tab.path))

            expect(page.url()).toContain(buildUrl(tab.path))
            await waitForTabVisible(page, tab)
        })
    }

    test('Tab aria-selected attribute updates correctly', async ({page}) => {
        // Test aria-selected on two tabs to verify state updates
        const testTabs = [tabs[0]!, tabs[2]!]

        for (const tab of testTabs) {
            await page.goto(buildUrl(tab.path))
            await waitForTabVisible(page, tab)

            const activeTab = page.locator('button[role="tab"]').filter({hasText: tab.name}).first()
            await expect(activeTab).toHaveAttribute('aria-selected', 'true')
        }
    })
})
