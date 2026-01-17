import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import testHelpers from '../testHelpers'
import { SeasonFactory } from '../testDataFactories/seasonFactory'

const { adminUIFile, memberUIFile } = authFiles
const { validatedBrowserContext, pollUntil, doScreenshot } = testHelpers

const tabs = [
  { name: 'Planlægning', path: 'planning', selector: '[data-testid="admin-planning"]', hasFormModes: true },
  { name: 'Madhold', path: 'teams', selector: '[data-testid="admin-teams"]', hasFormModes: true },
  { name: 'Husstande', path: 'households', selector: '[data-testid="admin-households"]', hasFormModes: false },
  { name: 'Allergier', path: 'allergies', selector: '[data-testid="admin-allergies"]', hasFormModes: false },
  { name: 'Brugere', path: 'users', selector: '[data-testid="admin-users"]', hasFormModes: false },
  { name: 'Økonomi', path: 'economy', selector: '[data-testid="admin-economy"]', hasFormModes: false },
  { name: 'System', path: 'settings', selector: '[data-testid="admin-system"]', hasFormModes: false }
]

test.describe('Admin page path-based navigation', () => {
  const adminUrl = '/admin'
  const createdSeasonIds: number[] = []

  const formModes = [
    { mode: 'view', buttonName: 'form-mode-view' },
    { mode: 'edit', buttonName: 'form-mode-edit' },
    { mode: 'create', buttonName: 'form-mode-create' }
  ]

  test.use({ storageState: adminUIFile })

  test.beforeAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    // Ensure singleton active season exists for all tests (parallel-safe)
    await SeasonFactory.createActiveSeason(context)
  })

  test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
  })

  const redirectScenarios = [
    { path: '', description: 'Load /admin redirects to /admin/planning by default' },
    { path: '/unicorn', description: 'Invalid URL path /admin/unicorn redirects to /admin/planning' }
  ]

  for (const scenario of redirectScenarios) {
    test(scenario.description, async ({ page }) => {
      await page.goto(`${adminUrl}${scenario.path}`)
      await doScreenshot(page, `admin-redirect-${scenario.path.replace('/', '') || 'root'}-after-goto`)

      await pollUntil(
        async () => page.url(),
        (url) => url.includes('/admin/planning'),
        10
      )
      expect(page.url()).toContain('/admin/planning')
      await doScreenshot(page, `admin-redirect-${scenario.path.replace('/', '') || 'root'}-after-url-check`)

      await pollUntil(
        async () => await page.locator('[data-testid="admin-planning"]').isVisible(),
        (isVisible) => isVisible,
        10
      )
      await doScreenshot(page, `admin-redirect-${scenario.path.replace('/', '') || 'root'}-final`)
    })
  }

  // TODO: Re-enable after fixing allergyManagers API timeout in CI
  for (const tab of tabs) {
    test.skip(`Tab "${tab.name}" can be loaded with path /admin/${tab.path}`, async ({ page }) => {
      await page.goto(`${adminUrl}/${tab.path}`)

      expect(page.url()).toContain(`/admin/${tab.path}`)

      await pollUntil(
        async () => await page.locator(tab.selector).isVisible(),
        (isVisible) => isVisible,
        10
      )
    })
  }

  test('Client-side navigation preserves active tab state', async ({ page }) => {
    const testTabs = [tabs[5], tabs[0]].filter(t => t !== undefined)
    expect(testTabs).toHaveLength(2)

    for (const tab of testTabs) {
      await page.goto(`${adminUrl}/${tab.path}`)

      expect(page.url()).toContain(`/admin/${tab.path}`)

      // Wait for component to appear using pollUntil with exp backoff
      await pollUntil(
        async () => await page.locator(tab.selector).isVisible(),
        (isVisible) => isVisible,
        10
      )

      const activeTab = page.locator('button[role="tab"]').filter({ hasText: tab.name }).first()
      await expect(activeTab).toHaveAttribute('aria-selected', 'true')
    }
  })

  for (const tab of tabs.filter(t => t.hasFormModes)) {
    for (const formMode of formModes) {
      test(`Tab "${tab.name}" supports mode=${formMode.mode} in URL query`, async ({ page }) => {
        await page.goto(`${adminUrl}/${tab.path}?mode=${formMode.mode}`)
        await doScreenshot(page, `admin-${tab.path}-mode-${formMode.mode}-after-goto`)

        await pollUntil(
          async () => await page.locator(tab.selector).isVisible(),
          (isVisible) => isVisible,
          10
        )
        await doScreenshot(page, `admin-${tab.path}-mode-${formMode.mode}-after-visible-check`)

        expect(page.url()).toContain(`/admin/${tab.path}`)
        expect(page.url()).toContain(`mode=${formMode.mode}`)
      })
    }
  }
})

