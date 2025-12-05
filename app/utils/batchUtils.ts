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
