import type {
    HouseholdSummary,
    HouseholdWithInhabitants
} from '~/composables/useHouseholdValidation'

/**
 * Household store - manages household data and API operations
 * Following ADR-007: Store owns server data, component owns UI state
 * Following ADR-009: Index endpoint returns HouseholdSummary (lightweight), detail returns HouseholdWithInhabitants (comprehensive)
 */
export const useHouseholdsStore = defineStore("Households", () => {
    // DEPENDENCIES
    const {handleApiError} = useApiHandler()

    // STATE - Server data only
    const selectedHouseholdId = ref<number | null>(null)

    // ========================================
    // State - useFetch with status exposed internally
    // ========================================
    const {
        data: households,
        status: householdsStatus,
        error: householdsError,
        refresh: refreshHouseholds
    } = useFetch<HouseholdSummary[]>('/api/admin/household', {
        immediate: false,
        watch: false,
        default: () => []

    })

    const {
        data: selectedHousehold,
        status: selectedHouseholdStatus,
        error: selectedHouseholdError,
        refresh: refreshSelectedHousehold
    } = useFetch<HouseholdWithInhabitants>(() => `/api/admin/household/${selectedHouseholdId.value}`, {
        immediate: false
    })

    // ========================================
    // Computed - Public API (derived from status)
    // ========================================
    const isHouseholdsLoading = computed(() => householdsStatus.value === 'pending')
    const isHouseholdsErrored = computed(() => householdsStatus.value === 'error')
    const isHouseholdsInitialized = computed(() => householdsStatus.value === 'success')
    const isNoHouseholds = computed(() => isHouseholdsInitialized.value && households.value.length === 0)

    const isSelectedHouseholdLoading = computed(() => selectedHouseholdStatus.value === 'pending')
    const isSelectedHouseholdErrored = computed(() => selectedHouseholdStatus.value === 'error')
    const isSelectedHouseholdInitialized = computed(() => selectedHouseholdStatus.value === 'success')
    /**
     * Get the logged-in user's household (from auth session)
     * Returns full household object from session, or null if not authenticated
     */
    const myHousehold = computed(() => {
        const authStore = useAuthStore()
        return authStore.user?.Inhabitant?.household ?? null //TODO fix type
    })

    // ========================================
    // Store Actions
    // ========================================
    const loadHouseholds = async () => {
        try {
            await refreshHouseholds()
            console.info(`🏠 > HOUSEHOLDS_STORE > Loaded ${households.value.length} households`)
        } catch (e: any) {
            handleApiError(e, 'loadHouseholds')
        }

    }

    /**
     * Fetch single household with inhabitants
     */
    const loadHousehold = async (id: number) => {
        try {
            selectedHouseholdId.value = id
            await refreshSelectedHousehold()
            console.info(`🏠 > HOUSEHOLDS_STORE > Loaded household ${selectedHousehold.value?.shortName} (ID: ${id})`)
        } catch (e: any) {
            handleApiError(e, 'loadHousehold')
        }
    }


    /**
     * Initialize store - load households and optionally select one by shortName
     * @param shortName - Optional shortName to load specific household
     */
    const initHouseholdsStore = async (shortName?: string) => {
        if (!isHouseholdsInitialized.value || isHouseholdsErrored.value) await loadHouseholds()
        // TODO autoselct my household if shortName not provided
        if (shortName) {
            const household = households.value.find(h => h.shortName === shortName)
            if (!household) throw createError({
                statusCode: 404,
                message: `Husstanden "${shortName}" blev ikke fundet`
            })

            if (household.id !== selectedHouseholdId.value) await loadHousehold(household.id)
        }
    }

    return {
        // State
        households,
        selectedHousehold,
        // Computed
        myHousehold,
        isHouseholdsLoading,
        isNoHouseholds,
        isHouseholdsErrored,
        isHouseholdsInitialized,
        householdsError,
        isSelectedHouseholdLoading,
        isSelectedHouseholdErrored,
        isSelectedHouseholdInitialized,
        selectedHouseholdError,
        // Actions
        loadHouseholds,
        loadHousehold,
        initHouseholdsStore
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useHouseholdsStore, import.meta.hot))
}
