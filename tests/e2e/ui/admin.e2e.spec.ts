import { test, expect } from '@playwright/test'
import { authFiles } from '../config'

const { adminUIFile } = authFiles

/**
 * TEST PURPOSE:
 * This test verifies the URL-based state management in the admin page:
 * 1. /admin can be loaded and automatically navigates to #adminplanning
 * 2. All admin subcomponents can be loaded by clicking tabs, with correct URL updates
 * 3. Invalid URL hash like #unicorn defaults to #adminplanning
 * 4. URL is preserved during navigation
 */
test.describe('Admin page URL navigation', () => {
  const adminUrl = '/admin'
  
  // Define admin tabs to test with data-test-id selectors
  const tabs = [
    { name: 'Planlægning', hash: 'adminplanning', selector: '[data-test-id="admin-planning"]' },
    { name: 'Husstande', hash: 'adminhouseholds', selector: '[data-test-id="admin-households"]' },
    { name: 'Allergier', hash: 'adminallergies', selector: '[data-test-id="admin-allergies"]' },
    { name: 'Brugere', hash: 'adminusers', selector: '[data-test-id="admin-users"]' },
    { name: 'Økonomi', hash: 'admineconomy', selector: '[data-test-id="admin-economy"]' },
    { name: 'Indstillinger', hash: 'adminsettings', selector: '[data-test-id="admin-settings"]' }
  ]

  // Use authenticated admin user for all tests
  test.use({ storageState: adminUIFile })

  test('Load /admin redirects to #adminplanning by default', async ({ page }) => {
    // Navigate to admin page
    const response = await page.goto(adminUrl)
    
    // Verify successful response
    expect(response?.status()).toBe(200)
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')
    
    // Verify URL contains #adminplanning
    await expect(page).toHaveURL(/.*#adminplanning/)
    
    // Verify the AdminPlanning component is visible
    await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
  })

  // Parametrized test for all tabs
  for (const tab of tabs) {
    test(`Tab "${tab.name}" can be loaded with hash #${tab.hash}`, async ({ page }) => {
      // Navigate directly to the tab's URL
      await page.goto(`${adminUrl}#${tab.hash}`)
      await page.waitForLoadState('networkidle')
      
      // Verify URL contains the expected hash
      await expect(page).toHaveURL(new RegExp(`.*#${tab.hash}`))
      
      // Verify the tab content is visible (use try/catch to handle components still under development)
      const contentLocator = page.locator(tab.selector)
      await expect(contentLocator).toBeVisible({ timeout: 5000 })
    })
  }

  test('Invalid URL hash #unicorn defaults to #adminplanning', async ({ page }) => {
    // Navigate to admin page with invalid hash
    await page.goto(`${adminUrl}#unicorn`)
    await page.waitForLoadState('networkidle')
    
    // Verify URL is corrected to #adminplanning
    await expect(page).toHaveURL(/.*#adminplanning/)
    
    // Verify the AdminPlanning component is visible
    await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
  })
  
  test('URL hash is preserved during page refresh', async ({ page }) => {
    // Navigate to a specific tab
    await page.goto(`${adminUrl}#adminusers`)
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the right tab
    await expect(page).toHaveURL(/.*#adminusers/)
    
    // Refresh the page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify URL hash is preserved
    await expect(page).toHaveURL(/.*#adminusers/)
  })
  
  test('Form mode in URL query parameter works', async ({ page }) => {
    // Navigate to admin page with edit mode - query params before hash
    await page.goto(`${adminUrl}?mode=edit#adminplanning`)
    await page.waitForLoadState('networkidle')
    
    // Verify we're in edit mode by checking the edit button has active class
    await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
    
    // Verify URL maintains the mode parameter
    await expect(page).toHaveURL(/.*\?mode=edit#adminplanning/)
    
    // Switch to create mode using the UI
    await page.locator('button[name="form-mode-create"]').click()
    await page.waitForLoadState('networkidle')
    
    // Verify URL updates to create mode
    await expect(page).toHaveURL(/.*\?mode=create#adminplanning/)
    
    // Switch to view mode
    await page.locator('button[name="form-mode-view"]').click()
    await page.waitForLoadState('networkidle')
    
    // Verify URL updates to view mode or removes mode parameter
    await expect(page).toHaveURL(/.*(\?mode=view)?#adminplanning/)
  })
  
  test.skip('Form state parameters in URL are applied to form', async ({ page }) => {
    // Create URL with form parameters
    const formParams = new URLSearchParams()
    formParams.set('mode', 'edit')
    formParams.set('ticketIsCancellableDaysBefore', '2')
    formParams.set('diningModeIsEditableMinutesBefore', '30')
    
    // Navigate to URL with form parameters - query params before hash
    await page.goto(`${adminUrl}?${formParams.toString()}#adminplanning`)
    await page.waitForLoadState('networkidle')
    
    // Verify we're in edit mode
    await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
    
    // Wait for form to load
    await expect(page.locator('#seasonForm')).toBeVisible()
    
    // Verify form field values match URL parameters
    // Note: The exact selectors may need to be adjusted based on your form implementation
    await expect(page.locator('input[name="cancellableDays"]')).toHaveValue('2')
    await expect(page.locator('input[name="editableMinutes"]')).toHaveValue('30')
  })
})