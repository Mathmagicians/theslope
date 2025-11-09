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

    const {deserializeWeekDayMap} = useHouseholdValidation()

    // Type for API response (dates are ISO strings from JSON)
    type SerializedHouseholdWithInhabitants = Omit<HouseholdWithInhabitants, 'movedInDate' | 'moveOutDate' | 'inhabitants'> & {
        movedInDate: string
        moveOutDate: string | null
        inhabitants: Array<Omit<HouseholdWithInhabitants['inhabitants'][number], 'birthDate' | 'dinnerPreferences'> & {
            birthDate: string | null
            dinnerPreferences: string | null
        }>
    }

    const {
        data: selectedHousehold,
        status: selectedHouseholdStatus,
        error: selectedHouseholdError,
        refresh: refreshSelectedHousehold
    } = useAsyncData<HouseholdWithInhabitants | null>(
        selectedHouseholdKey,
        async () => {
            if (!selectedHouseholdId.value) return Promise.resolve(null)

            // Fetch as serialized type (strings for dates)
            const serialized = await $fetch<SerializedHouseholdWithInhabitants>(`/api/admin/household/${selectedHouseholdId.value}`)

            // ADR-010: Client-side deserialization of Date fields from HTTP JSON
            if (serialized) {
                return {
                    ...serialized,
                    movedInDate: new Date(serialized.movedInDate),
                    moveOutDate: serialized.moveOutDate ? new Date(serialized.moveOutDate) : null,
                    inhabitants: serialized.inhabitants.map(inhabitant => ({
                        ...inhabitant,
                        birthDate: inhabitant.birthDate ? new Date(inhabitant.birthDate) : null,
                        dinnerPreferences: inhabitant.dinnerPreferences
                            ? deserializeWeekDayMap(inhabitant.dinnerPreferences)
                            : null
                    }))
                } as HouseholdWithInhabitants
            }
            return null
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
                selectedHouseholdId.value = selectedHouseholdId.value // Trigger reactive update
            }
        } catch (e: any) {
            handleApiError(e, 'updateInhabitantPreferences')
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
        updateInhabitantPreferences
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useHouseholdsStore, import.meta.hot))
}
