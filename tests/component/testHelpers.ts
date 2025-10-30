import { nextTick } from 'vue'

/**
 * Generic polling function for component tests
 * Repeatedly checks condition until it returns true or max attempts reached
 *
 * @param condition - Function that checks if condition is met
 * @param maxAttempts - Maximum number of polling attempts (default: 20)
 * @returns void when condition is met
 *
 * @example
 * await pollFor(() => store.isPlanStoreReady)
 * await pollFor(() => store.isSeasonsInitialized, 10)
 */
export async function pollFor(
    condition: () => boolean,
    maxAttempts: number = 20,
    shouldFail: boolean = true
): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await nextTick()
        if (condition()) {
            return
        }
    }

    if( shouldFail) throw new Error(`Condition not met after ${maxAttempts} attempts`)
}
