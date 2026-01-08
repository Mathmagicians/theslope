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
            wasm: true,
            tasks: true  // Enable Nitro scheduled tasks (still experimental)
        },
        // Scheduled tasks - Cloudflare Cron Triggers invoke these
        // Tasks call HTTP endpoints which have D1 access
        // Times in UTC: Copenhagen is UTC+1 (winter) / UTC+2 (summer)
        scheduledTasks: {
            '0 1 * * *': ['heynabo-import'],      // 01:00 UTC = 02:00/03:00 Copenhagen (runs first)
            '0 2 * * *': ['daily-maintenance'],   // 02:00 UTC = 03:00/04:00 Copenhagen (runs after import)
            '0 3 17 * *': ['monthly-billing']     // 17th at 03:00 UTC = 04:00/05:00 Copenhagen
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

    icon: {
        // Server-side bundling - embed icons in build to eliminate runtime CDN requests
        serverBundle: {
            collections: [
                'heroicons',                    // Primary collection (23 icons)
                'fluent-emoji-high-contrast',   // Power mode icon
                'fluent-mdl2',                  // Team favorite icon
                'lucide',                       // Sorting arrows
                'pajamas',                      // Admin/user icons
                'guidance',                     // Contact icons
                'healthicons',                  // Death/allergy icons
                'hugeicons',                    // Authorization icon
                'mage',                         // Robot icon
                'material-symbols',             // Celebration icon
                'mdi',                          // Allergy icon
                'streamline',                   // Dining icon
                'tdesign'                       // Wave icon
            ]
        },
        // Client-side settings - automatic tree-shaking
        clientBundle: {
            scan: true  // Only bundle icons actually used in components
        },
        provider: 'server'  // Use server-side icon provider
    },


    runtimeConfig: {
        HEY_NABO_USERNAME: process.env.NUXT_HEY_NABO_USERNAME || '', //Set in NUXT_HEYNABO_USERNAME env variable
        HEY_NABO_PASSWORD: process.env.NUXT_HEY_NABO_PASSWORD, //Set in NUXT_HEYNABO_PASSWORD env variable
        // GitHub integration for user feedback
        GITHUB_TOKEN: '',  // Set via NUXT_GITHUB_TOKEN env variable
        GITHUB_OWNER: 'Mathmagicians',  // Override via NUXT_GITHUB_OWNER if needed
        GITHUB_REPO: 'theslope',  // Override via NUXT_GITHUB_REPO if needed
        // Public keys that are exposed to the client
        public: {
            apiBase: '/api',
            HEY_NABO_API: '',  // Overridden at runtime by NUXT_PUBLIC_HEY_NABO_API
            COMMIT_ID: process.env.GITHUB_SHA || 'development'
        }
    },


})
