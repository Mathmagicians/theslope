import type {
    HouseholdDisplay,
    HouseholdDetail
} from '~/composables/useCoreValidation'
import {useBookingValidation, type ScaffoldResult, type DinnerMode} from '~/composables/useBookingValidation'
import type {WeekDayMap} from '~/types/dateTypes'
import {useBooking, countTotals} from '~/composables/useBooking'

/**
 * Household store - manages household data and API operations
 * Following ADR-007: Store owns server data, component owns UI state
 * Following ADR-009: Index endpoint returns HouseholdDisplay (lightweight), detail returns HouseholdDetail (comprehensive)
 */
export const useHouseholdsStore = defineStore("Households", () => {

    // DEPENDENCIES
    const {storeAsyncData, loadOrThrow, apiRequest, toastSaved, notFoundToast} = useApiHandler()
    const now = useClock()
    const {formatScaffoldResult, sumScaffoldResults} = useBooking()
    const {HouseholdDisplaySchema, HouseholdDetailSchema, serializeWeekDayMap} = useCoreValidation()
    const {InhabitantUpdateResponseSchema, HouseholdUpdateResponseSchema} = useBookingValidation()

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
        error: householdsError,
        refresh: refreshHouseholds,
        isLoading: isHouseholdsLoading,
        isErrored: isHouseholdsErrored,
        isInitialized: isHouseholdsInitialized
    } = householdsDataset

    const authStore = useAuthStore()

    /**
     * Get the logged-in user's household (from auth session)
     * Returns full household object from session, or null if not authenticated
     */
    const myHousehold = computed(() => {
        return authStore.user?.Inhabitant?.household ?? null
    })

    // The page names the household its URL carries; the choice resolves once the households have loaded (ADR-006)
    type HouseholdChoice = {shortName?: string, pbsId?: number} | number | null
    const householdChoice = shallowRef<() => HouseholdChoice>(() => null)
    const resolveHouseholdId = (choice: HouseholdChoice): number | null => {
        if (choice === null) return null
        if (typeof choice === 'number') return households.value.find(h => h.id === choice)?.id ?? null
        const byPbs = households.value.find(h => choice.pbsId !== undefined && h.pbsId === choice.pbsId)
        if (byPbs) return byPbs.id
        const byShortName = households.value.filter(h => h.shortName === choice.shortName)
        return (byShortName.find(h => h.id === myHousehold.value?.id) ?? byShortName[0])?.id ?? null
    }
    const selectedHouseholdId = computed(() => resolveHouseholdId(householdChoice.value()) ?? myHousehold.value?.id ?? null)

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
            // The page's getter keeps driving the choice; the gone household re-derives to my household
            notFound: {
                recover: async () => {
                    skipGoneId(householdChoice, selectedHouseholdId.value, resolveHouseholdId)
                    await refreshHouseholds()
                },
                retries: 1,
                toast: notFoundToast(households, selectedHouseholdId, 'husstanden'),
                message: () => getRandomEmptyMessageText('household', now.value)
            }
        }
    )
    const {
        data: selectedHousehold,
        error: selectedHouseholdError,
        refresh: refreshSelectedHousehold,
        isLoading: isSelectedHouseholdLoading,
        isErrored: isSelectedHouseholdErrored,
        isInitialized: isSelectedHouseholdInitialized
    } = selectedHouseholdDataset

    // ========================================
    // Computed - Public API (derived from status)
    // ========================================
    const isNoHouseholds = computed(() => isHouseholdsInitialized.value && households.value.length === 0)

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
    const loadHouseholds = () => loadOrThrow(householdsDataset, () => `🏠 > HOUSEHOLDS_STORE > Loaded ${households.value.length} households`)

    const selectHousehold = (choice: MaybeRefOrGetter<HouseholdChoice>) => {
        householdChoice.value = () => toValue(choice)
    }

    /**
     * Fetch household detail without affecting selectedHousehold
     * Use for admin operations that need HouseholdDetail but shouldn't change navigation state
     */
    const fetchHouseholdDetail = (householdId: number): Promise<HouseholdDetail> => {
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Fetching household detail: ${householdId}`)
        return apiRequest(`/api/admin/household/${householdId}`, {
            schema: HouseholdDetailSchema,
            action: 'fetchHouseholdDetail',
            errorMessage: `Kunne ikke hente husstand ${householdId}`
        })
    }

    /** The session user's calendar feed URL; null when the request fails (already toasted) */
    const fetchCalendarFeed = (): Promise<string | null> =>
        apiRequest<string>('/api/calendar/feed', {action: 'fetchCalendarFeed'}).catch(() => null)

    const preferencesUrl = (inhabitantId: number) => `/api/household/inhabitants/${inhabitantId}/preferences`

    /**
     * Update inhabitant dinner preferences
     * Uses household endpoint (not admin) - requires household access
     * @param inhabitantId - ID of the inhabitant to update
     * @param preferences - WeekDayMap of DinnerMode preferences
     */
    const updateInhabitantPreferences = async (inhabitantId: number, preferences: WeekDayMap<DinnerMode>, adminBypass: boolean) => {
        console.info(`🏠 > HOUSEHOLDS_STORE > Updating preferences for inhabitant ${inhabitantId}${adminBypass ? ' (admin bypass)' : ''}`)

        // The week map travels as it is; the endpoint serializes it (ADR-010)
        const result = await useBookingsStore().writeBookings(() => apiRequest(preferencesUrl(inhabitantId), {
            method: 'POST',
            body: {dinnerPreferences: preferences},
            query: adminBypassQuery(adminBypass),
            schema: InhabitantUpdateResponseSchema,
            action: 'updateInhabitantPreferences'
        }))

        lastPreferenceResult.value = result.scaffoldResult
        console.info(`🏠 > HOUSEHOLDS_STORE > Preferences updated for inhabitant ${inhabitantId}: ${formatScaffoldResult(result.scaffoldResult)}`)

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
    const updateAllInhabitantPreferences = async (householdId: number, preferences: WeekDayMap<DinnerMode>, adminBypass: boolean) => {
        const household = households.value.find(h => h.id === householdId)
        if (!household) throw new Error(`Household ${householdId} not found`)

        console.info(`🏠 > HOUSEHOLDS_STORE > Power mode: Updating preferences for all ${household.inhabitants.length} inhabitants in household ${householdId}${adminBypass ? ' (admin bypass)' : ''}`)

        // Update all inhabitants SEQUENTIALLY to avoid race conditions in scaffolding
        // Each update triggers scaffoldPrebookings for the same household - parallel execution
        // causes FK constraint errors when multiple scaffolds try to delete the same orders
        const results = await useBookingsStore().writeBookings(async () => {
            const responses = []
            for (const inhabitant of household.inhabitants) {
                responses.push(await apiRequest(preferencesUrl(inhabitant.id), {
                    method: 'POST',
                    body: {dinnerPreferences: preferences},
                    query: adminBypassQuery(adminBypass),
                    schema: InhabitantUpdateResponseSchema,
                    action: 'updateAllInhabitantPreferences'
                }))
            }
            return responses
        })

        // Refresh the selected household once after all updates
        if (selectedHouseholdId.value === householdId) {
            await refreshSelectedHousehold()
        }

        // Power mode updates a single household
        const aggregatedResult = {...sumScaffoldResults(results.map(r => r.scaffoldResult)), households: 1}

        lastPreferenceResult.value = aggregatedResult
        console.info(`🏠 > HOUSEHOLDS_STORE > Power mode complete: ${household.inhabitants.length} inhabitants, scaffold: ${formatScaffoldResult(aggregatedResult)}`)

        return aggregatedResult
    }

    /**
     * What a save of the draft preferences would do, read without writing: the dry run (GET) of each inhabitant the
     * save writes, combined. One inhabitant, or every inhabitant of the household in power mode
     */
    const previewPreferences = async (inhabitantIds: number[], preferences: WeekDayMap<DinnerMode>): Promise<ScaffoldResult> => {
        console.info(`🏠 > HOUSEHOLDS_STORE > Previewing preferences for inhabitants ${inhabitantIds.join(', ')}`)
        // A preview writes nothing, so the previews run side by side where the saves run one after another
        const responses = await Promise.all(inhabitantIds.map(inhabitantId => apiRequest(preferencesUrl(inhabitantId), {
            query: {dinnerPreferences: serializeWeekDayMap(preferences)},
            schema: InhabitantUpdateResponseSchema,
            action: 'previewPreferences'
        })))
        // One person's preview is the save's whole result, the other members' corrections included
        if (responses.length === 1) return responses[0]!.scaffoldResult
        // In power mode an inhabitant's lines come from the preview holding that inhabitant's draft; another member's
        // preview decides them by the stored preferences
        const ownLines = responses.map(({scaffoldResult}, index) => {
            const results = scaffoldResult.results.filter(line => line.inhabitantId === inhabitantIds[index])
            return {...scaffoldResult, results, totals: countTotals(results)}
        })
        // The inhabitants share one household
        return {...sumScaffoldResults(ownLines), households: 1}
    }

    /**
     * Set or clear move-out date for a household
     * Uses the household update endpoint (POST /api/household/:id/update)
     * Triggers re-scaffolding of prebookings when moveOutDate changes (server-side)
     * @param householdId - ID of the household
     * @param moveOutDate - Date to set, or null to clear
     */
    const setMoveOutDate = async (householdId: number, moveOutDate: Date | null, adminBypass: boolean) => {
        console.info(`🏠 > HOUSEHOLDS_STORE > Setting moveOutDate for household ${householdId}: ${moveOutDate?.toISOString() ?? 'null'}`)
        const result = await useBookingsStore().writeBookings(() => apiRequest(`/api/household/${householdId}/update`, {
            method: 'POST',
            body: { moveOutDate },
            query: adminBypassQuery(adminBypass),
            schema: HouseholdUpdateResponseSchema,
            action: 'setMoveOutDate'
        }))

        lastMoveOutResult.value = result.scaffoldResult
        console.info(`🏠 > HOUSEHOLDS_STORE > moveOutDate updated for household ${householdId}: ${formatScaffoldResult(result.scaffoldResult)}`)

        if (selectedHouseholdId.value === householdId) {
            await refreshSelectedHousehold()
        }
        // Also refresh household list to update display badges
        await refreshHouseholds()

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
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Moving inhabitant ${inhabitantId} to household ${targetHouseholdId}`)
        const result = await useBookingsStore().writeBookings(() => apiRequest(`/api/admin/household/inhabitants/${inhabitantId}`, {
            method: 'POST',
            body: {householdId: targetHouseholdId},
            schema: InhabitantUpdateResponseSchema,
            action: 'moveInhabitant'
        })).catch(() => null)
        if (!result) return

        lastMoveResult.value = result.scaffoldResult
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Inhabitant moved: ${formatScaffoldResult(result.scaffoldResult)}`)

        if (selectedHouseholdId.value) {
            await refreshSelectedHousehold()
        }
        await refreshHouseholds()

        const targetHousehold = households.value.find(h => h.id === targetHouseholdId)
        const targetLabel = targetHousehold ? `${targetHousehold.shortName} (PBS ${targetHousehold.pbsId})` : `husstand ${targetHouseholdId}`
        const scaffoldSummary = formatResultLines(result.scaffoldResult, targetHousehold?.inhabitants.map(({id}) => id))
        const {BookingActionSchema} = useBookingValidation()
        const Action = BookingActionSchema.enum
        const hasOrderChanges = [Action.BOOK, Action.CANCEL, Action.RELEASE].some(action => result.scaffoldResult.totals[action] > 0)

        toastSaved(`${result.inhabitant.name} ${result.inhabitant.lastName} flyttet til ${targetLabel}`, hasOrderChanges ? scaffoldSummary : undefined,
            scaffoldToastLook(result.scaffoldResult).ui)

        return result
    }

    /**
     * Delete a household (CASCADE removes inhabitants, ADR-005)
     * Resolves without deleting when the request fails; the request has already toasted it
     */
    const deleteHousehold = async (householdId: number) => {
        // Capture identity before deletion (lookup disappears after refreshHouseholds)
        const deleted = households.value.find(h => h.id === householdId)
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Deleting household ${householdId}`)
        const isDeleted = await apiRequest(`/api/admin/household/${householdId}`, {method: 'DELETE', action: 'deleteHousehold'})
            .then(() => true, () => false)
        if (!isDeleted) return
        console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Household ${householdId} deleted`)

        skipGoneId(householdChoice, householdId, resolveHouseholdId)
        await refreshHouseholds()

        toastSaved('Husstand slettet', deleted ? `${deleted.shortName} · PBS ${deleted.pbsId}` : undefined)
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
            toastSaved('Husstand oprettet', `${created.shortName} · PBS ${created.pbsId}`)
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
        selectHousehold,
        fetchHouseholdDetail,
        fetchCalendarFeed,
        refreshSelectedHousehold,
        updateInhabitantPreferences,
        updateAllInhabitantPreferences,
        previewPreferences,
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
