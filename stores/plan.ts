import {type Season} from '~/composables/useSeasonValidation'
import {FORM_MODES, type FormMode, STORE_STATES, type StoreState} from '~/types/form'
import {useDebounceFn} from '@vueuse/core'

export const usePlanStore = defineStore("Plan", () => {
        // DEPENDENCIES
        const {apiCall, handleApiError} = useApiHandler()
        const draftStorage = useDraftStorage()
        const {getDefaultSeason, coalesceSeason, serializeSeason, deserializeSeason} = useSeason()
        const authStore = useAuthStore()
        const {isAdmin} = storeToRefs(authStore)


        // STATE
        const activeSeason = ref<Season | null>(null)
        const selectedSeason = ref<Season | undefined>(undefined)  // Changed from null to undefined
        const draftSeason = ref<Season | null>(null)
        const error = ref<string | null>(null)
        const seasons = ref<Season[]>([])
        const state = ref<StoreState>(STORE_STATES.VIEW_NO_SEASONS)
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

        const loadSeasons = async () => {
            try {
                const response = await apiCall(
                    async () => useFetch('/api/admin/season'),
                    state,
                    'loadSeasons'
                )
                const deserializedSeasons: Season[] = response.data.value?.map(serialized => deserializeSeason(serialized)) ?? []
                seasons.value = deserializedSeasons
                if (deserializedSeasons.length > 0) {
                    selectedSeason.value = seasons.value[0] // FIXME select current season if available
                }

            } catch (e: any) {
                error.value = e.message
            }
        }

        const createSeason = async (season: Season) => {
            try {
                // Serialize the season data before sending it to the API
                const serializedSeason = serializeSeason(season)
                console.log("📆 > PLAN > createSeason > Serialized season:", serializedSeason)

                await apiCall(
                    async () => useFetch('/api/admin/season', {
                        method: 'PUT',
                        body: serializedSeason,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }),
                    state,
                    'createSeason'
                )
            } catch (e: any) {
                handleApiError(e.message, 'createSeason')
            }
        }

        const updateSeason = async (season: Season) => {
            try {
                // Serialize the season data before sending it to the API
                const serializedSeason = serializeSeason(season)
                console.log("📆 > PLAN > updateSeason > Serialized season:", serializedSeason)

                await apiCall(
                    async () => useFetch(`/api/admin/season/${season.id}`, {
                        method: 'POST',
                        body: serializedSeason,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }),
                    state,
                    'updateSeason'
                )
            } catch (e: any) {
                handleApiError(e.message, 'updateSeason')
            }
        }

        // saves form content in storage
        const saveDraftSeason = async (season: Season, nextState: StoreState, afterState: StoreState) => {
            const prevState = state.value
            try {
                state.value = nextState
                draftSeason.value = season
                await draftStorage.saveDraft({
                    state: nextState,
                    season: season
                })
                state.value = afterState
            } catch (e: any) {
                state.value = STORE_STATES.ERROR
                const err = {statusCode: 500, message: 'Der kunne ikke gemmes kladde'}
                throw new Error(handleApiError(err, 'saveDraftSeason'))
            }
        }

        const debouncedSave = useDebounceFn(async () => {
            if (draftSeason.value && isShouldUseDraft.value) {
                return draftStorage.saveDraft({
                    state: state.value,
                    season: draftSeason.value
                })
                    .then(() => console.debug('Draft saved successfully'))
                    .catch(() => console.info('promise cancelled by debounce'))
                    .catch((error: Error) => {
                        console.error('Failed to save draft:', error)
                    })
            }
        }, 1000)

        // Initialize draft season
        const initDraft = async () => {
            const stored = await draftStorage.loadDraft()
            if (stored) {
                state.value = stored.state
                draftSeason.value = stored.season
                console.info("📆PlanStore > initDraft - found draft in local storage", stored.state, draftSeason.value?.shortName)
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

        const viewSeason = () => selectedSeason

        const getModel = computed(() => {
            console.info("📆 PlanStore > getModel, mode, state, draft, view", formMode.value, state.value, draftSeason.value?.shortName, selectedSeason.value?.shortName)
            switch (state.value) {
                case STORE_STATES.CREATE:
                    return draftSeason
                case STORE_STATES.EDIT:
                    return draftSeason
                case STORE_STATES.VIEW_SELECTED:
                case STORE_STATES.VIEW_NO_SEASONS:
                    return selectedSeason  // Changed from viewSeason function to selectedSeason ref
                default:
                    console.warn("PlanStore > getModel - invalid state - model is undefined", state.value)
                    return undefined
            }
        })

        const onEnterCreate = async () => {
            console.info('📆PLAN > onEnterCreate > mode, state, draft', formMode.value, state.value, draftSeason.value?.shortName)
            state.value = STORE_STATES.CREATE
            draftSeason.value = coalesceSeason(draftSeason.value)
            await draftStorage.saveDraft({state: state.value, season: draftSeason.value})
            console.info('📆PLAN > onEnterCreate > mode, state, draftSeason', formMode.value, state.value, draftSeason.value?.shortName)
        }

        const onEnterEdit = async () => {
            try {
                state.value = STORE_STATES.EDIT
                if (draftSeason.value && draftSeason.value?.shortName === selectedSeason.value?.shortName) {
                    draftSeason.value = coalesceSeason(draftSeason.value, selectedSeason.value)
                } else {
                    draftSeason.value = selectedSeason.value
                }
                await draftStorage.saveDraft({state: state.value, season: draftSeason.value})
            } catch
                (e) {
                console.error("Error entering edit mode:", e)
                state.value = STORE_STATES.ERROR
                error.value = e instanceof Error ? e.message : 'Failed to enter edit mode'
                // Consider showing a notification to the user
            }
        }

        const onEnterView = async () => {
            state.value = isNoSeasons ? STORE_STATES.VIEW_NO_SEASONS : STORE_STATES.VIEW_SELECTED
            draftSeason.value = null
            await draftStorage.clearDraft()
        }
        const onModeChange = async (mode: FormMode) => {
            switch (mode) {
                case FORM_MODES.CREATE:
                    return onEnterCreate()
                case FORM_MODES.EDIT:
                    return onEnterEdit()
                case FORM_MODES.VIEW:
                    return onEnterView()
                default:
                    console.warn("PlanStore > onEnter - invalid form mode", mode)
            }
        }


        // INITIALIZE

        const init = async (mode: FormMode) => {
            console.log("📆 PlanStore > init - mode, state", mode, state.value)
            // Load seasons (server or client)
            await loadSeasons()

            // Initialize draft season from storage (client-only)
            if (process.client) {
                await initDraft()
                switch (state.value) {
                    case STORE_STATES.CREATE:
                        formMode.value = FORM_MODES.CREATE
                        return onModeChange(FORM_MODES.CREATE)
                    case STORE_STATES.EDIT:
                        formMode.value = FORM_MODES.EDIT
                        return onModeChange(FORM_MODES.EDIT)
                    case STORE_STATES.VIEW_SELECTED:
                    case STORE_STATES.VIEW_NO_SEASONS:
                        formMode.value = FORM_MODES.VIEW
                        return onEnterView()
                    default:
                        console.warn("📆 PlanStore > init > dropped to default: mode, state", formMode.value, state.value)
                        formMode.value = mode
                        await onModeChange(mode)
                }
            } else {
                // On server, always use the specified mode without loading draft
                formMode.value = mode
                if (mode === FORM_MODES.VIEW) {
                    state.value = isNoSeasons.value ? STORE_STATES.VIEW_NO_SEASONS : STORE_STATES.VIEW_SELECTED
                }
            }
        }

        // WATCH FOR CHANGES
        watch(draftSeason, async (newDraft) => {
            if (newDraft && isShouldUseDraft.value) {
                await debouncedSave()
            }
        }, {deep: true})

        watch(formMode, async (newMode) => {
            if (newMode) await onModeChange(newMode)
        })

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
            saveDraftSeason,
            createDraft,
            editDraft,
            viewSeason,
            init
        }
    }
)

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
