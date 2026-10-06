import type {UserDetail} from '~/composables/useCoreValidation'
import type {SenderEmitResult} from '~/composables/useNotificationValidation'
import {DEFAULT_NOTIFICATION_CHANNELS, readAppearance, type Appearance, type NotificationChannel, type UserPreferencesUpdate} from '~/composables/useUserPreferenceValidation'

/** The toast and the login form both show it when a sign-in fails */
export const LOGIN_FAILED_MESSAGE = 'Vi kunne ikke logge dig på, prøv igen. Du skal bruge dit Heynabo brugernavn og password.'

export const useAuthStore = defineStore("Auth", () => {
    const {loggedIn, user: _user, session, clear, fetch} = useUserSession()
    const permissions = usePermissions()
    const {apiRequest} = useApiHandler()

    const user = computed(() => _user.value as UserDetail | null)

    const signIn = async (email: string, password: string) => {
        await apiRequest('/api/auth/login', {
            method: 'POST',
            body: {email, password},
            action: 'login',
            errorMessage: LOGIN_FAILED_MESSAGE
        })
        await fetch()
    }

    const greeting = computed(() => user.value?.Inhabitant?.name || 'Ukendt bruger')

    const inhabitantId = computed(() => user.value?.Inhabitant?.id ?? null)
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
    // Session-aware predicate lives here, not in usePermissions (isomorphic, ADR-017)
    const isMemberOfHousehold = (householdId: number) => user.value ? permissions.isInHousehold(user.value, householdId) : false

    // A session snapshot written before the columns existed carries neither key: fall back to the
    // column defaults, never to "nothing" - an explicit empty array is a real choice and survives
    const notificationChannels = computed<NotificationChannel[]>(() => user.value?.notificationChannels ?? DEFAULT_NOTIFICATION_CHANNELS)
    const appearance = computed<Appearance>(() => readAppearance(user.value?.appearance))

    /**
     * Save the user's own channels and appearance, then refresh the session so the new
     * appearance reaches the layout's html attributes on the next render.
     */
    const savePreferences = async (update: UserPreferencesUpdate) => {
        await apiRequest('/api/user/preferences', {method: 'POST', body: update, action: 'savePreferences'})
        await fetch()
        useToast().add({title: 'Indstillinger gemt', color: 'success'})
    }

    /**
     * One test message to the user's own channels; a degraded result means the pipe is not set up here.
     * The toast carries `dedupeKey` — the id one grep finds in the producer log and the sender log.
     */
    const sendTestNotification = async (): Promise<SenderEmitResult> => {
        const result = await apiRequest<SenderEmitResult>('/api/user/notifications/test', {method: 'POST', action: 'sendTestNotification'})
        useToast().add(result.degraded
            ? {title: 'Notifikationer er ikke sat op i dette miljø', description: result.dedupeKey, color: 'warning'}
            : {title: 'Testbesked afsendt – tjek din indbakke/telefon', description: result.dedupeKey, color: 'success'})
        return result
    }

    return {signIn, greeting, avatar, name, lastName, email, phone, birthDate, inhabitantId, systemRoles, isAdmin, isAllergyManager, isMemberOfHousehold, address, notificationChannels, appearance, savePreferences, sendTestNotification, loggedIn, user, session, clear, fetch}
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
