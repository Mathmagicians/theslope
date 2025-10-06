import { test, expect } from '@playwright/test'
import { authFiles } from '../config'

const { adminUIFile } = authFiles

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

  test('Form mode in URL query parameter works with paths', async ({ page }) => {
    // Navigate to admin page with edit mode - query params with path
    await page.goto(`${adminUrl}/planning?mode=edit`)
    await page.waitForLoadState('networkidle')

    // Verify we're in edit mode by checking the edit button has active class
    await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)

    // Verify URL maintains the mode parameter with path
    await expect(page).toHaveURL(/.*\/admin\/planning\?mode=edit$/)

    // Switch to create mode using the UI
    await page.locator('button[name="form-mode-create"]').click()
    await page.waitForLoadState('networkidle')

    // Verify URL updates to create mode
    await expect(page).toHaveURL(/.*\/admin\/planning\?mode=create$/)

    // Switch to view mode
    await page.locator('button[name="form-mode-view"]').click()
    await page.waitForLoadState('networkidle')

    // Verify URL updates to view mode or removes mode parameter
    await expect(page).toHaveURL(/.*\/admin\/planning(\?mode=view)?$/)
  })
})