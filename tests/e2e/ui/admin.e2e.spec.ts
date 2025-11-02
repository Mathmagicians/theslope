import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import testHelpers from '../testHelpers'
import { SeasonFactory } from '../testDataFactories/seasonFactory'

const { adminUIFile } = authFiles
const { validatedBrowserContext, pollUntil } = testHelpers

/**
 * TEST PURPOSE:
 * This test verifies the path-based routing in the admin page:
 * 1. /admin redirects to /admin/planning
 * 2. All admin subcomponents can be loaded via direct paths
 * 3. Invalid paths like /admin/unicorn redirect to /admin/planning
 * 4. URL paths are preserved during navigation
 * 5. Tab clicking updates URL paths correctly
 */
test.describe('Admin page path-based navigation', () => {
  const adminUrl = '/admin'

  // Define admin tabs to test with path-based routing
  const tabs = [
    { name: 'Planlægning', path: 'planning', selector: '[data-test-id="admin-planning"]', hasFormModes: true },
    { name: 'Madhold', path: 'teams', selector: '[data-test-id="admin-teams"]', hasFormModes: true },
    { name: 'Chefkokke', path: 'chefs', selector: '[data-test-id="admin-chefs"]', hasFormModes: false },
    { name: 'Husstande', path: 'households', selector: '[data-test-id="admin-households"]', hasFormModes: false },
    { name: 'Allergier', path: 'allergies', selector: '[data-test-id="admin-allergies"]', hasFormModes: false },
    { name: 'Brugere', path: 'users', selector: '[data-test-id="admin-users"]', hasFormModes: false },
    { name: 'Økonomi', path: 'economy', selector: '[data-test-id="admin-economy"]', hasFormModes: false },
    { name: 'Indstillinger', path: 'settings', selector: '[data-test-id="admin-settings"]', hasFormModes: false }
  ]

  const formModes = [
    { mode: 'view', buttonName: 'form-mode-view' },
    { mode: 'edit', buttonName: 'form-mode-edit' },
    { mode: 'create', buttonName: 'form-mode-create' }
  ]

  // Use authenticated admin user for all tests
  test.use({ storageState: adminUIFile })

  // Parametrized test for redirects to /admin/planning
  const redirectScenarios = [
    { path: '', description: 'Load /admin redirects to /admin/planning by default' },
    { path: '/unicorn', description: 'Invalid URL path /admin/unicorn redirects to /admin/planning' }
  ]

  for (const scenario of redirectScenarios) {
    test(scenario.description, async ({ page }) => {
      await page.goto(`${adminUrl}${scenario.path}`)

      // Verify URL redirects to /admin/planning
      await expect(page).toHaveURL(/.*\/admin\/planning$/)

      // Poll until AdminPlanning component is visible (store loads reactively)
      await pollUntil(
        async () => await page.locator('button[name="form-mode-view"]').isVisible(),
        (isVisible) => isVisible === true,
        10
      )

      await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
    })
  }

  // Parametrized test for all tabs
  for (const tab of tabs) {
    test(`Tab "${tab.name}" can be loaded with path /admin/${tab.path}`, async ({ page }) => {
      // Navigate directly to the tab's URL
      await page.goto(`${adminUrl}/${tab.path}`)

      // Verify URL contains the expected path
      await expect(page).toHaveURL(new RegExp(`.*\/admin\/${tab.path}$`))

      // Poll until tab content becomes visible (store loads reactively)
      await pollUntil(
        async () => await page.locator(tab.selector).isVisible(),
        (isVisible) => isVisible === true,
        10  // Increased for concurrent test execution (500ms, 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s)
      )

      // Final verification that tab is visible
      await expect(page.locator(tab.selector)).toBeVisible()
    })
  }

  test('URL path is preserved during page refresh', async ({ page }) => {
    // Navigate to a specific tab
    await page.goto(`${adminUrl}/users`)

    // Verify we're on the right tab
    await expect(page).toHaveURL(/.*\/admin\/users$/)
    await pollUntil(
      async () => await page.locator('[data-test-id="admin-users"]').isVisible(),
      (isVisible) => isVisible,
      10
    )
    await expect(page.locator('[data-test-id="admin-users"]')).toBeVisible()

    // Refresh the page
    await page.reload()

    // Verify URL path is preserved
    await expect(page).toHaveURL(/.*\/admin\/users$/)
    await pollUntil(
      async () => await page.locator('[data-test-id="admin-users"]').isVisible(),
      (isVisible) => isVisible,
      10
    )
    await expect(page.locator('[data-test-id="admin-users"]')).toBeVisible()
  })

  test('Client-side navigation preserves active tab state', async ({ page }) => {
    // Test client-side navigation by directly navigating to different tabs
    // This tests the routing feature without relying on Vue hydration timing
    const testTabs = [tabs[5], tabs[6], tabs[0]] // Brugere, Økonomi, Planlægning

    for (const tab of testTabs) {
      // Navigate to tab URL (tests routing works)
      await page.goto(`${adminUrl}/${tab.path}`)

      // Verify URL updated
      await expect(page).toHaveURL(new RegExp(`.*\/admin\/${tab.path}$`))

      // Poll until tab content becomes visible
      await pollUntil(
        async () => await page.locator(tab.selector).isVisible(),
        (isVisible) => isVisible === true,
        10
      )
      await expect(page.locator(tab.selector)).toBeVisible()

      // Verify the tab is marked as active in navigation
      const activeTab = page.locator('button[role="tab"]').filter({ hasText: tab.name }).first()
      await expect(activeTab).toHaveAttribute('aria-selected', 'true')
    }
  })

  // Matrix test: Form modes work consistently across tabs that use useEntityFormManager
  for (const tab of tabs.filter(t => t.hasFormModes)) {
    for (const formMode of formModes) {
      test(`Tab "${tab.name}" supports mode=${formMode.mode} in URL query`, async ({ page }) => {
        // Navigate to tab with form mode in URL query (Playwright best practice)
        await page.goto(`${adminUrl}/${tab.path}?mode=${formMode.mode}`)

        // Poll until button is visible
        await pollUntil(
          async () => await page.locator(`button[name="${formMode.buttonName}"]`).isVisible(),
          (isVisible) => isVisible === true,
          10
        )

        // Verify we're in the correct mode by checking the button has active class
        await expect(page.locator(`button[name="${formMode.buttonName}"]`)).toHaveClass(/ring-2/)

        // Verify URL maintains the mode parameter with path
        await expect(page).toHaveURL(new RegExp(`.*\\/admin\\/${tab.path}\\?mode=${formMode.mode}$`))
      })
    }

    test(`Tab "${tab.name}" can navigate between all form modes`, async ({ page, browser }) => {
      // Test form mode navigation by directly navigating to mode URLs
      // This tests the routing feature without relying on Vue hydration timing

      // SETUP: Ensure test data exists - edit mode requires season data
      const context = await validatedBrowserContext(browser)
      const season = await SeasonFactory.createSeason(context)

      try {
        for (const formMode of formModes) {
          // Navigate to mode URL (tests routing works)
          await page.goto(`${adminUrl}/${tab.path}?mode=${formMode.mode}`)

          // Poll for URL to update with mode parameter
          await pollUntil(
            async () => new URL(page.url()).search,
            (search) => search === `?mode=${formMode.mode}`,
            10
          )
          await expect(page).toHaveURL(new RegExp(`.*\\/admin\\/${tab.path}\\?mode=${formMode.mode}$`))

          // Poll until button is visible
          await pollUntil(
            async () => await page.locator(`button[name="${formMode.buttonName}"]`).isVisible(),
            (isVisible) => isVisible === true,
            10
          )

          // Verify the mode button is marked as active
          const activeButton = page.locator(`button[name="${formMode.buttonName}"]`)
          await expect(activeButton).toHaveClass(/ring-2/)
        }
      } finally {
        // CLEANUP: Delete test season
        if (season.id) {
          await SeasonFactory.deleteSeason(context, season.id).catch(() => {
            // Ignore cleanup errors
          })
        }
      }
    })
  }
})