test.describe('Admin season URL persistence', () => {
  const createdSeasonIds: number[] = []

  test.use({ storageState: adminUIFile })

  test.beforeAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    // Ensure singleton active season exists for all tests (parallel-safe)
    await SeasonFactory.createActiveSeason(context)
  })

  test.afterAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)
    await SeasonFactory.cleanupSeasons(context, createdSeasonIds)
  })

  const tabTransitions = [
    { fromTab: 'planning', toTab: 'teams' },
    { fromTab: 'teams', toTab: 'households' }
  ]

  const getTabSelector = (path: string) => {
    const tab = tabs.find(t => t.path === path)
    expect(tab).toBeDefined()
    return tab!.selector
  }

  for (const { fromTab, toTab } of tabTransitions) {
    test(`Season persists from ${fromTab} to ${toTab} tab`, async ({ page, browser }) => {
      const context = await validatedBrowserContext(browser)
      const season = await SeasonFactory.createSeason(context)
      createdSeasonIds.push(season.id!)

      try {
        await page.goto(`/admin/${fromTab}?season=${season.shortName}`)

        await pollUntil(
          async () => await page.locator(getTabSelector(fromTab)).isVisible(),
          (isVisible) => isVisible,
          10
        )

        expect(page.url()).toContain(`season=${season.shortName}`)

        await page.goto(`/admin/${toTab}?season=${season.shortName}`)

        await pollUntil(
          async () => await page.locator(getTabSelector(toTab)).isVisible(),
          (isVisible) => isVisible,
          10
        )

        expect(page.url()).toContain(toTab)
        expect(page.url()).toContain(`season=${season.shortName}`)
      } finally {
        if (season.id) {
          await SeasonFactory.deleteSeason(context, season.id).catch(() => {})
          // Remove ID from array after cleanup to avoid duplicate cleanup in afterAll
          const index = createdSeasonIds.indexOf(season.id)
          if (index > -1) createdSeasonIds.splice(index, 1)
        }
      }
    })
  }

  test('Season and mode params coexist', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)
    const season = await SeasonFactory.createSeason(context)
    createdSeasonIds.push(season.id!)

    try {
      await page.goto(`/admin/planning?season=${season.shortName}&mode=edit`)

      expect(page.url()).toContain(`season=${season.shortName}`)
      expect(page.url()).toContain('mode=edit')

      await pollUntil(
        async () => await page.locator('[data-testid="admin-planning"]').isVisible(),
        (isVisible) => isVisible,
        10
      )
    } finally {
      if (season.id) {
        await SeasonFactory.deleteSeason(context, season.id).catch(() => {})
        // Remove ID from array after cleanup to avoid duplicate cleanup in afterAll
        const index = createdSeasonIds.indexOf(season.id)
        if (index > -1) createdSeasonIds.splice(index, 1)
      }
    }
  })

  test('Invalid season redirects to a valid season', async ({ page }) => {
    await page.goto('/admin/planning?season=invalid-123')

    // Debug: Screenshot before waiting for redirect
    await doScreenshot(page, 'admin-invalid-season-before-redirect')

    // Wait for URL to auto-correct to a valid season
    await pollUntil(
      async () => page.url(),
      (url) => url.includes('season=') && !url.includes('invalid-123'),
      10,
      500
    )

    expect(page.url()).toContain('season=')
    expect(page.url()).not.toContain('invalid-123')
  })

})

/**
 * Admin authorization tests - parametrized for admin vs member contexts
 *
 * Tests that:
 * - Admin users can see FormModeSelector and edit controls
 * - Member users see "admin-readonly-banner" and NO FormModeSelector
 */
test.describe('Admin page authorization', () => {
  // Parametrized user contexts
  const userContexts = [
    {
      role: 'admin',
      storageState: adminUIFile,
      expectBanner: false,
      expectFormModeSelector: true,
      description: 'Admin user can edit'
    },
    {
      role: 'member',
      storageState: memberUIFile,
      expectBanner: true,
      expectFormModeSelector: false,
      description: 'Member user is read-only'
    }
  ] as const

  // Tabs with edit controls to test
  const tabsWithEditControls = [
    { path: 'planning', selector: '[data-testid="admin-planning"]' },
    { path: 'teams', selector: '[data-testid="admin-teams"]' }
  ]

  for (const userContext of userContexts) {
    test.describe(`${userContext.description}`, () => {
      test.use({ storageState: userContext.storageState })

      test.beforeAll(async ({browser}) => {
        // Ensure singleton active season exists (needed for FormModeSelector to appear)
        const context = await validatedBrowserContext(browser)
        await SeasonFactory.createActiveSeason(context)
      })

      for (const tab of tabsWithEditControls) {
        test(`${tab.path} tab - banner: ${userContext.expectBanner}, FormModeSelector: ${userContext.expectFormModeSelector}`, async ({ page }) => {
          await page.goto(`/admin/${tab.path}`)
          await doScreenshot(page, `admin-auth-${userContext.role}-${tab.path}-initial`)

          // Wait for tab content to load
          await pollUntil(
            async () => await page.locator(tab.selector).isVisible(),
            (isVisible) => isVisible,
            10
          )
          await doScreenshot(page, `admin-auth-${userContext.role}-${tab.path}-loaded`)

          // Check readonly banner
          const bannerLocator = page.locator('[data-testid="admin-readonly-banner"]')
          if (userContext.expectBanner) {
            await expect(bannerLocator).toBeVisible()
            await expect(bannerLocator).toContainText('Hej, du er ikke administrator')
          } else {
            await expect(bannerLocator).not.toBeVisible()
          }

          // Check FormModeSelector (edit/create buttons)
          const formModeSelectorLocator = page.locator('[data-testid="form-mode-edit"]')
          if (userContext.expectFormModeSelector) {
            await expect(formModeSelectorLocator).toBeVisible()
          } else {
            await expect(formModeSelectorLocator).not.toBeVisible()
          }
        })
      }
    })
  }
})
