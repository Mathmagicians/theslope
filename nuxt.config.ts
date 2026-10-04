// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'
import { nitroBase } from './workers/common/cloudflare'

export default defineNuxtConfig({
    colorMode: {
        preference: 'light'
    },
    compatibilityDate: nitroBase.compatibilityDate,
    components: [
        {
            path: '~/components',
            pathPrefix: false,
        },
    ],
    app: {
        head: {
            link: [
                {rel: 'manifest', href: '/manifest.webmanifest'},
                {rel: 'apple-touch-icon', href: '/apple-touch-icon.png'}
            ],
            meta: [
                {name: 'theme-color', content: '#66a28f'},
                // iOS reads these for the standalone (installed) face
                {name: 'apple-mobile-web-app-capable', content: 'yes'},
                {name: 'apple-mobile-web-app-status-bar-style', content: 'default'},
                {name: 'apple-mobile-web-app-title', content: 'Skråningen'}
            ]
        }
    },
    css: ['~/assets/css/main.css'],
    devtools: {enabled: true},
    // Shared Vite watcher (dev only); the default from compatibilityVersion 5
    experimental: {watcher: 'builder'},

    eslint: {
        // options here
    },

    nitro: {
        preset: nitroBase.preset,
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
            '0 3 18 * *': ['monthly-billing']     // 18th at 03:00 UTC = 04:00/05:00 Copenhagen (day after cutoff)
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
                // Tailwind colors for specific use cases
                'yellow',    // Deadline warning chips (more visible than orange)
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
        // Server-side bundling (icons embedded in the build); the collections are the installed @iconify-json/* packages (package.json)
        serverBundle: {},
        // Client-side settings - automatic tree-shaking; Nuxt UI 4.10+ pre-bundles its own internal icons
        clientBundle: {
            scan: true  // Only bundle icons actually used in components
        },
        provider: 'server'  // Use server-side icon provider
    },


    runtimeConfig: {
        // Heynabo tokens carry no expiry; the cookie lives a day at most and re-login carries longevity
        session: {
            maxAge: 60 * 60 * 24
        },
        // GitHub integration for user feedback
        GITHUB_TOKEN: '',  // Set via NUXT_GITHUB_TOKEN env variable
        GITHUB_OWNER: 'Mathmagicians',  // Override via NUXT_GITHUB_OWNER if needed
        GITHUB_REPO: 'theslope',  // Override via NUXT_GITHUB_REPO if needed
        // Notifications (sender events): mailboxes only — NUXT_NOTIFICATIONS_* from .env locally, worker secrets deployed;
        // an unset mailbox means the mail that needs it reports degraded. Environment and site derive from DEPLOY_URL / the
        // request (deploymentFromUrl); sender address and display name derive from the environment (senderAddress, senderDisplayName).
        notifications: {
            accountantEmail: process.env.NUXT_NOTIFICATIONS_ACCOUNTANT_EMAIL || '',   // receives the monthly billing CSV
            adminEmail: process.env.NUXT_NOTIFICATIONS_ADMIN_EMAIL || ''              // reply-to of every mail, test mail recipient, cc on the monthly billing mail
        },
        // Public keys that are exposed to the client
        public: {
            RELEASE_VERSION: process.env.NUXT_PUBLIC_RELEASE_VERSION || "",  // Baked at build time
            RELEASE_DATE: process.env.NUXT_PUBLIC_RELEASE_DATE || "",        // Baked at build time
            apiBase: '/api',
            HEY_NABO_API: '',  // Overridden at runtime by NUXT_PUBLIC_HEY_NABO_API
            COMMIT_ID: process.env.GITHUB_SHA || 'development'
        }
    },


})
