import {describe, expect, it, vi} from 'vitest'
import {RetryableError, TerminalError, deliver} from '~/utils/delivery'
import type {Providers} from '~/utils/providers/types'
import {MessageFactory} from '~/test/fixtures'

const fakeProviders = (): Providers => ({
    email: {send: vi.fn(() => Promise.resolve({providerMessageId: 'email-1'}))},
    sms: {send: vi.fn(() => Promise.resolve({providerMessageId: 'sms-1'}))}
})

describe('deliver', () => {
    it.each([
        ['EMAIL', 'email', 'sms', () => MessageFactory.email('salt'), 'email-1'],
        ['SMS', 'sms', 'email', () => MessageFactory.sms('salt'), 'sms-1']
    ] as const)('routes a %s message to the %s provider', async (_channel, used, unused, build, providerMessageId) => {
        const providers = fakeProviders()
        const message = build()

        await expect(deliver(message, providers)).resolves.toEqual({providerMessageId})
        expect(providers[used].send).toHaveBeenCalledWith(message)
        expect(providers[unused].send).not.toHaveBeenCalled()
    })

    it.each([
        ['RetryableError', new RetryableError('E_RATE_LIMIT_EXCEEDED')],
        ['TerminalError', new TerminalError('E_SENDER_NOT_VERIFIED')]
    ])('lets a %s from the provider through unchanged', async (_name, error) => {
        const providers = fakeProviders()
        providers.email.send = vi.fn(() => Promise.reject(error))

        await expect(deliver(MessageFactory.email(), providers)).rejects.toBe(error)
    })
})
