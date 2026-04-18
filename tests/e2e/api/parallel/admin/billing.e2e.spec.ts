import {test, expect} from '@playwright/test'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext} = testHelpers

/**
 * Admin Billing API Tests (parallel)
 *
 * Only tests that DO NOT require existing billing data live here.
 * Tests requiring billing data (invoiceSum/transactionSum control sums, invoice ordering,
 * fetching transactions for an existing invoice) live in the `full billing pipeline` test
 * in tests/e2e/api/serial/admin/maintenance.e2e.spec.ts, which creates real billing data.
 *
 * Endpoints covered here:
 * - GET /api/admin/billing/current-period - shape check (works on empty state)
 * - GET /api/admin/billing/invoices/[id]  - error paths (non-existent / invalid IDs)
 */
test.describe('Admin Billing API', () => {

    test.describe('GET /api/admin/billing/current-period', () => {

        test('GIVEN authenticated admin WHEN fetching current period THEN returns transactions array', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            const transactions = await BillingFactory.getCurrentPeriodTransactions(context)

            // May be empty if no unbilled transactions, but should be valid array
            expect(Array.isArray(transactions)).toBe(true)

            // If transactions exist, verify structure
            if (transactions.length > 0) {
                const tx = transactions[0]!
                expect(tx).toHaveProperty('id')
                expect(tx).toHaveProperty('amount')
                expect(tx).toHaveProperty('dinnerEvent')
                expect(tx).toHaveProperty('inhabitant')
                expect(tx.dinnerEvent).toHaveProperty('date')
                expect(tx.dinnerEvent).toHaveProperty('menuTitle')
                expect(tx.inhabitant).toHaveProperty('name')
            }
        })
    })

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
