import {describe, expect, it} from 'vitest'
import {ENVIRONMENTS} from '../../common/cloudflare'
import {
    ATTACHMENT_MAX_BASE64_CHARS,
    CONTRACT_VERSION,
    EmailMessageSchema,
    EnvironmentSchema,
    NotificationMessageSchema,
    SMS_MAX_LENGTH,
    isGsm7
} from '~/contract'
import {MessageFactory} from '~/test/fixtures'

const parse = (body: unknown) => NotificationMessageSchema.safeParse(body)

describe('contract v1', () => {
    describe.each([
        ['minimal e-mail (optional fields omitted)', () => MessageFactory.minimalEmail()],
        ['e-mail with every optional field', () => MessageFactory.email()],
        ['e-mail with an attachment exactly at the cap', () => MessageFactory.emailWithAttachment(ATTACHMENT_MAX_BASE64_CHARS)],
        ['SMS with 160 GSM-7 characters including æøå', () => MessageFactory.smsWithText(MessageFactory.gsm7Text(SMS_MAX_LENGTH))]
    ])('accepts %s', (_name, build) => {
        it('parses', () => {
            expect(parse(build()).success).toBe(true)
        })
    })

    it('applies the attachments default so a minimal e-mail is delivery-ready', () => {
        expect(EmailMessageSchema.parse(MessageFactory.minimalEmail()).attachments).toEqual([])
    })

    describe.each([
        ['a contract version other than v1', {...MessageFactory.email(), v: CONTRACT_VERSION + 1}],
        ['an unknown channel', {...MessageFactory.email(), channel: 'CARRIER_PIGEON'}],
        ['a lowercase kind', {...MessageFactory.email(), meta: {...MessageFactory.meta('TEST', 'EMAIL'), kind: 'test'}}],
        ['a kind longer than 64 characters', {...MessageFactory.email(), meta: {...MessageFactory.meta('TEST', 'EMAIL'), kind: `K${'A'.repeat(64)}`}}],
        ['a malformed e-mail address', {...MessageFactory.email(), to: 'anna.hansen(at)skraaningen.dk'}],
        ['an msisdn with a leading +', {...MessageFactory.sms(), to: '+4512345678'}],
        ['an SMS of 161 characters', MessageFactory.smsWithText(MessageFactory.gsm7Text(SMS_MAX_LENGTH + 1))],
        ['an SMS with smart quotes', MessageFactory.smsWithText('Chefens ’menu’ er “klar”')],
        ['an attachment over the cap', MessageFactory.emailWithAttachment(ATTACHMENT_MAX_BASE64_CHARS + 1)],
        ['an attachment that is not base64', {...MessageFactory.email(), attachments: [{...MessageFactory.attachment(12), contentBase64: 'ikke base64!'}]}],
        ['a missing meta.source', {...MessageFactory.email(), meta: {...MessageFactory.meta('TEST', 'EMAIL'), source: undefined}}]
    ])('rejects %s', (_name, body) => {
        it('fails to parse', () => {
            expect(parse(body).success).toBe(false)
        })
    })

    it('keeps EnvironmentSchema in parity with the shared platform constants', () => {
        expect(EnvironmentSchema.options).toEqual([...ENVIRONMENTS])
    })
})

describe('isGsm7', () => {
    it.each([
        ['Danish letters are in the basic set', 'Blødt brød på Skråningen ÆØÅæøå', true],
        ['the extension set is allowed', 'Pris: 40€ {tak} [ok]', true],
        ['newlines are allowed', 'Hej!\nVi ses', true],
        ['a right single quote is not GSM-7', 'Chefens ’menu’', false],
        ['smart double quotes are not GSM-7', 'Menuen er “klar”', false],
        ['an em dash is not GSM-7', '— Skråningen', false]
    ])('%s', (_name, text, expected) => {
        expect(isGsm7(text)).toBe(expected)
    })
})
