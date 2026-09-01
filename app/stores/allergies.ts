import type {
    AllergyTypeDetail,
    AllergyTypeCreate,
    AllergyTypeUpdate,
    AllergyDisplay,
    AllergyCreate,
    AllergyUpdate,
    AllergyDetail
} from '~/composables/useAllergyValidation'

/**
 * Allergy store - manages allergy types (admin catalog) and household/inhabitant allergies
 * Following ADR-007: Store owns server data, component owns UI state
 * Following ADR-009: Index endpoints return lightweight data, detail returns comprehensive relations
 */
export const useAllergiesStore = defineStore("Allergies", () => {

    // DEPENDENCIES
    const {handleApiError} = useApiHandler()
    const {AllergyTypeDetailSchema} = useAllergyValidation()

    // ========================================
    // State - useAsyncData with useRequestFetch for SSR-safe auth context (ADR-007)
    // Using useRequestFetch ensures cookies are properly forwarded during both SSR and CSR
    // ========================================
    const requestFetch = useRequestFetch()

    // AllergyTypes - Global catalog (admin managed)
    // Only reached on protected routes (server/middleware/1.guard.ts redirects without a
    // session), so no auth gate is needed - one fetch, identical on server and client.
    const {
        data: allergyTypes,
        status: allergyTypesStatus,
        error: allergyTypesError,
        refresh: refreshAllergyTypes
    } = useAsyncData<AllergyTypeDetail[]>(
        'allergy-store-types',
        () => requestFetch<AllergyTypeDetail[]>('/api/admin/allergy-type', {
            onResponseError: ({response}) => {
                console.error(`🥜 > ALLERGY_STORE > fetchAllergyTypes failed: ${response.status} ${response.statusText}`)
                handleApiError(response._data, 'Kunne ikke hente allergi katalog')
            }
        }),
        {
            default: () => [],
            // ADR-007/ADR-010: parse to domain types - dates arrive as JSON strings over HTTP
            transform: (data: AllergyTypeDetail[]) => data.map(at => AllergyTypeDetailSchema.parse(at))
        }
    )

    // Selected AllergyType - For detail view/editing
    const selectedAllergyTypeId = ref<number | null>(null)
    const selectedAllergyTypeKey = computed(() => `/api/admin/allergy-type/${selectedAllergyTypeId.value || 'null'}`)

    const {
        data: selectedAllergyType,
        status: selectedAllergyTypeStatus,
        error: selectedAllergyTypeError
    } = useAsyncData<AllergyTypeDetail | null>(
        selectedAllergyTypeKey,
        () => {
            if (!selectedAllergyTypeId.value) return Promise.resolve(null)
            return useRequestFetch()<AllergyTypeDetail>(`/api/admin/allergy-type/${selectedAllergyTypeId.value}`, {
                onResponseError: ({response}) => { handleApiError(response._data, 'Kunne ikke hente allergitype') }
            })
        },
        {
            default: () => null
        }
    )

    // Allergies - Filtered by household or inhabitant
    const filterHouseholdId = ref<number | null>(null)
    const filterInhabitantId = ref<number | null>(null)

    const allergiesQueryKey = computed(() => {
        if (filterInhabitantId.value) {
            return `/api/household/allergy?inhabitantId=${filterInhabitantId.value}`
        }
        if (filterHouseholdId.value) {
            return `/api/household/allergy?householdId=${filterHouseholdId.value}`
        }
        return '/api/household/allergy-null' // Invalid key - will not fetch
    })

    const {
        data: allergies,
        status: allergiesStatus,
        error: allergiesError,
        refresh: refreshAllergies
    } = useAsyncData<AllergyDetail[]>(
        allergiesQueryKey,
        () => {
            if (!filterInhabitantId.value && !filterHouseholdId.value) {
                return Promise.resolve([])
            }
            return useRequestFetch()<AllergyDetail[]>(allergiesQueryKey.value, {
                onResponseError: ({response}) => { handleApiError(response._data, 'Kunne ikke hente allergier') }
            })
        },
        {
            immediate: true,
            default: () => []
        }
    )

    // ========================================
    // Computed - Public API (derived from status)
    // ========================================

    // AllergyTypes status
    const isAllergyTypesLoading = computed(() => allergyTypesStatus.value === 'pending')
    const isAllergyTypesErrored = computed(() => allergyTypesStatus.value === 'error')
    // ADR-007: initialized requires data to exist, not just a successful status
    const isAllergyTypesInitialized = computed(() =>
        allergyTypesStatus.value === 'success' && allergyTypes.value !== null
    )
    const isNoAllergyTypes = computed(() => isAllergyTypesInitialized.value && allergyTypes.value.length === 0)

    // Selected AllergyType status
    const isSelectedAllergyTypeLoading = computed(() => selectedAllergyTypeStatus.value === 'pending')
    const isSelectedAllergyTypeErrored = computed(() => selectedAllergyTypeStatus.value === 'error')
    const isSelectedAllergyTypeInitialized = computed(() =>
        selectedAllergyTypeStatus.value === 'success' && selectedAllergyType.value !== null
    )

    // Allergies status
    const isAllergiesLoading = computed(() => allergiesStatus.value === 'pending')
    const isAllergiesErrored = computed(() => allergiesStatus.value === 'error')
    const isAllergiesInitialized = computed(() => allergiesStatus.value === 'success')
    const isNoAllergies = computed(() => isAllergiesInitialized.value && allergies.value.length === 0)

    // Convenience computed for components
    const isAllergyStoreReady = computed(() => isAllergyTypesInitialized.value)

    // ========================================
    // Actions - AllergyTypes (Admin)
    // ========================================

    const loadAllergyTypes = async () => {
        await refreshAllergyTypes()
        if (allergyTypesError.value) {
            handleApiError(allergyTypesError.value, 'loadAllergyTypes')
            throw allergyTypesError.value
        }
        console.info(`🥜 > ALLERGY_STORE > Loaded ${allergyTypes.value.length} allergy types`)
    }

    const loadAllergyType = (id: number) => {
        selectedAllergyTypeId.value = id
        console.info(`🥜 > ALLERGY_STORE > Loading allergy type ID: ${id}`)
    }

    const createAllergyType = async (allergyTypeData: AllergyTypeCreate): Promise<AllergyTypeDisplay> => {
        try {
            const created = await $fetch<AllergyTypeDisplay>('/api/admin/allergy-type', {
                method: 'PUT',
                body: allergyTypeData,
                headers: {'Content-Type': 'application/json'}
            })
            await loadAllergyTypes()
            console.info(`🥜 > ALLERGY_STORE > Created allergy type: ${created.name}`)
            return created
        } catch (e: unknown) {
            handleApiError(e, 'createAllergyType')
            throw e
        }
    }

    const updateAllergyType = async (id: number, allergyTypeData: Omit<AllergyTypeUpdate, 'id'>): Promise<AllergyTypeDisplay> => {
        try {
            const updated = await $fetch<AllergyTypeDisplay>(`/api/admin/allergy-type/${id}`, {
                method: 'POST',
                body: allergyTypeData,
                headers: {'Content-Type': 'application/json'}
            })
            await loadAllergyTypes()
            console.info(`🥜 > ALLERGY_STORE > Updated allergy type: ${updated.name}`)
            return updated
        } catch (e: unknown) {
            handleApiError(e, 'updateAllergyType')
            throw e
        }
    }

    const deleteAllergyType = async (id: number): Promise<void> => {
        try {
            await $fetch(`/api/admin/allergy-type/${id}`, {
                method: 'DELETE'
            })
            await loadAllergyTypes()
            // CASCADE removed the type's household allergies — refresh that cache too
            await refreshAllergies()
            console.info(`🥜 > ALLERGY_STORE > Deleted allergy type ID: ${id}`)
        } catch (e: unknown) {
            handleApiError(e, 'deleteAllergyType')
            throw e
        }
    }

    // ========================================
    // Actions - Allergies (Household/Inhabitant)
    // ========================================

    const loadAllergiesForHousehold = async (householdId: number) => {
        filterHouseholdId.value = householdId
        filterInhabitantId.value = null
        await refreshAllergies()
        console.info(`🥜 > ALLERGY_STORE > Loaded ${allergies.value.length} allergies for household ${householdId}`)
    }

    const loadAllergiesForInhabitant = async (inhabitantId: number) => {
        filterInhabitantId.value = inhabitantId
        filterHouseholdId.value = null
        console.info(`🥜 > ALLERGY_STORE > Loading allergies for inhabitant ID: ${inhabitantId}`)
        await refreshAllergies()
    }

    // The allergy-type catalog embeds inhabitants per type (admin counts, PDF poster),
    // so every allergy mutation must refresh BOTH caches
    const refreshAfterAllergyMutation = async () => {
        await refreshAllergies()
        await refreshAllergyTypes()
    }

    const createAllergy = async (allergyData: AllergyCreate): Promise<AllergyDisplay> => {
        try {
            const created = await $fetch<AllergyDisplay>('/api/household/allergy', {
                method: 'PUT',
                body: allergyData,
                headers: {'Content-Type': 'application/json'}
            })
            await refreshAfterAllergyMutation()
            console.info(`🥜 > ALLERGY_STORE > Created allergy for inhabitant ID: ${created.inhabitantId}`)
            return created
        } catch (e: unknown) {
            handleApiError(e, 'createAllergy')
            throw e
        }
    }

    // id travels in the path, not the body - the endpoint injects it (mirrors updateAllergyType)
    const updateAllergy = async (id: number, allergyData: Omit<AllergyUpdate, 'id'>): Promise<AllergyDisplay> => {
        try {
            const updated = await $fetch<AllergyDisplay>(`/api/household/allergy/${id}`, {
                method: 'POST',
                body: allergyData,
                headers: {'Content-Type': 'application/json'}
            })
            await refreshAfterAllergyMutation()
            console.info(`🥜 > ALLERGY_STORE > Updated allergy ID: ${updated.id}`)
            return updated
        } catch (e: unknown) {
            handleApiError(e, 'updateAllergy')
            throw e
        }
    }

    const deleteAllergy = async (id: number): Promise<void> => {
        try {
            await $fetch(`/api/household/allergy/${id}`, {
                method: 'DELETE'
            })
            await refreshAfterAllergyMutation()
            console.info(`🥜 > ALLERGY_STORE > Deleted allergy ID: ${id}`)
        } catch (e: unknown) {
            handleApiError(e, 'deleteAllergy')
            throw e
        }
    }

    // ========================================
    // Initialize Store
    // ========================================

    const initAllergiesStore = () => {
        // AllergyTypes auto-load on store creation (immediate: true)
        console.info('🥜 > ALLERGY_STORE > Store initialized')
    }

    // AUTO-INITIALIZATION - Watch for allergy types to load
    watch(isAllergyTypesInitialized, () => {
        if (!isAllergyTypesInitialized.value) return
        console.info('🥜 > ALLERGY_STORE > Allergy types loaded')
    })

    return {
        // State - AllergyTypes
        allergyTypes,
        selectedAllergyType,
        // State - Allergies
        allergies,
        // Computed - AllergyTypes
        isAllergyTypesLoading,
        isAllergyTypesErrored,
        isAllergyTypesInitialized,
        isNoAllergyTypes,
        allergyTypesError,
        isSelectedAllergyTypeLoading,
        isSelectedAllergyTypeErrored,
        isSelectedAllergyTypeInitialized,
        selectedAllergyTypeError,
        // Computed - Allergies
        isAllergiesLoading,
        isAllergiesErrored,
        isAllergiesInitialized,
        isNoAllergies,
        allergiesError,
        // Computed - Store Ready
        isAllergyStoreReady,
        // Actions - AllergyTypes
        loadAllergyTypes,
        loadAllergyType,
        createAllergyType,
        updateAllergyType,
        deleteAllergyType,
        // Actions - Allergies
        loadAllergiesForHousehold,
        loadAllergiesForInhabitant,
        createAllergy,
        updateAllergy,
        deleteAllergy,
        // Initialize
        initAllergiesStore
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAllergiesStore, import.meta.hot))
}
