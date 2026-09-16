import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {buildTestEmail, emitTestEmail} from '~~/server/utils/sender/events/test'
import {useNotificationValidation} from '~/composables/useNotificationValidation'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'

const {NotificationMessageSchema} = useNotificationValidation()

describe('buildTestEmail', () => {
    describe.each([
        ['dev', NotificationFactory.config()],
        ['prod', NotificationFactory.config({environment: 'prod', site: 'www.skraaningen.dk'})]
    ])('for %s', (environment, config) => {
        const message = buildTestEmail(config)

        it('is a contract-valid TEST e-mail to the admin mailbox from the environment\'s sender', () => {
            expect(NotificationMessageSchema.safeParse(message).success).toBe(true)
            expect(message).toMatchObject({channel: 'EMAIL', to: config.adminEmail, from: config.from, fromName: config.fromName, replyTo: config.adminEmail, meta: {kind: 'TEST', environment}})
        })

        it('names the environment in the subject and the site in the signature', () => {
            expect(message.subject).toContain(environment)
            expect(message.text).toContain(`— Skråningen · ${config.site}`)
            expect(message.text).toContain(message.meta.dedupeKey)
        })
    })
})

describe('emitTestEmail', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), info: vi.spyOn(console, 'info')}
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    it('queues the mail through the binding', async () => {
        const queue = {send: vi.fn().mockResolvedValue(undefined)} as unknown as Queue

        const result = await emitTestEmail(queue, NotificationFactory.config())

        expect(result.queued).toBe(true)
        expect(queue.send).toHaveBeenCalledOnce()
    })

    it('reports degraded without touching the binding when no admin mailbox is configured', async () => {
        const queue = {send: vi.fn()} as unknown as Queue

        const result = await emitTestEmail(queue, NotificationFactory.config({adminEmail: ''}))

        expect(result).toMatchObject({queued: false, degraded: true})
        expect(queue.send).not.toHaveBeenCalled()
        expect(logs.warn).toHaveBeenCalledOnce()
    })
})
