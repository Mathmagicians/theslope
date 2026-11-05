// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // Generated: `make typegen` (wrangler types) and `make d1-prisma` (Prisma client + zod). Nuxt's ignore of the
    // static `public/` folder (`**/public`) also hides the public routes, which are source
    ignores: [
      '**/worker-configuration.d.ts',
      'prisma/generated/**',
      '!app/pages/public/',
      '!app/pages/public/**',
      '!server/routes/api/public/',
      '!server/routes/api/public/**'
    ]
  },
  {
    rules: {
      // Factory pattern is acceptable for test data factories (ADR-003)
      '@typescript-eslint/no-extraneous-class': 'off'
    }
  },
  {
    // The companion app's pages (developer/nuxt.config.ts) follow Nuxt's file-based route names, as app/pages do
    files: ['developer/app/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
)
