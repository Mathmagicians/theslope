import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

// Specs import the e2e factories for their data builders; the factories' eager
// `expect` import from '@playwright/test' resolves to a stub in every vitest project
const playwrightStub = fileURLToPath(new URL('./tests/component/playwrightStub.ts', import.meta.url))

export default defineConfig({
    test: {
        // Vitest writes its attachments, blob and json output under test-results, beside Playwright's
        attachmentsDir: 'test-results/vitest/attachments',
        outputFile: {json: 'test-results/vitest/results.json', blob: 'test-results/vitest/blob'},
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['tests/component/**/*.unit.spec.ts', 'tests/component/**/*.e2e.spec.ts'],
                    environment: 'node',
                },
                resolve: {
                    alias: {
                        '@playwright/test': playwrightStub,
                        '~/': fileURLToPath(new URL('./app/', import.meta.url)),
                        '~~/': fileURLToPath(new URL('./', import.meta.url)),
                    },
                },
            },
            {
                test: {
                    // Standalone Nitro worker (workers/sender) — plain node, no Nuxt runtime; ~ = the worker's root, as Nitro resolves it
                    name: 'sender',
                    include: ['workers/sender/**/*.unit.spec.ts'],
                    environment: 'node',
                    alias: {
                        '@playwright/test': playwrightStub,
                        '~/': fileURLToPath(new URL('./workers/sender/', import.meta.url)),
                    },
                },
            },
            await defineVitestProject({
                resolve: {
                    alias: {
                        '@playwright/test': playwrightStub,
                    },
                },
                test: {
                    name: 'nuxt',
                    include: ['tests/component/**/*.nuxt.spec.ts'],
                    environment: 'nuxt',
                    // setupNuxt boots the app in a beforeAll per file; under full parallel
                    // load a cold boot exceeds vitest's default 10s hook timeout, and a
                    // file's first mount can exceed the default 5s test timeout
                    hookTimeout: 60_000,
                    testTimeout: 20_000,
                    environmentOptions: {
                        nuxt: {
                            // Disable Nuxt's app manifest plugin under tests.
                            // payload.client.js schedules `setTimeout(getAppManifest, 1000)`
                            // on app boot — a tear-down race throws `$fetch is not defined`.
                            // The plugin only matters for live build-staleness checks.
                            overrides: {
                                experimental: { appManifest: false },
                                // Deterministic value for specs that render Heynabo links
                                // (DinnerDetailHeader); a useRuntimeConfig mock would replace
                                // the whole config and break the test runtime boot
                                runtimeConfig: {
                                    public: { HEY_NABO_API: 'https://test.heynabo.com/api' }
                                }
                            }
                        }
                    }
                },
            }),
        ],
    },
})
