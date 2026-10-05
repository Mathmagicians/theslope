type ApiError = { message?: string; statusCode?: number; statusMessage?: string; data?: unknown }

const isApiError = (error: unknown): error is ApiError => {
    if (typeof error !== 'object' || error === null) return false
    return 'statusCode' in error || 'status' in error
}

export type UncaughtApiErrorHandler = () => void

export interface UncaughtApiErrorActions {
    login: (redirect: string) => void
    toast: (error: unknown) => void
}

/**
 * The application's error floor (plugins/apiErrors.client.ts): picks the handler an uncaught
 * error gets. A dead session re-authenticates and returns in place (the login page follows
 * ?redirect, and its own 401s stay put), any other API error surfaces as the standard toast;
 * an error that is not an API response is not this floor's to handle (null).
 */
export const resolveUncaughtApiError = (
    error: unknown,
    route: {path: string, fullPath: string},
    actions: UncaughtApiErrorActions
): UncaughtApiErrorHandler | null => {
    if (!isApiError(error)) return null
    const statusCode = error.statusCode ?? (error as Record<string, unknown>).status
    if (statusCode === 401) {
        return route.path === '/login' ? null : () => actions.login(route.fullPath)
    }
    return () => actions.toast(error)
}

export const useApiHandler = () => {
    // Capture toast and route references during setup context
    const toast = useToast()
    const route = useRoute()

    const handleApiError = (error: ApiError | unknown, action: string, customMessage?: string): string => {
        // Extract serializable parts (FetchError is not a POJO)
        // FetchError may use 'status' instead of 'statusCode'
        const rawErr = error as Record<string, unknown>
        const err: ApiError = isApiError(error)
            ? { ...error, statusCode: error.statusCode ?? (rawErr.status as number) }
            : { message: String(error) }

        // ADR-004: Consistent CTX log format, no raw error objects
        const statusInfo = err.statusCode ? `${err.statusCode}` : 'unknown'
        const msgInfo = err.message ?? err.statusMessage ?? 'No message'
        console.error(`❌ > API_ERROR > [${action}] ${statusInfo}: ${msgInfo}`)
        let message: string

        if (customMessage) {
            message = customMessage
        } else {
            switch (err.statusCode) {
                case 400:
                    message = 'Ugyldig forespørgsel. Tjek venligst dine data'
                    break
                case 401:
                    message = 'Du er ikke autoriseret til at udføre denne handling'
                    break
                case 404:
                    message = 'Data blev ikke fundet'
                    break
                case 500:
                    message = 'Vi har desværre en intern server fejl'
                    break
                default:
                    message = 'Der opstod en uventet fejl'
            }
        }

        toast.add({
            icon: 'i-heroicons-exclamation-triangle',
            title: `${err.statusCode ?? 500}: Uh, åh, fejl kan ske`,
            description: message,
            duration: 10000,
            color: 'warning'
        })

        return message
    }

    const apiCall = async <T>(
        action: () => Promise<T>,
        state: Ref<string>,
        actionName: string
    ) => {
        const prevState = state.value
        state.value = 'loading'
        try {
            const result = await action()
            state.value = prevState
            return result
        } catch (e: unknown) {
            state.value = 'error'
            // A mid-session 401 re-authenticates and returns in place (the login page follows ?redirect)
            if (isApiError(e) && (e.statusCode === 401 || (e as Record<string, unknown>).status === 401) && route.path !== '/login') {
                await navigateTo({path: '/login', query: {redirect: route.fullPath}})
            }
            throw new Error(handleApiError(e, actionName), {cause: e})
        }
    }

    return {
        apiCall,
        handleApiError
    }
}
