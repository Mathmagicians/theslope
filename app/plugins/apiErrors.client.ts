import {useApiHandler} from '~/composables/useApiHandler'

/**
 * The application's error floor: no API failure is ever silent. Uncaught rejections and errors
 * escaping component handlers go to useApiHandler's resolver, the same decision every store read
 * and write takes: re-login for a dead session, the standard toast for the rest. Stores catch their
 * own through handleApiError; this floor owns what escapes them.
 */
export default defineNuxtPlugin((nuxtApp) => {
    // runWithContext runs a synchronous callback in place, so the verdict is set on return
    const handle = (error: unknown): boolean => {
        let handled = false
        nuxtApp.runWithContext(() => { handled = useApiHandler().handleUncaughtError(error) })
        return handled
    }

    window.addEventListener('unhandledrejection', (event) => {
        if (handle(event.reason)) event.preventDefault()
    })
    nuxtApp.hook('vue:error', (error) => {
        handle(error)
    })
})
