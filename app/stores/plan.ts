import {type Season, type SerializedSeason} from '~/composables/useSeasonValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

export const usePlanStore = defineStore("Plan", () => {
        // DEPENDENCIES
        const {handleApiError} = useApiHandler()
        const {serializeSeason, deserializeSeason} = useSeason()
        const authStore = useAuthStore()
        const {isAdmin} = storeToRefs(authStore)

        // DATA FETCHING - useFetch for SSR compatibility with auth context
        const { data: seasonsData, status, error: fetchError, refresh: refreshSeasons } = useFetch(
            '/api/admin/season',
            {
                transform: (data: SerializedSeason[]) => data.map(serialized => deserializeSeason(serialized)),
                onResponseError({ error }) {
                    handleApiError(error, 'loadSeasons')
                }
            }
        )

        // STATE - Data only
        const selectedSeason = ref<Season | null>(null)
        const seasons = computed(() => seasonsData.value ?? [])
        const isLoading = computed(() => status.value === 'pending')

        // COMPUTED STATE
        const isNoSeasons = computed(() => seasons.value?.length === 0)

        // HELPER - Auto-select first season
        const autoSelectFirstSeason = () => {
            if (seasons.value.length > 0 && !selectedSeason.value) {
                onSeasonSelect(seasons.value.at(0)?.id ?? -1)
            }
        }

        const disabledModes = computed(() => {
            const disabledSet: Set<FormMode> = new Set()
            if (isNoSeasons.value) {
                disabledSet.add(FORM_MODES.EDIT)
            }
            if (!isAdmin.value) {
                disabledSet.add(FORM_MODES.CREATE)
                disabledSet.add(FORM_MODES.EDIT)
            }
            return [...disabledSet]
        })

        // ACTIONS - CRUD operations only
        const loadSeasons = async () => {
            await refreshSeasons()
            autoSelectFirstSeason()
        }

        const fetchSeason = async (id: number): Promise<Season> => {
            try {
                const serializedSeason = await $fetch<SerializedSeason>(`/api/admin/season/${id}`)
                return deserializeSeason(serializedSeason)
            } catch (e: any) {
                handleApiError(e, 'fetchSeason')
                throw e
            }
        }

        const onSeasonSelect = async (id: number) => {
            if (id >= 0) {
                selectedSeason.value = await fetchSeason(id)
            }
        }

        const createSeason = async (season: Season): Promise<Season> => {
            try {
                const serializedSeason = serializeSeason(season)
                const createdSeason = await $fetch<Season>('/api/admin/season', {
                    method: 'PUT',
                    body: serializedSeason,
                    headers: {'Content-Type': 'application/json'}
                })
                await loadSeasons()
                return createdSeason
            } catch (e: any) {
                handleApiError(e, 'createSeason')
                throw e
            }
        }

        const generateDinnerEvents = async (seasonId: number) => {
            try {
                const result = await $fetch<{seasonId: number, eventCount: number, events: any[]}>(`/api/admin/season/${seasonId}/generate-dinner-events`, {
                    method: 'POST'
                })
                console.info(`🗓️ > PLAN_STORE > Generated ${result.eventCount} dinner events for season ${seasonId}`)
                return result
            } catch (e: any) {
                handleApiError(e, 'generateDinnerEvents')
                throw e
            }
        }

        const updateSeason = async (season: Season) => {
            try {
                const serializedSeason = serializeSeason(season)
                await $fetch(`/api/admin/season/${season.id}`, {
                    method: 'POST',
                    body: serializedSeason,
                    headers: {'Content-Type': 'application/json'}
                })
                await loadSeasons()
            } catch (e: any) {
                handleApiError(e, 'updateSeason')
                throw e
            }
        }

        // INITIALIZATION - Component will call init() in onMounted
        const initPlanStore = async () => {
            autoSelectFirstSeason()
        }

        return {
            // state
            selectedSeason,
            seasons,
            // computed state
            isLoading,
            isNoSeasons,
            disabledModes,
            error: fetchError,
            // actions
            initPlanStore,
            loadSeasons,
            createSeason,
            updateSeason,
            generateDinnerEvents,
            onSeasonSelect
        }
    }
)

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
