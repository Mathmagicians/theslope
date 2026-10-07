import type {AsyncData, AsyncDataOptions, NuxtError} from '#app'
import type {NitroFetchOptions, NitroFetchRequest} from 'nitropack/types'
import type {ZodType, ZodTypeDef} from 'zod'

type ApiError = { message?: string; statusCode?: number; statusMessage?: string; data?: unknown }

type ResponseSchema<T> = ZodType<T, ZodTypeDef, unknown>

export type StoreAsyncDataOptions<T> = Omit<AsyncDataOptions<unknown, T>, 'default' | 'transform' | 'pick'> & {
    schema: ResponseSchema<T>
    default: () => T
    errorMessage?: string
    /** Datasets the url reads; the fetch resolves its url and its gate once they have loaded */
    dependsOn?: PromiseLike<unknown>[]
}

export type ApiRequestOptions<T> = NitroFetchOptions<NitroFetchRequest> & {
    action: string
    errorMessage?: string
    schema?: ResponseSchema<T>
}

const gateClosed = () => new DOMException('The dataset gate closed', 'AbortError')

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
    // Captured in the setup context: the request fetch forwards the session cookie during SSR
    const toast = useToast()
    const requestFetch = useRequestFetch()

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

    /**
     * A store read: useAsyncData over the request fetch, the response parsed by `schema`, so the
     * slice's type is the schema's output. `enabled` gates the request; a closed gate reads idle with the
     * default. The dataset refetches when its url changes or its gate opens.
     */
    const storeAsyncData = <T>(
        key: MaybeRefOrGetter<string>,
        url: MaybeRefOrGetter<string>,
        {schema, default: defaultValue, errorMessage, dependsOn = [], enabled, watch: sources = [], ...options}: StoreAsyncDataOptions<T>
    ): AsyncData<T, NuxtError | undefined> => {
        const surface = (error: unknown): never => {
            handleApiError(error, toValue(key), errorMessage)
            throw error
        }
        const isOpen = () => toValue(enabled ?? true)
        const asyncData = useAsyncData(key, async (_nuxtApp, {signal}) => {
            // Yields once even without dependencies: a gate the caller opens right after creating the store
            // counts on the server, where no watcher runs
            await Promise.all(dependsOn)
            if (!isOpen()) throw gateClosed()
            try {
                return await requestFetch<unknown>(toValue(url), {signal})
            } catch (error) {
                // A superseded request is cancelled, not failed
                if (signal.aborted) throw error
                return surface(error)
            }
        }, {
            ...options,
            // On the server the fetcher reads the gate, after the dependencies
            enabled: import.meta.server ? true : enabled,
            // Nuxt's enabled watcher only cancels; opening the gate fetches through this watch
            watch: [...sources, () => toValue(url), isOpen],
            default: defaultValue,
            transform: (data: unknown) => {
                try {
                    return schema.parse(data)
                } catch (error) {
                    return surface(error)
                }
            }
        }) as AsyncData<T, NuxtError | undefined>
        // A closing gate keeps the data, and a key swap seeds the new key with the old key's data
        if (enabled !== undefined) {
            watch(() => toValue(enabled), (isEnabled) => {
                if (!isEnabled) asyncData.clear()
            })
        }
        return asyncData
    }

    /**
     * A mutation, or a one-shot read outside a store slice: the response parsed by `schema` when
     * given; a failure toasts and rethrows.
     */
    const apiRequest = async <T = unknown>(
        url: string,
        {action, errorMessage, schema, ...fetchOptions}: ApiRequestOptions<T>
    ): Promise<T> => {
        try {
            const response = await requestFetch<unknown>(url, fetchOptions)
            return schema ? schema.parse(response) : response as T
        } catch (error) {
            handleApiError(error, action, errorMessage)
            throw error
        }
    }

    return {
        storeAsyncData,
        apiRequest,
        handleApiError
    }
}
