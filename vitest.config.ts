import {defineVitestConfig} from '@nuxt/test-utils/config'

export default defineVitestConfig({
    // any custom Vitest config you require
    test: {
        include: ['tests/component/**/*.*.spec.ts'],
        name: 'nuxt',
        workspace: {
            // Default workspace "root" has its 'environment' set to 'node' and is used for all tests
            // except those in other workspaces
            root: {
                environment: 'node'
            },
            // Create a "nuxt" workspace for files that need the Nuxt environment
            nuxt: {
                environment: 'nuxt',
                environmentMatchGlobs: [
                    ['**/tests/component/**/*.nuxt.spec.ts', 'nuxt']
                ]
            }
        }
    }
})
