// @vitest-environment nuxt
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {flushPromises} from '@vue/test-utils'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {useQueryParam} from '~/composables/useQueryParam'
import {formatDate, parseDate} from '~/utils/date'
import {FORM_MODES, type FormMode} from '~/types/form'

/**
 * Unit tests for useQueryParam.ts composable
 *
 * Tests generic query parameter management with real-world examples:
 * - Mode (enum with validation)
 * - Season shortName (string with validation and normalization)
 * - Dinner date (Date with formatDate/parseDate)
 */

// Mock navigateTo and useRoute
const {mockNavigateTo, mockRouteData} = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockRouteData: {
    path: '/test',
    params: {} as Record<string, string | undefined>,
    query: {} as Record<string, string>,
    hash: ''
  }
}))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => () => mockRouteData)

describe('useQueryParam.ts', () => {
  const setupQuery = (query: Record<string, string>) => {
    Object.keys(mockRouteData.query).forEach(key => delete mockRouteData.query[key])
    Object.assign(mockRouteData.query, query)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupQuery({})
  })

  describe('String Type (Mode Enum)', () => {
    const validModes = ['view', 'edit', 'create'] as const
    type Mode = typeof validModes[number]

    const createModeParam = () => useQueryParam<Mode>('mode', {
      deserialize: (s) => validModes.includes(s as Mode) ? s as Mode : null,
      validate: (v) => validModes.includes(v),
      defaultValue: 'view'
    })

    describe('Reading from URL', () => {
      const readCases = [
        {query: {}, expected: 'view', description: 'no query param'},
        {query: {mode: 'edit'}, expected: 'edit', description: 'valid mode'},
        {query: {mode: 'create'}, expected: 'create', description: 'another valid mode'},
        {query: {mode: 'invalid'}, expected: 'view', description: 'invalid mode falls back to default'}
      ]

      for (const testCase of readCases) {
        it(`should return ${testCase.expected} when ${testCase.description}`, () => {
          setupQuery(testCase.query)
          const {value} = createModeParam()
          expect(value.value).toBe(testCase.expected)
        })
      }
    })

    describe('Writing to URL', () => {
      it('should call navigateTo when value changes', async () => {
        setupQuery({})
        const {value} = createModeParam()

        value.value = 'edit'
        await flushPromises()

        expect(mockNavigateTo).toHaveBeenCalled()
        expect(mockNavigateTo.mock.calls[0][0]).toEqual({
          path: '/test',
          query: {mode: 'edit'}
        })
        expect(mockNavigateTo.mock.calls[0][1]).toEqual({replace: true})
      })

      it('should preserve other query params', async () => {
        setupQuery({other: 'value', mode: 'view'})
        const {value} = createModeParam()

        value.value = 'edit'
        await flushPromises()

        expect(mockNavigateTo.mock.calls[0][0].query).toEqual({
          other: 'value',
          mode: 'edit'
        })
      })

      it('should not navigate if value is same', async () => {
        setupQuery({mode: 'edit'})
        const {value} = createModeParam()

        value.value = 'edit'
        await flushPromises()

        expect(mockNavigateTo).not.toHaveBeenCalled()
      })
    })

    describe('setValue method', () => {
      it('should update URL using setValue', async () => {
        setupQuery({})
        const {setValue} = createModeParam()

        await setValue('create')
        await flushPromises()

        expect(mockNavigateTo).toHaveBeenCalledWith(
          {path: '/test', query: {mode: 'create'}},
          {replace: true}
        )
      })
    })

    describe('needsSync computed', () => {
      it('should be false when URL matches value', () => {
        setupQuery({mode: 'edit'})
        const {needsSync} = createModeParam()
        expect(needsSync.value).toBe(false)
      })

      it('should be true when URL differs from value', () => {
        setupQuery({mode: 'invalid'})
        const {needsSync} = createModeParam()
        // Value falls back to 'view', but URL still has 'invalid'
        expect(needsSync.value).toBe(true)
      })
    })
  })

  describe('Date Type (Dinner Date)', () => {
    const testDate = new Date('2025-01-15')

    const createDateParam = () => useQueryParam<Date>('date', {
      serialize: (d) => formatDate(d),
      deserialize: (s) => {
        const parsed = parseDate(s)
        return parsed && !isNaN(parsed.getTime()) ? parsed : null
      },
      defaultValue: () => new Date('2025-01-01')
    })

    describe('Reading from URL', () => {
      it('should return default when no query param', () => {
        setupQuery({})
        const {value} = createDateParam()
        expect(value.value.toISOString()).toBe(new Date('2025-01-01').toISOString())
      })

      it('should deserialize valid date from URL', () => {
        setupQuery({date: '15/01/2025'})
        const {value} = createDateParam()
        // Compare dates ignoring time (parseDate creates date at midnight local time)
        expect(value.value.toDateString()).toBe(testDate.toDateString())
      })

      it('should return default for invalid date', () => {
        setupQuery({date: 'invalid'})
        const {value} = createDateParam()
        expect(value.value.toISOString()).toBe(new Date('2025-01-01').toISOString())
      })
    })

    describe('Writing to URL', () => {
      it('should serialize date to URL', async () => {
        setupQuery({})
        const {value} = createDateParam()

        value.value = testDate
        await flushPromises()

        expect(mockNavigateTo.mock.calls[0][0].query).toEqual({
          date: '15/01/2025'
        })
      })
    })
  })

  describe('Normalization', () => {
    it('should use normalize instead of default for invalid values', () => {
      setupQuery({mode: 'invalid'})

      const {value} = useQueryParam<string>('mode', {
        deserialize: (s) => ['view', 'edit'].includes(s) ? s : null,
        defaultValue: 'view',
        normalize: () => 'edit' // Normalize to 'edit' instead of default 'view'
      })

      expect(value.value).toBe('edit')
    })

    it('should use default when normalize returns null', () => {
      setupQuery({mode: 'invalid'})

      const {value} = useQueryParam<string>('mode', {
        deserialize: (s) => ['view', 'edit'].includes(s) ? s : null,
        defaultValue: 'view',
        normalize: () => null // Normalize returns null → use default
      })

      expect(value.value).toBe('view')
    })

    it('should remove query param when normalize returns null on update', async () => {
      setupQuery({mode: 'edit', other: 'value'})

      const {value} = useQueryParam<string>('mode', {
        defaultValue: 'view',
        normalize: (v) => v === 'view' ? null : v // Remove 'view' from URL
      })

      value.value = 'view'
      await flushPromises()

      expect(mockNavigateTo.mock.calls[0][0].query).toEqual({
        other: 'value'
        // mode is removed
      })
    })
  })

  describe('Options', () => {
    describe('preserveOtherParams', () => {
      it('should preserve other params by default', async () => {
        setupQuery({other: 'value'})

        const {value} = useQueryParam<string>('test', {
          defaultValue: 'default'
        })

        value.value = 'new'
        await flushPromises()

        expect(mockNavigateTo.mock.calls[0][0].query).toEqual({
          other: 'value',
          test: 'new'
        })
      })

      it('should not preserve when preserveOtherParams is false', async () => {
        setupQuery({other: 'value'})

        const {value} = useQueryParam<string>('test', {
          defaultValue: 'default',
          preserveOtherParams: false
        })

        value.value = 'new'
        await flushPromises()

        expect(mockNavigateTo.mock.calls[0][0].query).toEqual({
          test: 'new'
        })
      })
    })

    describe('replaceHistory', () => {
      it('should replace history by default', async () => {
        setupQuery({})

        const {value} = useQueryParam<string>('test', {
          defaultValue: 'default'
        })

        value.value = 'new'
        await flushPromises()

        expect(mockNavigateTo.mock.calls[0][1]).toEqual({replace: true})
      })

      it('should push to history when replaceHistory is false', async () => {
        setupQuery({})

        const {value} = useQueryParam<string>('test', {
          defaultValue: 'default',
          replaceHistory: false
        })

        value.value = 'new'
        await flushPromises()

        expect(mockNavigateTo.mock.calls[0][1]).toEqual({replace: false})
      })
    })

    describe('defaultValue factory', () => {
      it('should use factory function for default', () => {
        setupQuery({})

        const {value} = useQueryParam<string>('test', {
          defaultValue: () => 'factory-value'
        })

        expect(value.value).toBe('factory-value')
      })
    })
  })

  describe('Parametrized: All standard types', () => {
    const typeCases = [
      {
        name: 'string',
        options: {
          defaultValue: 'default'
        },
        testValue: 'test',
        expectedQuery: 'test'
      },
      {
        name: 'number (as string)',
        options: {
          serialize: (n: number) => String(n),
          deserialize: (s: string) => {
            const parsed = parseInt(s, 10)
            return isNaN(parsed) ? null : parsed
          },
          defaultValue: 0
        },
        testValue: 42,
        expectedQuery: '42'
      },
      {
        name: 'boolean (as string)',
        options: {
          serialize: (b: boolean) => b ? 'true' : 'false',
          deserialize: (s: string) => s === 'true' ? true : s === 'false' ? false : null,
          defaultValue: false
        },
        testValue: true,
        expectedQuery: 'true'
      }
    ]

    for (const testCase of typeCases) {
      describe(testCase.name, () => {
        it('should read from query', () => {
          setupQuery({test: testCase.expectedQuery})
          const {value} = useQueryParam('test', testCase.options as any)
          expect(value.value).toEqual(testCase.testValue)
        })

        it('should write to query', async () => {
          setupQuery({})
          const {value} = useQueryParam('test', testCase.options as any)

          value.value = testCase.testValue as any
          await flushPromises()

          expect(mockNavigateTo.mock.calls[0][0].query.test).toBe(testCase.expectedQuery)
        })
      })
    }
  })

  describe('Edge Cases', () => {
    it('should handle empty string as valid query value', () => {
      setupQuery({test: ''})

      const {value} = useQueryParam<string>('test', {
        deserialize: (s) => s, // Empty string is valid
        defaultValue: 'default'
      })

      expect(value.value).toBe('')
    })

    it('should handle special characters in serialized value', async () => {
      setupQuery({})

      const {value} = useQueryParam<string>('test', {
        defaultValue: 'default'
      })

      value.value = 'value/with/slashes'
      await flushPromises()

      expect(mockNavigateTo.mock.calls[0][0].query.test).toBe('value/with/slashes')
    })

    it('should handle validation returning false', () => {
      setupQuery({test: 'invalid'})

      const {value} = useQueryParam<string>('test', {
        validate: () => false,
        defaultValue: 'default'
      })

      expect(value.value).toBe('default')
    })
  })
})
