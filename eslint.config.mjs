// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Factory pattern is acceptable for test data factories (ADR-003)
      '@typescript-eslint/no-extraneous-class': 'off'
    }
  }
)
