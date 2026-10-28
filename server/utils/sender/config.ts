/**
 * The e-mail channel as the environment sets it, read once per call site (routes, tasks) and passed down —
 * events and compose are pure functions of the config, so unit tests build it with NotificationFactory.
 *
 * Environment and site come from the deployment's URL, the DEPLOY_URL var (wrangler.toml [env.*.vars], .env locally).
 * Sender address and display name derive from the environment; the mailboxes come from runtimeConfig.notifications.
 */
import {deploymentFromUrl, useNotificationValidation, type NotificationConfig} from '~/composables/useNotificationValidation'
import type {SenderEvent} from '~/composables/useDeliveryValidation'
import {senderAddress, senderDisplayName} from '~/config/notificationTemplates'

const {NotificationConfigSchema} = useNotificationValidation()

/** A setting e-mail needs: the deployment's URL and the sender binding */
export type EmailSetting = 'DEPLOY_URL' | 'SENDER'

/** E-mail is on with its queue and settings, or off with the setting that is missing */
export type EmailChannel =
    | {on: true, queue: Queue, config: NotificationConfig}
    | {on: false, missing: EmailSetting}

const notificationConfig = (deployUrl: string): NotificationConfig => {
    const {environment, site} = deploymentFromUrl(deployUrl)
    const {notifications} = useRuntimeConfig()
    const {theslope: {notifications: {signature, templates}}} = useAppConfig()
    return NotificationConfigSchema.parse({...notifications, environment, site, from: senderAddress(environment), fromName: senderDisplayName(environment), signature, templates})
}

/** The booking emails go while the SHOULD_SEND_BOOKING_EMAILS_FLAG var (wrangler.toml [vars] per environment) is true */
export const shouldSendBookingEmails = (): boolean => process.env.SHOULD_SEND_BOOKING_EMAILS_FLAG === 'true'

/** With the booking emails flag off a sender event's run sends and records nothing; a delivery dry run counts on */
export const bookingEmailsOff = (senderEvent: SenderEvent, dryRun?: boolean): boolean => {
    if (dryRun || shouldSendBookingEmails()) return false
    console.info(`📮 > SENDER > [EVENT ${senderEvent}] SHOULD_SEND_BOOKING_EMAILS_FLAG is off: nothing sent`)
    return true
}

export const emailChannel = (env: {SENDER?: Queue}): EmailChannel => {
    const deployUrl = process.env.DEPLOY_URL
    if (!deployUrl) return {on: false, missing: 'DEPLOY_URL'}
    if (!env.SENDER) return {on: false, missing: 'SENDER'}
    return {on: true, queue: env.SENDER, config: notificationConfig(deployUrl)}
}
