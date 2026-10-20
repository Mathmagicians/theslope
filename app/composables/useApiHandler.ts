import type {AsyncData, AsyncDataOptions, NuxtApp, NuxtError} from '#app'
import type {NitroFetchOptions, NitroFetchRequest} from 'nitropack/types'
import type {ZodType} from 'zod'
import type {Router} from 'vue-router'

type ApiError = { message?: string; statusCode?: number; statusMessage?: string; data?: unknown }

type ResponseSchema<T> = ZodType<T>

/** ADR-007: initialized means loaded with data, not only a settled request */
export type DatasetFlags = {
    isLoading: ComputedRef<boolean>
    isErrored: ComputedRef<boolean>
    isInitialized: ComputedRef<boolean>
}

export type StoreDataset<T> = AsyncData<T, NuxtError | undefined> & DatasetFlags

type JobStat = { label: string; value: string }

type JobOptions<T> = {
    url: string
    method?: 'GET' | 'POST'
    /** Read when the job runs */
    query?: () => Record<string, string>
    schema?: ResponseSchema<T>
    action: string
    errorMessage: string
    formatStats: (result: T) => JobStat[]
    /** The success toast's title */
    title: string
    /** Prefix of the completion log line */
    log: string
    /** Runs before the success toast, so the toast reports refreshed state */
    onSuccess?: () => Promise<unknown>
}

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
type NotFound = {
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

// Internal API routes only: the typed fetch pins baseURL to '' for them, so the option is not offered
type ApiRequestOptions<T> = Omit<NitroFetchOptions<NitroFetchRequest>, 'baseURL'> & {
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

type ApiErrorHandler = () => void

interface ApiErrorActions {
    login: (redirect: string) => void
    toast: (error: ApiError) => void
}

/**
 * The one decision for an API error, taken by handleApiError for every store read and write and by
 * plugins/apiErrors.client.ts for what escapes component code. A dead session re-authenticates and
 * returns in place (the login page follows ?redirect); on the login page itself a 401 is the sign-in's
 * own failure and toasts. Any other API error surfaces as the standard toast; an error that is not an
 * API response is not decided here (null).
 */
export const resolveApiError = (
    error: unknown,
    route: {path: string, fullPath: string},
    actions: ApiErrorActions
): ApiErrorHandler | null => {
    if (!isApiError(error)) return null
    if (statusCodeOf(error) === 401 && route.path !== '/login') return () => actions.login(route.fullPath)
    return () => actions.toast(error)
}

/**
 * The login page loads fresh, with the dead session's app state gone, and no URL write of the dying page can
 * cancel the leave the way it cancels a router push. Every failing dataset calls this; the browser takes one load
 */
const leaveForLogin = (redirect: string, action: string) => {
    if (import.meta.server) return
    console.warn(`🔒 > API_ERROR > [${action}] 401: re-authenticating, returning to ${redirect}`)
    reloadNuxtApp({path: `/login?redirect=${encodeURIComponent(redirect)}`, force: true})
}

// While a navigation is in flight, the page the user is heading to: a dead session met on the way returns there
let heading: {path: string, fullPath: string} | null = null
let tracking = false
const trackNavigation = (router: Router) => {
    if (tracking || import.meta.server) return
    tracking = true
    router.beforeEach((to) => { heading = {path: to.path, fullPath: to.fullPath} })
    router.afterEach((to, _from, failure) => {
        if (!failure || heading?.fullPath === to.fullPath) heading = null
    })
}

export const useApiHandler = () => {
    // Captured in the setup context: the request fetch forwards the session cookie during SSR
    const toast = useToast()
    const requestFetch = useRequestFetch()
    const router = useRouter()
    trackNavigation(router)
    const routeNow = () => heading ?? router.currentRoute.value

    const toastApiError = (err: ApiError, action: string, customMessage?: string): void => {
        const message = customMessage || (() => {
            switch (err.statusCode) {
                case 400:
                    return 'Ugyldig forespørgsel. Tjek venligst dine data'
                case 401:
                    return 'Du er ikke autoriseret til at udføre denne handling'
                case 404:
                    return NOT_FOUND_TEXT
                case 500:
                    return 'Vi har desværre en intern server fejl'
                default:
                    return 'Der opstod en uventet fejl'
            }
        })()

        // ADR-004: Consistent CTX log format, no raw error objects
        const statusInfo = err.statusCode ? `${err.statusCode}` : 'unknown'
        console.error(`❌ > API_ERROR > [${action}] ${statusInfo}: ${err.message || err.statusMessage || message}`)

        warnToast(`${err.statusCode ?? 500}: Uh, åh, fejl kan ske`, message)
    }

    const actionsFor = (action: string, customMessage?: string): ApiErrorActions => ({
        login: (redirect) => leaveForLogin(redirect, action),
        // Serializable parts only (FetchError is not a POJO)
        toast: (error) => toastApiError({...error, statusCode: statusCodeOf(error)}, action, customMessage)
    })

    /** Every failure of a store read or write: the resolver's handler, or the standard toast for an error that is not an API response */
    const handleApiError = (error: unknown, action: string, customMessage?: string): void => {
        const handler = resolveApiError(error, routeNow(), actionsFor(action, customMessage))
            ?? (() => toastApiError({message: String(error)}, action, customMessage))
        handler()
    }

    /** What escapes component code (plugins/apiErrors.client.ts): an API error runs its handler; anything else is not ours */
    const handleUncaughtError = (error: unknown): boolean => {
        const handler = resolveApiError(error, routeNow(), actionsFor('uncaught'))
        handler?.()
        return handler !== null
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
    ): StoreDataset<T> => {
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
            warnToast(resolveText(toastText) ?? NOT_FOUND_TEXT)
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
        // Assigned onto the thenable useAsyncData returns, so a dataset still awaits in `dependsOn`
        return Object.assign(asyncData, {
            isLoading: computed(() => asyncData.status.value === 'pending'),
            isErrored: computed(() => asyncData.status.value === 'error'),
            isInitialized: computed(() => asyncData.status.value === 'success' && asyncData.data.value !== null)
        })
    }

    /** A store's load action: refreshes the dataset, rethrows its error, logs `loaded` (read after the refresh) */
    const loadOrThrow = async (
        {refresh, error}: Pick<AsyncData<unknown, unknown>, 'refresh' | 'error'>,
        loaded: Text
    ): Promise<void> => {
        await refresh()
        if (error.value) throw error.value
        console.info(resolveText(loaded))
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
            const response: unknown = await requestFetch(url, fetchOptions)
            return schema ? schema.parse(response) : response as T
        } catch (error) {
            handleApiError(error, action, errorMessage)
            throw error
        }
    }

    /** Reports a write `apiRequest` resolved; `ui` styles a description the write words in lines */
    const toastSaved = (title: string, description?: string, ui?: {description: string}) =>
        toast.add({title, description, icon: ICONS.checkCircle, color: COLOR.success, ui})
    /** The warning toast of a failed request stays ten seconds */
    const warnToast = (title: string, description?: string) =>
        toast.add({title, description, icon: ICONS.warning, color: COLOR.warning, duration: 10000})

    /** A `notFound.toast` naming the gone entity by its shortName, by its id once the list has dropped it */
    const notFoundToast = (
        list: MaybeRefOrGetter<{ id?: number; shortName: string }[]>,
        id: MaybeRefOrGetter<number | null>,
        noun: string
    ) => () => {
        const goneId = toValue(id)
        return `Kan ikke finde ${noun} ${toValue(list).find(item => item.id === goneId)?.shortName ?? goneId}`
    }

    /**
     * An admin job: one request, its result and error held in refs, the stats logged and toasted on success.
     * `run` rethrows a failure after recording it; apiRequest has already toasted it.
     */
    const runJob = <T>({url, method, query, schema, action, errorMessage, formatStats, title, log, onSuccess}: JobOptions<T>) => {
        const result = ref<T | null>(null) as Ref<T | null>
        const error = ref<Error | null>(null)
        const isRunning = ref(false)

        const run = async (): Promise<T> => {
            isRunning.value = true
            error.value = null
            let response: T
            try {
                response = await apiRequest<T>(url, {method, query: query?.(), schema, action, errorMessage})
                result.value = response
            } catch (failure) {
                result.value = null
                error.value = failure as Error
                throw failure
            } finally {
                isRunning.value = false
            }
            const description = formatStats(response).map(s => `${s.label}: ${s.value}`).join(', ')
            console.info(`${log} ${description}`)
            await onSuccess?.()
            toastSaved(title, description)
            return response
        }

        return {result, error, isRunning, run}
    }

    return {
        storeAsyncData,
        loadOrThrow,
        apiRequest,
        toastSaved,
        notFoundToast,
        runJob,
        handleApiError,
        handleUncaughtError
    }
}
