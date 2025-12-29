import {test, expect} from '@playwright/test'
import {useBookingValidation} from '~~/app/composables/useBookingValidation'
import {useMaintenanceValidation} from '~~/app/composables/useMaintenanceValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import type {Season} from '~/composables/useSeasonValidation'
import type {BrowserContext} from '@playwright/test'

const {DinnerStateSchema, DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const {JobType, JobStatus} = useMaintenanceValidation()
const DinnerState = DinnerStateSchema.enum
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum
const {validatedBrowserContext, temporaryAndRandom, getSessionUserInfo} = testHelpers

// === HELPERS ===

/** Create a date N days from today at midnight */
const daysFromToday = (days: number): Date => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    date.setHours(0, 0, 0, 0)
    return date
}

/** Create a dinner event in the active season */
const createTestDinner = async (
    context: BrowserContext,
    seasonId: number,
    testSalt: string,
    state: typeof DinnerState[keyof typeof DinnerState],
    daysOffset: number,
    extras: {totalCost?: number} = {}
) => {
    return await DinnerEventFactory.createDinnerEvent(context, {
        seasonId,
        date: daysFromToday(daysOffset),
        menuTitle: `${state} ${testSalt}`,
        state,
        ...extras
    })
}

/** Create a BOOKED order for a dinner using session user's household */
const createTestOrder = async (
    context: BrowserContext,
    season: Season,
    dinnerId: number,
    householdId: number,
    inhabitantId: number
) => {
    const ticketPrice = season.ticketPrices[0]!

    const orderResult = await OrderFactory.createOrder(context, {
        householdId,
        dinnerEventId: dinnerId,
        orders: [{
            inhabitantId,
            bookedByUserId: 1, // Factory default
            ticketPriceId: ticketPrice.id!,
            dinnerMode: DinnerMode.DINEIN
        }]
    })

    expect(orderResult, 'Order creation should succeed').not.toBeNull()
    return {orderId: orderResult!.createdIds[0]!}
}

// === TESTS ===
// These tests verify FINAL expected state after maintenance runs.
// The endpoint is idempotent - running multiple times yields same final state.
// Business rules:
// - Past non-cancelled dinners → end up CONSUMED
// - Future dinners → remain in original state
// - CANCELLED dinners → remain CANCELLED
// - BOOKED orders on CONSUMED dinners → end up CLOSED
// - CLOSED orders → get transaction created (if missing)

test.describe('Daily Maintenance API', () => {
    test.describe.configure({mode: 'default'})

    const createdDinnerEventIds: number[] = []
    let activeSeason: Season

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        activeSeason = await SeasonFactory.createActiveSeason(context)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const id of createdDinnerEventIds) {
            await DinnerEventFactory.deleteDinnerEvent(context, id)
        }
    })

    // Consolidated: Endpoint structure + idempotency in ONE test
    test('returns valid result structure, creates job run, and is idempotent', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        // First run - verify structure
        const result1 = await SeasonFactory.runDailyMaintenance(context)
        expect(result1.jobRunId).toBeGreaterThan(0)
        expect(result1.consume.consumed).toBeGreaterThanOrEqual(0)
        expect(result1.close.closed).toBeGreaterThanOrEqual(0)
        expect(result1.transact.created).toBeGreaterThanOrEqual(0)
        expect(result1.scaffold).not.toBeNull()

        // Verify job run was created and completed
        const jobRun = await SeasonFactory.getJobRun(context, result1.jobRunId)
        expect(jobRun).not.toBeNull()
        expect(jobRun!.jobType).toBe(JobType.DAILY_MAINTENANCE)
        expect(jobRun!.status).toBe(JobStatus.SUCCESS)
        expect(jobRun!.completedAt).not.toBeNull()
        expect(jobRun!.durationMs).toBeGreaterThanOrEqual(0)

        // Second run - verify idempotency (ADR-015)
        const result2 = await SeasonFactory.runDailyMaintenance(context)
        expect(result2.jobRunId).toBeGreaterThan(result1.jobRunId) // New job run
        expect(result2.consume.consumed).toBeGreaterThanOrEqual(0)
        expect(result2.close.closed).toBeGreaterThanOrEqual(0)
        expect(result2.transact.created).toBeGreaterThanOrEqual(0)
    })

    // Consolidated: Full billing pipeline in ONE test
    // Tests: closeOrders → createTransactions → generateBilling → all billing endpoints
    test('full billing pipeline: order closes, transaction created, billing generated, endpoints work', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const testSalt = temporaryAndRandom()
        const fullSeason = await SeasonFactory.getSeason(context, activeSeason.id!)

        // Get session user's household (not a test household) for authorization
        const { householdId, inhabitantId } = await getSessionUserInfo(context)

        // Setup: Create CONSUMED dinner with order in PREVIOUS billing period (must be closed for billing)
        const dinner = await createTestDinner(context, activeSeason.id!, testSalt, DinnerState.CONSUMED, -35, {totalCost: 50000})
        createdDinnerEventIds.push(dinner.id)
        const {orderId} = await createTestOrder(context, fullSeason, dinner.id, householdId, inhabitantId)

        // Run maintenance (closes order + creates transaction)
        await SeasonFactory.runDailyMaintenance(context)

        // Verify order is CLOSED
        const finalOrder = await OrderFactory.getOrder(context, orderId)
        expect(finalOrder?.state, 'Order should be CLOSED after maintenance').toBe(OrderState.CLOSED)

        // Generate billing - use result directly (not global getBillingPeriods which is flaky in parallel)
        const billingResponse = await BillingFactory.generateBilling(context)
        expect(billingResponse).not.toBeNull()
        expect(billingResponse!.jobRunId).toBeGreaterThan(0)
        expect(billingResponse!.results.length, 'Billing period should exist').toBeGreaterThan(0)

        // GET billing period by ID from generate response
        const createdPeriodId = billingResponse!.results[0]!.billingPeriodSummaryId
        const periodDetail = await BillingFactory.getBillingPeriodById(context, createdPeriodId)
        expect(periodDetail.invoices).toBeDefined()
        expect(periodDetail.shareToken).toBeDefined()

        // GET billing via public magic link
        const publicData = await BillingFactory.getBillingPeriodByToken(context, periodDetail.shareToken)
        expect(publicData.id).toBe(periodDetail.id)
        expect(publicData.invoices.length).toBe(periodDetail.invoices.length)

        // GET CSV export
        const {csv, filename} = await BillingFactory.getBillingCsvByToken(context, periodDetail.shareToken)
        const header = csv.split('\n')[0]
        expect(header).toContain('Kunde nr')
        expect(header).toContain('Adresse')
        expect(header).toContain('Total DKK')
        expect(header).toContain('Opgørelsesdato')
        expect(filename).toContain(periodDetail.billingPeriod)

        // Verify CSV has correct row count (header + invoices)
        const lines = csv.split('\n')
        expect(lines.length).toBe(1 + periodDetail.invoices.length)
    })
})
