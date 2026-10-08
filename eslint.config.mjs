// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // Generated: `make typegen` (wrangler types) and `make d1-prisma` (Prisma client + zod)
    ignores: ['**/worker-configuration.d.ts', 'prisma/generated/**']
  },
  {
    rules: {
      // Factory pattern is acceptable for test data factories (ADR-003)
      '@typescript-eslint/no-extraneous-class': 'off'
    }
  }
)
