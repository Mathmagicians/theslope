import {test, expect} from '@playwright/test'
import {useBookingValidation} from '~~/app/composables/useBookingValidation'
import {useMaintenanceValidation} from '~~/app/composables/useMaintenanceValidation'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import type {Season} from '~/composables/useSeasonValidation'
import {WEEKDAYS} from '~~/app/types/dateTypes'
import type {BrowserContext} from '@playwright/test'

const {DinnerStateSchema, DinnerModeSchema, OrderStateSchema} = useBookingValidation()
const {JobType, JobStatus} = useMaintenanceValidation()
const DinnerState = DinnerStateSchema.enum
const DinnerMode = DinnerModeSchema.enum
const OrderState = OrderStateSchema.enum
const {validatedBrowserContext, temporaryAndRandom, getSessionUserInfo, salt} = testHelpers

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
            dinnerMode: DinnerMode.DINEIN,
            isGuestTicket: false
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
    const createdInhabitantIds: number[] = []
    const createdHouseholdIds: number[] = []
    let activeSeason: Season

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        activeSeason = await SeasonFactory.createActiveSeason(context)
    })

    test.afterAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        for (const id of createdInhabitantIds) {
            await HouseholdFactory.deleteInhabitant(context, id)
        }
        for (const id of createdDinnerEventIds) {
            await DinnerEventFactory.deleteDinnerEvent(context, id)
        }
        for (const id of createdHouseholdIds) {
            await HouseholdFactory.deleteHousehold(context, id)
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
    // ADR-010: Also verifies isGuestTicket preserved through billing pipeline
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

        // Setup: Create GUEST order via PUT /api/order (bypasses deadline for test setup)
        // Note: Scaffold endpoint can't create orders for past dinners - deadline restriction
        const ticketPrice = fullSeason.ticketPrices[0]!
        const guestOrderResult = await OrderFactory.createOrder(context, {
            householdId,
            dinnerEventId: dinner.id,
            orders: [{
                inhabitantId,
                bookedByUserId: 1,
                ticketPriceId: ticketPrice.id!,
                dinnerMode: DinnerMode.DINEIN,
                isGuestTicket: true
            }]
        })
        expect(guestOrderResult, 'Guest order creation should succeed').not.toBeNull()
        const guestOrderId = guestOrderResult!.createdIds[0]!

        // Verify guest order was created with isGuestTicket=true
        const createdGuestOrder = await OrderFactory.getOrder(context, guestOrderId)
        expect(createdGuestOrder?.isGuestTicket, 'Guest order should have isGuestTicket=true after creation').toBe(true)

        // Verify both orders exist with different IDs
        expect(orderId, 'Regular order ID should exist').toBeDefined()
        expect(guestOrderId, 'Guest order ID should exist').toBeDefined()
        expect(orderId, 'Order IDs should be different').not.toBe(guestOrderId)

        // Setup: 2nd household at a different address so billing yields ≥2 invoices → can verify ordering
        const secondHousehold = await HouseholdFactory.createHouseholdWithInhabitants(
            context,
            {address: salt('ZZZ Ordering Test', testSalt)}, // 'ZZZ' sorts after session household's address
            1
        )
        createdHouseholdIds.push(secondHousehold.household.id)
        // Admin session doesn't belong to 2nd household → use adminBypass
        await OrderFactory.createOrder(context, {
            householdId: secondHousehold.household.id,
            dinnerEventId: dinner.id,
            orders: [{
                inhabitantId: secondHousehold.inhabitants[0]!.id,
                bookedByUserId: 1,
                ticketPriceId: ticketPrice.id!,
                dinnerMode: DinnerMode.DINEIN,
                isGuestTicket: false
            }]
        }, 201, true)

        // Setup: Create inhabitant with NULL preferences (simulates Heynabo import)
        const nullPrefsInhabitant = await HouseholdFactory.createInhabitantWithConfig(
            context, householdId, {dinnerPreferences: null}
        )
        createdInhabitantIds.push(nullPrefsInhabitant.id)
        const existingBefore = await HouseholdFactory.getInhabitantById(context, inhabitantId)

        // Run maintenance (closes order + creates transaction + initializes NULL prefs)
        const maintenanceResult = await SeasonFactory.runDailyMaintenance(context)
        expect(maintenanceResult.initPrefs.initialized, 'Should initialize NULL preferences').toBeGreaterThanOrEqual(1)
        expect(maintenanceResult.close.closed, 'Should close orders on CONSUMED dinner').toBeGreaterThanOrEqual(2)
        expect(maintenanceResult.transact.created, 'Should create transactions for closed orders').toBeGreaterThanOrEqual(2)

        // Build expected maps: NULL→DINEIN on cooking days, existing→preserved on cooking days
        const expectedNullPrefs = Object.fromEntries(
            WEEKDAYS.map(day => [day, fullSeason.cookingDays[day] ? DinnerMode.DINEIN : DinnerMode.NONE])
        )
        const expectedExisting = Object.fromEntries(
            WEEKDAYS.map(day => [day, fullSeason.cookingDays[day] ? existingBefore?.dinnerPreferences?.[day] : DinnerMode.NONE])
        )

        // Verify clipped preferences
        const nullPrefsAfter = await HouseholdFactory.getInhabitantById(context, nullPrefsInhabitant.id)
        const existingAfter = await HouseholdFactory.getInhabitantById(context, inhabitantId)
        expect(nullPrefsAfter?.dinnerPreferences).toEqual(expectedNullPrefs)
        expect(existingAfter?.dinnerPreferences).toEqual(expectedExisting)

        // Verify orders are CLOSED
        const finalOrder = await OrderFactory.getOrder(context, orderId)
        expect(finalOrder?.state, 'Regular order should be CLOSED after maintenance').toBe(OrderState.CLOSED)

        const finalGuestOrder = await OrderFactory.getOrder(context, guestOrderId)
        expect(finalGuestOrder?.state, 'Guest order should be CLOSED after maintenance').toBe(OrderState.CLOSED)
        expect(finalGuestOrder?.isGuestTicket, 'Guest order should retain isGuestTicket=true').toBe(true)

        // ADR-010: Verify isGuestTicket preserved in transactions
        // Check unbilled transactions to verify our orders have transactions with correct isGuestTicket
        const unbilledTxs = await BillingFactory.getCurrentPeriodTransactions(context)
        const ourTxs = unbilledTxs.filter(tx => tx.orderId === orderId || tx.orderId === guestOrderId)
        expect(ourTxs.length, 'Both orders should have transactions').toBe(2)

        const guestTx = ourTxs.find(tx => tx.orderId === guestOrderId)
        const regularTx = ourTxs.find(tx => tx.orderId === orderId)
        expect(guestTx?.isGuestTicket, 'Guest transaction should have isGuestTicket=true').toBe(true)
        expect(regularTx?.isGuestTicket, 'Regular transaction should have isGuestTicket=false').toBeFalsy()

        // Generate billing - use result directly (not global getBillingPeriods which is flaky in parallel)
        const billingResponse = await BillingFactory.generateBilling(context)
        expect(billingResponse).not.toBeNull()
        expect(billingResponse!.jobRunId).toBeGreaterThan(0)
        expect(billingResponse!.results.length, 'Billing period should exist').toBeGreaterThan(0)

        // Verify billing period was created with transactions
        const billingResult = billingResponse!.results[0]!
        expect(billingResult.billingPeriod).toBeDefined()
        expect(billingResult.transactionCount).toBeGreaterThanOrEqual(2)

        // GET billing period by ID from generate response
        const createdPeriodId = billingResponse!.results[0]!.billingPeriodSummaryId
        const periodDetail = await BillingFactory.getBillingPeriodById(context, createdPeriodId)
        expect(periodDetail.invoices).toBeDefined()
        expect(periodDetail.shareToken).toBeDefined()

        // Bug fix verification: test household's invoice must have valid householdId and pbsId
        // Previously, if ticketPrice was deleted (SET NULL), deserializeTransaction
        // would fall back to snapshot data which could set householdId to 0
        // Note: Only verify our test household's invoice (other invoices may be from previous runs)
        const testInvoice = periodDetail.invoices.find(inv => inv.householdId === householdId)
        expect(testInvoice, `Test household ${householdId} should have an invoice`).toBeDefined()
        expect(testInvoice!.householdId, 'Invoice householdId should not be null').not.toBeNull()
        expect(testInvoice!.householdId, 'Invoice householdId should be valid (> 0)').toBeGreaterThan(0)
        expect(testInvoice!.pbsId, 'Invoice pbsId should be valid (> 0)').toBeGreaterThan(0)

        // Verify invoices ordered by address (primary) then pbsId (tiebreaker)
        // Second household was created with 'ZZZ' address to guarantee ≥2 invoices in this period
        expect(periodDetail.invoices.length, 'Need at least 2 invoices to verify ordering').toBeGreaterThanOrEqual(2)
        for (let i = 1; i < periodDetail.invoices.length; i++) {
            const prev = periodDetail.invoices[i - 1]!
            const curr = periodDetail.invoices[i]!
            if (prev.address === curr.address) {
                expect(curr.pbsId).toBeGreaterThanOrEqual(prev.pbsId)
            } else {
                expect(curr.address.localeCompare(prev.address)).toBeGreaterThanOrEqual(0)
            }
        }

        // Control sum: Σ invoice.amount equals billing period totalAmount
        expect(periodDetail.invoiceSum, 'invoiceSum control should match totalAmount').toBe(periodDetail.totalAmount)

        // Control sum: each invoice.transactionSum equals Σ of its transactions
        // Structure check: getInvoiceTransactions returns transactions with expected fields
        for (const invoice of periodDetail.invoices) {
            const transactions = await BillingFactory.getInvoiceTransactions(context, invoice.id)
            const computedSum = transactions.reduce((sum, tx) => sum + tx.amount, 0)
            expect(invoice.transactionSum, `transactionSum for invoice ${invoice.id} should equal Σ transactions`).toBe(computedSum)
            if (transactions.length > 0) {
                const tx = transactions[0]!
                expect(tx).toHaveProperty('id')
                expect(tx).toHaveProperty('amount')
                expect(tx).toHaveProperty('dinnerEvent')
                expect(tx).toHaveProperty('inhabitant')
                expect(tx).toHaveProperty('ticketType')
            }
        }

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

        // Note: isGuestTicket verification was done above via unbilled transactions
        // The billing pipeline test verifies CSV export works, magic links work, etc.
    })
})
