import type {Browser, Page, BrowserContext, BrowserContextOptions} from "@playwright/test"
import {expect} from "@playwright/test"
import {authFiles} from './config'
import {randomUUID} from 'crypto'

const headers = {'Content-Type': 'application/json'}

// Use crypto.randomUUID() for globally unique salts across parallel workers/processes
const temporaryAndRandom = () => randomUUID()

const salt = (base: string, testSalt: string = temporaryAndRandom()):string => base === '' ? testSalt : `${base}-${testSalt}`

/**
 * Generate a unique numeric ID from a test salt
 * Uses cyrb53 hash for better distribution and uniqueness across parallel tests
 *
 * @param base - Base number to add to the hash (e.g., 1000, 2000, 3000)
 * @param testSalt - Optional salt string. If not provided, generates a new random one
 * @returns A unique numeric ID (safe for SQLite INT range)
 *
 * @example
 * // Generate IDs for same test entity using same salt (prevents collisions)
 * const testSalt = temporaryAndRandom()
 * const heynaboId = saltedId(1000, testSalt)
 * const pbsId = saltedId(2000, testSalt)
 */
const saltedId = (base: number = 0, testSalt?: string): number => {
    const salt = testSalt || temporaryAndRandom()
    // cyrb53 hash - good distribution, fast, simple
    // Produces 53-bit hash (safe for JS number precision)
    let h1 = 0xdeadbeef ^ base
    let h2 = 0x41c6ce57 ^ base
    for (let i = 0; i < salt.length; i++) {
        const ch = salt.charCodeAt(i)
        h1 = Math.imul(h1 ^ ch, 2654435761)
        h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    // Combine into 32-bit result (SQLite INT is 64-bit, this is plenty)
    return Math.abs((h2 >>> 0) + (h1 >>> 0) * 0x100) % 2147483647
}
const createAuthContext = async (browser: Browser, storageState: string, baseURL?: string) => {
    const options: BrowserContextOptions = {storageState}
    if (baseURL) options.baseURL = baseURL
    return await browser.newContext(options)
}

/** Authenticated browser context for admin user */
const validatedBrowserContext = (browser: Browser, baseURL?: string) =>
    createAuthContext(browser, authFiles.adminFile, baseURL)

/** Authenticated browser context for regular member (non-admin) */
const memberValidatedBrowserContext = (browser: Browser, baseURL?: string) =>
    createAuthContext(browser, authFiles.memberFile, baseURL)

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
async function doScreenshot(page: Page, name: string, isDocumentation: boolean = false): Promise<void> {
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
    page: Page,
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

/**
 * Fetch current user's session info from nuxt-auth-utils
 * Use this to get the authenticated user's householdId and inhabitantId
 *
 * @param context - Authenticated browser context
 * @returns Object with householdId and inhabitantId from session
 *
 * @example
 * const { householdId, inhabitantId } = await getSessionUserInfo(context)
 */
async function getSessionUserInfo(context: BrowserContext): Promise<{ userId: number, householdId: number, inhabitantId: number, householdShortname: string }> {
    const response = await context.request.get('/api/_auth/session', { headers })
    expect(response.status()).toBe(200)
    const session = await response.json()
    const userId = session.user?.id
    const householdId = session.user?.Inhabitant?.householdId
    const inhabitantId = session.user?.Inhabitant?.id
    const householdShortname = session.user?.Inhabitant?.household?.shortName
    expect(userId, 'Session user must have userId').toBeDefined()
    expect(householdId, 'Session user must have householdId').toBeDefined()
    expect(inhabitantId, 'Session user must have inhabitantId').toBeDefined()
    expect(householdShortname, 'Session user must have householdShortname').toBeDefined()
    return { userId, householdId, inhabitantId, householdShortname }
}

/**
 * Assert no orders have orphaned prices (all orders have valid ticketPriceId)
 * Use after any operation that creates/updates orders to verify data integrity
 *
 * @param orders - Array of orders to check (OrderDetail or OrderDisplay)
 * @param context - Optional context message for assertion failure
 *
 * @example
 * const orders = await OrderFactory.getOrdersForDinnerEventsViaAdmin(context, eventIds)
 * assertNoOrdersWithOrphanPrices(orders, 'after scaffolding')
 */
function assertNoOrdersWithOrphanPrices(
    orders: Array<{ ticketPriceId: number | null | undefined }>,
    context: string = ''
): void {
    const orphans = orders.filter(o => o.ticketPriceId === null || o.ticketPriceId === undefined)
    const message = context
        ? `All orders should have valid ticketPriceId ${context}`
        : 'All orders should have valid ticketPriceId'
    expect(orphans, message).toHaveLength(0)
}

const testHelpers = {
    salt,
    saltedId,
    temporaryAndRandom,
    headers,
    validatedBrowserContext,
    memberValidatedBrowserContext,
    pollUntil,
    doScreenshot,
    selectDropdownOption,
    getSessionUserInfo,
    assertNoOrdersWithOrphanPrices
}

export default testHelpers
