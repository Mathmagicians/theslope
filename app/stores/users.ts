import type {HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import type {SystemRole} from '~/composables/useCoreValidation'
import {MAINTENANCE_WORDS} from '~/config/maintenanceWords'
import {USER_WORDS} from '~/config/userWords'

export const useUsersStore = defineStore("Users", () => {
    // DEPENDENCIES
    const {storeAsyncData, loadOrThrow, apiRequest, toastSaved, runJob} = useApiHandler()
    const {formatHeynaboStats, jobTypeLabels} = useMaintenance()
    const {JobType, adminTrigger} = useMaintenanceValidation()
    const {SystemRoleSchema, UserDisplaySchema} = useCoreValidation()
    const {CookingTeamDetailSchema} = useCookingTeamValidation()

    // Each read loads once the component that shows it asks: creating the store requests nothing
    const isAllergyManagersRequested = ref(false)
    const {
        data: allergyManagers,
        error: allergyManagersError,
        isLoading: isAllergyManagersLoading,
        isErrored: isAllergyManagersErrored,
        isInitialized: isAllergyManagersInitialized
    } = storeAsyncData('allergyManagers', `/api/admin/users/by-role/${SystemRoleSchema.enum.ALLERGYMANAGER}`, {
        schema: UserDisplaySchema.array(),
        default: () => [],
        enabled: () => isAllergyManagersRequested.value
    })

    const isUsersRequested = ref(false)
    const {
        data: users,
        error: usersError,
        refresh: refreshUsers,
        isLoading: isUsersLoading,
        isErrored: isUsersErrored,
        isInitialized: isUsersInitialized
    } = storeAsyncData('users', '/api/admin/users', {
        schema: UserDisplaySchema.array(),
        default: () => [],
        enabled: () => isUsersRequested.value
    })

    const authStore = useAuthStore()


    // My teams - cooking teams the logged-in user is assigned to in active season
    const isMyTeamsRequested = ref(false)
    const myTeamsDataset = storeAsyncData('users-store-my-teams', '/api/team/my', {
        schema: CookingTeamDetailSchema.array(),
        default: () => [],
        enabled: () => isMyTeamsRequested.value
    })
    const {
        data: myTeams,
        error: myTeamsError,
        isLoading: isMyTeamsLoading,
        isErrored: isMyTeamsErrored,
        isInitialized: isMyTeamsInitialized
    } = myTeamsDataset


    // ========================================
    // Computed - Public API (derived from status)
    // ========================================
    // A read counts once it is requested
    const isUsersStoreReady = computed(() =>
        (!isUsersRequested.value || isUsersInitialized.value) &&
        (!isAllergyManagersRequested.value || isAllergyManagersInitialized.value) &&
        (!isMyTeamsRequested.value || isMyTeamsInitialized.value)
    )
    const isUsersStoreErrored = computed(() => isUsersErrored.value || isAllergyManagersErrored.value || isMyTeamsErrored.value)
    const isImportHeynaboErrored = computed(() => heynaboImportError.value !== null)

    // ========================================
    // Store Actions
    // ========================================
    const loadUsers = () => {
        isUsersRequested.value = true
    }

    const loadAllergyManagers = () => {
        isAllergyManagersRequested.value = true
    }

    // Heynabo import - only when triggered by admin, not on store creation; the refresh of unrequested users stays idle
    const heynaboImportLabel = jobTypeLabels[JobType.HEYNABO_IMPORT]
    const {result: heynaboImport, error: heynaboImportError, isRunning: isImportHeynaboLoading, run: runHeynaboImport} = runJob<HeynaboImportResponse>({
        url: '/api/admin/heynabo/import',
        method: 'POST',
        query: () => ({triggeredBy: adminTrigger(authStore.email)}),
        action: 'importHeynaboData',
        errorMessage: MAINTENANCE_WORDS.job.failed(heynaboImportLabel),
        formatStats: formatHeynaboStats,
        title: MAINTENANCE_WORDS.job.completed(heynaboImportLabel),
        log: `${LOG_CTX} 🪪 > USERS_STORE > importHeynaboData >`,
        onSuccess: () => refreshUsers()
    })
    const importHeynaboData = async () => {
        await runHeynaboImport()
    }

    const reloadMyTeams = () => loadOrThrow(myTeamsDataset, () => `🪪 > USERS_STORE > loadMyTeams > Loaded ${myTeams.value.length} teams`)

    // The page that shows the person's own teams asks for them; a later call reloads them
    const loadMyTeams = async () => {
        if (!isMyTeamsRequested.value) {
            isMyTeamsRequested.value = true
            return
        }
        await reloadMyTeams()
    }

    // A change to the person's teams reloads them only for a page that asked for them
    const refreshMyTeams = async () => {
        if (isMyTeamsRequested.value) await reloadMyTeams()
    }

    /**
     * Update user roles via POST /api/admin/users/[id]
     * Refreshes users list after successful update
     */
    const updateUserRoles = async (userId: number, systemRoles: SystemRole[]) => {
        console.info(`🪪 > USERS_STORE > updateUserRoles > Updating user ${userId} with roles [${systemRoles}]`)
        await apiRequest(`/api/admin/users/${userId}`, {
            method: 'POST',
            body: { systemRoles },
            action: 'updateUserRoles'
        })
        toastSaved(USER_WORDS.toasts.rolesUpdated.title, USER_WORDS.toasts.rolesUpdated.description)
        await refreshUsers()
    }

    return {
        importHeynaboData,
        isImportHeynaboLoading,
        isImportHeynaboErrored,
        heynaboImport,
        heynaboImportError,
        users,
        loadUsers,
        isUsersLoading,
        isUsersErrored,
        usersError,
        allergyManagers,
        loadAllergyManagers,
        isAllergyManagersLoading,
        isAllergyManagersErrored,
        allergyManagersError,
        myTeams,
        myTeamsDataset: markRaw(myTeamsDataset),
        loadMyTeams,
        refreshMyTeams,
        isMyTeamsLoading,
        isMyTeamsErrored,
        isMyTeamsInitialized,
        myTeamsError,
        isUsersStoreReady,
        isUsersStoreErrored,
        updateUserRoles
    }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot))
}
