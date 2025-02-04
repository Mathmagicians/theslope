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
            users.value = await $fetch("/api/admin/users");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.data.message,
                variant: "destructive",
                duration: 5000,
            });
        }
    }

    const importHeynaboData = async () => {
        try {
            // Fetch data from the heynabo server
            console.log("🍍 > PINA > USERS > Importing Heynabo data")
            users.value = await $fetch("/api/admin/heynabo/import");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.data.message,
                variant: "destructive",
                duration: 5000,
            });
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
