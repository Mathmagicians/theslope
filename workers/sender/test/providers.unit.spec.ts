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

        await createCloudflareEmailProvider(binding).send({...email, attachments: []})

        expect(binding.send).toHaveBeenCalledWith({
            from: email.from,
            to: email.to,
            subject: email.subject,
            text: email.text,
            attachments: []
        })
    })

    it('maps attachments to the binding shape with an attachment disposition', async () => {
        const binding = fakeEmailBinding()
        const email = MessageFactory.emailWithAttachment(12, 'salt')
        const [attachment] = email.attachments

        await createCloudflareEmailProvider(binding).send(email)

        expect(binding.send).toHaveBeenCalledWith(expect.objectContaining({
            attachments: [{
                content: attachment!.contentBase64,
                filename: attachment!.filename,
                type: attachment!.contentType,
                disposition: 'attachment'
            }]
        }))
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
