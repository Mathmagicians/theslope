import {expect, type BrowserContext} from '@playwright/test'
import testHelpers from '../testHelpers'
import {useNotificationValidation, type SenderEmitResult, type SenderEventMonthlyBillingBody} from '~/composables/useNotificationValidation'
import {useDeliveryValidation, type Delivery} from '~/composables/useDeliveryValidation'

const {headers} = testHelpers
const {SenderEmitResultSchema} = useNotificationValidation()

const TEST_EVENT_ENDPOINT = '/api/admin/sender/event/test'
const MONTHLY_BILLING_EVENT_ENDPOINT = '/api/admin/sender/event/monthly-billing'
const DELIVERY_ENDPOINT = '/api/admin/sender/delivery'

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

    /** GET /api/admin/sender/delivery — the Delivery rows of the subjects named, all of one subject type */
    static readonly getDeliveries = (
        context: BrowserContext,
        subjectType: Delivery['subjectType'],
        subjectIds: number[],
        expectedStatus: number = 200
    ): Promise<Delivery[]> => SenderFactory.getDeliveriesByQuery(context, {subjectType, subjectIds: subjectIds.map(String)}, expectedStatus)

    /** The delivery read with the query as given: the validation case sends a query the endpoint refuses */
    static readonly getDeliveriesByQuery = async (
        context: BrowserContext,
        {subjectType, subjectIds}: {subjectType: string, subjectIds: string[]},
        expectedStatus: number = 200
    ): Promise<Delivery[]> => {
        const {DeliverySchema} = useDeliveryValidation()
        const query = new URLSearchParams([['subjectType', subjectType], ...subjectIds.map(id => ['subjectIds', id])])
        const response = await context.request.get(`${DELIVERY_ENDPOINT}?${query}`, {headers})
        const body = response.status() === expectedStatus ? null : await response.text()
        expect(response.status(), `Unexpected status reading the deliveries: ${body}`).toBe(expectedStatus)
        return expectedStatus === 200 ? DeliverySchema.array().parse(await response.json()) : []
    }

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
