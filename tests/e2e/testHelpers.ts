import type {Browser, Page, BrowserContext, BrowserContextOptions, Locator, Response} from "@playwright/test"
import {expect} from "@playwright/test"
import {authFiles} from './config'
import {expectApiError, guardContext} from './apiErrorGuard'
import {randomUUID} from 'crypto'
import {getDinnerTimeRange, isBeforeDeadline} from '~/utils/season'
import {SEASON_CONFIG} from '~/config/season'
import {PREF_TEST_IDS} from '~~/tests/component/components/user/userPreferencesTestIds'

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
/** A browser context whose pages report their `/api/` responses to the case's API error guard (`uiTest.ts`) */
const openContext = async (browser: Browser, options: BrowserContextOptions = {}): Promise<BrowserContext> =>
    guardContext(await browser.newContext(options))

const createAuthContext = async (browser: Browser, storageState: string, baseURL?: string) => {
    const options: BrowserContextOptions = {storageState}
    if (baseURL) options.baseURL = baseURL
    return await openContext(browser, options)
}

/** Authenticated browser context for admin user */
const validatedBrowserContext = (browser: Browser, baseURL?: string) =>
    createAuthContext(browser, authFiles.adminFile, baseURL)

/** Authenticated browser context for regular member (non-admin) */
const memberValidatedBrowserContext = (browser: Browser, baseURL?: string) =>
    createAuthContext(browser, authFiles.memberFile, baseURL)

/**
 * A context whose member session was minted just now, so it carries the roles the database
 * holds rather than the roles the stored session file was created with. Use it in a test that
 * changes the member's roles - the session snapshot is written at login and never refreshed.
 */
