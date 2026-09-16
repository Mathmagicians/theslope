import {expect, type BrowserContext} from '@playwright/test'
import testHelpers from '../testHelpers'
import {useNotificationValidation, type SenderEmitResult, type SenderEventTestBody} from '~/composables/useNotificationValidation'

const {headers} = testHelpers
const {SenderEmitResultSchema} = useNotificationValidation()

const TEST_EVENT_ENDPOINT = '/api/admin/sender/event/test'

/**
 * Sender events — the HTTP twins of notification triggers (ADR-003 factory).
 * Under `nuxt dev` the SENDER queue is a miniflare sink: a test event queues and nothing is sent.
 */
export class SenderFactory {
    static readonly defaultTestEventBody = (testSalt?: string): SenderEventTestBody => ({
        to: `sender-test${testSalt ? `-${testSalt}` : ''}@example.com`
    })

    /** POST /api/admin/sender/event/test — the emit result on 200, null otherwise */
    static readonly triggerTestEvent = async (
        context: BrowserContext,
        body: unknown,
        expectedStatus: number = 200
    ): Promise<SenderEmitResult | null> => {
        const response = await context.request.post(TEST_EVENT_ENDPOINT, {headers, data: body})

        const status = response.status()
        const errorBody = status !== expectedStatus ? await response.text() : ''
        expect(status, `Unexpected status. Response: ${errorBody}`).toBe(expectedStatus)

        if (expectedStatus === 200) {
            return SenderEmitResultSchema.parse(await response.json())
        }
        return null
    }
}
