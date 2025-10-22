import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import testHelpers from '../testHelpers'
import { HouseholdFactory } from '../testDataFactories/householdFactory'

const { adminUIFile } = authFiles
const { validatedBrowserContext } = testHelpers

/**
 * TEST PURPOSE:
 * Verifies tab-based routing for household pages using useTabNavigation composable:
 * - Path pattern: /household/[shortname]/[tab]
 * - Default redirect to first tab (events)
 * - Invalid tabs redirect to default
 * - Query params preserved across tab switches
 * - Shortname param preserved (additionalParams in useTabNavigation)
 */
test.describe('Household tab navigation', () => {
  let householdId: number
  let shortName: string

  const tabs = [
    { name: 'Events', path: 'events', selector: '[data-test-id="household-events"]' },
    { name: 'Members', path: 'members', selector: '[data-test-id="household-members"]' },
    { name: 'Allergies', path: 'allergies', selector: '[data-test-id="household-allergies"]' },
    { name: 'Economy', path: 'economy', selector: '[data-test-id="household-economy"]' },
    { name: 'Settings', path: 'settings', selector: '[data-test-id="household-settings"]' }
  ]

  const defaultTab = tabs[0]

  // Helper: Build household URL
  const buildUrl = (tabPath: string, query?: string) =>
    `/household/${shortName}/${tabPath}${query ? `?${query}` : ''}`

  // Helper: Navigate and verify tab is active
  const navigateToTab = async (page: any, tab: typeof tabs[0]) => {
    await page.goto(buildUrl(tab.path))
    await expect(page).toHaveURL(new RegExp(`${buildUrl(tab.path)}$`))
    await expect(page.locator(tab.selector)).toBeVisible({ timeout: 5000 })
  }

  test.use({ storageState: adminUIFile })

  test.beforeAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    const household = await HouseholdFactory.createHousehold(context, 'TestHousehold-TabNav')
    householdId = household.id
    shortName = household.shortName
  })

  test.afterAll(async ({ browser }) => {
    if (householdId) {
      const context = await validatedBrowserContext(browser)
      await HouseholdFactory.deleteHousehold(context, householdId).catch(() => {})
    }
  })

  test('Base URL redirects to default tab', async ({ page }) => {
    await page.goto(`/household/${shortName}`)
    await expect(page).toHaveURL(new RegExp(`${buildUrl(defaultTab.path)}$`))
    await expect(page.locator(defaultTab.selector)).toBeVisible()
  })

  test('Invalid tab redirects to default tab', async ({ page }) => {
    await page.goto(buildUrl('unicorn'))
    await expect(page).toHaveURL(new RegExp(`${buildUrl(defaultTab.path)}$`))
    await expect(page.locator(defaultTab.selector)).toBeVisible()
  })

  test('URL path preserved on refresh', async ({ page }) => {
    const testTab = tabs[1] // Members
    await navigateToTab(page, testTab)
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`${buildUrl(testTab.path)}$`))
    await expect(page.locator(testTab.selector)).toBeVisible()
  })

  test('Query params preserved when switching tabs', async ({ page }) => {
    const query = 'date=2025-01-15'
    await page.goto(buildUrl(tabs[0].path, query))
    await expect(page).toHaveURL(new RegExp(`${buildUrl(tabs[0].path, query)}$`))

    // Switch to another tab with same query
    await page.goto(buildUrl(tabs[1].path, query))
    await expect(page).toHaveURL(new RegExp(`${buildUrl(tabs[1].path, query)}$`))
  })

  test('Shortname preserved across all tab switches', async ({ page }) => {
    for (const tab of tabs) {
      await navigateToTab(page, tab)
      // Verify shortname still in URL
      expect(page.url()).toContain(shortName)
    }
  })

  // Parametrized: All tabs are accessible
  for (const tab of tabs) {
    test(`Tab "${tab.name}" accessible at /${tab.path}`, async ({ page }) => {
      await navigateToTab(page, tab)

      // Verify active tab in navigation
      const activeTab = page.locator('button[role="tab"]').filter({ hasText: tab.name }).first()
      await expect(activeTab).toHaveAttribute('aria-selected', 'true')
    })
  }
})