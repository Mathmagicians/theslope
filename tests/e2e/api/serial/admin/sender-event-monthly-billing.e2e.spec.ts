import {test, expect} from '@playwright/test'
import {SenderFactory} from '~~/tests/e2e/testDataFactories/senderFactory'
import {BillingFactory} from '~~/tests/e2e/testDataFactories/billingFactory'
import testHelpers from '~~/tests/e2e/testHelpers'
import {useUserPreferenceValidation} from '~/composables/useUserPreferenceValidation'

const {validatedBrowserContext, memberValidatedBrowserContext} = testHelpers
const Channel = useUserPreferenceValidation().NotificationChannelSchema.enum

/** Serial: needs a billing period, which monthly billing creates from all unbilled transactions (ADR-015 idempotent). */
test.describe('POST /api/admin/sender/event/monthly-billing', () => {
    let billingPeriodSummaryId: number

    test.beforeAll(async ({browser}) => {
        const context = await validatedBrowserContext(browser)
        billingPeriodSummaryId = await BillingFactory.billingPeriodToResend(context)
    })

    test('GIVEN admin WHEN re-sending a period THEN the accountant mail is queued', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const result = await SenderFactory.triggerMonthlyBillingEvent(context, SenderFactory.monthlyBillingEventBody(billingPeriodSummaryId))

        expect(result).not.toBeNull()
        expect(result!.queued).toBe(true)
        // the mail kind follows the period's version: v1 closes it, a later version is an update
        const {version} = await BillingFactory.getBillingPeriodById(context, billingPeriodSummaryId)
        expect(result!.dedupeKey).toMatch(new RegExp(`^BILLING_PERIOD_${version > 1 ? 'UPDATED' : 'CLOSED'}:${Channel.EMAIL}:`))
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
