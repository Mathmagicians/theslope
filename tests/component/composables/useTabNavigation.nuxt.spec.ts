// @vitest-environment nuxt
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useTabNavigation } from '~/composables/useTabNavigation'
import { useTestScope } from '~~/tests/component/testHelpers'

/**
 * Unit tests for useTabNavigation.ts composable
 *
 * Tests generic tab navigation logic for:
 * - Simple routes: /base/[tab]
 * - Nested routes: /base/[param1]/[tab]
 *
 * Note: Full navigation behavior tested in E2E (admin.e2e.spec.ts, household.e2e.spec.ts)
 */

// The test environment has no router: the route is read from, and the navigation recorded on, the mocks
const { mockNavigateTo, mockRoute: mockRouteData, useRoute } = await vi.hoisted(async () =>
  (await import('~~/tests/component/hoistedMocks')).mockRouteAndNavigation({path: '/simple/tab1', params: {tab: 'tab1'}}))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => useRoute)

describe('useTabNavigation.ts', () => {
  // Test fixtures - Generic simple route
  const simpleRouteConfig = {
    tabs: ['tab1', 'tab2', 'tab3', 'tab4'],
    basePath: '/simple'
  }

  // Test fixtures - Generic nested route
  const nestedRouteConfig = {
    tabs: ['tab1', 'tab2', 'tab3', 'tab4'],
    basePath: '/nested',
    additionalParams: ['param1']
  }

  // Helpers
  const setupRoute = (config: {
    path: string
    params: Record<string, string | undefined>
    query?: Record<string, string>
  }) => {
    mockRouteData.path = config.path
    // Mutate existing objects - use Reflect.deleteProperty to clear keys
    for (const key in mockRouteData.params) {
      if (Object.hasOwn(mockRouteData.params, key)) {
        Reflect.deleteProperty(mockRouteData.params, key)
      }
    }
    Object.assign(mockRouteData.params, config.params)
    for (const key in mockRouteData.query) {
      if (Object.hasOwn(mockRouteData.query, key)) {
        Reflect.deleteProperty(mockRouteData.query, key)
      }
    }
    Object.assign(mockRouteData.query, config.query || {})
  }

  const expectNavigationToPath = (expectedPath: string) => {
    expect(mockNavigateTo).toHaveBeenCalled()
    expect(mockNavigateTo.mock.calls[0]![0].path).toBe(expectedPath)
  }

  // Each test's instance lives in the test's scope: the route is reactive, so one left alive would answer the next test's route
  const inScope = useTestScope()
  const createNavigationInstance = (config: typeof simpleRouteConfig | typeof nestedRouteConfig) =>
    inScope(() => useTabNavigation(config))

  // Helper to set activeTab and wait for async navigation
  const setActiveTab = async (activeTabRef: { value: string }, tab: string) => {
    activeTabRef.value = tab
    await flushPromises()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupRoute({ path: '/simple/tab1', params: { tab: 'tab1' } })
  })

  describe('Simple Routes (pattern: /base/[tab])', () => {
    it('should initialize with case-insensitive matching', () => {
      setupRoute({ path: '/simple/tab1', params: { tab: 'Tab1' } })

      const { activeTab } = createNavigationInstance(simpleRouteConfig)

      expect(activeTab.value).toBe('tab1')
    })

    describe('Tab Navigation', () => {
      it('should call navigateTo when activeTab is set to different tab', async () => {
        setupRoute({ path: '/simple/tab1', params: { tab: 'tab1' } })

        const { activeTab } = createNavigationInstance(simpleRouteConfig)
        await setActiveTab(activeTab, 'tab2')

        expectNavigationToPath('/simple/tab2')
      })

      it('should not call navigateTo when setting to current tab', async () => {
        setupRoute({ path: '/simple/tab1', params: { tab: 'tab1' } })

        const { activeTab } = createNavigationInstance(simpleRouteConfig)
        await flushPromises() // Let initialization complete
        vi.clearAllMocks() // Clear any initialization calls

        activeTab.value = 'tab1' // Same as current
        await flushPromises()

        expect(mockNavigateTo).not.toHaveBeenCalled()
      })
    })
  })

  describe('Routes with additional params', () => {
    it.each([
      {
        description: 'a nested route keeps param1',
        route: { path: '/nested/value1/tab1', params: { param1: 'value1', tab: 'tab1' } },
        config: nestedRouteConfig,
        expected: '/nested/value1/tab2'
      },
      {
        description: 'a route with two params keeps both',
        route: { path: '/base/param1value/param2value/tab1', params: { param1: 'param1value', param2: 'param2value', tab: 'tab1' } },
        config: { tabs: ['tab1', 'tab2'], basePath: '/base', additionalParams: ['param1', 'param2'] },
        expected: '/base/param1value/param2value/tab2'
      }
    ])('$description when navigating to another tab', async ({route, config, expected}) => {
      setupRoute(route)

      const { activeTab } = createNavigationInstance(config)
      await setActiveTab(activeTab, 'tab2')

      expectNavigationToPath(expected)
    })

    it('constructUrlForTab leaves out a missing additional param', () => {
      const { constructUrlForTab } = createNavigationInstance(nestedRouteConfig)
      expect(constructUrlForTab('tab2', { tab: 'tab1' })).toBe('/nested/tab2')
    })
  })

  describe('isValidTab', () => {
    it.each([
      { tab: 'tab1', expected: true },
      { tab: 'invalid', expected: false }
    ])('should return $expected for $tab', ({tab, expected}) => {
      const { isValidTab } = createNavigationInstance(simpleRouteConfig)
      expect(isValidTab(tab)).toBe(expected)
    })
  })

  describe('Redirect Behavior', () => {
    const redirectCases = [
      {
        routeParam: 'invalid',
        expectedTab: 'tab1',
        shouldSync: true,
        description: 'invalid tab falls back to the first tab and triggers sync'
      },
      {
        routeParam: 'tab2',
        expectedTab: 'tab2',
        shouldSync: false,
        description: 'valid tab does not trigger sync'
      },
      {
        routeParam: undefined,
        expectedTab: 'tab1',
        shouldSync: true,
        description: 'missing tab falls back to the first tab and triggers sync'
      }
    ]

    for (const testCase of redirectCases) {
      it(`should handle sync when ${testCase.description}`, async () => {
        const tabParam = testCase.routeParam || 'tab1'
        setupRoute({ path: `/simple/${tabParam}`, params: { tab: testCase.routeParam } })

        const { activeTab, shouldSyncActiveTab } = createNavigationInstance(simpleRouteConfig)
        await flushPromises() // Wait for watchPostEffect to complete

        expect(activeTab.value).toBe(testCase.expectedTab)
        expect(shouldSyncActiveTab.value).toBe(testCase.shouldSync)
      })
    }
  })
})
