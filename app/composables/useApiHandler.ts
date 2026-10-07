import type {AsyncData, AsyncDataOptions, NuxtApp, NuxtError} from '#app'
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
    notFound?: NotFound
}

type Text = string | (() => string)

/**
 * A 404 on a url derived from a selection: `recover` drops the selection so the url re-derives, and the
 * re-derived url is requested once; after `retries` consecutive 404s the error page shows `message`
 */
export type NotFound = {
    recover?: () => void | Promise<void>
    /** Default 1; 0 shows the error page on the first 404 */
    retries?: number
    /** Shown on a recovery attempt */
    toast?: Text
    /** The error page text; defaults to the toast */
    message?: Text
}

const NOT_FOUND_TEXT = 'Kan ikke finde det, du leder efter'

const resolveText = (text: Text | undefined) => typeof text === 'function' ? text() : text

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

// FetchError may use 'status' instead of 'statusCode'
const statusCodeOf = (error: unknown): number | undefined => isApiError(error)
    ? error.statusCode ?? (error as Record<string, unknown>).status as number | undefined
    : undefined

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
    if (statusCodeOf(error) === 401) {
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
        const err: ApiError = isApiError(error)
            ? { ...error, statusCode: statusCodeOf(error) }
            : { message: String(error) }

        const message = customMessage || (() => {
            switch (err.statusCode) {
                case 400:
                    return 'Ugyldig forespørgsel. Tjek venligst dine data'
                case 401:
                    return 'Du er ikke autoriseret til at udføre denne handling'
                case 404:
                    return 'Kan ikke finde det, du leder efter'
                case 500:
                    return 'Vi har desværre en intern server fejl'
                default:
                    return 'Der opstod en uventet fejl'
            }
        })()

        // ADR-004: Consistent CTX log format, no raw error objects
        const statusInfo = err.statusCode ? `${err.statusCode}` : 'unknown'
        console.error(`❌ > API_ERROR > [${action}] ${statusInfo}: ${err.message || err.statusMessage || message}`)

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
        {schema, default: defaultValue, errorMessage, dependsOn = [], enabled, watch: sources = [], notFound, ...options}: StoreAsyncDataOptions<T>
    ): AsyncData<T, NuxtError | undefined> => {
        const surface = (error: unknown): never => {
            handleApiError(error, toValue(key), toValue(errorMessage))
            throw error
        }
        const isOpen = () => toValue(enabled ?? true)
        // As Nuxt's own enabled watcher does: Nuxt answers an abort of the pending request with that
        // same request, a promise that then waits on itself and never settles the render
        const endIdle = (nuxtApp: NuxtApp): never => {
            const currentKey = toValue(key)
            Reflect.deleteProperty(nuxtApp._asyncDataPromises, currentKey)
            const entry = nuxtApp._asyncData[currentKey]
            if (entry) entry.status.value = 'idle'
            throw gateClosed()
        }

        let consecutiveNotFound = 0
        const recoverFromNotFound = async (
            nuxtApp: NuxtApp, signal: AbortSignal, requestUrl: string, {recover = () => {}, retries = 1, toast: toastText, message}: NotFound
        ): Promise<unknown> => {
            if (consecutiveNotFound >= retries) {
                consecutiveNotFound = 0
                if (retries === 0) await recover()
                throw showError({statusCode: 404, message: resolveText(message) ?? resolveText(toastText) ?? NOT_FOUND_TEXT})
            }
            consecutiveNotFound++
            console.warn(`🔎 > API_NOT_FOUND > [${toValue(key)}] ${requestUrl}: recovering (${consecutiveNotFound}/${retries})`)
            toast.add({
                icon: 'i-heroicons-exclamation-triangle',
                title: resolveText(toastText) ?? NOT_FOUND_TEXT,
                duration: 10000,
                color: 'warning'
            })
            await recover()
            // The url watch has already issued the re-derived request
            if (signal.aborted) throw gateClosed()
            // No watcher runs on the server, so the re-derived url is requested here
            if (import.meta.server && isOpen() && toValue(url) !== requestUrl) return load(nuxtApp, signal)
            return endIdle(nuxtApp)
        }

        const load = async (nuxtApp: NuxtApp, signal: AbortSignal): Promise<unknown> => {
            const requestUrl = toValue(url)
            try {
                const response = await requestFetch<unknown>(requestUrl, {signal})
                consecutiveNotFound = 0
                return response
            } catch (error) {
                // A superseded request is cancelled, not failed
                if (signal.aborted) throw error
                if (notFound && statusCodeOf(error) === 404) return recoverFromNotFound(nuxtApp, signal, requestUrl, notFound)
                return surface(error)
            }
        }

        const asyncData = useAsyncData(key, async (nuxtApp, {signal}) => {
            // Yields once even without dependencies: a gate the caller opens right after creating the store
            // counts on the server, where no watcher runs
            await Promise.all(dependsOn)
            if (!isOpen()) return endIdle(nuxtApp)
            return load(nuxtApp, signal)
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
