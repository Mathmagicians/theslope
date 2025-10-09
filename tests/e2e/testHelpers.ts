import type {Browser} from "@playwright/test"
import {authFiles} from './config'
const { adminFile } = authFiles

const salt = (base: string, testSalt: string = Date.now().toString()):string => base === '' ? base : `${base}-${testSalt}`
const headers = {'Content-Type': 'application/json'}
const validatedBrowserContext = async (browser:Browser) => {
    return await browser.newContext({
        storageState: adminFile
    })
}

/**
 * Generic polling function with exponential backoff
 * Repeatedly calls fetchFn until condition returns true or max attempts reached
 *
 * @param fetchFn - Async function that fetches data
 * @param condition - Function that checks if data meets expectations
 * @param maxAttempts - Maximum number of polling attempts (default: 5)
 * @param initialDelay - Initial delay in ms, doubles each attempt (default: 500)
 * @returns Data from successful fetch
 *
 * @example
 * const teams = await pollUntil(
 *   () => SeasonFactory.getCookingTeamsForSeason(context, seasonId),
 *   (teams) => teams.length === 3
 * )
 */
async function pollUntil<T>(
    fetchFn: () => Promise<T>,
    condition: (data: T) => boolean,
    maxAttempts: number = 5,
    initialDelay: number = 500
): Promise<T> {
    let delay = initialDelay
    let lastData: T

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        lastData = await fetchFn()

        if (condition(lastData)) {
            return lastData
        }

        if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delay))
            delay *= 2 // Exponential backoff: 500, 1000, 2000, 4000, 8000...
        }
    }

    // Condition not met after all attempts - fail the test
    expect(condition(lastData!)).toBeTruthy()
    return lastData!
}

const testHelpers = {
    salt,
    headers,
    validatedBrowserContext,
    pollUntil
}

export default testHelpers
