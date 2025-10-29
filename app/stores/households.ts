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
        immediate: true,
        watch: false,
        default: () => []
    })

    // Use useAsyncData for detail endpoint - allows manual execute() without context issues
    const selectedHouseholdKey = computed(() => `/api/admin/household/${selectedHouseholdId.value || 'null'}`)

    const {
        data: selectedHousehold,
        status: selectedHouseholdStatus,
        error: selectedHouseholdError,
     //   execute: refreshSelectedHousehold
    } = useAsyncData<HouseholdWithInhabitants | null>(
        selectedHouseholdKey,
        () => {
            if (!selectedHouseholdId.value) return Promise.resolve(null)
            return $fetch(`/api/admin/household/${selectedHouseholdId.value}`)
        },
        {
            default: () => null,
        }
    )

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
    // DEPENDENCIES - access auth store
    const authStore = useAuthStore()

    /**
     * Get the logged-in user's household (from auth session)
     * Returns full household object from session, or null if not authenticated
     */
    const myHousehold = computed(() => {
        return authStore.user?.Inhabitant?.household ?? null
    })

    // ========================================
    // Store Actions
    // ========================================
    const loadHouseholds = async () => {
        await refreshHouseholds()
        if (householdsError.value) {
            console.error(`🏠 > HOUSEHOLDS_STORE > Error loading households:`, householdsError.value)
            throw householdsError.value
        }
        console.info(`🏠 > HOUSEHOLDS_STORE > Loaded ${households.value.length} households`)
    }

    /**
     * Fetch single household with inhabitants
     */
    const loadHousehold = async (id: number) => {
        selectedHouseholdId.value = id

        if (selectedHouseholdError.value) {
            console.error(`🏠 > HOUSEHOLDS_STORE > Error loading household:`, selectedHouseholdError.value)
        }
        console.info(`🏠 > HOUSEHOLDS_STORE > Loaded household ${selectedHousehold.value?.shortName} (ID: ${id})`)
    }


    /**
     * Initialize store - load households and optionally select one by shortName
     * If no shortName provided, auto-selects logged-in user's household
     * @param shortName - Optional shortName to load specific household
     */
    const initHouseholdsStore = (shortName?: string) => {
       // households are autoloaded on creation if (!isHouseholdsInitialized.value || isHouseholdsErrored.value) await loadHouseholds()

        const householdId = shortName
            ? households.value.find(h => h.shortName === shortName)?.id
            : myHousehold.value?.id

        console.info('🏠 > HOUSEHOLDS_STORE > requested short name', shortName ?? 'none',
            'id:', householdId)

        if (householdId && householdId !== selectedHouseholdId.value) loadHousehold(householdId)
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
