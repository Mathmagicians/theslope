import type { InternalApi } from 'nitropack'

type UsersApiResponse = InternalApi['/api/admin/users']['get']

export const useUsersStore = defineStore("Users", () => {
    // Create state for holding users
    const users = ref<UsersApiResponse | null>(null)

    /** Function to load user data */
    const loadData = async () => {
        try {
            // Fetch data from the server
            console.log("🍍 > PINA > USERS > Fetching users data")
            users.value = await $fetch("/api/admin/users")
        } catch (error: any) {
            createError({
                statusMessage: "Error getting users from database",
                statusCode: 500,
                cause: error
            });
        }
    }

    const importHeynaboData = async () => {
        try {
            // Fetch data from the heynabo server
            console.log("🍍 > PINA > USERS > Importing Heynabo data")
            users.value = await $fetch("/api/admin/heynabo/import");
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
        loadData,
        importHeynaboData
    };
});

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot));
}
