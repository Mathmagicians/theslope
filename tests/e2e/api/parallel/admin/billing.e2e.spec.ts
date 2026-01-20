import {test, expect} from '@playwright/test'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext} = testHelpers

/**
 * Admin Billing API Tests
 *
 * Tests for admin economy tree view endpoints:
 * - GET /api/admin/billing/periods - billing period summaries with computed control sums
 * - GET /api/admin/billing/periods/[id] - billing period detail with invoice control sums
 * - GET /api/admin/billing/current-period - unbilled transactions
 * - GET /api/admin/billing/invoices/[id] - transactions per invoice
 */
test.describe('Admin Billing API', () => {

    test.describe('GET /api/admin/billing/periods', () => {

        test('GIVEN billing period WHEN fetching THEN invoiceSum control matches totalAmount', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const periods = await BillingFactory.getBillingPeriods(context)

            test.skip(periods.length === 0, 'No billing periods exist')

            // Control sum: invoiceSum (Σ invoice.amount) should equal totalAmount
            const period = periods[0]!
            expect(period.invoiceSum).toBe(period.totalAmount)
        })
    })

    test.describe('GET /api/admin/billing/periods/[id]', () => {

        test('GIVEN billing period detail WHEN fetching THEN transactionSum equals Σ transactions', async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            const periods = await BillingFactory.getBillingPeriods(context)

            test.skip(periods.length === 0, 'No billing periods exist')

            const detail = await BillingFactory.getBillingPeriodById(context, periods[0]!.id)
            test.skip(detail.invoices.length === 0, 'No invoices in billing period')

            // Verify transactionSum is correctly computed from actual transactions
            const invoice = detail.invoices[0]!
            const transactions = await BillingFactory.getInvoiceTransactions(context, invoice.id)
            const computedSum = transactions.reduce((sum, tx) => sum + tx.amount, 0)

            expect(invoice.transactionSum).toBe(computedSum)
        })
    })

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

        test('GIVEN existing invoice WHEN fetching transactions THEN returns transactions array', async ({browser}) => {
            const context = await validatedBrowserContext(browser)

            // First get billing periods to find an invoice
            const periods = await BillingFactory.getBillingPeriods(context)

            // Skip if no billing periods exist
            test.skip(periods.length === 0, 'No billing periods exist - cannot test invoice transactions')

            // Get detail for first period to find invoices
            const detail = await BillingFactory.getBillingPeriodById(context, periods[0]!.id)
            test.skip(detail.invoices.length === 0, 'No invoices in billing period - cannot test')

            const invoiceId = detail.invoices[0]!.id
            const transactions = await BillingFactory.getInvoiceTransactions(context, invoiceId)

            // Verify it's a valid array (may be empty if order was deleted)
            expect(Array.isArray(transactions)).toBe(true)

            // If transactions exist, verify structure
            if (transactions.length > 0) {
                const tx = transactions[0]!
                expect(tx).toHaveProperty('id')
                expect(tx).toHaveProperty('amount')
                expect(tx).toHaveProperty('dinnerEvent')
                expect(tx).toHaveProperty('inhabitant')
                expect(tx).toHaveProperty('ticketType')
            }
        })

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
