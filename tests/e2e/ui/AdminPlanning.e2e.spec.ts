import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import { SeasonFactory } from '../testDataFactories/seasonFactory'
import testHelpers from '../testHelpers'

const { adminUIFile } = authFiles
const { validatedBrowserContext, doScreenshot, pollUntil, gotoHydrated } = testHelpers

test.describe('AdminPlanning UI', () => {
  const adminPlanningUrl = '/admin/planning'
  const createdSeasonIds: number[] = []

  test.use({ storageState: adminUIFile })

  /**
   * The card renders behind the store loader; under parallel load the loader can stay
   * up for seconds, so wait for the card AND for hydration before the first click.
   */
  const openPlanning = async (page: import('@playwright/test').Page, url: string) => {
    await gotoHydrated(page, url)
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
  }

  test.afterAll(async ({ browser }) => {
    const context = await validatedBrowserContext(browser)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
  })

  test('GIVEN season in view mode WHEN using the pencil, Annuller and Opret THEN the form follows without page reload', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)
    const season = await SeasonFactory.createSeason(context)
    createdSeasonIds.push(season.id!)

    // GIVEN: view mode with the season loaded (full page load happens only here)
    await openPlanning(page, `${adminPlanningUrl}?season=${encodeURIComponent(season.shortName)}`)
    await expect(page.getByTestId('edit-season')).toBeVisible()
    await doScreenshot(page, 'admin/admin-planning-loaded', true)

    // WHEN: opening the form from the pencil (client-side navigation, no reload)
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
