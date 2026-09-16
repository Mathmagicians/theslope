import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import { SeasonFactory } from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'

const { adminUIFile } = authFiles
const { validatedBrowserContext, doScreenshot, pollUntil, waitForHydration } = testHelpers

test.describe('AdminPlanning UI', () => {
  const adminPlanningUrl = '/admin/planning'
  const createdSeasonIds: number[] = []

  test.use({ storageState: adminUIFile })

  /**
   * The card renders behind the store loader; under parallel load the loader can stay
   * up for seconds, so wait for the card AND for hydration before the first click.
   */
  const openPlanning = async (page: import('@playwright/test').Page, url: string) => {
    await page.goto(url)
    await pollUntil(
      async () => await page.getByTestId('admin-planning').isVisible(),
      (isVisible) => isVisible,
      10
    )
    await pollUntil(
      async () => await page.getByText('Vi venter på data').isVisible(),
      (isVisible) => !isVisible,
      10
    )
    await waitForHydration(page)
  }

  test.afterAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
  })

  test('Can load admin planning page with season selector and create action', async ({ page }) => {
    await openPlanning(page, adminPlanningUrl)

    await doScreenshot(page, 'admin/admin-planning-loaded', true)

    await expect(page.getByTestId('season-selector')).toBeVisible()
    await expect(page.getByTestId('create-season')).toBeVisible()
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

  test('GIVEN season in view mode WHEN using the pencil, Annuller and Opret THEN the form follows without page reload', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)
    const season = await SeasonFactory.createSeason(context)
    createdSeasonIds.push(season.id!)

    // GIVEN: view mode with the season loaded (full page load happens only here)
    await openPlanning(page, `${adminPlanningUrl}?season=${encodeURIComponent(season.shortName)}`)
    await expect(page.getByTestId('edit-season')).toBeVisible()

    // WHEN: opening the form from the pencil (client-side navigation, no reload)
    // Regression guard: a mode write that bypassed draft init showed an empty box
    await page.getByTestId('edit-season').click()

    // THEN: the edit form renders with the season loaded and the URL follows (ADR-006)
    await pollUntil(
      async () => await page.locator('form#seasonForm').isVisible(),
      (isVisible) => isVisible,
      10
    )
    await expect(page).toHaveURL(/.*mode=edit/)

    // AND: Annuller returns to view mode
    await page.getByTestId('cancel-season').click()
    await pollUntil(
      async () => await page.getByTestId('edit-season').isVisible(),
      (isVisible) => isVisible,
      10
    )
    await expect(page).toHaveURL(/.*mode=view/)

    // AND: Opret sæson opens the form on a fresh draft
    await page.getByTestId('create-season').click()
    await pollUntil(
      async () => await page.locator('form#seasonForm').isVisible(),
      (isVisible) => isVisible,
      10
    )
    await expect(page).toHaveURL(/.*mode=create/)
  })
})
