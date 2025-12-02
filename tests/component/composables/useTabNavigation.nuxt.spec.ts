// @vitest-environment nuxt
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useTabNavigation } from '~/composables/useTabNavigation'

/**
 * Unit tests for useTabNavigation.ts composable
 *
 * Tests generic tab navigation logic for:
 * - Simple routes: /base/[tab]
 * - Nested routes: /base/[param1]/[tab]
 *
 * Note: Full navigation behavior tested in E2E (admin.e2e.spec.ts, household.e2e.spec.ts)
 */

// Mock navigateTo and useRoute using the official pattern from nuxt/test-utils
const { mockNavigateTo, mockRouteData } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockRouteData: {
    path: '/simple/tab1',
    params: { tab: 'tab1' } as Record<string, string | undefined>,
    query: {} as Record<string, string>,
    hash: ''
  }
}))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => () => mockRouteData)

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
    // Mutate existing params object instead of replacing it
    // This ensures the route reference inside composable sees the changes
    Object.keys(mockRouteData.params).forEach(key => delete mockRouteData.params[key])
    Object.assign(mockRouteData.params, config.params)
    // Same for query
    Object.keys(mockRouteData.query).forEach(key => delete mockRouteData.query[key])
    Object.assign(mockRouteData.query, config.query || {})
  }

  const expectNavigationToPath = (expectedPath: string) => {
    expect(mockNavigateTo).toHaveBeenCalled()
    expect(mockNavigateTo.mock.calls[0][0].path).toBe(expectedPath)
  }

  const createNavigationInstance = (config: typeof simpleRouteConfig | typeof nestedRouteConfig) => {
    return useTabNavigation(config)
  }

  // Helper to set activeTab and wait for async navigation
  const setActiveTab = async (activeTabRef: any, tab: string) => {
    activeTabRef.value = tab
    await flushPromises()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupRoute({ path: '/simple/tab1', params: { tab: 'tab1' } })
  })

  describe('Simple Routes (pattern: /base/[tab])', () => {
    describe('Tab Initialization', () => {
      const initTestCases = [
        { routeParam: 'tab1', expectedTab: 'tab1', description: 'valid tab from route' },
        { routeParam: undefined, expectedTab: 'tab1', description: 'undefined route param' },
        { routeParam: 'invalid', expectedTab: 'tab1', description: 'invalid route param' },
        { routeParam: 'Tab1', expectedTab: 'tab1', description: 'case-insensitive matching' }
      ]

      for (const testCase of initTestCases) {
        it(`should initialize with ${testCase.description}`, () => {
          setupRoute({ path: '/simple/tab1', params: { tab: testCase.routeParam } })

          const { activeTab } = createNavigationInstance(simpleRouteConfig)

          expect(activeTab.value).toBe(testCase.expectedTab)
        })
      }
    })

    describe('Tab Navigation', () => {
      it('should call navigateTo when activeTab is set to different tab', async () => {
        setupRoute({ path: '/simple/tab1', params: { tab: 'tab1' } })

        const { activeTab } = createNavigationInstance(simpleRouteConfig)
        await setActiveTab(activeTab, 'tab2')

        expect(mockNavigateTo).toHaveBeenCalled()
        expect(mockNavigateTo.mock.calls[0][0].path).toBe('/simple/tab2')
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

    describe('Parametrized: All tabs are navigable', () => {
      for (const tab of simpleRouteConfig.tabs.filter(t => t !== 'tab1')) {
        it(`should navigate to ${tab}`, async () => {
          setupRoute({ path: '/simple/tab1', params: { tab: 'tab1' } })

          const { activeTab } = createNavigationInstance(simpleRouteConfig)
          await setActiveTab(activeTab, tab)

          expectNavigationToPath(`/simple/${tab}`)
        })
      }
    })
  })

  describe('Nested Routes (pattern: /base/[param1]/[tab])', () => {
    beforeEach(() => {
      setupRoute({
        path: '/nested/value1/tab1',
        params: { param1: 'value1', tab: 'tab1' }
      })
    })

    describe('Tab Initialization with Additional Params', () => {
      const nestedInitCases = [
        {
          params: { param1: 'value1', tab: 'tab1' },
          expectedTab: 'tab1',
          description: 'valid nested route'
        },
        {
          params: { param1: 'value1', tab: undefined },
          expectedTab: 'tab1',
          description: 'missing tab param'
        },
        {
          params: { param1: 'value1', tab: 'invalid' },
          expectedTab: 'tab1',
          description: 'invalid tab with valid param1'
        },
        {
          params: { tab: 'tab1' },
          expectedTab: 'tab1',
          description: 'missing param1'
        }
      ]

      for (const testCase of nestedInitCases) {
        it(`should handle ${testCase.description}`, () => {
          setupRoute({ path: '/nested/value1/tab1', params: testCase.params })

          const { activeTab } = createNavigationInstance(nestedRouteConfig)

          expect(activeTab.value).toBe(testCase.expectedTab)
        })
      }
    })

    describe('Navigation with Additional Params', () => {
      it('should call navigateTo with path including additional params', async () => {
        const { activeTab } = createNavigationInstance(nestedRouteConfig)
        await setActiveTab(activeTab, 'tab2')

        expect(mockNavigateTo).toHaveBeenCalled()
        expect(mockNavigateTo.mock.calls[0][0].path).toBe('/nested/value1/tab2')
      })
    })

    describe('Parametrized: All tabs preserve additional params', () => {
      for (const tab of nestedRouteConfig.tabs.filter(t => t !== 'tab1')) {
        it(`should navigate to ${tab} with param1 preserved`, async () => {
          setupRoute({
            path: '/nested/value1/tab1',
            params: { param1: 'value1', tab: 'tab1' }
          })

          const { activeTab } = createNavigationInstance(nestedRouteConfig)
          await setActiveTab(activeTab, tab)

          expectNavigationToPath(`/nested/value1/${tab}`)
        })
      }
    })
  })

  describe('Helper Functions', () => {
    describe('isValidTab', () => {
      const validationCases = [
        { tab: 'tab1', expected: true, description: 'valid tab' },
        { tab: 'tab2', expected: true, description: 'another valid tab' },
        { tab: 'invalid', expected: false, description: 'invalid tab' },
        { tab: '', expected: false, description: 'empty string' }
      ]

      for (const testCase of validationCases) {
        it(`should return ${testCase.expected} for ${testCase.description}`, () => {
          const { isValidTab } = createNavigationInstance(simpleRouteConfig)
          expect(isValidTab(testCase.tab)).toBe(testCase.expected)
        })
      }
    })

    describe('constructUrlForTab', () => {
      const urlConstructionCases = [
        {
          description: 'simple route without additional params',
          config: simpleRouteConfig,
          params: { tab: 'tab1' },
          targetTab: 'tab2',
          expected: '/simple/tab2'
        },
        {
          description: 'nested route with single additional param',
          config: nestedRouteConfig,
          params: { param1: 'value1', tab: 'tab1' },
          targetTab: 'tab2',
          expected: '/nested/value1/tab2'
        },
        {
          description: 'route with multiple additional params',
          config: { tabs: ['tab1', 'tab2'], basePath: '/base', additionalParams: ['param1', 'param2'] },
          params: { param1: 'param1value', param2: 'param2value', tab: 'tab1' },
          targetTab: 'tab2',
          expected: '/base/param1value/param2value/tab2'
        },
        {
          description: 'missing additional params',
          config: nestedRouteConfig,
          params: { tab: 'tab1' },
          targetTab: 'tab2',
          expected: '/nested/tab2'
        }
      ]

      for (const testCase of urlConstructionCases) {
        it(`should construct ${testCase.description}`, () => {
          // Don't need setupRoute - pass params directly to pure function
          const { constructUrlForTab } = createNavigationInstance(testCase.config)
          expect(constructUrlForTab(testCase.targetTab, testCase.params)).toBe(testCase.expected)
        })
      }
    })
  })

  describe('Redirect Behavior', () => {
    const redirectCases = [
      {
        routeParam: 'invalid',
        expectedTab: 'tab1',
        shouldSync: true,
        description: 'invalid tab triggers sync'
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
        description: 'missing tab triggers sync'
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

  describe('Edge Cases', () => {
    it('should handle tabs with dashes and underscores', () => {
      setupRoute({ path: '/custom/my-tab', params: { tab: 'my-tab' } })

      const customConfig = {
        tabs: ['my-tab', 'other_tab'],
        basePath: '/custom'
      }

      const { activeTab } = createNavigationInstance(customConfig)
      expect(activeTab.value).toBe('my-tab')
    })

    it('should handle multiple additional params', async () => {
      setupRoute({
        path: '/base/param1value/param2value/tab1',
        params: { param1: 'param1value', param2: 'param2value', tab: 'tab1' }
      })

      const multiParamConfig = {
        tabs: ['tab1', 'tab2'],
        basePath: '/base',
        additionalParams: ['param1', 'param2']
      }

      const { activeTab } = createNavigationInstance(multiParamConfig)
      await setActiveTab(activeTab, 'tab2')

      expectNavigationToPath('/base/param1value/param2value/tab2')
    })

    it('should use first tab as default', () => {
      setupRoute({ path: '/simple/invalid', params: { tab: 'invalid' } })

      const { activeTab } = createNavigationInstance(simpleRouteConfig)

      // Should fall back to first tab in array
      expect(activeTab.value).toBe('tab1')
    })
  })
})
