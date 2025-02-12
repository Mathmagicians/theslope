import type { InternalApi } from 'nitropack'
import {formatDistanceToNow} from "date-fns"
import {da} from "date-fns/locale"

type UsersApiResponse = InternalApi['/api/admin/users']['get']

export const useUsersStore = defineStore("Users", () => {
    // Create state for holding users
    const users = ref<UsersApiResponse | null>(null)
    const importing = ref(false)

    /** Function to load user data */
    const loadData = async () => {
        try {
            // Fetch data from the server
            const response = await useFetch("/api/admin/users")
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
            users.value = await $fetch("/api/admin/heynabo/import")
            importing.value = false
        } catch (error: any) {
            createError({
                statusMessage: "Error Importing users from Heynabo",
                statusCode: 500,
                cause: error
            })
        }
    };

    return {
        users,
        formattedUsers,
        loadData,
        importHeynaboData,
        importing
    };
});

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot));
}
