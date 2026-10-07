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
    const {storeAsyncData, apiRequest, handleApiError} = useApiHandler()
    const {formatScaffoldResult} = useBooking()
    const {HouseholdDisplaySchema, HouseholdDetailSchema} = useCoreValidation()

    // Last preference update result (persists across component remounts)
    const lastPreferenceResult = ref<ScaffoldResult | null>(null)

    // Last move-out date update result (persists across component remounts)
    const lastMoveOutResult = ref<ScaffoldResult | null>(null)

    // ========================================
    // State (ADR-007)
    // ========================================

    // Get auth state to gate fetching - prevents 401 race condition
    // PageHeader instantiates this store before session is hydrated
    const {loggedIn} = useUserSession()

    const householdsDataset = storeAsyncData('households-store-households', '/api/admin/household', {
        schema: HouseholdDisplaySchema.array(),
        default: () => [],
        enabled: () => loggedIn.value,
        errorMessage: 'Kunne ikke hente husstande'
    })
    const {
        data: households,
        status: householdsStatus,
        error: householdsError,
        refresh: refreshHouseholds
    } = householdsDataset

    const authStore = useAuthStore()

    /**
     * Get the logged-in user's household (from auth session)
     * Returns full household object from session, or null if not authenticated
     */
    const myHousehold = computed(() => {
        return authStore.user?.Inhabitant?.household ?? null
    })

    // A pbs resolves once the households have loaded; an unknown one falls back to my household
    const userChoice = ref<{id: number} | {pbsId: number} | null>(null)
    const chosenHouseholdId = computed(() => {
        const choice = userChoice.value
        if (!choice) return null
        if ('id' in choice) return choice.id
        return households.value.find(h => h.pbsId === choice.pbsId)?.id ?? null
    })
    const selectedHouseholdId = computed(() => chosenHouseholdId.value ?? myHousehold.value?.id ?? null)

    // The key stays constant: a pbs resolves after the households load, mid-render on the server
    const selectedHouseholdDataset = storeAsyncData(
        'households-store-selected-household',
        () => `/api/admin/household/${selectedHouseholdId.value}`,
        {
            schema: HouseholdDetailSchema.nullable(),
            default: () => null,
            enabled: () => !!selectedHouseholdId.value,
            dependsOn: [householdsDataset],
            errorMessage: 'Kunne ikke hente husstand',
            // The choice re-derives to my household
            notFound: {
                recover: async () => {
                    userChoice.value = null
                    await refreshHouseholds()
                },
                retries: 1,
                toast: () => `Kan ikke finde husstanden ${households.value.find(h => h.id === selectedHouseholdId.value)?.shortName ?? selectedHouseholdId.value}`,
                message: () => {
                    const {emoji, text} = getRandomEmptyMessage('household')
                    return `${emoji} ${text}`
                }
            }
        }
    )
    const {
        data: selectedHousehold,
        status: selectedHouseholdStatus,
        error: selectedHouseholdError,
        refresh: refreshSelectedHousehold
    } = selectedHouseholdDataset

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
        if (householdsError.value) throw householdsError.value
        console.info(`🏠 > HOUSEHOLDS_STORE > Loaded ${households.value.length} households`)
    }

    const loadHousehold = (id: number) => {
        userChoice.value = {id}
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Loading household ID: ${id}`)
    }

    const selectHouseholdByPbs = (pbsId: number) => {
        userChoice.value = {pbsId}
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Loading household PBS: ${pbsId}`)
    }

    /**
     * Fetch household detail without affecting selectedHousehold
     * Use for admin operations that need HouseholdDetail but shouldn't change navigation state
     */
    const fetchHouseholdDetail = (householdId: number): Promise<HouseholdDetail> => {
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Fetching household detail: ${householdId}`)
        return apiRequest(`/api/admin/household/${householdId}`, {
            schema: HouseholdDetailSchema,
            action: `Kunne ikke hente husstand ${householdId}`
        })
    }

    /** The session user's calendar feed URL; null when the request fails (already toasted) */
    const fetchCalendarFeed = (): Promise<string | null> =>
        apiRequest<string>('/api/calendar/feed', {action: 'fetchCalendarFeed'}).catch(() => null)

    const preferencesUrl = (inhabitantId: number, adminBypass: boolean) => adminBypass
        ? `/api/household/inhabitants/${inhabitantId}/preferences?adminBypass=true`
        : `/api/household/inhabitants/${inhabitantId}/preferences`

    /**
     * Update inhabitant dinner preferences
     * Uses household endpoint (not admin) - requires household access
     * @param inhabitantId - ID of the inhabitant to update
     * @param preferences - WeekDayMap of DinnerMode preferences
     */
    const updateInhabitantPreferences = async (inhabitantId: number, preferences: Record<string, string>, adminBypass = false) => {
        console.info(`🏠 > HOUSEHOLDS_STORE > Updating preferences for inhabitant ${inhabitantId}${adminBypass ? ' (admin bypass)' : ''}`)

        const result = await apiRequest<InhabitantUpdateResponse>(preferencesUrl(inhabitantId, adminBypass), {
            method: 'POST',
            body: { dinnerPreferences: preferences },
            action: 'updateInhabitantPreferences'
        })

        // Store result for persistent UI display
        lastPreferenceResult.value = result.scaffoldResult
        console.info(`🏠 > HOUSEHOLDS_STORE > Preferences updated for inhabitant ${inhabitantId}: ${formatScaffoldResult(result.scaffoldResult, 'compact')}`)

        // Refresh the selected household to get updated data
        if (selectedHouseholdId.value) {
            await refreshSelectedHousehold()
        }

        return result.scaffoldResult
    }

    /**
     * Update all inhabitants' dinner preferences in a household (power mode)
     * Uses household endpoint (not admin) - requires household access
     * @param householdId - ID of the household
     * @param preferences - WeekDayMap of DinnerMode preferences to apply to all inhabitants
     */
    const updateAllInhabitantPreferences = async (householdId: number, preferences: Record<string, string>, adminBypass = false) => {
        // Get the household to access inhabitants
        const household = households.value.find(h => h.id === householdId)
        if (!household) {
            const error = new Error(`Household ${householdId} not found`)
            handleApiError(error, 'updateAllInhabitantPreferences')
            throw error
        }

        console.info(`🏠 > HOUSEHOLDS_STORE > Power mode: Updating preferences for all ${household.inhabitants.length} inhabitants in household ${householdId}${adminBypass ? ' (admin bypass)' : ''}`)

        // Update all inhabitants SEQUENTIALLY to avoid race conditions in scaffolding
        // Each update triggers scaffoldPrebookings for the same household - parallel execution
        // causes FK constraint errors when multiple scaffolds try to delete the same orders
        const results = []
        for (const inhabitant of household.inhabitants) {
            const result = await apiRequest<InhabitantUpdateResponse>(preferencesUrl(inhabitant.id, adminBypass), {
                method: 'POST',
                body: { dinnerPreferences: preferences },
                action: 'updateAllInhabitantPreferences'
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
    }

    /**
     * Set or clear move-out date for a household
     * Uses admin household update endpoint (POST /api/admin/household/:id)
     * Triggers re-scaffolding of prebookings when moveOutDate changes (server-side)
     * @param householdId - ID of the household
     * @param moveOutDate - Date to set, or null to clear
     */
    const setMoveOutDate = async (householdId: number, moveOutDate: Date | null, adminBypass = false) => {
        console.info(`🏠 > HOUSEHOLDS_STORE > Setting moveOutDate for household ${householdId}: ${moveOutDate?.toISOString() ?? 'null'}`)
        const result = await apiRequest<HouseholdUpdateResponse>(`/api/household/${householdId}/update`, {
            method: 'POST',
            body: { moveOutDate },
            query: {adminBypass},
            action: 'setMoveOutDate'
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
    }

    // Last move result (persists across component remounts)
    const lastMoveResult = ref<ScaffoldResult | null>(null)

    /**
     * Move an inhabitant to a different household
     * Updates householdId via admin endpoint, triggers re-scaffold on target household
     * Resolves undefined when the move fails; the request has already toasted it
     */
    const moveInhabitant = async (inhabitantId: number, targetHouseholdId: number) => {
        const toast = useToast()
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Moving inhabitant ${inhabitantId} to household ${targetHouseholdId}`)
        const result = await apiRequest<InhabitantUpdateResponse>(`/api/admin/household/inhabitants/${inhabitantId}`, {
            method: 'POST',
            body: {householdId: targetHouseholdId},
            action: 'moveInhabitant'
        }).catch(() => null)
        if (!result) return

        lastMoveResult.value = result.scaffoldResult
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Inhabitant moved: ${formatScaffoldResult(result.scaffoldResult, 'compact')}`)

        if (selectedHouseholdId.value) {
            await refreshSelectedHousehold()
        }
        await refreshHouseholds()

        const bookingsStore = useBookingsStore()
        await bookingsStore.refreshOrders()

        const targetHousehold = households.value.find(h => h.id === targetHouseholdId)
        const targetLabel = targetHousehold ? `${targetHousehold.shortName} (PBS ${targetHousehold.pbsId})` : `husstand ${targetHouseholdId}`
        const scaffoldSummary = formatScaffoldResult(result.scaffoldResult)
        const hasOrderChanges = result.scaffoldResult.created > 0 || result.scaffoldResult.deleted > 0 || result.scaffoldResult.released > 0

        toast.add({
            title: `${result.inhabitant.name} ${result.inhabitant.lastName} flyttet til ${targetLabel}`,
            description: hasOrderChanges ? scaffoldSummary : undefined,
            color: 'success'
        })

        return result
    }

    /**
     * Delete a household (CASCADE removes inhabitants, ADR-005)
     * Resolves without deleting when the request fails; the request has already toasted it
     */
    const deleteHousehold = async (householdId: number) => {
        const toast = useToast()
        // Capture identity before deletion (lookup disappears after refreshHouseholds)
        const deleted = households.value.find(h => h.id === householdId)
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Deleting household ${householdId}`)
        const isDeleted = await apiRequest(`/api/admin/household/${householdId}`, {method: 'DELETE', action: 'deleteHousehold'})
            .then(() => true, () => false)
        if (!isDeleted) return
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Household ${householdId} deleted`)

        if (selectedHouseholdId.value === householdId) {
            userChoice.value = null
        }
        await refreshHouseholds()

        toast.add({
            title: 'Husstand slettet',
            description: deleted ? `${deleted.shortName} · PBS ${deleted.pbsId}` : undefined,
            color: 'success'
        })
    }

    /**
     * Create a new household at an existing Heynabo address, optionally applying
     * move-out updates to prev owners at the same address (reuses setMoveOutDate).
     * Resolves null when a request fails; the request has already toasted it.
     */
    const createHousehold = async (payload: {
        pbsId: number
        address: string
        movedInDate: Date
        heynaboId: number
        name: string
        prevOwnerMoveOutUpdates?: {id: number, moveOutDate: Date}[]
    }): Promise<HouseholdDetail | null> => {
        const toast = useToast()
        const {prevOwnerMoveOutUpdates = [], ...createBody} = payload
        try {
            console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Creating household at ${payload.address} (PBS ${payload.pbsId})`)
            const created = await apiRequest<HouseholdDetail>('/api/admin/household', {
                method: 'PUT',
                body: createBody,
                action: 'createHousehold'
            })
            console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Created household ${created.id} at ${created.address}`)

            for (const update of prevOwnerMoveOutUpdates) {
                await setMoveOutDate(update.id, update.moveOutDate, true)
            }

            await refreshHouseholds()
            toast.add({title: 'Husstand oprettet', description: `${created.shortName} · PBS ${created.pbsId}`, color: 'success'})
            return created
        } catch {
            return null
        }
    }

    return {
        // State
        households,
        selectedHousehold,
        selectedHouseholdId,
        selectedHouseholdDataset: markRaw(selectedHouseholdDataset),
        lastPreferenceResult,
        lastMoveOutResult,
        lastMoveResult,
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
        fetchCalendarFeed,
        refreshSelectedHousehold,
        selectHouseholdByPbs,
        updateInhabitantPreferences,
        updateAllInhabitantPreferences,
        setMoveOutDate,
        moveInhabitant,
        deleteHousehold,
        createHousehold,
        getHouseholdForInhabitant
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useHouseholdsStore, import.meta.hot))
}
