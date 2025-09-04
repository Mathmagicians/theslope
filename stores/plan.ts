import {type Season, type SerializedSeason} from '~/composables/useSeasonValidation'
import {FORM_MODES, type FormMode, STORE_STATES, type StoreState} from '~/types/form'

export const usePlanStore = defineStore("Plan", () => {
        // DEPENDENCIES
        const {apiCall, handleApiError} = useApiHandler()
        const {getDefaultSeason, coalesceSeason, serializeSeason, deserializeSeason} = useSeason()
        const authStore = useAuthStore()
        const {isAdmin} = storeToRefs(authStore)

        // STATE
        const activeSeason = ref<Season | null>(null)
        const selectedSeason = ref<Season | null>(null)
        const draftSeason = ref<Season | null>(null)
        const error = ref<string | null>(null)
        const seasons = ref<Season[]>([])
        const state = ref<StoreState>(STORE_STATES.LOADING)
        const formMode = ref<FormMode>(FORM_MODES.VIEW)

        // COMPUTED STATE
        const isLoading = computed(() => state.value === STORE_STATES.LOADING)
        const isNoSeasons = computed(() => seasons.value?.length === 0)
        const isShouldUseDraft = computed(() =>
            state.value === STORE_STATES.CREATE ||
            state.value === STORE_STATES.EDIT
        )

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

        // ACTIONS

        const prettyPrint = (action: string) => {
            console.log(`📆 > PLAN > ${action} :`, {
                seasonsLength: seasons.value.length,
                isNoSeasons: isNoSeasons.value,
                name: selectedSeason.value?.shortName,
                id: selectedSeason.value?.id,
                formMode: formMode.value,
                state: state.value,
                draft: draftSeason.value?.shortName,
                draftId: draftSeason.value?.id,
                hasDraft: !!draftSeason.value,
                getModelType: draftSeason.value && state.value === STORE_STATES.CREATE ? 'draftSeason' : 
                             draftSeason.value && state.value === STORE_STATES.EDIT ? 'draftSeason' :
                             selectedSeason.value && state.value === STORE_STATES.VIEW_SELECTED ? 'selectedSeason' : 'null'
            })
        }

        const loadSeasons = async () => {
            try {
                const response = await apiCall(
                    async () => useFetch<SerializedSeason[]>('/api/admin/season'),
                    state,
                    'loadSeasons'
                )
                const deserializedSeasons: Season[] = response.data.value?.map(serialized => deserializeSeason(serialized)) ?? []
                seasons.value = deserializedSeasons
                prettyPrint('loadSeasons after fetch')
                if (seasons.value.length > 0) {
                    onSeasonSelect(seasons.value.at(-1)?.id ?? -1)
                    await onEnterView()
                    prettyPrint('loadSeasons after onSeasonSelect')
                }
            } catch (e: any) {
                handleApiError(e, 'loadSeasons')
            }
        }

        const onSeasonSelect = (id: number) => {
            console.log("📆 > PLAN > onSeasonSelect > id:", id)
            if (id >= 0)
                selectedSeason.value = seasons.value.find(season => season.id === id) ?? null
            prettyPrint('onSeasonSelect')
        }

        // debug purpose
        watch(selectedSeason, (newValue) => {
            console.log("📆 > PLAN > selectedSeason changed:", newValue)
        }, {deep: true})

        const createSeason = async (season: Season) => {
            try {
                // Serialize the season data before sending it to the API
                const serializedSeason = serializeSeason(season)
                console.log("📆 > PLAN > createSeason > Serialized season:", serializedSeason)
                prettyPrint('createSeason')

                await apiCall(
                    async () => {
                        // Use $fetch instead of useFetch to avoid warning when component is already mounted
                        const result = await $fetch('/api/admin/season', {
                            method: 'PUT',
                            body: serializedSeason,
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        // Return with the same structure as useFetch would
                        return { data: { value: result } }
                    },
                    state,
                    'createSeason'
                )
            } catch (e: any) {
                handleApiError(e, 'createSeason')
            }
        }

        const updateSeason = async (season: Season) => {
            try {
                // Serialize the season data before sending it to the API
                const serializedSeason = serializeSeason(season)
                console.log("📆 > PLAN > updateSeason > Serialized season:", serializedSeason)

                await apiCall(
                    async () => {
                        // Use $fetch instead of useFetch to avoid warning when component is already mounted
                        const result = await $fetch(`/api/admin/season/${season.id}`, {
                            method: 'POST',
                            body: serializedSeason,
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        // Return with the same structure as useFetch would
                        return { data: { value: result } }
                    },
                    state,
                    'updateSeason'
                )
            } catch (e: any) {
                handleApiError(e, 'updateSeason call failed')
            }
        }

        const createDraft = () => {
            draftSeason.value = getDefaultSeason()
            return draftSeason
        }

        const editDraft = () => {
            draftSeason.value = selectedSeason.value
            return draftSeason
        }

        const getModel = computed(() => {
            prettyPrint('getModel')
            switch (state.value) {
                case STORE_STATES.CREATE:
                    return draftSeason
                case STORE_STATES.EDIT:
                    return draftSeason
                case STORE_STATES.VIEW_SELECTED:
                    return selectedSeason
                case STORE_STATES.VIEW_NO_SEASONS:
                default:
                    console.warn("PlanStore > getModel - model is null", state.value)
                    return null
            }
        })

        const onEnterCreate = async () => {
            formMode.value = FORM_MODES.CREATE
            
            if (draftSeason.value && !draftSeason.value.id && state.value === STORE_STATES.CREATE) {
                // Keep existing valid draft
                prettyPrint('onEnterCreate - using existing draft')
            } else {
                // Start fresh
                state.value = STORE_STATES.CREATE
                draftSeason.value = getDefaultSeason()
                prettyPrint('onEnterCreate - created new draft')
            }
        }

        const onEnterEdit = async () => {
            formMode.value = FORM_MODES.EDIT
            try {
                state.value = STORE_STATES.EDIT
                if (draftSeason.value && draftSeason.value?.shortName === selectedSeason.value?.shortName) {
                    draftSeason.value = coalesceSeason(draftSeason.value, selectedSeason.value)
                } else {
                    draftSeason.value = selectedSeason.value
                }
                prettyPrint('onEnterEdit')
            } catch (e) {
                console.error("Plan > onEnterEdit > Error entering edit mode:", e)
                handleApiError(e, 'Plan > onEnterEdit > Error entering edit mode:')
            }
        }

        const onEnterView = async () => {
            formMode.value = FORM_MODES.VIEW
            state.value = isNoSeasons.value ? STORE_STATES.VIEW_NO_SEASONS : STORE_STATES.VIEW_SELECTED
            draftSeason.value = null
            prettyPrint('onEnterView - after state change')
        }

        const onModeChange = async (mode: FormMode) => {
            prettyPrint('onModeChange')
            switch (mode) {
                case FORM_MODES.CREATE:
                    return onEnterCreate()
                case FORM_MODES.EDIT:
                    return onEnterEdit()
                case FORM_MODES.VIEW:
                default:
                    return onEnterView()
            }
        }

        // INITIALIZE
        const init = async () => {
            prettyPrint('init')
            // Load seasons (server or client)
            await loadSeasons()

            switch (state.value) {
                case STORE_STATES.CREATE:
                    return onModeChange(FORM_MODES.CREATE)
                case STORE_STATES.EDIT:
                    return onModeChange(FORM_MODES.EDIT)
                case STORE_STATES.VIEW_SELECTED:
                case STORE_STATES.VIEW_NO_SEASONS:
                case STORE_STATES.ERROR:
                case STORE_STATES.LOADING:
                default:
                    return onModeChange(FORM_MODES.VIEW)
            }
        }

        return {
            // state
            activeSeason,
            selectedSeason,
            draftSeason,
            formMode,
            // computed state
            isLoading,
            isNoSeasons,
            seasons,
            state,
            error,
            disabledModes,
            getModel,
            // actions
            loadSeasons,
            createSeason,
            updateSeason,
            onSeasonSelect,
            createDraft,
            editDraft,
            onModeChange,
            init
        }
    }
)

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}