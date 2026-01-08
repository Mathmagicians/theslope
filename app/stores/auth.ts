import type {UserDetail} from '~/composables/useCoreValidation'

export const useAuthStore = defineStore("Auth", () => {
    const {loggedIn, user: _user, session, clear, fetch} = useUserSession()
    const permissions = usePermissions()

    const user = computed(() => _user.value as UserDetail | null)

    const signIn = async (email: string, password: string) => {
        await $fetch("/api/auth/login", {
            method: "POST",
            body: {email, password}
        })
        await fetch()
    }

    const greeting = computed(() => user.value?.Inhabitant?.name || 'Ukendt bruger')

    const avatar = computed(() => user.value?.Inhabitant?.pictureUrl)
    const name = computed(() => user.value?.Inhabitant?.name)
    const lastName = computed(() => user.value?.Inhabitant?.lastName)
    const email = computed(() => user.value?.email)
    const phone = computed(() => user.value?.phone)
    const birthDate = computed(() => user.value?.Inhabitant?.birthDate)
    const systemRoles = computed(() => user.value?.systemRoles ?? [])
    const isAdmin = computed(() => user.value ? permissions.isAdmin(user.value) : false)
    const isAllergyManager = computed(() => user.value ? permissions.isAllergyManager(user.value) : false)
    const address = computed(() => user.value?.Inhabitant?.household?.address)

    return {signIn, greeting, avatar, name, lastName, email, phone, birthDate, systemRoles, isAdmin, isAllergyManager, address, loggedIn, user, session, clear, fetch}
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
