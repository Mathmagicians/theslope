import { test, expect } from '@playwright/test'
import { formatDate } from '~/utils/date'
import { authFiles } from '../config'
import * as fs from 'fs/promises'

const { adminUIFile } = authFiles
/**
 * TEST PURPOSE:
 * This test specifically targets the AdminSeason form submission.
 * We want to verify the complete flow from form submission to server response:
 * 1. CreateSeason form can be submitted
 *  2. The form submission does NOT include an 'id' property in the request payload
 * 3. The server processes the request successfully
 * 4. The server response includes a valid ID for the newly created season
 *  5. User can see the newly created form in view mode
 * 
 * All three verifications are essential parts of this test and must be maintained:
 * - Request payload verification (no ID)
 * - Response status code verification (201 Created)
 * - Response data verification (has valid ID for cleanup)
 * 
 * TEST FLOW:
 * 1. Navigate to admin page
 * 2. First click the mode selector to enter CREATE mode
 * 3. Wait for form to appear
 * 4. Fill out form with test data
 * 5. Submit form and capture network request
 * 6. Verify no ID in request payload
 * 7. Verify server response status (201 Created)
 * 8. Verify response contains a valid ID for cleanup
 */
test.describe('AdminSeason form', () => {
  const headers = { 'Content-Type': 'application/json' }
  const createEnpoint = '/api/admin/season'
  const adminPage = '/admin'
  const timeout = 10_000

  // Variable to store created season ID for cleanup
  let createdSeasonId: number | undefined

  // Use authenticated admin user for all tests
  test.use({ storageState: adminUIFile })
  //test.slow()

  // First a simple test just to check we can load the admin page
  test('Can load admin page', async ({ page }) => {
    // Navigate to admin page and verify response
    const response = await page.goto(adminPage)
    expect(response?.status()).toBe(200)
  })
  
  // Test that focuses on form submission flow
  test('Create season form happy day flow', async ({ page }) => {
    // Navigate to admin page
    await page.goto('/admin')
    await page.waitForURL('/admin')
    
    // Wait for the page to be fully loaded and network to be idle
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')
    
    // Explicitly wait for the form mode selector buttons to appear
    await page.waitForSelector('button[name="form-mode-create"]', { state: 'visible', timeout: timeout })
    await page.screenshot({ path: 'docs/screenshots/admin/create-season-before-create.png', fullPage: true })
    
    // Save complete HTML snapshot for debugging
    const html = await page.content()
    await fs.writeFile('docs/screenshots/admin/create-season-before-create.html', html)
    
    // Locate and click the create button by its exact name attribute
    const createButton = await page.locator('button[name="form-mode-create"]')
    
    // Assert that we found exactly one button (not zero or multiple)
    await expect(createButton).toHaveCount(1)
    
    // Assert that the button is visible and enabled before clicking
    await expect(createButton).toBeVisible()
    await expect(createButton).toBeEnabled()
    
    // APPROACH 1: Using Playwright's native click method (commented out)
    /*
    // Click the button and wait for any navigation or form changes to complete
    await createButton.click({ force: true }) // Use force option to ensure click works
    
    // Give more time for the UI to update and form to appear properly
    await page.waitForLoadState('networkidle')
    await page.waitForLoadState('domcontentloaded')
    
    // Form takes 3-5 seconds to load properly, add a longer wait time
    await page.waitForTimeout(5000)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForSelector('#seasonForm', { state: 'visible', timeout: timeout })
    await page.waitForTimeout(500) // Small wait to ensure stability
    */
    
    // APPROACH 2: JavaScript evaluation click
    // Try a more direct approach to click the button
    // Use page.evaluate to click the button directly in the browser context
    await page.evaluate(() => {
      const button = document.querySelector('button[name="form-mode-create"]');
      if (button) button.click();
    });
    
    // Wait for page to process the click
    await page.waitForTimeout(1000)
    
    // Give more time for the UI to update
    await page.waitForLoadState('networkidle')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(5000) // Add a long wait to ensure the form is fully loaded
    
    // Wait for form to be fully loaded and visible
    await page.waitForSelector('#seasonForm', { state: 'visible', timeout: timeout })
    
    // Take a screenshot of the form in create mode
    await page.screenshot({ path: 'docs/screenshots/admin/create-season-create-mode.png', fullPage: true })
    
    // Save HTML immediately after form is visible
    await page.waitForLoadState('networkidle')
    const htmlAfterFormVisible = await page.content()
    await fs.writeFile('docs/screenshots/admin/form-visible.html', htmlAfterFormVisible)
    
    // Log form state immediately
    await page.evaluate(() => {
      // Check if we're in create mode
      const createModeButton = document.querySelector('button[name="form-mode-create"]');
      const isCreateButtonActive = createModeButton?.classList.contains('bg-orange-500');
      console.log('Create button active:', isCreateButtonActive);
      
      // Check if date inputs are present
      const dateInputs = document.querySelectorAll('#seasonForm input:not([disabled])');
      console.log('Enabled inputs count:', dateInputs.length);
      
      // Check overall form state
      const form = document.querySelector('#seasonForm');
      const formHTML = form?.outerHTML;
      return { isCreateButtonActive, enabledInputsCount: dateInputs.length, formHTML };
    }).then(result => {
      fs.writeFile('docs/screenshots/admin/form-state-create-mode.json', 
                  JSON.stringify(result, null, 2));
    });

    // Verify form appears
    await expect(page.locator('#seasonForm')).toBeVisible()

    const testSalt  =  Date.now()%10_000
    const year =2025+testSalt
    // Fill out the form with test data for 2025
    const startDate = formatDate(new Date(year, 0, 1))
    const endDate = formatDate(new Date(year, 3, 1))
    
    // Take an intermediate screenshot to see if the form is still in create mode
    await page.screenshot({ path: 'docs/screenshots/admin/form-before-wait.png', fullPage: true })
    
    // IMPORTANT: Based on the error, navigation is occurring at this point
    // Let's wait for it to complete before proceeding
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Give it time to stabilize after navigation
    
    // Now add our usual waiting, which might be causing the issue
    await page.waitForLoadState('networkidle')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000) // Extra wait to ensure stability
    
    // Take a screenshot before filling the date inputs
    await page.screenshot({ path: 'docs/screenshots/admin/before-filling-dates.png', fullPage: true })
    
    // Log form state before filling
    await page.evaluate(() => {
      // Check if we're in create mode
      const createModeButton = document.querySelector('button[name="form-mode-create"]');
      const isCreateButtonActive = createModeButton?.classList.contains('bg-orange-500');
      console.log('Create button active before filling:', isCreateButtonActive);
      
      // Check if date inputs are present
      const dateInputs = document.querySelectorAll('#seasonForm input:not([disabled])');
      console.log('Enabled inputs count before filling:', dateInputs.length);
      
      // Log input names for debugging
      const inputNames = Array.from(dateInputs).map(input => input.name);
      console.log('Enabled input names:', inputNames);
      
      return { 
        isCreateButtonActive, 
        enabledInputsCount: dateInputs.length, 
        inputNames
      };
    }).then(result => {
      fs.writeFile('docs/screenshots/admin/form-state-before-filling.json', 
                  JSON.stringify(result, null, 2));
    });
    
    // Check we're still on the admin page
    expect(page.url()).toContain('/admin')
    
    // Wait for form to be fully visible and loaded
    await page.waitForSelector('#seasonForm', { state: 'visible', timeout: timeout })
    
    // Wait more aggressively for the DOM to stabilize
    await page.waitForLoadState('networkidle')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(5000) // More aggressive wait for component initialization
    
    // Wait for any UInput elements to appear (they should contain our date inputs)
    await page.waitForSelector('#seasonForm input', { state: 'visible', timeout: timeout })
    
    // Take another screenshot to verify the form structure after waiting
    await page.screenshot({ path: 'docs/screenshots/admin/after-waiting-for-form.png', fullPage: true })
    
    // Find the UInput elements - use more general selectors first to verify what's available
    const allInputs = await page.locator('#seasonForm input').all();
    await expect(allInputs.length).toBeGreaterThan(0);
    
    // Look for date inputs by examining attributes in the DOM
    const dateInputs = await page.locator('#seasonForm input[type="string"], #seasonForm input[placeholder*="/"]').all();
    await expect(dateInputs.length).toBeGreaterThan(0);
    
    // Now use more specific selectors based on attributes we know exist
    const startInputSelector = '#seasonForm input[name="start"]'
    const endInputSelector = '#seasonForm input[name="end"]'
    
    // Get references to the inputs
    const startInput = page.locator(startInputSelector).first()
    const endInput = page.locator(endInputSelector).first()
    
    // Assert that both inputs are available in the DOM and visible
    await expect(startInput).toHaveCount(1, { timeout: timeout })
    await expect(endInput).toHaveCount(1, { timeout: timeout })
    await expect(startInput).toBeVisible({ timeout: timeout })
    await expect(endInput).toBeVisible({ timeout: timeout })
    
    // Fill the inputs directly
    await startInput.fill(startDate)
    await page.waitForTimeout(500) // Small wait between inputs
    await endInput.fill(endDate)
    
    // Take a screenshot after filling the inputs
    await page.screenshot({ path: 'docs/screenshots/admin/after-filling-dates.png', fullPage: true })
    
    // Delete the single holiday entry that exists
    const deleteHolidayButton = page.locator('#seasonForm button:has(.i-heroicons-trash), #seasonForm button.delete-holiday, #seasonForm button:has(i.trash), #seasonForm .remove-item').first()
    await expect(deleteHolidayButton).toBeVisible({ timeout: timeout })
    await deleteHolidayButton.click()
    
    // Take a screenshot after deleting the holiday
    await page.screenshot({ path: 'docs/screenshots/admin/after-delete-holiday.png', fullPage: true })
    
    // Find and verify the submit button is visible
    const submitButton = page.locator('button[name="submit-season"]')
    await expect(submitButton).toBeVisible()
    
    // Now click the submit button
    await submitButton.click()
    await page.waitForLoadState('networkidle')

    // Setup promise for request and response to the API
    const requestPromise = page.waitForRequest(request =>
            request.url().includes(createEnpoint) &&
            request.method() === 'PUT',
        { timeout: timeout })

    const responsePromise = page.waitForResponse(
        response => response.url().includes(createEnpoint) &&
            response.request().method() === 'PUT',
        { timeout: timeout })

    // Submit the form
    await submitButton.click()

    // Wait for the actual request to be sent
    const request = await requestPromise
    expect(request).toBeDefined()
    expect(request.postDataJSON()).not.toHaveProperty('id')
    
    // Verify response is successful
    const response = await responsePromise
    expect(response.status()).toBe(201)

    
    // Get ID from response for cleanup
    const responseData = await response.json()
    createdSeasonId = responseData.id
    expect(typeof createdSeasonId).toBe('number')
  })
  
  // Cleanup after all tests
  test.afterAll(async ({ request }) => {
    // Only run cleanup if we created a season
    if (createdSeasonId) {
      try {
        const deleteResponse = await request.delete(`/api/admin/season/${createdSeasonId}`, {
          headers
        })
        expect(deleteResponse.status()).toBe(200)
      } catch (error) {
        console.error(`Failed to delete test season with ID ${createdSeasonId}`)
      }
    }
  })
})
