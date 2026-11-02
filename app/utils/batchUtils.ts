import {z} from 'zod'

/**
 * Generic curried chunk function
 * @param size - batch size
 * @returns function that chunks an array into batches of specified size
 */
export const chunkArray = <T>(size: number) => (arr: T[]): T[][] =>
    Array.from({length: Math.ceil(arr.length / size)}, (_, i) => arr.slice(i * size, (i + 1) * size))

/** A list of one item at least: a group of groupBy holds the item that opened it */
export type NonEmpty<T> = [T, ...T[]]

/**
 * Curried groupBy utility - groups array items by a key function
 * Used for batch operations that need to group by update signature
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
    (items: T[]): Map<K, NonEmpty<T>> =>
        items.reduce((map, item) => {
            const key = getKey(item)
            const group = map.get(key)
            if (group) group.push(item)
            else map.set(key, [item])
            return map
        }, new Map<K, NonEmpty<T>>())

/** Lines from rows: the rows with one key make one line, the lines in the given order */
export const linesBy = <Row, Line, Key extends string | number>(
    keyOf: (row: Row) => Key,
    toLine: (rows: NonEmpty<Row>, key: Key) => Line,
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

// The key of an item, undefined when it has none: such an incoming item is created, such an existing one stays
type KeyOf<T, K> = (item: T) => K | undefined
type Reconciler<E, I> = (existing: E[]) => (incoming: I[]) => PruneAndCreateResult<E, I>

// The reconciliation by a key for each side
const reconcileByKeys = <E, I, K>(
    getExistingKey: KeyOf<E, K>,
    getIncomingKey: KeyOf<I, K>,
    isEqual: (existing: E, incoming: I) => boolean
): Reconciler<E, I> => (existing) => (incoming) => {
    const existingByKey = existing.reduce(
        (map, item) => {
            const key = getExistingKey(item)
            return key !== undefined ? map.set(key, item) : map
        },
        new Map<K, E>()
    )

    const { result, seenKeys } = incoming.reduce<{result: PruneAndCreateResult<E, I>, seenKeys: Set<K>}>(
        (acc, item) => {
            const key = getIncomingKey(item)
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
        { result: { create: [], update: [], idempotent: [], delete: [] }, seenKeys: new Set<K>() }
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
 * Curried function to compare two arrays and categorize items into create/update/idempotent/delete
 *
 * @template E - Type of existing items (preserved in delete array)
 * @template I - Type of incoming items (used in create/update/idempotent arrays)
 * @template K - Type of the key used for comparison
 *
 * @param getKey - The unique key of an item: without getIncomingKey it reads both sides, so it takes E and I
 * @param isEqual - Compare existing item (E) with incoming item (I) for equality
 * @param getIncomingKey - The key of an incoming item (I) where it lives elsewhere than on an existing one; getKey then reads E alone
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
 * // Different types (E = OrderDisplay with id, I = OrderCreateWithPrice without id): one key reads both
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
export function pruneAndCreate<E, I = E, K = number | string>(
    getKey: KeyOf<E | I, K>,
    isEqual?: (existing: E, incoming: I) => boolean
): Reconciler<E, I>
export function pruneAndCreate<E, I, K = number | string>(
    getKey: KeyOf<E, K>,
    isEqual: (existing: E, incoming: I) => boolean,
    getIncomingKey: KeyOf<I, K>
): Reconciler<E, I>
export function pruneAndCreate<E, I, K>(
    ...args: [KeyOf<E | I, K>, ((existing: E, incoming: I) => boolean)?] | [KeyOf<E, K>, (existing: E, incoming: I) => boolean, KeyOf<I, K>]
): Reconciler<E, I> {
    const isEqual = args[1] ?? (() => false)
    return args.length === 3 ? reconcileByKeys(args[0], args[2], isEqual) : reconcileByKeys(args[0], args[0], isEqual)
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
