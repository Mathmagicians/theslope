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
 * @template E - Type of existing items (used for delete array)
 * @template I - Type of incoming items (used for create/update/idempotent arrays)
 */
export interface PruneAndCreateResult<E, I = E> {
    create: I[]
    update: I[]
    idempotent: I[]
    delete: E[]
}

/**
 * Curried function to compare two arrays and categorize items into create/update/idempotent/delete
 *
 * @template E - Type of existing items (preserved in delete array)
 * @template I - Type of incoming items (used in create/update/idempotent arrays)
 * @template K - Type of the key used for comparison
 *
 * @param getKey - Extract unique key from existing item (E), also used for incoming if getIncomingKey not provided
 * @param isEqual - Compare existing item (E) with incoming item (I) for equality
 * @param getIncomingKey - Optional: Extract key from incoming item (I) when key location differs from E
 * @returns Curried function that takes existing (E[]) and incoming (I[]) arrays
 *
 * @example
 * ```ts
 * // Same types (E = I = TicketPrice)
 * const reconcileTicketPrices = pruneAndCreate<TicketPrice, TicketPrice, number>(
 *     tp => tp.id,
 *     (a, b) => a.price === b.price && a.ticketType === b.ticketType
 * )
 *
 * // Different types (E = OrderDisplay with id, I = OrderCreateWithPrice without id)
 * const reconcilePreBookings = pruneAndCreate<OrderDisplay, OrderCreateWithPrice, string>(
 *     (order) => `${order.inhabitantId}-${order.dinnerEventId}`,
 *     (existing, incoming) => existing.dinnerMode === incoming.dinnerMode
 * )
 * const result = reconcilePreBookings(existingOrders)(desiredOrders)
 * // result.delete is OrderDisplay[] (with id!)
 * // result.create is OrderCreateWithPrice[]
 *
 * // Different types with key in different locations - provide getIncomingKey
 * const reconcile = pruneAndCreate<Wrapper, Inner, number>(
 *     e => e.nested.externalId,
 *     (existing, incoming) => existing.name === incoming.name,
 *     i => i.externalId
 * )
 * ```
 */
export const pruneAndCreate = <E, I = E, K = number | string>(
    getKey: (item: E) => K | undefined,
    isEqual: (existing: E, incoming: I) => boolean = () => false,
    getIncomingKey?: (item: I) => K | undefined
) => (existing: E[]) => (incoming: I[]): PruneAndCreateResult<E, I> => {
    const getExistingKey = getKey
    const incomingKeyFn = getIncomingKey ?? (getKey as unknown as (item: I) => K | undefined)

    const existingByKey = existing.reduce(
        (map, item) => {
            const key = getExistingKey(item)
            return key !== undefined ? map.set(key, item) : map
        },
        new Map<K, E>()
    )

    const { result, seenKeys } = incoming.reduce(
        (acc, item) => {
            const key = incomingKeyFn(item)
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
        { result: { create: [], update: [], idempotent: [], delete: [] } as PruneAndCreateResult<E, I>, seenKeys: new Set<K>() }
    )

    return {
        ...result,
        delete: existing.filter(item => {
            const key = getExistingKey(item)
            return key !== undefined && !seenKeys.has(key)
        })
    }
}
