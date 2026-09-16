import {expect, type BrowserContext} from '@playwright/test'
import testHelpers from '../testHelpers'
import {useNotificationValidation, type SenderEmitResult, type SenderEventMonthlyBillingBody} from '~/composables/useNotificationValidation'

const {headers} = testHelpers
const {SenderEmitResultSchema} = useNotificationValidation()

const TEST_EVENT_ENDPOINT = '/api/admin/sender/event/test'
const MONTHLY_BILLING_EVENT_ENDPOINT = '/api/admin/sender/event/monthly-billing'

/**
 * Sender events — the HTTP twins of notification triggers (ADR-003 factory).
 * Under `nuxt dev` the SENDER queue is a miniflare sink: a test event queues and nothing is sent.
 */
export class SenderFactory {
    static readonly monthlyBillingEventBody = (billingPeriodSummaryId: number): SenderEventMonthlyBillingBody => ({billingPeriodSummaryId})

    /** POST /api/admin/sender/event/test (no body: the recipient is the configured admin mailbox) — the emit result on 200, null otherwise */
    static readonly triggerTestEvent = (context: BrowserContext, expectedStatus: number = 200) =>
        SenderFactory.triggerEvent(context, TEST_EVENT_ENDPOINT, undefined, expectedStatus)

    /** POST /api/admin/sender/event/monthly-billing — re-sends the accountant mail for a period */
    static readonly triggerMonthlyBillingEvent = (context: BrowserContext, body: unknown, expectedStatus: number = 200) =>
        SenderFactory.triggerEvent(context, MONTHLY_BILLING_EVENT_ENDPOINT, body, expectedStatus)

    private static readonly triggerEvent = async (
        context: BrowserContext,
        endpoint: string,
        body: unknown,
        expectedStatus: number
    ): Promise<SenderEmitResult | null> => {
        const response = await context.request.post(endpoint, {headers, data: body})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            return SenderEmitResultSchema.parse(await response.json())
        }
        return null
    }
}