const freshMemberContext = async (browser: Browser): Promise<BrowserContext> => {
    const context = await openContext(browser)
    const response = await context.request.post('/api/auth/login', {
        headers,
        data: {email: process.env.HEY_NABO_EJ_ADMIN_USERNAME, password: process.env.HEY_NABO_PASSWORD}
    })
    expect(response.status(), 'Fresh member login failed').toBe(200)
    return context
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
 * Matches the option by its exact name: a substring name also matches the options whose names contain it
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
    await dropdown.waitFor({ state: 'visible' })

    // Click dropdown to open it
    await dropdown.click()

    // Wait for the specific option to be visible
    const option = page.getByRole('option', {name: optionName, exact: true})
    await option.waitFor({ state: 'visible' })

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
async function getSessionUserInfo(context: BrowserContext): Promise<{ userId: number, userEmail: string, householdId: number, inhabitantId: number, householdShortname: string, householdPbsId: number }> {
    const response = await context.request.get('/api/_auth/session', { headers })
    expect(response.status()).toBe(200)
    const session = await response.json()
    const userId = session.user?.id
    const userEmail = session.user?.email
    const householdId = session.user?.Inhabitant?.householdId
    const inhabitantId = session.user?.Inhabitant?.id
    const householdShortname = session.user?.Inhabitant?.household?.shortName
    const householdPbsId = session.user?.Inhabitant?.household?.pbsId
    expect(userId, 'Session user must have userId').toBeDefined()
    expect(householdId, 'Session user must have householdId').toBeDefined()
    expect(inhabitantId, 'Session user must have inhabitantId').toBeDefined()
    expect(householdShortname, 'Session user must have householdShortname').toBeDefined()
    expect(householdPbsId, 'Session user must have householdPbsId').toBeDefined()
    return { userId, userEmail, householdId, inhabitantId, householdShortname, householdPbsId }
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

/** Create a Date offset by N days from now */
const daysFromNow = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d
}

/**
 * Poll until the Nuxt app has finished hydrating, i.e. Vue has attached its listeners.
 * SSR markup is visible (and passes isVisible checks) long before that, so a click or fill
 * issued too early is silently lost. Nuxt exposes `window.useNuxtApp` in every client build;
 * `isHydrating` flips to false once hydration completes.
 *
 * @example
 * await page.goto('/admin/households')
 * await waitForHydration(page)
 */
async function waitForHydration(page: Page): Promise<void> {
    await pollUntil(
        () => page.evaluate(() => {
            const nuxtApp = (window as unknown as { useNuxtApp?: () => { isHydrating?: boolean } }).useNuxtApp?.()
            return nuxtApp?.isHydrating === false
        }),
        (hydrated) => hydrated,
        6 // ~15s with doubling backoff - stays inside the 30s test timeout so a stuck page fails here, with this message
    )
}

/** Navigates and waits for hydration: the entry point for a test that interacts with the page */
const gotoHydrated = async (page: Page, url: string): Promise<void> => {
    await page.goto(url)
    await waitForHydration(page)
}

/**
 * Opens the admin allergy catalog. The catalog is master/detail with a client-only desktop detail pane. The container
 * testid is in the SSR HTML before listeners exist, so the pane's content is the signal that the page is hydrated and
 * interactive.
 */
const gotoAllergyCatalog = async (page: Page): Promise<void> => {
    await gotoHydrated(page, '/admin/allergies')
    await expect(page.locator('[data-testid="admin-allergies"]')).toBeVisible()
    await expect(page.getByText('Detaljer').or(page.getByText('Vælg en allergi')).first()).toBeAttached()
}

/** Collects the console messages Vue logs on a hydration mismatch; attach it before the navigation */
const collectHydrationWarnings = (page: Page): string[] => {
    const warnings: string[] = []
    page.on('console', message => {
        if (message.text().includes('Hydration')) warnings.push(message.text())
    })
    return warnings
}

/** Navigates, waits for hydration and asserts Vue logged no hydration mismatch on the way */
const expectHydratedWithoutMismatch = async (page: Page, url: string): Promise<void> => {
    const warnings = collectHydrationWarnings(page)
    await gotoHydrated(page, url)
    expect(warnings).toEqual([])
}

/** The next response to a `method` request whose url contains `path`; attach it before the action that sends the request */
const waitForApi = (page: Page, path: string, method: string, options?: {timeout?: number}): Promise<Response> =>
    page.waitForResponse(response => response.url().includes(path) && response.request().method() === method, options)

/** A response of the household's scaffold: the booking write (POST) or its dry run (GET) */
const isScaffold = (method: string) => (response: Response): boolean =>
    response.url().includes('/api/household/order/scaffold') && response.request().method() === method
/** The save of the household's booking write */
const isScaffoldSave = isScaffold('POST')
/** A booking view's read of the expected bookings: the dry run without orders, answered with what the preferences book */
const isExpectedRead = (response: Response): boolean =>
    isScaffold('GET')(response) && !new URL(response.url()).searchParams.has('orders')

const {
    prebookingWindowDays: PREBOOKING_WINDOW_DAYS,
    defaultDinnerStartTime: DINNER_START_HOUR,
    defaultSeason: {menuIsAnnouncedDaysBefore: MENU_DEADLINE_DAYS}
} = SEASON_CONFIG
// A day past the prebooking window
const PAST_THE_SCAFFOLD_WINDOW_DAYS = PREBOOKING_WINDOW_DAYS + 2

/** The start of the dinner on `date`, as the server reads it: DINNER_START_HOUR in Copenhagen */
const dinnerStartOf = (date: Date): Date => getDinnerTimeRange(date, DINNER_START_HOUR, 0).start

/** Whether now lies before the deadline `offsetDays` before the dinner on `date` starts: the application's predicate */
const isBeforeDinnerDeadline = (offsetDays: number) => (date: Date): boolean =>
    isBeforeDeadline(offsetDays, 0, new Date())(dinnerStartOf(date))

/** Opens "Mine indstillinger": the card is behind the settings button in the profile card header, its open state component-local */
const openPreferences = async (page: Page): Promise<void> => {
    await page.getByTestId(PREF_TEST_IDS.toggle).click()
    await expect(page.getByTestId(PREF_TEST_IDS.card)).toBeVisible()
}

/** Saves "Mine indstillinger" with the controls of `testIds` clicked in edit mode; the save's response */
const savePreferences = async (page: Page, testIds: string[]): Promise<Response> => {
    await page.getByTestId(PREF_TEST_IDS.edit).click()
    for (const testId of testIds) await page.getByTestId(testId).click()
    const saved = waitForApi(page, '/api/user/preferences', 'POST')
    await page.getByTestId(PREF_TEST_IDS.save).click()
    return saved
}

/**
 * Types a dd/MM/yyyy date into a UInputDate field: clicks the field's day segment and
 * types the digits - the segments auto-advance through day, month and year.
 * `scope` holds the picker (e.g. `page.locator('div[name="seasonDates"]')`); a range picker
 * has two fields, `field` picks one.
 */
const fillDateField = async (scope: Locator, field: 'start' | 'end', date: string) => {
    const day = scope.locator('[data-segment="day"]').nth(field === 'start' ? 0 : 1)
    await day.click()
    await expect(day, 'the day segment takes focus before typing').toBeFocused()
    await day.page().keyboard.type(date.replaceAll('/', ''))
    // The field commits through v-model after the last segment; readers and clicks that
    // follow need the committed value, so poll until the segments read the typed date back
    const [d, m, y] = date.split('/').map(Number)
    const typed = new Date(y!, m! - 1, d!)
    await pollUntil(
        () => readDateField(scope, field),
        (read) => read.getTime() === typed.getTime()
    )
}

/** The date a UInputDate field holds, read from its segments' values */
const readDateField = async (scope: Locator, field: 'start' | 'end'): Promise<Date> => {
    const index = field === 'start' ? 0 : 1
    const segment = async (kind: string) =>
        Number(await scope.locator(`[data-segment="${kind}"]`).nth(index).getAttribute('aria-valuenow'))
    return new Date(await segment('year'), await segment('month') - 1, await segment('day'))
}

// The phone every screen fits (iPhone X)
const PHONE_VIEWPORT = {width: 375, height: 812}

const testHelpers = {
    salt,
    saltedId,
    temporaryAndRandom,
    PHONE_VIEWPORT,
    headers,
    openContext,
    validatedBrowserContext,
    memberValidatedBrowserContext,
    freshMemberContext,
    expectApiError,
    pollUntil,
    doScreenshot,
    selectDropdownOption,
    getSessionUserInfo,
    assertNoOrdersWithOrphanPrices,
    daysFromNow,
    waitForHydration,
    gotoHydrated,
    gotoAllergyCatalog,
    collectHydrationWarnings,
    expectHydratedWithoutMismatch,
    waitForApi,
    isScaffoldSave,
    isExpectedRead,
    PREBOOKING_WINDOW_DAYS,
    PAST_THE_SCAFFOLD_WINDOW_DAYS,
    DINNER_START_HOUR,
    MENU_DEADLINE_DAYS,
    dinnerStartOf,
    isBeforeDinnerDeadline,
    openPreferences,
    savePreferences,
    fillDateField,
    readDateField
}

export default testHelpers
