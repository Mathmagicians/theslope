import {defineNitroConfig} from 'nitropack/config'
import {nitroBase} from '../common/cloudflare'

export default defineNitroConfig({
    ...nitroBase,
    // Baked at build time from the same env vars nuxt.config.ts uses; `make deploy-sender-*` sets them (with_version)
    runtimeConfig: {
        public: {
            RELEASE_VERSION: process.env.NUXT_PUBLIC_RELEASE_VERSION || '',
            RELEASE_DATE: process.env.NUXT_PUBLIC_RELEASE_DATE || '',
            COMMIT_ID: process.env.GITHUB_SHA || 'development'
        }
    }
})
