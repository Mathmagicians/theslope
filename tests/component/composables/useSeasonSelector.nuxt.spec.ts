import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { computed, ref, nextTick } from 'vue'
import { type Season } from '~/composables/useSeasonValidation'
import { SeasonFactory } from '../../e2e/testDataFactories/seasonFactory'

const { mockNavigateTo, mockRouteData } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockRouteData: { path: '/admin/planning', params: {}, query: {}, hash: '' }
}))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRoute', () => () => mockRouteData)
mockNuxtImport('useRouter', () => () => ({ push: vi.fn(), replace: vi.fn() }))

// Mock seasons using factory pattern
const mockSeasons: Season[] = [
  {
    ...SeasonFactory.defaultSeason('fall-2025'),
    id: 1,
    shortName: 'fall-2025',
    isActive: true
  },
  {
    ...SeasonFactory.defaultSeason('spring-2026'),
    id: 2,
    shortName: 'spring-2026',
    isActive: false,
    seasonDates: { start: new Date('2026-01-01'), end: new Date('2026-05-31') }
  }
]

describe('useSeasonSelector', () => {
  let mockSeasonsRef: any
  let mockActiveSeasonRef: any
  let mockOnSeasonSelect: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteData.query = {}

    // Setup mock dependencies as refs (simulating what store would provide)
    mockSeasonsRef = ref(mockSeasons)
    mockActiveSeasonRef = ref(mockSeasons[0])
    mockOnSeasonSelect = vi.fn((id: number) => {
      // Simulate store behavior: update activeSeason when season is selected
      const selected = mockSeasons.find(s => s.id === id)
      if (selected) {
        mockActiveSeasonRef.value = selected
      }
    })
  })

  it.each([
    { queryParam: undefined, expected: 'fall-2025', desc: 'returns active season when no query param' },
    { queryParam: 'spring-2026', expected: 'spring-2026', desc: 'returns season from valid query param' },
    { queryParam: 'invalid', expected: 'fall-2025', desc: 'returns active season for invalid query param' }
  ])('$desc', async ({ queryParam, expected }) => {
    mockRouteData.query = queryParam ? { season: queryParam } : {}

    const { useSeasonSelector } = await import('~/composables/useSeasonSelector')
    const { season } = useSeasonSelector({
      seasons: computed(() => mockSeasonsRef.value),
      activeSeason: computed(() => mockActiveSeasonRef.value),
      onSeasonSelect: mockOnSeasonSelect
    })

    await vi.waitFor(() => {
      expect(season.value).toBe(expected)
    })
  })

  it.each([
    { initialQuery: {}, newSeason: 'fall-2025', expectedQuery: { season: 'fall-2025' } },
    { initialQuery: { mode: 'edit' }, newSeason: 'spring-2026', expectedQuery: { mode: 'edit', season: 'spring-2026' } }
  ])('onSeasonChange updates URL: $expectedQuery', async ({ initialQuery, newSeason, expectedQuery }) => {
    mockRouteData.query = initialQuery

    const { useSeasonSelector } = await import('~/composables/useSeasonSelector')
    const { onSeasonChange } = useSeasonSelector({
      seasons: computed(() => mockSeasonsRef.value),
      activeSeason: computed(() => mockActiveSeasonRef.value),
      onSeasonSelect: mockOnSeasonSelect
    })

    await onSeasonChange(newSeason)

    expect(mockNavigateTo).toHaveBeenCalledWith(
      { path: '/admin/planning', query: expectedQuery },
      { replace: true }
    )
  })

  it('calls onSeasonSelect when season changes', async () => {
    mockRouteData.query = {}

    const { useSeasonSelector } = await import('~/composables/useSeasonSelector')
    const { onSeasonChange } = useSeasonSelector({
      seasons: computed(() => mockSeasonsRef.value),
      activeSeason: computed(() => mockActiveSeasonRef.value),
      onSeasonSelect: mockOnSeasonSelect
    })

    await onSeasonChange('spring-2026')

    expect(mockOnSeasonSelect).toHaveBeenCalledWith(2) // spring-2026 has id: 2
  })

  it.each([
    { queryParam: undefined, desc: 'redirects to active season when no query param' },
    { queryParam: 'invalid', desc: 'redirects to active season when invalid query param' }
  ])('$desc', async ({ queryParam }) => {
    mockRouteData.query = queryParam ? { season: queryParam } : {}

    const { useSeasonSelector } = await import('~/composables/useSeasonSelector')
    useSeasonSelector({
      seasons: computed(() => mockSeasonsRef.value),
      activeSeason: computed(() => mockActiveSeasonRef.value),
      onSeasonSelect: mockOnSeasonSelect
    })

    await vi.waitFor(() => {
      expect(mockNavigateTo).toHaveBeenCalledWith(
        { path: '/admin/planning', query: { season: 'fall-2025' } },
        { replace: true }
      )
    })
  })

  it('does not call onSeasonSelect or navigate when selecting already selected season with matching URL', async () => {
    mockRouteData.query = { season: 'fall-2025' }

    const { useSeasonSelector } = await import('~/composables/useSeasonSelector')
    const { onSeasonChange } = useSeasonSelector({
      seasons: computed(() => mockSeasonsRef.value),
      activeSeason: computed(() => mockActiveSeasonRef.value),
      onSeasonSelect: mockOnSeasonSelect
    })

    // Try to select the already active season (which also matches URL)
    await onSeasonChange('fall-2025')

    // Should not navigate (already in sync) and not call onSeasonSelect (already selected)
    expect(mockNavigateTo).not.toHaveBeenCalled()
    expect(mockOnSeasonSelect).not.toHaveBeenCalled()
  })
})