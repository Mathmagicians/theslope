import type {ComputedRef} from 'vue'
import type {Season} from '~/composables/useSeasonValidation'

export interface SeasonSelectorOptions {
    seasons: ComputedRef<Season[]>
    selectedSeasonId: ComputedRef<number | null>
    activeSeason: ComputedRef<Season | null>
}

const SEASON_PRIORITY = 0

/**
 * `?season=` as a season shortName (ADR-006): a name that is no loaded season falls back to the selected season,
 * then the active one; the URL syncs once the seasons and the selection have loaded.
 * Writes at the default priority (`SEASON_PRIORITY`): `?season=` has one writer, so no write of a tick conflicts with it.
 */
export function useSeasonSelector(options: SeasonSelectorOptions) {
    const {seasons, selectedSeasonId, activeSeason} = options

    const isValidSeason = (shortName?: string | null): shortName is string => !!shortName && seasons.value.some(s => s.shortName === shortName)
    const fallbackSeason = () => seasons.value.find(s => s.id === selectedSeasonId.value)?.shortName ?? activeSeason.value?.shortName
    const safeSeason = (shortName?: string | null) => isValidSeason(shortName) ? shortName : fallbackSeason()

    // The dropdown writes the URL only; the plan store follows ?season= through the getter the page hands it
    const {value: season, setValue} = useQueryParam<string>('season', {
        validate: isValidSeason,
        normalize: shortName => safeSeason(shortName) ?? null,
        defaultValue: () => fallbackSeason() ?? '',
        syncWhen: () => seasons.value.length > 0 && selectedSeasonId.value !== null,
        priority: SEASON_PRIORITY
    })

    const onSeasonChange = async (shortName: string) => {
        const safeSeasonName = safeSeason(shortName)
        await setValue(safeSeasonName ?? '')
        console.info(`${LOG_CTX} 🌱 > SEASON_SELECTOR > Season changed to ${safeSeasonName}, requested was ${shortName}`)
    }

    return {
        season,
        onSeasonChange,
        safeSeason
    }
}
