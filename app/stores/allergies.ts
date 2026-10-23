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
    const {storeAsyncData, loadOrThrow, apiRequest} = useApiHandler()
    const {AllergyTypeDisplaySchema, AllergyTypeDetailSchema, AllergyDetailSchema} = useAllergyValidation()
    const {SettingDetailSchema, SETTING_REGISTRY} = useSettingValidation()

    // ========================================
    // State (ADR-007)
    // ========================================

    // AllergyTypes - Global catalog (admin managed)
    // Only reached on protected routes (server/middleware/1.guard.ts redirects without a
    // session), so no auth gate is needed - one fetch, identical on server and client.
    const allergyTypesDataset = storeAsyncData('allergy-store-types', '/api/admin/allergy-type', {
        schema: AllergyTypeDetailSchema.array(),
        default: () => [],
        errorMessage: 'Kunne ikke hente allergi katalog'
    })
    const {
        data: allergyTypes,
        error: allergyTypesError,
        refresh: refreshAllergyTypes,
        isLoading: isAllergyTypesLoading,
        isErrored: isAllergyTypesErrored,
        isInitialized: isAllergyTypesInitialized
    } = allergyTypesDataset

    // The page names the allergy type its URL carries; an id outside the catalog selects none
    const allergyTypeChoice = shallowRef<() => number | null>(() => null)
    const selectedAllergyTypeId = computed(() => {
        const id = allergyTypeChoice.value()
        return allergyTypes.value.find(at => at.id === id)?.id ?? null
    })

    const isAllergyTypeSelected = computed(() => !!selectedAllergyTypeId.value)

    const {
        data: selectedAllergyType,
        error: selectedAllergyTypeError,
        isLoading: isSelectedAllergyTypeLoading,
        isErrored: isSelectedAllergyTypeErrored,
        isInitialized: isSelectedAllergyTypeInitialized
    } = storeAsyncData(
        'allergy-store-selected-allergy-type',
        () => `/api/admin/allergy-type/${selectedAllergyTypeId.value}`,
        {
            schema: AllergyTypeDisplaySchema.nullable(),
            default: () => null,
            enabled: () => isAllergyTypeSelected.value,
            dependsOn: [allergyTypesDataset],
            errorMessage: 'Kan ikke finde allergitypen',
            notFound: {
                recover: async () => {
                    skipGoneId(allergyTypeChoice, selectedAllergyTypeId.value)
                    await refreshAllergyTypes()
                },
                toast: 'Kan ikke finde allergitypen'
            }
        }
    )

    // Poster notes - ONE Setting row, read by the catalog card header and the poster.
    // It keeps its own status flags and stays out of isAllergyStoreReady, so the poster
    // prints its notes even while the catalog is still loading.
    const posterNotesDataset = storeAsyncData('allergy-store-poster-notes', POSTER_NOTES_ENDPOINT, {
        schema: SettingDetailSchema.nullable(),
        default: () => null,
        errorMessage: 'Kunne ikke hente bemærkninger'
    })
    const {
        data: posterNotesSetting,
        error: posterNotesError,
        isLoading: isPosterNotesLoading,
        isErrored: isPosterNotesErrored,
        isInitialized: isPosterNotesInitialized
    } = posterNotesDataset

    // Allergies - the selected household's; nothing is requested until a component asks
    const householdsStore = useHouseholdsStore()
    const isHouseholdAllergiesRequested = ref(false)
    const isHouseholdAllergiesEnabled = computed(() => isHouseholdAllergiesRequested.value && !!householdsStore.selectedHouseholdId)

    const {
        data: allergies,
        error: allergiesError,
        refresh: refreshAllergies,
        isLoading: isAllergiesLoading,
        isErrored: isAllergiesErrored,
        isInitialized: isAllergiesInitialized
    } = storeAsyncData(
        'allergy-store-allergies',
        () => `/api/household/allergy?householdId=${householdsStore.selectedHouseholdId}`,
        {
            schema: AllergyDetailSchema.array(),
            default: () => [],
            enabled: () => isHouseholdAllergiesEnabled.value,
            dependsOn: [householdsStore.selectedHouseholdDataset],
            errorMessage: 'Kunne ikke hente allergier'
        }
    )

    // ========================================
    // Computed - Public API (derived from status)
    // ========================================

    const isNoAllergyTypes = computed(() => isAllergyTypesInitialized.value && allergyTypes.value.length === 0)

    const isNoAllergies = computed(() => isAllergiesInitialized.value && allergies.value.length === 0)

    // The registry default covers the first paint and a failed fetch, so the box is never empty
    const posterNotes = computed(() =>
        posterNotesSetting.value?.value ?? SETTING_REGISTRY[POSTER_NOTES_KEY].defaultValue
    )

    // The catalog, and each gated dataset once its condition holds (ADR-007); the poster notes keep their own flags
    const isAllergyStoreReady = computed(() =>
        isAllergyTypesInitialized.value
        && (!isAllergyTypeSelected.value || isSelectedAllergyTypeInitialized.value)
        && (!isHouseholdAllergiesEnabled.value || isAllergiesInitialized.value)
    )

    // ========================================
    // Actions - AllergyTypes (Admin)
    // ========================================

    const loadAllergyTypes = () => loadOrThrow(allergyTypesDataset, () => `🥜 > ALLERGY_STORE > Loaded ${allergyTypes.value.length} allergy types`)

    const selectAllergyType = (choice: MaybeRefOrGetter<number | null>) => {
        allergyTypeChoice.value = () => toValue(choice)
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

    const loadPosterNotes = () => loadOrThrow(posterNotesDataset, '🥜 > ALLERGY_STORE > Loaded poster notes')

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

    const loadAllergiesForHousehold = () => {
        isHouseholdAllergiesRequested.value = true
    }

    // The allergy-type catalog embeds inhabitants per type (admin counts, PDF poster),
    // so every allergy mutation must refresh BOTH caches
    const refreshAfterAllergyMutation = async () => {
        await refreshAllergies()
        await refreshAllergyTypes()
    }

    // A change to another household's allergies carries the override; the household's own change carries none (ADR-004)
    const overrideQuery = (adminBypass?: boolean) => adminBypass ? {adminBypass} : {}

    const createAllergy = async (allergyData: AllergyCreate, adminBypass?: boolean): Promise<AllergyDisplay> => {
        const created = await apiRequest<AllergyDisplay>('/api/household/allergy', {
            method: 'PUT',
            body: allergyData,
            query: overrideQuery(adminBypass),
            action: 'createAllergy'
        })
        await refreshAfterAllergyMutation()
        console.info(`🥜 > ALLERGY_STORE > Created allergy for inhabitant ID: ${created.inhabitantId}`)
        return created
    }

    // id travels in the path, not the body - the endpoint injects it (mirrors updateAllergyType)
    const updateAllergy = async (id: number, allergyData: Omit<AllergyUpdate, 'id'>, adminBypass?: boolean): Promise<AllergyDisplay> => {
        const updated = await apiRequest<AllergyDisplay>(`/api/household/allergy/${id}`, {
            method: 'POST',
            body: allergyData,
            query: overrideQuery(adminBypass),
            action: 'updateAllergy'
        })
        await refreshAfterAllergyMutation()
        console.info(`🥜 > ALLERGY_STORE > Updated allergy ID: ${updated.id}`)
        return updated
    }

    const deleteAllergy = async (id: number, adminBypass?: boolean): Promise<void> => {
        await apiRequest(`/api/household/allergy/${id}`, {method: 'DELETE', query: overrideQuery(adminBypass), action: 'deleteAllergy'})
        await refreshAfterAllergyMutation()
        console.info(`🥜 > ALLERGY_STORE > Deleted allergy ID: ${id}`)
    }

    return {
        // State - AllergyTypes
        allergyTypes,
        selectedAllergyType,
        selectedAllergyTypeId,
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
        selectAllergyType,
        createAllergyType,
        updateAllergyType,
        deleteAllergyType,
        // Actions - Poster notes
        loadPosterNotes,
        savePosterNotes,
        // Actions - Allergies
        loadAllergiesForHousehold,
        createAllergy,
        updateAllergy,
        deleteAllergy
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAllergiesStore, import.meta.hot))
}
