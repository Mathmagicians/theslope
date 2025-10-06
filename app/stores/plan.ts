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
            if (seasons.value.length > 0) {
                onSeasonSelect(seasons.value.at(-1)?.id ?? -1)
            }
        }

        const onSeasonSelect = (id: number) => {
            if (id >= 0) {
                selectedSeason.value = seasons.value.find(season => season.id === id) ?? null
            }
        }

        const createSeason = async (season: Season) => {
            try {
                const serializedSeason = serializeSeason(season)
                await $fetch('/api/admin/season', {
                    method: 'PUT',
                    body: serializedSeason,
                    headers: {'Content-Type': 'application/json'}
                })
                await loadSeasons()
            } catch (e: any) {
                handleApiError(e, 'createSeason')
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
            await loadSeasons()
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
            onSeasonSelect
        }
    }
)

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
