import type {UserDisplay, HouseholdDetail} from '~/composables/useCoreValidation'
import type {CookingTeamDetail} from '~/composables/useCookingTeamValidation'

export const useUsersStore = defineStore("Users", () => {
    // DEPENDENCIES
    const {handleApiError} = useApiHandler()

    // Get SystemRole enum from validation composable
    const {SystemRoleSchema} = useCoreValidation()
    const SystemRole = SystemRoleSchema.enum

    const {
        data: allergyManagers,
        status: allergyManagersStatus,
        error: allergyManagersError
    } = useFetch<UserDisplay[]>(
        `/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`,
        {
            key: 'allergyManagers',
            immediate: true,
            default: () => []
        }
    )

    const {
        data: users,
        status: usersStatus,
        error: usersError,
        refresh: refreshUsers
    } = useFetch<UserDisplay[]>(
        '/api/admin/users',
        {
            key: 'users',
            immediate: true,
            default: () => []
        }
    )

    const {
        data: heynaboImport,
        status: heynaboImportStatus,
        error: heynaboImportError,
        refresh: refreshHeynaboImport
    } = useAsyncData<HouseholdDetail[]>(
        '/api/admin/heynabo/import',
        () => $fetch<HouseholdDetail[]>('/api/admin/heynabo/import'),
        {
            default: () => [],
            immediate: false // only when triggered by admin, not on store creation
        }
    )

    // My teams - cooking teams the logged-in user is assigned to in active season
    // HTTP JSON converts Date objects to ISO strings during transport
    // CookingTeamDetailSchema.parse() handles date coercion via z.coerce.date()
    const {CookingTeamDetailSchema} = useCookingTeamValidation()
    const {
        data: myTeams,
        status: myTeamsStatus,
        error: myTeamsError,
        refresh: refreshMyTeams
    } = useFetch<CookingTeamDetail[]>(
        '/api/team/my',
        {
            key: 'users-store-my-teams',
            default: () => [],
            immediate: true,
            transform: (data: any[]) => {
                try {
                    // Parse through schema to coerce ISO date strings to Date objects
                    // Affinity is already an object (HTTP deserialized it), no manual JSON.parse needed
                    return data.map(team => CookingTeamDetailSchema.parse(team))
                } catch (e) {
                    handleApiError(e, 'parseMyTeams')
                    throw e
                }
            }
        }
    )


    // ========================================
    // Computed - Public API (derived from status)
    // ========================================
    const isAllergyManagersLoading = computed(() => allergyManagersStatus.value === 'pending')
    const isAllergyManagersErrored = computed(() => allergyManagersStatus.value === 'error')
    const isImportHeynaboLoading = computed(() => heynaboImportStatus.value === 'pending')
    const isImportHeynaboErrored = computed(() => heynaboImportStatus.value === 'error')
    const isUsersLoading = computed(() => usersStatus.value === 'pending')
    const isUsersErrored = computed(() => usersStatus.value === 'error')
    const isMyTeamsLoading = computed(() => myTeamsStatus.value === 'pending')
    const isMyTeamsErrored = computed(() => myTeamsStatus.value === 'error')
    const isMyTeamsInitialized = computed(() =>
        myTeamsStatus.value === 'success' && myTeams.value !== null
    )

    // ========================================
    // Store Actions
    // ========================================
    const loadUsers = async () => {
        await refreshUsers()
        if (usersError.value) {
            handleApiError(usersError.value, 'loadUsers')
            throw usersError.value
        }
        console.info(LOG_CTX, `🪪 > USERS_STORE > loadUsers > Loaded ${users.value.length} users`)
    }


    const importHeynaboData = async () => {
        await refreshHeynaboImport()
        if (heynaboImportError.value) {
            handleApiError(heynaboImportError.value, 'importHeynaboData')
            throw heynaboImportError.value
        }
        console.info(LOG_CTX, `🪪 > USERS_STORE > importHeynaboData > Loaded ${heynaboImport.value?.length} households from Heynabo`)
        loadUsers()
    }

    const loadMyTeams = async () => {
        await refreshMyTeams()
        if (myTeamsError.value) {
            handleApiError(myTeamsError.value, 'loadMyTeams')
            throw myTeamsError.value
        }
        console.info(`🪪 > USERS_STORE > loadMyTeams > Loaded ${myTeams.value.length} teams`)
    }

    return {
        importHeynaboData,
        isImportHeynaboLoading,
        isImportHeynaboErrored,
        users,
        loadUsers,
        isUsersLoading,
        isUsersErrored,
        usersError,
        allergyManagers,
        isAllergyManagersLoading,
        isAllergyManagersErrored,
        allergyManagersError,
        myTeams,
        loadMyTeams,
        isMyTeamsLoading,
        isMyTeamsErrored,
        isMyTeamsInitialized,
        myTeamsError
    };
});

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot));
}
