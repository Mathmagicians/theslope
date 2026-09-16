/**
 * The app's notification config, read once per call site (routes, tasks) and passed down —
 * events and compose are pure functions of it, so unit tests build the config with NotificationFactory.
 *
 * Environment and site come from the deployment's URL: the DEPLOY_URL var (wrangler.toml [env.*.vars]),
 * else the request origin (local nuxt dev). Sender address and display name derive from the environment;
 * the mailboxes come from runtimeConfig.notifications.
 */
import {getRequestURL, type H3Event} from 'h3'
import {deploymentFromUrl, useNotificationValidation, type NotificationConfig} from '~/composables/useNotificationValidation'
import {senderAddress, senderDisplayName} from '~/config/notificationTemplates'

const {NotificationConfigSchema} = useNotificationValidation()

export const getNotificationConfig = (event?: H3Event): NotificationConfig => {
    const deployUrl = process.env.DEPLOY_URL || (event ? getRequestURL(event).origin : undefined)
    if (!deployUrl) throw new Error('DEPLOY_URL is not set and there is no request to derive the site from')
    const {environment, site} = deploymentFromUrl(deployUrl)
    const {notifications} = useRuntimeConfig()
    const {theslope: {notifications: {signature, templates}}} = useAppConfig()
    return NotificationConfigSchema.parse({...notifications, environment, site, from: senderAddress(environment), fromName: senderDisplayName(environment), signature, templates})
}
