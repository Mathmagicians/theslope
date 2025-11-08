import type { InternalApi } from 'nitropack'
import {formatDistanceToNow} from "date-fns"
import {da} from "date-fns/locale"
import type {UserDisplay} from '~/composables/useUserValidation'

type UsersApiResponse = InternalApi['/api/admin/users']['get']

export const useUsersStore = defineStore("Users", () => {
    const users = ref<UsersApiResponse | null>(null)
    const importing = ref(false)

    // Get SystemRole enum from validation composable
    const {SystemRoleSchema} = useUserValidation()
    const SystemRole = SystemRoleSchema.enum

    const {
        data: allergyManagers,
        status: allergyManagersStatus,
        error: allergyManagersError
    } = useAsyncData<UserDisplay[]>(
        'allergyManagers',
        () => $fetch(`/api/admin/users/by-role/${SystemRole.ALLERGYMANAGER}`),
        {
            default: () => []
        }
    )

    const isAllergyManagersLoading = computed(() => allergyManagersStatus.value === 'pending')
    const isAllergyManagersErrored = computed(() => allergyManagersStatus.value === 'error')

    /** Function to load user data */
    const loadData = async () => {
        try {
            // Fetch data from the server
            const response = await useFetch("/api/admin/users", {
                deep: true
            })
            users.value = response.data.value
            console.log("🍍 > PINA > USERS > Fetched users data")
        } catch (error: any) {
            createError({
                statusMessage: "Error getting users from database",
                statusCode: 500,
                cause: error
            });
        }
    }

    const timeAgo = (then: string) => formatDistanceToNow(new Date(then), { locale: da })
    const formattedUsers = computed(() => users.value?.map((user) => {
        return {
            ...user,
            updatedAt: timeAgo(user.updatedAt)
        }
    }))

    const importHeynaboData = async () => {
        try {
            importing.value = true
            console.log("🍍 > PINA > USERS > Importing Heynabo data")
            await $fetch("/api/admin/heynabo/import")
            await loadData()
        } catch (error: any) {
            console.error("🍍 > PINA > USERS > Error importing Heynabo data:", error)
            createError({
                statusMessage: "Error Importing users from Heynabo",
                statusCode: 500,
                cause: error
            })
        } finally {
            importing.value = false
        }
    };

    return {
        users,
        formattedUsers,
        loadData,
        importHeynaboData,
        importing,
        allergyManagers,
        isAllergyManagersLoading,
        isAllergyManagersErrored,
        allergyManagersError
    };
});

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot));
}
