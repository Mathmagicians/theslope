import type {
    HouseholdDisplay,
    HouseholdDetail,
    HouseholdCreate,
    HouseholdMoveOut
} from '~/composables/useCoreValidation'
import {useBookingValidation, type ScaffoldResult, type DinnerMode} from '~/composables/useBookingValidation'
import type {WeekDayMap} from '~/types/dateTypes'
import {useBooking} from '~/composables/useBooking'
import {HOUSEHOLD_WORDS} from '~/config/householdWords'

/**
 * Household store - manages household data and API operations
 * Following ADR-007: Store owns server data, component owns UI state
 * Following ADR-009: Index endpoint returns HouseholdDisplay (lightweight), detail returns HouseholdDetail (comprehensive)
 */
export const useHouseholdsStore = defineStore("Households", () => {

    // DEPENDENCIES
    const {storeAsyncData, loadOrThrow, apiRequest, toastSaved, notFoundToast} = useApiHandler()
    const now = useClock()
    const {formatScaffoldResult} = useBooking()
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
        errorMessage: HOUSEHOLD_WORDS.failed.households
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
            errorMessage: HOUSEHOLD_WORDS.failed.household,
            // The page's getter keeps driving the choice; the gone household re-derives to my household
            notFound: {
                recover: async () => {
                    skipGoneId(householdChoice, selectedHouseholdId.value, resolveHouseholdId)
                    await refreshHouseholds()
                },
                retries: 1,
                toast: notFoundToast(households, selectedHouseholdId, HOUSEHOLD_WORDS.notFound),
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
            errorMessage: HOUSEHOLD_WORDS.failed.householdDetail(householdId)
        })
    }

    /** The session user's calendar feed URL; null when the request fails (already toasted) */
    const fetchCalendarFeed = (): Promise<string | null> =>
        apiRequest<string>('/api/calendar/feed', {action: 'fetchCalendarFeed'}).catch(() => null)

    const preferencesUrl = (inhabitantId: number) => `/api/household/inhabitants/${inhabitantId}/preferences`

    /**
     * The preference save of the inhabitant, or with `allInhabitants` of every inhabitant of its household in one run
     * (power mode); the reply's scaffold result covers the household
     */
    const savePreferences = async (inhabitantId: number, preferences: WeekDayMap<DinnerMode>, adminBypass: boolean, allInhabitants: boolean, action: string) => {
        console.info(`🏠 > HOUSEHOLDS_STORE > Updating preferences for ${allInhabitants ? 'the household of ' : ''}inhabitant ${inhabitantId}${adminBypass ? ' (admin bypass)' : ''}`)

        // The week map travels as it is; the endpoint serializes it (ADR-010)
        const result = await useBookingsStore().writeBookings(() => apiRequest(preferencesUrl(inhabitantId), {
            method: 'POST',
            body: {dinnerPreferences: preferences},
            query: {...adminBypassQuery(adminBypass), ...allInhabitantsQuery(allInhabitants)},
            schema: InhabitantUpdateResponseSchema,
            action
        }))

        lastPreferenceResult.value = result.scaffoldResult
        console.info(`🏠 > HOUSEHOLDS_STORE > Preferences updated for ${allInhabitants ? 'the household of ' : ''}inhabitant ${inhabitantId}: ${formatScaffoldResult(result.scaffoldResult)}`)

        if (selectedHouseholdId.value) {
            await refreshSelectedHousehold()
        }

        return result.scaffoldResult
    }

    /** Update inhabitant dinner preferences through the household endpoint (not admin), which requires household access */
    const updateInhabitantPreferences = (inhabitantId: number, preferences: WeekDayMap<DinnerMode>, adminBypass: boolean) =>
        savePreferences(inhabitantId, preferences, adminBypass, false, 'updateInhabitantPreferences')

    /** Power mode: the draft for every inhabitant of the inhabitant's household, saved through the inhabitant's path */
    const updateAllInhabitantPreferences = (inhabitantId: number, preferences: WeekDayMap<DinnerMode>, adminBypass: boolean) =>
        savePreferences(inhabitantId, preferences, adminBypass, true, 'updateAllInhabitantPreferences')

    /**
     * What a save of the draft preferences would do, read without writing: the save's dry run (GET), for the inhabitant
     * or with `allInhabitants` for every inhabitant of its household (power mode)
     */
    const previewPreferences = async (inhabitantId: number, preferences: WeekDayMap<DinnerMode>, allInhabitants: boolean): Promise<ScaffoldResult> => {
        console.info(`🏠 > HOUSEHOLDS_STORE > Previewing preferences for ${allInhabitants ? 'the household of ' : ''}inhabitant ${inhabitantId}`)
        const {scaffoldResult} = await apiRequest(preferencesUrl(inhabitantId), {
            query: {dinnerPreferences: serializeWeekDayMap(preferences), ...allInhabitantsQuery(allInhabitants)},
            schema: InhabitantUpdateResponseSchema,
            action: 'previewPreferences'
        })
        return scaffoldResult
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
        const movedWords = HOUSEHOLD_WORDS.toasts.moved
        const targetLabel = targetHousehold ? movedWords.household(targetHousehold.shortName, targetHousehold.pbsId) : movedWords.goneHousehold(targetHouseholdId)
        const scaffoldSummary = formatResultLines(result.scaffoldResult, targetHousehold?.inhabitants.map(({id}) => id))
        const {BookingActionSchema} = useBookingValidation()
        const Action = BookingActionSchema.enum
        const hasOrderChanges = [Action.BOOK, Action.CANCEL, Action.RELEASE].some(action => result.scaffoldResult.totals[action] > 0)

        toastSaved(movedWords.title(result.inhabitant.name, result.inhabitant.lastName, targetLabel), hasOrderChanges ? scaffoldSummary : undefined,
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

        const words = HOUSEHOLD_WORDS.toasts.deleted
        toastSaved(words.title, deleted ? words.description(deleted.shortName, deleted.pbsId) : undefined)
    }

    /**
     * Create a new household at an existing Heynabo address, optionally applying
     * move-out updates to prev owners at the same address (reuses setMoveOutDate).
     * Resolves null when a request fails; the request has already toasted it.
     */
    const createHousehold = async (
        household: HouseholdCreate,
        prevOwnerMoveOutUpdates: HouseholdMoveOut[]
    ): Promise<HouseholdDetail | null> => {
        try {
            console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Creating household at ${household.address} (PBS ${household.pbsId})`)
            const created = await apiRequest<HouseholdDetail>('/api/admin/household', {
                method: 'PUT',
                body: household,
                action: 'createHousehold'
            })
            console.info(`${LOG_CTX} 🏠 > HOUSEHOLDS_STORE > Created household ${created.id} at ${created.address}`)

            for (const update of prevOwnerMoveOutUpdates) {
                await setMoveOutDate(update.id, update.moveOutDate, true)
            }

            await refreshHouseholds()
            const words = HOUSEHOLD_WORDS.toasts.created
            toastSaved(words.title, words.description(created.shortName, created.pbsId))
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
