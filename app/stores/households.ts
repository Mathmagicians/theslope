import type {
    HouseholdDisplay,
    HouseholdDetail
} from '~/composables/useCoreValidation'
import type {ScaffoldResult, InhabitantUpdateResponse, HouseholdUpdateResponse} from '~/composables/useBookingValidation'
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

    // Last move-out date update result (persists across component remounts)
    const lastMoveOutResult = ref<ScaffoldResult | null>(null)

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
            watch: [loggedIn],  // Re-fetch when login state changes
            transform: (data: HouseholdDisplay[]) => {
                const {HouseholdDisplaySchema} = useCoreValidation()
                return data.map(h => HouseholdDisplaySchema.parse(h))
            }
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

    const householdByInhabitantId = computed(() => {
        const map = new Map<number, HouseholdDisplay>()
        households.value.forEach(h => h.inhabitants.forEach(i => map.set(i.id, h)))
        return map
    })
    const getHouseholdForInhabitant = (inhabitantId: number) => householdByInhabitantId.value.get(inhabitantId)

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
     * Fetch household detail without affecting selectedHousehold
     * Use for admin operations that need HouseholdDetail but shouldn't change navigation state
     */
    const fetchHouseholdDetail = async (householdId: number): Promise<HouseholdDetail> => {
        try {
            console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Fetching household detail: ${householdId}`)
            const data = await $fetch<HouseholdDetail>(`/api/admin/household/${householdId}`)
            return HouseholdDetailSchema.parse(data)
        } catch (e: unknown) {
            handleApiError(e, `Kunne ikke hente husstand ${householdId}`)
            throw e
        }
    }

    /**
     * Update inhabitant dinner preferences
     * Uses household endpoint (not admin) - requires household access
     * @param inhabitantId - ID of the inhabitant to update
     * @param preferences - WeekDayMap of DinnerMode preferences
     */
    const updateInhabitantPreferences = async (inhabitantId: number, preferences: Record<string, string>, adminBypass = false) => {
        try {
            console.info(`🏠 > HOUSEHOLDS_STORE > Updating preferences for inhabitant ${inhabitantId}${adminBypass ? ' (admin bypass)' : ''}`)

            const url = adminBypass
                ? `/api/household/inhabitants/${inhabitantId}/preferences?adminBypass=true`
                : `/api/household/inhabitants/${inhabitantId}/preferences`
            const result = await $fetch<InhabitantUpdateResponse>(url, {
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
    const updateAllInhabitantPreferences = async (householdId: number, preferences: Record<string, string>, adminBypass = false) => {
        try {
            // Get the household to access inhabitants
            const household = households.value.find(h => h.id === householdId)
            if (!household) {
                throw new Error(`Household ${householdId} not found`)
            }

            console.info(`🏠 > HOUSEHOLDS_STORE > Power mode: Updating preferences for all ${household.inhabitants.length} inhabitants in household ${householdId}${adminBypass ? ' (admin bypass)' : ''}`)

            // Update all inhabitants SEQUENTIALLY to avoid race conditions in scaffolding
            // Each update triggers scaffoldPrebookings for the same household - parallel execution
            // causes FK constraint errors when multiple scaffolds try to delete the same orders
            const results = []
            for (const inhabitant of household.inhabitants) {
                const url = adminBypass
                    ? `/api/household/inhabitants/${inhabitant.id}/preferences?adminBypass=true`
                    : `/api/household/inhabitants/${inhabitant.id}/preferences`
                const result = await $fetch<InhabitantUpdateResponse>(url, {
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
     * Set or clear move-out date for a household
     * Uses admin household update endpoint (POST /api/admin/household/:id)
     * Triggers re-scaffolding of prebookings when moveOutDate changes (server-side)
     * @param householdId - ID of the household
     * @param moveOutDate - Date to set, or null to clear
     */
    const setMoveOutDate = async (householdId: number, moveOutDate: Date | null, adminBypass = false) => {
        try {
            console.info(`🏠 > HOUSEHOLDS_STORE > Setting moveOutDate for household ${householdId}: ${moveOutDate?.toISOString() ?? 'null'}`)
            const result = await $fetch<HouseholdUpdateResponse>(`/api/household/${householdId}/update`, {
                method: 'POST',
                body: { moveOutDate },
                query: {adminBypass}
            })

            // Store scaffold result for persistent UI display
            lastMoveOutResult.value = result.scaffoldResult
            console.info(`🏠 > HOUSEHOLDS_STORE > moveOutDate updated for household ${householdId}: ${formatScaffoldResult(result.scaffoldResult, 'compact')}`)

            // Refresh selected household to get updated data
            if (selectedHouseholdId.value === householdId) {
                await refreshSelectedHousehold()
            }
            // Also refresh household list to update display badges
            await refreshHouseholds()

            // Refresh bookings so UI reflects scaffold changes (deleted/created orders)
            const bookingsStore = useBookingsStore()
            await bookingsStore.refreshOrders()

            return result.scaffoldResult
        } catch (e: unknown) {
            handleApiError(e, 'setMoveOutDate')
            throw e
        }
    }

    // Stored init args - watcher re-invokes initHouseholdsStore when households load,
    // but needs to remember the original shortName/pbsId from the URL
    const _initShortName = ref<string>()
    const _initPbsId = ref<number>()

    /**
     * Initialize store - select household by pbsId, shortName, or fall back to user's household
     *
     * Resolution priority:
     * 1. pbsId provided → find by pbsId (unambiguous, Phase 2 disambiguation)
     * 2. shortName only, 1 match → use it (backwards-compatible)
     * 3. shortName only, multiple matches → check if user is member of one → use theirs
     * 4. No match → fall back to current selection or user's household
     *
     * @param shortName - Optional shortName from URL path
     * @param pbsId - Optional pbsId from ?pbs= query param (always unique)
     */
    const initHouseholdsStore = (shortName?: string, pbsId?: number) => {
        // Persist args so the watcher can re-invoke with them when households load
        _initShortName.value = shortName ?? _initShortName.value
        _initPbsId.value = pbsId ?? _initPbsId.value

        let householdId: number | undefined

        if (_initPbsId.value) {
            // Priority 1: pbsId is always unique — unambiguous resolution
            householdId = households.value.find(h => h.pbsId === _initPbsId.value)?.id
        } else if (_initShortName.value) {
            // Priority 2+3: shortName lookup with disambiguation
            const matches = households.value.filter(h => h.shortName === _initShortName.value)
            if (matches.length === 1) {
                // Single match — backwards-compatible
                householdId = matches[0]!.id
            } else if (matches.length > 1) {
                // Multiple matches — check if user is member of one
                const myMatch = matches.find(h => h.id === myHousehold.value?.id)
                householdId = myMatch?.id ?? matches[0]!.id
            }
        }

        // Priority 4: fall back to current selection or user's household
        if (!householdId) {
            householdId = selectedHouseholdId.value ?? myHousehold.value?.id ?? undefined
        }

        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > initHouseholdsStore > shortName: ${_initShortName.value ?? 'none'}, pbsId: ${_initPbsId.value ?? 'none'}, current: ${selectedHouseholdId.value}, resolved: ${householdId}`)

        if (householdId && householdId !== selectedHouseholdId.value) loadHousehold(householdId)
    }

    // AUTO-INITIALIZATION - Watch for households to load, then auto-select user's household
    // Re-invokes with stored init args so pbsId/shortName from URL isn't lost
    watch([isHouseholdsInitialized, selectedHouseholdId, myHousehold], () => {
        if (!isHouseholdsInitialized.value) return
        if (selectedHouseholdId.value) return // Already selected

        console.info(LOG_CTX, '🏠 > HOUSEHOLDS_STORE > WATCH Households loaded, calling initHouseholdsStore')
        initHouseholdsStore(_initShortName.value, _initPbsId.value)
    })

    return {
        // State
        households,
        selectedHousehold,
        lastPreferenceResult,
        lastMoveOutResult,
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
        fetchHouseholdDetail,
        refreshSelectedHousehold,
        initHouseholdsStore,
        updateInhabitantPreferences,
        updateAllInhabitantPreferences,
        setMoveOutDate,
        getHouseholdForInhabitant
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useHouseholdsStore, import.meta.hot))
}
