import {type InternalApi} from "nitropack";
import {Season, Prisma as PrismaFromClient, PrismaClient} from "@prisma/client"
import type SeasonCreateInput = PrismaFromClient.SeasonCreateInput

type SeasonsApiResponse = InternalApi['/api/admin/season']['get']

export const usePlanStore = defineStore("Plan", () => {

    const activeSeason = ref<ApiResponse<'/api/admin/season/active', 'get'> | null>(null)
    const loadingSeason = ref(false)
    const seasons =  ref<SeasonsApiResponse | null>(null)

    const loadSeasons = async () => {
        loadingSeason.value = true
        const response = await useFetch('/api/admin/season')
        seasons.value = response.data.value
        loadingSeason.value = false
    }

    const createSeason = async (season: SeasonCreateInput) => {
        loadingSeason.value = true
        const response = await useFetch('/api/admin/season', {
            method: 'PUT',
            body: season
        })
        const createdSeason = response.data.value
        loadingSeason.value = false
    }

    const updateSeason = async (season: SeasonUpdateInput) => {
        loadingSeason.value = true
        const response = await useFetch(`/api/admin/season/${season.id}`,
            {
                method: 'POST',
                body: season
            })
        const uodatedSeason = response.data.value
        loadingSeason.value = false
    }

    //todo create a converter from Season to SeasonCreateInput and SeasonUpdateInput

    return {
        activeSeason,
        loadingSeason,
        seasons,
        loadSeasons,
        createSeason,
        updateSeason
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
