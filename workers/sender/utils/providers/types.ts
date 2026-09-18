/**
 * Provider ports. The consumer knows these two interfaces and nothing about Cloudflare
 * Email Service or an SMS gateway — swapping a provider is one adapter, never a consumer change.
 */
import type {EmailMessage, SmsMessage} from '~/contract'

export interface DeliveryResult {
    providerMessageId: string
}

export interface EmailProvider {
    send(msg: EmailMessage): Promise<DeliveryResult>
}

export interface SmsProvider {
    send(msg: SmsMessage): Promise<DeliveryResult>
}

export interface Providers {
    email: EmailProvider
    sms: SmsProvider
}
