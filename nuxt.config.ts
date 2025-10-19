// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
    colorMode: {
        preference: 'light'
    },
    compatibilityDate: '2025-10-01',
    components: [
        {
            path: '~/components',
            pathPrefix: false,
        },
    ],
    css: ['~/assets/css/main.css'],
    devtools: {enabled: true},

    eslint: {
        // options here
    },

    nitro: {
        preset: "cloudflare_module",
        experimental: {
            wasm: true
        }
    },

    modules: [
        "nitro-cloudflare-dev",
        '@pinia/nuxt',
        "@nuxt/ui",
        '@nuxt/test-utils/module',
        "@nuxt/eslint",
        "nuxt-auth-utils"
    ],

    ui: {
        theme: {
            colors: [
                // Standard semantic colors
                'primary',
                'secondary',
                'neutral',
                'info',
                'success',
                'warning',
                'error',
                // Custom Pantone team colors
                'mocha',
                'pink',
                'orange',
                'winery',
                'party',
                'peach',
                'bonbon',
                'caramel',
                'ocean'
            ]
        }
    },


    runtimeConfig: {
        HEY_NABO_USERNAME: process.env.NUXT_HEY_NABO_USERNAME || '', //Set in NUXT_HEYNABO_USERNAME env variable
        HEY_NABO_PASSWORD: process.env.NUXT_HEY_NABO_PASSWORD, //Set in NUXT_HEYNABO_PASSWORD env variable
        // Public keys that are exposed to the client
        public: {
            apiBase: '/api',
            HEY_NABO_API: process.env.NUXT_HEY_NABO_API || '', //Set in NUXT_HEYNABO_API env variable
            COMMIT_ID: process.env.GITHUB_SHA || 'development'
        }
    },


})
