export const usePlanStore = defineStore("Plan", () => {

    const currentSeason = ref<ApiResponse<'/api/admin/season', 'get'> | null>(null)
    const creatingSeason = ref(false)

    const loadSeason = async () => {
        const response = await useFetch('/api/admin/season')
        currentSeason.value = response.data.value
    }

    const createSeason = async (season: SeasonCreateInput) => {
        creatingSeason.value = true
        const response = await useFetch('/api/admin/season', {
            method: 'POST',
            body: season
        })
        const createdSeason = response.data.value
        creatingSeason.value = false
    }

    return {
        currentSeason,
        loadSeason,
        createSeason,
        creatingSeason
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
