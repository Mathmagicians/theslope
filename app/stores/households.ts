import type {
    HouseholdDisplay,
    HouseholdDetail
} from '~/composables/useCoreValidation'
import type {ScaffoldResult} from '~/composables/useBookingValidation'
import {useBooking} from '~/composables/useBooking'

/**
 * Household store - manages household data and API operations
 * Following ADR-007: Store owns server data, component owns UI state
 * Following ADR-009: Index endpoint returns HouseholdDisplay (lightweight), detail returns HouseholdDetail (comprehensive)
 */
export const useHouseholdsStore = defineStore("Households", () => {

    // DEPENDENCIES
    const {handleApiError} = useApiHandler()
    const {formatScaffoldResult} = useBooking()

    // STATE - Server data only
    const selectedHouseholdId = ref<number | null>(null)

    // Last preference update result (persists across component remounts)
    const lastPreferenceResult = ref<ScaffoldResult | null>(null)

    // ========================================
    // State - useAsyncData with useRequestFetch for SSR-safe auth context
    // Using useRequestFetch ensures cookies are properly forwarded during both SSR and CSR
    // ========================================
    const requestFetch = useRequestFetch()

    // Get auth state to gate fetching - prevents 401 race condition
    // PageHeader instantiates this store before session is hydrated
    const {loggedIn} = useUserSession()

    const {
        data: households,
        status: householdsStatus,
        error: householdsError,
        refresh: refreshHouseholds
    } = useAsyncData<HouseholdDisplay[]>(
        'households-store-households',
        () => {
            // Don't fetch until session is ready - prevents 401 on initial load
            if (!loggedIn.value) {
                console.info('🏠 > HOUSEHOLDS_STORE > Skipping fetch - not logged in yet')
                return Promise.resolve([])
            }
            return requestFetch<HouseholdDisplay[]>('/api/admin/household', {
                onResponseError: ({response}) => {
                    console.error(`🏠 > HOUSEHOLDS_STORE > fetchHouseholds failed: ${response.status} ${response.statusText}`)
                    handleApiError(response._data, 'Kunne ikke hente husstande')
                }
            })
        },
        {
            default: () => [],
            watch: [loggedIn]  // Re-fetch when login state changes
        }
    )

    // Use useAsyncData for detail endpoint - allows manual execute() without context issues
    const selectedHouseholdKey = computed(() => `/api/admin/household/${selectedHouseholdId.value || 'null'}`)

    const {HouseholdDetailSchema} = useCoreValidation()

    const {
        data: selectedHousehold,
        status: selectedHouseholdStatus,
        error: selectedHouseholdError,
        refresh: refreshSelectedHousehold
    } = useAsyncData<HouseholdDetail | null>(
        selectedHouseholdKey,
        () => {
            if (!selectedHouseholdId.value) return Promise.resolve(null)
            return useRequestFetch()<HouseholdDetail>(`/api/admin/household/${selectedHouseholdId.value}`, {
                onResponseError: ({response}) => { handleApiError(response._data, 'Kunne ikke hente husstand') }
            })
        },
        {
            default: () => null,
            transform: (data: unknown) => {
                if (!data) return null
                // Repository validates data per ADR-010, schema handles HTTP JSON deserialization (ISO strings → Date objects)
                return HouseholdDetailSchema.parse(data)
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

    const myInhabitant = computed(() => authStore.user?.Inhabitant ?? null)

    // ========================================
    // Store Actions
    // ========================================
    const loadHouseholds = async () => {
        await refreshHouseholds()
        if (householdsError.value) {
            handleApiError(householdsError.value, 'loadHouseholds')
            throw householdsError.value
        }
        console.info(`🏠 > HOUSEHOLDS_STORE > Loaded ${households.value.length} households`)
    }

    /**
     * Fetch single household with inhabitants
     * Setting selectedHouseholdId triggers reactive useAsyncData fetch
     */
    const loadHousehold = (id: number) => {
        selectedHouseholdId.value = id
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Loading household ID: ${id}`)
    }


    /**
     * Update inhabitant dinner preferences
     * Uses household endpoint (not admin) - requires household access
     * @param inhabitantId - ID of the inhabitant to update
     * @param preferences - WeekDayMap of DinnerMode preferences
     */
    const updateInhabitantPreferences = async (inhabitantId: number, preferences: Record<string, string>) => {
        try {
            console.info(`🏠 > HOUSEHOLDS_STORE > Updating preferences for inhabitant ${inhabitantId}`)

            const result = await $fetch(`/api/household/inhabitants/${inhabitantId}/preferences`, {
                method: 'POST',
                body: { dinnerPreferences: preferences }
            })

            // Store result for persistent UI display
            lastPreferenceResult.value = result.scaffoldResult
            console.info(`🏠 > HOUSEHOLDS_STORE > Preferences updated for inhabitant ${inhabitantId}: ${formatScaffoldResult(result.scaffoldResult, 'compact')}`)

            // Refresh the selected household to get updated data
            if (selectedHouseholdId.value) {
                await refreshSelectedHousehold()
            }

            return result.scaffoldResult
        } catch (e: unknown) {
            handleApiError(e, 'updateInhabitantPreferences')
            throw e
        }
    }

    /**
     * Update all inhabitants' dinner preferences in a household (power mode)
     * Uses household endpoint (not admin) - requires household access
     * @param householdId - ID of the household
     * @param preferences - WeekDayMap of DinnerMode preferences to apply to all inhabitants
     */
    const updateAllInhabitantPreferences = async (householdId: number, preferences: Record<string, string>) => {
        try {
            // Get the household to access inhabitants
            const household = households.value.find(h => h.id === householdId)
            if (!household) {
                throw new Error(`Household ${householdId} not found`)
            }

            console.info(`🏠 > HOUSEHOLDS_STORE > Power mode: Updating preferences for all ${household.inhabitants.length} inhabitants in household ${householdId}`)

            // Update all inhabitants SEQUENTIALLY to avoid race conditions in scaffolding
            // Each update triggers scaffoldPrebookings for the same household - parallel execution
            // causes FK constraint errors when multiple scaffolds try to delete the same orders
            const results = []
            for (const inhabitant of household.inhabitants) {
                const result = await $fetch(`/api/household/inhabitants/${inhabitant.id}/preferences`, {
                    method: 'POST',
                    body: { dinnerPreferences: preferences }
                })
                results.push(result)
            }

            // Refresh the selected household once after all updates
            if (selectedHouseholdId.value === householdId) {
                await refreshSelectedHousehold()
            }

            // Aggregate scaffold results from all updates
            const aggregatedResult: ScaffoldResult = results.reduce((acc, r) => ({
                seasonId: r.scaffoldResult.seasonId,  // All results should have same seasonId
                created: acc.created + r.scaffoldResult.created,
                deleted: acc.deleted + r.scaffoldResult.deleted,
                released: acc.released + r.scaffoldResult.released,
                claimed: acc.claimed + r.scaffoldResult.claimed,
                claimRejected: acc.claimRejected + r.scaffoldResult.claimRejected,
                priceUpdated: acc.priceUpdated + r.scaffoldResult.priceUpdated,
                modeUpdated: acc.modeUpdated + r.scaffoldResult.modeUpdated,
                unchanged: acc.unchanged + r.scaffoldResult.unchanged,
                households: 1,  // Power mode updates single household
                errored: acc.errored + r.scaffoldResult.errored
            }), { seasonId: null, created: 0, deleted: 0, released: 0, claimed: 0, claimRejected: 0, priceUpdated: 0, modeUpdated: 0, unchanged: 0, households: 1, errored: 0 } as ScaffoldResult)

            // Store result for persistent UI display
            lastPreferenceResult.value = aggregatedResult
            console.info(`🏠 > HOUSEHOLDS_STORE > Power mode complete: ${household.inhabitants.length} inhabitants, scaffold: ${formatScaffoldResult(aggregatedResult, 'compact')}`)

            return aggregatedResult
        } catch (e: unknown) {
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

        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > initHouseholdsStore > shortName: ${shortName ?? 'none'}, current: ${selectedHouseholdId.value}, resolved: ${householdId}`)

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
        lastPreferenceResult,
        // Computed
        myHousehold,
        myInhabitant,
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
