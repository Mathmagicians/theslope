import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['tests/component/**/*.unit.spec.ts', 'tests/component/**/*.e2e.spec.ts'],
                    environment: 'node',
                },
                resolve: {
                    alias: {
                        '~/': fileURLToPath(new URL('./app/', import.meta.url)),
                        '~~/': fileURLToPath(new URL('./', import.meta.url)),
                    },
                },
            },
            await defineVitestProject({
                test: {
                    name: 'nuxt',
                    include: ['tests/component/**/*.nuxt.spec.ts'],
                    environment: 'nuxt',
                    environmentOptions: {
                        nuxt: {
                            // Disable Nuxt's app manifest plugin under tests.
                            // payload.client.js schedules `setTimeout(getAppManifest, 1000)`
                            // on app boot — a tear-down race throws `$fetch is not defined`.
                            // The plugin only matters for live build-staleness checks.
                            overrides: {
                                experimental: { appManifest: false }
                            }
                        }
                    }
                },
            }),
        ],
    },
})
