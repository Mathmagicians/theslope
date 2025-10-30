import type {Browser} from "@playwright/test"
import {expect} from "@playwright/test"
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

/**
 * Take a screenshot for debugging or documentation
 *
 * @param page - Playwright Page object
 * @param name - Descriptive name for the screenshot (e.g., 'dropdown-timeout', 'form-error', 'admin-planning-loaded')
 * @param isDocumentation - If true, saves to docs/screenshots/ without timestamp. If false (default), saves to test-results/ with timestamp
 *
 * @example
 * // Debug screenshot (temporary, with timestamp)
 * await captureDebugScreenshot(page, 'dropdown-timeout')
 *
 * // Documentation screenshot (permanent, no timestamp)
 * await captureDebugScreenshot(page, 'admin/admin-planning-loaded', true)
 */
async function doScreenshot(page: any, name: string, isDocumentation: boolean = false): Promise<void> {
    const path = isDocumentation
        ? `docs/screenshots/${name}.png`
        : `test-results/${name}-${Date.now()}.png`

    await page.screenshot({
        path,
        fullPage: true
    })
}

/**
 * Select an option from a dropdown by test ID
 * Uses .first() to avoid strict mode violations on Linux where dropdown shows text twice
 * With reactive stores (useFetch immediate:true by default), dropdown data loads automatically on page load
 *
 * @param page - Playwright Page object
 * @param dropdownTestId - Test ID of the dropdown/selector element
 * @param optionName - Name/text of the option to select
 *
 * @example
 * await selectDropdownOption(page, 'season-selector', 'TestSeason-123')
 */
async function selectDropdownOption(
    page: any,
    dropdownTestId: string,
    optionName: string
): Promise<void> {
    const dropdown = page.getByTestId(dropdownTestId)

    // Wait for dropdown to be visible
    await dropdown.waitFor({ state: 'visible', timeout: 10000 })

    // Click dropdown to open it
    await dropdown.click()

    // Wait for the specific option to be visible
    const option = page.getByRole('option', {name: optionName}).first()
    await option.waitFor({ state: 'visible', timeout: 5000 })

    // Click the option
    await option.click()
}


const testHelpers = {
    salt,
    headers,
    validatedBrowserContext,
    pollUntil,
    doScreenshot,
    selectDropdownOption
}

export default testHelpers
