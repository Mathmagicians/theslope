import {test, expect} from '@playwright/test'
import {authFiles} from '../config'
import testHelpers from '../testHelpers'
import {HouseholdFactory} from '../testDataFactories/householdFactory'

const {adminUIFile} = authFiles
const {validatedBrowserContext, pollUntil} = testHelpers

test.describe('Household tab navigation', () => {
    let householdId: number
    let shortName: string

    const tabs = [
        {name: 'Tilmeldinger', path: 'bookings', selector: '[data-test-id="household-bookings"]'},
        {name: 'Husstanden', path: 'members', selector: '[data-test-id="household-members"]'},
        {name: 'Allergier', path: 'allergies', selector: '[data-test-id="household-allergies"]'},
        {name: 'Økonomi', path: 'economy', selector: '[data-test-id="household-economy"]'},
        {name: 'Indstillinger', path: 'settings', selector: '[data-test-id="household-settings"]'}
    ]

    const defaultTab = tabs[0]

    const buildUrl = (tabPath: string, query?: string) =>
        `/household/${encodeURIComponent(shortName)}/${tabPath}${query ? `?${query}` : ''}`

    const navigateToTab = async (page: any, tab: typeof tabs[0]) => {
        await page.goto(buildUrl(tab.path))
        await expect(page).toHaveURL(buildUrl(tab.path))
        await pollUntil(
            async () => await page.locator(tab.selector).isVisible(),
            (isVisible) => isVisible,
            10
        )
    }

    test.use({storageState: adminUIFile})

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const household = await HouseholdFactory.createHousehold(context, 'TestHousehold-TabNav')
        householdId = household.id
        shortName = household.shortName
    })

    test.afterAll(async ({browser}) => {
        if (householdId) {
            const context = await validatedBrowserContext(browser)
            await HouseholdFactory.deleteHousehold(context, householdId).catch(() => {
            })
        }
    })

    test('Base URL redirects to default tab', async ({page}) => {
        await page.goto(`/household/${encodeURIComponent(shortName)}`)

        await pollUntil(
            async () => page.url(),
            (url) => url.includes(buildUrl(defaultTab.path)),
            5
        )
        expect(page.url()).toContain(buildUrl(defaultTab.path))

        await pollUntil(
            async () => await page.locator(defaultTab.selector).isVisible(),
            (isVisible) => isVisible,
            10
        )
    })

    test('Invalid tab redirects to default tab', async ({page}) => {
        await page.goto(buildUrl('unicorn'))

        await pollUntil(
            async () => page.url(),
            (url) => url.includes(buildUrl(defaultTab.path)),
            5
        )
        expect(page.url()).toContain(buildUrl(defaultTab.path))

        await pollUntil(
            async () => await page.locator(defaultTab.selector).isVisible(),
            (isVisible) => isVisible,
            10
        )
    })

    test('URL path preserved on refresh', async ({page}) => {
        const testTab = tabs[1]
        await navigateToTab(page, testTab)
        await page.reload()
        await expect(page).toHaveURL(buildUrl(testTab.path))
        await pollUntil(
            async () => await page.locator(testTab.selector).isVisible(),
            (isVisible) => isVisible,
            10
        )
    })

    test('Query params preserved when switching tabs', async ({page}) => {
        const query = 'date=2025-01-15'
        await page.goto(buildUrl(tabs[0].path, query))

        expect(page.url()).toContain(encodeURIComponent(shortName))
        expect(page.url()).toContain(query)

        await pollUntil(
            async () => await page.locator(tabs[0].selector).isVisible(),
            (isVisible) => isVisible,
            10
        )

        await page.goto(buildUrl(tabs[1].path, query))

        expect(page.url()).toContain(encodeURIComponent(shortName))
        expect(page.url()).toContain(query)

        await pollUntil(
            async () => await page.locator(tabs[1].selector).isVisible(),
            (isVisible) => isVisible,
            10
        )
    })

    test('Shortname preserved across all tab switches', async ({page}) => {
        for (const tab of tabs) {
            await navigateToTab(page, tab)
            expect(page.url()).toContain(shortName)
        }
    })

    for (const tab of tabs) {
        test(`Tab "${tab.name}" accessible at /${tab.path}`, async ({page}) => {
            await navigateToTab(page, tab)

            const activeTab = page.locator('button[role="tab"]').filter({hasText: tab.name}).first()
            await expect(activeTab).toHaveAttribute('aria-selected', 'true')
        })
    }
})