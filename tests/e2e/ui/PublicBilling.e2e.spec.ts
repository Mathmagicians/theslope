import {test, expect} from '~~/tests/e2e/uiTest'
import testHelpers from '~~/tests/e2e/testHelpers'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import {BOOKING_WORDS} from '~/config/bookingWords'

const {validatedBrowserContext, expectApiError} = testHelpers

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
            throw new Error('No billing period with shareToken found - run monthly-billing.feature first')
        }

        shareToken = periodWithToken.shareToken!
    })

    // Don't use any storageState - tests run as unauthenticated user
    test.use({storageState: {cookies: [], origins: []}})

    test('GIVEN valid token WHEN navigating to public billing page THEN displays billing content', async ({page}) => {
        await page.goto(`/public/billing/${shareToken}`)

        // Wait for page to load
        await expect(page.getByText(BOOKING_WORDS.billing.publicPage.title)).toBeVisible()
        await expect(page.getByText(BOOKING_WORDS.billing.publicPage.community)).toBeVisible()

        // Verify billing period is displayed
        await expect(page.getByText(BOOKING_WORDS.billing.summary.billingPeriod)).toBeVisible()

        // Verify stats tiles are visible
        await expect(page.getByText(BOOKING_WORDS.billing.stats.households)).toBeVisible()
        await expect(page.getByText(BOOKING_WORDS.billing.stats.tickets)).toBeVisible()

        // Verify invoices table is visible
        await expect(page.getByText(BOOKING_WORDS.billing.titles.invoices)).toBeVisible()
        await expect(page.getByText(BOOKING_WORDS.billing.columns.pbsId)).toBeVisible()
        await expect(page.getByText(BOOKING_WORDS.billing.columns.address)).toBeVisible()
    })

    test('GIVEN invalid token WHEN navigating to public billing page THEN shows not found message', async ({page}) => {
        const invalidToken = '00000000-0000-0000-0000-000000000000'
        expectApiError(page.context(), 404, `/api/public/billing/${invalidToken}`)
        await page.goto(`/public/billing/${invalidToken}`)

        // Should show not found message
        await expect(page.getByText(BOOKING_WORDS.billing.publicPage.notFound.title)).toBeVisible()
        await expect(page.getByText(BOOKING_WORDS.billing.publicPage.notFound.description)).toBeVisible()
    })
})
