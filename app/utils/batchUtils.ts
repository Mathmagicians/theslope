/**
 * Generic curried chunk function
 * @param size - batch size
 * @returns function that chunks an array into batches of specified size
 */
export const chunkArray = <T>(size: number) => (arr: T[]): T[][] =>
    arr.reduce<T[][]>((chunks, item, i) =>
        i % size === 0
            ? [...chunks, [item]]
            : [...chunks.slice(0, -1), [...chunks[chunks.length - 1]!, item]]
    , [])

/**
 * Result of pruneAndCreate operation
 */
export interface PruneAndCreateResult<T> {
    create: T[]
    update: T[]
    idempotent: T[]
    delete: T[]
}

/**
 * Curried function to compare two arrays and categorize items into create/update/idempotent/delete
 *
 * @param getKey - Extract unique key from item (undefined = new item)
 * @param isEqual - Compare two items for equality (default: always false = always update)
 * @returns Curried function that takes existing and incoming arrays
 *
 * @example
 * ```ts
 * const reconcileTicketPrices = pruneAndCreate<TicketPrice, number>(
 *     tp => tp.id,
 *     (a, b) => a.price === b.price && a.ticketType === b.ticketType
 * )
 * const result = reconcileTicketPrices(existingPrices)(incomingPrices)
 * ```
 */
export const pruneAndCreate = <T, K = number | string>(
    getKey: (item: T) => K | undefined,
    isEqual: (existing: T, incoming: T) => boolean = () => false
) => (existing: T[]) => (incoming: T[]): PruneAndCreateResult<T> => {
    const existingByKey = existing.reduce(
        (map, item) => {
            const key = getKey(item)
            return key !== undefined ? map.set(key, item) : map
        },
        new Map<K, T>()
    )

    const { result, seenKeys } = incoming.reduce(
        (acc, item) => {
            const key = getKey(item)
            if (key === undefined) {
                return { ...acc, result: { ...acc.result, create: [...acc.result.create, item] } }
            }
            const existingItem = existingByKey.get(key)
            if (!existingItem) {
                return { ...acc, result: { ...acc.result, create: [...acc.result.create, item] } }
            }
            const newSeenKeys = acc.seenKeys.add(key)
            if (isEqual(existingItem, item)) {
                return { seenKeys: newSeenKeys, result: { ...acc.result, idempotent: [...acc.result.idempotent, item] } }
            }
            return { seenKeys: newSeenKeys, result: { ...acc.result, update: [...acc.result.update, item] } }
        },
        { result: { create: [], update: [], idempotent: [], delete: [] } as PruneAndCreateResult<T>, seenKeys: new Set<K>() }
    )

    return {
        ...result,
        delete: existing.filter(item => {
            const key = getKey(item)
            return key !== undefined && !seenKeys.has(key)
        })
    }
}
