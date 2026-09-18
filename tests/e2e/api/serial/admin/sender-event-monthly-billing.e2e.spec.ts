import {test, expect} from '@playwright/test'
import {SenderFactory} from '~~/tests/e2e/testDataFactories/senderFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext} = testHelpers

/** Serial: needs a billing period, which monthly billing creates from all unbilled transactions (ADR-015 idempotent). */
test.describe('POST /api/admin/sender/event/monthly-billing', () => {
    let billingPeriodSummaryId: number

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        const billing = await BillingFactory.generateBilling(context)
        const periods = billing?.results.length ? billing.results.map(r => r.billingPeriodSummaryId) : (await BillingFactory.getBillingPeriods(context)).map(p => p.id)
        expect(periods.length, 'a billing period to re-send').toBeGreaterThan(0)
        billingPeriodSummaryId = periods[0]!
    })

    test('GIVEN admin WHEN re-sending a period THEN the accountant mail is queued', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const result = await SenderFactory.triggerMonthlyBillingEvent(context, SenderFactory.monthlyBillingEventBody(billingPeriodSummaryId))

        expect(result).not.toBeNull()
        expect(result!.queued).toBe(true)
        // the mail kind follows the period's version: v1 closes it, a later version is an update
        const {version} = await BillingFactory.getBillingPeriodById(context, billingPeriodSummaryId)
        expect(result!.dedupeKey).toMatch(new RegExp(`^BILLING_PERIOD_${version > 1 ? 'UPDATED' : 'CLOSED'}:EMAIL:`))
    })

    test('GIVEN an unknown period THEN 404', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SenderFactory.triggerMonthlyBillingEvent(context, SenderFactory.monthlyBillingEventBody(999_999_999), 404)
    })

    test('GIVEN a member THEN 403', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)
        await SenderFactory.triggerMonthlyBillingEvent(context, SenderFactory.monthlyBillingEventBody(billingPeriodSummaryId), 403)
    })

    test('GIVEN an invalid body THEN 400', async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        await SenderFactory.triggerMonthlyBillingEvent(context, {billingPeriodSummaryId: 'nope'}, 400)
    })
})
