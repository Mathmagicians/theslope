import type {HeynaboImportResponse} from '~/composables/useHeynaboValidation'

export const useUsersStore = defineStore("Users", () => {
    // DEPENDENCIES
    const {storeAsyncData, apiRequest} = useApiHandler()
    const {formatHeynaboStats} = useMaintenance()

    // Get SystemRole enum from validation composable
    const {SystemRoleSchema, UserDisplaySchema} = useCoreValidation()
    const SystemRole = SystemRoleSchema.enum

    const {
        data: allergyManagers,
        status: allergyManagersStatus,
        error: allergyManagersError
    } = storeAsyncData('allergyManagers', `/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`, {
        schema: UserDisplaySchema.array(),
        default: () => []
    })

    const {
        data: users,
        status: usersStatus,
        error: usersError,
        refresh: refreshUsers
    } = storeAsyncData('users', '/api/admin/users', {
        schema: UserDisplaySchema.array(),
        default: () => []
    })

    const authStore = useAuthStore()

    // Heynabo import - only when triggered by admin, not on store creation
    const heynaboImport = ref<HeynaboImportResponse | null>(null)
    const heynaboImportError = ref<Error | null>(null)
    const isImportHeynaboLoading = ref(false)

    // My teams - cooking teams the logged-in user is assigned to in active season
    const {CookingTeamDetailSchema} = useCookingTeamValidation()
    const {
        data: myTeams,
        status: myTeamsStatus,
        error: myTeamsError,
        refresh: refreshMyTeams
    } = storeAsyncData('users-store-my-teams', '/api/team/my', {
        schema: CookingTeamDetailSchema.array(),
        default: () => []
    })


    // ========================================
    // Computed - Public API (derived from status)
    // ========================================
    const isAllergyManagersLoading = computed(() => allergyManagersStatus.value === 'pending')
    const isAllergyManagersErrored = computed(() => allergyManagersStatus.value === 'error')
    const isImportHeynaboErrored = computed(() => heynaboImportError.value !== null)
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
        if (usersError.value) throw usersError.value
        console.info(LOG_CTX, `🪪 > USERS_STORE > loadUsers > Loaded ${users.value.length} users`)
    }


    const toast = useToast()

    const importHeynaboData = async () => {
        isImportHeynaboLoading.value = true
        heynaboImportError.value = null
        try {
            heynaboImport.value = await apiRequest<HeynaboImportResponse>('/api/admin/heynabo/import', {
                query: { triggeredBy: `ADMIN:${authStore.email}` },
                action: 'Heynabo import fejlede'
            })
        } catch (error) {
            heynaboImport.value = null
            heynaboImportError.value = error as Error
            throw error
        } finally {
            isImportHeynaboLoading.value = false
        }

        const stats = formatHeynaboStats(heynaboImport.value)
        const description = stats.map(s => `${s.label}: ${s.value}`).join(', ')
        console.info(LOG_CTX, `🪪 > USERS_STORE > importHeynaboData > ${description}`)

        // Show success toast with import summary
        toast.add({
            title: 'Heynabo import fuldført',
            description,
            color: 'success'
        })

        await loadUsers()
    }

    const loadMyTeams = async () => {
        await refreshMyTeams()
        if (myTeamsError.value) throw myTeamsError.value
        console.info(`🪪 > USERS_STORE > loadMyTeams > Loaded ${myTeams.value.length} teams`)
    }

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
        toast.add({
            title: 'Roller opdateret',
            description: `Brugerens roller er blevet opdateret`,
            color: 'success'
        })
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
