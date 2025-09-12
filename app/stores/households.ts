import type { InternalApi } from 'nitropack'

type HouseholdsApiResponse = InternalApi['/api/household']['get']

export const useHouseholdsStore = defineStore("Households", () => {
    // Create state for holding households
    const households = ref<HouseholdsApiResponse | null>(null)
    const loadData = async () => {
        try {
            // Fetch data from the server
            console.log("🍍 > PINA > HOUSEHOLDS > Fetching household data")
            const response = await useFetch("/api/household", {
                deep: true
            })
            households.value = response.data.value
            console.log('Type:', typeof households.value)
            console.log('Is array?', Array.isArray(households.value))
            console.log(households.value)
        } catch (error: any) {
            createError({
                statusMessage: "Error retrieving households from database",
                statusCode: 500,
                cause: error
            })
        }
    }

    return {
        households,
        loadData
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot));
}
