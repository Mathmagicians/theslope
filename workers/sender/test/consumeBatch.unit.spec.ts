import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {MockInstance} from 'vitest'
import {consumeBatch} from '~/utils/consumeBatch'
import {maskEmail, maskMsisdn} from '../../common/mask'
import {
    MessageFactory,
    SECRET_BODY_MARKER,
    fakeBatch,
    fakeEmailBinding,
    fakeEnv,
    fakeMessage,
    rejectingEmailBinding
} from '~/test/fixtures'

const LOG_PREFIX = '📮 > SENDER'

let logs: {info: MockInstance, warn: MockInstance, error: MockInstance}

beforeEach(() => {
    logs = {
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {})
    }
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('consumeBatch', () => {
    it('delivers a valid e-mail, acks it and logs the masked recipient', async () => {
        const email = MessageFactory.email('salt')
        const message = fakeMessage(email)
        const binding = fakeEmailBinding()

        await consumeBatch(fakeBatch([message]), fakeEnv(binding))

        expect(binding.send).toHaveBeenCalledOnce()
        expect(message.ack).toHaveBeenCalledOnce()
        expect(message.retry).not.toHaveBeenCalled()
        expect(logs.info).toHaveBeenCalledWith(`${LOG_PREFIX} > [EMAIL] delivered`, {
            dedupeKey: email.meta.dedupeKey,
            to: maskEmail(email.to),
            providerMessageId: 'cf-message-id',
            attempt: 1
        })
    })

    it('acks a body that fails the contract and never logs the body', async () => {
        const message = fakeMessage(MessageFactory.invalidBody())
        const binding = fakeEmailBinding()

        await consumeBatch(fakeBatch([message]), fakeEnv(binding))

        expect(binding.send).not.toHaveBeenCalled()
        expect(message.ack).toHaveBeenCalledOnce()
        expect(logs.error).toHaveBeenCalledWith(`${LOG_PREFIX} > [CONTRACT] rejected`, expect.objectContaining({msgId: message.id}))
        expect(JSON.stringify(logs.error.mock.calls)).not.toContain(SECRET_BODY_MARKER)
    })

    it('acks an SMS with the channel-not-enabled warning of this release', async () => {
        const sms = MessageFactory.sms('salt')
        const message = fakeMessage(sms)

        await consumeBatch(fakeBatch([message]), fakeEnv())

        expect(message.ack).toHaveBeenCalledOnce()
        expect(message.retry).not.toHaveBeenCalled()
        expect(logs.warn).toHaveBeenCalledWith(`${LOG_PREFIX} > [SMS] channel not enabled in this release`, {dedupeKey: sms.meta.dedupeKey})
    })

    it.each([
        [1, 30],
        [2, 60],
        [3, 120]
    ])('retries a retryable provider failure on attempt %i after %i seconds', async (attempts, delaySeconds) => {
        const email = MessageFactory.email('salt')
        const message = fakeMessage(email, {attempts})

        await consumeBatch(fakeBatch([message]), fakeEnv(rejectingEmailBinding('E_RATE_LIMIT_EXCEEDED')))

        expect(message.retry).toHaveBeenCalledWith({delaySeconds})
        expect(message.ack).not.toHaveBeenCalled()
        expect(logs.warn).toHaveBeenCalledWith(`${LOG_PREFIX} > [EMAIL] retrying`, {
            dedupeKey: email.meta.dedupeKey,
            attempt: attempts,
            reason: 'E_RATE_LIMIT_EXCEEDED'
        })
    })

    it('logs an error and acks a retryable failure on the last attempt', async () => {
        const email = MessageFactory.email('salt')
        const message = fakeMessage(email, {attempts: 4})

        await consumeBatch(fakeBatch([message]), fakeEnv(rejectingEmailBinding('E_RATE_LIMIT_EXCEEDED')))

        expect(message.ack).toHaveBeenCalledOnce()
        expect(message.retry).not.toHaveBeenCalled()
        expect(logs.error).toHaveBeenCalledWith(`${LOG_PREFIX} > [EMAIL] failed after 4 attempts`, {
            dedupeKey: email.meta.dedupeKey,
            to: maskEmail(email.to),
            reason: 'E_RATE_LIMIT_EXCEEDED'
        })
    })

    it('acks a terminal provider failure without retrying', async () => {
        const email = MessageFactory.email('salt')
        const message = fakeMessage(email)

        await consumeBatch(fakeBatch([message]), fakeEnv(rejectingEmailBinding('E_SENDER_NOT_VERIFIED')))

        expect(message.ack).toHaveBeenCalledOnce()
        expect(message.retry).not.toHaveBeenCalled()
        expect(logs.error).toHaveBeenCalledWith(`${LOG_PREFIX} > [EMAIL] terminal failure`, {
            dedupeKey: email.meta.dedupeKey,
            to: maskEmail(email.to),
            reason: 'E_SENDER_NOT_VERIFIED'
        })
    })

    it('resolves even when every message in the batch fails — a rejection would retry delivered siblings', async () => {
        const messages = [
            fakeMessage(MessageFactory.invalidBody(), {id: 'msg-invalid'}),
            fakeMessage(MessageFactory.sms(), {id: 'msg-sms'}),
            fakeMessage(MessageFactory.email(), {id: 'msg-terminal'})
        ]

        await expect(consumeBatch(fakeBatch(messages), fakeEnv(rejectingEmailBinding('E_CONTENT_TOO_LARGE')))).resolves.toBeUndefined()
        messages.forEach(message => expect(message.ack).toHaveBeenCalledOnce())
    })

})

// The masks the consumer logs with (ADR-004). Pinned here because a recipient must stay
// unidentifiable however the delivery went — the dedupeKey is what an operator correlates on.
describe('recipient masking', () => {
    it.each([
        ['anna.hansen@skraaningen.dk', 'a***@s***.dk'],
        ['test@mathmagicians.dk', 't***@m***.dk'],
        ['no-reply.dev@skraaningen.dk', 'n***@s***.dk']
    ])('masks %s as %s', (email, expected) => {
        expect(maskEmail(email)).toBe(expected)
    })

    it('masks an msisdn keeping only the country code and the last two digits', () => {
        expect(maskMsisdn('4512345678')).toBe('45******78')
    })
})
