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

    const {HouseholdWithInhabitantsSchema} = useHouseholdValidation()

    const {
        data: selectedHousehold,
        status: selectedHouseholdStatus,
        error: selectedHouseholdError,
        refresh: refreshSelectedHousehold
    } = useAsyncData<HouseholdWithInhabitants | null>(
        selectedHouseholdKey,
        () => {
            if (!selectedHouseholdId.value) return Promise.resolve(null)
            return $fetch(`/api/admin/household/${selectedHouseholdId.value}`)
        },
        {
            default: () => null,
            transform: (data: any) => {
                if (!data) return null
                // Repository validates data per ADR-010, schema handles HTTP JSON deserialization (ISO strings → Date objects)
                return HouseholdWithInhabitantsSchema.parse(data)
            }
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
    const isSelectedHouseholdInitialized = computed(() => selectedHouseholdStatus.value === 'success' && selectedHousehold.value !== null)

    // Convenience computed for components - true when store is fully initialized and ready to use
    const isHouseholdsStoreReady = computed(() =>
        isHouseholdsInitialized.value && (isNoHouseholds.value || isSelectedHouseholdInitialized.value)
    )

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
    const loadHousehold = (id: number) => {
        selectedHouseholdId.value = id
        console.info(LOG_CTX, `🏠 > HOUSEHOLDS_STORE > Loaded household ${selectedHousehold.value?.shortName} (ID: ${id})`)
    }


    /**
     * Update inhabitant dinner preferences
     * @param inhabitantId - ID of the inhabitant to update
     * @param preferences - WeekDayMap of DinnerMode preferences
     */
    const updateInhabitantPreferences = async (inhabitantId: number, preferences: any) => {
        const {handleApiError} = useApiHandler()

        try {
            console.info(`🏠 > HOUSEHOLDS_STORE > Updating preferences for inhabitant ${inhabitantId}`)

            await $fetch(`/api/admin/household/inhabitants/${inhabitantId}`, {
                method: 'POST',
                body: { dinnerPreferences: preferences }
            })

            console.info(`🏠 > HOUSEHOLDS_STORE > Successfully updated preferences for inhabitant ${inhabitantId}`)

            // Refresh the selected household to get updated data
            if (selectedHouseholdId.value) {
                await refreshSelectedHousehold()
            }
        } catch (e: any) {
            handleApiError(e, 'updateInhabitantPreferences')
            throw e
        }
    }

    /**
     * Update all inhabitants' dinner preferences in a household (power mode)
     * @param householdId - ID of the household
     * @param preferences - WeekDayMap of DinnerMode preferences to apply to all inhabitants
     */
    const updateAllInhabitantPreferences = async (householdId: number, preferences: any) => {
        const {handleApiError} = useApiHandler()

        try {
            // Get the household to access inhabitants
            const household = households.value.find(h => h.id === householdId)
            if (!household) {
                throw new Error(`Household ${householdId} not found`)
            }

            console.info(`🏠 > HOUSEHOLDS_STORE > Power mode: Updating preferences for all ${household.inhabitants.length} inhabitants in household ${householdId}`)

            // Update all inhabitants in parallel
            await Promise.all(
                household.inhabitants.map(inhabitant =>
                    $fetch(`/api/admin/household/inhabitants/${inhabitant.id}`, {
                        method: 'POST',
                        body: { dinnerPreferences: preferences }
                    })
                )
            )

            console.info(`🏠 > HOUSEHOLDS_STORE > Successfully updated all ${household.inhabitants.length} inhabitants`)

            // Refresh the selected household once after all updates
            if (selectedHouseholdId.value === householdId) {
                await refreshSelectedHousehold()
            }
        } catch (e: any) {
            handleApiError(e, 'updateAllInhabitantPreferences')
            throw e
        }
    }

    /**
     * Initialize store - load households and optionally select one by shortName
     * If no shortName provided, keeps current selection or falls back to user's household
     * @param shortName - Optional shortName to load specific household
     */
    const initHouseholdsStore = (shortName?: string) => {
        // households autoload when store is created (immediate: true)
        // If shortName provided: use that. Otherwise: keep current selection, or fall back to user's household
        const householdId = shortName
            ? households.value.find(h => h.shortName === shortName)?.id
            : (selectedHouseholdId.value ?? myHousehold.value?.id)

        console.info(LOG_CTX, '🏠 > HOUSEHOLDS_STORE > initHouseholdsStore > shortName:', shortName ?? 'none',
            'current:', selectedHouseholdId.value, 'resolved:', householdId)

        if (householdId && householdId !== selectedHouseholdId.value) loadHousehold(householdId)
    }

    // AUTO-INITIALIZATION - Watch for households to load, then auto-select user's household
    watch([isHouseholdsInitialized, selectedHouseholdId, myHousehold], () => {
        if (!isHouseholdsInitialized.value) return
        if (selectedHouseholdId.value) return // Already selected

        console.info(LOG_CTX, '🏠 > HOUSEHOLDS_STORE > WATCH Households loaded, calling initHouseholdsStore')
        initHouseholdsStore()
    })

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
        isHouseholdsStoreReady,
        selectedHouseholdError,
        // Actions
        loadHouseholds,
        loadHousehold,
        refreshSelectedHousehold,
        initHouseholdsStore,
        updateInhabitantPreferences,
        updateAllInhabitantPreferences
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useHouseholdsStore, import.meta.hot))
}
