/**
 * The consumer: one queue batch in, every message explicitly acked or retried.
 *
 * `consumeBatch` resolves for every message outcome: the runtime wraps this call in
 * `context.waitUntil(...)`, and a rejected promise there retries the WHOLE batch,
 * including the messages that were already delivered. `Env` is the generated binding type
 * (worker-configuration.d.ts) — wrangler guarantees the bindings it declares.
 */
import {NotificationMessageSchema} from '~/contract'
import type {NotificationMessage} from '~/contract'
import {RetryableError, TerminalError, deliver} from '~/utils/delivery'
import {maskRecipient} from '../../common/mask'
import {createProviders} from '~/utils/providers'
import {SMS_NOT_ENABLED} from '~/utils/providers/smsNotEnabled'
import type {Providers} from '~/utils/providers/types'

const LOG = '📮 > SENDER'

/** 30 / 60 / 120 s across `max_retries = 3` (wrangler.toml). */
const RETRY_BASE_DELAY_SECONDS = 30

/** First delivery + the 3 retries of wrangler.toml. The last attempt logs the failure and acknowledges the message. */
const MAX_ATTEMPTS = 4

const retryDelaySeconds = (attempts: number): number => RETRY_BASE_DELAY_SECONDS * 2 ** Math.max(0, attempts - 1)

const maskedRecipient = (msg: NotificationMessage): string => maskRecipient(msg.channel, msg.to)

const handleMessage = async (message: Message<unknown>, providers: Providers): Promise<void> => {
    const parsed = NotificationMessageSchema.safeParse(message.body)

    // A body that fails the contract can never be delivered — retrying it is pointless. Never log the body.
    if (!parsed.success) {
        console.error(`${LOG} > [CONTRACT] rejected`, {
            msgId: message.id,
            issues: parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
        })
        message.ack()
        return
    }

    const msg = parsed.data
    const {channel} = msg
    const {dedupeKey} = msg.meta

    try {
        const {providerMessageId} = await deliver(msg, providers)
        console.info(`${LOG} > [${channel}] delivered`, {
            dedupeKey,
            to: maskedRecipient(msg),
            providerMessageId,
            attempt: message.attempts
        })
        message.ack()
    } catch (error) {
        if (error instanceof RetryableError) {
            if (message.attempts >= MAX_ATTEMPTS) {
                console.error(`${LOG} > [${channel}] failed after ${message.attempts} attempts`, {
                    dedupeKey,
                    to: maskedRecipient(msg),
                    reason: error.code
                })
                message.ack()
                return
            }
            console.warn(`${LOG} > [${channel}] retrying`, {dedupeKey, attempt: message.attempts, reason: error.code})
            message.retry({delaySeconds: retryDelaySeconds(message.attempts)})
            return
        }

        if (error instanceof TerminalError && error.code === SMS_NOT_ENABLED) {
            console.warn(`${LOG} > [SMS] channel not enabled in this release`, {dedupeKey})
            message.ack()
            return
        }

        console.error(`${LOG} > [${channel}] terminal failure`, {
            dedupeKey,
            to: maskedRecipient(msg),
            reason: error instanceof TerminalError ? error.code : String(error)
        })
        message.ack()
    }
}

export const consumeBatch = async (batch: MessageBatch<unknown>, env: Env): Promise<void> => {
    const providers = createProviders(env)

    for (const message of batch.messages) {
        await handleMessage(message, providers)
    }
}
