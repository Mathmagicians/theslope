import {defineVitestConfig} from '@nuxt/test-utils/config'

export default defineVitestConfig({
    // any custom Vitest config you require
    test: {
        include: ['tests/component/**/*.*.spec.ts'],
        name: 'nuxt',
        environmentMatchGlobs: [
            ['**/tests/component/**/*.nuxt.spec.ts', 'nuxt']
        ]
    }
})
