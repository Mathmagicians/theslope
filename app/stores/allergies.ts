import type {
    AllergyTypeCreate,
    AllergyTypeUpdate,
    AllergyTypeDisplay,
    AllergyDisplay,
    AllergyCreate,
    AllergyUpdate
} from '~/composables/useAllergyValidation'

/** The one Setting row the allergy surfaces read */
const POSTER_NOTES_KEY = 'allergy-poster-notes'
const POSTER_NOTES_ENDPOINT = `/api/admin/setting/${POSTER_NOTES_KEY}`

/**
 * Allergy store - manages allergy types (admin catalog) and household/inhabitant allergies
 * Following ADR-007: Store owns server data, component owns UI state
 * Following ADR-009: Index endpoints return lightweight data, detail returns comprehensive relations
 */
export const useAllergiesStore = defineStore("Allergies", () => {

    // DEPENDENCIES
    const {storeAsyncData, apiRequest} = useApiHandler()
    const {AllergyTypeDisplaySchema, AllergyTypeDetailSchema, AllergyDetailSchema} = useAllergyValidation()
    const {SettingDetailSchema, SETTING_REGISTRY} = useSettingValidation()

    // ========================================
    // State (ADR-007)
    // ========================================

    // AllergyTypes - Global catalog (admin managed)
    // Only reached on protected routes (server/middleware/1.guard.ts redirects without a
    // session), so no auth gate is needed - one fetch, identical on server and client.
    const {
        data: allergyTypes,
        status: allergyTypesStatus,
        error: allergyTypesError,
        refresh: refreshAllergyTypes
    } = storeAsyncData('allergy-store-types', '/api/admin/allergy-type', {
        schema: AllergyTypeDetailSchema.array(),
        default: () => [],
        errorMessage: 'Kunne ikke hente allergi katalog'
    })

    // Selected AllergyType - For detail view/editing
    const selectedAllergyTypeId = ref<number | null>(null)
    const selectedAllergyTypeKey = computed(() => `/api/admin/allergy-type/${selectedAllergyTypeId.value || 'null'}`)

    const {
        data: selectedAllergyType,
        status: selectedAllergyTypeStatus,
        error: selectedAllergyTypeError
    } = storeAsyncData(
        selectedAllergyTypeKey,
        () => `/api/admin/allergy-type/${selectedAllergyTypeId.value}`,
        {
            schema: AllergyTypeDisplaySchema.nullable(),
            default: () => null,
            enabled: () => !!selectedAllergyTypeId.value,
            errorMessage: 'Kan ikke finde allergitypen'
        }
    )

    // Poster notes - ONE Setting row, read by the catalog card header and the poster.
    // It keeps its own status refs and stays out of isAllergyStoreReady, so the poster
    // prints its notes even while the catalog is still loading.
    const {
        data: posterNotesSetting,
        status: posterNotesStatus,
        error: posterNotesError,
        refresh: refreshPosterNotes
    } = storeAsyncData('allergy-store-poster-notes', POSTER_NOTES_ENDPOINT, {
        schema: SettingDetailSchema.nullable(),
        default: () => null,
        errorMessage: 'Kunne ikke hente bemærkninger'
    })

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
    } = storeAsyncData(
        allergiesQueryKey,
        allergiesQueryKey,
        {
            schema: AllergyDetailSchema.array(),
            immediate: true,
            default: () => [],
            enabled: () => !!filterInhabitantId.value || !!filterHouseholdId.value,
            errorMessage: 'Kunne ikke hente allergier'
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

    // Poster notes status - deliberately NOT folded into isAllergyStoreReady
    const isPosterNotesLoading = computed(() => posterNotesStatus.value === 'pending')
    const isPosterNotesErrored = computed(() => posterNotesStatus.value === 'error')
    const isPosterNotesInitialized = computed(() =>
        posterNotesStatus.value === 'success' && posterNotesSetting.value !== null
    )
    // The registry default covers the first paint and a failed fetch, so the box is never empty
    const posterNotes = computed(() =>
        posterNotesSetting.value?.value ?? SETTING_REGISTRY[POSTER_NOTES_KEY].defaultValue
    )

    // Convenience computed for components
    const isAllergyStoreReady = computed(() => isAllergyTypesInitialized.value)

    // ========================================
    // Actions - AllergyTypes (Admin)
    // ========================================

    const loadAllergyTypes = async () => {
        await refreshAllergyTypes()
        if (allergyTypesError.value) throw allergyTypesError.value
        console.info(`🥜 > ALLERGY_STORE > Loaded ${allergyTypes.value.length} allergy types`)
    }

    const loadAllergyType = (id: number) => {
        selectedAllergyTypeId.value = id
        console.info(`🥜 > ALLERGY_STORE > Loading allergy type ID: ${id}`)
    }

    const createAllergyType = async (allergyTypeData: AllergyTypeCreate): Promise<AllergyTypeDisplay> => {
        const created = await apiRequest<AllergyTypeDisplay>('/api/admin/allergy-type', {
            method: 'PUT',
            body: allergyTypeData,
            action: 'createAllergyType'
        })
        await loadAllergyTypes()
        console.info(`🥜 > ALLERGY_STORE > Created allergy type: ${created.name}`)
        return created
    }

    const updateAllergyType = async (id: number, allergyTypeData: Omit<AllergyTypeUpdate, 'id'>): Promise<AllergyTypeDisplay> => {
        const updated = await apiRequest<AllergyTypeDisplay>(`/api/admin/allergy-type/${id}`, {
            method: 'POST',
            body: allergyTypeData,
            action: 'updateAllergyType'
        })
        await loadAllergyTypes()
        console.info(`🥜 > ALLERGY_STORE > Updated allergy type: ${updated.name}`)
        return updated
    }

    const deleteAllergyType = async (id: number): Promise<void> => {
        await apiRequest(`/api/admin/allergy-type/${id}`, {method: 'DELETE', action: 'deleteAllergyType'})
        await loadAllergyTypes()
        // CASCADE removed the type's household allergies — refresh that cache too
        await refreshAllergies()
        console.info(`🥜 > ALLERGY_STORE > Deleted allergy type ID: ${id}`)
    }

    // ========================================
    // Actions - Poster notes (Setting)
    // ========================================

    const loadPosterNotes = async () => {
        await refreshPosterNotes()
        if (posterNotesError.value) throw posterNotesError.value
        console.info('🥜 > ALLERGY_STORE > Loaded poster notes')
    }

    // The endpoint returns the stored row (ADR-009), so the response IS the new value.
    // Reading it back in a second round trip would put the box one failed request away from
    // the registry default - old notes on screen under a "saved" toast.
    const savePosterNotes = async (value: string): Promise<void> => {
        posterNotesSetting.value = await apiRequest(POSTER_NOTES_ENDPOINT, {
            method: 'POST',
            body: {value},
            schema: SettingDetailSchema,
            action: 'savePosterNotes'
        })
        console.info('🥜 > ALLERGY_STORE > Saved poster notes')
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
        const created = await apiRequest<AllergyDisplay>('/api/household/allergy', {
            method: 'PUT',
            body: allergyData,
            action: 'createAllergy'
        })
        await refreshAfterAllergyMutation()
        console.info(`🥜 > ALLERGY_STORE > Created allergy for inhabitant ID: ${created.inhabitantId}`)
        return created
    }

    // id travels in the path, not the body - the endpoint injects it (mirrors updateAllergyType)
    const updateAllergy = async (id: number, allergyData: Omit<AllergyUpdate, 'id'>): Promise<AllergyDisplay> => {
        const updated = await apiRequest<AllergyDisplay>(`/api/household/allergy/${id}`, {
            method: 'POST',
            body: allergyData,
            action: 'updateAllergy'
        })
        await refreshAfterAllergyMutation()
        console.info(`🥜 > ALLERGY_STORE > Updated allergy ID: ${updated.id}`)
        return updated
    }

    const deleteAllergy = async (id: number): Promise<void> => {
        await apiRequest(`/api/household/allergy/${id}`, {method: 'DELETE', action: 'deleteAllergy'})
        await refreshAfterAllergyMutation()
        console.info(`🥜 > ALLERGY_STORE > Deleted allergy ID: ${id}`)
    }

    // ========================================
    // Initialize Store
    // ========================================

    const initAllergiesStore = () => {
        // AllergyTypes auto-load on store creation (immediate: true)
        console.info('🥜 > ALLERGY_STORE > Store initialized')
    }

    return {
        // State - AllergyTypes
        allergyTypes,
        selectedAllergyType,
        // State - Allergies
        allergies,
        // State - Poster notes
        posterNotes,
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
        // Computed - Poster notes
        isPosterNotesLoading,
        isPosterNotesErrored,
        isPosterNotesInitialized,
        posterNotesError,
        // Computed - Store Ready
        isAllergyStoreReady,
        // Actions - AllergyTypes
        loadAllergyTypes,
        loadAllergyType,
        createAllergyType,
        updateAllergyType,
        deleteAllergyType,
        // Actions - Poster notes
        loadPosterNotes,
        savePosterNotes,
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
