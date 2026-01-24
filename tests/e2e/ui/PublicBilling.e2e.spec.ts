import {test, expect} from '@playwright/test'
import testHelpers from '~~/tests/e2e/testHelpers'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'

const {validatedBrowserContext} = testHelpers

/**
 * Public Billing Page E2E Tests
 *
 * Tests the magic link public billing page accessible WITHOUT authentication.
 * Uses admin API to get shareToken, but page tests use unauthenticated browser.
 */
test.describe('Public Billing Page', () => {
    let shareToken: string

    test.beforeAll(async ({browser}) => {
        // Get an existing billing period with shareToken via admin API
        const adminContext = await validatedBrowserContext(browser)
        const periods = await BillingFactory.getBillingPeriods(adminContext)

        // Find a period with a shareToken
        const periodWithToken = periods.find(p => p.shareToken)
        if (!periodWithToken) {
            throw new Error('No billing period with shareToken found - run maintenance.e2e.spec.ts first')
        }

        shareToken = periodWithToken.shareToken!
    })

    // Don't use any storageState - tests run as unauthenticated user
    test.use({storageState: {cookies: [], origins: []}})

    test('GIVEN valid token WHEN navigating to public billing page THEN displays billing content', async ({page}) => {
        await page.goto(`/public/billing/${shareToken}`)

        // Wait for page to load
        await expect(page.getByText('PBS Fakturaoversigt')).toBeVisible()
        await expect(page.getByText('Skrååningen Fællesspisning')).toBeVisible()

        // Verify billing period is displayed
        await expect(page.getByText('Forbrugsperiode')).toBeVisible()

        // Verify stats tiles are visible
        await expect(page.getByText('Husstande')).toBeVisible()
        await expect(page.getByText('Kuverter')).toBeVisible()

        // Verify invoices table is visible
        await expect(page.getByText('Fakturaer')).toBeVisible()
        await expect(page.getByText('PBS ID')).toBeVisible()
        await expect(page.getByText('Adresse')).toBeVisible()
    })

    test('GIVEN valid token WHEN requesting CSV endpoint THEN returns valid CSV', async ({page}) => {
        // Navigate to page first to verify it loads
        await page.goto(`/public/billing/${shareToken}`)
        await expect(page.getByText('PBS Fakturaoversigt')).toBeVisible()

        // Verify share button exists (CSV link is in popover)
        await expect(page.getByRole('button', {name: 'Del links'})).toBeVisible()

        // Test CSV endpoint directly (unauthenticated request)
        const csvUrl = `/api/public/billing/${shareToken}/csv`
        const response = await page.request.get(csvUrl)
        expect(response.status()).toBe(200)

        const contentType = response.headers()['content-type']
        expect(contentType).toContain('text/csv')

        const csv = await response.text()
        const header = csv.split('\n')[0]
        expect(header).toContain('Kunde nr')
        expect(header).toContain('Adresse')
        expect(header).toContain('Total DKK')

        // Verify CSV has data rows (not just header)
        const lines = csv.split('\n').filter(l => l.trim())
        expect(lines.length).toBeGreaterThan(1)
    })

    test('GIVEN invalid token WHEN navigating to public billing page THEN shows not found message', async ({page}) => {
        await page.goto('/public/billing/00000000-0000-0000-0000-000000000000')

        // Should show not found message
        await expect(page.getByText('Link ikke fundet')).toBeVisible()
        await expect(page.getByText('Dette link er ugyldigt eller udløbet')).toBeVisible()
    })
})
