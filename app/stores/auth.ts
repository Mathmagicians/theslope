import type {UserDetail} from '~/composables/useCoreValidation'
import type {SenderEmitResult} from '~/composables/useNotificationValidation'
import {DEFAULT_NOTIFICATION_CHANNELS, readAppearance, type Appearance, type NotificationChannel, type UserPreferencesUpdate} from '~/composables/useUserPreferenceValidation'

export const useAuthStore = defineStore("Auth", () => {
    const {loggedIn, user: _user, session, clear, fetch} = useUserSession()
    const permissions = usePermissions()
    const {handleApiError} = useApiHandler()

    const user = computed(() => _user.value as UserDetail | null)

    const signIn = async (email: string, password: string) => {
        await $fetch("/api/auth/login", {
            method: "POST",
            body: {email, password}
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
        try {
            await $fetch('/api/user/preferences', {method: 'POST', body: update})
            await fetch()
            useToast().add({title: 'Indstillinger gemt', color: 'success'})
        } catch (error) {
            handleApiError(error, 'savePreferences')
            throw error
        }
    }

    /**
     * One test message to the user's own channels; a degraded result means the pipe is not set up here.
     * The toast carries `dedupeKey` — the id one grep finds in the producer log and the sender log.
     */
    const sendTestNotification = async (): Promise<SenderEmitResult> => {
        try {
            const result = await $fetch<SenderEmitResult>('/api/user/notifications/test', {method: 'POST'})
            useToast().add(result.degraded
                ? {title: 'Notifikationer er ikke sat op i dette miljø', description: result.dedupeKey, color: 'warning'}
                : {title: 'Testbesked afsendt – tjek din indbakke/telefon', description: result.dedupeKey, color: 'success'})
            return result
        } catch (error) {
            handleApiError(error, 'sendTestNotification')
            throw error
        }
    }

    return {signIn, greeting, avatar, name, lastName, email, phone, birthDate, inhabitantId, systemRoles, isAdmin, isAllergyManager, isMemberOfHousehold, address, notificationChannels, appearance, savePreferences, sendTestNotification, loggedIn, user, session, clear, fetch}
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
