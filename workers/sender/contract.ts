/**
 * THE CONTRACT — v1 of the queue message theslope-sender consumes.
 *
 * The sender owns this schema: a consumer can never be looser than its own contract.
 * The app re-exports it through a validation composable (ADR-001). Imports zod and
 * nothing else — never `prisma/generated/zod`, never anything from `app/` or `server/`.
 *
 * One queue message = one delivery (one recipient, one channel), so retry/ack semantics
 * can never duplicate a sibling delivery. A breaking change is a v2 schema + a union on `v`.
 */
import {z} from 'zod'

export const CONTRACT_VERSION = 1 as const

/** SMS is contract-ready; the gateway adapter is a later package. */
export const ChannelSchema = z.enum(['EMAIL', 'SMS'])

/** The trigger catalog is app-owned — opaque here, so a new trigger never needs a sender deploy. */
export const KindSchema = z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/)

/** Must stay in parity with ENVIRONMENTS in workers/common/cloudflare.ts (asserted in contract.unit.spec.ts). */
export const EnvironmentSchema = z.enum(['local', 'dev', 'prod'])

export const EmailAddressSchema = z.string().email().max(254)

/** Danish msisdn without '+', normalized producer-side. */
export const MsisdnSchema = z.string().regex(/^45\d{8}$/)

/** One GSM-7 segment. */
export const SMS_MAX_LENGTH = 160

/** Keeps the whole message below the 128 KB queue limit. */
export const ATTACHMENT_MAX_BASE64_CHARS = 96 * 1024

// GSM 03.38 basic set. ÆØÅæøå and É are basic characters, so Danish text costs one septet per letter.
const GSM7_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'

// GSM 03.38 extension set (escape-prefixed, two septets each). Smart quotes and the em dash are in neither set.
const GSM7_EXTENSION = '\f^{}\\[~]|€'

const GSM7_CHARACTERS = new Set([...GSM7_BASIC, ...GSM7_EXTENSION])

export const isGsm7 = (text: string): boolean => [...text].every(character => GSM7_CHARACTERS.has(character))

export const MetaSchema = z.object({
    kind: KindSchema,
    /** `{kind}:{channel}:{maskedRecipient}:{messageId}` (workers/common/mask.ts + crypto.randomUUID) — one grep across producer log and sender log. */
    dedupeKey: z.string().min(1).max(200),
    source: z.literal('theslope-app'),
    environment: EnvironmentSchema,
    enqueuedAt: z.string().datetime(),
    /** jobRunId / dinnerEventId / billingPeriod — never PII. */
    correlationId: z.string().max(100).optional(),
    userId: z.number().int().positive().optional()
})

export const AttachmentSchema = z.object({
    filename: z.string().min(1).max(255),
    contentType: z.string().min(1).max(100),
    contentBase64: z.string().min(1).max(ATTACHMENT_MAX_BASE64_CHARS).regex(/^[A-Za-z0-9+/]+={0,2}$/)
})

export const EmailMessageSchema = z.object({
    v: z.literal(CONTRACT_VERSION),
    channel: z.literal('EMAIL'),
    to: EmailAddressSchema,
    toName: z.string().max(100).optional(),
    /** App config decides the sender; the `[[send_email]]` binding enforces which addresses are allowed. */
    from: EmailAddressSchema,
    /** Display name shown next to `from`, per environment (`Skråningen dev` / `Skråningen`). */
    fromName: z.string().min(1).max(100).optional(),
    replyTo: EmailAddressSchema.optional(),
    subject: z.string().min(1).max(200),
    text: z.string().min(1).max(50_000),
    html: z.string().max(100_000).optional(),
    attachments: z.array(AttachmentSchema).max(4).default([]),
    meta: MetaSchema
})

export const SmsMessageSchema = z.object({
    v: z.literal(CONTRACT_VERSION),
    channel: z.literal('SMS'),
    to: MsisdnSchema,
    text: z.string().min(1).max(SMS_MAX_LENGTH).refine(isGsm7, 'SMS text must be GSM-7'),
    /** No sender-ID field: the alphanumeric sender ID is a gateway detail (worker var). */
    meta: MetaSchema
})

export const NotificationMessageSchema = z.discriminatedUnion('channel', [EmailMessageSchema, SmsMessageSchema])

export type NotificationMessage = z.infer<typeof NotificationMessageSchema>
export type EmailMessage = z.infer<typeof EmailMessageSchema>
export type SmsMessage = z.infer<typeof SmsMessageSchema>
