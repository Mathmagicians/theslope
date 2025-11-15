import type {WritableComputedRef, ComputedRef} from 'vue'

export interface UseQueryParamOptions<T> {
  serialize?: (value: T) => string
  deserialize?: (value: string) => T | null
  validate?: (value: T) => boolean
  normalize?: (invalid: T | null) => T | null
  defaultValue: T | (() => T)
  preserveOtherParams?: boolean
  replaceHistory?: boolean

  /**
   * Condition function that must return true before auto-sync occurs.
   * Use this to wait for required data (e.g., store ready, data loaded).
   *
   * @example
   * syncWhen: () => store.isReady && items.value.length > 0
   */
  syncWhen?: () => boolean
}

/**
 * Generic composable for managing URL query parameters with type safety and auto-sync
 *
 * Auto-sync is ALWAYS enabled - the URL will automatically sync to valid values.
 * Use `syncWhen` option to control WHEN sync occurs (e.g., wait for data to load).
 *
 * @template T - The value type for the query parameter
 * @param key - Query parameter name (e.g., 'mode', 'season', 'date')
 * @param options - Configuration options
 * @returns Reactive query parameter with automatic URL synchronization
 *
 * @example
 * // Simple auto-sync (no wait condition)
 * const {value: mode} = useQueryParam('mode', {
 *   defaultValue: 'view'
 * })
 *
 * @example
 * // Auto-sync with data dependency
 * const {value: date} = useQueryParam('date', {
 *   serialize: formatDate,
 *   deserialize: parseDate,
 *   defaultValue: () => new Date(),
 *   syncWhen: () => store.isReady && events.value.length > 0
 * })
 */
export function useQueryParam<T>(
  key: string,
  options: UseQueryParamOptions<T>
) {
  const route = useRoute()

  const serialize = options.serialize ?? ((v: T) => String(v))
  const deserialize = options.deserialize ?? ((s: string) => s as T)
  const validate = options.validate ?? (() => true)
  const preserveOtherParams = options.preserveOtherParams ?? true
  const replaceHistory = options.replaceHistory ?? true
  const syncWhen = options.syncWhen ?? (() => true)

  const getDefault = (): T => {
    return typeof options.defaultValue === 'function'
      ? (options.defaultValue as () => T)()
      : options.defaultValue
  }

  const readFromQuery = (): T => {
    const queryValue = route.query[key] as string | undefined

    if (queryValue === undefined) {
      if (options.normalize) {
        const normalized = options.normalize(null)
        return normalized !== null ? normalized : getDefault()
      }
      return getDefault()
    }

    const deserialized = deserialize(queryValue)

    if (deserialized === null || !validate(deserialized)) {
      if (options.normalize) {
        const normalized = options.normalize(deserialized)
        return normalized !== null ? normalized : getDefault()
      }
      return getDefault()
    }

    return deserialized
  }

  const updateURL = async (newValue: T) => {
    const serialized = serialize(newValue)
    const currentQueryValue = route.query[key] as string | undefined

    if (currentQueryValue === serialized) return

    const query = preserveOtherParams ? {...route.query} : {}

    // If normalize returns null, remove the query param
    if (options.normalize) {
      const normalized = options.normalize(newValue as any)
      if (normalized === null) {
        delete query[key]
      } else {
        query[key] = serialized
      }
    } else {
      query[key] = serialized
    }

    await navigateTo(
      {path: route.path, query},
      {replace: replaceHistory}
    )
  }

  const value = computed<T>({
    get: () => readFromQuery(),
    set: (newValue: T) => {
      updateURL(newValue)
    }
  })

  const setValue = async (newValue: T) => {
    await updateURL(newValue)
  }

  const needsSync = computed(() => {
    const queryValue = route.query[key] as string | undefined
    const currentValue = value.value
    const serialized = serialize(currentValue)
    return queryValue !== serialized
  })

  // AUTO-SYNC: Automatically sync URL when needed and conditions are met
  watchPostEffect(() => {
    if (syncWhen() && needsSync.value) {
      setValue(value.value)
      console.info(`🔗 > Auto-synced query param '${key}' to:`, value.value)
    }
  })

  return {
    value,
    setValue,
    needsSync
  }
}
