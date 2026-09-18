/**
 * Masking for logs and dedupe keys (ADR-004): a log line or a key identifies a delivery without
 * naming the person. Shared by the app (producer) and the sender (consumer).
 * dedupeKey = {kind}:{channel}:{maskedRecipient}:{messageId}
 */

const STARS = '***'

/** `anna.hansen@skraaningen.dk` → `a***@s***.dk` */
export const maskEmail = (email: string): string => {
    const at = email.lastIndexOf('@')
    if (at < 1 || at === email.length - 1) return STARS

    const local = email.slice(0, at)
    const domain = email.slice(at + 1)
    const dot = domain.lastIndexOf('.')
    const maskedDomain = dot < 1 ? `${domain[0]}${STARS}` : `${domain[0]}${STARS}.${domain.slice(dot + 1)}`

    return `${local[0]}${STARS}@${maskedDomain}`
}

/** `Anna Hansen` → `A*** H***` — one letter per word stays readable. */
export const maskName = (name: string): string =>
    name.trim().split(/\s+/).filter(Boolean).map(word => `${word[0]}${STARS}`).join(' ')

/** `4512345678` → `45******78` — country code and the last two digits stay readable. */
export const maskMsisdn = (msisdn: string): string =>
    msisdn.length <= 4 ? '*'.repeat(msisdn.length) : `${msisdn.slice(0, 2)}${'*'.repeat(msisdn.length - 4)}${msisdn.slice(-2)}`

/** The recipient segment of a dedupeKey / log line, masked per channel. */
export const maskRecipient = (channel: 'EMAIL' | 'SMS', to: string): string =>
    channel === 'EMAIL' ? maskEmail(to) : maskMsisdn(to)
