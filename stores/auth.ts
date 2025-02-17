export const useAuthStore = defineStore("Auth", () => {
    const {loggedIn, user, session, clear, fetch} = useUserSession();
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
    const systemRole = computed(() => user?.value?.systemRole)
    const address = computed(() => user?.value?.Inhabitant?.household?.address)

    return {signIn, greeting, avatar, name, lastName, email, phone, birthDate, systemRole, address, loggedIn, user, session, clear, fetch}
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
