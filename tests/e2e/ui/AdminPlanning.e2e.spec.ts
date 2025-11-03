import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import { SeasonFactory } from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'

const { adminUIFile } = authFiles
const { validatedBrowserContext, doScreenshot, pollUntil } = testHelpers

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

    await pollUntil(
      async () => await page.locator('[data-test-id="admin-planning"]').isVisible(),
      (isVisible) => isVisible,
      10
    )

    await doScreenshot(page, 'admin/admin-planning-loaded', true)

    await expect(page.getByTestId('season-selector')).toBeVisible()
    await expect(page.locator('button[name="form-mode-view"]')).toBeVisible()
    await expect(page.locator('button[name="form-mode-edit"]')).toBeVisible()
    await expect(page.locator('button[name="form-mode-create"]')).toBeVisible()
  })

  test('GIVEN season exists WHEN navigating with season param THEN season is displayed', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)
    const season = await SeasonFactory.createSeason(context, { holidays: [] })
    createdSeasonIds.push(season.id!)

    await page.goto(`${adminPlanningUrl}?season=${season.shortName}`)

    expect(page.url()).toContain(`season=${season.shortName}`)
  })

  test('GIVEN season exists WHEN navigating to edit mode THEN form shows in edit mode', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)
    const season = await SeasonFactory.createSeason(context, { holidays: [] })
    createdSeasonIds.push(season.id!)

    await page.goto(`${adminPlanningUrl}?season=${season.shortName}&mode=edit`)

    expect(page.url()).toContain(`season=${season.shortName}`)
    expect(page.url()).toContain('mode=edit')

    await pollUntil(
      async () => await page.locator('form#seasonForm').isVisible(),
      (isVisible) => isVisible,
      10
    )
  })

  test('WHEN navigating to create mode THEN form shows in create mode', async ({ page }) => {
    await page.goto(`${adminPlanningUrl}?mode=create`)

    expect(page.url()).toContain('mode=create')

    await pollUntil(
      async () => await page.locator('form#seasonForm').isVisible(),
      (isVisible) => isVisible,
      10
    )
  })
})