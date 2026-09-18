import {describe, expect, it} from 'vitest'
import {RetryableError, TerminalError} from '~/utils/delivery'
import {createCloudflareEmailProvider} from '~/utils/providers/cloudflareEmail'
import {SMS_NOT_ENABLED, smsNotEnabledProvider} from '~/utils/providers/smsNotEnabled'
import {MessageFactory, fakeEmailBinding, rejectingEmailBinding} from '~/test/fixtures'

describe('createCloudflareEmailProvider', () => {
    it('maps named sender and recipient to {email, name} and returns the provider message id', async () => {
        const binding = fakeEmailBinding()
        const email = MessageFactory.email('salt')

        await expect(createCloudflareEmailProvider(binding).send(email)).resolves.toEqual({providerMessageId: 'cf-message-id'})
        expect(binding.send).toHaveBeenCalledWith({
            from: {email: email.from, name: email.fromName},
            to: {email: email.to, name: email.toName},
            cc: email.cc,
            replyTo: email.replyTo,
            subject: email.subject,
            text: email.text,
            html: email.html,
            attachments: []
        })
    })

    it('sends bare addresses when the message carries no sender or recipient name', async () => {
        const binding = fakeEmailBinding()
        const email = MessageFactory.minimalEmail('salt')

        await createCloudflareEmailProvider(binding).send({...email, cc: [], attachments: []})

        expect(binding.send).toHaveBeenCalledWith({
            from: email.from,
            to: email.to,
            subject: email.subject,
            text: email.text,
            attachments: []
        })
    })

    it('hands the binding the attachment bytes (the contract carries base64; a string would be sent as the file text)', async () => {
        const binding = fakeEmailBinding()
        const email = MessageFactory.emailWithAttachment(12, 'salt')
        const [attachment] = email.attachments

        await createCloudflareEmailProvider(binding).send(email)

        const sent = binding.send.mock.calls[0]![0] as {attachments: Array<{content: unknown, filename: string, type: string, disposition: string}>}
        const [sentAttachment] = sent.attachments
        expect(sentAttachment).toMatchObject({filename: attachment!.filename, type: attachment!.contentType, disposition: 'attachment'})
        expect(sentAttachment!.content).toBeInstanceOf(Uint8Array)
        expect(Buffer.from(sentAttachment!.content as Uint8Array)).toEqual(Buffer.from(attachment!.contentBase64, 'base64'))
    })

    it.each([
        'E_RATE_LIMIT_EXCEEDED',
        'E_DAILY_LIMIT_EXCEEDED',
        'E_INTERNAL_SERVER_ERROR'
    ])('turns %s into a RetryableError carrying the code', async (code) => {
        const send = createCloudflareEmailProvider(rejectingEmailBinding(code)).send(MessageFactory.email())

        await expect(send).rejects.toThrow(RetryableError)
        await expect(send).rejects.toMatchObject({code})
    })

    it.each([
        'E_SENDER_NOT_VERIFIED',
        'E_RECIPIENT_NOT_ALLOWED',
        'E_CONTENT_TOO_LARGE',
        'E_VALIDATION_ERROR'
    ])('turns %s into a TerminalError carrying the code', async (code) => {
        const send = createCloudflareEmailProvider(rejectingEmailBinding(code)).send(MessageFactory.email())

        await expect(send).rejects.toThrow(TerminalError)
        await expect(send).rejects.toMatchObject({code})
    })

    it('treats a codeless network failure as retryable', async () => {
        const binding = fakeEmailBinding(() => Promise.reject(new TypeError('Network connection lost')))

        await expect(createCloudflareEmailProvider(binding).send(MessageFactory.email())).rejects.toThrow(RetryableError)
    })
})

describe('smsNotEnabledProvider', () => {
    it('fails terminally so the message is acked, not retried, until the gateway adapter ships', async () => {
        const send = smsNotEnabledProvider.send(MessageFactory.sms('salt'))

        await expect(send).rejects.toThrow(TerminalError)
        await expect(send).rejects.toMatchObject({code: SMS_NOT_ENABLED})
    })
})
