import {test, expect} from '@playwright/test'
import {SenderFactory} from '~~/tests/e2e/testDataFactories/senderFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext, memberValidatedBrowserContext, temporaryAndRandom} = testHelpers

test.describe('POST /api/admin/sender/event/test', () => {
    test('GIVEN admin WHEN triggering the test event THEN the message is queued with a TEST dedupeKey', async ({browser}) => {
        const context = await validatedBrowserContext(browser)

        const result = await SenderFactory.triggerTestEvent(context, SenderFactory.defaultTestEventBody(temporaryAndRandom()))

        expect(result).not.toBeNull()
        expect(result!.queued).toBe(true)
        expect(result!.degraded).toBe(false)
        expect(result!.dedupeKey).toMatch(/^TEST:EMAIL:/)
    })

    test('GIVEN a member WHEN triggering the test event THEN 403', async ({browser}) => {
        const context = await memberValidatedBrowserContext(browser)

        await SenderFactory.triggerTestEvent(context, SenderFactory.defaultTestEventBody(temporaryAndRandom()), 403)
    })

    const invalidBodies: Array<[string, unknown]> = [
        ['not an e-mail address', {to: 'not-an-email'}],
        ['missing recipient', {}],
        ['invalid reply-to', {...SenderFactory.defaultTestEventBody(), replyTo: 'nope'}]
    ]
    for (const [name, body] of invalidBodies) {
        test(`GIVEN ${name} WHEN triggering the test event THEN 400`, async ({browser}) => {
            const context = await validatedBrowserContext(browser)
            await SenderFactory.triggerTestEvent(context, body, 400)
        })
    }
})
