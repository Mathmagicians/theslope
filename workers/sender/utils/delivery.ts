/**
 * Delivery routing and the two error kinds the consumer acts on.
 *
 * Sender and recipient restrictions are NOT enforced here — they live on the `[[send_email]]`
 * binding in wrangler.toml, so a disallowed address fails inside the binding with a terminal code.
 */
import type {NotificationMessage} from '~/contract'
import type {DeliveryResult, Providers} from '~/utils/providers/types'

/** Worth another attempt: rate limits, provider outages, network. The last attempt is logged as failed and acknowledged. */
export class RetryableError extends Error {
    constructor(public readonly code: string, message?: string) {
        super(message ?? code)
        this.name = 'RetryableError'
    }
}

/** Retrying can never help: bad sender, disallowed recipient, oversized content, channel not enabled. */
export class TerminalError extends Error {
    constructor(public readonly code: string, message?: string) {
        super(message ?? code)
        this.name = 'TerminalError'
    }
}

export const deliver = (msg: NotificationMessage, providers: Providers): Promise<DeliveryResult> => {
    switch (msg.channel) {
        case 'EMAIL':
            return providers.email.send(msg)
        case 'SMS':
            return providers.sms.send(msg)
    }
}
