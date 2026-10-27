import {expect, type APIResponse, type BrowserContext} from '@playwright/test'
import testHelpers from '../testHelpers'
import {useNotificationValidation, type SenderEmitResult, type SenderEventMonthlyBillingBody} from '~/composables/useNotificationValidation'
import {useDeliveryValidation, type Delivery, type DeliveryDryRun, type SenderEvent} from '~/composables/useDeliveryValidation'

const {headers} = testHelpers
const {SenderEmitResultSchema} = useNotificationValidation()

/** An answer a refused request is read by: its status and its body */
type RawAnswer = {status: number, body: unknown}
const rawAnswerOf = async (response: APIResponse): Promise<RawAnswer> =>
    ({status: response.status(), body: await response.json().catch(() => null)})

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

    /** GET /api/admin/sender/delivery — the Delivery rows of the subjects named, all of one subject type */
    static readonly getDeliveries = async (
        context: BrowserContext,
        subjectType: Delivery['subjectType'],
        subjectIds: number[],
        expectedStatus: number = 200
    ): Promise<Delivery[]> => {
        const {DeliverySchema} = useDeliveryValidation()
        const response = await SenderFactory.readDeliveries(context, {subjectType, subjectIds: subjectIds.map(String)})
        const body = response.status() === expectedStatus ? null : await response.text()
        expect(response.status(), `Unexpected status reading the deliveries: ${body}`).toBe(expectedStatus)
        return expectedStatus === 200 ? DeliverySchema.array().parse(await response.json()) : []
    }

    /** The delivery read with the query as given, its answer unasserted: a scenario reads the refusal in its THEN */
    static readonly getDeliveriesByQueryRaw = async (
        context: BrowserContext,
        query: {subjectType: string, subjectIds: string[]}
    ): Promise<RawAnswer> => rawAnswerOf(await SenderFactory.readDeliveries(context, query))

    /** The Delivery rows of several subject types at once; a type without ids is not read */
    static readonly getDeliveriesOfSubjects = async (
        context: BrowserContext,
        subjects: Partial<Record<Delivery['subjectType'], number[]>>
    ): Promise<Delivery[]> => {
        const named = Object.entries(subjects).filter(([, ids]) => ids.length > 0) as Array<[Delivery['subjectType'], number[]]>
        return (await Promise.all(named.map(([subjectType, ids]) => SenderFactory.getDeliveries(context, subjectType, ids)))).flat()
    }

    /** GET /api/admin/sender/delivery?dryRun= — what the sender event's next run sends per user, with nothing sent */
    static readonly getDeliveryDryRun = async (
        context: BrowserContext,
        senderEvent: SenderEvent,
        expectedStatus: number = 200
    ): Promise<DeliveryDryRun | null> => {
        const {DeliveryDryRunSchema} = useDeliveryValidation()
        const response = await context.request.get(`${DELIVERY_ENDPOINT}?${new URLSearchParams({dryRun: senderEvent})}`, {headers})
        const body = response.status() === expectedStatus ? null : await response.text()
        expect(response.status(), `Unexpected status reading the delivery dry run: ${body}`).toBe(expectedStatus)
        return expectedStatus === 200 ? DeliveryDryRunSchema.parse(await response.json()) : null
    }

    /** POST /api/admin/sender/event/test, its answer unasserted: a scenario reads the refusal in its THEN */
    static readonly triggerTestEventRaw = async (context: BrowserContext): Promise<RawAnswer> =>
        rawAnswerOf(await context.request.post(TEST_EVENT_ENDPOINT, {headers}))

    /** POST /api/admin/sender/event/monthly-billing, its answer unasserted: a scenario reads the re-send or its refusal */
    static readonly triggerMonthlyBillingEventRaw = async (context: BrowserContext, body: unknown): Promise<RawAnswer> =>
        rawAnswerOf(await context.request.post(MONTHLY_BILLING_EVENT_ENDPOINT, {headers, data: body}))

    private static readonly readDeliveries = (context: BrowserContext, {subjectType, subjectIds}: {subjectType: string, subjectIds: string[]}) =>
        context.request.get(`${DELIVERY_ENDPOINT}?${new URLSearchParams([['subjectType', subjectType], ...subjectIds.map(id => ['subjectIds', id])])}`, {headers})

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
