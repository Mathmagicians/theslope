import { test, expect, BrowserContext } from '@playwright/test'
import { authFiles } from '../config'
import { SeasonFactory } from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'
import { formatDate } from '~/utils/date'

const { adminUIFile } = authFiles
const { validatedBrowserContext } = testHelpers

/**
 * UI TEST STRATEGY:
 * - Focus on UI interaction (clicking, filling forms, navigation)
 * - Use API (SeasonFactory) for setup and verification
 * - Keep tests simple and focused on user workflow
 * - Data integrity verification belongs in API tests (season.e2e.spec.ts)
 */
test.describe('AdminSeason Form UI', () => {
  const adminPlanningUrl = '/admin/planning'
  let createdSeasonIds: number[] = []

  test.use({ storageState: adminUIFile })

  test.afterAll(async ({ browser }) => {
    // Cleanup using SeasonFactory
    if (createdSeasonIds.length > 0) {
      const context = await validatedBrowserContext(browser)
      for (const id of createdSeasonIds) {
        try {
          await SeasonFactory.deleteSeason(context, id)
        } catch (error) {
          console.error(`Failed to delete test season with ID ${id}:`, error)
        }
      }
    }
  })

  test('Can load admin planning page', async ({ page }) => {
    await page.goto(adminPlanningUrl)
    await page.waitForLoadState('networkidle')

    // Verify form mode buttons are visible
    await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
    await expect(page.locator('button[name="form-mode-edit"]')).toBeVisible()
    await expect(page.locator('button[name="form-mode-create"]')).toBeVisible()
  })

  test('GIVEN user in create mode WHEN filling and submitting form THEN season is created', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Navigate to create mode
    await page.goto(`${adminPlanningUrl}?mode=create`)
    await page.waitForLoadState('networkidle')

    // Verify we're in create mode
    await expect(page.locator('button[name="form-mode-create"]')).toHaveClass(/ring-2/)

    // Wait for form to be visible
    await expect(page.locator('form#seasonForm')).toBeVisible()

    // WHEN: Fill basic form fields
    const testSalt = Date.now() % 10000
    const year = 2025 + testSalt
    const startDate = formatDate(new Date(year, 0, 1))
    const endDate = formatDate(new Date(year, 5, 30))

    // Use scoped selectors - season dates picker has name="seasonDates"
    await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
    await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)

    // Submit form
    const submitButton = page.locator('button[name="submit-season"]')
    await expect(submitButton).toBeVisible()
    await submitButton.click()
    await page.waitForLoadState('networkidle')

    // THEN: Form should switch to view mode (indicating success)
    await expect(page.locator('button[name="form-mode-view"]')).toHaveClass(/ring-2/)

    // Verify season was created via API
    const response = await context.request.get('/api/admin/season')
    const seasons = await response.json()
    const createdSeason = seasons.find(s => s.shortName?.includes(`${year}`))

    expect(createdSeason).toBeDefined()
    createdSeasonIds.push(createdSeason.id)
  })

  test('GIVEN season exists WHEN user switches to edit mode THEN form shows season data', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Create season via API
    const season = await SeasonFactory.createSeason(context, {
      ...SeasonFactory.defaultSeason().season,
      holidays: []
    })
    createdSeasonIds.push(season.id)

    // Navigate to planning page
    await page.goto(adminPlanningUrl)
    await page.waitForLoadState('networkidle')

    // Select the season from dropdown
    const seasonSelector = page.locator('select[name="season-selector"]')
    await seasonSelector.selectOption({ label: season.shortName })

    // WHEN: Switch to edit mode
    await page.locator('button[name="form-mode-edit"]').click()
    await page.waitForLoadState('networkidle')

    // THEN: Form should be in edit mode with season data
    await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)
    await expect(page.locator('form#seasonForm')).toBeVisible()

    // Verify submit button is available
    await expect(page.locator('button[name="submit-season"]')).toBeVisible()
  })

  test('GIVEN user in create mode WHEN adding holiday period THEN holiday is added to list', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Navigate to create mode
    await page.goto(`${adminPlanningUrl}?mode=create`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('form#seasonForm')).toBeVisible()

    // Fill basic fields - use scoped selectors
    const startDate = formatDate(new Date(2025, 0, 1))
    const endDate = formatDate(new Date(2025, 5, 30))
    await page.locator('[name="seasonDates"] input[name="start"]').fill(startDate)
    await page.locator('[name="seasonDates"] input[name="end"]').fill(endDate)

    // WHEN: Add holiday period via UI
    const addHolidayButton = page.locator('button[name="holidayRangeAddToList"]')
    await expect(addHolidayButton).toBeVisible()
    await addHolidayButton.click()

    // THEN: Holiday item should appear in list
    const holidayItem = page.locator('[name^="holidayRangeList-0"]')
    await expect(holidayItem).toBeVisible()

    // Remove button should be visible for the holiday
    const removeButton = page.locator('button[name="holidayRangeRemoveFromList-0"]')
    await expect(removeButton).toBeVisible()

    // Submit and verify via API
    await page.locator('button[name="submit-season"]').click()
    await page.waitForLoadState('networkidle')

    // Verify season was created with holiday via API
    const response = await context.request.get('/api/admin/season')
    const seasons = await response.json()
    const createdSeason = seasons.find(s => s.shortName?.includes('2025'))

    expect(createdSeason).toBeDefined()
    expect(createdSeason.holidays.length).toBeGreaterThan(0)
    createdSeasonIds.push(createdSeason.id)
  })

  test('GIVEN season with holiday WHEN removing holiday via UI THEN holiday is removed from list', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Create season with one holiday via API
    const holidayPeriod = { start: new Date(2025, 11, 24), end: new Date(2026, 0, 2) }
    const season = await SeasonFactory.createSeason(context, {
      ...SeasonFactory.defaultSeason().season,
      holidays: [holidayPeriod]
    })
    createdSeasonIds.push(season.id)

    // Navigate and select season
    await page.goto(adminPlanningUrl)
    await page.waitForLoadState('networkidle')

    const seasonSelector = page.locator('select[name="season-selector"]')
    await seasonSelector.selectOption({ label: season.shortName })

    // Switch to edit mode
    await page.locator('button[name="form-mode-edit"]').click()
    await page.waitForLoadState('networkidle')

    // Verify holiday is shown
    const holidayItem = page.locator('[name^="holidayRangeList-0"]')
    await expect(holidayItem).toBeVisible()

    // WHEN: Remove holiday
    const removeButton = page.locator('button[name="holidayRangeRemoveFromList-0"]')
    await expect(removeButton).toBeVisible()
    await removeButton.click()

    // THEN: Holiday item should be removed from UI
    await expect(holidayItem).not.toBeVisible()

    // Submit and verify via API
    await page.locator('button[name="submit-season"]').click()
    await page.waitForLoadState('networkidle')

    // Verify holiday was removed via API
    const response = await context.request.get(`/api/admin/season/${season.id}`)
    const updatedSeason = await response.json()
    expect(updatedSeason.holidays).toHaveLength(0)
  })
})

/**
 * NOTE: Tests for dinner events and cooking teams creation belong in API tests
 * See: tests/e2e/api/admin/season.e2e.spec.ts
 * - PUT should create season with cooking teams (currently skipped)
 * - PUT should create season with dinner events (currently skipped)
 * - DELETE should cascade delete cooking teams (currently skipped)
 * - DELETE should cascade delete dinner events (currently skipped)
 */