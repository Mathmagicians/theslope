export const useAuthStore = defineStore("Auth", () => {
    const {loggedIn, user, session, clear, fetch} = useUserSession()

    // Get SystemRole enum from validation composable
    const {SystemRoleSchema} = useCoreValidation()
    const SystemRole = SystemRoleSchema.enum

    const signIn = async (email: string, password: string) => {
        await $fetch("/api/auth/login", {
            method: "POST",
            body: {email: email, password: password},
            headers: {ContentType: 'application/json'}
        }) //talks with the api and performs a login
        await fetch(); //fetches the user session from the secure browser storage

    }

    const greeting = computed(() => user?.value?.Inhabitant?.name || 'Ukendt bruger')

    const avatar = computed(() => user?.value?.Inhabitant?.pictureUrl)
    const name = computed(() => user?.value?.Inhabitant?.name)
    const lastName = computed(() => user?.value?.Inhabitant?.lastName)
    const email = computed(() => user?.value?.email)
    const phone = computed(() => user?.value?.phone)
    const birthDate = computed(() => user?.value?.Inhabitant?.birthDate)
    const systemRoles = computed(() => {
        const roles = user?.value?.systemRoles
        // Parse JSON string from database to array
        if (typeof roles === 'string') {
            try {
                return JSON.parse(roles)
            } catch {
                return []
            }
        }
        return roles || []
    })
    const isAdmin = computed(() => systemRoles.value.includes(SystemRole.ADMIN))
    const isAllergyManager = computed(() => systemRoles.value.includes(SystemRole.ALLERGYMANAGER))
    const address = computed(() => user?.value?.Inhabitant?.household?.address)

    return {signIn, greeting, avatar, name, lastName, email, phone, birthDate, systemRoles, isAdmin, isAllergyManager, address, loggedIn, user, session, clear, fetch}
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
