import {test, expect} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import type {Season} from '~/composables/useSeasonValidation'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useBillingValidation} from '~/composables/useBillingValidation'
import {useHeynaboValidation} from '~/composables/useHeynaboValidation'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HealthReportSchema} from '~~/workers/common/health'

const {validatedBrowserContext, headers} = testHelpers
const {DailyMaintenanceResultSchema} = useBookingValidation()
const {MonthlyBillingResponseSchema} = useBillingValidation()
const {HeynaboImportResponseSchema} = useHeynaboValidation()

/**
 * API Smoke Tests
 *
 * Verify the deployed system is healthy after a release.
 * Tests are IDEMPOTENT - safe to run on dev/prod (cron jobs mutate but are safe to re-run).
 *
 * Environment variables (set by CI/CD smoke job):
 * - SHOULD_NOT_MUTATE: Skip test data scaffolding, use existing production data
 *   - Local/CI: Creates singleton test season if needed
 *   - Dev/Prod: Uses existing active season, fails if none exists
 * - EXPECTED_VERSION: GitHub SHA to verify correct deployment
 */

let activeSeason: Season

test.beforeAll(async ({browser}) => {
    const context = await validatedBrowserContext(browser)

    // Env-aware: Creates singleton locally, fetches existing on dev/prod
    // See SeasonFactory.createActiveSeason for SHOULD_NOT_MUTATE handling
    activeSeason = await SeasonFactory.createActiveSeason(context)

    expect(activeSeason).toBeDefined()
    expect(activeSeason.id).toBeGreaterThan(0)
    expect(activeSeason.isActive).toBe(true)
})

/** Every worker answers the same health report (workers/common/health.ts) and must run the expected version. */
const WORKER_HEALTH: Array<[string, string]> = [
    ['theslope', '/api/public/health'],
    ['theslope-sender', '/sender/health']
]

test.describe('@smoke Worker health', () => {
    for (const [worker, path] of WORKER_HEALTH) {
        test(`@smoke ${worker} reports health and the expected version`, async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const response = await context.request.get(path)
            expect(response.status(), `${worker} ${path}`).toBe(200)

            const health = HealthReportSchema.parse(await response.json())
            const expectedVersion = process.env.EXPECTED_VERSION
            if (expectedVersion) {
                // CI/CD: verify every worker runs the deployment under test
                expect(health.version, `${worker} version`).toBe(expectedVersion)
            }
            console.info(`ℹ️ ${worker} version: ${health.version}`)
        })
    }
})

test.describe('@smoke API Health Checks', () => {

    test('@smoke Active season has dinner events', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const detailResponse = await context.request.get(`/api/admin/season/${activeSeason.id}`, {headers})
        expect(detailResponse.status()).toBe(200)

        const detail = await detailResponse.json()
        expect(detail.dinnerEvents).toBeDefined()
        expect(detail.dinnerEvents.length).toBeGreaterThan(0)
    })

    test('@smoke Households list is non-empty', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const response = await context.request.get('/api/admin/household', {headers})
        expect(response.status()).toBe(200)

        const households = await response.json()
        expect(Array.isArray(households)).toBe(true)
        expect(households.length).toBeGreaterThan(0)

        // Verify structure
        const first = households[0]
        expect(first.id).toBeDefined()
        expect(first.name).toBeDefined()
        expect(first.inhabitants).toBeDefined()
    })

    test('@smoke Users list is non-empty', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const response = await context.request.get('/api/admin/users', {headers})
        expect(response.status()).toBe(200)

        const users = await response.json()
        expect(Array.isArray(users)).toBe(true)
        expect(users.length).toBeGreaterThan(0)

        // Verify structure
        const first = users[0]
        expect(first.id).toBeDefined()
        expect(first.email).toBeDefined()
    })

    test('@smoke Inhabitants list is non-empty', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const response = await context.request.get('/api/admin/household/inhabitants', {headers})
        expect(response.status()).toBe(200)

        const inhabitants = await response.json()
        expect(Array.isArray(inhabitants)).toBe(true)
        expect(inhabitants.length).toBeGreaterThan(0)
    })

})

test.describe('@smoke Idempotent Cron Jobs (ADR-015)', () => {

    test('@smoke Heynabo import runs successfully', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // GET endpoint - imports/syncs from Heynabo (idempotent)
        const response = await context.request.get('/api/admin/heynabo/import', {headers})
        expect(response.status()).toBe(200)

        const result = await response.json()
        // Parse with schema - validates structure (counts may be 0 if already synced)
        const parsed = HeynaboImportResponseSchema.parse(result)
        expect(parsed.householdsCreated).toBeGreaterThanOrEqual(0)
    })

    test('@smoke Daily maintenance runs successfully', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // POST endpoint - consumes past dinners, closes orders, scaffolds bookings (idempotent)
        const response = await context.request.post('/api/admin/maintenance/daily', {headers})
        expect(response.status()).toBe(200)

        const result = await response.json()
        // Parse with schema - validates complete structure
        const parsed = DailyMaintenanceResultSchema.parse(result)
        expect(parsed.jobRunId).toBeGreaterThan(0)
    })

    test('@smoke Monthly billing runs successfully', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // POST endpoint - generates billing for closed orders (idempotent)
        const response = await context.request.post('/api/admin/maintenance/monthly', {headers})
        expect(response.status()).toBe(200)

        const result = await response.json()
        // Parse with schema - validates structure
        const parsed = MonthlyBillingResponseSchema.parse(result)
        expect(parsed.jobRunId).toBeGreaterThan(0)
    })

})
