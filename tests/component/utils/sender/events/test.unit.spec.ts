import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {buildTestEmail, emitTestEmail} from '~~/server/utils/sender/events/test'
import {useNotificationValidation} from '~/composables/useNotificationValidation'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'
import {fakeSenderQueue, sentMessages} from '~~/tests/component/utils/sender/fakeSenderQueue'
import {useUserPreferenceValidation} from '~/composables/useUserPreferenceValidation'
import {spyOnLogs} from '~~/tests/component/logSpies'

const {NotificationMessageSchema} = useNotificationValidation()
const {EMAIL} = useUserPreferenceValidation().NotificationChannelSchema.enum

describe('buildTestEmail', () => {
    describe.each([
        ['dev', NotificationFactory.config()],
        ['prod', NotificationFactory.config({environment: 'prod', site: 'www.skraaningen.dk'})]
    ])('for %s', (environment, config) => {
        const message = buildTestEmail(config)

        it('is a contract-valid TEST e-mail to the admin mailbox from the environment\'s sender', () => {
            expect(NotificationMessageSchema.safeParse(message).success).toBe(true)
            expect(message).toMatchObject({channel: EMAIL, to: config.adminEmail, from: config.from, fromName: config.fromName, replyTo: config.adminEmail, meta: {kind: NotificationFactory.Kind.TEST, environment}})
        })

        it('addresses the recipient the caller names, keeping the admin mailbox as Reply-To', () => {
            const mine = buildTestEmail(config, 'anna@example.com')

            expect(mine).toMatchObject({to: 'anna@example.com', replyTo: config.adminEmail, meta: {kind: NotificationFactory.Kind.TEST}})
        })

        it('names the environment in the subject and the site in the signature', () => {
            expect(message.subject).toContain(environment)
            expect(message.text).toContain(`— Skråningen · ${config.site}`)
            expect(message.text).toContain(message.meta.dedupeKey)
        })
    })
})

describe('emitTestEmail', () => {
    const logs = spyOnLogs()
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    it('queues the mail through the binding', async () => {
        const queue = fakeSenderQueue()

        const result = await emitTestEmail(NotificationFactory.channel(queue))

        expect(result.queued).toBe(true)
        expect(sentMessages(queue)).toHaveLength(1)
    })

    it('queues to a named recipient even when no admin mailbox is configured', async () => {
        const queue = fakeSenderQueue()

        const result = await emitTestEmail(NotificationFactory.channel(queue, {adminEmail: ''}), 'anna@example.com')

        expect(result).toMatchObject({queued: true, degraded: false})
        expect(sentMessages(queue)).toHaveLength(1)
    })

    it('reports degraded without touching the binding when no admin mailbox is configured', async () => {
        const queue = fakeSenderQueue()

        const result = await emitTestEmail(NotificationFactory.channel(queue, {adminEmail: ''}))

        expect(result).toMatchObject({queued: false, degraded: true})
        expect(sentMessages(queue)).toEqual([])
        expect(logs.warn).toHaveBeenCalledOnce()
    })

    it('reports not sent and logs the missing setting when e-mail is off', async () => {
        const result = await emitTestEmail(NotificationFactory.channelOff)

        expect(result).toMatchObject({queued: false, degraded: true})
        expect(logs.error).toHaveBeenCalledWith(expect.stringContaining(NotificationFactory.channelOff.missing))
    })
})