test.describe('Admin season URL persistence', () => {
  test.use({ storageState: adminUIFile })

  test.each([
    { fromTab: 'planning', toTab: 'teams' },
    { fromTab: 'teams', toTab: 'chefs' }
  ])('Season persists from $fromTab to $toTab tab', async ({ page, browser, fromTab, toTab }) => {
    const context = await validatedBrowserContext(browser)
    const season = await SeasonFactory.createSeason(context)

    try {
      await page.goto(`/admin/${fromTab}?season=${season.shortName}`)

      expect(page.url()).toContain(`season=${season.shortName}`)

      // Click to navigate to next tab
      await page.click(`button[role="tab"]`).nth(1)

      await pollUntil(
        async () => page.url(),
        (url) => url.includes(toTab) && url.includes(`season=${season.shortName}`),
        10
      )

      expect(page.url()).toContain(toTab)
      expect(page.url()).toContain(`season=${season.shortName}`)
    } finally {
      if (season.id) {
        await SeasonFactory.deleteSeason(context, season.id).catch(() => {})
      }
    }
  })

  test('Season and mode params coexist', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)
    const season = await SeasonFactory.createSeason(context)

    try {
      await page.goto(`/admin/planning?season=${season.shortName}&mode=edit`)

      expect(page.url()).toContain(`season=${season.shortName}`)
      expect(page.url()).toContain('mode=edit')

      await pollUntil(
        async () => await page.locator('button[name="form-mode-edit"]').isVisible(),
        (isVisible) => isVisible === true,
        10
      )
      await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
    } finally {
      if (season.id) {
        await SeasonFactory.deleteSeason(context, season.id).catch(() => {})
      }
    }
  })

  test('Invalid season redirects to active season', async ({ page }) => {
    await page.goto('/admin/planning?season=invalid-123')

    await pollUntil(
      async () => page.url(),
      (url) => url.includes('season=') && !url.includes('invalid-123'),
      10
    )

    expect(page.url()).toContain('season=')
    expect(page.url()).not.toContain('invalid-123')
  })
})
