import {type InternalApi} from "nitropack";
import {Prisma, Prisma as PrismaFromClient, PrismaClient} from "@prisma/client"
import {type Season} from '~/composables/useSeason'

type SeasonsApiResponse = InternalApi['/api/admin/season']['get']

export const usePlanStore = defineStore("Plan", () => {

    const activeSeason = ref<ApiResponse<'/api/admin/season/active', 'get'> | null>(null)
    const selectedSeason = ref<Season|null>(null)
    const draftSeason = ref<Season|null>(null)
    const isLoadingSeason = ref(false)
    const error = ref<string|null>(null)
    const seasons =  ref<SeasonsApiResponse>([])
    const states = ['idle', 'loading', 'error', 'createDirty', 'editDirty', 'viewSelected', 'viewNoSeasons'] as const
    const state = ref<typeof states[number]>('idle')


    const isIdle = computed(() => state.value === 'idle')
    const isLoading = computed(() => state.value === 'loading')
    const isNoSeasons = computed(() =>  seasons.value?.length === 0)
    const isDraftDirty = computed(() => state.value === 'createDirty' || state.value === 'editDirty')

    const loadSeasons = async () => {
        const prevState = state.value
        state.value = 'loading'
        isLoadingSeason.value = true
        const response = await useFetch('/api/admin/season')
        seasons.value = response.data.value
        isLoadingSeason.value = false
        state.value = prevState
    }

    const createSeason = async (season: Season) => {
        const prevState = state.value
        isLoadingSeason.value = true
        const response = await useFetch('/api/admin/season', {
            method: 'PUT',
            body: season
        })
        const createdSeason = response.data.value
        isLoadingSeason.value = false
        state.value = prevState
    }

    const updateSeason = async (season: Season) => {
        const prevState = state.value
        isLoadingSeason.value = true
        const response = await useFetch(`/api/admin/season/${season.id}`,
            {
                method: 'POST',
                body: season
            })
        const uodatedSeason = response.data.value
        isLoadingSeason.value = false
        state.value = prevState
    }

    //todo create a converter from Season to SeasonCreateInput and SeasonUpdateInput

    return {
        activeSeason,
        selectedSeason,
        draftSeason,
        isLoading,
        isNoSeasons,
        seasons,
        state,
        loadSeasons,
        createSeason,
        updateSeason
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
