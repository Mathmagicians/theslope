import type { InternalApi } from 'nitropack'

type HouseholdsApiResponse = InternalApi['/api/household']['get']

export const useHouseholdsStore = defineStore("Households", () => {
    // Create state for holding households
    const households = ref<HouseholdsApiResponse | null>(null)
    const loadData = async () => {
        try {
            // Fetch data from the server
            console.log("🍍 > PINA > HOUSEHOLDS > Fetching household data")
            households.value = await useFetch("/api/household")
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.data.message,
                variant: "destructive",
                duration: 5000,
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
