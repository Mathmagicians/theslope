import type {WritableComputedRef, ComputedRef} from 'vue'

export interface UseQueryParamOptions<T> {
  serialize?: (value: T) => string
  deserialize?: (value: string) => T | null
  validate?: (value: T) => boolean
  normalize?: (invalid: T | null) => T | null
  defaultValue: T | (() => T)
  preserveOtherParams?: boolean
  replaceHistory?: boolean
}

/**
 * Generic composable for managing URL query parameters with type safety
 *
 * @template T - The value type for the query parameter
 * @param key - Query parameter name (e.g., 'mode', 'season', 'date')
 * @param options - Configuration options
 * @returns Reactive query parameter with two-way binding
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

  return {
    value,
    setValue,
    needsSync
  }
}
