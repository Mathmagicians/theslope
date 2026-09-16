import {createCloudflareEmailProvider} from '~/utils/providers/cloudflareEmail'
import {smsNotEnabledProvider} from '~/utils/providers/smsNotEnabled'
import type {Providers} from '~/utils/providers/types'

export const createProviders = (env: Env): Providers => ({
    email: createCloudflareEmailProvider(env.EMAIL),
    sms: smsNotEnabledProvider
})
