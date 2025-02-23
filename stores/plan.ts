import {type InternalApi} from "nitropack";
import {type Season} from '~/composables/useSeason'
import {FORM_MODES, type FormMode, STORE_STATES, type StoreState} from '~/types/form'
import type {ApiResponse} from "~/composables/ApiResponse";

type SeasonsApiResponse = InternalApi['/api/admin/season']['get']

export const usePlanStore = defineStore("Plan", () => {
    // DEPENDENCIES
    const {apiCall} = useApiHandler()
    const draftStorage = useDraftStorage()
    const  {getDefaultSeason, coalesceSeason}  = useSeason()
    const authStore = useAuthStore()
    const {isAdmin} = storeToRefs(authStore)

    // STATE
    const activeSeason = ref<ApiResponse<'/api/admin/season/active', 'get'> | null>(null)
    const selectedSeason = ref<Season | null>(null)
    const draftSeason = ref<Season | null>(null)
    const error = ref<string | null>(null)
    const seasons = ref<SeasonsApiResponse>([])
    const state = ref<StoreState>(STORE_STATES.VIEW_NO_SEASONS)
    const formMode = ref<FormMode | undefined>()

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
            disabledSet.add(FORM_MODES.VIEW)
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
            seasons.value = response.data.value ?? []
        } catch (e: any) {
            error.value = e.message
        }
    }

    const createSeason = async (season: Season) => {
        try {
            await apiCall(
                async () => useFetch('/api/admin/season', {
                    method: 'PUT',
                    body: season
                }),
                state,
                'createSeason'
            )
        } catch (e: any) {
            error.value = e.message
        }
    }

    const updateSeason = async (season: Season) => {
        try {
            await apiCall(
                async () => useFetch(`/api/admin/season/${season.id}`, {
                    method: 'POST',
                    body: season
                }),
                state,
                'updateSeason'
            )
        } catch (e: any) {
            error.value = e.message
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

    const getModel = computed(( ) => {
        console.info("??PlanStore > getModel, mode, state, draft, view", formMode.value, state.value, draftSeason.value?.shortName, viewSeason().value?.shortName)
        switch (state.value) {
            case STORE_STATES.CREATE: return draftSeason
            case STORE_STATES.EDIT: return draftSeason
            case STORE_STATES.VIEW_SELECTED: return viewSeason()
            default:
                return viewSeason()
        }
    })

    const onEnterCreate = async () => {
        console.info('📆PLAN > onEnterCreate > mode, state, draft',  formMode.value, state.value,draftSeason.value?.shortName)
        state.value = STORE_STATES.CREATE
        draftSeason.value = coalesceSeason(draftSeason.value)
        await draftStorage.saveDraft({state: state.value, season: draftSeason.value})
        console.info('📆PLAN > onEnterCreate > mode, state, draftSeason',  formMode.value, state.value,draftSeason.value?.shortName)
    }

    const onEnterEdit = async () => {
        state.value = STORE_STATES.EDIT
        draftSeason.value = draftSeason.value?.shortName === selectedSeason.value?.shortName ?
            coalesceSeason(draftSeason.value, selectedSeason.value) : selectedSeason.value
        await draftStorage.saveDraft({state: state.value, season: draftSeason})
    }

    const onEnterView = async () => {
        state.value =  isNoSeasons ? STORE_STATES.VIEW_NO_SEASONS:  STORE_STATES.VIEW_SELECTED
        draftSeason.value = null
        await draftStorage.clearDraft()
    }
    const onModeChange = async (mode: FormMode) => {
        switch (mode) {
            case FORM_MODES.CREATE: return onEnterCreate()
            case FORM_MODES.EDIT: return onEnterEdit()
            case FORM_MODES.VIEW: return onEnterView()
            default:
                console.warn("PlanStore > onEnter - invalid form mode", mode)
        }
    }


    // INITIALIZE

    const init = async (mode: FormMode) => {
        console.log("📆 PlanStore > init - mode, state", mode, state.value)
        // Load seasons
        await loadSeasons()
        // Initialize draft season from storage
        await initDraft()
        switch (state.value) {
            case STORE_STATES.CREATE:
                formMode.value = FORM_MODES.CREATE
                return onModeChange(FORM_MODES.CREATE)
            case STORE_STATES.EDIT:
                formMode.value = FORM_MODES.EDIT
                return onModeChange(FORM_MODES.EDIT)
            case STORE_STATES.VIEW_SELECTED:
                formMode.value = FORM_MODES.VIEW
                return onEnterView()
            default:
                console.warn("📆 PlanStore > init > dropped to default: mode, state", formMode.value, state.value)
                formMode.value = mode
                onModeChange(mode)
        }
    }

    // WATCH FOR CHANGES
    watch(draftSeason, async (newDraft) => {
        if (newDraft && isShouldUseDraft.value) {
            await draftStorage.saveDraft({state: state.value, season: newDraft})
        }
    }, {deep: true})

    watch(formMode, async (newMode) => {
        onModeChange(newMode)
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
        // actions
        loadSeasons,
        createSeason,
        updateSeason,
        saveDraftSeason,
        createDraft,
        editDraft,
        viewSeason,
        getModel,
        init
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
