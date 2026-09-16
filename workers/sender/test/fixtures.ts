/**
 * Test data for the theslope-sender specs.
 *
 * Every spec builds its messages here (testing Rule 1/2): the message shape is spelled
 * out in one place, so a contract change breaks one file instead of four.
 */
import {vi} from 'vitest'
import type {Mock} from 'vitest'
import type {EmailMessage as EmailNotification, SmsMessage} from '~/contract'

/** The fields the contract requires — `cc` and `attachments` are left to the schema defaults. */
type RequiredEmailFields = Omit<EmailNotification, 'cc' | 'attachments' | 'toName' | 'fromName' | 'replyTo' | 'html'>

/** Marker planted in the invalid body — a spec asserts it never reaches a log argument (ADR-004). */
export const SECRET_BODY_MARKER = 'hemmeligt-indhold-der-aldrig-maa-logges'

const salted = (value: string, salt?: string): string => salt ? `${value}-${salt}` : value

/** GSM-7 text of an exact length; the Danish letters go first so they are counted as ordinary characters. */
const gsm7Text = (length: number): string => `æøåÆØÅ ${'a'.repeat(length)}`.slice(0, length)

const meta = (kind: string, channel: string, salt?: string) => ({
    kind,
    dedupeKey: `${kind}:${channel}:${salted('operator', salt)}:2026-09-16T10:12:00Z`,
    source: 'theslope-app' as const,
    environment: 'dev' as const,
    enqueuedAt: '2026-09-16T10:12:00.000Z'
})

export const MessageFactory = {
    meta,
    gsm7Text,

    minimalEmail: (salt?: string): RequiredEmailFields => ({
        v: 1,
        channel: 'EMAIL',
        to: `${salted('anna.hansen', salt)}@skraaningen.dk`,
        from: 'no-reply.dev@skraaningen.dk',
        subject: 'Skråningen: testbesked fra theslope-sender',
        text: 'Hej!\n\nDette er en testbesked.\n\n— Skråningen · dev.skraaningen.dk',
        meta: meta('TEST', 'EMAIL', salt)
    }),

    email: (salt?: string): EmailNotification => ({
        ...MessageFactory.minimalEmail(salt),
        toName: 'Anna Hansen',
        fromName: 'Skråningen dev',
        cc: ['admin@skraaningen.dk'],
        replyTo: 'kasserer@skraaningen.dk',
        html: '<p>Hej!</p>',
        attachments: []
    }),

    attachment: (base64Chars: number) => ({
        filename: 'PBS-Opgoerelse-2026-08.csv',
        contentType: 'text/csv; charset=utf-8',
        contentBase64: 'A'.repeat(base64Chars)
    }),

    emailWithAttachment: (base64Chars: number, salt?: string): EmailNotification => ({
        ...MessageFactory.email(salt),
        attachments: [MessageFactory.attachment(base64Chars)]
    }),

    sms: (salt?: string): SmsMessage => ({
        v: 1,
        channel: 'SMS',
        to: '4512345678',
        text: `Husk madholdet i aften kl 18 - ${salted('Skraaningen', salt)}`,
        meta: meta('DUTY_SHIFT_REMINDER', 'SMS', salt)
    }),

    smsWithText: (text: string, salt?: string): SmsMessage => ({...MessageFactory.sms(salt), text}),

    /** Fails the contract on `v` and on `to`; both zod messages quote the expectation, never the value. */
    invalidBody: (): Record<string, unknown> => ({
        ...MessageFactory.email(),
        v: 2,
        to: SECRET_BODY_MARKER,
        text: SECRET_BODY_MARKER
    })
}

export interface FakeMessage {
    id: string
    timestamp: Date
    body: unknown
    attempts: number
    ack: Mock
    retry: Mock
}

export const fakeMessage = (body: unknown, {id = 'msg-1', attempts = 1}: {id?: string, attempts?: number} = {}): FakeMessage => ({
    id,
    timestamp: new Date('2026-09-16T10:12:00.000Z'),
    body,
    attempts,
    ack: vi.fn(),
    retry: vi.fn()
})

export const fakeBatch = (messages: FakeMessage[]): MessageBatch<unknown> => ({
    messages,
    queue: 'theslope-sender-local',
    metadata: {metrics: {backlogCount: 0, backlogBytes: 0}},
    retryAll: vi.fn(),
    ackAll: vi.fn()
})

export type FakeEmailBinding = SendEmail & {send: Mock}

export const fakeEmailBinding = (impl?: (message: EmailMessageBuilder | EmailMessage) => Promise<{messageId: string}>): FakeEmailBinding => ({
    send: vi.fn(impl ?? (() => Promise.resolve({messageId: 'cf-message-id'})))
})

/** A binding that rejects the way the Cloudflare Email Service does: an Error carrying an `E_*` code. */
export const rejectingEmailBinding = (code: string): FakeEmailBinding =>
    fakeEmailBinding(() => Promise.reject(Object.assign(new Error('Email Service rejected the message'), {code})))

export const fakeEnv = (EMAIL: SendEmail = fakeEmailBinding()): Env => ({EMAIL})
