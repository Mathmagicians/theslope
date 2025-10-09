import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import testHelpers from '../testHelpers'
import { SeasonFactory } from '../testDataFactories/seasonFactory'

const { adminUIFile } = authFiles
const { validatedBrowserContext } = testHelpers

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
    { name: 'Planlægning', path: 'planning', selector: '[data-test-id="admin-planning"]' },
    { name: 'Madhold', path: 'teams', selector: '[data-test-id="admin-teams"]' },
    { name: 'Chefkokke', path: 'chefs', selector: '[data-test-id="admin-chefs"]' },
    { name: 'Husstande', path: 'households', selector: '[data-test-id="admin-households"]' },
    { name: 'Allergier', path: 'allergies', selector: '[data-test-id="admin-allergies"]' },
    { name: 'Brugere', path: 'users', selector: '[data-test-id="admin-users"]' },
    { name: 'Økonomi', path: 'economy', selector: '[data-test-id="admin-economy"]' },
    { name: 'Indstillinger', path: 'settings', selector: '[data-test-id="admin-settings"]' }
  ]

  // Use authenticated admin user for all tests
  test.use({ storageState: adminUIFile })

  test('Load /admin redirects to /admin/planning by default', async ({ page }) => {
    // Navigate to admin page
    const response = await page.goto(adminUrl)

    // Verify successful response or redirect
    expect([200, 302]).toContain(response?.status())

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Verify URL redirects to /admin/planning
    await expect(page).toHaveURL(/.*\/admin\/planning$/)

    // Verify the AdminPlanning component is visible
    await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
  })

  // Parametrized test for all tabs
  for (const tab of tabs) {
    test(`Tab "${tab.name}" can be loaded with path /admin/${tab.path}`, async ({ page }) => {
      // Navigate directly to the tab's URL
      await page.goto(`${adminUrl}/${tab.path}`)
      await page.waitForLoadState('networkidle')

      // Verify URL contains the expected path
      await expect(page).toHaveURL(new RegExp(`.*\/admin\/${tab.path}$`))

      // Verify the tab content is visible
      const contentLocator = page.locator(tab.selector)
      await expect(contentLocator).toBeVisible({ timeout: 5000 })
    })
  }

  test('Invalid URL path /admin/unicorn redirects to /admin/planning', async ({ page }) => {
    // Navigate to admin page with invalid path
    await page.goto(`${adminUrl}/unicorn`)
    await page.waitForLoadState('networkidle')

    // Verify URL is corrected to /admin/planning
    await expect(page).toHaveURL(/.*\/admin\/planning$/)

    // Verify the AdminPlanning component is visible
    await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
  })

  test('URL path is preserved during page refresh', async ({ page }) => {
    // Navigate to a specific tab
    await page.goto(`${adminUrl}/users`)
    await page.waitForLoadState('networkidle')

    // Verify we're on the right tab
    await expect(page).toHaveURL(/.*\/admin\/users$/)

    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify URL path is preserved
    await expect(page).toHaveURL(/.*\/admin\/users$/)
  })

  test('Clicking tabs updates URL path', async ({ page }) => {
    // Start at the default admin page
    await page.goto(adminUrl)
    await page.waitForLoadState('networkidle')

    // Verify we start with default tab (/admin/planning)
    await expect(page).toHaveURL(/.*\/admin\/planning$/)

    // Click on the "Brugere" (Users) tab
    // UTabs generates buttons with role="tab" and the label text
    const usersTab = page.locator('button[role="tab"]').filter({ hasText: 'Brugere' })
    await expect(usersTab).toBeVisible()
    await usersTab.click()
    await page.waitForLoadState('networkidle')

    // Verify URL path updated to /admin/users
    await expect(page).toHaveURL(/.*\/admin\/users$/)

    // Click on the "Økonomi" (Economy) tab
    const economyTab = page.locator('button[role="tab"]').filter({ hasText: 'Økonomi' })
    await expect(economyTab).toBeVisible()
    await economyTab.click()
    await page.waitForLoadState('networkidle')

    // Verify URL path updated to /admin/economy
    await expect(page).toHaveURL(/.*\/admin\/economy$/)

    // Click back to "Planlægning" (Planning) tab
    const planningTab = page.locator('button[role="tab"]').filter({ hasText: 'Planlægning' })
    await expect(planningTab).toBeVisible()
    await planningTab.click()
    await page.waitForLoadState('networkidle')

    // Verify URL path updated back to /admin/planning
    await expect(page).toHaveURL(/.*\/admin\/planning$/)
  })

  // Matrix test: Form modes work consistently across tabs that use useEntityFormManager
  const tabsWithFormModes = [
    { name: 'Planlægning', path: 'planning' },
    { name: 'Madhold', path: 'teams' }
  ]

  const formModes = [
    { mode: 'view', buttonName: 'form-mode-view' },
    { mode: 'edit', buttonName: 'form-mode-edit' },
    { mode: 'create', buttonName: 'form-mode-create' }
  ]

  for (const tab of tabsWithFormModes) {
    for (const formMode of formModes) {
      test(`Tab "${tab.name}" supports mode=${formMode.mode} in URL query`, async ({ page }) => {
        // Navigate to tab with form mode in URL query
        await page.goto(`${adminUrl}/${tab.path}?mode=${formMode.mode}`)
        await page.waitForLoadState('networkidle')

        // Verify we're in the correct mode by checking the button has active class
        await expect(page.locator(`button[name="${formMode.buttonName}"]`)).toHaveClass(/ring-2/)

        // Verify URL maintains the mode parameter with path
        await expect(page).toHaveURL(new RegExp(`.*\\/admin\\/${tab.path}\\?mode=${formMode.mode}$`))
      })
    }

    test(`Tab "${tab.name}" can switch between all form modes via UI`, async ({ page, browser }) => {
      // SETUP: Ensure test data exists - edit button is disabled when no seasons exist
      const context = await validatedBrowserContext(browser)

      // Create a season so edit mode is available
      const season = await SeasonFactory.createSeason(context)

      try {
        // Start in view mode
        await page.goto(`${adminUrl}/${tab.path}`)
        await page.waitForLoadState('networkidle')

        // Wait for data to load - edit button should be enabled when data is ready
        const editButton = page.locator('button[name="form-mode-edit"]')
        await expect(editButton).toBeEnabled({ timeout: 10000 })

        // Switch to edit mode
        await editButton.click()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(new RegExp(`.*\\/admin\\/${tab.path}\\?mode=edit$`))
        await expect(editButton).toHaveClass(/ring-2/)

        // Switch to create mode
        const createButton = page.locator('button[name="form-mode-create"]')
        await createButton.click()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(new RegExp(`.*\\/admin\\/${tab.path}\\?mode=create$`))
        await expect(createButton).toHaveClass(/ring-2/)

        // Switch back to view mode
        const viewButton = page.locator('button[name="form-mode-view"]')
        await viewButton.click()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(new RegExp(`.*\\/admin\\/${tab.path}(\\?mode=view)?$`))
        await expect(viewButton).toHaveClass(/ring-2/)
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