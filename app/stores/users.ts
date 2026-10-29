import type {HeynaboImportResponse} from '~/composables/useHeynaboValidation'
import {MAINTENANCE_WORDS} from '~/config/maintenanceWords'
import {USER_WORDS} from '~/config/userWords'

export const useUsersStore = defineStore("Users", () => {
    // DEPENDENCIES
    const {storeAsyncData, loadOrThrow, apiRequest, toastSaved, runJob} = useApiHandler()
    const {formatHeynaboStats, jobTypeLabels} = useMaintenance()
    const {JobType} = useMaintenanceValidation()

    // Get SystemRole enum from validation composable
    const {SystemRoleSchema, UserDisplaySchema} = useCoreValidation()
    const SystemRole = SystemRoleSchema.enum

    const {
        data: allergyManagers,
        error: allergyManagersError,
        isLoading: isAllergyManagersLoading,
        isErrored: isAllergyManagersErrored
    } = storeAsyncData('allergyManagers', `/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`, {
        schema: UserDisplaySchema.array(),
        default: () => []
    })

    const usersDataset = storeAsyncData('users', '/api/admin/users', {
        schema: UserDisplaySchema.array(),
        default: () => []
    })
    const {
        data: users,
        error: usersError,
        refresh: refreshUsers,
        isLoading: isUsersLoading,
        isErrored: isUsersErrored
    } = usersDataset

    const authStore = useAuthStore()


    // My teams - cooking teams the logged-in user is assigned to in active season
    const {CookingTeamDetailSchema} = useCookingTeamValidation()
    const myTeamsDataset = storeAsyncData('users-store-my-teams', '/api/team/my', {
        schema: CookingTeamDetailSchema.array(),
        default: () => []
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
    const isImportHeynaboErrored = computed(() => heynaboImportError.value !== null)

    // ========================================
    // Store Actions
    // ========================================
    const loadUsers = () => loadOrThrow(usersDataset, () => `${LOG_CTX} 🪪 > USERS_STORE > loadUsers > Loaded ${users.value.length} users`)

    // Heynabo import - only when triggered by admin, not on store creation
    const heynaboImportLabel = jobTypeLabels[JobType.HEYNABO_IMPORT]
    const {result: heynaboImport, error: heynaboImportError, isRunning: isImportHeynaboLoading, run: runHeynaboImport} = runJob<HeynaboImportResponse>({
        url: '/api/admin/heynabo/import',
        query: () => ({triggeredBy: `ADMIN:${authStore.email}`}),
        action: 'importHeynaboData',
        errorMessage: MAINTENANCE_WORDS.job.failed(heynaboImportLabel),
        formatStats: formatHeynaboStats,
        title: MAINTENANCE_WORDS.job.completed(heynaboImportLabel),
        log: `${LOG_CTX} 🪪 > USERS_STORE > importHeynaboData >`,
        onSuccess: () => loadUsers()
    })
    const importHeynaboData = async () => {
        await runHeynaboImport()
    }

    const loadMyTeams = () => loadOrThrow(myTeamsDataset, () => `🪪 > USERS_STORE > loadMyTeams > Loaded ${myTeams.value.length} teams`)

    /**
     * Update user roles via POST /api/admin/users/[id]
     * Refreshes users list after successful update
     */
    const updateUserRoles = async (userId: number, systemRoles: string[]) => {
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
        isAllergyManagersLoading,
        isAllergyManagersErrored,
        allergyManagersError,
        myTeams,
        loadMyTeams,
        isMyTeamsLoading,
        isMyTeamsErrored,
        isMyTeamsInitialized,
        myTeamsError,
        updateUserRoles
    };
});

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot));
}
