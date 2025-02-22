import {type InternalApi} from "nitropack";
import {Prisma, Prisma as PrismaFromClient, PrismaClient} from "@prisma/client"
import {type Season} from '~/composables/useSeason'
import {FORM_MODES, type FormMode, STORE_STATES, type StoreState} from '~/types/form'
import type {ApiResponse} from "~/composables/ApiResponse";


type SeasonsApiResponse = InternalApi['/api/admin/season']['get']

export const usePlanStore = defineStore("Plan", () => {
    // DEPENDENCIES
    const {apiCall} = useApiHandler()
    const draftStorage = useDraftStorage()

    // STATE
    const activeSeason = ref<ApiResponse<'/api/admin/season/active', 'get'> | null>(null)
    const selectedSeason = ref<Season|null>(null)
    const draftSeason = ref<Season|null>(null)
    const error = ref<string|null>(null)
    const seasons = ref<SeasonsApiResponse>([])
    const state = ref<StoreState>(STORE_STATES.VIEW_NO_SEASONS)

    // COMPUTED STATE
    const isLoading = computed(() => state.value === STORE_STATES.LOADING)
    const isNoSeasons = computed(() => seasons.value?.length === 0)
    const isShouldUseDraft = computed(() =>
         formMode.value === FORM_MODES.CREATE  ||
         formMode.value === FORM_MODES.EDIT
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
            const err = { statusCode: 500, message: 'Der kunne ikke gemmes kladde' }
            throw new Error(handleApiError(err, 'saveDraftSeason'))
        }
    }

    // Initialize draft season
    const initDraft = async () => {
        const stored = await draftStorage.loadDraft()
        if (stored) {
            state.value = stored.state
            draftSeason.value = stored.season
            console.info("PlanStore > initDraft - draftSeason", draftSeason.value?.shortName)
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

    const getModelForMode = (mode: FormMode) => {
        switch (mode) {
            case FORM_MODES.CREATE:
                return createDraft()
            case FORM_MODES.EDIT:
                return editDraft()
            case FORM_MODES.VIEW:
                return viewSeason()
            default:
                console.warn("PlanStore > getModelForMode - invalid form mode", mode)
                return viewSeason()
        }
    }

    const onEnter = async (mode: FormMode) => {
        switch (mode) {
            case FORM_MODES.CREATE:
                state.value = STORE_STATES.CREATE
                formMode.value = FORM_MODES.CREATE
                draftSeason.value = createDraft()
                await draftStorage.saveDraft({ state: state.value, season: draftSeason.value })
                break
            case FORM_MODES.EDIT:
                state.value = STORE_STATES.EDIT
                formMode.value = FORM_MODES.EDIT
                draftSeason.value = editDraft()
                await draftStorage.saveDraft({ state: state.value, season: draftSeason.value })
                break
            case FORM_MODES.VIEW:
                draftSeason.value = null
                await draftStorage.clearDraft()
                state.value = isNoSeasons.value
                    ? STORE_STATES.VIEW_NO_SEASONS
                    : STORE_STATES.VIEW_SELECTED
                formMode.value = FORM_MODES.VIEW
                break
            default:
                console.warn("PlanStore > onEnter - invalid form mode", mode)
        }
    }


    // INITIALIZE

    // Initialize draft season from storage
    initDraft()
    // Load seasons
    loadSeasons()

    // WATCH FOR CHANGES
    watch(draftSeason, async (newDraft) => {
        if (newDraft && isShouldUseDraft.value) {
            await draftStorage.saveDraft({ state: state.value, season: newDraft })
        }
    }, { deep: true })

    return {
        // state
        activeSeason,
        selectedSeason,
        draftSeason,
        isLoading,
        isNoSeasons,
        seasons,
        state,
        error,
        // actions
        loadSeasons,
        createSeason,
        updateSeason,
        saveDraftSeason,
        createDraft,
        editDraft,
        viewSeason,
        getModelForMode
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
