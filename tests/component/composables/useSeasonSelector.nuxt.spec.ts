import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { computed, ref, type Ref } from 'vue'
import type { Season } from '~/composables/useSeasonValidation'
import type { SeasonSelectorOptions } from '~/composables/useSeasonSelector'
import { SeasonFactory } from '~~/tests/e2e/testDataFactories/seasonFactory'

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

// Helper to create properly typed options for useSeasonSelector
const createSelectorOptions = (
  seasonsRef: Ref<Season[]>,
  selectedSeasonIdRef: Ref<number | null>,
  activeSeasonRef: Ref<Season | null>,
  onSeasonSelect: (id: number) => void
): SeasonSelectorOptions => ({
  seasons: computed(() => seasonsRef.value),
  selectedSeasonId: computed(() => selectedSeasonIdRef.value),
  activeSeason: computed(() => activeSeasonRef.value),
  onSeasonSelect
})

describe('useSeasonSelector', () => {
  let mockSeasonsRef: Ref<Season[]>
  let mockSelectedSeasonIdRef: Ref<number | null>
  let mockActiveSeasonRef: Ref<Season | null>
  let mockOnSeasonSelect: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteData.query = {}

    // Setup mock dependencies as refs (simulating what store would provide)
    mockSeasonsRef = ref(mockSeasons)
    mockSelectedSeasonIdRef = ref(mockSeasons[0]!.id ?? null)
    mockActiveSeasonRef = ref(mockSeasons.find(s => s.isActive) ?? null)
    mockOnSeasonSelect = vi.fn((id: number) => {
      // Simulate store behavior: update selectedSeasonId when season is selected
      mockSelectedSeasonIdRef.value = id
    })
  })

  it.each([
    { queryParam: undefined, expected: 'fall-2025', desc: 'returns selected season when no query param' },
    { queryParam: 'spring-2026', expected: 'spring-2026', desc: 'returns season from valid query param' },
    { queryParam: 'invalid', expected: 'fall-2025', desc: 'returns selected season for invalid query param' }
  ])('$desc', async ({ queryParam, expected }) => {
    mockRouteData.query = queryParam ? { season: queryParam } : {}

    const { useSeasonSelector } = await import('~/composables/useSeasonSelector')
    const { season } = useSeasonSelector(
      createSelectorOptions(mockSeasonsRef, mockSelectedSeasonIdRef, mockActiveSeasonRef, mockOnSeasonSelect)
    )

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
    const { onSeasonChange } = useSeasonSelector(
      createSelectorOptions(mockSeasonsRef, mockSelectedSeasonIdRef, mockActiveSeasonRef, mockOnSeasonSelect)
    )

    await onSeasonChange(newSeason)

    expect(mockNavigateTo).toHaveBeenCalledWith(
      { path: '/admin/planning', query: expectedQuery },
      { replace: true }
    )
  })

  it('calls onSeasonSelect when season changes', async () => {
    mockRouteData.query = {}

    const { useSeasonSelector } = await import('~/composables/useSeasonSelector')
    const { onSeasonChange } = useSeasonSelector(
      createSelectorOptions(mockSeasonsRef, mockSelectedSeasonIdRef, mockActiveSeasonRef, mockOnSeasonSelect)
    )

    await onSeasonChange('spring-2026')

    expect(mockOnSeasonSelect).toHaveBeenCalledWith(2) // spring-2026 has id: 2
  })

  it.each([
    { queryParam: undefined, desc: 'redirects to selected season when no query param' },
    { queryParam: 'invalid', desc: 'redirects to selected season when invalid query param' }
  ])('$desc', async ({ queryParam }) => {
    mockRouteData.query = queryParam ? { season: queryParam } : {}

    const { useSeasonSelector } = await import('~/composables/useSeasonSelector')
    useSeasonSelector(
      createSelectorOptions(mockSeasonsRef, mockSelectedSeasonIdRef, mockActiveSeasonRef, mockOnSeasonSelect)
    )

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
    const { onSeasonChange } = useSeasonSelector(
      createSelectorOptions(mockSeasonsRef, mockSelectedSeasonIdRef, mockActiveSeasonRef, mockOnSeasonSelect)
    )

    // Try to select the already selected season (which also matches URL)
    await onSeasonChange('fall-2025')

    // Should not navigate (already in sync) and not call onSeasonSelect (already selected)
    expect(mockNavigateTo).not.toHaveBeenCalled()
    expect(mockOnSeasonSelect).not.toHaveBeenCalled()
  })
})