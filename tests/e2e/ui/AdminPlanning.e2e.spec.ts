import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import { SeasonFactory } from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'

const { adminUIFile } = authFiles
const { validatedBrowserContext, doScreenshot, selectDropdownOption } = testHelpers

/**
 * UI TEST: AdminPlanning Component
 * Tests season selector dropdown and mode button interactions
 */
test.describe('AdminPlanning UI', () => {
  const adminPlanningUrl = '/admin/planning'
  let createdSeasonIds: number[] = []

  test.use({ storageState: adminUIFile })

  test.afterAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
  })

  test('Can load admin planning page with season selector and mode buttons', async ({ page }) => {
    await page.goto(adminPlanningUrl)
    await page.waitForLoadState('networkidle')

    // Capture page state for documentation
    await doScreenshot(page, 'admin/admin-planning-loaded', true)

    // Verify data-testid attribute exists in HTML
    const html = await page.content()
    expect(html).toContain('data-testid="season-selector"')

    // Verify season selector is visible
    await expect(page.getByTestId('season-selector')).toBeVisible()

    // Verify form mode buttons are visible
    await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
    await expect(page.locator('button[name="form-mode-edit"]')).toBeVisible()
    await expect(page.locator('button[name="form-mode-create"]')).toBeVisible()
  })

  test('GIVEN season exists WHEN selecting from dropdown THEN season is displayed', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Create season via API
    const season = await SeasonFactory.createSeason(context, { holidays: [] })
    createdSeasonIds.push(season.id!)

    // Navigate to planning page
    await page.goto(adminPlanningUrl)
    await page.waitForLoadState('networkidle')

    // WHEN: Select season from dropdown
    await selectDropdownOption(page, 'season-selector', season.shortName)

    // THEN: Season should be displayed
    // Verify the selected season is shown (check combobox text or similar)
    await expect(page.getByTestId('season-selector')).toContainText(season.shortName?.substring(0, 10))
  })

  test('GIVEN season selected WHEN clicking edit mode THEN form shows in edit mode', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)

    // GIVEN: Create season via API
    const season = await SeasonFactory.createSeason(context, { holidays: [] })
    createdSeasonIds.push(season.id!)

    // Navigate and select season
    await page.goto(adminPlanningUrl)
    await page.waitForLoadState('networkidle')

    await selectDropdownOption(page, 'season-selector', season.shortName)

    // WHEN: Click edit mode button
    await page.locator('button[name="form-mode-edit"]').click()
    await page.waitForLoadState('networkidle')

    // THEN: Edit mode button should be active
    await expect(page.locator('button[name="form-mode-edit"]')).toHaveClass(/ring-2/)

    // Form should be visible
    await expect(page.locator('form#seasonForm')).toBeVisible()
  })

  test('WHEN clicking create mode THEN form shows in create mode', async ({ page }) => {
    // GIVEN: Navigate to planning page
    await page.goto(adminPlanningUrl)
    await page.waitForLoadState('networkidle')

    // WHEN: Click create mode button
    await page.locator('button[name="form-mode-create"]').click()
    await page.waitForLoadState('networkidle')

    // THEN: Create mode button should be active
    await expect(page.locator('button[name="form-mode-create"]')).toHaveClass(/ring-2/)

    // Form should be visible
    await expect(page.locator('form#seasonForm')).toBeVisible()
  })
})
