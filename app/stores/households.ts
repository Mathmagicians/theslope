import type {Household, Inhabitant} from '~/composables/useHouseholdValidation'
import type {HouseholdSummary, HouseholdWithInhabitants} from '~/server/data/prismaRepository'

/**
 * Household store - manages household data and API operations
 * Following ADR-007: Store owns server data, component owns UI state
 * Following ADR-009: Index endpoint returns HouseholdSummary (lightweight), detail returns HouseholdWithInhabitants (comprehensive)
 */
export const useHouseholdsStore = defineStore("Households", () => {
    // STATE - Server data only
    const households = ref<HouseholdSummary[]>([])
    const selectedHousehold = ref<HouseholdWithInhabitants | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    // COMPUTED - Derived state
    const isNoHouseholds = computed(() => households.value.length === 0)

    /**
     * Fetch all households from API
     * Uses useFetch for SSR compatibility (ADR-007)
     */
    const { data, error: fetchError, refresh: refreshHouseholds } = useFetch('/api/admin/household', {
        immediate: false,
        watch: false
    })

    /**
     * Load all households
     */
    const loadHouseholds = async () => {
        try {
            isLoading.value = true
            error.value = null
            await refreshHouseholds()
            if (fetchError.value) {
                throw fetchError.value
            }
            households.value = (data.value as HouseholdSummary[]) ?? []
            console.info(`🏠 > HOUSEHOLDS_STORE > Loaded ${households.value.length} households`)
        } catch (e: any) {
            handleApiError(e, 'loadHouseholds')
            throw e
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Fetch single household with inhabitants
     */
    const loadHousehold = async (id: number) => {
        try {
            isLoading.value = true
            error.value = null
            const household = await $fetch<HouseholdWithInhabitants>(`/api/admin/household/${id}`)
            selectedHousehold.value = household
            console.info(`🏠 > HOUSEHOLDS_STORE > Loaded household ${id}`)
        } catch (e: any) {
            handleApiError(e, 'loadHousehold')
            throw e
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Select a household by ID
     */
    const onHouseholdSelect = async (id: number) => {
        const household = households.value.find(h => h.id === id)
        if (household) {
            selectedHousehold.value = household
            // Fetch full household data with inhabitants
            await loadHousehold(id)
        }
    }

    /**
     * Initialize store - load households
     */
    const initHouseholdsStore = async () => {
        await loadHouseholds()
    }

    return {
        // State
        households,
        selectedHousehold,
        isLoading,
        error,
        // Computed
        isNoHouseholds,
        // Actions
        loadHouseholds,
        loadHousehold,
        onHouseholdSelect,
        initHouseholdsStore
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useHouseholdsStore, import.meta.hot))
}