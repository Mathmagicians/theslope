import {test, expect} from '@playwright/test'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext} = testHelpers

/**
 * Admin Billing API Tests (parallel)
 *
 * Only tests that DO NOT require existing billing data live here.
 * Tests requiring billing data (invoice ordering, the transactions of an existing invoice) live in
 * `tests/e2e/features/jobs/monthly-billing.feature`, which bills its own households.
 *
 * Endpoints covered here:
 * - GET /api/admin/billing/invoices/[id]  - error paths (non-existent / invalid IDs)
 */
test.describe('Admin Billing API', () => {

    test.describe('GET /api/admin/billing/invoices/[id]', () => {

        test('GIVEN non-existent invoice ID WHEN fetching transactions THEN returns empty array', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // Use a very high ID that won't exist
            const transactions = await BillingFactory.getInvoiceTransactions(context, 999999)

            // Should return empty array, not error
            expect(Array.isArray(transactions)).toBe(true)
            expect(transactions).toHaveLength(0)
        })

        test('GIVEN invalid invoice ID WHEN fetching transactions THEN returns 400', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            const result = await BillingFactory.getInvoiceTransactionsRaw(context, -1)

            expect(result.status).toBe(400)
        })
    })
})
