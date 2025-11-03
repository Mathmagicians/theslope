import type { ComputedRef } from 'vue'
import type { Season } from '~/composables/useSeasonValidation'

export interface SeasonSelectorOptions {
  seasons: ComputedRef<Season[]>
  selectedSeasonId: ComputedRef<number | undefined>
  activeSeason: ComputedRef<Season | undefined>
  onSeasonSelect: (id: number) => void
}

export function useSeasonSelector(options: SeasonSelectorOptions) {
  const { seasons, selectedSeasonId, activeSeason, onSeasonSelect } = options

  const route = useRoute()
  const seasonQuery = computed(() => route.query.season as string | undefined)

  const isValidSeason = (shortName?: string) => shortName && seasons.value.some(s => s.shortName === shortName)
  const getSelectedSeasonShortName = () => seasons.value.find(s => s.id === selectedSeasonId.value)?.shortName
  const getActiveSeasonShortName = () => activeSeason.value?.shortName
  const safeSeason = (shortName?: string) => isValidSeason(shortName) ? shortName : (getSelectedSeasonShortName() ?? getActiveSeasonShortName())

  const season = computed({
    get() {
      return safeSeason(route.query.season as string | undefined)
    },
    async set(shortName: string) {
      await onSeasonChange(shortName)
    }
  })

  const updateURLQueryFromSeason = async (shortName: string | undefined) => {
    if (seasonQuery.value === shortName) return
    const query = { ...route.query }
    if (shortName) {
      query.season = shortName
    } else {
      delete query.season
    }
    await navigateTo({ path: route.path, query }, { replace: true })
    console.info(`${LOG_CTX} 🔗 > Navigated to season ${shortName ? shortName : 'default'} in URL`)
  }

  // exposed to handle season selection from dropdown
  const onSeasonChange = async (shortName: string) => {
    const safeSeasonName = safeSeason(shortName)
    const seasonObject = seasons.value.find(s => s.shortName === shortName)

    if (seasonObject && seasonObject.id !== selectedSeasonId.value) {
      onSeasonSelect(seasonObject.id)
    }

    await updateURLQueryFromSeason(safeSeasonName)
    console.info(`${LOG_CTX} 🌱 > SEASON_SELECTOR > Season changed to ${safeSeasonName}, requested was ${shortName}`)
  }

  // signal - should url query be fixed
  const shouldSyncSeason = computed(() => seasonQuery.value !== safeSeason(seasonQuery.value))

  // NAVIGATION GUARD: autosync when URL query is invalid - normalizes to valid season
  // Wait for data to load before attempting correction (activeSeason.value may be null if no active season)
  watchPostEffect(() => {
    if (seasons.value.length === 0) return // Wait for seasons to load
    if (selectedSeasonId.value === null) return // Wait for initial season selection

    if (shouldSyncSeason.value) {
      const validSeason = safeSeason(seasonQuery.value)
      if (validSeason) {
        season.value = validSeason
      }
    }
  })

  return {
    season,
    onSeasonChange,
    safeSeason
  }
}