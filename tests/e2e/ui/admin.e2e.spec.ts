import { test, expect } from '~~/tests/e2e/uiTest'
import { authFiles } from '~~/tests/e2e/config'
import testHelpers from '~~/tests/e2e/testHelpers'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'

const { adminUIFile, memberUIFile } = authFiles
const { validatedBrowserContext, doScreenshot, gotoHydrated } = testHelpers

// Every tab loads to its root test-id in MobileViewport.e2e.spec.ts; the cases here cover redirects and tab selection
const tabs = [
  { name: 'Økonomi', path: 'economy', selector: '[data-testid="admin-economy"]' },
  { name: 'Planlægning', path: 'planning', selector: '[data-testid="admin-planning"]' }
]

test.describe('Admin page path-based navigation', () => {
  const adminUrl = '/admin'

  test.use({ storageState: adminUIFile })

  test.beforeAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    // Ensure singleton active season exists for all tests (parallel-safe)
    await SeasonFactory.createActiveSeason(context)
  })

  const redirectScenarios = [
    { path: '', description: 'Load /admin redirects to /admin/planning by default' },
    { path: '/unicorn', description: 'Invalid URL path /admin/unicorn redirects to /admin/planning' }
  ]

  for (const scenario of redirectScenarios) {
    test(scenario.description, async ({ page }) => {
      await gotoHydrated(page, `${adminUrl}${scenario.path}`)
      await doScreenshot(page, `admin-redirect-${scenario.path.replace('/', '') || 'root'}-after-goto`)

      await expect(page).toHaveURL(/\/admin\/planning/)
      await doScreenshot(page, `admin-redirect-${scenario.path.replace('/', '') || 'root'}-after-url-check`)

      await expect(page.locator('[data-testid="admin-planning"]')).toBeVisible()
      await doScreenshot(page, `admin-redirect-${scenario.path.replace('/', '') || 'root'}-final`)
    })
  }

  test('Client-side navigation preserves active tab state', async ({ page }) => {
    for (const tab of tabs) {
      await gotoHydrated(page, `${adminUrl}/${tab.path}`)

      expect(page.url()).toContain(`/admin/${tab.path}`)

      // Wait for component to appear
      await expect(page.locator(tab.selector)).toBeVisible()

      const activeTab = page.locator('button[role="tab"]').filter({ hasText: tab.name }).first()
      await expect(activeTab).toHaveAttribute('aria-selected', 'true')
    }
  })
})

test.describe('Admin season URL persistence', () => {
  test.use({ storageState: adminUIFile })

  test.beforeAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    // Ensure singleton active season exists for all tests (parallel-safe)
    await SeasonFactory.createActiveSeason(context)
  })

  test('Invalid season redirects to a valid season', async ({ page }) => {
    await gotoHydrated(page, '/admin/planning?season=invalid-123')

    // Debug: Screenshot before waiting for redirect
    await doScreenshot(page, 'admin-invalid-season-before-redirect')

    // Wait for URL to auto-correct to a valid season
    await expect(page).toHaveURL(url => url.searchParams.has('season') && url.searchParams.get('season') !== 'invalid-123')
  })

})

/**
 * Admin authorization tests - parametrized for admin vs member contexts
 *
 * Tests that:
 * - Admin users see the tab's edit control (planning: the season pencil, teams: the create button)
 * - Member users see "admin-readonly-banner" and the edit control is absent
 */
test.describe('Admin page authorization', () => {
  // Parametrized user contexts
  const userContexts = [
    {
      role: 'admin',
      storageState: adminUIFile,
      expectBanner: false,
      expectEditControls: true,
      description: 'Admin user can edit'
    },
    {
      role: 'member',
      storageState: memberUIFile,
      expectBanner: true,
      expectEditControls: false,
      description: 'Member user is read-only'
    }
  ] as const

  // Tabs with edit controls to test - each tab names the control that opens its form
  const tabsWithEditControls = [
    { path: 'planning', selector: '[data-testid="admin-planning"]', editControl: 'edit-season' },
    { path: 'teams', selector: '[data-testid="admin-teams"]', editControl: 'create-team' }
  ]

  for (const userContext of userContexts) {
    test.describe(`${userContext.description}`, () => {
      test.use({ storageState: userContext.storageState })

      test.beforeAll(async ({browser}) => {
        // Ensure singleton active season exists (needed for the edit control to appear)
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.createActiveSeason(context)
      })

      for (const tab of tabsWithEditControls) {
        test(`${tab.path} tab - banner: ${userContext.expectBanner}, edit control: ${userContext.expectEditControls}`, async ({ page }) => {
          await gotoHydrated(page, `/admin/${tab.path}`)
          await doScreenshot(page, `admin-auth-${userContext.role}-${tab.path}-initial`)

          // Wait for tab content to load
          await expect(page.locator(tab.selector)).toBeVisible()
          await doScreenshot(page, `admin-auth-${userContext.role}-${tab.path}-loaded`)

          // Check readonly banner
          const bannerLocator = page.locator('[data-testid="admin-readonly-banner"]')
          if (userContext.expectBanner) {
            await expect(bannerLocator).toBeVisible()
            await expect(bannerLocator).toContainText('Hej, du er ikke administrator')
          } else {
            await expect(bannerLocator).not.toBeVisible()
          }

          // Check the tab's edit control
          const editControlLocator = page.locator(`[data-testid="${tab.editControl}"]`)
          if (userContext.expectEditControls) {
            await expect(editControlLocator).toBeVisible()
          } else {
            await expect(editControlLocator).not.toBeVisible()
          }
        })
      }
    })
  }
})
