import {z} from 'zod'

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
 * Curried groupBy utility - groups array items by a key function
 * ADR-014: Used for batch operations that need to group by update signature
 *
 * @param getKey - Function to extract grouping key from item
 * @returns Curried function that groups items into a Map by key
 *
 * @example
 * ```ts
 * const groupByState = groupBy<Order, string>(o => o.state)
 * const groups = groupByState(orders)
 * // Map { 'BOOKED' => [...], 'RELEASED' => [...] }
 * ```
 */
export const groupBy = <T, K extends string | number>(getKey: (item: T) => K) =>
    (items: T[]): Map<K, T[]> =>
        items.reduce((map, item) => {
            const key = getKey(item)
            const group = map.get(key)
            if (group) group.push(item)
            else map.set(key, [item])
            return map
        }, new Map<K, T[]>())

/** Lines from rows: the rows with one key make one line, the lines in the given order */
export const linesBy = <Row, Line, Key extends string | number>(
    keyOf: (row: Row) => Key,
    toLine: (rows: Row[], key: Key) => Line,
    order: (a: Line, b: Line) => number
) => (rows: Row[]): Line[] =>
    Array.from(groupBy(keyOf)(rows), ([key, group]) => toLine(group, key)).sort(order)

/** Splits a list by a predicate: the items that match, then the rest */
export const partition = <T>(predicate: (item: T) => boolean) => (items: T[]): [T[], T[]] =>
    [items.filter(predicate), items.filter(item => !predicate(item))]

// The reconciler's buckets; the order buckets extend them
export const ReconciliationBucketSchema = z.enum(['create', 'update', 'idempotent', 'delete'])
export type ReconciliationBucket = z.infer<typeof ReconciliationBucketSchema>

/**
 * Result of pruneAndCreate operation
 * @template E - Type of existing items (used for delete array)
 * @template I - Type of incoming items (used for create/update/idempotent arrays)
 */
export type PruneAndCreateResult<E, I = E> = {
    [Bucket in ReconciliationBucket]: Bucket extends typeof ReconciliationBucketSchema.enum.delete ? E[] : I[]
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

/**
 * Writes a batch in one call; when the call fails, writes the items one at a time so a single failing item costs only
 * itself. Each item lands in onDone or onFailed.
 */
export const writeBatchOrEach = async <T>(
    items: T[],
    write: (batch: T[]) => Promise<unknown>,
    onDone: (items: T[]) => void,
    onFailed: (item: T, error: unknown) => void
): Promise<void> => {
    if (items.length === 0) return
    try {
        await write(items)
        onDone(items)
    } catch {
        for (const item of items) {
            try {
                await write([item])
                onDone([item])
            } catch (error) {
                onFailed(item, error)
            }
        }
    }
}

/**
 * Writes a batch in one attempt: when the call fails, every item of the batch lands in onFailed with its error and
 * nothing is written again
 */
export const writeBatchOnce = async <T>(
    items: T[],
    write: (batch: T[]) => Promise<unknown>,
    onDone: (items: T[]) => void,
    onFailed: (item: T, error: unknown) => void
): Promise<void> => {
    if (items.length === 0) return
    try {
        await write(items)
    } catch (error) {
        for (const item of items) onFailed(item, error)
        return
    }
    onDone(items)
}
