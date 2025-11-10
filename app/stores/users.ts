import type {InternalApi} from 'nitropack'
import type {UserDisplay} from '~/composables/useUserValidation'
import type {Household} from '~/composables/useHouseholdValidation'

export const useUsersStore = defineStore("Users", () => {
    const importing = ref(false)

    // Get SystemRole enum from validation composable
    const {SystemRoleSchema} = useUserValidation()
    const SystemRole = SystemRoleSchema.enum

    const {
        data: allergyManagers,
        status: allergyManagersStatus,
        error: allergyManagersError,
        refresh: refreshAllergyManagers
    } = useAsyncData<UserDisplay[]>(
        'allergyManagers',
        () => $fetch<UserDisplay[]>(`/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`),
        {
            default: () => []
        }
    )

    const {
        data: users,
        status: usersStatus,
        error: usersError,
        refresh: refreshUsers
    } = useAsyncData<UserDisplay[]>(
        '/api/admin/users',
        () => $fetch<UserDisplay[]>('/api/admin/users'),
        {
            default: () => []
        }
    )

    const {
        data: heynaboImport,
        status: heynaboImportStatus,
        error: heynaboImportError,
        refresh: refreshHeynaboImport
    } = useAsyncData<Household[]>(
        '/api/admin/heynabo/import',
        () => $fetch<Household[]>('/api/admin/heynabo/import'),
        {
            default: () => [],
            immediate: false // only when triggered by admin, not on store creation
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

    // ========================================
    // Store Actions
    // ========================================
    const loadUsers = async () => {
        await refreshUsers()
        if (usersError.value) {
            console.error(LOG_CTX, '🪪 > USERS_STORE > loadUsers > Error loading users', usersError.value)
            throw usersError.value
        }
        console.info(LOG_CTX, `🪪 > USERS_STORE > loadUsers > Loaded ${users.value.length} users`)
    }


    const importHeynaboData = async () => {
        await refreshHeynaboImport()
        if (heynaboImportError.value) {
            console.error(LOG_CTX, '🪪 > USERS_STORE > importHeynaboData > Error importing users from Heynabo', heynaboImportError.value)
            throw heynaboImportError.value
        }
        console.info(LOG_CTX, `🪪 > USERS_STORE > importHeynaboData > Loaded ${heynaboImport.value?.length} households from Heynabo`)
        loadUsers()
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
        allergyManagersError
    };
});

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot));
}
