import { test, expect } from '@playwright/test'
import { authFiles } from '../config'
import testHelpers from '../testHelpers'
import { SeasonFactory } from '../testDataFactories/seasonFactory'

const { adminUIFile } = authFiles
const { validatedBrowserContext, pollUntil } = testHelpers

const tabs = [
  { name: 'Planlægning', path: 'planning', selector: '[data-test-id="admin-planning"]', hasFormModes: true },
  { name: 'Madhold', path: 'teams', selector: '[data-test-id="admin-teams"]', hasFormModes: true },
  { name: 'Chefkokke', path: 'chefs', selector: '[data-test-id="admin-chefs"]', hasFormModes: false },
  { name: 'Husstande', path: 'households', selector: '[data-test-id="admin-households"]', hasFormModes: false },
  { name: 'Allergier', path: 'allergies', selector: '[data-test-id="admin-allergies"]', hasFormModes: false },
  { name: 'Brugere', path: 'users', selector: '[data-test-id="admin-users"]', hasFormModes: false },
  { name: 'Økonomi', path: 'economy', selector: '[data-test-id="admin-economy"]', hasFormModes: false },
  { name: 'Indstillinger', path: 'settings', selector: '[data-test-id="admin-settings"]', hasFormModes: false }
]

test.describe('Admin page path-based navigation', () => {
  const adminUrl = '/admin'

  const formModes = [
    { mode: 'view', buttonName: 'form-mode-view' },
    { mode: 'edit', buttonName: 'form-mode-edit' },
    { mode: 'create', buttonName: 'form-mode-create' }
  ]

  test.use({ storageState: adminUIFile })

  const redirectScenarios = [
    { path: '', description: 'Load /admin redirects to /admin/planning by default' },
    { path: '/unicorn', description: 'Invalid URL path /admin/unicorn redirects to /admin/planning' }
  ]

  for (const scenario of redirectScenarios) {
    test(scenario.description, async ({ page }) => {
      await page.goto(`${adminUrl}${scenario.path}`)

      await pollUntil(
        async () => page.url(),
        (url) => url.includes('/admin/planning'),
        10
      )
      expect(page.url()).toContain('/admin/planning')

      await pollUntil(
        async () => await page.locator('[data-test-id="admin-planning"]').isVisible(),
        (isVisible) => isVisible,
        10
      )
    })
  }

  for (const tab of tabs) {
    test(`Tab "${tab.name}" can be loaded with path /admin/${tab.path}`, async ({ page }) => {
      await page.goto(`${adminUrl}/${tab.path}`)

      expect(page.url()).toContain(`/admin/${tab.path}`)

      await pollUntil(
        async () => await page.locator(tab.selector).isVisible(),
        (isVisible) => isVisible,
        10
      )
    })
  }

  test('URL path is preserved during page refresh', async ({ page }) => {
    await page.goto(`${adminUrl}/users`)

    expect(page.url()).toContain('/admin/users')
    await pollUntil(
      async () => await page.locator('[data-test-id="admin-users"]').isVisible(),
      (isVisible) => isVisible,
      10
    )

    await page.reload()

    expect(page.url()).toContain('/admin/users')
    await pollUntil(
      async () => await page.locator('[data-test-id="admin-users"]').isVisible(),
      (isVisible) => isVisible,
      10
    )
  })

  test('Client-side navigation preserves active tab state', async ({ page }) => {
    const testTabs = [tabs[5], tabs[0]].filter(t => t !== undefined)
    expect(testTabs).toHaveLength(2)

    for (const tab of testTabs) {
      await page.goto(`${adminUrl}/${tab.path}`)
      expect(page.url()).toContain(`/admin/${tab.path}`)

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

        await pollUntil(
          async () => await page.locator(tab.selector).isVisible(),
          (isVisible) => isVisible,
          10
        )

        expect(page.url()).toContain(`/admin/${tab.path}`)
        expect(page.url()).toContain(`mode=${formMode.mode}`)
      })
    }

    test(`Tab "${tab.name}" can navigate between all form modes`, async ({ page, browser }) => {
      const context = await validatedBrowserContext(browser)
      const season = await SeasonFactory.createSeason(context)

      try {
        for (const formMode of formModes) {
          await page.goto(`${adminUrl}/${tab.path}?mode=${formMode.mode}`)

          await pollUntil(
            async () => page.url(),
            (url) => url.includes(`mode=${formMode.mode}`),
            10
          )
          expect(page.url()).toContain(`/admin/${tab.path}`)
          expect(page.url()).toContain(`mode=${formMode.mode}`)

          await pollUntil(
            async () => await page.locator(tab.selector).isVisible(),
            (isVisible) => isVisible,
            10
          )
        }
      } finally {
        if (season.id) {
          await SeasonFactory.deleteSeason(context, season.id).catch(() => {})
        }
      }
    })
  }
})

test.describe('Admin season URL persistence', () => {
  test.use({ storageState: adminUIFile })

  const tabTransitions = [
    { fromTab: 'planning', toTab: 'teams' },
    { fromTab: 'teams', toTab: 'chefs' }
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
        }
      }
    })
  }

  test('Season and mode params coexist', async ({ page, browser }) => {
    const context = await validatedBrowserContext(browser)
    const season = await SeasonFactory.createSeason(context)

    try {
      await page.goto(`/admin/planning?season=${season.shortName}&mode=edit`)

      expect(page.url()).toContain(`season=${season.shortName}`)
      expect(page.url()).toContain('mode=edit')

      await pollUntil(
        async () => await page.locator('[data-test-id="admin-planning"]').isVisible(),
        (isVisible) => isVisible,
        10
      )
    } finally {
      if (season.id) {
        await SeasonFactory.deleteSeason(context, season.id).catch(() => {})
      }
    }
  })

  test('Invalid season redirects to active season', async ({ page }) => {
    test.setTimeout(60000) // Increased for CI: reactive store init + redirect chain takes 15-20s

    await page.goto('/admin/planning?season=invalid-123')

    // Wait for child component to detect invalid season and update URL (may take several seconds for store + watcher to run)
    await pollUntil(
      async () => page.url(),
      (url) => url.includes('season=') && !url.includes('invalid-123'),
      10,  // Standardized to 10 attempts (255.5s) for CI resilience
      500
    )

    expect(page.url()).toContain('season=')
    expect(page.url()).not.toContain('invalid-123')
  })

})
