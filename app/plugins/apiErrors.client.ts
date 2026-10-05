import {resolveUncaughtApiError, useApiHandler, type UncaughtApiErrorActions} from '~/composables/useApiHandler'

/**
 * The application's error floor: no API failure is ever silent. Uncaught rejections and
 * errors escaping component handlers funnel into resolveUncaughtApiError, which hands back
 * the handler to run - re-login for a dead session, the standard toast for the rest.
 * Stores keep their own catch + toast; this floor owns what escapes them.
 */
export default defineNuxtPlugin((nuxtApp) => {
    const actions: UncaughtApiErrorActions = {
        login: (redirect) => void nuxtApp.runWithContext(() => navigateTo({path: '/login', query: {redirect}})),
        toast: (error) => void nuxtApp.runWithContext(() => useApiHandler().handleApiError(error, 'uncaught'))
    }

    const handle = (error: unknown): boolean => {
        const handler = resolveUncaughtApiError(error, useRouter().currentRoute.value, actions)
        if (!handler) return false
        handler()
        return true
    }

    window.addEventListener('unhandledrejection', (event) => {
        if (handle(event.reason)) event.preventDefault()
    })
    nuxtApp.hook('vue:error', (error) => {
        handle(error)
    })
})
