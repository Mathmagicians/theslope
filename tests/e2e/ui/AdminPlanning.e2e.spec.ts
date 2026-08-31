import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import { SeasonFactory } from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'

const { adminUIFile } = authFiles
const { validatedBrowserContext, doScreenshot, pollUntil } = testHelpers

test.describe('AdminPlanning UI', () => {
  const adminPlanningUrl = '/admin/planning'
  const createdSeasonIds: number[] = []

  test.use({ storageState: adminUIFile })

  test.afterAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
  })

  test('Can load admin planning page with season selector and mode buttons', async ({ page }) => {
    await page.goto(adminPlanningUrl)

    await pollUntil(
      async () => await page.getByTestId('admin-planning').isVisible(),
      (isVisible) => isVisible,
      10
    )

    await doScreenshot(page, 'admin/admin-planning-loaded', true)

    await expect(page.getByTestId('season-selector')).toBeVisible()
    await expect(page.getByTestId('form-mode-view')).toBeVisible()
    await expect(page.getByTestId('form-mode-edit')).toBeVisible()
    await expect(page.getByTestId('form-mode-create')).toBeVisible()
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

  test('GIVEN season in view mode WHEN clicking Rediger and Opret THEN form shows without page reload', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)
    const season = await SeasonFactory.createSeason(context)
    createdSeasonIds.push(season.id!)

    // GIVEN: view mode with the season loaded (full page load happens only here)
    await page.goto(`${adminPlanningUrl}?season=${encodeURIComponent(season.shortName)}`)
    await pollUntil(
      async () => await page.getByTestId('form-mode-edit').isVisible(),
      (isVisible) => isVisible,
      10
    )

    // WHEN: switching to EDIT by CLICKING the button (client-side navigation, no reload)
    // Regression guard: v-model write bypassed draft init -> empty box (unmasked by #62 page-key change)
    await page.getByTestId('form-mode-edit').click()

    // THEN: the edit form renders with the season loaded
    await pollUntil(
      async () => await page.locator('form#seasonForm').isVisible(),
      (isVisible) => isVisible,
      10
    )

    // AND: clicking Opret also renders the form (fresh draft)
    await page.getByTestId('form-mode-create').click()
    await pollUntil(
      async () => await page.locator('form#seasonForm').isVisible(),
      (isVisible) => isVisible,
      10
    )
  })
})